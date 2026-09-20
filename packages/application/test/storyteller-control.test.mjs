import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { createChamberStorytellerControl } from '../dist/developer-tools/storyteller-control.js';

const pendingTask = (storyId) => ({
  task: 'pending-consequence',
  source: { storyId },
});

test('Chamber control holds and releases one exact pending generation', () => {
  const control = createChamberStorytellerControl();
  const storyId = randomUUID();
  const generationId = randomUUID();
  const otherGenerationId = randomUUID();

  assert.deepEqual(control.read(storyId), {
    storyId,
    revision: 0,
    state: 'idle',
    generationId: null,
  });
  control.arm(storyId, 0, 'hold');
  assert.equal(
    control.evaluate({ generationId, task: pendingTask(storyId) }),
    'hold',
  );
  assert.deepEqual(control.read(storyId), {
    storyId,
    revision: 2,
    state: 'held',
    generationId,
  });
  assert.equal(
    control.evaluate({ generationId, task: pendingTask(storyId) }),
    'hold',
  );
  assert.equal(
    control.evaluate({
      generationId: otherGenerationId,
      task: pendingTask(storyId),
    }),
    'proceed',
  );
  control.release(storyId, 2, generationId);
  assert.equal(
    control.evaluate({ generationId, task: pendingTask(storyId) }),
    'proceed',
  );
  assert.throws(
    () => control.clear(storyId, 2),
    /storyteller_control_conflict/,
  );
});

test('Chamber control injects one failure without affecting other task kinds', () => {
  const control = createChamberStorytellerControl();
  const storyId = randomUUID();
  const generationId = randomUUID();
  control.arm(storyId, 0, 'fail');

  assert.equal(
    control.evaluate({
      generationId,
      task: { task: 'continuation', source: { storyId } },
    }),
    'proceed',
  );
  assert.equal(
    control.evaluate({ generationId, task: pendingTask(storyId) }),
    'fail',
  );
  assert.deepEqual(control.read(storyId), {
    storyId,
    revision: 2,
    state: 'failed',
    generationId,
  });
  assert.equal(
    control.evaluate({ generationId, task: pendingTask(storyId) }),
    'proceed',
  );
});
