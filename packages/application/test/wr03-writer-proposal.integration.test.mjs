import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { storytellerWriterStep } from '@offscreen/db/storyteller-schema';
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
  runWriterMissionModelRound,
  prepareWriterMissionModelStep,
} from '../dist/storyteller/writer-loop.js';
import { submitWriterSceneProposal } from '../dist/storyteller/execution.js';
import { WriterSceneProposalError } from '../dist/storyteller/writer-scene-proposal.js';

const CAPTURE_HASH = 'd'.repeat(64);
const budgetSnapshot = {
  maxModelRounds: 6,
  maxInputTokens: 12_288,
  maxGeneratedTokens: 4_096,
  maxMicrousd: '250000',
  deadlineMs: 120_000,
};

function buildLibraryFixture({ privatePossibility = false } = {}) {
  const rootHash = 'c'.repeat(64);
  let library = createEmptyLibraryIndex();
  const objects = new Map();
  const operations = [];
  let firstCanonObjectHash;
  let privateObjectHash;
  for (let index = 1; index <= 3; index += 1) {
    const documentId = randomUUID();
    const path =
      index === 3 && privatePossibility
        ? 'private/rumor.md'
        : `lore/scene-${String(index).padStart(3, '0')}.md`;
    const document = canonicalDocumentSchema.parse({
      format: 'offscreen.document.v1',
      envelope: {
        documentId,
        schemaVersion: 1,
        revision: 1,
        kind: index === 3 && privatePossibility ? 'private-possibility' : 'lore',
        authority: 'noncanonical',
        visibility:
          index === 3 && privatePossibility
            ? 'storyteller-private'
            : 'player-known',
        sources: [],
      },
      title: index === 3 && privatePossibility ? 'Rumor' : `Scene ${index}`,
      body: index === 3 && privatePossibility ? 'Maybe Mira returned.' : `Ledger ${index}`,
    });
    const objectHash = hashCanonicalJson(document);
    if (index === 1) firstCanonObjectHash = objectHash;
    if (index === 3 && privatePossibility) privateObjectHash = objectHash;
    objects.set(objectHash, { envelope: document.envelope, body: document.body });
    operations.push({
      op: 'create',
      entry: {
        documentId,
        revision: 1,
        path,
        objectHash,
        kind: document.envelope.kind,
        authority: document.envelope.authority,
        visibility: document.envelope.visibility,
      },
    });
  }
  library = applyLibraryBatch(library, operations);
  const nodes = new Map(library.store);
  const roots = new Map([[rootHash, library.root]]);
  const reader = {
    async readManifest() {
      throw new Error('v2 only');
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
  return { rootHash, reader, firstCanonObjectHash, privateObjectHash };
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
    readDatabaseConfig({ DATABASE_URL: provisioned.connectionString }),
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

async function stageDraftAndPropose(database, { privatePossibility }) {
  const { rootHash, reader, firstCanonObjectHash, privateObjectHash } =
    buildLibraryFixture({ privatePossibility });
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
      sequence: 1,
    },
    libraryRootHash: rootHash,
    libraryRootRevision: 1,
    profileObjectHash: '1'.repeat(64),
    skillObjectHashes: [],
    toolsAllowlist: ['workdesk.stage'],
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
  const storageDir = await mkdtemp(join(tmpdir(), 'wr03-proposal-'));
  const storage = new LocalDocumentStore(storageDir);
  const access = { privateDocuments: privatePossibility };

  const stageBody = JSON.stringify({
    kind: 'tool-calls',
    calls: [
      {
        id: 't1',
        name: 'workdesk.stage',
        args: {
          expectedStageRevision: 0,
          path: 'private/draft-scene.md',
          body: 'Staged prose.',
          op: 'create',
        },
      },
    ],
  });
  const prep = await prepareWriterMissionModelStep(database, storage, {
    missionId,
    ordinal: 1,
    expectedRevision: 1,
    capture,
  });
  await runWriterMissionModelRound(database, {
    missionId,
    ordinal: 1,
    attemptId: randomUUID(),
    expectedRevision: prep.revision,
    capture,
    access,
    reader,
    storage,
    scriptedDecisionBody: stageBody,
  });
  const [stageStep] = await database.db
    .select({ resultCasHash: storytellerWriterStep.resultCasHash })
    .from(storytellerWriterStep)
    .where(
      and(
        eq(storytellerWriterStep.missionId, missionId),
        eq(storytellerWriterStep.toolCallId, 't1'),
      ),
    );
  const stageRecord = await storage.readStructuredDocument(
    stageStep.resultCasHash,
  );
  const stagedObjectHash = stageRecord.data.result.objectHash;
  return {
    storage,
    missionId,
    capture,
    access,
    reader,
    rootHash,
    firstCanonObjectHash,
    privateObjectHash,
    stagedObjectHash,
  };
}

test('WR03 T07: v2 opening proposal returns scene content, not summary', async () => {
  await withDisposable(async (database) => {
    const ctx = await stageDraftAndPropose(database, {
      privatePossibility: false,
    });
    const paragraph = 'A bashful moon watches.';
    const accepted = await submitWriterSceneProposal(database, ctx.storage, {
      missionId: ctx.missionId,
      capture: ctx.capture,
      access: ctx.access,
      reader: ctx.reader,
      proposal: {
        version: 2,
        summary: 'Summary text must not replace passage body.',
        stagedObjectHashes: [ctx.stagedObjectHash],
        sourceEvidence: [
          {
            rootHash: ctx.rootHash,
            objectHash: ctx.firstCanonObjectHash,
            section: 'ledger',
            assertedAsFact: false,
          },
        ],
        scene: {
          content: {
            version: 1,
            title: 'Opening',
            paragraphs: [paragraph],
          },
          interaction: null,
        },
      },
    });
    assert.equal(accepted.format, 'offscreen.writer-scene-proposal.v2');
    assert.equal(accepted.scene.content.paragraphs[0], paragraph);
    assert.notEqual(accepted.scene.content.paragraphs[0], accepted.summary);
  });
});

test('WR03 T07: submitWriterSceneProposal returns staged hashes and provenance', async () => {
  await withDisposable(async (database) => {
    const ctx = await stageDraftAndPropose(database, {
      privatePossibility: false,
    });
    const accepted = await submitWriterSceneProposal(database, ctx.storage, {
      missionId: ctx.missionId,
      capture: ctx.capture,
      access: ctx.access,
      reader: ctx.reader,
      proposal: {
        version: 1,
        summary: 'Final scene draft with citations.',
        stagedObjectHashes: [ctx.stagedObjectHash],
        sourceEvidence: [
          {
            rootHash: ctx.rootHash,
            objectHash: ctx.firstCanonObjectHash,
            section: 'ledger',
            assertedAsFact: false,
          },
        ],
      },
    });
    assert.equal(accepted.format, 'offscreen.writer-scene-proposal.v1');
    assert.deepEqual(accepted.stagedObjectHashes, [ctx.stagedObjectHash]);
    assert.equal(accepted.sourceEvidence[0]?.objectHash, ctx.firstCanonObjectHash);
  });
});

test('WR03 T07: forged library citation is rejected', async () => {
  await withDisposable(async (database) => {
    const ctx = await stageDraftAndPropose(database, {
      privatePossibility: false,
    });
    await assert.rejects(
      () =>
        submitWriterSceneProposal(database, ctx.storage, {
          missionId: ctx.missionId,
          capture: ctx.capture,
          access: ctx.access,
          reader: ctx.reader,
          proposal: {
            version: 1,
            summary: 'Bad citation.',
            stagedObjectHashes: [ctx.stagedObjectHash],
            sourceEvidence: [
              {
                rootHash: ctx.rootHash,
                objectHash: 'f'.repeat(64),
                section: 'forged',
                assertedAsFact: false,
              },
            ],
          },
        }),
      (error) => {
        assert.ok(error instanceof WriterSceneProposalError);
        assert.equal(error.code, 'forged-citation');
        return true;
      },
    );
  });
});

test('WR03 T07: private possibility asserted as fact is rejected', async () => {
  await withDisposable(async (database) => {
    const ctx = await stageDraftAndPropose(database, {
      privatePossibility: true,
    });
    assert.ok(ctx.privateObjectHash);
    await assert.rejects(
      () =>
        submitWriterSceneProposal(database, ctx.storage, {
          missionId: ctx.missionId,
          capture: ctx.capture,
          access: ctx.access,
          reader: ctx.reader,
          proposal: {
            version: 1,
            summary: 'Treats rumor as canon.',
            stagedObjectHashes: [ctx.stagedObjectHash],
            sourceEvidence: [
              {
                rootHash: ctx.rootHash,
                objectHash: ctx.privateObjectHash,
                section: 'rumor',
                assertedAsFact: true,
              },
            ],
          },
        }),
      (error) => {
        assert.ok(error instanceof WriterSceneProposalError);
        assert.equal(error.code, 'private-possibility-as-fact');
        return true;
      },
    );
  });
});

test('WR03 T07: unknown staged hash is rejected on final round', async () => {
  await withDisposable(async (database) => {
    const ctx = await stageDraftAndPropose(database, {
      privatePossibility: false,
    });
    const modelStep = await latestModelStep(database, ctx.missionId);
    assert.ok(modelStep);
    const prep = await prepareWriterMissionModelStep(database, ctx.storage, {
      missionId: ctx.missionId,
      ordinal: modelStep.ordinal,
      expectedRevision: modelStep.revision,
      capture: ctx.capture,
    });
    const finalBody = JSON.stringify({
      kind: 'final',
      proposal: {
        version: 1,
        summary: 'Wrong stage hash.',
        stagedObjectHashes: ['b'.repeat(64)],
        sourceEvidence: [],
      },
    });
    const outcome = await runWriterMissionModelRound(database, {
      missionId: ctx.missionId,
      ordinal: modelStep.ordinal,
      attemptId: randomUUID(),
      expectedRevision: prep.revision,
      capture: ctx.capture,
      access: ctx.access,
      reader: ctx.reader,
      storage: ctx.storage,
      scriptedDecisionBody: finalBody,
    });
    assert.equal(outcome.status, 'held');
    assert.equal(outcome.reason, 'unknown-staged-hash');
  });
});