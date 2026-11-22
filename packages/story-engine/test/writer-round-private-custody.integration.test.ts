/**
 * WR10 T01: private two-phase writer round custody — prepare/submit financial proof.
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
import type { WriterRoundModelPolicy } from '@offscreen/storyteller/providers/writer-round-transport';
import {
  computeWriterRoundWorstCaseReservedMicrousd,
  hashWriterMissionSerializedResponse,
  insertWriterMissionParentStep,
  preparePrivateWriterRound,
  submitPrivateWriterRoundOutcome,
} from '@offscreen/story-engine/storyteller';

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: { kind: { type: 'string' } },
  required: ['kind'],
  additionalProperties: false,
};

const providerPolicy: WriterRoundModelPolicy = {
  model: 'anthropic/claude-3.5-sonnet',
  provider: 'Anthropic',
  priceVersion: 'wr10-int.v1',
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
  providerId: 'gen_wr10',
  reportedModel: providerPolicy.model,
  finishReason: 'stop',
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
};

function buildPinnedWire() {
  return prepareWriterRoundWire({
    model: providerPolicy.model,
    provider: providerPolicy.provider,
    messages: [{ role: 'user', content: 'WR10 private custody proof.' }],
    outputSchema: OUTPUT_SCHEMA,
    maxGeneratedTokens: providerPolicy.maxOutputTokens,
    maxSerializedRequestBytes: 48_000,
    maxInputTokens: providerPolicy.maxInputTokens,
  });
}

async function withDisposable(
  run: (h: Harness) => Promise<void>,
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
  const storageRoot = await mkdtemp(join(tmpdir(), 'wr10-private-cas-'));
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
     VALUES ($1, 'WR10', $2, true, now(), now())`,
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
) {
  const missionId = randomUUID();
  await insertWriterMissionParentStep(
    database,
    {
      missionId,
      generationId: stack.generationId,
      operationId: stack.generationId,
      ownerId: stack.ownerId,
      storyId: stack.storyId,
      captureSha256: CAPTURE_HASH,
      libraryRootHash: ROOT_HASH,
      libraryRootRevision: 3,
      budgetSnapshot,
    },
    {
      ordinal: 1,
      requestCasHash,
      state: 'model-request-prepared',
      revision: 1,
    },
  );
  return { missionId };
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
    `SELECT state, charged_microusd, reconciliation, reserved_microusd, request_bytes
     FROM storyteller_attempt WHERE id = $1`,
    [attemptId],
  );
  return result.rows[0];
}

test('WR10 T01: delivered prepare+submit charges once with worst-case reservation bytes', async () => {
  const gate = await withDisposable(async ({ database, storage }) => {
    const wire = buildPinnedWire();
    const stack = await seedFundingStack(database.db.$client);
    const attemptId = randomUUID();
    const { missionId } = await seedWriterMission(database, stack, wire.sha256);

    const worstCase = computeWriterRoundWorstCaseReservedMicrousd(providerPolicy);
    assert.ok(worstCase > 0n);
    assert.ok(worstCase <= providerPolicy.maxMicrousd);

    const prepared = await preparePrivateWriterRound(database, {
      missionId,
      ordinal: 1,
      attemptId,
      expectedRevision: 1,
      wire,
      policy: providerPolicy,
    });
    assert.equal(prepared.status, 'ready');
    if (prepared.status !== 'ready') return;
    assert.equal(prepared.requestSha256, wire.sha256);

    const attemptAfterPrepare = await readAttemptRow(
      database.db.$client,
      attemptId,
    );
    assert.equal(attemptAfterPrepare?.state, 'dispatched');
    assert.equal(
      String(attemptAfterPrepare?.reserved_microusd),
      String(worstCase),
    );
    assert.ok(Number(attemptAfterPrepare?.request_bytes) > 128);

    const delivered = await submitPrivateWriterRoundOutcome(database, storage, {
      missionId,
      ordinal: 1,
      attemptId,
      requestSha256: wire.sha256,
      expectedRevision: prepared.revision,
      outcome: {
        kind: 'delivered',
        serializedResponse: RESPONSE_BODY,
        usage: realUsage,
        telemetry: realTelemetry,
        exactWireSha256: wire.sha256,
      },
    });
    assert.equal(delivered.status, 'delivered');
    if (delivered.status !== 'delivered') return;
    assert.equal(
      delivered.resultCasHash,
      hashWriterMissionSerializedResponse(RESPONSE_BODY),
    );

    const attempt = await readAttemptRow(database.db.$client, attemptId);
    assert.equal(attempt?.state, 'settled');
    assert.equal(String(attempt?.charged_microusd), '1234');
    assert.notEqual(attempt?.reconciliation, 'unknown');
  });
  if (!gate?.available) return;
});

test('WR10 T01: unknown submit and second prepare stay uncertain without double charge', async () => {
  const gate = await withDisposable(async ({ database, storage }) => {
    const wire = buildPinnedWire();
    const stack = await seedFundingStack(database.db.$client);
    const attemptId = randomUUID();
    const { missionId } = await seedWriterMission(database, stack, wire.sha256);

    const prepared = await preparePrivateWriterRound(database, {
      missionId,
      ordinal: 1,
      attemptId,
      expectedRevision: 1,
      wire,
      policy: providerPolicy,
    });
    assert.equal(prepared.status, 'ready');
    if (prepared.status !== 'ready') return;

    const unknown = await submitPrivateWriterRoundOutcome(database, storage, {
      missionId,
      ordinal: 1,
      attemptId,
      requestSha256: wire.sha256,
      expectedRevision: prepared.revision,
      outcome: { kind: 'unknown', telemetry: realTelemetry },
    });
    assert.equal(unknown.status, 'uncertain');

    const attemptAfterUnknown = await readAttemptRow(
      database.db.$client,
      attemptId,
    );
    assert.equal(attemptAfterUnknown?.state, 'uncertain');
    assert.equal(String(attemptAfterUnknown?.charged_microusd ?? 0), '0');

    const stepAfterUnknown = await database.db.$client.query(
      `SELECT revision FROM storyteller_writer_step
       WHERE mission_id = $1 AND context_id = $1 AND ordinal = 1`,
      [missionId],
    );
    const secondPrepare = await preparePrivateWriterRound(database, {
      missionId,
      ordinal: 1,
      attemptId,
      expectedRevision: Number(stepAfterUnknown.rows[0]?.revision),
      wire,
      policy: providerPolicy,
    });
    assert.equal(secondPrepare.status, 'uncertain');
  });
  if (!gate?.available) return;
});

test('WR10 T01: permissive policy is held before reserve', async () => {
  const gate = await withDisposable(async ({ database }) => {
    const wire = buildPinnedWire();
    const stack = await seedFundingStack(database.db.$client);
    const attemptId = randomUUID();
    const { missionId } = await seedWriterMission(database, stack, wire.sha256);

    const tooPermissive: WriterRoundModelPolicy = {
      ...providerPolicy,
      maxMicrousd: 1n,
    };
    const held = await preparePrivateWriterRound(database, {
      missionId,
      ordinal: 1,
      attemptId,
      expectedRevision: 1,
      wire,
      policy: tooPermissive,
    });
    assert.equal(held.status, 'held');
    assert.equal(held.status === 'held' ? held.reason : '', 'policy_max_microusd_exceeded');

    const attempts = await database.db.$client.query(
      `SELECT count(*)::int AS count FROM storyteller_attempt WHERE id = $1`,
      [attemptId],
    );
    assert.equal(attempts.rows[0]?.count, 0);
  });
  if (!gate?.available) return;
});