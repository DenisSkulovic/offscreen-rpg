import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { createLabRun, LabRunError } from '../dist/developer-tools/index.js';

test('load inspect advance assert pause resume reset replay', async () => {
  const run = createLabRun({
    lane: 'bench-policy',
    seed: 141,
    breakpoint: 'after-clock',
  });
  const loaded = await run.step({
    stepId: randomUUID(),
    ordinal: 1,
    expectedRunRevision: 0,
    command: { kind: 'load' },
  });
  assert.equal(loaded.outcome, 'ok');
  assert.ok(loaded.observation.fixtureHash);

  const inspected = await run.step({
    stepId: randomUUID(),
    ordinal: 2,
    expectedRunRevision: run.snapshot().revision,
    command: { kind: 'inspect', facets: ['clock', 'items', 'summary'] },
  });
  assert.equal(inspected.outcome, 'ok');
  assert.equal(inspected.observation.clock.gameSecond, 100);

  const advanced = await run.step({
    stepId: randomUUID(),
    ordinal: 3,
    expectedRunRevision: run.snapshot().revision,
    command: { kind: 'advanceClock', targetGameSecond: 1000 },
    breakpoint: 'after-clock',
  });
  assert.equal(advanced.outcome, 'ok');
  assert.equal(run.snapshot().lifecycle, 'paused');

  run.resume();
  const asserted = await run.step({
    stepId: randomUUID(),
    ordinal: 4,
    expectedRunRevision: run.snapshot().revision,
    command: {
      kind: 'assert',
      invariantId: 'game-second-at-least',
      expected: 1000,
    },
  });
  assert.equal(asserted.outcome, 'ok');

  const reset = await run.step({
    stepId: randomUUID(),
    ordinal: 5,
    expectedRunRevision: run.snapshot().revision,
    command: { kind: 'reset' },
  });
  assert.equal(reset.outcome, 'ok');
  assert.equal(reset.observation.summary.progressRatio, 0.8);

  const replayed = await run.replay();
  assert.notEqual(replayed.snapshot().runId, run.snapshot().runId);
  assert.equal(replayed.snapshot().seed, 141);
  const again = await replayed.runAll([
    { kind: 'load' },
    { kind: 'assert', invariantId: 'item-count', expected: 1 },
  ]);
  assert.equal(again[0].outcome, 'ok');
  assert.equal(again[1].outcome, 'ok');
});

test('sandbox lane load isolates; negatives for revision ordinal duplicate body', async () => {
  const sandbox = createLabRun({ lane: 'sandbox-db', seed: 9 });
  const first = await sandbox.runAll([
    { kind: 'load' },
    { kind: 'inspect', facets: ['summary'] },
  ]);
  assert.equal(first[0].outcome, 'ok');
  assert.ok(
    first[0].observation.databaseName.startsWith('offscreen_chamber_run_'),
  );

  const run = createLabRun({ lane: 'bench-policy', seed: 1 });
  await run.step({
    stepId: randomUUID(),
    ordinal: 1,
    expectedRunRevision: 0,
    command: { kind: 'load' },
  });
  await assert.rejects(
    () =>
      run.step({
        stepId: randomUUID(),
        ordinal: 2,
        expectedRunRevision: 0,
        command: { kind: 'inspect', facets: ['clock'] },
      }),
    (error) => error instanceof LabRunError && error.code === 'stale-revision',
  );
  await assert.rejects(
    () =>
      run.step({
        stepId: randomUUID(),
        ordinal: 99,
        expectedRunRevision: run.snapshot().revision,
        command: { kind: 'inspect', facets: ['clock'] },
      }),
    (error) => error instanceof LabRunError && error.code === 'out-of-order',
  );

  const stepId = randomUUID();
  const ok = await run.step({
    stepId,
    ordinal: 2,
    expectedRunRevision: run.snapshot().revision,
    command: { kind: 'inspect', facets: ['clock'] },
  });
  const idempotent = await run.step({
    stepId,
    ordinal: 2,
    expectedRunRevision: ok.runRevision,
    command: { kind: 'inspect', facets: ['clock'] },
  });
  assert.deepEqual(idempotent, ok);
  await assert.rejects(
    () =>
      run.step({
        stepId,
        ordinal: 2,
        expectedRunRevision: run.snapshot().revision,
        command: { kind: 'inspect', facets: ['items'] },
      }),
    (error) =>
      error instanceof LabRunError && error.code === 'duplicate-body-mismatch',
  );

  const blocked = createLabRun({ lane: 'bench-policy', seed: 2 });
  await blocked.step({
    stepId: randomUUID(),
    ordinal: 1,
    expectedRunRevision: 0,
    command: { kind: 'load' },
  });
  const unsupported = await blocked.step({
    stepId: randomUUID(),
    ordinal: 2,
    expectedRunRevision: blocked.snapshot().revision,
    command: { kind: 'admitChoice', optionId: 'deliver' },
  });
  assert.equal(unsupported.outcome, 'blocked');
  assert.equal(blocked.snapshot().lifecycle, 'blocked');
});
