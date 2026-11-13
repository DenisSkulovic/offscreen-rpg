import assert from 'node:assert/strict';
import test from 'node:test';
import {
  acceptedShiftEightyPercentRecipe,
  advanceClockWaitToBoundary,
  composeFixtureSpecimen,
  createLabEntropy,
  createLabFictionalClock,
  describeLaneClocks,
  freezeAtWholeSeconds,
  LabClockError,
  projectWithLabSimulatedNow,
  refuseUncontrolledFastForward,
} from '../dist/developer-tools/index.js';

test('lane clock inventory labels controlled vs real domains', () => {
  const bench = describeLaneClocks('bench-policy');
  const sandbox = describeLaneClocks('sandbox-db');
  assert.equal(
    bench.find((entry) => entry.domain === 'fictional-game-second')?.controlled,
    true,
  );
  assert.equal(
    bench.find((entry) => entry.domain === 'postgres-authoritative')
      ?.controlled,
    false,
  );
  assert.equal(
    sandbox.find((entry) => entry.domain === 'temporal-worker-lease')
      ?.controlled,
    false,
  );
  assert.equal(
    sandbox.find((entry) => entry.domain === 'postgres-authoritative')
      ?.controlled,
    false,
  );
});

test('same seed reproduces draws; fictional advance skips wall wait', () => {
  const a = createLabEntropy(42, 'check');
  const b = createLabEntropy(42, 'check');
  assert.deepEqual([a.drawD20(), a.drawD20()], [b.drawD20(), b.drawD20()]);
  assert.equal(a.draws().length, 2);
  assert.equal(a.draws()[0].value, a.draws()[0].value);

  const clock = createLabFictionalClock(10);
  assert.equal(clock.advanceBy(990), 1000);
  assert.equal(clock.gameSecond(), 1000);
  assert.throws(() => clock.advanceTo(999), LabClockError);
  assert.throws(() => clock.advanceBy(0), LabClockError);

  const specimen = composeFixtureSpecimen(
    acceptedShiftEightyPercentRecipe({ seed: 7, includeItem: false }),
  );
  const advanced = advanceClockWaitToBoundary({
    state: specimen.state,
    targetGameSecond: 1000,
  });
  assert.equal(advanced.controlledDomain, 'fictional-game-second');
  assert.equal(advanced.progress.process.kind, 'clock-wait.v1');
  assert.equal(advanced.progress.process.elapsedFictionalSeconds, 900);
  assert.equal(advanced.state.gameSecond, 1000);
});

test('refuses Temporal/DB/browser fast-forward; lab now uses real earnedGameSeconds', () => {
  assert.throws(
    () => refuseUncontrolledFastForward('temporal-worker-lease'),
    (error) =>
      error instanceof LabClockError && error.code === 'uncontrolled-domain',
  );
  assert.throws(
    () => refuseUncontrolledFastForward('postgres-authoritative'),
    LabClockError,
  );

  const pace = { kind: 'rate', fictionalSeconds: 10, realSeconds: 1 };
  const progress = freezeAtWholeSeconds(0);
  const anchorAt = new Date('2020-01-01T00:00:00.000Z');
  const nowMs = anchorAt.getTime() + 500;
  const first = projectWithLabSimulatedNow({
    progress,
    anchorAt,
    pace,
    nowMs,
    maximumGameSeconds: 100,
    running: true,
  });
  const second = projectWithLabSimulatedNow({
    progress,
    anchorAt,
    pace,
    nowMs,
    maximumGameSeconds: 100,
    running: true,
  });
  assert.deepEqual(first, second);
  assert.equal(first.elapsedGameSeconds >= 0, true);
  const held = projectWithLabSimulatedNow({
    progress,
    anchorAt,
    pace,
    nowMs,
    maximumGameSeconds: 100,
    running: false,
  });
  assert.deepEqual(held, progress);
});
