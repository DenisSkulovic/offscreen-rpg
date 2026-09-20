import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Database } from '@offscreen/db';
import { preflightLiveEvaluation } from '@offscreen/application/developer-tools';
import type { EvaluationPacketConfig } from '@offscreen/contracts/live-evaluation';
import type { DispatchReviewView } from '@offscreen/contracts/chamber';
import { dispatchReviewResponseSchema } from '@offscreen/contracts/chamber';
import { openingPreviewSchema } from '@offscreen/contracts/openings';
import { storySnapshotSchema } from '@offscreen/contracts/stories';
import { setTimeout as delay } from 'node:timers/promises';

type CreditSnapshot = {
  totalCreditsMicrousd: bigint;
  totalUsageMicrousd: bigint;
  availableMicrousd: bigint;
  verifiedAt: string;
  validUntil: string;
};

function usdToMicrousd(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Invalid OpenRouter credit amount');
  return BigInt(Math.floor(amount * 1_000_000));
}

/** Fresh authoritative checks only. This function never writes the credential to evidence. */
export async function verifyOpenRouterAuthority(
  config: EvaluationPacketConfig,
  apiKey: string,
): Promise<CreditSnapshot> {
  if (!apiKey.trim()) throw new Error('OPENROUTER_API_KEY is required for an authorized live evaluation');
  const headers = { authorization: `Bearer ${apiKey}` };
  const [creditsResponse, endpointsResponse] = await Promise.all([
    fetch('https://openrouter.ai/api/v1/credits', { headers, redirect: 'error' }),
    fetch(`https://openrouter.ai/api/v1/models/${config.route.model}/endpoints`, {
      redirect: 'error',
    }),
  ]);
  if (!creditsResponse.ok || !endpointsResponse.ok) {
    throw new Error(`OpenRouter authority check failed (${creditsResponse.status}/${endpointsResponse.status})`);
  }
  const credits = (await creditsResponse.json()) as {
    data?: { total_credits?: unknown; total_usage?: unknown };
  };
  const endpoints = (await endpointsResponse.json()) as {
    data?: {
      endpoints?: Array<{
        provider_name?: string;
        context_length?: number;
        pricing?: { prompt?: string; completion?: string };
        supported_parameters?: string[];
      }>;
    };
  };
  const endpoint = endpoints.data?.endpoints?.find(
    (candidate) => candidate.provider_name === config.route.endpointProvider,
  );
  if (
    !endpoint ||
    !endpoint.supported_parameters?.includes('structured_outputs') ||
    !endpoint.supported_parameters.includes('response_format') ||
    (endpoint.context_length ?? 0) < config.route.maxContextTokens
  ) {
    throw new Error('Configured OpenRouter endpoint no longer satisfies the captured route');
  }
  const inputPrice = BigInt(Math.ceil(Number(endpoint.pricing?.prompt) * 1_000_000_000_000));
  const outputPrice = BigInt(Math.ceil(Number(endpoint.pricing?.completion) * 1_000_000_000_000));
  if (
    inputPrice.toString() !== config.route.inputMicrousdPerMillion ||
    outputPrice.toString() !== config.route.outputMicrousdPerMillion
  ) {
    throw new Error('Configured OpenRouter endpoint pricing is stale');
  }
  const totalCreditsMicrousd = usdToMicrousd(credits.data?.total_credits);
  const totalUsageMicrousd = usdToMicrousd(credits.data?.total_usage);
  const verifiedAt = new Date().toISOString();
  return {
    totalCreditsMicrousd,
    totalUsageMicrousd,
    availableMicrousd: totalCreditsMicrousd - totalUsageMicrousd,
    verifiedAt,
    validUntil: new Date(Date.parse(verifiedAt) + 5 * 60_000).toISOString(),
  };
}

export async function provisionAndPreflightLiveEvaluation(input: {
  database: Database;
  config: EvaluationPacketConfig;
  manifest: unknown;
  review: DispatchReviewView;
  credits: CreditSnapshot;
}) {
  const localLimit = BigInt(input.config.recipe.maxMicrousd);
  await input.database.db.$client.query('BEGIN');
  try {
    await input.database.db.$client.query(
      'INSERT INTO storyteller_funding (id, limit_microusd, stopped, verified_at) VALUES ($1, $2, true, $3)',
      [input.config.accountId, localLimit.toString(), input.credits.verifiedAt],
    );
    await input.database.db.$client.query(
      'INSERT INTO storyteller_run (id, account_id, limit_microusd, max_attempts, enabled) VALUES ($1, $2, $3, $4, false)',
      [
        input.config.runId,
        input.config.accountId,
        localLimit.toString(),
        input.config.recipe.primaryCalls,
      ],
    );
    await input.database.db.$client.query('COMMIT');
  } catch (error) {
    await input.database.db.$client.query('ROLLBACK');
    throw error;
  }
  const availableMicrousd = input.credits.availableMicrousd < localLimit
    ? input.credits.availableMicrousd
    : localLimit;
  const preflight = preflightLiveEvaluation({
    manifest: input.manifest,
    now: new Date().toISOString(),
    review: input.review,
    funding: {
      availableMicrousd: availableMicrousd.toString(),
      verifiedAt: input.credits.verifiedAt,
      validUntil: input.credits.validUntil,
      accountingReady: true,
    },
    traceReady: true,
  });
  if (!preflight.eligible) {
    throw new Error(`Live evaluation preflight failed: ${preflight.failures.join(', ')}`);
  }
  return preflight.manifest;
}

export function preflightAdditionalLiveEvaluation(input: {
  manifest: unknown;
  review: DispatchReviewView;
  credits: CreditSnapshot;
  localAvailableMicrousd: bigint;
}) {
  const availableMicrousd =
    input.credits.availableMicrousd < input.localAvailableMicrousd
      ? input.credits.availableMicrousd
      : input.localAvailableMicrousd;
  const preflight = preflightLiveEvaluation({
    manifest: input.manifest,
    now: new Date().toISOString(),
    review: input.review,
    funding: {
      availableMicrousd: availableMicrousd.toString(),
      verifiedAt: input.credits.verifiedAt,
      validUntil: input.credits.validUntil,
      accountingReady: true,
    },
    traceReady: true,
  });
  if (!preflight.eligible) {
    throw new Error(`Additional packet preflight failed: ${preflight.failures.join(', ')}`);
  }
  return preflight.manifest;
}

async function apiRequest(
  apiOrigin: string,
  browserOrigin: string,
  cookie: string,
  path: string,
  init?: RequestInit,
) {
  const response = await fetch(`${apiOrigin}${path}`, {
    ...init,
    headers: {
      cookie,
      origin: browserOrigin,
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) throw new Error(`Live-flow API failed: ${response.status} ${path}`);
  return response.json();
}

export async function releaseHeldPacket(input: {
  apiOrigin: string;
  browserOrigin: string;
  cookie: string;
  review: DispatchReviewView;
}) {
  await apiRequest(
    input.apiOrigin,
    input.browserOrigin,
    input.cookie,
    `/api/chamber-tools/generations/${input.review.generationId}/dispatch-review`,
    {
      method: 'PUT',
      body: JSON.stringify({
        decisionId: crypto.randomUUID(),
        expectedRevision: input.review.revision,
        packetSha256: input.review.packetSha256,
        decision: 'release',
      }),
    },
  );
}

export async function waitForGenerationTerminal(database: Database, generationId: string) {
  for (let read = 0; read < 240; read++) {
    const status = await database.db.$client.query(
      'SELECT state FROM generation WHERE id = $1',
      [generationId],
    );
    const state = status.rows[0]?.state as string | undefined;
    if (state && ['succeeded', 'failed', 'uncertain'].includes(state)) return state;
    await delay(250);
  }
  throw new Error('Evaluation did not reach a terminal state');
}

/** Starts the reviewed opening and admits the first offered choice through ordinary HTTP. */
export async function captureHeldContinuation(input: {
  apiOrigin: string;
  browserOrigin: string;
  cookie: string;
  draftId: string;
  openingGenerationId: string;
  evidenceDirectory: string;
}) {
  const preview = openingPreviewSchema.parse(
    await apiRequest(
      input.apiOrigin,
      input.browserOrigin,
      input.cookie,
      `/api/drafts/${input.draftId}/openings/latest`,
    ),
  );
  if (preview.id !== input.openingGenerationId || preview.state !== 'succeeded') {
    throw new Error('Opening was not the current successful candidate');
  }
  const storyId = crypto.randomUUID();
  const started = storySnapshotSchema.parse(
    await apiRequest(
      input.apiOrigin,
      input.browserOrigin,
      input.cookie,
      `/api/stories/${storyId}/start`,
      {
        method: 'PUT',
        body: JSON.stringify({
          candidateId: input.openingGenerationId,
          expectedDraftRevision: preview.sourceRevision,
        }),
      },
    ),
  );
  const offer = started.current.interaction;
  const firstOption = offer?.specification.options[0];
  if (!offer || offer.specification.kind !== 'choice.v1' || !firstOption) {
    throw new Error('Opening did not publish a selectable first choice');
  }
  const generationId = crypto.randomUUID();
  await apiRequest(
    input.apiOrigin,
    input.browserOrigin,
    input.cookie,
    `/api/stories/${storyId}/resolutions/${generationId}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        expectedRevision: started.revision,
        submission: {
          interactionId: offer.id,
          answer: { kind: 'choice.v1', optionId: firstOption.id },
        },
      }),
    },
  );
  let review: DispatchReviewView | undefined;
  for (let read = 0; read < 60; read++) {
    const response = await fetch(
      `${input.apiOrigin}/api/chamber-tools/generations/${generationId}/dispatch-review`,
      { headers: { cookie: input.cookie, origin: input.browserOrigin } },
    );
    if (response.ok) {
      review = dispatchReviewResponseSchema.parse(await response.json()).review;
      break;
    }
    await delay(200);
  }
  if (!review) throw new Error('Continuation packet was not held');
  await mkdir(input.evidenceDirectory, { recursive: true });
  const evidencePath = join(
    input.evidenceDirectory,
    `continuation-request-${generationId}.json`,
  );
  await writeFile(evidencePath, `${JSON.stringify(review, null, 2)}\n`, { flag: 'wx' });
  return {
    storyId,
    generationId,
    review,
    evidencePath,
    selectedOption: { id: firstOption.id, label: firstOption.label },
  } as const;
}

export async function enableSingleLiveAttempt(database: Database, config: EvaluationPacketConfig) {
  await database.db.$client.query('BEGIN');
  try {
    const account = await database.db.$client.query(
      'UPDATE storyteller_funding SET stopped = false WHERE id = $1 AND stopped = true',
      [config.accountId],
    );
    const run = await database.db.$client.query(
      'UPDATE storyteller_run SET enabled = true WHERE id = $2 AND account_id = $1 AND enabled = false',
      [config.accountId, config.runId],
    );
    if (account.rowCount !== 1 || run.rowCount !== 1) {
      throw new Error('One-shot allowance could not be enabled exactly once');
    }
    await database.db.$client.query('COMMIT');
  } catch (error) {
    await database.db.$client.query('ROLLBACK');
    throw error;
  }
}

export async function closeSingleLiveAttempt(database: Database, config: EvaluationPacketConfig) {
  await database.db.$client.query('BEGIN');
  try {
    await database.db.$client.query(
      'UPDATE storyteller_run SET enabled = false WHERE id = $2 AND account_id = $1',
      [config.accountId, config.runId],
    );
    await database.db.$client.query(
      'UPDATE storyteller_funding SET stopped = true WHERE id = $1',
      [config.accountId],
    );
    await database.db.$client.query('COMMIT');
  } catch (error) {
    await database.db.$client.query('ROLLBACK');
    throw error;
  }
}

export async function saveLiveEvaluationReport(input: {
  database: Database;
  directory: string;
  config: EvaluationPacketConfig;
  generationId: string;
  creditsBefore: CreditSnapshot;
  creditsAfter: CreditSnapshot;
}) {
  const result = await input.database.db.$client.query(
    `SELECT g.state AS generation_state, g.failure_code, g.output,
            a.id AS attempt_id, a.state AS attempt_state, a.request_bytes,
            a.prompt_tokens, a.completion_tokens, a.reasoning_tokens,
            a.cached_tokens, a.cache_write_tokens, a.total_tokens,
            a.charged_microusd, a.calculated_microusd, a.reconciliation,
            a.provider_id, a.reported_model, a.finish_reason, a.http_status,
            a.duration_ms, a.dispatched_at, a.settled_at
       FROM generation g
       LEFT JOIN storyteller_attempt a ON a.generation_id = g.id
      WHERE g.id = $1`,
    [input.generationId],
  );
  const report = {
    version: 'live-evaluation-report.v1',
    evaluationId: input.config.id,
    generationId: input.generationId,
    route: input.config.route,
    recipe: input.config.recipe,
    providerCredits: {
      before: {
        totalCreditsMicrousd: input.creditsBefore.totalCreditsMicrousd.toString(),
        totalUsageMicrousd: input.creditsBefore.totalUsageMicrousd.toString(),
        availableMicrousd: input.creditsBefore.availableMicrousd.toString(),
        verifiedAt: input.creditsBefore.verifiedAt,
      },
      after: {
        totalCreditsMicrousd: input.creditsAfter.totalCreditsMicrousd.toString(),
        totalUsageMicrousd: input.creditsAfter.totalUsageMicrousd.toString(),
        availableMicrousd: input.creditsAfter.availableMicrousd.toString(),
        verifiedAt: input.creditsAfter.verifiedAt,
      },
    },
    durable: result.rows[0] ?? null,
    recordedAt: new Date().toISOString(),
  };
  const path = join(input.directory, `evaluation-report-${input.generationId}.json`);
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  return { path, report };
}
