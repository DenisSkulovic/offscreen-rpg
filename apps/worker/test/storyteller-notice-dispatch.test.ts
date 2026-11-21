import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  LAUNCH_WAKE_TOPIC,
  storytellerDistributedTopic,
  storytellerTopic,
} from '@offscreen/story-engine/storyteller';
import {
  storytellerControlTaskQueue,
  storytellerDistributedWorkflowType,
  storytellerWorkflowId,
  storytellerWorkflowType,
  storyLaunchWorkflowId,
  storyLaunchWorkflowType,
} from '@offscreen/workflows/contracts';
import {
  deliverOutboxNotice,
  selectNoticeDispatch,
  storytellerNoticeWorkflowId,
} from '../src/outbox/dispatch';

const generationId = '00000000-0000-4000-8000-000000000101';
const retryNoticeId = '00000000-0000-4000-8000-000000000202';

test('story.launch.v1 routes to storyLaunchV1 without storytellerDistributedV1', () => {
  const reservedStoryId = '00000000-0000-4000-8000-000000000303';
  const launch = selectNoticeDispatch(LAUNCH_WAKE_TOPIC);
  assert.equal(launch?.kind, 'start');
  if (launch?.kind === 'start') {
    assert.equal(launch.workflowType, storyLaunchWorkflowType);
    assert.equal(launch.workflowId(reservedStoryId), storyLaunchWorkflowId(reservedStoryId));
    assert.notEqual(launch.workflowType, storytellerDistributedWorkflowType);
  }
});

test('dispatcher routes persisted legacy topic without consulting runtime flag', () => {
  const legacy = selectNoticeDispatch(storytellerTopic);
  assert.equal(legacy?.kind, 'start');
  if (legacy?.kind === 'start') {
    assert.equal(legacy.workflowType, storytellerWorkflowType);
  }
  const distributed = selectNoticeDispatch(storytellerDistributedTopic);
  assert.equal(distributed?.kind, 'start');
  if (distributed?.kind === 'start') {
    assert.equal(distributed.workflowType, storytellerDistributedWorkflowType);
  }
});

test('legacy explicit recovery keeps storyteller/{retryNoticeId} workflow identity', () => {
  assert.equal(
    storytellerNoticeWorkflowId({
      topic: storytellerTopic,
      id: retryNoticeId,
      operationId: generationId,
    }),
    storytellerWorkflowId(retryNoticeId),
  );
});

test('profiled notice skips workflow start when generation row is missing', async () => {
  let started = false;
  await deliverOutboxNotice(
    {
      id: generationId,
      topic: storytellerTopic,
      operationId: generationId,
    },
    {
      connection: {
        withDeadline: async (_deadline: number, run: () => Promise<void>) => {
          await run();
        },
      } as never,
      client: {
        workflow: {
          start: async () => {
            started = true;
          },
        },
      } as never,
      taskQueue: 'browser-integration',
      intervalNeedsWake: async () => false,
      generationExists: async () => false,
    },
  );
  assert.equal(started, false);
});

test('distributed recovery and redelivery reuse storyteller/{generationId}', () => {
  const first = storytellerNoticeWorkflowId({
    topic: storytellerDistributedTopic,
    id: generationId,
    operationId: generationId,
  });
  const recovery = storytellerNoticeWorkflowId({
    topic: storytellerDistributedTopic,
    id: retryNoticeId,
    operationId: generationId,
  });
  assert.equal(first, recovery);
  assert.equal(first, storytellerWorkflowId(generationId));
});

test('profiled resolution notice starts storytellerV1 on the relay worker task queue', async () => {
  const taskQueue = 'browser-integration';
  const starts: Array<{
    workflowType: string;
    workflowId: string;
    taskQueue: string;
    workflowIdReusePolicy: string;
  }> = [];
  await deliverOutboxNotice(
    {
      id: generationId,
      topic: storytellerTopic,
      operationId: generationId,
    },
    {
      connection: {
        withDeadline: async (_deadline: number, run: () => Promise<void>) => {
          await run();
        },
      } as never,
      client: {
        workflow: {
          start: async (
            workflowType: string,
            options: {
              workflowId: string;
              taskQueue: string;
              workflowIdReusePolicy: string;
            },
          ) => {
            starts.push({
              workflowType,
              workflowId: options.workflowId,
              taskQueue: options.taskQueue,
              workflowIdReusePolicy: options.workflowIdReusePolicy,
            });
          },
        },
      } as never,
      taskQueue,
      intervalNeedsWake: async () => false,
    },
  );
  assert.equal(starts.length, 1);
  assert.equal(starts[0]?.workflowType, storytellerWorkflowType);
  assert.equal(starts[0]?.workflowId, storytellerWorkflowId(generationId));
  assert.equal(starts[0]?.taskQueue, taskQueue);
  assert.equal(starts[0]?.workflowIdReusePolicy, 'ALLOW_DUPLICATE_FAILED_ONLY');
});

test('distributed storyteller notice starts on control task queue', async () => {
  const relayTaskQueue = 'browser-integration';
  const starts: Array<{
    workflowType: string;
    workflowId: string;
    taskQueue: string;
    workflowIdReusePolicy: string;
  }> = [];
  await deliverOutboxNotice(
    {
      topic: storytellerDistributedTopic,
      operationId: generationId,
    },
    {
      connection: {
        withDeadline: async (_deadline: number, run: () => Promise<void>) => {
          await run();
        },
      } as never,
      client: {
        workflow: {
          start: async (
            workflowType: string,
            options: {
              workflowId: string;
              taskQueue: string;
              workflowIdReusePolicy: string;
            },
          ) => {
            starts.push({
              workflowType,
              workflowId: options.workflowId,
              taskQueue: options.taskQueue,
              workflowIdReusePolicy: options.workflowIdReusePolicy,
            });
          },
        },
      } as never,
      taskQueue: relayTaskQueue,
      intervalNeedsWake: async () => false,
    },
  );
  assert.equal(starts.length, 1);
  assert.equal(starts[0]?.workflowType, storytellerDistributedWorkflowType);
  assert.equal(starts[0]?.workflowId, storytellerWorkflowId(generationId));
  assert.equal(starts[0]?.taskQueue, storytellerControlTaskQueue);
  assert.equal(starts[0]?.workflowIdReusePolicy, 'ALLOW_DUPLICATE_FAILED_ONLY');
});