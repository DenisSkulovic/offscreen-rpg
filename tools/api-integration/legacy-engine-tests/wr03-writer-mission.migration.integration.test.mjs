import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../../../packages/lab-support/dist/index.js';
import {
  insertWriterMissionParentStep,
  replayWriterMissionParentStepHashes,
} from '../../../packages/story-engine/dist/storyteller/index.js';

const ROOT_HASH = 'a'.repeat(64);
const REQUEST_HASH = 'b'.repeat(64);
const RESULT_HASH = 'c'.repeat(64);
const CAPTURE_HASH = 'd'.repeat(64);

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

test('WR03 T02: writer mission migration, replay, and ordinal uniqueness', async () => {
  await withDisposable(async (database) => {
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
      `INSERT INTO storyteller_funding (id, limit_microusd, verified_at)
       VALUES ($1, 250000, now())`,
      [accountId],
    );
    const runId = randomUUID();
    await client.query(
      `INSERT INTO storyteller_run (id, account_id, limit_microusd, max_attempts, enabled)
       VALUES ($1, $2, 250000, 6, true)`,
      [runId, accountId],
    );
    await client.query(
      `INSERT INTO storyteller_operation (
         generation_id, account_id, run_id, owner_id, purpose, resources,
         max_model_rounds, max_input_tokens, max_generated_tokens, max_reasoning_tokens, max_microusd
       ) VALUES (
         $1, $2, $3, $4, 'writer-mission', '{}'::jsonb,
         6, 12288, 4096, 0, 250000
       )`,
      [generationId, accountId, runId, String(ownerId)],
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
        resultCasHash: RESULT_HASH,
        revision: 1,
        state: 'result-settled',
      },
    );

    const replayed = await replayWriterMissionParentStepHashes(
      database,
      missionId,
      1,
    );
    assert.equal(replayed.requestCasHash, REQUEST_HASH);
    assert.equal(replayed.resultCasHash, RESULT_HASH);

    await assert.rejects(
      client.query(
        `INSERT INTO storyteller_writer_step (
           mission_id, context_id, ordinal, request_cas_hash, revision, state
         ) VALUES ($1, $2, 1, $3, 1, 'captured')`,
        [missionId, missionId, 'e'.repeat(64)],
      ),
    );
  });
});
