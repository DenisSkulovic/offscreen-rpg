import assert from 'node:assert/strict';
import test from 'node:test';
import { createWriterSceneDistributedControlActivities } from '../src/activities/writer-scene-distributed-control';
import type { WriterSceneRoundControlClient } from '../src/custody/writer-scene-round-control-client';

test('planWriterSceneRound requires maxModelRounds on execution plans', async () => {
  const client: WriterSceneRoundControlClient = {
    async plan() {
      return {
        missionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        contextId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        ordinal: 1,
        expectedRevision: 1,
        model: 'fake-model',
        maxModelRounds: 2,
      };
    },
    async readMissionState() {
      return { status: 'pending' };
    },
    async finalize() {
      return { status: 'published' };
    },
  };

  const activities = createWriterSceneDistributedControlActivities(client);
  const plan = await activities.planWriterSceneRound(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  );
  assert.equal(plan.maxModelRounds, 2);
});

test('finalizeWriterSceneRound passes through needs-next-round fields', async () => {
  const client: WriterSceneRoundControlClient = {
    async plan() {
      throw new Error('not used');
    },
    async readMissionState() {
      throw new Error('not used');
    },
    async finalize() {
      return {
        status: 'needs-next-round',
        nextOrdinal: 2,
        nextRevision: 3,
      };
    },
  };

  const activities = createWriterSceneDistributedControlActivities(client);
  const finalized = await activities.finalizeWriterSceneRound(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  );
  assert.deepEqual(finalized, {
    status: 'needs-next-round',
    nextOrdinal: 2,
    nextRevision: 3,
  });
});

test('finalizeWriterSceneRound preserves held reason', async () => {
  const client: WriterSceneRoundControlClient = {
    async plan() {
      throw new Error('not used');
    },
    async readMissionState() {
      throw new Error('not used');
    },
    async finalize() {
      return { status: 'held', reason: 'research_delegate_unsupported' };
    },
  };

  const activities = createWriterSceneDistributedControlActivities(client);
  const finalized = await activities.finalizeWriterSceneRound(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  );
  assert.deepEqual(finalized, {
    status: 'held',
    reason: 'research_delegate_unsupported',
  });
});