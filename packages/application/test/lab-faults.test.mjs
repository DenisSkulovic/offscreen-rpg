import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import {
  createCommitAckFaultAdapter,
  createLabFaultRegistry,
  createLabRun,
  LabFaultError,
} from '../dist/developer-tools/index.js';

test('after-commit-before-ack keeps committed effect; retry ACKs same body', () => {
  const registry = createLabFaultRegistry();
  const runId = randomUUID();
  const operationId = randomUUID();
  registry.arm({
    faultId: 'lost-ack',
    runId,
    cutPoint: 'after-commit-before-ack',
    targetOperationId: operationId,
    storyId: null,
    expectedObservation: 'committed-then-acked-once',
  });
  const result = registry.exercise({
    runId,
    faultId: 'lost-ack',
    operationId,
    payload: { intent: 'shift', qty: 1 },
  });
  assert.equal(result.tripped, true);
  assert.equal(result.observation.committed, true);
  assert.equal(result.observation.ackedAfterRetry, true);
  assert.equal(result.observation.effectCount, 1);
  registry.disarm({ runId, faultId: 'lost-ack' });
  registry.assertNoArmed(runId);
});

test('duplicate delivery observes exactly one effect', () => {
  const registry = createLabFaultRegistry();
  const runId = randomUUID();
  const operationId = randomUUID();
  registry.arm({
    faultId: 'dup-delivery',
    runId,
    cutPoint: 'duplicate-delivery',
    targetOperationId: operationId,
    storyId: null,
    expectedObservation: 'exactly-one-effect',
  });
  const result = registry.exercise({
    runId,
    faultId: 'dup-delivery',
    operationId,
    payload: { intent: 'outbox', key: 'k1' },
  });
  assert.equal(result.observation.deliveries, 2);
  assert.equal(result.observation.effectCount, 1);
});

test('held-storyteller-consequence reuses arm-hold without provider dispatch', () => {
  const registry = createLabFaultRegistry();
  const runId = randomUUID();
  const storyId = randomUUID();
  registry.arm({
    faultId: 'hold-pending',
    runId,
    cutPoint: 'held-storyteller-consequence',
    targetOperationId: null,
    storyId,
    expectedObservation: 'hold-no-provider',
  });
  const result = registry.exercise({
    runId,
    faultId: 'hold-pending',
    generationId: randomUUID(),
  });
  assert.equal(result.observation.decision, 'hold');
  assert.equal(result.observation.providerDispatched, false);
  assert.equal(result.observation.storyteller.state, 'held');
});

test('negatives: body conflict, cross-run, forgotten disarm, GET has no provider', () => {
  const adapter = createCommitAckFaultAdapter();
  const operationId = randomUUID();
  const runA = randomUUID();
  const runB = randomUUID();
  adapter.commit({
    runId: runA,
    operationId,
    payload: { body: 'a' },
    dropAck: true,
  });
  assert.throws(
    () =>
      adapter.commit({
        runId: runA,
        operationId,
        payload: { body: 'b' },
        dropAck: false,
      }),
    (error) => error instanceof LabFaultError && error.code === 'body-conflict',
  );
  assert.throws(
    () =>
      adapter.ack({
        runId: runB,
        operationId,
        payload: { body: 'a' },
      }),
    (error) => error instanceof LabFaultError && error.code === 'cross-run',
  );

  const registry = createLabFaultRegistry();
  registry.arm({
    faultId: 'orphan',
    runId: runA,
    cutPoint: 'duplicate-delivery',
    targetOperationId: null,
    storyId: null,
    expectedObservation: 'must-cleanup',
  });
  assert.throws(
    () =>
      registry.exercise({
        runId: runB,
        faultId: 'orphan',
      }),
    (error) => error instanceof LabFaultError && error.code === 'not-armed',
  );
  const cleanup = registry.cleanup(runA);
  assert.equal(cleanup.forgottenDisarmCaught, true);
  assert.deepEqual(cleanup.cleaned, ['orphan']);

  // LabRun inspect/export never registers faults into Nest and never dispatches.
  const run = createLabRun({ lane: 'bench-policy', seed: 7 });
  return run
    .runAll([
      { kind: 'load' },
      { kind: 'inspect', facets: ['summary'] },
      { kind: 'export' },
    ])
    .then((steps) => {
      assert.equal(steps.every((step) => step.outcome === 'ok'), true);
      assert.equal(run.faults().list(run.snapshot().runId).length, 0);
    });
});

test('LabRun armFault / releaseFault / exerciseFault stay run-scoped', async () => {
  const run = createLabRun({ lane: 'bench-policy', seed: 11 });
  await run.step({
    stepId: randomUUID(),
    ordinal: 1,
    expectedRunRevision: 0,
    command: { kind: 'load' },
  });
  const operationId = randomUUID();
  const armed = await run.step({
    stepId: randomUUID(),
    ordinal: 2,
    expectedRunRevision: run.snapshot().revision,
    command: {
      kind: 'armFault',
      faultId: 'ack-drop',
      cutPoint: 'after-commit-before-ack',
      targetOperationId: operationId,
      expectedObservation: 'committed-unacked-then-retry',
    },
  });
  assert.equal(armed.outcome, 'ok');

  const exercised = run.exerciseFault({
    faultId: 'ack-drop',
    operationId,
    payload: { seam: 'commit-ack' },
  });
  assert.equal(exercised.observation.effectCount, 1);

  const other = createLabRun({ lane: 'bench-policy', seed: 12 });
  assert.throws(
    () => other.exerciseFault({ faultId: 'ack-drop' }),
    (error) => error instanceof LabFaultError && error.code === 'not-armed',
  );

  const released = await run.step({
    stepId: randomUUID(),
    ordinal: 3,
    expectedRunRevision: run.snapshot().revision,
    command: { kind: 'releaseFault', faultId: 'ack-drop' },
  });
  assert.equal(released.outcome, 'ok');
  run.cancel();
  run.faults().assertNoArmed(run.snapshot().runId);
});
