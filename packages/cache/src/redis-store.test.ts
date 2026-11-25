import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRedisStore,
  type RedisStoreCommands,
} from './redis/redis-store.js';
import { createRedisCircuitBreaker } from './redis/redis-circuit-breaker.js';
import {
  createRedisConnection,
  type RedisClientFactory,
  type RedisLifecycleClient,
} from './redis/redis-connection.js';

type StoreHarness = Readonly<{
  store: ReturnType<typeof createRedisStore>;
  commands: FakeCommands;
  connection: ReturnType<typeof createRedisConnection>;
  breaker: ReturnType<typeof createRedisCircuitBreaker>;
  nowMs: { value: number };
}>;

type FakeCommands = RedisStoreCommands & {
  outstanding(): number;
  setGet(handler: RedisStoreCommands['get']): void;
  setSet(handler: RedisStoreCommands['set']): void;
};

function createFakeCommands(): FakeCommands {
  let inFlight = 0;
  const handlers = {
    get: async (key: string, signal?: AbortSignal): Promise<string | null> => {
      void key;
      void signal;
      return null;
    },
    set: async (
      key: string,
      value: string,
      pxMs: number,
      signal?: AbortSignal,
    ): Promise<void> => {
      void key;
      void value;
      void pxMs;
      void signal;
    },
  };

  return {
    outstanding() {
      return inFlight;
    },
    async get(key, signal) {
      inFlight += 1;
      try {
        return await handlers.get(key, signal);
      } finally {
        inFlight -= 1;
      }
    },
    async set(key, value, pxMs, signal) {
      inFlight += 1;
      try {
        await handlers.set(key, value, pxMs, signal);
      } finally {
        inFlight -= 1;
      }
    },
    setGet(handler: typeof handlers.get) {
      handlers.get = handler;
    },
    setSet(handler: typeof handlers.set) {
      handlers.set = handler;
    },
  };
}

function createLifecycleClient(): RedisLifecycleClient {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  return {
    get isOpen() {
      return true;
    },
    get isReady() {
      return true;
    },
    async connect() {
      listeners.get('ready')?.forEach((fn) => fn());
    },
    async close() {},
    on(event, listener) {
      let bucket = listeners.get(event);
      if (!bucket) {
        bucket = new Set();
        listeners.set(event, bucket);
      }
      bucket.add(listener);
    },
  };
}

async function readyHarness(
  options: {
    maxOutstandingCommands?: number;
    operationTimeoutMs?: number;
    clockStart?: number;
  } = {},
): Promise<StoreHarnessWithReady> {
  const harness = createHarness(options);
  await harness.ready();
  return harness;
}

function createHarness(
  options: {
    maxOutstandingCommands?: number;
    operationTimeoutMs?: number;
    clockStart?: number;
  } = {},
): StoreHarnessWithReady {
  const nowMs = { value: options.clockStart ?? 1_000 };
  const commands = createFakeCommands();
  const breaker = createRedisCircuitBreaker({
    now: () => nowMs.value,
  });
  const clientFactory: RedisClientFactory = () => createLifecycleClient();
  const connection = createRedisConnection(
    {
      REDIS_URL: 'redis://127.0.0.1:6379',
    },
    { clientFactory },
  );

  const store = createRedisStore({
    connection,
    clock: () => nowMs.value,
    commands,
    breaker,
    ...(options.maxOutstandingCommands !== undefined
      ? { maxOutstandingCommands: options.maxOutstandingCommands }
      : {}),
    ...(options.operationTimeoutMs !== undefined
      ? { operationTimeoutMs: options.operationTimeoutMs }
      : {}),
  });

  return {
    store,
    commands,
    connection,
    breaker,
    nowMs,
    async ready() {
      await connection.start();
      assert.equal(connection.admitsTraffic(), true);
    },
  };
}

type StoreHarnessWithReady = StoreHarness & { ready(): Promise<void> };

function readOutstanding(store: ReturnType<typeof createRedisStore>): number {
  const probe = store as ReturnType<typeof createRedisStore> & {
    __outstanding?: () => number;
  };
  return probe.__outstanding?.() ?? -1;
}

test('refusal when connection does not admit traffic', async () => {
  const commands = createFakeCommands();
  const connection = createRedisConnection({});
  await connection.start();
  const store = createRedisStore({
    connection,
    clock: () => 1_000,
    commands,
  });

  const lookup = await store.get('k');
  assert.equal(lookup.kind, 'bypass');
  assert.equal(lookup.reason, 'unavailable');
});

test('slow outstanding command retains admission slot until it settles', async () => {
  const harness = await readyHarness({
    operationTimeoutMs: 500,
    maxOutstandingCommands: 2,
  });
  const blockers: Array<() => void> = [];
  harness.commands.setGet(
    () =>
      new Promise<string | null>((resolve) => {
        blockers.push(() => resolve(null));
      }),
  );

  const first = harness.store.get('slow-key');
  const second = harness.store.get('other-key');
  await Promise.resolve();
  assert.equal(readOutstanding(harness.store), 2);

  const saturated = await harness.store.get('saturated');
  assert.equal(saturated.kind, 'bypass');
  assert.equal(saturated.reason, 'saturated');

  for (const release of blockers) {
    release();
  }
  await first;
  await second;
  await Promise.resolve();
  assert.equal(readOutstanding(harness.store), 0);
});

test('timeout returns bypass timeout and counts as breaker failure', async () => {
  const harness = await readyHarness({ operationTimeoutMs: 25 });
  harness.commands.setGet(
    () =>
      new Promise<string | null>((resolve) => {
        setTimeout(() => resolve(null), 200);
      }),
  );

  const lookup = await harness.store.get('timeout-key');
  assert.equal(lookup.kind, 'bypass');
  assert.equal(lookup.reason, 'timeout');
  assert.equal(harness.breaker.snapshot().consecutiveConnectivityFailures, 1);

  await new Promise<void>((resolve) => setTimeout(resolve, 250));
  assert.equal(readOutstanding(harness.store), 0);
});

test('malformed envelope bypasses invalid without breaker connectivity failure', async () => {
  const harness = await readyHarness();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    harness.commands.setGet(
      () =>
        new Promise<string | null>((_, reject) => {
          setTimeout(() => reject(new Error('connectivity')), 1);
        }),
    );
    await harness.store.get(`fail-${attempt}`);
  }
  assert.equal(harness.breaker.snapshot().consecutiveConnectivityFailures, 4);

  harness.commands.setGet(async () => 'not-json-envelope');
  const lookup = await harness.store.get('malformed');
  assert.equal(lookup.kind, 'bypass');
  assert.equal(lookup.reason, 'invalid');
  assert.equal(harness.breaker.snapshot().consecutiveConnectivityFailures, 0);
  assert.equal(harness.breaker.snapshot().state, 'closed');
});

test('stored envelope round-trip copies bytes and uses remaining PX', async () => {
  const harness = await readyHarness({ clockStart: 5_000 });
  const recorded: { pxMs?: number; wire?: string } = {};

  harness.commands.setSet(async (_key, value, pxMs) => {
    recorded.pxMs = pxMs;
    recorded.wire = value;
  });
  harness.commands.setGet(async () => recorded.wire ?? null);

  const bytes = new Uint8Array([9, 8, 7]);
  const originalBuffer = bytes.buffer;
  const entry = { bytes, observedAtMs: 4_000, expiresAtMs: 9_000 };

  const write = await harness.store.set('canonical-key', entry);
  assert.equal(write.kind, 'stored');
  assert.equal(recorded.pxMs, 4_000);

  const lookup = await harness.store.get('canonical-key');
  assert.equal(lookup.kind, 'hit');
  if (lookup.kind === 'hit') {
    assert.notEqual(lookup.entry.bytes.buffer, originalBuffer);
    assert.deepEqual([...lookup.entry.bytes], [9, 8, 7]);
  }
});

test('half-open admits one probe after cooldown; success closes breaker', async () => {
  const harness = await readyHarness({ operationTimeoutMs: 25 });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    harness.commands.setGet(
      () =>
        new Promise<string | null>((_, reject) => {
          setTimeout(() => reject(new Error('down')), 1);
        }),
    );
    const result = await harness.store.get(`break-${attempt}`);
    assert.equal(result.kind, 'bypass');
  }
  assert.equal(harness.breaker.snapshot().state, 'open');

  const blocked = await harness.store.get('still-open');
  assert.equal(blocked.kind, 'bypass');
  assert.equal(blocked.reason, 'circuit-open');

  harness.nowMs.value += 5_000;
  harness.commands.setGet(async () => null);
  const probe = await harness.store.get('probe-success');
  assert.equal(probe.kind, 'miss');
  assert.equal(harness.breaker.snapshot().state, 'closed');
  assert.equal(harness.breaker.snapshot().consecutiveConnectivityFailures, 0);
});

test('half-open allows exactly one probe while probe is in flight', async () => {
  const harness = await readyHarness({ operationTimeoutMs: 500 });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    harness.commands.setGet(() => Promise.reject(new Error('down')));
    await harness.store.get(`trip-${attempt}`);
  }
  harness.nowMs.value += 5_000;

  let releaseProbe: (() => void) | undefined;
  const probeDone = new Promise<void>((resolve) => {
    releaseProbe = resolve;
  });
  harness.commands.setGet(async () => {
    await probeDone;
    return null;
  });

  const probe = harness.store.get('probe');
  await Promise.resolve();
  const competing = await harness.store.get('competing');
  assert.equal(competing.kind, 'bypass');
  assert.equal(competing.reason, 'circuit-open');

  releaseProbe?.();
  const probeResult = await probe;
  assert.equal(probeResult.kind, 'miss');
});

test('half-open probe failure reopens breaker', async () => {
  const harness = await readyHarness({ operationTimeoutMs: 25 });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    harness.commands.setGet(() => Promise.reject(new Error('down')));
    await harness.store.get(`fail-${attempt}`);
  }
  harness.nowMs.value += 5_000;
  harness.commands.setGet(() => Promise.reject(new Error('down')));
  const probe = await harness.store.get('probe-fail');
  assert.equal(probe.kind, 'bypass');
  assert.equal(harness.breaker.snapshot().state, 'open');

  const stillBlocked = await harness.store.get('blocked');
  assert.equal(stillBlocked.kind, 'bypass');
  assert.equal(stillBlocked.reason, 'circuit-open');
});

test('shutdown stops admitting new work while in-flight settles', async () => {
  const harness = await readyHarness({ operationTimeoutMs: 500 });
  let release: (() => void) | undefined;
  const done = new Promise<void>((resolve) => {
    release = resolve;
  });
  harness.commands.setGet(async () => {
    await done;
    return null;
  });

  const inFlight = harness.store.get('in-flight');
  await Promise.resolve();
  assert.equal(readOutstanding(harness.store), 1);

  await harness.connection.close();
  const refused = await harness.store.get('after-close');
  assert.equal(refused.kind, 'bypass');
  assert.equal(refused.reason, 'unavailable');

  release?.();
  await inFlight;
  assert.equal(readOutstanding(harness.store), 0);
});
