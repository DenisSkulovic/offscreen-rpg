import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { StoryError } from '../dist/stories/errors.js';

const require = createRequire(import.meta.url);
const tasks = require('@offscreen/storyteller/tasks');
const adoption = require('../dist/storyteller/generation-adoption.js');
const publication = require('../dist/storyteller/publication.js');
const {
  createStorytellerSavedGenerationPublish,
} = require('../dist/storyteller/saved-generation-publish.js');

tasks.storytellerTaskSchema.safeParse = () => ({
  success: true,
  data: { context: {} },
});

const generationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function query(rows) {
  const chain = {
    from() {
      return chain;
    },
    where() {
      return Promise.resolve(rows);
    },
  };
  return chain;
}

function database() {
  let reads = 0;
  return {
    db: {
      select() {
        reads += 1;
        if (reads === 1) return query([{ input: { task: 'opening' } }]);
        return query([]);
      },
    },
  };
}

test('a pending StoryError stays a specific blocked publication reason', async () => {
  adoption.createStorytellerGenerationAdoption = () => ({
    async adoptSavedStorytellerGeneration() {
      return {
        status: 'adopted',
        generationId,
        attemptId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        resultHash: 'ab'.repeat(32),
        statusRevision: 1,
      };
    },
  });
  publication.publishStorytellerResult = async () => {
    throw new StoryError('unavailable', 'pending-consequence-not-settled');
  };
  const publish = createStorytellerSavedGenerationPublish(database());
  const outcome = await publish.publishSavedGeneration(generationId);
  assert.deepEqual(outcome, {
    status: 'blocked',
    generationId,
    reason: 'pending-consequence-not-settled',
  });
});

test('a StoryError without a reason still blocks with its code', async () => {
  publication.publishStorytellerResult = async () => {
    throw new StoryError('unavailable');
  };
  const publish = createStorytellerSavedGenerationPublish(database());
  const outcome = await publish.publishSavedGeneration(generationId);
  assert.equal(outcome.status, 'blocked');
  assert.equal(outcome.reason, 'unavailable');
});
