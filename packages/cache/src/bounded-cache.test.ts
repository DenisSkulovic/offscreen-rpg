import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRedisStore,
  REDIS_ENTRY_MAX_BYTES,
  type RedisStoreCommands,
} from './adapters/redis-store.js';
import { jsonCodec } from './codecs/json-codec.js';
import { defineCache, makeCacheKey, type CacheStore } from './core/index.js';
import { createFakeStore } from './core/test-stores.js';
import { createTieredStore } from './memory/tiered-store.js';
import { createRedisCircuitBreaker } from './resilience/redis-circuit-breaker.js';
import {
  CacheOverloadError,
  createSingleFlight,
} from './resilience/single-flight.js';
import {
  createRedisConnection,
  type RedisClientFactory,
  type RedisLifecycleClient,
} from './runtime/redis-connection.js';
import { bindCache } from './strategies/index.js';

test('single-flight: 10k distinct settled keys without capacity leak', async () => {
  const flight = createSingleFlight<number>({
    maxActiveKeys: 32,
    maxWaitersPerKey: 4,
  });
  for (let index = 0; index < 10_000; index += 1) {
    const result = await flight.run(`seq-${index}`, async () => index);
    assert.equal(result.value, index);
    assert.equal(result.coalesced, false);
  }

  const admitted = await flight.run('after-10k', async () => 10_001);
  assert.equal(admitted.value, 10_001);
});

test('single-flight: pre-aborted leader never starts the loader', async () => {
  const flight = createSingleFlight<string>({
    maxActiveKeys: 4,
    maxWaitersPerKey: 8,
  });
  let loads = 0;
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    flight.run(
      'pre-aborted',
      async () => {
        loads += 1;
        return 'never';
      },
      controller.signal,
    ),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.name, 'AbortError');
      return true;
    },
  );
  assert.equal(loads, 0);

  const admitted = await flight.run('pre-aborted', async () => {
    loads += 1;
    return 'after';
  });
  assert.equal(admitted.value, 'after');
  assert.equal(loads, 1);
});

test('single-flight: cancelled waiter churn does not retain detached slots', async () => {
  const flight = createSingleFlight<number>({
    maxActiveKeys: 4,
    maxWaitersPerKey: 128,
  });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let loads = 0;

  const leader = flight.run('churn', async () => {
    loads += 1;
    await gate;
    return 9;
  });

  for (let cycle = 0; cycle < 100; cycle += 1) {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      flight.run('churn', async () => 9, controller.signal),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal(error.name, 'AbortError');
        return true;
      },
    );
  }

  const waiter = flight.run('churn', async () => 9);
  release();
  await Promise.all([leader, waiter]);
  assert.equal(loads, 1);
});

test('single-flight: repeated invalidate respects total active generation cap', async () => {
  const flight = createSingleFlight<string>({
    maxActiveKeys: 2,
    maxWaitersPerKey: 8,
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

  flight.invalidate('a');
  assert.throws(() => {
    void flight.run('a', async () => 'replaced');
  }, CacheOverloadError);

  releases.shift()?.('done-a');
  await hungA;

  const admitted = await flight.run('a', async () => 'fresh');
  assert.equal(admitted.value, 'fresh');

  releases.shift()?.('done-b');
  await hungB;
});

test('tiered-store: L1 bypass still returns stored when L2 writes', async () => {
  const clock = () => 2_000;
  const l1: CacheStore = {
    async get() {
      return { kind: 'miss' };
    },
    async set() {
      return { kind: 'bypass', reason: 'oversize' };
    },
  };
  const l2 = createFakeStore(clock);
  const tiered = createTieredStore({ l1, l2, clock });

  const entry = {
    bytes: new TextEncoder().encode('remote-only'),
    observedAtMs: 1_000,
    expiresAtMs: 9_000,
  };
  const write = await tiered.set('tier-key', entry);
  assert.equal(write.kind, 'stored');

  const l2Hit = await l2.get('tier-key');
  assert.equal(l2Hit.kind, 'hit');
});

function createLifecycleClient(): RedisLifecycleClient {
  return {
    get isOpen() {
      return true;
    },
    get isReady() {
      return true;
    },
    async connect() {},
    async close() {},
    on() {},
  };
}

function createRedisHarness(clockStart = 1_000) {
  const nowMs = { value: clockStart };
  let wire: string | null = null;
  const commands: RedisStoreCommands = {
    async get() {
      return wire;
    },
    async set(_key, value) {
      wire = value;
    },
  };
  const connection = createRedisConnection(
    { REDIS_URL: 'redis://127.0.0.1:6379' },
    {
      clientFactory: (() =>
        createLifecycleClient()) satisfies RedisClientFactory,
    },
  );
  const store = createRedisStore({
    connection,
    clock: () => nowMs.value,
    commands,
    breaker: createRedisCircuitBreaker({ now: () => nowMs.value }),
  });
  return { store, connection, nowMs };
}

test('redis-store: canonical empty bytes round-trip', async () => {
  const { store, connection } = createRedisHarness(3_000);
  await connection.start();

  const write = await store.set('empty', {
    bytes: new Uint8Array(0),
    observedAtMs: 2_000,
    expiresAtMs: 8_000,
  });
  assert.equal(write.kind, 'stored');

  const lookup = await store.get('empty');
  assert.equal(lookup.kind, 'hit');
  if (lookup.kind === 'hit') {
    assert.equal(lookup.entry.bytes.byteLength, 0);
  }
});

test('redis-store: non-canonical base64 bypasses invalid before decode allocation', async () => {
  const nowMs = 5_000;
  const raw = JSON.stringify({
    v: 1,
    p: `SGVsbG8${'A'.repeat(8)}`,
    o: nowMs,
    e: nowMs + 60_000,
  });
  const connection = createRedisConnection(
    { REDIS_URL: 'redis://127.0.0.1:6379' },
    { clientFactory: () => createLifecycleClient() },
  );
  await connection.start();
  const store = createRedisStore({
    connection,
    clock: () => nowMs,
    commands: {
      async get() {
        return raw;
      },
      async set() {},
    },
    breaker: createRedisCircuitBreaker({ now: () => nowMs }),
  });

  const lookup = await store.get('malformed-b64');
  assert.equal(lookup.kind, 'bypass');
  assert.equal(lookup.reason, 'invalid');
});

test('readCache: oversize cached hit bypasses decode and reloads origin', async () => {
  const env = 'dev';
  let now = 12_000;
  const inner = createFakeStore(() => now);
  const key = makeCacheKey(env, 'story', 1, ['big']);
  const oversized = new Uint8Array(512);
  oversized.fill(0x7a);
  await inner.set(key, {
    bytes: oversized,
    observedAtMs: now,
    expiresAtMs: now + 60_000,
  });

  const definition = defineCache({
    namespace: 'story',
    version: 1,
    consistency: 'versioned',
    codec: jsonCodec((v: unknown) => v as string),
    policy: {
      ttlMs: 60_000,
      maxEntryBytes: 64,
      jitterRatio: 0,
      maxActiveKeys: 8,
      maxWaitersPerKey: 8,
      originConcurrency: 2,
      originQueueLimit: 8,
      originQueueTimeoutMs: 1_000,
    },
  });
  const bound = bindCache(definition, {
    store: inner,
    environment: env,
    clock: () => now,
  });
  let loads = 0;

  const value = await bound.getOrLoad(['big'], async () => {
    loads += 1;
    return { value: 'fresh', identity: ['big'], observedAtMs: now };
  });

  assert.equal(value, 'fresh');
  assert.equal(loads, 1);
});

test('redis-store: oversize encoded payload bypasses invalid within envelope bound', async () => {
  const nowMs = 8_000;
  const maxEncoded = Math.ceil(REDIS_ENTRY_MAX_BYTES / 3) * 4;
  const tooLongPayload = 'A'.repeat(maxEncoded + 4);
  const raw = JSON.stringify({
    v: 1,
    p: tooLongPayload,
    o: nowMs,
    e: nowMs + 120_000,
  });
  assert.ok(raw.length <= maxEncoded + 256);

  const connection = createRedisConnection(
    { REDIS_URL: 'redis://127.0.0.1:6379' },
    { clientFactory: () => createLifecycleClient() },
  );
  await connection.start();
  const store = createRedisStore({
    connection,
    clock: () => nowMs,
    commands: {
      async get() {
        return raw;
      },
      async set() {},
    },
    breaker: createRedisCircuitBreaker({ now: () => nowMs }),
  });

  const lookup = await store.get('oversize-encoded');
  assert.equal(lookup.kind, 'bypass');
  assert.equal(lookup.reason, 'invalid');
});
