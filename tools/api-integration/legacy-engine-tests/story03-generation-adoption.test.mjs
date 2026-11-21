import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { prepareStorytellerTask } from '@offscreen/storyteller/tasks';
import { scriptedStorytellerResult } from '@offscreen/storyteller/fixtures';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import {
  createStorytellerExecution,
  hashStorytellerCustodyResult,
} from '../../../packages/story-engine/dist/storyteller/execution.js';
import { createStorytellerGenerationAdoption } from '../../../packages/story-engine/dist/storyteller/generation-adoption.js';
import { insertStorytellerTask } from '../../../packages/story-engine/dist/storyteller/records.js';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../../../packages/lab-support/dist/index.js';

const root = 'ab'.repeat(32);

function canonicalKnowledge(rootHash) {
  return {
    rootHash,
    rootRevision: 1,
    catalogue: [],
    catalogueTruncated: false,
    documents: [],
    documentSelection: {
      cueResolution: {
        requested: [],
        resolvedDocumentIds: [],
        unavailable: [],
        excludedDocumentIds: [],
        maxCandidates: 0,
      },
      requestedDocumentIds: [],
      loadedHandles: [],
      omitted: [],
      maxReads: 4,
      maxBytes: 12 * 1024,
      usedReads: 0,
      usedBytes: 0,
    },
    libraries: [],
    librarySelection: {
      requestedTopics: [],
      unmatchedTopics: [],
      requestedHandles: [],
      loadedHandles: [],
      omitted: [],
      maxReads: 0,
      maxBytes: 0,
      usedReads: 0,
      usedBytes: 0,
    },
  };
}

function openingTask(rootHash) {
  return prepareStorytellerTask({
    task: 'opening',
    source: { draftId: randomUUID(), draftRevision: 1 },
    profile: storytellerCatalogue.resolve({
      id: 'absurd-action-comedy',
      revision: 1,
    }),
    execution: { mode: 'scripted', version: 'offline-rehearsal.v1' },
    context: {
      premise: {
        title: '',
        premise: 'A traveler wakes beside an unfamiliar companion.',
        storytellingDirection: '',
      },
      current: null,
      selected: null,
      items: [],
      notes: [],
      evidence: [],
      canonicalKnowledge: canonicalKnowledge(rootHash),
    },
  });
}

async function withDisposable(run) {
  const runId = randomUUID();
  const provisioned = await provisionDisposableSandboxDatabase({
    runId,
    confirmDisposableProvision: true,
    applyFullMigrations: true,
  });
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

async function insertUser(database, ownerId) {
  await database.db.$client.query(
    `insert into "user" (id, name, email, email_verified, created_at, updated_at)
     values ($1, $2, $3, true, now(), now())`,
    [ownerId, 'STORY03', `${ownerId}@example.test`],
  );
}

async function seedPendingWithSavedResult(database) {
  const ownerId = `story03-${randomUUID()}`;
  const generationId = randomUUID();
  const task = openingTask(root);
  await insertUser(database, ownerId);
  await database.db.transaction(async (tx) => {
    await insertStorytellerTask(tx, { id: generationId, ownerId, task });
  });
  const custody = createStorytellerExecution(database, {});
  await custody.claimGeneration({ generationId, pinnedRoot: root });
  const result = scriptedStorytellerResult(task);
  const resultHash = hashStorytellerCustodyResult(result);
  const saved = await custody.saveValidatedResult({
    generationId,
    pinnedRoot: root,
    resultHash,
    result,
  });
  assert.equal(saved.status, 'saved');
  const [pending] = await database.db
    .select()
    .from(generation)
    .where(eq(generation.id, generationId));
  assert.equal(pending.state, 'pending');
  assert.equal(pending.attemptId, null);
  assert.equal(pending.output, null);
  return { ownerId, generationId, task, result, attemptId: saved.attemptId };
}

test('adopt promotes pending generation exactly once under pg constraints', async () => {
  await withDisposable(async (database) => {
    const { generationId, attemptId, result } =
      await seedPendingWithSavedResult(database);
    const adoption = createStorytellerGenerationAdoption(database);
    const first = await adoption.adoptSavedStorytellerGeneration({
      generationId,
      pinnedRoot: root,
    });
    assert.equal(first.status, 'adopted');
    assert.equal(first.attemptId, attemptId);
    assert.equal(first.statusRevision, 1);
    const second = await adoption.adoptSavedStorytellerGeneration({
      generationId,
      pinnedRoot: root,
    });
    assert.equal(second.status, 'idempotent');
    assert.equal(second.attemptId, attemptId);
    assert.equal(second.statusRevision, 1);
    const [row] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, generationId));
    assert.equal(row.state, 'succeeded');
    assert.equal(row.attemptId, attemptId);
    assert.deepEqual(row.output, result);
    assert.equal(row.failureCode, null);
    assert.equal(row.repairCandidate, null);
    assert.equal(row.repairDiagnostic, null);
  });
});

test('concurrent adopters perform one promotion and one idempotent read', async () => {
  await withDisposable(async (database) => {
    const { generationId, attemptId } = await seedPendingWithSavedResult(
      database,
    );
    const adoption = createStorytellerGenerationAdoption(database);
    const [left, right] = await Promise.all([
      adoption.adoptSavedStorytellerGeneration({
        generationId,
        pinnedRoot: root,
      }),
      adoption.adoptSavedStorytellerGeneration({
        generationId,
        pinnedRoot: root,
      }),
    ]);
    const outcomes = [left.status, right.status].sort();
    assert.deepEqual(outcomes, ['adopted', 'idempotent']);
    const adopted = left.status === 'adopted' ? left : right;
    const repeated = left.status === 'idempotent' ? left : right;
    assert.equal(adopted.attemptId, attemptId);
    assert.equal(repeated.attemptId, attemptId);
    assert.equal(adopted.statusRevision, repeated.statusRevision);
    const [row] = await database.db
      .select({ statusRevision: generation.statusRevision })
      .from(generation)
      .where(eq(generation.id, generationId));
    assert.equal(row.statusRevision, 1);
  });
});

test('repair metadata on pending holds without clearing diagnostics', async () => {
  await withDisposable(async (database) => {
    const { generationId } = await seedPendingWithSavedResult(database);
    const diagnostic = { code: 'sample-repair', generationId };
    await database.db
      .update(generation)
      .set({
        repairCandidate: { scene: { content: { paragraphs: ['held'] } } },
        repairDiagnostic: diagnostic,
      })
      .where(eq(generation.id, generationId));
    const adoption = createStorytellerGenerationAdoption(database);
    const outcome = await adoption.adoptSavedStorytellerGeneration({
      generationId,
      pinnedRoot: root,
    });
    assert.deepEqual(outcome, {
      status: 'held',
      reason: 'repair-pending',
      generationId,
    });
    const [row] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, generationId));
    assert.equal(row.state, 'pending');
    assert.deepEqual(row.repairDiagnostic, diagnostic);
    assert.notEqual(row.repairCandidate, null);
  });
});

test('legacy running attempt mismatch holds without writing output', async () => {
  await withDisposable(async (database) => {
    const { generationId } = await seedPendingWithSavedResult(database);
    const legacyAttempt = randomUUID();
    await database.db
      .update(generation)
      .set({ state: 'running', attemptId: legacyAttempt })
      .where(eq(generation.id, generationId));
    const adoption = createStorytellerGenerationAdoption(database);
    const outcome = await adoption.adoptSavedStorytellerGeneration({
      generationId,
      pinnedRoot: root,
    });
    assert.deepEqual(outcome, {
      status: 'held',
      reason: 'attempt-mismatch',
      generationId,
    });
    const [row] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, generationId));
    assert.equal(row.state, 'running');
    assert.equal(row.attemptId, legacyAttempt);
    assert.equal(row.output, null);
  });
});

test('adopt refuses when no saved attempt result exists', async () => {
  await withDisposable(async (database) => {
    const ownerId = `story03-${randomUUID()}`;
    const generationId = randomUUID();
    const task = openingTask(root);
    await insertUser(database, ownerId);
    await database.db.transaction(async (tx) => {
      await insertStorytellerTask(tx, { id: generationId, ownerId, task });
    });
    const custody = createStorytellerExecution(database, {});
    await custody.claimGeneration({ generationId, pinnedRoot: root });
    const adoption = createStorytellerGenerationAdoption(database);
    const outcome = await adoption.adoptSavedStorytellerGeneration({
      generationId,
      pinnedRoot: root,
    });
    assert.deepEqual(outcome, {
      status: 'refused',
      reason: 'missing-saved-result',
      generationId,
    });
  });
});