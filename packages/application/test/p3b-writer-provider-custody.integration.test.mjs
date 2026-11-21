import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../dist/developer-tools/index.js';
import {
  advanceWriterMissionProviderStep,
  hashWriterMissionSerializedResponse,
  insertWriterMissionParentStep,
} from '../dist/storyteller/index.js';

const ROOT_HASH = 'a'.repeat(64);
const REQUEST_HASH = 'b'.repeat(64);
const CAPTURE_HASH = 'd'.repeat(64);
const RESPONSE_BODY = JSON.stringify({
  kind: 'final',
  proposal: { sceneHash: 'e'.repeat(64) },
});
const RESULT_HASH = hashWriterMissionSerializedResponse(RESPONSE_BODY);

const budgetSnapshot = {
  maxModelRounds: 6,
  maxInputTokens: 12_288,
  maxGeneratedTokens: 4_096,
  maxMicrousd: '250000',
  deadlineMs: 120_000,
};

const providerPolicy = {
  model: 'anthropic/claude-3.5-sonnet',
  provider: 'Anthropic',
  priceVersion: 'p3b-int.v1',
  inputMicrousdPerMillion: '3000000',
  outputMicrousdPerMillion: '15000000',
  maxInputTokens: 8192,
  maxOutputTokens: 1024,
  maxModelRounds: 3,
  maxMicrousd: 500_000n,
  timeoutMs: 30_000,
};

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
  providerId: 'gen_p3b',
  reportedModel: providerPolicy.model,
  finishReason: 'stop',
};

async function withDisposable(run) {
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
    test.diagnostic(
      `NOT-RUN: disposable Postgres unavailable (${message}). Is Docker/postgres up?`,
    );
    return;
  }
  const database = createDatabase(
    readDatabaseConfig({
      DATABASE_URL: provisioned.connectionString,
    }),
    () => {},
  );
  try {
    await run(database);
  } finally {
    await database.close().catch(() => undefined);
    await destroyDisposableSandboxDatabase({
      runId,
      confirmDisposableProvision: true,
    });
  }
}

async function seedFundingStack(
  client,
  { fundingLimit = 250000, runLimit = 250000 } = {},
) {
  const generationId = randomUUID();
  const storyId = randomUUID();
  const ownerId = randomUUID();
  const userId = `user_${randomUUID()}`;
  await client.query(
    `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
     VALUES ($1, 'P3B', $2, true, now(), now())`,
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
  return { generationId, storyId, ownerId, accountId, runRowId };
}

async function seedWriterMission(database, stack, stepPatch = {}) {
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
      budgetSnapshot: stepPatch.budgetSnapshot ?? budgetSnapshot,
      state: stepPatch.missionState,
    },
    {
      ordinal: 1,
      requestCasHash: stepPatch.requestCasHash ?? REQUEST_HASH,
      resultCasHash: stepPatch.resultCasHash ?? null,
      attemptId: stepPatch.attemptId ?? null,
      revision: stepPatch.revision ?? 1,
      state: stepPatch.stepState ?? 'model-request-prepared',
    },
  );
  return { missionId };
}

test('P3B: real providerPolicy settlement charges reported usage', async () => {
  await withDisposable(async (database) => {
    const stack = await seedFundingStack(database.db.$client);
    const attemptId = randomUUID();
    const { missionId } = await seedWriterMission(database, stack, {
      stepState: 'model-request-prepared',
      requestCasHash: REQUEST_HASH,
    });
    const counter = { calls: 0 };
    const transport = async () => {
      counter.calls += 1;
      return {
        kind: 'delivered',
        serializedResponse: RESPONSE_BODY,
        usage: realUsage,
        telemetry: realTelemetry,
        exactWireSha256: REQUEST_HASH,
      };
    };
    const delivered = await advanceWriterMissionProviderStep(
      database,
      {
        missionId,
        ordinal: 1,
        attemptId,
        expectedRevision: 1,
        providerPolicy,
        expectedWireSha256: REQUEST_HASH,
        reservedMicrousd: 50_000n,
      },
      transport,
    );
    assert.equal(delivered.status, 'delivered');
    assert.equal(delivered.resultCasHash, RESULT_HASH);
    assert.equal(counter.calls, 1);
    const attempt = await database.db.$client.query(
      `SELECT charged_microusd, prompt_tokens, reconciliation
       FROM storyteller_attempt WHERE id = $1`,
      [attemptId],
    );
    assert.equal(String(attempt.rows[0].charged_microusd), '1234');
    assert.equal(attempt.rows[0].prompt_tokens, 88);
    assert.notEqual(attempt.rows[0].reconciliation, 'unknown');
  });
});

test('P3B: unavailable grant holds without transport', async () => {
  await withDisposable(async (database) => {
    const stack = await seedFundingStack(database.db.$client, {
      fundingLimit: 100,
      runLimit: 100,
    });
    const attemptId = randomUUID();
    const { missionId } = await seedWriterMission(database, stack);
    const counter = { calls: 0 };
    const held = await advanceWriterMissionProviderStep(
      database,
      {
        missionId,
        ordinal: 1,
        attemptId,
        expectedRevision: 1,
        providerPolicy,
        expectedWireSha256: REQUEST_HASH,
        reservedMicrousd: 50_000n,
      },
      async () => {
        counter.calls += 1;
        return { kind: 'unknown' };
      },
    );
    assert.equal(held.status, 'held');
    assert.equal(held.reason, 'budget_unavailable');
    assert.equal(counter.calls, 0);
  });
});

test('P3B: uncertain replay does not call transport again', async () => {
  await withDisposable(async (database) => {
    const stack = await seedFundingStack(database.db.$client);
    const uncertainAttempt = randomUUID();
    const uncertainStory = randomUUID();
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
        'anthropic/claude-3.5-sonnet', 'Anthropic', 'p3b-int.v1',
        '{"kind":"writer-mission.v1"}'::jsonb,
        'uncertain', 50000, 256, 256,
        0, 50000, 256,
        'writer-mission-custody', 'unknown', 128,
        '{"version":"writer-round.v1"}'::jsonb,
        now()
      )`,
      [
        uncertainAttempt,
        stack.generationId,
        stack.accountId,
        stack.runRowId,
        String(stack.ownerId),
        uncertainStory,
      ],
    );
    const { missionId } = await seedWriterMission(database, stack, {
      stepState: 'uncertain',
      attemptId: uncertainAttempt,
      revision: 3,
      missionState: 'uncertain',
    });
    const counter = { calls: 0 };
    const replay = await advanceWriterMissionProviderStep(
      database,
      {
        missionId,
        ordinal: 1,
        attemptId: uncertainAttempt,
        expectedRevision: 3,
        providerPolicy,
        expectedWireSha256: REQUEST_HASH,
      },
      async () => {
        counter.calls += 1;
        return { kind: 'unknown' };
      },
    );
    assert.equal(replay.status, 'replayed');
    assert.equal(replay.stepState, 'uncertain');
    assert.equal(counter.calls, 0);
  });
});

test('P3B: step already dispatched => uncertain without transport', async () => {
  await withDisposable(async (database) => {
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
        'anthropic/claude-3.5-sonnet', 'Anthropic', 'p3b-int.v1',
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
      ],
    );
    const { missionId } = await seedWriterMission(database, stack, {
      stepState: 'dispatched',
      attemptId,
      revision: 2,
    });
    const counter = { calls: 0 };
    const outcome = await advanceWriterMissionProviderStep(
      database,
      {
        missionId,
        ordinal: 1,
        attemptId,
        expectedRevision: 2,
        providerPolicy,
        expectedWireSha256: REQUEST_HASH,
      },
      async () => {
        counter.calls += 1;
        return { kind: 'delivered', serializedResponse: RESPONSE_BODY };
      },
    );
    assert.equal(outcome.status, 'uncertain');
    assert.equal(outcome.transportInvoked, false);
    assert.equal(counter.calls, 0);
  });
});

test('P3B: scripted delivered without usage still settles zero', async () => {
  await withDisposable(async (database) => {
    const stack = await seedFundingStack(database.db.$client);
    const attemptId = randomUUID();
    const { missionId } = await seedWriterMission(database, stack);
    const delivered = await advanceWriterMissionProviderStep(
      database,
      {
        missionId,
        ordinal: 1,
        attemptId,
        expectedRevision: 1,
      },
      async () => ({ kind: 'delivered', serializedResponse: RESPONSE_BODY }),
    );
    assert.equal(delivered.status, 'delivered');
    const attempt = await database.db.$client.query(
      `SELECT charged_microusd FROM storyteller_attempt WHERE id = $1`,
      [attemptId],
    );
    assert.equal(String(attempt.rows[0].charged_microusd), '0');
  });
});
