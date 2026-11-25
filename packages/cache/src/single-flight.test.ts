import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CacheOverloadError,
  createSingleFlight,
} from './resilience/single-flight.js';

test('100 same-key callers coalesce to one loader', async () => {
  const flight = createSingleFlight<number>({
    maxActiveKeys: 8,
    maxWaitersPerKey: 128,
  });
  let loads = 0;

  const results = await Promise.all(
    Array.from({ length: 100 }, () =>
      flight.run('hot', async () => {
        loads += 1;
        return 42;
      }),
    ),
  );

  assert.equal(loads, 1);
  assert.equal(results.filter((result) => result.coalesced).length, 99);
  assert.ok(results.every((result) => result.value === 42));
});

test('rejected leader propagates to waiters; later run succeeds', async () => {
  const flight = createSingleFlight<string>({
    maxActiveKeys: 4,
    maxWaitersPerKey: 8,
  });
  const boom = new Error('source failed');

  const leader = flight.run('key', async () => {
    throw boom;
  });
  const waiter = flight.run('key', async () => 'unused');

  await assert.rejects(leader, boom);
  await assert.rejects(waiter, boom);

  const retry = await flight.run('key', async () => 'ok');
  assert.equal(retry.coalesced, false);
  assert.equal(retry.value, 'ok');
});

test('clear fences canPublish; new generation starts while old loader runs', async () => {
  const flight = createSingleFlight<string>({
    maxActiveKeys: 4,
    maxWaitersPerKey: 8,
  });
  let publishableAtResolve = false;
  let releaseFirst!: (value: string) => void;
  const firstDone = new Promise<string>((resolve) => {
    releaseFirst = resolve;
  });

  const first = flight.run('fence', async (canPublish) => {
    await firstDone;
    publishableAtResolve = canPublish();
    return 'stale';
  });

  flight.clear();
  let secondLoads = 0;
  const second = flight.run('fence', async () => {
    secondLoads += 1;
    return 'fresh';
  });

  releaseFirst('stale');
  const firstResult = await first;
  const secondResult = await second;

  assert.equal(publishableAtResolve, false);
  assert.equal(firstResult.value, 'stale');
  assert.equal(secondLoads, 1);
  assert.equal(secondResult.value, 'fresh');
  assert.equal(secondResult.coalesced, false);
});

test('caller cancellation detaches only that waiter', async () => {
  const flight = createSingleFlight<number>({
    maxActiveKeys: 4,
    maxWaitersPerKey: 8,
  });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const controller = new AbortController();

  const leader = flight.run('cancel', async () => {
    await gate;
    return 7;
  });
  const cancelled = flight.run('cancel', async () => 7, controller.signal);
  const waiter = flight.run('cancel', async () => 7);

  controller.abort();
  await assert.rejects(cancelled, (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.equal(error.name, 'AbortError');
    return true;
  });

  release();
  const leaderResult = await leader;
  const waiterResult = await waiter;
  assert.equal(leaderResult.value, 7);
  assert.equal(waiterResult.value, 7);
});

test('hung capacity, invalidate, and settlement release slots', async () => {
  const flight = createSingleFlight<string>({
    maxActiveKeys: 2,
    maxWaitersPerKey: 4,
  });
  const releases: Array<(value: string) => void> = [];

  function hungKey(
    tag: string,
  ): Promise<{ value: string; coalesced: boolean }> {
    return flight.run(
      tag,
      () =>
        new Promise<string>((resolve) => {
          releases.push(resolve);
        }),
    );
  }

  const hungA = hungKey('a');
  const hungB = hungKey('b');
  await Promise.resolve();

  assert.throws(() => {
    void flight.run('c', async () => 'blocked');
  }, CacheOverloadError);

  flight.invalidate('a');
  assert.throws(() => {
    void flight.run('d', async () => 'still blocked');
  }, CacheOverloadError);

  releases.shift()?.('done-a');
  await hungA;
  const admittedAfterFirstSettle = await flight.run(
    'e',
    async () => 'admitted-early',
  );
  assert.equal(admittedAfterFirstSettle.value, 'admitted-early');

  releases.shift()?.('done-b');
  await hungB;
  const admitted = await flight.run('f', async () => 'admitted');
  assert.equal(admitted.value, 'admitted');
});

test('maxWaitersPerKey rejects one extra waiter without second loader', async () => {
  const flight = createSingleFlight<number>({
    maxActiveKeys: 4,
    maxWaitersPerKey: 2,
  });
  let loads = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  const leader = flight.run('waiters', async () => {
    loads += 1;
    await gate;
    return 1;
  });
  const waiterOne = flight.run('waiters', async () => 1);
  const waiterTwo = flight.run('waiters', async () => 1);

  assert.throws(() => {
    void flight.run('waiters', async () => 1);
  }, CacheOverloadError);
  assert.equal(loads, 1);

  release();
  await Promise.all([leader, waiterOne, waiterTwo]);
});
