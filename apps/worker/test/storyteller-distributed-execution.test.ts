import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { hashStorytellerTaskCustodyResult } from '@offscreen/contracts/storyteller-task-custody';
import { scriptedStorytellerResult } from '@offscreen/storyteller/fixtures';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { prepareStorytellerTask } from '@offscreen/storyteller/tasks';
import { createStorytellerDistributedExecutionActivities } from '../src/activities/storyteller-distributed-execution';

const generationId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const rootHash = '00'.repeat(32);

function canonicalKnowledge() {
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
      maxReads: 4 as const,
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

function scriptedOpeningTask() {
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
      canonicalKnowledge: canonicalKnowledge(),
    },
  });
}

test('executeFrozenStoryteller refuses provider mode without sending', async () => {
  const providerTask = structuredClone(scriptedOpeningTask());
  providerTask.execution = {
    mode: 'provider',
    accountId: generationId,
    runId: generationId,
    dispatchReview: { mode: 'off' },
    policy: {
      version: 'v1',
      route: 'openrouter.test',
      model: 'model',
      provider: 'openrouter',
      priceVersion: 'p1',
      inputMicrousdPerMillion: '0',
      outputMicrousdPerMillion: '0',
      maxInputTokens: 100,
      maxOutputTokens: 100,
      timeoutMs: 1000,
    },
  };
  const activities = createStorytellerDistributedExecutionActivities({
    async fetchTask() {
      return {
        status: 'ready' as const,
        generationId,
        ownerId: 'owner',
        pinnedRoot: null,
        task: providerTask,
      };
    },
    async claim() {
      throw new Error('claim must not run for provider mode');
    },
    async save() {
      throw new Error('save must not run for provider mode');
    },
    async readSaved() {
      return { status: 'unclaimed' as const, generationId };
    },
    async readEvidence() {
      throw new Error('readEvidence must not run for provider mode');
    },
  });

  await assert.rejects(() => activities.executeFrozenStoryteller(generationId), {
    name: 'ApplicationFailure',
    type: 'ProviderModeRefused',
  });
});

test('executeFrozenStoryteller claims and saves one scripted result', async () => {
  const task = scriptedOpeningTask();
  const result = scriptedStorytellerResult(task);
  const resultHash = hashStorytellerTaskCustodyResult(result);
  let saved = false;
  const activities = createStorytellerDistributedExecutionActivities({
    async fetchTask() {
      return {
        status: 'ready' as const,
        generationId,
        ownerId: 'owner',
        pinnedRoot: null,
        task,
      };
    },
    async readSaved() {
      return saved
        ? {
            status: 'saved' as const,
            generationId,
            attemptId: generationId,
            resultHash,
            result,
          }
        : { status: 'unclaimed' as const, generationId };
    },
    async claim() {
      return {
        status: 'claimed' as const,
        generationId,
        attemptId: generationId,
        created: true,
      };
    },
    async save(_id, _root, hash, body) {
      saved = true;
      assert.equal(hash, resultHash);
      assert.deepEqual(body, result);
      return {
        status: 'saved' as const,
        generationId,
        attemptId: generationId,
        resultHash,
        result,
      };
    },
    async readEvidence() {
      throw new Error('readEvidence must not run for scripted execution');
    },
  });

  await activities.executeFrozenStoryteller(generationId);
  assert.equal(saved, true);
});

test('executeFrozenStoryteller returns when GA already saved the result', async () => {
  const task = scriptedOpeningTask();
  const result = scriptedStorytellerResult(task);
  let claimCalls = 0;
  const activities = createStorytellerDistributedExecutionActivities({
    async fetchTask() {
      return {
        status: 'ready' as const,
        generationId,
        ownerId: 'owner',
        pinnedRoot: null,
        task,
      };
    },
    async readSaved() {
      return {
        status: 'saved' as const,
        generationId,
        attemptId: generationId,
        resultHash: hashStorytellerTaskCustodyResult(result),
        result,
      };
    },
    async claim() {
      claimCalls++;
      throw new Error('claim must not run when saved result exists');
    },
    async save() {
      throw new Error('save must not run when saved result exists');
    },
    async readEvidence() {
      throw new Error('readEvidence must not run when saved result exists');
    },
  });
  await activities.executeFrozenStoryteller(generationId);
  assert.equal(claimCalls, 0);
});