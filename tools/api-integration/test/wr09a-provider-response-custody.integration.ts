/**
 * WR09A T04: durable writer provider response custody — fake transport, disposable SQL, local CAS.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { LocalDocumentStore } from '@offscreen/documents';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '@offscreen/lab-support';
import { prepareWriterRoundWire } from '@offscreen/storyteller/providers/openrouter';
import {
  prepareWriterRoundTransport,
  type PreparedWriterRoundTransport,
  type WriterRoundModelPolicy,
} from '@offscreen/storyteller/providers/writer-round-transport';
import {
  WriterMissionCustodyError,
  advanceDurableWriterMissionProviderStep,
  hashWriterMissionSerializedResponse,
  insertWriterMissionParentStep,
  readDurableWriterMissionResponse,
} from '@offscreen/story-engine/storyteller';

const FAKE_API_KEY = 'wr09a-integration-fake-key-not-live';

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: { kind: { type: 'string' } },
  required: ['kind'],
  additionalProperties: false,
};

const providerPolicy: WriterRoundModelPolicy = {
  model: 'anthropic/claude-3.5-sonnet',
  provider: 'Anthropic',
  priceVersion: 'wr09a-int.v1',
  inputMicrousdPerMillion: '3000000',
  outputMicrousdPerMillion: '15000000',
  maxInputTokens: 8192,
  maxOutputTokens: 1024,
  maxModelRounds: 3,
  maxMicrousd: 500_000n,
  timeoutMs: 30_000,
};

const ROOT_HASH = 'a'.repeat(64);
const CAPTURE_HASH = 'd'.repeat(64);

const RESPONSE_BODY = JSON.stringify({
  kind: 'final',
  proposal: { sceneHash: 'e'.repeat(64) },
});

const realUsage = {
  reportedCostMicrousd: 1234n,
  promptTokens: 88,
  completionTokens: 22,
  totalTokens: 110,
  reasoningTokens: null,
  cachedTokens: null,
  cacheWriteTokens: null,
};

const realTelemetry = {
  durationMs: 12,
  httpStatus: 200,
  providerId: 'gen_wr09a',
  reportedModel: providerPolicy.model,
  finishReason: 'stop',
};

const zeroUsage = {
  reportedCostMicrousd: 0n,
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  reasoningTokens: null,
  cachedTokens: null,
  cacheWriteTokens: null,
};

const zeroTelemetry = {
  durationMs: 0,
  httpStatus: 0,
  providerId: 'wr09a-none',
  reportedModel: null,
  finishReason: null,
};

const budgetSnapshot = {
  maxModelRounds: 6,
  maxInputTokens: 12_288,
  maxGeneratedTokens: 4_096,
  maxMicrousd: '250000',
  deadlineMs: 120_000,
};

type Harness = {
  database: ReturnType<typeof createDatabase>;
  storage: LocalDocumentStore;
  wireSha256: string;
  resultHash: string;
};

function buildPinnedWire() {
  return prepareWriterRoundWire({
    model: providerPolicy.model,
    provider: providerPolicy.provider,
    messages: [{ role: 'user', content: 'WR09A custody proof.' }],
    outputSchema: OUTPUT_SCHEMA,
    maxGeneratedTokens: providerPolicy.maxOutputTokens,
    maxSerializedRequestBytes: 48_000,
    maxInputTokens: providerPolicy.maxInputTokens,
  });
}

function openRouterSuccess(content: string, cost: string | number) {
  return new Response(
    JSON.stringify({
      id: 'gen_wr09a_001',
      model: providerPolicy.model,
      usage: {
        cost,
        prompt_tokens: realUsage.promptTokens,
        completion_tokens: realUsage.completionTokens,
        total_tokens: realUsage.totalTokens,
      },
      choices: [{ finish_reason: 'stop', message: { content, refusal: null } }],
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

function preparedFakeFetchTransport(
  wire: ReturnType<typeof buildPinnedWire>,
  options: { apiKey?: string | undefined; fetchCalls?: { count: number } } = {},
): PreparedWriterRoundTransport {
  const fetchCalls = options.fetchCalls ?? { count: 0 };
  return prepareWriterRoundTransport({
    capturedWire: wire,
    pinnedModelPolicy: providerPolicy,
    outputSchema: OUTPUT_SCHEMA,
    apiKey: 'apiKey' in options ? options.apiKey : FAKE_API_KEY,
    fetchImpl: async (url, init) => {
      fetchCalls.count += 1;
      assert.equal(
        String(url),
        'https://openrouter.ai/api/v1/chat/completions',
      );
      assert.equal(init?.body, wire.serialized);
      return openRouterSuccess(RESPONSE_BODY, '0.001234');
    },
  });
}

function scriptedTransport(
  wireSha256: string,
  outcome: () => Promise<
    PreparedWriterRoundTransport['invoke'] extends () => Promise<infer R>
      ? R
      : never
  >,
): PreparedWriterRoundTransport {
  return {
    preflight: () => ({ kind: 'ready', wireSha256 }),
    invoke: outcome,
  };
}

async function withDisposable(
  run: (h: Omit<Harness, 'wireSha256' | 'resultHash'>) => Promise<void>,
) {
  const runId = randomUUID();
  let provisioned;
  try {
    provisioned = await provisionDisposableSandboxDatabase({
      runId,
      confirmDisposableProvision: true,
      applyFullMigrations: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? 'unknown');
    console.error(
      `NOT-RUN: disposable Postgres unavailable (${message}). Is Docker/postgres up?`,
    );
    return { available: false as const };
  }
  const database = createDatabase(
    readDatabaseConfig({ DATABASE_URL: provisioned.connectionString }),
    () => {},
  );
  const storageRoot = await mkdtemp(join(tmpdir(), 'wr09a-cas-'));
  const storage = new LocalDocumentStore(storageRoot);
  try {
    await run({ database, storage });
    return { available: true as const };
  } finally {
    await database.close().catch(() => undefined);
    await destroyDisposableSandboxDatabase({
      runId,
      confirmDisposableProvision: true,
    });
  }
}

async function seedFundingStack(
  client: {
    query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
  },
  { fundingLimit = 250_000, runLimit = 250_000 } = {},
) {
  const generationId = randomUUID();
  const storyId = randomUUID();
  const ownerId = randomUUID();
  const userId = `user_${randomUUID()}`;
  await client.query(
    `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
     VALUES ($1, 'WR09A', $2, true, now(), now())`,
    [userId, `${userId}@example.test`],
  );
  await client.query(
    `INSERT INTO generation (id, owner_id, kind, status_revision, input, state)
     VALUES ($1, $2, 'writer-mission.v1', 0, '{}'::jsonb, 'pending')`,
    [generationId, userId],
  );
  const accountId = randomUUID();
  await client.query(
    `INSERT INTO storyteller_funding (id, limit_microusd, stopped, verified_at)
     VALUES ($1, $2, false, now())`,
    [accountId, fundingLimit],
  );
  const runRowId = randomUUID();
  await client.query(
    `INSERT INTO storyteller_run (id, account_id, limit_microusd, max_attempts, enabled)
     VALUES ($1, $2, $3, 6, true)`,
    [runRowId, accountId, runLimit],
  );
  await client.query(
    `INSERT INTO storyteller_operation (
       generation_id, account_id, run_id, owner_id, purpose, resources,
       max_model_rounds, max_input_tokens, max_generated_tokens, max_reasoning_tokens, max_microusd
     ) VALUES (
       $1, $2, $3, $4, 'writer-mission', '{}'::jsonb,
       6, 12288, 4096, 0, 250000
     )`,
    [generationId, accountId, runRowId, String(ownerId)],
  );
  return { generationId, storyId, ownerId, accountId, runRowId, userId };
}

async function seedWriterMission(
  database: ReturnType<typeof createDatabase>,
  stack: Awaited<ReturnType<typeof seedFundingStack>>,
  requestCasHash: string,
  stepPatch: {
    stepState?:
      | 'model-request-prepared'
      | 'attempt-reserved'
      | 'dispatched'
      | 'uncertain'
      | 'result-settled'
      | 'failed'
      | 'held';
    attemptId?: string | null;
    revision?: number;
    missionState?: string;
    resultCasHash?: string | null;
    responseObjectHash?: string | null;
  } = {},
) {
  const missionId = randomUUID();
  const missionRow = {
    missionId,
    generationId: stack.generationId,
    operationId: stack.generationId,
    ownerId: stack.ownerId,
    storyId: stack.storyId,
    captureSha256: CAPTURE_HASH,
    libraryRootHash: ROOT_HASH,
    libraryRootRevision: 3,
    budgetSnapshot,
    ...(stepPatch.missionState
      ? {
          state: stepPatch.missionState as
            | 'active'
            | 'uncertain'
            | 'failed'
            | 'held'
            | 'captured'
            | 'proposal-ready',
        }
      : {}),
  };
  await insertWriterMissionParentStep(database, missionRow, {
    ordinal: 1,
    requestCasHash,
    resultCasHash: stepPatch.resultCasHash ?? null,
    responseObjectHash: stepPatch.responseObjectHash ?? null,
    attemptId: stepPatch.attemptId ?? null,
    revision: stepPatch.revision ?? 1,
    state: stepPatch.stepState ?? 'model-request-prepared',
  });
  return { missionId };
}

async function advanceInput(
  missionId: string,
  stack: Awaited<ReturnType<typeof seedFundingStack>>,
  attemptId: string,
  wireSha256: string,
  expectedRevision = 1,
) {
  return {
    missionId,
    ordinal: 1,
    attemptId,
    expectedRevision,
    providerPolicy,
    expectedWireSha256: wireSha256,
    reservedMicrousd: 50_000n,
  };
}

async function readStepRow(
  client: {
    query: (
      sql: string,
      params?: unknown[],
    ) => Promise<{ rows: Record<string, unknown>[] }>;
  },
  missionId: string,
) {
  const result = await client.query(
    `SELECT state, revision, result_cas_hash, response_object_hash, attempt_id
     FROM storyteller_writer_step
     WHERE mission_id = $1 AND context_id = $1 AND ordinal = 1`,
    [missionId],
  );
  return result.rows[0];
}

async function readAttemptRow(
  client: {
    query: (
      sql: string,
      params?: unknown[],
    ) => Promise<{ rows: Record<string, unknown>[] }>;
  },
  attemptId: string,
) {
  const result = await client.query(
    `SELECT state, charged_microusd, reconciliation FROM storyteller_attempt WHERE id = $1`,
    [attemptId],
  );
  return result.rows[0];
}

test('WR09A: durable delivery preserves SHA, charges once, replays without credential or resend', async () => {
  const gate = await withDisposable(async ({ database, storage }) => {
    const wire = buildPinnedWire();
    const stack = await seedFundingStack(database.db.$client);
    const attemptId = randomUUID();
    const { missionId } = await seedWriterMission(database, stack, wire.sha256);
    const fetchCalls = { count: 0 };
    const transport = preparedFakeFetchTransport(wire, { fetchCalls });
    const input = await advanceInput(missionId, stack, attemptId, wire.sha256);
    const delivered = await advanceDurableWriterMissionProviderStep(
      database,
      storage,
      input,
      transport,
    );
    assert.equal(delivered.status, 'delivered');
    assert.equal(
      delivered.resultCasHash,
      hashWriterMissionSerializedResponse(RESPONSE_BODY),
    );
    assert.equal(fetchCalls.count, 1);
    const step = await readStepRow(database.db.$client, missionId);
    assert.equal(step?.state, 'result-settled');
    assert.equal(step?.result_cas_hash, delivered.resultCasHash);
    assert.ok(step?.response_object_hash);
    const attempt = await readAttemptRow(database.db.$client, attemptId);
    assert.equal(attempt?.state, 'settled');
    assert.equal(String(attempt?.charged_microusd), '1234');
    assert.notEqual(attempt?.reconciliation, 'unknown');

    const body = await readDurableWriterMissionResponse(database, storage, {
      missionId,
      ordinal: 1,
      attemptId,
      requestSha256: wire.sha256,
    });
    assert.equal(body, RESPONSE_BODY);

    const missingCredTransport = preparedFakeFetchTransport(wire, {
      apiKey: undefined,
      fetchCalls,
    });
    const replay = await advanceDurableWriterMissionProviderStep(
      database,
      storage,
      { ...input, expectedRevision: Number(step?.revision) },
      missingCredTransport,
    );
    assert.equal(replay.status, 'replayed');
    assert.equal(replay.resultCasHash, delivered.resultCasHash);
    assert.equal(fetchCalls.count, 1);
  });
  if (!gate?.available) return;
});

test('WR09A: missing or blank credential preflight holds without fetch or new attempt', async () => {
  const gate = await withDisposable(async ({ database, storage }) => {
    const wire = buildPinnedWire();
    for (const apiKey of [undefined, '', '   '] as const) {
      const stack = await seedFundingStack(database.db.$client);
      const attemptId = randomUUID();
      const { missionId } = await seedWriterMission(
        database,
        stack,
        wire.sha256,
      );
      const fetchCalls = { count: 0 };
      const transport = preparedFakeFetchTransport(wire, {
        apiKey,
        fetchCalls,
      });
      const held = await advanceDurableWriterMissionProviderStep(
        database,
        storage,
        await advanceInput(missionId, stack, attemptId, wire.sha256),
        transport,
      );
      assert.equal(held.status, 'held');
      assert.match(held.reason ?? '', /credential_missing|wire_rejected/);
      assert.equal(held.transportInvoked, false);
      assert.equal(fetchCalls.count, 0);
      const attempts = await database.db.$client.query(
        `SELECT count(*)::int AS count FROM storyteller_attempt WHERE generation_id = $1`,
        [stack.generationId],
      );
      assert.equal(attempts.rows[0]?.count, 0);
    }
  });
  if (!gate?.available) return;
});

test('WR09A: wrong wire pin and request pin are denied before send', async () => {
  const gate = await withDisposable(async ({ database, storage }) => {
    const wire = buildPinnedWire();
    const stack = await seedFundingStack(database.db.$client);
    const attemptId = randomUUID();
    const { missionId } = await seedWriterMission(database, stack, wire.sha256);
    const fetchCalls = { count: 0 };
    const transport = preparedFakeFetchTransport(wire, { fetchCalls });
    const wrongExpected = await advanceDurableWriterMissionProviderStep(
      database,
      storage,
      {
        ...(await advanceInput(missionId, stack, attemptId, 'f'.repeat(64))),
        expectedWireSha256: 'f'.repeat(64),
      },
      transport,
    );
    assert.equal(wrongExpected.status, 'held');
    assert.match(
      wrongExpected.reason ?? '',
      /wire_mismatch|request_pin_mismatch|request_cas_mismatch/,
    );
    assert.equal(fetchCalls.count, 0);

    const stack2 = await seedFundingStack(database.db.$client);
    const { missionId: mission2 } = await seedWriterMission(
      database,
      stack2,
      wire.sha256,
    );
    const attempt2 = randomUUID();
    const wrongTransport = scriptedTransport(wire.sha256, async () => ({
      kind: 'delivered',
      serializedResponse: RESPONSE_BODY,
      usage: realUsage,
      telemetry: realTelemetry,
      exactWireSha256: '0'.repeat(64),
    }));
    const wrongWire = await advanceDurableWriterMissionProviderStep(
      database,
      storage,
      await advanceInput(mission2, stack2, attempt2, wire.sha256),
      wrongTransport,
    );
    assert.equal(wrongWire.status, 'uncertain');
    assert.equal(wrongWire.transportInvoked, true);
  });
  if (!gate?.available) return;
});

test('WR09A: unknown possible-send stays uncertain and never resends', async () => {
  const gate = await withDisposable(async ({ database, storage }) => {
    const wire = buildPinnedWire();
    const stack = await seedFundingStack(database.db.$client);
    const attemptId = randomUUID();
    const { missionId } = await seedWriterMission(database, stack, wire.sha256);
    const calls = { count: 0 };
    const transport = scriptedTransport(wire.sha256, async () => {
      calls.count += 1;
      return {
        kind: 'unknown',
        telemetry: realTelemetry,
        exactWireSha256: wire.sha256,
      };
    });
    const uncertain = await advanceDurableWriterMissionProviderStep(
      database,
      storage,
      await advanceInput(missionId, stack, attemptId, wire.sha256),
      transport,
    );
    assert.equal(uncertain.status, 'uncertain');
    assert.equal(uncertain.transportInvoked, true);
    assert.equal(calls.count, 1);
    const step = await readStepRow(database.db.$client, missionId);
    assert.equal(step?.state, 'uncertain');
    const attempt = await readAttemptRow(database.db.$client, attemptId);
    assert.equal(attempt?.state, 'uncertain');
    const noResend = await advanceDurableWriterMissionProviderStep(
      database,
      storage,
      {
        ...(await advanceInput(missionId, stack, attemptId, wire.sha256)),
        expectedRevision: Number(step?.revision),
      },
      transport,
    );
    assert.equal(noResend.status, 'uncertain');
    assert.equal(noResend.transportInvoked, false);
    assert.equal(calls.count, 1);
  });
  if (!gate?.available) return;
});

test('WR09A: sent failure charges and fails atomically', async () => {
  const gate = await withDisposable(async ({ database, storage }) => {
    const wire = buildPinnedWire();
    const stack = await seedFundingStack(database.db.$client);
    const sentAttempt = randomUUID();
    const { missionId: sentMission } = await seedWriterMission(
      database,
      stack,
      wire.sha256,
    );
    const sentTransport = scriptedTransport(wire.sha256, async () => ({
      kind: 'failed',
      failureCode: 'provider_refusal',
      sent: true,
      usage: realUsage,
      telemetry: { ...realTelemetry, httpStatus: 503 },
      exactWireSha256: wire.sha256,
    }));
    const sentFailed = await advanceDurableWriterMissionProviderStep(
      database,
      storage,
      await advanceInput(sentMission, stack, sentAttempt, wire.sha256),
      sentTransport,
    );
    assert.equal(sentFailed.status, 'failed');
    const sentStep = await readStepRow(database.db.$client, sentMission);
    assert.equal(sentStep?.state, 'failed');
    assert.equal(sentStep?.response_object_hash, null);
    const sentAttemptRow = await readAttemptRow(
      database.db.$client,
      sentAttempt,
    );
    assert.equal(sentAttemptRow?.state, 'settled');
    assert.equal(String(sentAttemptRow?.charged_microusd), '1234');
  });
  if (!gate?.available) return;
});

test('WR09A: unsent failure releases reserved attempt without charge', async () => {
  const gate = await withDisposable(async ({ database, storage }) => {
    const wire = buildPinnedWire();
    const stack = await seedFundingStack(database.db.$client);
    const unsentAttempt = randomUUID();
    const { missionId: unsentMission } = await seedWriterMission(
      database,
      stack,
      wire.sha256,
    );
    const unsentTransport = scriptedTransport(wire.sha256, async () => ({
      kind: 'failed',
      failureCode: 'wire_rejected',
      sent: false,
      usage: zeroUsage,
      telemetry: zeroTelemetry,
      exactWireSha256: null,
    }));
    const unsentFailed = await advanceDurableWriterMissionProviderStep(
      database,
      storage,
      await advanceInput(unsentMission, stack, unsentAttempt, wire.sha256),
      unsentTransport,
    );
    assert.equal(unsentFailed.status, 'held');
    assert.equal(unsentFailed.reason, 'wire_rejected');
    const unsentAttemptRow = await readAttemptRow(
      database.db.$client,
      unsentAttempt,
    );
    assert.equal(unsentAttemptRow?.state, 'unsent');
    assert.equal(String(unsentAttemptRow?.charged_microusd), '0');
  });
  if (!gate?.available) return;
});

test('WR09A: settlement before pointer CAS rolls back funding and leaves dispatched uncertain', async () => {
  const gate = await withDisposable(async ({ database, storage }) => {
    const wire = buildPinnedWire();
    const stack = await seedFundingStack(database.db.$client);
    const attemptId = randomUUID();
    const { missionId } = await seedWriterMission(database, stack, wire.sha256);
    const fetchCalls = { count: 0 };
    const inner = preparedFakeFetchTransport(wire, { fetchCalls });
    const transport: PreparedWriterRoundTransport = {
      preflight: () => inner.preflight(),
      invoke: async () => {
        const outcome = await inner.invoke();
        if (outcome.kind === 'delivered') {
          await database.db.$client.query(
            `UPDATE storyteller_writer_step SET revision = revision + 1
             WHERE mission_id = $1 AND context_id = $1 AND ordinal = 1`,
            [missionId],
          );
        }
        return outcome;
      },
    };
    const rollbackInput = await advanceInput(
      missionId,
      stack,
      attemptId,
      wire.sha256,
    );
    await assert.rejects(
      () =>
        advanceDurableWriterMissionProviderStep(
          database,
          storage,
          rollbackInput,
          transport,
        ),
      (error: unknown) =>
        error instanceof WriterMissionCustodyError &&
        error.code === 'revision_conflict',
    );
    const step = await readStepRow(database.db.$client, missionId);
    assert.equal(step?.state, 'dispatched');
    assert.equal(step?.response_object_hash, null);
    const attempt = await readAttemptRow(database.db.$client, attemptId);
    assert.equal(attempt?.state, 'dispatched');
    assert.equal(String(attempt?.charged_microusd ?? '0'), '0');
    const calls = { count: 0 };
    const replayTransport = scriptedTransport(wire.sha256, async () => {
      calls.count += 1;
      return {
        kind: 'delivered',
        serializedResponse: RESPONSE_BODY,
        usage: realUsage,
        telemetry: realTelemetry,
        exactWireSha256: wire.sha256,
      };
    });
    const uncertain = await advanceDurableWriterMissionProviderStep(
      database,
      storage,
      {
        ...(await advanceInput(missionId, stack, attemptId, wire.sha256)),
        expectedRevision: Number(step?.revision),
      },
      replayTransport,
    );
    assert.equal(uncertain.status, 'uncertain');
    assert.equal(uncertain.transportInvoked, false);
    assert.equal(calls.count, 0);
  });
  if (!gate?.available) return;
});

test('WR09A: already-dispatched step stays uncertain with zero transport', async () => {
  const gate = await withDisposable(async ({ database, storage }) => {
    const wire = buildPinnedWire();
    const stack = await seedFundingStack(database.db.$client);
    const attemptId = randomUUID();
    await database.db.$client.query(
      `INSERT INTO storyteller_attempt (
        id, generation_id, account_id, run_id, owner_id, story_id, purpose,
        storyteller_profile_id, storyteller_profile_revision, task_input_version,
        prompt_version, recipe_version, resource_policy_version,
        requested_model, requested_provider, price_version, attribution,
        state, reserved_microusd, reserved_input_tokens, reserved_generated_tokens,
        reserved_reasoning_tokens, estimated_microusd, estimated_input_tokens,
        estimation_method, reconciliation, request_bytes, policy, dispatched_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'writer-mission.v1',
        'writer-mission.v1', 1, 1,
        'writer-mission.v1', 'writer-mission.v1', 'writer-mission.v1',
        $7, $8, 'wr09a-int.v1',
        '{"kind":"writer-mission.v1"}'::jsonb,
        'dispatched', 50000, 256, 256,
        0, 50000, 256,
        'writer-mission-custody', 'pending', 128,
        '{"version":"writer-round.v1"}'::jsonb,
        now()
      )`,
      [
        attemptId,
        stack.generationId,
        stack.accountId,
        stack.runRowId,
        String(stack.ownerId),
        stack.storyId,
        providerPolicy.model,
        providerPolicy.provider,
      ],
    );
    const { missionId } = await seedWriterMission(
      database,
      stack,
      wire.sha256,
      {
        stepState: 'dispatched',
        attemptId,
        revision: 2,
      },
    );
    const calls = { count: 0 };
    const transport = scriptedTransport(wire.sha256, async () => {
      calls.count += 1;
      return {
        kind: 'delivered',
        serializedResponse: RESPONSE_BODY,
        usage: realUsage,
        telemetry: realTelemetry,
        exactWireSha256: wire.sha256,
      };
    });
    const outcome = await advanceDurableWriterMissionProviderStep(
      database,
      storage,
      {
        ...(await advanceInput(missionId, stack, attemptId, wire.sha256)),
        expectedRevision: 2,
      },
      transport,
    );
    assert.equal(outcome.status, 'uncertain');
    assert.equal(outcome.transportInvoked, false);
    assert.equal(calls.count, 0);
  });
  if (!gate?.available) return;
});

test('WR09A: corrupt or mismatched private CAS read is denied', async () => {
  const gate = await withDisposable(async ({ database, storage }) => {
    const wire = buildPinnedWire();
    const stack = await seedFundingStack(database.db.$client);
    const attemptId = randomUUID();
    const { missionId } = await seedWriterMission(database, stack, wire.sha256);
    const transport = preparedFakeFetchTransport(wire);
    const delivered = await advanceDurableWriterMissionProviderStep(
      database,
      storage,
      await advanceInput(missionId, stack, attemptId, wire.sha256),
      transport,
    );
    assert.equal(delivered.status, 'delivered');
    const step = await readStepRow(database.db.$client, missionId);
    const objectHash = String(step?.response_object_hash);
    const path = join(
      storage.root,
      'objects',
      'sha256',
      objectHash.slice(0, 2),
      `${objectHash}.json`,
    );
    const { readFile, writeFile } = await import('node:fs/promises');
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as {
      data: { responseSha256: string; serializedResponse: string };
    };
    parsed.data.responseSha256 = 'f'.repeat(64);
    await writeFile(path, JSON.stringify(parsed), 'utf8');

    await assert.rejects(
      () =>
        readDurableWriterMissionResponse(database, storage, {
          missionId,
          ordinal: 1,
          attemptId,
          requestSha256: wire.sha256,
        }),
      (error: unknown) =>
        error instanceof WriterMissionCustodyError ||
        (error instanceof Error &&
          /corrupt|response_digest_mismatch|storage_mismatch|schema_mismatch/.test(
            error.message,
          )),
    );

    await assert.rejects(
      () =>
        readDurableWriterMissionResponse(database, storage, {
          missionId,
          ordinal: 1,
          attemptId: randomUUID(),
          requestSha256: wire.sha256,
        }),
      (error: unknown) => error instanceof WriterMissionCustodyError,
    );
  });
  if (!gate?.available) return;
});
