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

test('held invalidated generation still counts toward active cap', async () => {
  const flight = createSingleFlight<string>({
    maxActiveKeys: 2,
    maxWaitersPerKey: 8,
  });
  let releaseA!: (value: string) => void;
  const hangA = new Promise<string>((resolve) => {
    releaseA = resolve;
  });
  let releaseB!: (value: string) => void;
  const hangB = new Promise<string>((resolve) => {
    releaseB = resolve;
  });

  const genA = flight.run('x', async () => hangA);
  const genB = flight.run('y', async () => hangB);
  await Promise.resolve();

  flight.invalidate('x');
  assert.throws(() => {
    void flight.run('z', async () => 'blocked');
  }, CacheOverloadError);

  releaseA('a');
  await genA;
  const admitted = await flight.run('z', async () => 'ok');
  assert.equal(admitted.value, 'ok');

  releaseB('b');
  await genB;
});

test('overlapping replacement on same key keeps both generations active', async () => {
  const flight = createSingleFlight<string>({
    maxActiveKeys: 2,
    maxWaitersPerKey: 8,
  });
  let releaseFirst!: (value: string) => void;
  const firstHang = new Promise<string>((resolve) => {
    releaseFirst = resolve;
  });
  let releaseSecond!: (value: string) => void;
  const secondHang = new Promise<string>((resolve) => {
    releaseSecond = resolve;
  });
  let secondLoads = 0;

  const first = flight.run('k', async () => firstHang);
  await Promise.resolve();
  flight.invalidate('k');

  const second = flight.run('k', async () => {
    secondLoads += 1;
    return secondHang;
  });
  await Promise.resolve();

  assert.throws(() => {
    void flight.run('other', async () => 'full');
  }, CacheOverloadError);

  releaseFirst('stale');
  const firstResult = await first;
  assert.equal(firstResult.value, 'stale');

  releaseSecond('replacement');
  const secondResult = await second;
  assert.equal(secondResult.value, 'replacement');
  assert.equal(secondLoads, 1);
});

test('cancelled coalesced waiter frees a waiter slot', async () => {
  const flight = createSingleFlight<number>({
    maxActiveKeys: 4,
    maxWaitersPerKey: 2,
  });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  const leader = flight.run('slot', async () => {
    await gate;
    return 1;
  });
  const c1 = new AbortController();
  const w1 = flight.run('slot', async () => 1, c1.signal);
  const w2 = flight.run('slot', async () => 1);

  assert.throws(() => {
    void flight.run('slot', async () => 1);
  }, CacheOverloadError);

  c1.abort();
  await assert.rejects(w1, (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.equal(error.name, 'AbortError');
    return true;
  });

  const w3 = flight.run('slot', async () => 1);
  release();
  await Promise.all([leader, w2, w3]);
});
