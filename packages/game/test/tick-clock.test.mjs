import assert from 'node:assert/strict';
import test from 'node:test';
import {
  earnedGameSeconds,
  realMsUntilGameSecond,
  wholeGameSeconds,
} from '../src/time.ts';

const rate = (fictionalSeconds, realSeconds) => ({
  kind: 'rate',
  fictionalSeconds,
  realSeconds,
});
const earn = (
  progress,
  pace,
  now,
  state = 'running',
  maximumGameSeconds = 100,
) =>
  earnedGameSeconds({
    progress,
    pace,
    now,
    state,
    maximumGameSeconds,
    anchorAt: new Date(0),
  });

test('reanchoring and changing pace preserve an exact fractional fictional second', () => {
  const first = earn(wholeGameSeconds(0), rate(1, 3), 1000);
  const second = earn(first, rate(1, 6), 1000);
  assert.deepEqual(second, {
    elapsedGameSeconds: 0,
    remainder: { numerator: '1', denominator: '2' },
  });
  assert.equal(realMsUntilGameSecond(second, 1, rate(1, 10)), 5000);
  assert.deepEqual(earn(second, rate(1, 10), 5000), wholeGameSeconds(1));
});

test('many reanchors earn the same amount as one uninterrupted interval', () => {
  let progress = wholeGameSeconds(0);
  for (let index = 0; index < 30; index++) {
    progress = earn(progress, rate(1, 3), 1000);
  }
  assert.deepEqual(progress, earn(wholeGameSeconds(0), rate(1, 3), 30000));
});

test('pause earns nothing, including when changing to instant', () => {
  const progress = earn(wholeGameSeconds(2), rate(1, 7), 3000);
  assert.deepEqual(
    earn(progress, { kind: 'instant' }, 90_000, 'paused'),
    progress,
  );
  assert.deepEqual(earn(progress, rate(1, 7), 4000), wholeGameSeconds(3));
});

test('clamps at completion before converting large integer products to numbers', () => {
  assert.deepEqual(
    earn(
      wholeGameSeconds(0),
      rate(1_000_000, 1),
      8_640_000_000_000,
      'running',
      8,
    ),
    wholeGameSeconds(8),
  );
  assert.deepEqual(
    earn(wholeGameSeconds(0), { kind: 'instant' }, 0, 'running', 8),
    wholeGameSeconds(8),
  );
});

test('quiet fictional seconds need no work; wakes round up and due boundaries need no wait', () => {
  assert.equal(realMsUntilGameSecond(wholeGameSeconds(0), 8, rate(3, 1)), 2667);
  assert.equal(realMsUntilGameSecond(wholeGameSeconds(8), 4, rate(1, 1)), 0);
  assert.equal(
    realMsUntilGameSecond(
      wholeGameSeconds(0),
      Number.MAX_SAFE_INTEGER,
      rate(1, 86_400),
    ),
    86400000,
  );
});

test('a clock observation before its anchor cannot subtract earned progress', () => {
  const progress = earn(wholeGameSeconds(1), rate(1, 3), 1000);
  assert.deepEqual(earn(progress, rate(1, 3), -1000), progress);
});

test('a thirty-minute job derives its real wait from the selected speed', () => {
  const fast = rate(360, 1);
  assert.deepEqual(
    earn(wholeGameSeconds(0), fast, 5000, 'running', 1800),
    wholeGameSeconds(1800),
  );
  assert.equal(realMsUntilGameSecond(wholeGameSeconds(0), 1800, fast), 5000);

  const afterTwoSeconds = earn(
    wholeGameSeconds(0),
    fast,
    2000,
    'running',
    1800,
  );
  assert.deepEqual(afterTwoSeconds, wholeGameSeconds(720));
  assert.equal(
    realMsUntilGameSecond(afterTwoSeconds, 1800, rate(180, 1)),
    6000,
  );
});
