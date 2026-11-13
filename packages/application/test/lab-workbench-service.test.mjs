import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createLabWorkbenchService,
  LabWorkbenchError,
} from '../dist/developer-tools/index.js';

test('partial shift specimen: open step clock assert finalize with replay command', async () => {
  const lab = createLabWorkbenchService({
    gitCommit: 'd45f4faaaaaaaaa',
    dirty: false,
  });
  const opened = lab.open({
    ownerId: 'viewer-a',
    scenarioId: 'activity-clock-wait-eighty',
    scenarioVersion: 1,
    lane: 'bench-policy',
    seed: 141,
  });
  await lab.command({
    ownerId: 'viewer-a',
    runId: opened.runId,
    command: { kind: 'load' },
  });
  const advanced = await lab.command({
    ownerId: 'viewer-a',
    runId: opened.runId,
    command: { kind: 'advanceClock', targetGameSecond: 1000 },
  });
  assert.equal(advanced.kind, 'step');
  assert.ok(advanced.lastDelta);
  await lab.command({
    ownerId: 'viewer-a',
    runId: opened.runId,
    command: { kind: 'assert', invariantId: 'game-second-at-least', expected: 1000 },
  });
  const finalized = await lab.command({
    ownerId: 'viewer-a',
    runId: opened.runId,
    command: { kind: 'finalize' },
  });
  assert.equal(finalized.kind, 'finalize');
  assert.match(finalized.replayCommand, /activity-clock-wait-eighty/);

  const replayed = lab.replay({
    ownerId: 'viewer-a',
    runId: opened.runId,
  });
  assert.notEqual(replayed.runId, opened.runId);
});

test('negatives: foreign owner, blocked lane, unknown command path', async () => {
  const lab = createLabWorkbenchService({ gitCommit: 'd45f4faaaaaaaaa' });
  const opened = lab.open({
    ownerId: 'viewer-a',
    scenarioId: 'activity-clock-wait-eighty',
    scenarioVersion: 1,
    lane: 'bench-policy',
  });
  assert.throws(
    () => lab.get({ ownerId: 'viewer-b', runId: opened.runId }),
    (error) =>
      error instanceof LabWorkbenchError && error.code === 'not_found',
  );
  assert.throws(
    () =>
      lab.open({
        ownerId: 'viewer-a',
        scenarioId: 'activity-clock-wait-eighty',
        scenarioVersion: 1,
        lane: 'authorized-live',
      }),
    (error) =>
      error instanceof LabWorkbenchError && error.code === 'forbidden-lane',
  );
  assert.throws(
    () =>
      lab.open({
        ownerId: 'viewer-a',
        scenarioId: 'finite-action-overlap-eligibility',
        scenarioVersion: 1,
        lane: 'connected',
      }),
    (error) =>
      error instanceof LabWorkbenchError && error.code === 'forbidden-lane',
  );
});
