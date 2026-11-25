import assert from 'node:assert/strict';
import test from 'node:test';

import { createOriginBulkhead } from './resilience/bulkhead.js';
import { CacheOverloadError } from './resilience/single-flight.js';

test('bulkhead overload, fifo admission, and queue timeout', async () => {
  const bulkhead = createOriginBulkhead({
    concurrency: 1,
    queueLimit: 1,
    queueTimeoutMs: 50,
    clock: () => 0,
  });
  let releaseFirst!: () => void;
  const firstGate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });

  const first = bulkhead.run(async () => {
    await firstGate;
    return 'first';
  });
  const queued = bulkhead.run(async () => 'second');

  assert.throws(() => {
    void bulkhead.run(async () => 'third');
  }, CacheOverloadError);

  releaseFirst();
  const firstResult = await first;
  const queuedResult = await queued;
  assert.equal(firstResult, 'first');
  assert.equal(queuedResult, 'second');
});

test('bulkhead queue timeout while holder remains in flight', async () => {
  let now = 0;
  const bulkhead = createOriginBulkhead({
    concurrency: 1,
    queueLimit: 2,
    queueTimeoutMs: 100,
    clock: () => now,
  });

  let releaseHolder!: () => void;
  const holderGate = new Promise<void>((resolve) => {
    releaseHolder = resolve;
  });

  const holder = bulkhead.run(async () => {
    await holderGate;
    return 'holder';
  });

  const timedOut = bulkhead.run(async () => 'never');
  const timedOutResult = assert.rejects(timedOut, CacheOverloadError);

  bulkhead.advance!(150);
  await timedOutResult;

  releaseHolder();
  assert.equal(await holder, 'holder');
});

test('bulkhead work errors reject only that caller', async () => {
  const bulkhead = createOriginBulkhead({
    concurrency: 2,
    queueLimit: 0,
    queueTimeoutMs: 100,
  });
  const failure = new Error('work failed');

  await assert.rejects(
    bulkhead.run(async () => {
      throw failure;
    }),
    failure,
  );

  const ok = await bulkhead.run(async () => 'ok');
  assert.equal(ok, 'ok');
});
