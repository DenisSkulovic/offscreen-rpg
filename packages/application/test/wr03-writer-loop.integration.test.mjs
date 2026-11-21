import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import {
  storytellerAttempt,
  storytellerWriterStep,
} from '@offscreen/db/storyteller-schema';
import {
  applyLibraryBatch,
  canonicalDocumentSchema,
  createEmptyLibraryIndex,
  hashCanonicalJson,
  LocalDocumentStore,
} from '@offscreen/documents';
import { writerMissionCaptureSchema } from '@offscreen/storyteller/tasks';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../dist/developer-tools/index.js';
import { insertWriterMissionParentStep } from '../dist/storyteller/writer-mission-store.js';
import {
  buildWriterMissionRoundWire,
  prepareWriterMissionModelStep,
  runWriterMissionModelRound,
} from '../dist/storyteller/writer-loop.js';

const CAPTURE_HASH = 'd'.repeat(64);

const budgetSnapshot = {
  maxModelRounds: 6,
  maxInputTokens: 12_288,
  maxGeneratedTokens: 4_096,
  maxMicrousd: '250000',
  deadlineMs: 120_000,
};

function buildLibraryFixture() {
  const rootHash = 'c'.repeat(64);
  let library = createEmptyLibraryIndex();
  const objects = new Map();
  const operations = [];
  let scene001Path;
  let firstCanonObjectHash;
  for (let index = 1; index <= 5; index += 1) {
    const documentId = randomUUID();
    const path = `lore/scene-${String(index).padStart(3, '0')}.md`;
    if (index === 1) scene001Path = path;
    const document = canonicalDocumentSchema.parse({
      format: 'offscreen.document.v1',
      envelope: {
        documentId,
        schemaVersion: 1,
        revision: 1,
        kind: 'lore',
        authority: 'canon',
        visibility: 'player-known',
        sources: [],
      },
      title: `Scene ${index}`,
      body: `Ledger for ${path}`,
    });
    const objectHash = hashCanonicalJson(document);
    if (index === 1) {
      firstCanonObjectHash = objectHash;
    }
    objects.set(objectHash, {
      envelope: document.envelope,
      body: document.body,
    });
    operations.push({
      op: 'create',
      entry: {
        documentId,
        revision: 1,
        path,
        objectHash,
        kind: 'lore',
        authority: 'canon',
        visibility: 'player-known',
      },
    });
  }
  library = applyLibraryBatch(library, operations);
  const nodes = new Map(library.store);
  const roots = new Map([[rootHash, library.root]]);
  const reader = {
    async readManifest() {
      throw new Error('readManifest must not be called for v2 writer tools');
    },
    async readLibraryRoot(hash) {
      const root = roots.get(hash);
      if (!root) throw new Error('foreign root');
      return root;
    },
    async readLibraryNode(hash) {
      const node = nodes.get(hash);
      if (!node) throw new Error(`missing node ${hash}`);
      return node;
    },
    async readDocument(hash) {
      const value = objects.get(hash);
      if (!value) throw new Error(`missing object ${hash}`);
      return value;
    },
    async readSourcePassage() {
      throw new Error('not used');
    },
  };
  return { rootHash, scene001Path, reader, firstCanonObjectHash };
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
    await run(database);
  } finally {
    await database.close().catch(() => undefined);
    await destroyDisposableSandboxDatabase({
      runId,
      confirmDisposableProvision: true,
    });
  }
}

async function seedFunding(database, generationId, ownerId) {
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
}

async function latestModelStep(database, missionId) {
  const [row] = await database.db
    .select()
    .from(storytellerWriterStep)
    .where(
      and(
        eq(storytellerWriterStep.missionId, missionId),
        isNull(storytellerWriterStep.toolCallId),
      ),
    )
    .orderBy(desc(storytellerWriterStep.ordinal))
    .limit(1);
  return row;
}

async function attemptCount(database) {
  const rows = await database.db
    .select({ id: storytellerAttempt.id })
    .from(storytellerAttempt);
  return rows.length;
}

test('WR03 T06: multi-round writer loop, wire replay, and failure fences', async () => {
  await withDisposable(async (database) => {
    const { rootHash, reader, firstCanonObjectHash } = buildLibraryFixture();
    const storyId = randomUUID();
    const missionId = randomUUID();
    const generationId = randomUUID();
    const ownerId = randomUUID();
    const capture = writerMissionCaptureSchema.parse({
      version: 'writer-mission.v1',
      generationId,
      operationId: generationId,
      ownerId,
      storyId,
      sceneFrontier: {
        passageId: randomUUID(),
        narrativeRevision: 1,
        sequence: 3,
      },
      libraryRootHash: rootHash,
      libraryRootRevision: 1,
      profileObjectHash: '1'.repeat(64),
      skillObjectHashes: [],
      toolsAllowlist: [
        'library.browse',
        'library.read',
        'workdesk.stage',
      ],
      modelSelection: { provider: 'openrouter', model: 'fixture/writer' },
      budgets: budgetSnapshot,
      capturedRequestHash: CAPTURE_HASH,
    });

    await seedFunding(database, generationId, ownerId);
    await insertWriterMissionParentStep(
      database,
      {
        missionId,
        generationId,
        operationId: generationId,
        ownerId,
        storyId,
        captureSha256: CAPTURE_HASH,
        libraryRootHash: rootHash,
        libraryRootRevision: 1,
        budgetSnapshot,
      },
      {
        ordinal: 1,
        requestCasHash: '0'.repeat(64),
        revision: 1,
        state: 'captured',
      },
    );

    const storageDir = await mkdtemp(join(tmpdir(), 'wr03-loop-'));
    const storage = new LocalDocumentStore(storageDir);
    const access = {
      privateDocuments: false,
    };

    const round1Body = JSON.stringify({
      kind: 'tool-calls',
      calls: [
        {
          id: 't1',
          name: 'library.browse',
          args: { prefix: 'lore/', pageSize: 4 },
        },
      ],
    });

    const attempt1 = randomUUID();
    const prep1 = await prepareWriterMissionModelStep(database, storage, {
      missionId,
      ordinal: 1,
      expectedRevision: 1,
      capture,
    });
    const wireRound1 = prep1.wireSha256;

    const counter = { transports: 0 };
    const round1 = await runWriterMissionModelRound(database, {
      missionId,
      ordinal: 1,
      attemptId: attempt1,
      expectedRevision: prep1.revision,
      capture,
      access,
      reader,
      storage,
      scriptedDecisionBody: round1Body,
    });
    assert.equal(round1.status, 'tool-round-complete');
    assert.equal(round1.wireSha256, wireRound1);
    counter.transports += 1;

    const stepAfter1 = await latestModelStep(database, missionId);
    assert.equal(stepAfter1.ordinal, 3);
    assert.equal(stepAfter1.state, 'model-request-prepared');

    const [settledRound1] = await database.db
      .select()
      .from(storytellerWriterStep)
      .where(
        and(
          eq(storytellerWriterStep.missionId, missionId),
          eq(storytellerWriterStep.ordinal, 1),
          isNull(storytellerWriterStep.toolCallId),
        ),
      );
    assert.equal(settledRound1.state, 'tools-applied');

    const round1Replay = await runWriterMissionModelRound(database, {
      missionId,
      ordinal: 1,
      attemptId: attempt1,
      expectedRevision: settledRound1.revision,
      capture,
      access,
      reader,
      storage,
      scriptedDecisionBody: round1Body,
    });
    assert.equal(round1Replay.status, 'replayed');
    assert.equal(round1Replay.wireSha256, wireRound1);
    assert.equal(counter.transports, 1);

    const round2Body = JSON.stringify({
      kind: 'tool-calls',
      calls: [
        {
          id: 't3',
          name: 'workdesk.stage',
          args: {
            expectedStageRevision: 0,
            path: 'private/draft-scene.md',
            body: 'Draft from the loop.',
            op: 'create',
          },
        },
      ],
    });

    const attempt2 = randomUUID();
    const modelStep2 = await latestModelStep(database, missionId);
    const prep2 = await prepareWriterMissionModelStep(database, storage, {
      missionId,
      ordinal: modelStep2.ordinal,
      expectedRevision: modelStep2.revision,
      capture,
    });
    const round2 = await runWriterMissionModelRound(database, {
      missionId,
      ordinal: modelStep2.ordinal,
      attemptId: attempt2,
      expectedRevision: prep2.revision,
      capture,
      access,
      reader,
      storage,
      scriptedDecisionBody: round2Body,
    });
    assert.equal(round2.status, 'tool-round-complete');
    counter.transports += 1;

    const [stageStep] = await database.db
      .select({ resultCasHash: storytellerWriterStep.resultCasHash })
      .from(storytellerWriterStep)
      .where(
        and(
          eq(storytellerWriterStep.missionId, missionId),
          eq(storytellerWriterStep.toolCallId, 't3'),
        ),
      );
    assert.ok(stageStep?.resultCasHash);
    const stageRecord = await storage.readStructuredDocument(
      stageStep.resultCasHash,
    );
    const stagedObjectHash = stageRecord.data.result.objectHash;
    assert.equal(typeof stagedObjectHash, 'string');

    const modelStep3 = await latestModelStep(database, missionId);
    const finalBody = JSON.stringify({
      kind: 'final',
      proposal: {
        version: 1,
        summary: 'The writer closes the scene with staged draft evidence.',
        stagedObjectHashes: [stagedObjectHash],
        sourceEvidence: [
          {
            rootHash,
            objectHash: firstCanonObjectHash,
            section: 'opening ledger',
            assertedAsFact: false,
          },
        ],
      },
    });
    const attempt3 = randomUUID();
    const prep3 = await prepareWriterMissionModelStep(database, storage, {
      missionId,
      ordinal: modelStep3.ordinal,
      expectedRevision: modelStep3.revision,
      capture,
    });
    const round3 = await runWriterMissionModelRound(database, {
      missionId,
      ordinal: modelStep3.ordinal,
      attemptId: attempt3,
      expectedRevision: prep3.revision,
      capture,
      access,
      reader,
      storage,
      scriptedDecisionBody: finalBody,
    });
    assert.equal(round3.status, 'proposal-ready');
    assert.deepEqual(round3.accepted.stagedObjectHashes, [stagedObjectHash]);
    assert.equal(round3.accepted.sourceEvidence.length, 1);
    assert.equal(round3.accepted.sourceEvidence[0]?.objectHash, firstCanonObjectHash);
    assert.equal(round3.accepted.sourceEvidence[0]?.section, 'opening ledger');
    counter.transports += 1;

    const { wire } = buildWriterMissionRoundWire(capture, []);
    assert.equal(wire.sha256, wireRound1);

    const badMission = randomUUID();
    const badGen = randomUUID();
    const badOwner = randomUUID();
    await seedFunding(database, badGen, badOwner);
    await insertWriterMissionParentStep(
      database,
      {
        missionId: badMission,
        generationId: badGen,
        operationId: badGen,
        ownerId: badOwner,
        storyId: randomUUID(),
        captureSha256: CAPTURE_HASH,
        libraryRootHash: rootHash,
        libraryRootRevision: 1,
        budgetSnapshot,
      },
      {
        ordinal: 1,
        requestCasHash: '0'.repeat(64),
        revision: 1,
        state: 'captured',
      },
    );

    const narrowCapture = writerMissionCaptureSchema.parse({
      ...capture,
      generationId: badGen,
      operationId: badGen,
      ownerId: badOwner,
      storyId: randomUUID(),
      toolsAllowlist: ['library.browse'],
    });
    const malformedAttempt = randomUUID();
    const malformedPrep = await prepareWriterMissionModelStep(
      database,
      storage,
      {
        missionId: badMission,
        ordinal: 1,
        expectedRevision: 1,
        capture: narrowCapture,
      },
    );
    const beforeMalformed = await attemptCount(database);
    const malformed = await runWriterMissionModelRound(database, {
      missionId: badMission,
      ordinal: 1,
      attemptId: malformedAttempt,
      expectedRevision: malformedPrep.revision,
      capture: narrowCapture,
      access,
      reader,
      storage,
      scriptedDecisionBody: '{not-json',
    });
    assert.equal(malformed.status, 'held');
    assert.equal(malformed.reason, 'malformed_decision');
    const afterMalformed = await attemptCount(database);
    assert.equal(afterMalformed, beforeMalformed + 1);
    const [heldStep] = await database.db
      .select()
      .from(storytellerWriterStep)
      .where(
        and(
          eq(storytellerWriterStep.missionId, badMission),
          eq(storytellerWriterStep.ordinal, 1),
          isNull(storytellerWriterStep.toolCallId),
        ),
      );
    const malformedReplay = await runWriterMissionModelRound(database, {
      missionId: badMission,
      ordinal: 1,
      attemptId: randomUUID(),
      expectedRevision: heldStep.revision,
      capture: narrowCapture,
      access,
      reader,
      storage,
      scriptedDecisionBody: '{not-json',
    });
    assert.equal(malformedReplay.status, 'held');

    const ungrantedMission = randomUUID();
    const ungrantedGen = randomUUID();
    const ungrantedOwner = randomUUID();
    await seedFunding(database, ungrantedGen, ungrantedOwner);
    await insertWriterMissionParentStep(
      database,
      {
        missionId: ungrantedMission,
        generationId: ungrantedGen,
        operationId: ungrantedGen,
        ownerId: ungrantedOwner,
        storyId: randomUUID(),
        captureSha256: CAPTURE_HASH,
        libraryRootHash: rootHash,
        libraryRootRevision: 1,
        budgetSnapshot,
      },
      {
        ordinal: 1,
        requestCasHash: '0'.repeat(64),
        revision: 1,
        state: 'captured',
      },
    );
    const ungrantedCapture = writerMissionCaptureSchema.parse({
      ...capture,
      generationId: ungrantedGen,
      operationId: ungrantedGen,
      ownerId: ungrantedOwner,
      storyId: randomUUID(),
      toolsAllowlist: ['library.browse'],
    });
    const ungrantedBody = JSON.stringify({
      kind: 'tool-calls',
      calls: [
        {
          id: 't1',
          name: 'workdesk.stage',
          args: {
            expectedStageRevision: 0,
            path: 'private/x.md',
            body: 'nope',
            op: 'create',
          },
        },
      ],
    });
    const ungrantedAttempt = randomUUID();
    const ungrantedPrep = await prepareWriterMissionModelStep(
      database,
      storage,
      {
        missionId: ungrantedMission,
        ordinal: 1,
        expectedRevision: 1,
        capture: ungrantedCapture,
      },
    );
    const beforeUngranted = await attemptCount(database);
    const ungranted = await runWriterMissionModelRound(database, {
      missionId: ungrantedMission,
      ordinal: 1,
      attemptId: ungrantedAttempt,
      expectedRevision: ungrantedPrep.revision,
      capture: ungrantedCapture,
      access,
      reader,
      storage,
      scriptedDecisionBody: ungrantedBody,
    });
    assert.equal(ungranted.status, 'held');
    assert.equal(ungranted.reason, 'ungranted_tool');
    assert.equal(await attemptCount(database), beforeUngranted + 1);

    assert.equal(counter.transports, 3);
  });
});