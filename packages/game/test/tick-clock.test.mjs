import assert from 'node:assert/strict';
import test from 'node:test';
import { earnedTicks, realMsUntilTick, wholeTicks } from '../src/time.ts';

const rate = (fictionalSeconds, realSeconds) => ({
  kind: 'rate',
  fictionalSeconds,
  realSeconds,
});
const earn = (progress, pace, now, state = 'running', maximumTicks = 100) =>
  earnedTicks({
    progress,
    pace,
    now,
    state,
    maximumTicks,
    anchorAt: new Date(0),
  });

test('reanchoring and changing pace preserve an exact fractional fictional second', () => {
  const first = earn(wholeTicks(0), rate(1, 3), 1000);
  const second = earn(first, rate(1, 6), 1000);
  assert.deepEqual(second, {
    elapsedTicks: 0,
    remainder: { numerator: '1', denominator: '2' },
  });
  assert.equal(realMsUntilTick(second, 1, rate(1, 10)), 5000);
  assert.deepEqual(earn(second, rate(1, 10), 5000), wholeTicks(1));
});

test('many reanchors earn the same amount as one uninterrupted interval', () => {
  let progress = wholeTicks(0);
  for (let index = 0; index < 30; index++) {
    progress = earn(progress, rate(1, 3), 1000);
  }
  assert.deepEqual(progress, earn(wholeTicks(0), rate(1, 3), 30000));
});

test('pause earns nothing, including when changing to instant', () => {
  const progress = earn(wholeTicks(2), rate(1, 7), 3000);
  assert.deepEqual(
    earn(progress, { kind: 'instant' }, 90_000, 'paused'),
    progress,
  );
  assert.deepEqual(earn(progress, rate(1, 7), 4000), wholeTicks(3));
});

test('clamps at completion before converting large integer products to numbers', () => {
  assert.deepEqual(
    earn(wholeTicks(0), rate(1_000_000, 1), 8_640_000_000_000, 'running', 8),
    wholeTicks(8),
  );
  assert.deepEqual(
    earn(wholeTicks(0), { kind: 'instant' }, 0, 'running', 8),
    wholeTicks(8),
  );
});

test('quiet ticks need no work; wakes round up and due boundaries need no wait', () => {
  assert.equal(realMsUntilTick(wholeTicks(0), 8, rate(3, 1)), 2667);
  assert.equal(realMsUntilTick(wholeTicks(8), 4, rate(1, 1)), 0);
  assert.equal(
    realMsUntilTick(wholeTicks(0), Number.MAX_SAFE_INTEGER, rate(1, 86_400)),
    86400000,
  );
});

test('a clock observation before its anchor cannot subtract earned progress', () => {
  const progress = earn(wholeTicks(1), rate(1, 3), 1000);
  assert.deepEqual(earn(progress, rate(1, 3), -1000), progress);
});

test('a thirty-minute job derives its real wait from the selected speed', () => {
  const fast = rate(360, 1);
  assert.deepEqual(
    earn(wholeTicks(0), fast, 5000, 'running', 1800),
    wholeTicks(1800),
  );
  assert.equal(realMsUntilTick(wholeTicks(0), 1800, fast), 5000);

  const afterTwoSeconds = earn(wholeTicks(0), fast, 2000, 'running', 1800);
  assert.deepEqual(afterTwoSeconds, wholeTicks(720));
  assert.equal(realMsUntilTick(afterTwoSeconds, 1800, rate(180, 1)), 6000);
});
