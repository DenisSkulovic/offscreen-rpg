import assert from 'node:assert/strict';
import test from 'node:test';

import type { CacheEntry } from './core/cache-store.js';
import {
  buildCacheAdapterFromConnection,
  createCacheAdapter,
  type CacheAdapterRedisCommands,
} from './index.js';
import {
  createLazyRedisLifecycleClient,
  createRedisConnection,
  type RedisClientFactory,
  type RedisLifecycleClient,
} from './redis/redis-connection.js';
type FakeClientOptions = Readonly<{
  shouldFailConnect?: (attempt: number) => boolean;
}>;

function failConnectOnce(): (attempt: number) => boolean {
  let failed = false;
  return (_attempt) => {
    if (failed) {
      return false;
    }
    failed = true;
    return true;
  };
}

function createFakeClient(options: FakeClientOptions): RedisLifecycleClient & {
  connectAttempts: number;
  simulateEnd(): void;
} {
  let open = false;
  let ready = false;
  let connectAttempts = 0;
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  const emit = (event: string) => {
    for (const listener of listeners.get(event) ?? []) {
      listener();
    }
  };

  return {
    get connectAttempts() {
      return connectAttempts;
    },
    get isOpen() {
      return open;
    },
    get isReady() {
      return ready;
    },
    async connect() {
      connectAttempts += 1;
      if (options.shouldFailConnect?.(connectAttempts)) {
        throw new Error('FakeRedisConnectFailed');
      }
      open = true;
      ready = true;
      emit('ready');
    },
    async close() {
      open = false;
      ready = false;
      emit('end');
    },
    on(event, listener) {
      let bucket = listeners.get(event);
      if (!bucket) {
        bucket = new Set();
        listeners.set(event, bucket);
      }
      bucket.add(listener);
    },
    off(event, listener) {
      listeners.get(event)?.delete(listener);
    },
    simulateEnd() {
      open = false;
      ready = false;
      emit('end');
    },
  };
}

function createInMemoryCommands(
  storage: Map<string, string>,
): CacheAdapterRedisCommands {
  return {
    async get(key) {
      return storage.get(key) ?? null;
    },
    async set(key, value) {
      storage.set(key, value);
      return 'OK';
    },
  };
}

function createHarnessFactory(options: FakeClientOptions): Readonly<{
  factory: RedisClientFactory;
  getCommands: () => CacheAdapterRedisCommands | null;
  storage: Map<string, string>;
  holder: { current: ReturnType<typeof createFakeClient> | null };
}> {
  const storage = new Map<string, string>();
  let commands: CacheAdapterRedisCommands | null = null;
  const holder: { current: ReturnType<typeof createFakeClient> | null } = {
    current: null,
  };
  const factory: RedisClientFactory = (settings) => {
    void settings;
    const client = createFakeClient(options);
    holder.current = client;
    commands = createInMemoryCommands(storage);
    return client;
  };
  return {
    factory,
    getCommands: () => commands,
    storage,
    holder,
  };
}

type TimerJob = Readonly<{ delayMs: number; run: () => void; id: number }>;

function createControllableTimers() {
  const jobs: TimerJob[] = [];
  let nextId = 0;
  return {
    setTimer(fn: () => void, delayMs: number) {
      const id = nextId;
      nextId += 1;
      jobs.push({ delayMs, run: fn, id });
      return id as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimer(handle: ReturnType<typeof setTimeout>) {
      const timerId = handle as unknown as number;
      const index = jobs.findIndex((job) => job.id === timerId);
      if (index >= 0) {
        jobs.splice(index, 1);
      }
    },
    async runAll() {
      jobs.sort((left, right) => left.delayMs - right.delayMs);
      while (jobs.length > 0) {
        const next = jobs.shift();
        next?.run();
        await Promise.resolve();
      }
    },
  };
}

const configuredEnv = {
  REDIS_URL: 'redis://127.0.0.1:6379',
  REDIS_CONNECT_TIMEOUT_MS: '100',
  REDIS_OPERATION_TIMEOUT_MS: '100',
} as const;

test('unconfigured adapter stays disabled with bypassing store', async () => {
  const adapter = await createCacheAdapter({}, () =>
    assert.fail('incident must not fire'),
  );
  assert.equal(adapter.enabled, false);
  assert.equal(await adapter.cache.get('k'), null);
  const lookup = await adapter.store.get('k');
  assert.deepEqual(lookup, { kind: 'bypass', reason: 'disabled' });
  await adapter.close();
});

test('invalid configuration rejects explicitly', async () => {
  await assert.rejects(
    async () =>
      createCacheAdapter({
        REDIS_URL: 'redis://127.0.0.1:6379',
        REDIS_KEY_PREFIX: 'INVALID PREFIX',
      }),
    /REDIS_KEY_PREFIX/,
  );
});

test('throwing incident sink does not reject adapter operations', async () => {
  const harness = createHarnessFactory({
    shouldFailConnect: () => true,
  });
  const adapter = await createCacheAdapter(
    configuredEnv,
    () => {
      throw new Error('IncidentSinkThrows');
    },
    {
      clientFactory: harness.factory,
      getCommands: harness.getCommands,
    },
  );
  assert.equal(adapter.enabled, false);
  await assert.doesNotReject(async () => {
    assert.equal(await adapter.cache.get('miss'), null);
    await adapter.cache.set('k', { a: 1 }, { ttlSeconds: 10, maxBytes: 1000 });
    const lookup = await adapter.store.get('k');
    assert.deepEqual(lookup, { kind: 'bypass', reason: 'unavailable' });
    await adapter.close();
  });
});

test('configured but not ready: startup disabled legacy noop, store bypasses', async () => {
  const harness = createHarnessFactory({
    shouldFailConnect: () => true,
  });
  const adapter = await createCacheAdapter(configuredEnv, undefined, {
    clientFactory: harness.factory,
    getCommands: harness.getCommands,
  });
  assert.equal(adapter.enabled, false);
  assert.equal(await adapter.cache.get('k'), null);
  await adapter.cache.set(
    'k',
    { ok: true },
    { ttlSeconds: 60, maxBytes: 4096 },
  );
  assert.equal(harness.storage.size, 0);
  const lookup = await adapter.store.get('byte-key');
  assert.deepEqual(lookup, { kind: 'bypass', reason: 'unavailable' });
  const write = await adapter.store.set('byte-key', sampleEntry());
  assert.deepEqual(write, { kind: 'bypass', reason: 'unavailable' });
  await adapter.close();
});

test('ready adapter enables legacy JSON wire with qualified prefix keys', async () => {
  const harness = createHarnessFactory({});
  const adapter = await createCacheAdapter(configuredEnv, undefined, {
    clientFactory: harness.factory,
    getCommands: harness.getCommands,
  });
  assert.equal(adapter.enabled, true);
  await adapter.cache.set(
    'session',
    { player: 'nerevar' },
    {
      ttlSeconds: 120,
      maxBytes: 4096,
    },
  );
  assert.equal(
    harness.storage.get('offscreen:session'),
    JSON.stringify({ player: 'nerevar' }),
  );
  const value = await adapter.cache.get('session');
  assert.deepEqual(value, { player: 'nerevar' });
  await adapter.close();
});

test('store follows live readiness while enabled stays at startup snapshot', async () => {
  const timers = createControllableTimers();
  const harness = createHarnessFactory({
    shouldFailConnect: failConnectOnce(),
  });
  const connection = createRedisConnection(configuredEnv, {
    clientFactory: harness.factory,
    random: () => 0,
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
  });
  await connection.start();
  assert.equal(connection.admitsTraffic(), false);

  const adapter = buildCacheAdapterFromConnection({
    connection,
    getCommands: harness.getCommands,
    startupReady: false,
  });
  assert.equal(adapter.enabled, false);
  assert.deepEqual(await adapter.store.get('k'), {
    kind: 'bypass',
    reason: 'unavailable',
  });

  await timers.runAll();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(connection.admitsTraffic(), true);
  assert.equal(adapter.enabled, false);

  const key = 'v1:canonical';
  const nowMs = Date.now();
  const entry: CacheEntry = {
    bytes: new Uint8Array([1, 2, 3]),
    observedAtMs: nowMs,
    expiresAtMs: nowMs + 60_000,
  };
  const write = await adapter.store.set(key, entry);
  assert.deepEqual(write, { kind: 'stored' });

  await adapter.close();
});

test('lazy default-style factory clears captured commands on terminal close', async () => {
  const storage = new Map<string, string>();
  let commands: CacheAdapterRedisCommands | null = null;
  const factory: RedisClientFactory = (settings) =>
    createLazyRedisLifecycleClient(settings, {
      createSdkClient: async () => {
        const backing = createInMemoryCommands(storage);
        return {
          isOpen: false,
          isReady: true,
          on() {},
          off() {},
          async connect() {},
          async close() {},
          get: backing.get.bind(backing),
          set: backing.set.bind(backing),
        } as never;
      },
      onSdkCreated(client) {
        const active = client as never as CacheAdapterRedisCommands;
        commands = {
          get: (key) => active.get(key),
          set: (key, value, options) => active.set(key, value, options),
        };
      },
      onSdkClosed() {
        commands = null;
      },
    });

  const adapter = await createCacheAdapter(configuredEnv, undefined, {
    clientFactory: factory,
    getCommands: () => commands,
  });
  assert.equal(adapter.enabled, true);
  assert.notEqual(commands, null);
  await adapter.close();
  assert.equal(commands, null);
});

test('disconnect during live use obtains a fresh client generation on reconnect', async () => {
  const timers = createControllableTimers();
  const harness = createHarnessFactory({});
  const connection = createRedisConnection(configuredEnv, {
    clientFactory: harness.factory,
    random: () => 0,
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
  });

  await connection.start();
  const clientBefore = harness.holder.current;

  harness.holder.current?.simulateEnd();
  assert.equal(connection.admitsTraffic(), false);

  await timers.runAll();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(connection.admitsTraffic(), true);
  assert.notEqual(harness.holder.current, clientBefore);
  await connection.close();
});

function sampleEntry(): CacheEntry {
  const nowMs = Date.now();
  return {
    bytes: new Uint8Array([9]),
    observedAtMs: nowMs,
    expiresAtMs: nowMs + 30_000,
  };
}
