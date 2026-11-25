import assert from 'node:assert/strict';
import test from 'node:test';

import { jsonCodec } from './codecs/json-codec.js';
import {
  defineCache,
  makeCacheKey,
  type CacheDefinition,
  type CacheEntry,
  type CacheStore,
  type CacheTelemetry,
} from './core/index.js';
import { createFakeStore } from './core/test-stores.js';
import { CacheOverloadError } from './resilience/single-flight.js';
import { bindCache } from './strategies/index.js';

type Payload = string;

type TelemetryEvent = Parameters<CacheTelemetry>[0];

function validPolicy(overrides: Record<string, number> = {}) {
  return {
    ttlMs: 60_000,
    maxEntryBytes: 4096,
    jitterRatio: 0,
    maxActiveKeys: 128,
    maxWaitersPerKey: 8,
    originConcurrency: 4,
    originQueueLimit: 32,
    originQueueTimeoutMs: 5_000,
    ...overrides,
  } as const;
}

function telemetryDefinition(
  overrides: Partial<CacheDefinition<Payload>> = {},
): CacheDefinition<Payload> {
  return defineCache({
    namespace: 'story',
    version: 1,
    consistency: 'versioned',
    codec: jsonCodec((v: unknown) => v as Payload),
    policy: validPolicy(),
    ...overrides,
  });
}

function collectTelemetry(): {
  events: TelemetryEvent[];
  sink: CacheTelemetry;
} {
  const events: TelemetryEvent[] = [];
  return {
    events,
    sink: (event) => {
      events.push({ ...event });
    },
  };
}

function assertBounded(event: TelemetryEvent): void {
  assert.equal(event.namespace, 'story');
  assert.ok(!('key' in event));
  assert.ok(!('identity' in event));
  assert.ok(!('value' in event));
}

function hasEvent(
  events: TelemetryEvent[],
  partial: Omit<TelemetryEvent, 'namespace'> & { namespace?: string },
): TelemetryEvent | undefined {
  return events.find(
    (event) =>
      event.tier === partial.tier &&
      event.operation === partial.operation &&
      event.outcome === partial.outcome,
  );
}

const env = 'dev';

async function seedHit(
  store: CacheStore,
  identity: string[],
  value: Payload,
  now: number,
): Promise<void> {
  const key = makeCacheKey(env, 'story', 1, identity);
  const bytes = jsonCodec((v: unknown) => v as Payload).encode(value);
  const entry: CacheEntry = {
    bytes,
    expiresAtMs: now + 60_000,
    observedAtMs: now,
  };
  const wrote = await store.set(key, entry);
  assert.equal(wrote.kind, 'stored');
}

test('telemetry: store hit emits l2 get hit', async () => {
  const now = 10_000;
  const store = createFakeStore(() => now);
  const { events, sink } = collectTelemetry();
  const bound = bindCache(telemetryDefinition(), {
    store,
    environment: env,
    clock: () => now,
    telemetry: sink,
  });

  await seedHit(store, ['hit'], 'cached', now);
  const value = await bound.getOrLoad(['hit'], async () => ({
    value: 'never',
    identity: ['hit'],
    observedAtMs: now,
  }));

  assert.equal(value, 'cached');
  const hit = hasEvent(events, {
    tier: 'l2',
    operation: 'get',
    outcome: 'hit',
  });
  assert.ok(hit);
  assertBounded(hit!);
  assert.equal(
    hasEvent(events, { tier: 'origin', operation: 'load', outcome: 'ok' }),
    undefined,
  );
});

test('telemetry: store miss emits l2 get miss before origin load', async () => {
  const now = 20_000;
  const store = createFakeStore(() => now);
  const { events, sink } = collectTelemetry();
  const bound = bindCache(telemetryDefinition(), {
    store,
    environment: env,
    clock: () => now,
    telemetry: sink,
  });

  const value = await bound.getOrLoad(['miss'], async () => ({
    value: 'loaded',
    identity: ['miss'],
    observedAtMs: now,
  }));

  assert.equal(value, 'loaded');
  assert.ok(
    hasEvent(events, { tier: 'l2', operation: 'get', outcome: 'miss' }),
  );
  const loadOk = hasEvent(events, {
    tier: 'origin',
    operation: 'load',
    outcome: 'ok',
  });
  assert.ok(loadOk);
  assert.ok(typeof loadOk!.durationMs === 'number' && loadOk!.durationMs >= 0);
});

test('telemetry: bypass paths emit l2 get bypass', async () => {
  const now = 30_000;

  const { events: throwEvents, sink: throwSink } = collectTelemetry();
  const throwBound = bindCache(telemetryDefinition(), {
    store: {
      async get() {
        throw new Error('store down');
      },
      async set() {
        return { kind: 'stored' as const };
      },
    },
    environment: env,
    clock: () => now,
    telemetry: throwSink,
  });
  const fromThrow = await throwBound.getOrLoad(['b1'], async () => ({
    value: 'ok',
    identity: ['b1'],
    observedAtMs: now,
  }));
  assert.equal(fromThrow, 'ok');
  assert.ok(
    hasEvent(throwEvents, { tier: 'l2', operation: 'get', outcome: 'bypass' }),
  );

  const inner = createFakeStore(() => now);
  const key = makeCacheKey(env, 'story', 1, ['b2']);
  await inner.set(key, {
    bytes: new TextEncoder().encode('{not-json'),
    expiresAtMs: now + 60_000,
    observedAtMs: now,
  });
  const { events: decodeEvents, sink: decodeSink } = collectTelemetry();
  const decodeBound = bindCache(telemetryDefinition(), {
    store: inner,
    environment: env,
    clock: () => now,
    telemetry: decodeSink,
  });
  const fromDecode = await decodeBound.getOrLoad(['b2'], async () => ({
    value: 'recovered',
    identity: ['b2'],
    observedAtMs: now,
  }));
  assert.equal(fromDecode, 'recovered');
  assert.ok(
    hasEvent(decodeEvents, { tier: 'l2', operation: 'get', outcome: 'bypass' }),
  );
});

test('telemetry: coalesced waiter emits runtime coalesce coalesced', async () => {
  const now = 40_000;
  const store = createFakeStore(() => now);
  const { events, sink } = collectTelemetry();
  const bound = bindCache(telemetryDefinition(), {
    store,
    environment: env,
    clock: () => now,
    telemetry: sink,
  });

  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  const leader = bound.getOrLoad(['coal'], async () => {
    await gate;
    return { value: 'shared', identity: ['coal'], observedAtMs: now };
  });
  const waiter = bound.getOrLoad(['coal'], async () => ({
    value: 'ignored',
    identity: ['coal'],
    observedAtMs: now,
  }));
  await Promise.resolve();
  release();
  const [leaderValue, waiterValue] = await Promise.all([leader, waiter]);
  assert.equal(leaderValue, 'shared');
  assert.equal(waiterValue, 'shared');

  const coalesced = events.filter(
    (event) =>
      event.tier === 'runtime' &&
      event.operation === 'coalesce' &&
      event.outcome === 'coalesced',
  );
  assert.equal(coalesced.length, 1);
  assertBounded(coalesced[0]!);
});

test('telemetry: origin bulkhead overload emits origin load overload', async () => {
  const now = 50_000;
  const store = createFakeStore(() => now);
  const { events, sink } = collectTelemetry();
  const definition = telemetryDefinition({
    policy: validPolicy({ originConcurrency: 1, originQueueLimit: 1 }),
  });
  const bound = bindCache(definition, {
    store,
    environment: env,
    clock: () => now,
    telemetry: sink,
  });

  let unblock!: () => void;
  const hold = new Promise<void>((resolve) => {
    unblock = resolve;
  });

  const first = bound.getOrLoad(['hold'], async () => {
    await hold;
    return { value: 'one', identity: ['hold'], observedAtMs: now };
  });
  const queued = bound.getOrLoad(['queued'], async () => ({
    value: 'queued',
    identity: ['queued'],
    observedAtMs: now,
  }));
  await Promise.resolve();

  await assert.rejects(
    bound.getOrLoad(['overload'], async () => ({
      value: 'two',
      identity: ['overload'],
      observedAtMs: now,
    })),
    CacheOverloadError,
  );

  unblock();
  await Promise.all([first, queued]);

  assert.ok(
    hasEvent(events, {
      tier: 'origin',
      operation: 'load',
      outcome: 'overload',
    }),
  );
  const runtimeOverload = events.filter(
    (event) =>
      event.tier === 'runtime' &&
      event.operation === 'coalesce' &&
      event.outcome === 'overload',
  );
  assert.equal(runtimeOverload.length, 0);
});

test('telemetry: single-flight waiter overload emits runtime coalesce overload', async () => {
  const now = 55_000;
  const store = createFakeStore(() => now);
  const { events, sink } = collectTelemetry();
  const definition = telemetryDefinition({
    policy: validPolicy({ maxWaitersPerKey: 1 }),
  });
  const bound = bindCache(definition, {
    store,
    environment: env,
    clock: () => now,
    telemetry: sink,
  });

  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  const leader = bound.getOrLoad(['wait'], async () => {
    await gate;
    return { value: 'leader', identity: ['wait'], observedAtMs: now };
  });
  const waiterOne = bound.getOrLoad(['wait'], async () => ({
    value: 'w1',
    identity: ['wait'],
    observedAtMs: now,
  }));
  await Promise.resolve();

  await assert.rejects(
    bound.getOrLoad(['wait'], async () => ({
      value: 'w2',
      identity: ['wait'],
      observedAtMs: now,
    })),
    CacheOverloadError,
  );

  release();
  await Promise.all([leader, waiterOne]);

  assert.ok(
    hasEvent(events, {
      tier: 'runtime',
      operation: 'coalesce',
      outcome: 'overload',
    }),
  );
});

test('telemetry: failed origin load emits origin load error with duration', async () => {
  const now = 60_000;
  const store = createFakeStore(() => now);
  const { events, sink } = collectTelemetry();
  const bound = bindCache(telemetryDefinition(), {
    store,
    environment: env,
    clock: () => now,
    telemetry: sink,
  });
  const failure = new Error('origin down');

  await assert.rejects(
    bound.getOrLoad(['err'], async () => {
      throw failure;
    }),
    failure,
  );

  const loadError = hasEvent(events, {
    tier: 'origin',
    operation: 'load',
    outcome: 'error',
  });
  assert.ok(loadError);
  assert.ok(typeof loadError!.durationMs === 'number');
});

test('telemetry: throwing sink does not change returned value', async () => {
  const now = 70_000;
  const store = createFakeStore(() => now);
  await seedHit(store, ['safe'], 'still-good', now);

  const bound = bindCache(telemetryDefinition(), {
    store,
    environment: env,
    clock: () => now,
    telemetry: () => {
      throw new Error('telemetry sink failed');
    },
  });

  const value = await bound.getOrLoad(['safe'], async () => ({
    value: 'unused',
    identity: ['safe'],
    observedAtMs: now,
  }));
  assert.equal(value, 'still-good');
});
