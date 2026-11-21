import assert from 'node:assert/strict';
import { test } from 'node:test';
import { StoryError } from '@offscreen/story-engine/stories';
import { GenerationError } from '@offscreen/story-engine/generations';
import { createWorkerActivities } from '../src/activities/index';

const generationId = '00000000-0000-4000-8000-000000000101';

function stubActivities(storytellerComplete: (id: string) => Promise<void>) {
  return createWorkerActivities({
    database: {} as never,
    storyteller: { complete: storytellerComplete } as never,
    stories: {} as never,
    openings: {} as never,
    continuations: {} as never,
  });
}

test('completeStoryteller maps pending-consequence-not-settled to retryable ApplicationFailure', async () => {
  const activities = stubActivities(async () => {
    throw new StoryError('unavailable', 'pending-consequence-not-settled');
  });
  await assert.rejects(() => activities.completeStoryteller(generationId), {
    name: 'ApplicationFailure',
    type: 'PendingConsequenceNotSettled',
    nonRetryable: false,
  });
});

test('completeStoryteller maps other StoryError to nonRetryable OpeningStateError', async () => {
  const activities = stubActivities(async () => {
    throw new StoryError('invalid');
  });
  await assert.rejects(() => activities.completeStoryteller(generationId), {
    name: 'ApplicationFailure',
    type: 'OpeningStateError',
    nonRetryable: true,
  });
});

test('completeStoryteller maps GenerationError to nonRetryable OpeningStateError', async () => {
  const activities = stubActivities(async () => {
    throw new GenerationError('invalid');
  });
  await assert.rejects(() => activities.completeStoryteller(generationId), {
    name: 'ApplicationFailure',
    type: 'OpeningStateError',
    nonRetryable: true,
  });
});