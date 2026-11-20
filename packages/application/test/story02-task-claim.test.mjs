import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { getTableName } from 'drizzle-orm';
import { prepareStorytellerTask } from '@offscreen/storyteller/tasks';
import { scriptedStorytellerResult } from '@offscreen/storyteller/fixtures';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { createRequestAuditFixtureCases } from '@offscreen/storyteller/providers/request-audit-fixtures';
import {
  createStorytellerExecution,
  hashStorytellerCustodyResult,
  insertScriptedCustodyAttempt,
  saveCustodyResultOnAttempt,
} from '../dist/storyteller/execution.js';

const root = 'ab'.repeat(32);
const otherRoot = 'cd'.repeat(32);

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

function openingTask(rootHash, execution = { mode: 'scripted', version: 'offline-rehearsal.v1' }) {
  return prepareStorytellerTask({
    task: 'opening',
    source: { draftId: randomUUID(), draftRevision: 1 },
    profile: storytellerCatalogue.resolve({
      id: 'absurd-action-comedy',
      revision: 1,
    }),
    execution,
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

function providerModeOpeningTask() {
  return createRequestAuditFixtureCases({ caseIds: ['opening-narrative'] })[0]
    .task;
}

function committedGeneration(task) {
  return {
    id: randomUUID(),
    ownerId: 'owner-1',
    kind: 'storyteller.profiled.v1',
    input: task,
  };
}

function memoryClaimStore(generations, options = {}) {
  const byId = new Map(generations.map((row) => [row.id, row]));
  const attempts = [...(options.seedAttempts ?? [])];
  const inserts = [];
  let tail = Promise.resolve();
  const tx = {
    async lockGeneration(id) {
      const row = byId.get(id);
      return row ? structuredClone(row) : null;
    },
    async lockAttempts(generationId) {
      return attempts
        .filter((row) => row.generationId === generationId)
        .map((row) => ({
          id: row.id,
          generationId: row.generationId,
          createdAt: row.createdAt,
          state: row.state,
          requestedProvider: row.requestedProvider,
          attribution: structuredClone(row.attribution),
        }))
        .sort((left, right) => left.createdAt - right.createdAt);
    },
    async insertScriptedClaim(row) {
      inserts.push(row);
      attempts.push({
        id: row.attempt.id,
        generationId: row.attempt.generationId,
        createdAt: row.attempt.createdAt,
        state: row.attempt.state,
        requestedProvider: row.attempt.requestedProvider,
        attribution: row.attempt.attribution,
      });
    },
    async saveClaimResult(update) {
      const attempt = attempts.find((row) => row.id === update.attemptId);
      attempt.attribution = update.attribution;
      if (update.settlement) attempt.state = 'settled';
    },
  };
  return {
    attempts,
    inserts,
    transaction(body) {
      const run = tail.then(() => body(tx));
      tail = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
  };
}

function custody(store) {
  return createStorytellerExecution(
    {
      db: {
        transaction() {
          throw new Error('claim must use the attempt store');
        },
      },
    },
    { claimStore: store },
  );
}

function validatedHash(task, result) {
  return hashStorytellerCustodyResult(result);
}

test('a caller fetches the pinned root, claims once, and reads the saved result', async () => {
  const task = openingTask(root);
  const generation = committedGeneration(task);
  const store = memoryClaimStore([generation]);
  const first = custody(store);
  const second = custody(store);
  const result = scriptedStorytellerResult(task);
  const resultHash = validatedHash(task, result);

  const fetched = await first.fetchCommittedGeneration(generation.id);
  assert.equal(fetched.status, 'ready');
  assert.equal(fetched.pinnedRoot, root);

  const [left, right] = await Promise.all([
    first.claimGeneration({ generationId: generation.id, pinnedRoot: root }),
    second.claimGeneration({ generationId: generation.id, pinnedRoot: root }),
  ]);
  assert.equal(left.status, 'claimed');
  assert.equal(right.status, 'claimed');
  assert.equal(left.attemptId, right.attemptId);
  assert.equal(Number(left.created) + Number(right.created), 1);
  assert.equal(store.attempts.length, 1);
  assert.equal(store.inserts.length, 1);
  assert.equal(store.inserts[0].createStoppedFunding, true);
  assert.equal(store.inserts[0].attempt.requestedProvider, 'scripted-custody');

  const saved = await first.saveValidatedResult({
    generationId: generation.id,
    pinnedRoot: root,
    resultHash,
    result,
  });
  assert.equal(saved.status, 'saved');
  assert.deepEqual(saved.result, result);
  const repeated = await second.saveValidatedResult({
    generationId: generation.id,
    pinnedRoot: root,
    resultHash,
    result,
  });
  assert.equal(repeated.status, 'saved');
  assert.deepEqual(repeated.result, result);
  assert.equal(store.attempts.length, 1);
  assert.equal(store.attempts[0].state, 'settled');

  const read = await second.readValidatedResult(generation.id);
  assert.equal(read.status, 'saved');
  assert.equal(read.resultHash, resultHash);
  assert.deepEqual(read.result, result);

  const fresh = custody(memoryClaimStore([generation]));
  assert.equal(
    (await fresh.readValidatedResult(generation.id)).status,
    'unclaimed',
  );
  assert.equal(typeof first.execute, 'function');
});

test('provider-mode custody refuses fetch, claim, save, and read', async () => {
  const task = providerModeOpeningTask();
  const generation = committedGeneration(task);
  const providerRoot =
    task.context.canonicalKnowledge?.rootHash ?? null;
  const store = memoryClaimStore([generation]);
  const execution = custody(store);
  const scripted = openingTask(root);
  const result = scriptedStorytellerResult(scripted);
  const resultHash = validatedHash(scripted, result);

  assert.deepEqual(await execution.fetchCommittedGeneration(generation.id), {
    status: 'refused',
    reason: 'unsupported-execution',
  });
  assert.deepEqual(
    await execution.claimGeneration({
      generationId: generation.id,
      pinnedRoot: providerRoot,
    }),
    { status: 'refused', reason: 'unsupported-execution' },
  );
  assert.deepEqual(
    await execution.saveValidatedResult({
      generationId: generation.id,
      pinnedRoot: providerRoot,
      resultHash,
      result,
    }),
    { status: 'refused', reason: 'unsupported-execution' },
  );
  assert.deepEqual(await execution.readValidatedResult(generation.id), {
    status: 'refused',
    reason: 'unsupported-execution',
  });
  assert.equal(store.attempts.length, 0);
  assert.equal(store.inserts.length, 0);
});

test('a preseeded provider attempt cannot be claimed or saved as scripted', async () => {
  const task = openingTask(root);
  const generation = committedGeneration(task);
  const attemptId = randomUUID();
  const store = memoryClaimStore([generation], {
    seedAttempts: [
      {
        id: attemptId,
        generationId: generation.id,
        createdAt: new Date('2020-01-01T00:00:00.000Z'),
        state: 'reserved',
        requestedProvider: 'Audit',
        attribution: { custody: null },
      },
    ],
  });
  const execution = custody(store);
  const scriptedTask = openingTask(root);
  const result = scriptedStorytellerResult(scriptedTask);
  const resultHash = validatedHash(scriptedTask, result);

  assert.deepEqual(
    await execution.claimGeneration({
      generationId: generation.id,
      pinnedRoot: root,
    }),
    { status: 'refused', reason: 'unsupported-execution' },
  );
  assert.deepEqual(
    await execution.saveValidatedResult({
      generationId: generation.id,
      pinnedRoot: root,
      resultHash,
      result,
    }),
    { status: 'refused', reason: 'unsupported-execution' },
  );
  assert.deepEqual(await execution.readValidatedResult(generation.id), {
    status: 'refused',
    reason: 'unsupported-execution',
  });
  assert.equal(store.attempts.length, 1);
  assert.equal(store.attempts[0].requestedProvider, 'Audit');
  assert.equal(store.inserts.length, 0);
});

test('an unknown generation or a mismatched root is refused', async () => {
  const task = openingTask(root);
  const generation = committedGeneration(task);
  const store = memoryClaimStore([generation]);
  const execution = custody(store);

  assert.deepEqual(await execution.fetchCommittedGeneration(randomUUID()), {
    status: 'refused',
    reason: 'unknown-generation',
  });
  assert.deepEqual(
    await execution.claimGeneration({
      generationId: randomUUID(),
      pinnedRoot: root,
    }),
    { status: 'refused', reason: 'unknown-generation' },
  );
  assert.deepEqual(
    await execution.claimGeneration({
      generationId: generation.id,
      pinnedRoot: otherRoot,
    }),
    { status: 'refused', reason: 'root-mismatch' },
  );
  assert.equal(store.attempts.length, 0);
});

test('a different result hash conflicts and keeps the saved result', async () => {
  const task = openingTask(root);
  const generation = committedGeneration(task);
  const store = memoryClaimStore([generation]);
  const execution = custody(store);
  const result = scriptedStorytellerResult(task);
  const resultHash = validatedHash(task, result);
  const other = structuredClone(result);
  other.scene.content.paragraphs[0] = `${other.scene.content.paragraphs[0]} The wind shifts.`;
  const otherHash = validatedHash(task, other);
  assert.notEqual(resultHash, otherHash);

  await execution.claimGeneration({
    generationId: generation.id,
    pinnedRoot: root,
  });
  const saved = await execution.saveValidatedResult({
    generationId: generation.id,
    pinnedRoot: root,
    resultHash,
    result,
  });
  assert.equal(saved.status, 'saved');
  const conflict = await execution.saveValidatedResult({
    generationId: generation.id,
    pinnedRoot: root,
    resultHash: otherHash,
    result: other,
  });
  assert.deepEqual(conflict, {
    status: 'conflict',
    reason: 'result-hash',
    generationId: generation.id,
    attemptId: saved.attemptId,
    resultHash,
  });
  const read = await execution.readValidatedResult(generation.id);
  assert.equal(read.status, 'saved');
  assert.deepEqual(read.result, result);
  assert.equal(store.attempts.length, 1);
});

test('the claim write touches the attempt ledger and not story tables', async () => {
  const writes = [];
  const tx = {
    insert(table) {
      return {
        values() {
          writes.push({ op: 'insert', table: getTableName(table) });
          return Promise.resolve();
        },
      };
    },
    update(table) {
      return {
        set() {
          return {
            where() {
              writes.push({ op: 'update', table: getTableName(table) });
              return Promise.resolve();
            },
          };
        },
      };
    },
  };
  await insertScriptedCustodyAttempt(tx, {
    createStoppedFunding: true,
    fundingId: randomUUID(),
    runId: randomUUID(),
    attempt: {
      id: randomUUID(),
      generationId: randomUUID(),
      createdAt: new Date(),
      state: 'reserved',
      requestedProvider: 'scripted-custody',
      attribution: { custody: null },
      ownerId: 'owner-1',
      storyId: null,
      draftId: randomUUID(),
      purpose: 'opening',
      storytellerProfileId: 'absurd-action-comedy',
      storytellerProfileRevision: 1,
      taskInputVersion: 17,
      promptVersion: 'storyteller.v17',
      recipeVersion: 'single-turn.v1',
      resourcePolicyVersion: 'storyteller-resources.v2',
      requestedModel: 'scripted-custody',
      priceVersion: 'offline-rehearsal.v1',
      policy: { mode: 'scripted', version: 'offline-rehearsal.v1' },
    },
  });
  await saveCustodyResultOnAttempt(tx, {
    attemptId: randomUUID(),
    attribution: { custody: { version: 'storyteller.task-claim.v1' } },
    settlement: { dispatchedAt: new Date(), settledAt: new Date() },
  });
  assert.deepEqual(
    writes.map((write) => write.table),
    [
      'storyteller_funding',
      'storyteller_run',
      'storyteller_attempt',
      'storyteller_attempt',
    ],
  );
  for (const forbidden of [
    'story',
    'campaign',
    'story_passage',
    'story_document_commit',
  ]) {
    assert.equal(
      writes.some((write) => write.table === forbidden),
      false,
    );
  }
});
