import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Database } from '@offscreen/db';
import {
  createMemoryEvaluationManifest,
  preflightMemoryEvaluation,
} from '@offscreen/application/developer-tools';
import {
  evaluationPacketInspectionSchema,
  type MemoryEvaluationManifest,
  type MemoryEvaluationPacketConfig,
} from '@offscreen/contracts/live-evaluation';
import {
  dispatchReviewResponseSchema,
  type DispatchReviewView,
} from '@offscreen/contracts/chamber';
import { setTimeout as delay } from 'node:timers/promises';
import {
  closeSingleLiveAttempt,
  enableSingleLiveAttempt,
  releaseHeldPacket,
  verifyOpenRouterAuthority,
  type CreditSnapshot,
} from './live-evaluation-run.js';

export async function provisionMemoryEvaluation(input: {
  database: Database;
  config: MemoryEvaluationPacketConfig;
  manifest: unknown;
  review: DispatchReviewView;
  verifiedAt: string;
}) {
  await input.database.db.$client.query('BEGIN');
  try {
    await input.database.db.$client.query(
      'INSERT INTO storyteller_funding (id, limit_microusd, stopped, verified_at) VALUES ($1, 0, true, $2)',
      [input.config.accountId, input.verifiedAt],
    );
    await input.database.db.$client.query(
      'INSERT INTO storyteller_run (id, account_id, limit_microusd, max_attempts, enabled) VALUES ($1, $2, 0, $3, false)',
      [
        input.config.runId,
        input.config.accountId,
        input.config.recipe.modelRounds,
      ],
    );
    await input.database.db.$client.query('COMMIT');
  } catch (error) {
    await input.database.db.$client.query('ROLLBACK');
    throw error;
  }
  const preflight = preflightMemoryEvaluation({
    manifest: input.manifest,
    now: new Date().toISOString(),
    review: input.review,
    accountingReady: true,
    traceReady: true,
  });
  if (!preflight.eligible) {
    throw new Error(
      `Memory live preflight failed: ${preflight.failures.join(', ')}`,
    );
  }
  return preflight.manifest;
}

export async function requireSettledFreeMemoryAttempt(
  database: Database,
  attemptId: string,
) {
  const result = await database.db.$client.query(
    `SELECT id, generation_id, state, charged_microusd, calculated_microusd,
            reconciliation, prompt_tokens, completion_tokens, reasoning_tokens,
            total_tokens, provider_id, reported_model, finish_reason,
            http_status, duration_ms, dispatched_at, settled_at
       FROM storyteller_attempt
      WHERE id = $1`,
    [attemptId],
  );
  const attempt = result.rows[0] ?? null;
  if (
    !attempt ||
    attempt.state !== 'settled' ||
    attempt.charged_microusd !== '0' ||
    attempt.calculated_microusd !== '0' ||
    attempt.reconciliation !== 'matched'
  ) {
    throw new Error(
      'Memory evaluation stopped: prior attempt is not matched, settled, and free',
    );
  }
  return attempt;
}

export async function waitForMemoryEvaluationProgress(input: {
  apiOrigin: string;
  browserOrigin: string;
  cookie: string;
  database: Database;
  generationId: string;
  priorAttemptId: string;
}) {
  for (let read = 0; read < 240; read++) {
    const status = await input.database.db.$client.query(
      `SELECT g.state AS generation_state, g.failure_code,
              m.state AS memory_state, m.failure_code AS memory_failure_code,
              m.model_rounds_used, m.pending_model_attempt_id
         FROM generation g
         LEFT JOIN storyteller_memory_exploration m ON m.generation_id = g.id
        WHERE g.id = $1`,
      [input.generationId],
    );
    const row = status.rows[0];
    if (
      row?.generation_state &&
      ['succeeded', 'failed', 'uncertain'].includes(row.generation_state)
    ) {
      return { kind: 'terminal' as const, status: row };
    }
    if (
      row?.memory_state === 'held' &&
      row.pending_model_attempt_id &&
      row.pending_model_attempt_id !== input.priorAttemptId
    ) {
      const response = await fetch(
        `${input.apiOrigin}/api/chamber-tools/generations/${input.generationId}/dispatch-review`,
        { headers: { cookie: input.cookie, origin: input.browserOrigin } },
      );
      if (response.ok) {
        const review = dispatchReviewResponseSchema.parse(
          await response.json(),
        ).review;
        if (
          review.attemptId === row.pending_model_attempt_id &&
          review.state === 'awaiting-review'
        ) {
          return { kind: 'held' as const, status: row, review };
        }
      }
    }
    await delay(250);
  }
  throw new Error('Memory evaluation did not reach a review or terminal state');
}

export async function saveMemoryEvaluationReport(input: {
  database: Database;
  directory: string;
  config: MemoryEvaluationPacketConfig;
  generationId: string;
  credits: readonly CreditSnapshot[];
}) {
  const [state, attempts, reviews, operation] = await Promise.all([
    input.database.db.$client.query(
      `SELECT g.state AS generation_state, g.failure_code,
              m.state AS memory_state, m.failure_code AS memory_failure_code,
              m.model_rounds_used,
              COALESCE((m.snapshot ->> 'readsUsed')::integer, 0) AS reads_used,
              COALESCE((m.snapshot ->> 'retainedBytes')::integer, 0) AS retained_bytes
         FROM generation g
         LEFT JOIN storyteller_memory_exploration m ON m.generation_id = g.id
        WHERE g.id = $1`,
      [input.generationId],
    ),
    input.database.db.$client.query(
      `SELECT id, state, request_bytes, prompt_tokens, completion_tokens,
              reasoning_tokens, cached_tokens, cache_write_tokens, total_tokens,
              charged_microusd, calculated_microusd, reconciliation, provider_id,
              reported_model, finish_reason, http_status, duration_ms,
              dispatched_at, settled_at
         FROM storyteller_attempt
        WHERE generation_id = $1
        ORDER BY created_at, id`,
      [input.generationId],
    ),
    input.database.db.$client.query(
      `SELECT attempt_id, revision, state, packet_sha256, prepared_at, reviewed_at
         FROM storyteller_dispatch_review
        WHERE generation_id = $1
        ORDER BY prepared_at, attempt_id`,
      [input.generationId],
    ),
    input.database.db.$client.query(
      `SELECT state, max_model_rounds, reserved_rounds, dispatched_rounds,
              max_input_tokens, consumed_input_tokens,
              max_generated_tokens, consumed_generated_tokens,
              max_reasoning_tokens, consumed_reasoning_tokens,
              max_microusd, consumed_microusd, updated_at
         FROM storyteller_operation
        WHERE generation_id = $1`,
      [input.generationId],
    ),
  ]);
  const report = {
    version: 'memory-live-evaluation-report.v1',
    evaluationId: input.config.id,
    generationId: input.generationId,
    route: input.config.route,
    recipe: input.config.recipe,
    state: state.rows[0] ?? null,
    operation: operation.rows[0] ?? null,
    attempts: attempts.rows,
    reviews: reviews.rows,
    providerCredits: input.credits.map((snapshot) => ({
      totalCreditsMicrousd: snapshot.totalCreditsMicrousd.toString(),
      totalUsageMicrousd: snapshot.totalUsageMicrousd.toString(),
      availableMicrousd: snapshot.availableMicrousd.toString(),
      verifiedAt: snapshot.verifiedAt,
    })),
    rawProviderEvidence: 'provider-response-<provider_id>.json',
    recordedAt: new Date().toISOString(),
  };
  await mkdir(input.directory, { recursive: true });
  const path = join(
    input.directory,
    `memory-evaluation-report-${input.generationId}.json`,
  );
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  return { path, report };
}

export async function runMemoryEvaluation(input: {
  apiOrigin: string;
  browserOrigin: string;
  cookie: string;
  database: Database;
  directory: string;
  config: MemoryEvaluationPacketConfig;
  firstManifest: MemoryEvaluationManifest;
  firstReview: DispatchReviewView;
  creditsBefore: CreditSnapshot;
  apiKey: string;
}) {
  const credits = [input.creditsBefore];
  await provisionMemoryEvaluation({
    database: input.database,
    config: input.config,
    manifest: input.firstManifest,
    review: input.firstReview,
    verifiedAt: input.creditsBefore.verifiedAt,
  });
  await enableSingleLiveAttempt(input.database, input.config);
  let runFailure: unknown = null;
  try {
    await releaseHeldPacket({
      apiOrigin: input.apiOrigin,
      browserOrigin: input.browserOrigin,
      cookie: input.cookie,
      review: input.firstReview,
    });
    const firstProgress = await waitForMemoryEvaluationProgress({
      apiOrigin: input.apiOrigin,
      browserOrigin: input.browserOrigin,
      cookie: input.cookie,
      database: input.database,
      generationId: input.firstReview.generationId,
      priorAttemptId: input.firstReview.attemptId,
    });
    credits.push(await verifyOpenRouterAuthority(input.config, input.apiKey));
    await requireSettledFreeMemoryAttempt(
      input.database,
      input.firstReview.attemptId,
    );
    if (
      firstProgress.kind === 'terminal' &&
      firstProgress.status.generation_state !== 'succeeded'
    ) {
      throw new Error(
        `Memory evaluation stopped in ${String(firstProgress.status.generation_state)}`,
      );
    }
    if (firstProgress.kind === 'held') {
      const inspection = evaluationPacketInspectionSchema.parse(
        firstProgress.review.inspection,
      );
      const secondManifest = createMemoryEvaluationManifest({
        config: input.config,
        createdAt: new Date().toISOString(),
        review: {
          generationId: firstProgress.review.generationId,
          attemptId: firstProgress.review.attemptId,
          packetSha256: firstProgress.review.packetSha256,
          state: firstProgress.review.state,
          serializedBytes: inspection.serializedBytes,
        },
      });
      const preflight = preflightMemoryEvaluation({
        manifest: secondManifest,
        now: new Date().toISOString(),
        review: firstProgress.review,
        accountingReady: true,
        traceReady: true,
      });
      if (!preflight.eligible) {
        throw new Error(
          `Second memory packet preflight failed: ${preflight.failures.join(', ')}`,
        );
      }
      const secondManifestPath = join(
        input.directory,
        `memory-evaluation-manifest-${firstProgress.review.attemptId}.json`,
      );
      await writeFile(
        secondManifestPath,
        `${JSON.stringify(secondManifest, null, 2)}\n`,
        { flag: 'wx' },
      );
      await releaseHeldPacket({
        apiOrigin: input.apiOrigin,
        browserOrigin: input.browserOrigin,
        cookie: input.cookie,
        review: firstProgress.review,
      });
      const finalProgress = await waitForMemoryEvaluationProgress({
        apiOrigin: input.apiOrigin,
        browserOrigin: input.browserOrigin,
        cookie: input.cookie,
        database: input.database,
        generationId: input.firstReview.generationId,
        priorAttemptId: firstProgress.review.attemptId,
      });
      if (finalProgress.kind !== 'terminal') {
        throw new Error(
          'Memory evaluation attempted more than two model rounds',
        );
      }
      credits.push(await verifyOpenRouterAuthority(input.config, input.apiKey));
      await requireSettledFreeMemoryAttempt(
        input.database,
        firstProgress.review.attemptId,
      );
      if (finalProgress.status.generation_state !== 'succeeded') {
        throw new Error(
          `Memory evaluation stopped in ${String(finalProgress.status.generation_state)}`,
        );
      }
    }
  } catch (error) {
    runFailure = error;
  } finally {
    await closeSingleLiveAttempt(input.database, input.config);
  }
  const saved = await saveMemoryEvaluationReport({
    database: input.database,
    directory: input.directory,
    config: input.config,
    generationId: input.firstReview.generationId,
    credits,
  });
  if (runFailure) {
    throw new Error(
      `Memory evaluation stopped; report saved to ${saved.path}`,
      { cause: runFailure },
    );
  }
  return saved;
}
