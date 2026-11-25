import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { storytellerWriterMission } from '@offscreen/story-persistence/storyteller';
import { LocalDocumentStore } from '@offscreen/documents';
import { writerMissionCaptureSchema } from '@offscreen/storyteller/tasks';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../../../packages/lab-support/dist/index.js';
import { insertWriterMissionParentStep } from '../../../packages/story-engine/dist/storyteller/writer-mission-store.js';
import { executeWriterWorkdeskTool } from '../../../packages/story-engine/dist/storyteller/writer-workdesk.js';

const LIBRARY_ROOT_HASH = 'a'.repeat(64);
const CAPTURE_HASH = 'b'.repeat(64);
const REQUEST_HASH = 'c'.repeat(64);

const budgetSnapshot = {
  maxModelRounds: 6,
  maxInputTokens: 12_288,
  maxGeneratedTokens: 4_096,
  maxMicrousd: '250000',
  deadlineMs: 120_000,
};

function buildCapture(storyId) {
  return writerMissionCaptureSchema.parse({
    version: 'writer-mission.v1',
    generationId: randomUUID(),
    operationId: randomUUID(),
    ownerId: randomUUID(),
    storyId,
    sceneFrontier: {
      passageId: randomUUID(),
      narrativeRevision: 1,
      sequence: 0,
    },
    libraryRootHash: LIBRARY_ROOT_HASH,
    libraryRootRevision: 1,
    profileObjectHash: '1'.repeat(64),
    skillObjectHashes: [],
    toolsAllowlist: [
      'workdesk.stage',
      'workdesk.read',
      'workdesk.diff',
      'workdesk.discard',
    ],
    modelSelection: { provider: 'openrouter', model: 'fixture' },
    budgets: budgetSnapshot,
    capturedRequestHash: CAPTURE_HASH,
  });
}

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
    await run(database, provisioned.connectionString);
  } finally {
    await database.close().catch(() => undefined);
    await destroyDisposableSandboxDatabase({
      runId,
      confirmDisposableProvision: true,
    });
  }
}

async function seedMission(database, storyId) {
  const missionId = randomUUID();
  const generationId = randomUUID();
  const ownerId = randomUUID();
  const userId = randomUUID();
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

  await insertWriterMissionParentStep(
    database,
    {
      missionId,
      generationId,
      operationId: generationId,
      ownerId,
      storyId,
      captureSha256: CAPTURE_HASH,
      libraryRootHash: LIBRARY_ROOT_HASH,
      libraryRootRevision: 1,
      budgetSnapshot,
    },
    {
      ordinal: 1,
      requestCasHash: REQUEST_HASH,
      revision: 1,
      state: 'captured',
    },
  );

  return { missionId, storyId, capture: buildCapture(storyId) };
}

test('WR03 T05: workdesk stage read revise discard with restart', async () => {
  await withDisposable(async (database, connectionString) => {
    const storeRoot = await mkdtemp(join(tmpdir(), 'offscreen-wr03-workdesk-'));
    const storage = new LocalDocumentStore(storeRoot);
    const storyId = randomUUID();
    const seeded = await seedMission(database, storyId);
    const draftPath = 'private/reunion-direction.md';

    const stage1 = await executeWriterWorkdeskTool(database, storage, {
      missionId: seeded.missionId,
      capture: seeded.capture,
      access: { privateDocuments: true },
      call: {
        id: 't1',
        name: 'workdesk.stage',
        args: {
          expectedStageRevision: 0,
          path: draftPath,
          title: 'Reunion',
          body: 'First draft toward Vivec.',
        },
      },
    });
    assert.equal(stage1.ok, true);
    assert.equal(stage1.replayed, false);
    const stage1Hash = stage1.result.objectHash;
    const stage1Root = stage1.result.stageRootHash;
    assert.equal(stage1.result.stageRootRevision, 1);

    const read1 = await executeWriterWorkdeskTool(database, storage, {
      missionId: seeded.missionId,
      capture: seeded.capture,
      access: { privateDocuments: true },
      call: { id: 't2', name: 'workdesk.read', args: { path: draftPath } },
    });
    assert.equal(read1.ok, true);
    assert.equal(read1.result.content, 'First draft toward Vivec.');

    const stage2 = await executeWriterWorkdeskTool(database, storage, {
      missionId: seeded.missionId,
      capture: seeded.capture,
      access: { privateDocuments: true },
      call: {
        id: 't3',
        name: 'workdesk.stage',
        args: {
          expectedStageRevision: 1,
          path: draftPath,
          body: 'Revised courier vow toward Vivec.',
          op: 'replace',
        },
      },
    });
    assert.equal(stage2.ok, true);
    const stage2Hash = stage2.result.objectHash;
    assert.notEqual(stage2Hash, stage1Hash);
    assert.equal(stage2.result.stageRootRevision, 2);

    const diff = await executeWriterWorkdeskTool(database, storage, {
      missionId: seeded.missionId,
      capture: seeded.capture,
      access: { privateDocuments: true },
      call: {
        id: 't4',
        name: 'workdesk.diff',
        args: {
          leftPath: draftPath,
          rightPath: draftPath,
        },
      },
    });
    assert.equal(diff.ok, true);
    assert.equal(diff.result.leftObjectHash, diff.result.rightObjectHash);

    const discard = await executeWriterWorkdeskTool(database, storage, {
      missionId: seeded.missionId,
      capture: seeded.capture,
      access: { privateDocuments: true },
      call: {
        id: 't5',
        name: 'workdesk.discard',
        args: { expectedStageRevision: 2 },
      },
    });
    assert.equal(discard.ok, true);
    assert.equal(discard.result.discarded, true);

    const rows = await database.db
      .select({
        stageRootHash: storytellerWriterMission.stageRootHash,
        stageRootRevision: storytellerWriterMission.stageRootRevision,
      })
      .from(storytellerWriterMission)
      .where(eq(storytellerWriterMission.id, seeded.missionId))
      .limit(1);
    assert.equal(rows[0]?.stageRootHash, null);
    assert.equal(rows[0]?.stageRootRevision, null);

    const storyCheck = await database.db.$client.query(
      `SELECT document_root_hash FROM story WHERE id = $1`,
      [seeded.storyId],
    );
    assert.equal(storyCheck.rows[0]?.document_root_hash ?? null, null);

    await database.close();
    const restarted = createDatabase(
      readDatabaseConfig({ DATABASE_URL: connectionString }),
      () => {},
    );
    const replayStorage = new LocalDocumentStore(storeRoot);

    const doc1 = await replayStorage.readDocument(stage1Hash);
    const doc2 = await replayStorage.readDocument(stage2Hash);
    assert.equal(doc1.body, 'First draft toward Vivec.');
    assert.equal(doc2.body, 'Revised courier vow toward Vivec.');

    const replayStage = await executeWriterWorkdeskTool(restarted, replayStorage, {
      missionId: seeded.missionId,
      capture: seeded.capture,
      access: { privateDocuments: true },
      call: {
        id: 't1',
        name: 'workdesk.stage',
        args: {
          expectedStageRevision: 0,
          path: draftPath,
          title: 'Reunion',
          body: 'First draft toward Vivec.',
        },
      },
    });
    assert.equal(replayStage.ok, true);
    assert.equal(replayStage.replayed, true);
    assert.equal(replayStage.result.objectHash, stage1Hash);
    assert.equal(replayStage.result.stageRootHash, stage1Root);

    await restarted.close();
  });
});

test('WR03 T05: concurrent same-revision stage has one winner', async () => {
  await withDisposable(async (database) => {
    const storeRoot = await mkdtemp(join(tmpdir(), 'offscreen-wr03-workdesk-race-'));
    const storage = new LocalDocumentStore(storeRoot);
    const storyId = randomUUID();
    const seeded = await seedMission(database, storyId);
    const draftPath = 'private/race.md';

    const [left, right] = await Promise.all([
      executeWriterWorkdeskTool(database, storage, {
        missionId: seeded.missionId,
        capture: seeded.capture,
        access: { privateDocuments: true },
        call: {
          id: 't10',
          name: 'workdesk.stage',
          args: {
            expectedStageRevision: 0,
            path: draftPath,
            body: 'Left contender',
          },
        },
      }),
      executeWriterWorkdeskTool(database, storage, {
        missionId: seeded.missionId,
        capture: seeded.capture,
        access: { privateDocuments: true },
        call: {
          id: 't11',
          name: 'workdesk.stage',
          args: {
            expectedStageRevision: 0,
            path: draftPath,
            body: 'Right contender',
          },
        },
      }),
    ]);

    const winners = [left, right].filter((outcome) => outcome.ok);
    assert.equal(winners.length, 1);
    const loser = left.ok ? right : left;
    assert.equal(loser.ok, false);
    assert.equal(loser.code, 'stage-revision-conflict');
  });
});

test('WR03 T05: player-scope read of private staged draft returns nothing', async () => {
  await withDisposable(async (database) => {
    const storeRoot = await mkdtemp(join(tmpdir(), 'offscreen-wr03-workdesk-player-'));
    const storage = new LocalDocumentStore(storeRoot);
    const storyId = randomUUID();
    const seeded = await seedMission(database, storyId);

    const staged = await executeWriterWorkdeskTool(database, storage, {
      missionId: seeded.missionId,
      capture: seeded.capture,
      access: { privateDocuments: true },
      call: {
        id: 't20',
        name: 'workdesk.stage',
        args: {
          expectedStageRevision: 0,
          path: 'private/hidden.md',
          body: 'Storyteller-only draft.',
        },
      },
    });
    assert.equal(staged.ok, true);

    await database.db
      .update(storytellerWriterMission)
      .set({
        stageRootHash: staged.result.stageRootHash,
        stageRootRevision: staged.result.stageRootRevision,
      })
      .where(eq(storytellerWriterMission.id, seeded.missionId));

    const playerRead = await executeWriterWorkdeskTool(database, storage, {
      missionId: seeded.missionId,
      capture: seeded.capture,
      access: { privateDocuments: false },
      call: { id: 't21', name: 'workdesk.read', args: { path: 'private/hidden.md' } },
    });
    assert.equal(playerRead.ok, false);
    assert.equal(playerRead.code, 'not-found');
  });
});