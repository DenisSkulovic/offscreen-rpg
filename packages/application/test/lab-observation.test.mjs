import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import {
  assertDelta,
  createLabRun,
  diffLabObservations,
  normalizeForComparison,
  observeSpecimenState,
} from '../dist/developer-tools/index.js';

test('finite activity advance produces monotonic clock delta and redacts private by default', async () => {
  const run = createLabRun({ lane: 'bench-policy', seed: 141 });
  await run.step({
    stepId: randomUUID(),
    ordinal: 1,
    expectedRunRevision: 0,
    command: { kind: 'load' },
  });
  const before = run.observe();
  assert.equal(before.consistency, 'atomic');
  assert.equal(before.redaction, 'default');

  await run.step({
    stepId: randomUUID(),
    ordinal: 2,
    expectedRunRevision: run.snapshot().revision,
    command: { kind: 'advanceClock', targetGameSecond: 1000 },
  });
  const after = run.observe();
  const delta = diffLabObservations({ before, after });
  assert.ok(delta.changes.some((change) => change.path.includes('gameSecond')));
  const monotonic = assertDelta({
    delta,
    invariantId: 'clock-monotonic',
    predicate: 'monotonic',
    path: 'clock.gameSecond',
  });
  assert.equal(monotonic.passed, true);

  const withPrivate = run.observe({ includePrivate: true });
  assert.equal(withPrivate.redaction, 'private-drilldown');
  assert.match(JSON.stringify(withPrivate.facets.items.value), /holderAudit/);
  assert.equal(
    JSON.stringify(before.facets.items.value).includes('holderAudit'),
    false,
  );
});

test('item holder change diffs; cross-version facets warn; normalize only for comparison', () => {
  const runId = randomUUID();
  const baseState = {
    gameSecond: 10,
    acceptedPlan: null,
    activityProgress: null,
    items: [
      { key: 'sealed-letter', label: 'Sealed letter', holderKey: 'courier' },
    ],
    decision: null,
  };
  const before = observeSpecimenState({
    runId,
    state: baseState,
    revision: 3,
  });
  const afterState = {
    ...baseState,
    items: [
      { key: 'sealed-letter', label: 'Sealed letter', holderKey: 'caretaker' },
    ],
  };
  const after = observeSpecimenState({
    runId,
    state: afterState,
    revision: 4,
  });
  const delta = diffLabObservations({ before, after });
  const transfer = assertDelta({
    delta,
    invariantId: 'item-transferred',
    predicate: 'equals',
    path: 'items.items.0.holderKey',
    expected: 'caretaker',
  });
  assert.equal(transfer.passed, true);

  const mixed = observeSpecimenState({
    runId,
    state: afterState,
    revision: 4,
    facetVersions: { clock: 4, items: 7, activity: 4, decision: 4 },
  });
  assert.equal(mixed.consistency, 'cross-version');
  assert.match(mixed.consistencyNote ?? '', /different versions/i);

  const left = normalizeForComparison({
    id: '123e4567-e89b-12d3-a456-426614174000',
    at: '2020-01-01T00:00:00.000Z',
    holderKey: 'courier',
  });
  const right = normalizeForComparison({
    id: '123e4567-e89b-12d3-a456-426614174999',
    at: '2021-01-01T00:00:00.000Z',
    holderKey: 'courier',
  });
  assert.deepEqual(left, right);
});
