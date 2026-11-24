import assert from 'node:assert/strict';
import test from 'node:test';

import { jsonCodec } from './codecs/json-codec.js';
import {
  defineCache,
  makeCacheKey,
  type CacheDefinition,
  type CacheEntry,
  type CacheStore,
} from './core/index.js';
import { createFakeStore } from './core/test-stores.js';
import { bindCache } from './strategies/index.js';

type Payload = string | null;

function validPolicy(overrides: Record<string, number> = {}) {
  return {
    ttlMs: 60_000,
    maxEntryBytes: 4096,
    jitterRatio: 0.1,
    maxActiveKeys: 128,
    maxWaitersPerKey: 8,
    originConcurrency: 4,
    originQueueLimit: 32,
    originQueueTimeoutMs: 5_000,
    ...overrides,
  } as const;
}

function versionedDefinition(
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

const env = 'dev';

function wrapStore(
  inner: CacheStore,
  hooks: {
    onSet?: (key: string) => void;
    get?: (key: string) => Promise<ReturnType<CacheStore['get']>>;
  } = {},
): CacheStore {
  return {
    async get(key) {
      if (hooks.get) {
        return hooks.get(key);
      }
      return inner.get(key);
    },
    async set(key, entry) {
      hooks.onSet?.(key);
      return inner.set(key, entry);
    },
  };
}

async function storedEntry(
  store: CacheStore,
  key: string,
): Promise<CacheEntry | undefined> {
  const lookup = await store.get(key);
  if (lookup.kind === 'hit') {
    return lookup.entry;
  }
  return undefined;
}

test('revision race: observed identity controls population key', async () => {
  let now = 1_000;
  const inner = createFakeStore(() => now);
  const setKeys: string[] = [];
  const store = wrapStore(inner, {
    onSet: (key) => setKeys.push(key),
  });
  const bound = bindCache(versionedDefinition(), {
    store,
    environment: env,
    clock: () => now,
  });
  let loads = 0;

  const value = await bound.getOrLoad(['a'], async () => {
    loads += 1;
    return { value: 'fresh', identity: ['b'], observedAtMs: now };
  });

  assert.equal(value, 'fresh');
  assert.equal(loads, 1);
  assert.equal(setKeys.length, 1);
  const expectedB = makeCacheKey(env, 'story', 1, ['b']);
  assert.equal(setKeys[0], expectedB);
  assert.notEqual(
    setKeys[0],
    makeCacheKey(env, 'story', 1, ['a']),
  );

  const hitB = await bound.getOrLoad(['b'], async () => {
    loads += 1;
    return { value: 'never', identity: ['b'], observedAtMs: now };
  });
  assert.equal(hitB, 'fresh');
  assert.equal(loads, 1);

  await bound.getOrLoad(['a'], async () => {
    loads += 1;
    return { value: 'again', identity: ['a'], observedAtMs: now };
  });
  assert.equal(loads, 2);
});

test('null value is a live hit and skips the loader on the next read', async () => {
  let now = 5_000;
  const store = createFakeStore(() => now);
  const bound = bindCache(versionedDefinition(), {
    store,
    environment: env,
    clock: () => now,
  });
  let loads = 0;

  const first = await bound.getOrLoad(['doc'], async () => {
    loads += 1;
    return { value: null, identity: ['doc'], observedAtMs: now };
  });
  assert.equal(first, null);
  assert.equal(loads, 1);

  const second = await bound.getOrLoad(['doc'], async () => {
    loads += 1;
    return { value: 'unexpected', identity: ['doc'], observedAtMs: now };
  });
  assert.equal(second, null);
  assert.equal(loads, 1);
});

test('malformed cached bytes bypass to origin without surfacing decode errors', async () => {
  let now = 10_000;
  const inner = createFakeStore(() => now);
  const key = makeCacheKey(env, 'story', 1, ['x']);
  await inner.set(key, {
    bytes: new TextEncoder().encode('{not-json'),
    expiresAtMs: now + 60_000,
    observedAtMs: now,
  });

  const bound = bindCache(versionedDefinition(), {
    store: inner,
    environment: env,
    clock: () => now,
  });
  let loads = 0;

  const value = await bound.getOrLoad(['x'], async () => {
    loads += 1;
    return { value: 'repaired', identity: ['x'], observedAtMs: now };
  });

  assert.equal(value, 'repaired');
  assert.equal(loads, 1);
});

test('stale observation at write time skips store population', async () => {
  let now = 100_000;
  const inner = createFakeStore(() => now);
  const setKeys: string[] = [];
  const store = wrapStore(inner, { onSet: (k) => setKeys.push(k) });
  const bound = bindCache(
    versionedDefinition({ policy: validPolicy({ jitterRatio: 0, ttlMs: 1000 }) }),
    { store, environment: env, clock: () => now, random: () => 0 },
  );

  await bound.getOrLoad(['stale'], async () => ({
    value: 'v',
    identity: ['stale'],
    observedAtMs: now - 5_000,
  }));

  assert.equal(setKeys.length, 0);
});

test('refresh ordering: expired entries reload; live hits do not', async () => {
  let now = 0;
  const inner = createFakeStore(() => now);
  const bound = bindCache(
    versionedDefinition({
      policy: validPolicy({ jitterRatio: 0, ttlMs: 1_000 }),
    }),
    { store: inner, environment: env, clock: () => now, random: () => 0 },
  );
  let loads = 0;

  const first = await bound.getOrLoad(['k'], async () => {
    loads += 1;
    return { value: 'one', identity: ['k'], observedAtMs: now };
  });
  assert.equal(first, 'one');
  assert.equal(loads, 1);

  now += 500;
  const hit = await bound.getOrLoad(['k'], async () => {
    loads += 1;
    return { value: 'nope', identity: ['k'], observedAtMs: now };
  });
  assert.equal(hit, 'one');
  assert.equal(loads, 1);

  now += 600;
  const second = await bound.getOrLoad(['k'], async () => {
    loads += 1;
    return { value: 'two', identity: ['k'], observedAtMs: now };
  });
  assert.equal(second, 'two');
  assert.equal(loads, 2);

  now += 100;
  const stillHit = await bound.getOrLoad(['k'], async () => {
    loads += 1;
    return { value: 'nope', identity: ['k'], observedAtMs: now };
  });
  assert.equal(stillHit, 'two');
  assert.equal(loads, 2);
});

test('expiring consistency skips store writes', async () => {
  let now = 20_000;
  const inner = createFakeStore(() => now);
  let sets = 0;
  const store = wrapStore(inner, { onSet: () => (sets += 1) });
  const definition = defineCache({
    namespace: 'story',
    version: 1,
    consistency: 'expiring',
    codec: jsonCodec((v: unknown) => v as Payload),
    policy: validPolicy(),
  });
  const bound = bindCache(definition, {
    store,
    environment: env,
    clock: () => now,
  });

  await bound.getOrLoad(['e'], async () => ({
    value: 'v',
    identity: ['e'],
    observedAtMs: now,
  }));

  assert.equal(sets, 0);
});

test('source errors propagate and leave the store empty', async () => {
  const store = createFakeStore(() => 0);
  const bound = bindCache(versionedDefinition(), {
    store,
    environment: env,
    clock: () => 0,
  });
  const failure = new Error('origin down');

  await assert.rejects(
    bound.getOrLoad(['err'], async () => {
      throw failure;
    }),
    failure,
  );

  const key = makeCacheKey(env, 'story', 1, ['err']);
  const lookup = await store.get(key);
  assert.equal(lookup.kind, 'miss');
});

test('cache get failure bypasses and still returns the loaded value', async () => {
  let now = 30_000;
  const inner = createFakeStore(() => now);
  const store = wrapStore(inner, {
    get: async () => {
      throw new Error('store unavailable');
    },
  });
  const bound = bindCache(versionedDefinition(), {
    store,
    environment: env,
    clock: () => now,
  });

  const value = await bound.getOrLoad(['g'], async () => ({
    value: 'ok',
    identity: ['g'],
    observedAtMs: now,
  }));

  assert.equal(value, 'ok');
});

test('downward jitter shortens expiry when random approaches one', async () => {
  let now = 50_000;
  const ttlMs = 10_000;
  const inner = createFakeStore(() => now);
  const definition = versionedDefinition({
    policy: validPolicy({ jitterRatio: 0.15, ttlMs }),
  });
  const key = makeCacheKey(env, 'story', 1, ['j']);

  const boundFull = bindCache(definition, {
    store: inner,
    environment: env,
    clock: () => now,
    random: () => 0,
  });
  await boundFull.getOrLoad(['j'], async () => ({
    value: 'full',
    identity: ['j'],
    observedAtMs: now,
  }));
  const fullEntry = await storedEntry(inner, key);
  assert.ok(fullEntry);
  assert.equal(fullEntry.expiresAtMs, now + ttlMs);

  now = 60_000;
  const innerShort = createFakeStore(() => now);
  const boundShort = bindCache(definition, {
    store: innerShort,
    environment: env,
    clock: () => now,
    random: () => 1,
  });
  await boundShort.getOrLoad(['j'], async () => ({
    value: 'short',
    identity: ['j'],
    observedAtMs: now,
  }));
  const shortEntry = await storedEntry(innerShort, key);
  assert.ok(shortEntry);
  const expectedShort = now + Math.max(1, Math.floor(ttlMs * (1 - 0.15)));
  assert.equal(shortEntry.expiresAtMs, expectedShort);
  assert.ok(shortEntry.expiresAtMs < now + ttlMs);
});