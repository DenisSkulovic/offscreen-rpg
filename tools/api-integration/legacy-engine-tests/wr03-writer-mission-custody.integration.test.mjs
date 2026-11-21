import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../../../packages/lab-support/dist/index.js';
import {
  advanceWriterMissionProviderStep,
  hashWriterMissionSerializedResponse,
  insertWriterMissionParentStep,
} from '../../../packages/story-engine/dist/storyteller/index.js';

const ROOT_HASH = 'a'.repeat(64);
const REQUEST_HASH = 'b'.repeat(64);
const CAPTURE_HASH = 'd'.repeat(64);
const RESPONSE_BODY = JSON.stringify({ kind: 'final', proposal: { sceneHash: 'e'.repeat(64) } });
const RESULT_HASH = hashWriterMissionSerializedResponse(RESPONSE_BODY);

const budgetSnapshot = {
  maxModelRounds: 6,
  maxInputTokens: 12_288,
  maxGeneratedTokens: 4_096,
  maxMicrousd: '250000',
  deadlineMs: 120_000,
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

async function seedWriterMissionFixture(database, overrides = {}) {
  const missionId = randomUUID();
  const generationId = randomUUID();
  const storyId = randomUUID();
  const ownerId = randomUUID();
  const userId = `user_${randomUUID()}`;
  const client = database.db.$client;

  await client.query(
    `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
     VALUES ($1, 'WR03', $2, true, now(), now())`,
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
     VALUES ($1, 250000, false, now())`,
    [accountId],
  );
  const runRowId = randomUUID();
  await client.query(
    `INSERT INTO storyteller_run (id, account_id, limit_microusd, max_attempts, enabled)
     VALUES ($1, $2, 250000, 6, true)`,
    [runRowId, accountId],
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
  if (overrides.operationSql) {
    await client.query(overrides.operationSql, overrides.operationSqlParams);
  }

  const stepState = overrides.stepState ?? 'model-request-prepared';
  const attemptId = overrides.attemptId ?? null;
  const resultCasHash = overrides.resultCasHash ?? null;
  const revision = overrides.stepRevision ?? 1;

  await insertWriterMissionParentStep(
    database,
    {
      missionId,
      generationId,
      operationId: generationId,
      ownerId,
      storyId,
      captureSha256: CAPTURE_HASH,
      libraryRootHash: ROOT_HASH,
      libraryRootRevision: 3,
      budgetSnapshot: overrides.budgetSnapshot ?? budgetSnapshot,
    },
    {
      ordinal: 1,
      requestCasHash: REQUEST_HASH,
      resultCasHash,
      attemptId,
      revision,
      state: stepState,
    },
  );

  if (overrides.attemptRow) {
    await client.query(overrides.attemptRow.sql, overrides.attemptRow.params);
  }

  return {
    missionId,
    generationId,
    attemptId: attemptId ?? randomUUID(),
    revision,
  };
}

function countingTransport(counter) {
  return async () => {
    counter.calls += 1;
    return { kind: 'delivered', serializedResponse: RESPONSE_BODY };
  };
}

test('WR03 T03: scripted delivery and restart custody', async () => {
  await withDisposable(async (database) => {
    const counter = { calls: 0 };
    const attemptId = randomUUID();
    const fixture = await seedWriterMissionFixture(database, {
      stepState: 'model-request-prepared',
    });

    const delivered = await advanceWriterMissionProviderStep(
      database,
      {
        missionId: fixture.missionId,
        ordinal: 1,
        attemptId,
        expectedRevision: 1,
      },
      countingTransport(counter),
    );
    assert.equal(delivered.status, 'delivered');
    assert.equal(delivered.resultCasHash, RESULT_HASH);
    assert.equal(counter.calls, 1);

    const replaySettled = await advanceWriterMissionProviderStep(
      database,
      {
        missionId: fixture.missionId,
        ordinal: 1,
        attemptId,
        expectedRevision: 4,
      },
      countingTransport(counter),
    );
    assert.equal(replaySettled.status, 'replayed');
    assert.equal(replaySettled.resultCasHash, RESULT_HASH);
    assert.equal(counter.calls, 1);

    const attemptReservedMission = randomUUID();
    const attemptReservedAttempt = randomUUID();
    const arGen = randomUUID();
    const arStory = randomUUID();
    const arOwner = randomUUID();
    const arUser = `user_${randomUUID()}`;
    const arClient = database.db.$client;
    await arClient.query(
      `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
       VALUES ($1, 'WR03', $2, true, now(), now())`,
      [arUser, `${arUser}@example.test`],
    );
    await arClient.query(
      `INSERT INTO generation (id, owner_id, kind, status_revision, input, state)
       VALUES ($1, $2, 'writer-mission.v1', 0, '{}'::jsonb, 'pending')`,
      [arGen, arUser],
    );
    const arAccount = randomUUID();
    await arClient.query(
      `INSERT INTO storyteller_funding (id, limit_microusd, stopped, verified_at)
       VALUES ($1, 250000, false, now())`,
      [arAccount],
    );
    const arRun = randomUUID();
    await arClient.query(
      `INSERT INTO storyteller_run (id, account_id, limit_microusd, max_attempts, enabled)
       VALUES ($1, $2, 250000, 6, true)`,
      [arRun, arAccount],
    );
    await arClient.query(
      `INSERT INTO storyteller_operation (
         generation_id, account_id, run_id, owner_id, purpose, resources,
         max_model_rounds, max_input_tokens, max_generated_tokens, max_reasoning_tokens, max_microusd
       ) VALUES (
         $1, $2, $3, $4, 'writer-mission', '{}'::jsonb,
         6, 12288, 4096, 0, 250000
       )`,
      [arGen, arAccount, arRun, String(arOwner)],
    );
    await arClient.query(
      `INSERT INTO storyteller_attempt (
        id, generation_id, account_id, run_id, owner_id, story_id, purpose,
        storyteller_profile_id, storyteller_profile_revision, task_input_version,
        prompt_version, recipe_version, resource_policy_version,
        requested_model, requested_provider, price_version, attribution,
        state, reserved_microusd, reserved_input_tokens, reserved_generated_tokens,
        reserved_reasoning_tokens, estimated_microusd, estimated_input_tokens,
        estimation_method, reconciliation, request_bytes, policy
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'writer-mission.v1',
        'writer-mission.v1', 1, 1,
        'writer-mission.v1', 'writer-mission.v1', 'writer-mission.v1',
        'writer-mission-custody.v1', 'writer-mission-custody.v1', 'writer-mission-custody.v1',
        '{"kind":"writer-mission.v1"}'::jsonb,
        'reserved', 1000, 256, 256,
        0, 1000, 256,
        'writer-mission-custody', 'pending', 128,
        '{"version":"writer-mission-custody.v1","route":"writer-mission.v1","model":"writer-mission-custody.v1","provider":"writer-mission-custody.v1","priceVersion":"writer-mission-custody.v1","inputMicrousdPerMillion":"0","outputMicrousdPerMillion":"0","maxInputTokens":12288,"maxOutputTokens":4096,"timeoutMs":60000}'::jsonb
      )`,
      [
        attemptReservedAttempt,
        arGen,
        arAccount,
        arRun,
        String(arOwner),
        arStory,
      ],
    );
    await arClient.query(
      `UPDATE storyteller_operation
       SET reserved_rounds = 1, reserved_microusd = 1000,
           reserved_input_tokens = 256, reserved_generated_tokens = 256
       WHERE generation_id = $1`,
      [arGen],
    );
    await arClient.query(
      `UPDATE storyteller_funding SET reserved_microusd = 1000 WHERE id = $1`,
      [arAccount],
    );
    await arClient.query(
      `UPDATE storyteller_run
       SET reserved_microusd = 1000, admitted_attempts = 1
       WHERE id = $1`,
      [arRun],
    );
    await insertWriterMissionParentStep(
      database,
      {
        missionId: attemptReservedMission,
        generationId: arGen,
        operationId: arGen,
        ownerId: arOwner,
        storyId: arStory,
        captureSha256: CAPTURE_HASH,
        libraryRootHash: ROOT_HASH,
        libraryRootRevision: 3,
        budgetSnapshot,
      },
      {
        ordinal: 1,
        requestCasHash: REQUEST_HASH,
        attemptId: attemptReservedAttempt,
        revision: 2,
        state: 'attempt-reserved',
      },
    );
    const arCounter = { calls: 0 };
    const arDelivered = await advanceWriterMissionProviderStep(
      database,
      {
        missionId: attemptReservedMission,
        ordinal: 1,
        attemptId: attemptReservedAttempt,
        expectedRevision: 2,
      },
      countingTransport(arCounter),
    );
    assert.equal(arDelivered.status, 'delivered');
    assert.equal(arCounter.calls, 1);

    const uncertainMission = randomUUID();
    const uncertainAttempt = randomUUID();
    const uncertainGen = randomUUID();
    const uncertainOwner = randomUUID();
    const uncertainUser = `user_${randomUUID()}`;
    await database.db.$client.query(
      `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
       VALUES ($1, 'WR03', $2, true, now(), now())`,
      [uncertainUser, `${uncertainUser}@example.test`],
    );
    await database.db.$client.query(
      `INSERT INTO generation (id, owner_id, kind, status_revision, input, state)
       VALUES ($1, $2, 'writer-mission.v1', 0, '{}'::jsonb, 'pending')`,
      [uncertainGen, uncertainUser],
    );
  const uncertainAccount = randomUUID();
    await database.db.$client.query(
      `INSERT INTO storyteller_funding (id, limit_microusd, stopped, verified_at)
       VALUES ($1, 250000, false, now())`,
      [uncertainAccount],
    );
    const uncertainRun = randomUUID();
    await database.db.$client.query(
      `INSERT INTO storyteller_run (id, account_id, limit_microusd, max_attempts, enabled)
       VALUES ($1, $2, 250000, 6, true)`,
      [uncertainRun, uncertainAccount],
    );
    await database.db.$client.query(
      `INSERT INTO storyteller_operation (
         generation_id, account_id, run_id, owner_id, purpose, resources,
         max_model_rounds, max_input_tokens, max_generated_tokens, max_reasoning_tokens, max_microusd
       ) VALUES (
         $1, $2, $3, $4, 'writer-mission', '{}'::jsonb,
         6, 12288, 4096, 0, 250000
       )`,
      [uncertainGen, uncertainAccount, uncertainRun, String(uncertainOwner)],
    );
    const uncertainStoryId = randomUUID();
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
        'writer-mission-custody.v1', 'writer-mission-custody.v1', 'writer-mission-custody.v1',
        '{"kind":"writer-mission.v1"}'::jsonb,
        'uncertain', 1000, 256, 256,
        0, 1000, 256,
        'writer-mission-custody', 'unknown', 128,
        '{"version":"writer-mission-custody.v1","route":"writer-mission.v1","model":"writer-mission-custody.v1","provider":"writer-mission-custody.v1","priceVersion":"writer-mission-custody.v1","inputMicrousdPerMillion":"0","outputMicrousdPerMillion":"0","maxInputTokens":12288,"maxOutputTokens":4096,"timeoutMs":60000}'::jsonb,
        now()
      )`,
      [
        uncertainAttempt,
        uncertainGen,
        uncertainAccount,
        uncertainRun,
        String(uncertainOwner),
        uncertainStoryId,
      ],
    );
    await insertWriterMissionParentStep(
      database,
      {
        missionId: uncertainMission,
        generationId: uncertainGen,
        operationId: uncertainGen,
        ownerId: uncertainOwner,
        storyId: uncertainStoryId,
        captureSha256: CAPTURE_HASH,
        libraryRootHash: ROOT_HASH,
        libraryRootRevision: 3,
        budgetSnapshot,
        state: 'uncertain',
      },
      {
        ordinal: 1,
        requestCasHash: REQUEST_HASH,
        attemptId: uncertainAttempt,
        revision: 3,
        state: 'uncertain',
      },
    );
    const uncertainCounter = { calls: 0 };
    const uncertainReplay = await advanceWriterMissionProviderStep(
      database,
      {
        missionId: uncertainMission,
        ordinal: 1,
        attemptId: uncertainAttempt,
        expectedRevision: 3,
      },
      countingTransport(uncertainCounter),
    );
    assert.equal(uncertainReplay.status, 'replayed');
    assert.equal(uncertainReplay.stepState, 'uncertain');
    assert.equal(uncertainCounter.calls, 0);
  });
});

test('WR03 T03: custody negatives — budget, unknown, attempt mismatch', async () => {
  await withDisposable(async (database) => {
    // Exhausted operation: all rounds reserved, zero send.
    const missionId = randomUUID();
    const generationId = randomUUID();
    const storyId = randomUUID();
    const ownerId = randomUUID();
    const userId = `user_${randomUUID()}`;
    const client = database.db.$client;
    await client.query(
      `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
       VALUES ($1, 'WR03', $2, true, now(), now())`,
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
       VALUES ($1, 250000, false, now())`,
      [accountId],
    );
    const runRowId = randomUUID();
    await client.query(
      `INSERT INTO storyteller_run (id, account_id, limit_microusd, max_attempts, enabled)
       VALUES ($1, $2, 250000, 6, true)`,
      [runRowId, accountId],
    );
    await client.query(
      `INSERT INTO storyteller_operation (
         generation_id, account_id, run_id, owner_id, purpose, resources,
         max_model_rounds, max_input_tokens, max_generated_tokens, max_reasoning_tokens, max_microusd,
         reserved_rounds, reserved_microusd
       ) VALUES (
         $1, $2, $3, $4, 'writer-mission', '{}'::jsonb,
         6, 12288, 4096, 0, 250000,
         6, 250000
       )`,
      [generationId, accountId, runRowId, String(ownerId)],
    );
    await insertWriterMissionParentStep(
      database,
      {
        missionId,
        generationId,
        operationId: generationId,
        ownerId,
        storyId,
        captureSha256: CAPTURE_HASH,
        libraryRootHash: ROOT_HASH,
        libraryRootRevision: 3,
        budgetSnapshot,
      },
      {
        ordinal: 1,
        requestCasHash: REQUEST_HASH,
        revision: 1,
        state: 'model-request-prepared',
      },
    );
    const exhaustedCounter = { calls: 0 };
    const held = await advanceWriterMissionProviderStep(
      database,
      {
        missionId,
        ordinal: 1,
        attemptId: randomUUID(),
        expectedRevision: 1,
        reservedMicrousd: 1_000n,
      },
      countingTransport(exhaustedCounter),
    );
    assert.equal(held.status, 'held');
    assert.equal(exhaustedCounter.calls, 0);

    const unknownMission = randomUUID();
    const unknownGen = randomUUID();
    const unknownOwner = randomUUID();
    const unknownUser = `user_${randomUUID()}`;
    await client.query(
      `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
       VALUES ($1, 'WR03', $2, true, now(), now())`,
      [unknownUser, `${unknownUser}@example.test`],
    );
    await client.query(
      `INSERT INTO generation (id, owner_id, kind, status_revision, input, state)
       VALUES ($1, $2, 'writer-mission.v1', 0, '{}'::jsonb, 'pending')`,
      [unknownGen, unknownUser],
    );
    const unknownAccount = randomUUID();
    await client.query(
      `INSERT INTO storyteller_funding (id, limit_microusd, stopped, verified_at)
       VALUES ($1, 250000, false, now())`,
      [unknownAccount],
    );
    const unknownRun = randomUUID();
    await client.query(
      `INSERT INTO storyteller_run (id, account_id, limit_microusd, max_attempts, enabled)
       VALUES ($1, $2, 250000, 6, true)`,
      [unknownRun, unknownAccount],
    );
    await client.query(
      `INSERT INTO storyteller_operation (
         generation_id, account_id, run_id, owner_id, purpose, resources,
         max_model_rounds, max_input_tokens, max_generated_tokens, max_reasoning_tokens, max_microusd
       ) VALUES (
         $1, $2, $3, $4, 'writer-mission', '{}'::jsonb,
         6, 12288, 4096, 0, 250000
       )`,
      [unknownGen, unknownAccount, unknownRun, String(unknownOwner)],
    );
    const unknownAttempt = randomUUID();
    await insertWriterMissionParentStep(
      database,
      {
        missionId: unknownMission,
        generationId: unknownGen,
        operationId: unknownGen,
        ownerId: unknownOwner,
        storyId: randomUUID(),
        captureSha256: CAPTURE_HASH,
        libraryRootHash: ROOT_HASH,
        libraryRootRevision: 3,
        budgetSnapshot,
      },
      {
        ordinal: 1,
        requestCasHash: REQUEST_HASH,
        revision: 1,
        state: 'model-request-prepared',
      },
    );
    const unknownCounter = { calls: 0 };
    const unknownTransport = async () => {
      unknownCounter.calls += 1;
      return { kind: 'unknown' };
    };
    const firstUnknown = await advanceWriterMissionProviderStep(
      database,
      {
        missionId: unknownMission,
        ordinal: 1,
        attemptId: unknownAttempt,
        expectedRevision: 1,
      },
      unknownTransport,
    );
    assert.equal(firstUnknown.status, 'uncertain');
    assert.equal(unknownCounter.calls, 1);
    const secondUnknown = await advanceWriterMissionProviderStep(
      database,
      {
        missionId: unknownMission,
        ordinal: 1,
        attemptId: unknownAttempt,
        expectedRevision: 4,
      },
      unknownTransport,
    );
    assert.equal(secondUnknown.status, 'replayed');
    assert.equal(unknownCounter.calls, 1);

    const mismatchMission = randomUUID();
    const boundAttempt = randomUUID();
    const wrongAttempt = randomUUID();
    const mmGen = randomUUID();
    const mmOwner = randomUUID();
    const mmUser = `user_${randomUUID()}`;
    await client.query(
      `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
       VALUES ($1, 'WR03', $2, true, now(), now())`,
      [mmUser, `${mmUser}@example.test`],
    );
    await client.query(
      `INSERT INTO generation (id, owner_id, kind, status_revision, input, state)
       VALUES ($1, $2, 'writer-mission.v1', 0, '{}'::jsonb, 'pending')`,
      [mmGen, mmUser],
    );
    const mmAccount = randomUUID();
    await client.query(
      `INSERT INTO storyteller_funding (id, limit_microusd, stopped, verified_at)
       VALUES ($1, 250000, false, now())`,
      [mmAccount],
    );
    const mmRun = randomUUID();
    await client.query(
      `INSERT INTO storyteller_run (id, account_id, limit_microusd, max_attempts, enabled)
       VALUES ($1, $2, 250000, 6, true)`,
      [mmRun, mmAccount],
    );
    await client.query(
      `INSERT INTO storyteller_operation (
         generation_id, account_id, run_id, owner_id, purpose, resources,
         max_model_rounds, max_input_tokens, max_generated_tokens, max_reasoning_tokens, max_microusd
       ) VALUES (
         $1, $2, $3, $4, 'writer-mission', '{}'::jsonb,
         6, 12288, 4096, 0, 250000
       )`,
      [mmGen, mmAccount, mmRun, String(mmOwner)],
    );
    await client.query(
      `INSERT INTO storyteller_attempt (
        id, generation_id, account_id, run_id, owner_id, story_id, purpose,
        storyteller_profile_id, storyteller_profile_revision, task_input_version,
        prompt_version, recipe_version, resource_policy_version,
        requested_model, requested_provider, price_version, attribution,
        state, reserved_microusd, reserved_input_tokens, reserved_generated_tokens,
        reserved_reasoning_tokens, estimated_microusd, estimated_input_tokens,
        estimation_method, reconciliation, request_bytes, policy
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'writer-mission.v1',
        'writer-mission.v1', 1, 1,
        'writer-mission.v1', 'writer-mission.v1', 'writer-mission.v1',
        'writer-mission-custody.v1', 'writer-mission-custody.v1', 'writer-mission-custody.v1',
        '{"kind":"writer-mission.v1"}'::jsonb,
        'reserved', 1000, 256, 256,
        0, 1000, 256,
        'writer-mission-custody', 'pending', 128,
        '{"version":"writer-mission-custody.v1","route":"writer-mission.v1","model":"writer-mission-custody.v1","provider":"writer-mission-custody.v1","priceVersion":"writer-mission-custody.v1","inputMicrousdPerMillion":"0","outputMicrousdPerMillion":"0","maxInputTokens":12288,"maxOutputTokens":4096,"timeoutMs":60000}'::jsonb
      )`,
      [
        boundAttempt,
        mmGen,
        mmAccount,
        mmRun,
        String(mmOwner),
        randomUUID(),
      ],
    );
    await insertWriterMissionParentStep(
      database,
      {
        missionId: mismatchMission,
        generationId: mmGen,
        operationId: mmGen,
        ownerId: mmOwner,
        storyId: randomUUID(),
        captureSha256: CAPTURE_HASH,
        libraryRootHash: ROOT_HASH,
        libraryRootRevision: 3,
        budgetSnapshot,
      },
      {
        ordinal: 1,
        requestCasHash: REQUEST_HASH,
        attemptId: boundAttempt,
        revision: 1,
        state: 'attempt-reserved',
      },
    );
    const mismatchCounter = { calls: 0 };
    const mismatch = await advanceWriterMissionProviderStep(
      database,
      {
        missionId: mismatchMission,
        ordinal: 1,
        attemptId: wrongAttempt,
        expectedRevision: 1,
      },
      countingTransport(mismatchCounter),
    );
    assert.equal(mismatch.status, 'held');
    assert.equal(mismatch.reason, 'attempt_mismatch');
    assert.equal(mismatchCounter.calls, 0);

  });
});