import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  createDisabledStore,
  createFakeStore,
  makeCacheKey,
  type CacheEntry,
  type CacheStore,
} from '@offscreen/cache/core';
import type { StorySnapshot } from '@offscreen/story-interface/stories';
import { createStorySnapshotCache } from './read-cache-options.js';
import { StoryError } from './errors.js';

const environment = 'test';

function minimalSnapshot(
  overrides: Partial<Pick<StorySnapshot, 'id' | 'viewVersion'>> = {},
): StorySnapshot {
  const storyId = overrides.id ?? randomUUID();
  const passageId = randomUUID();
  return {
    id: storyId,
    revision: 1,
    viewVersion: overrides.viewVersion ?? 1,
    lineage: null,
    canRespond: false,
    items: [],
    decision: null,
    waiting: null,
    current: {
      id: passageId,
      content: {
        version: 1,
        title: 'A quiet road',
        paragraphs: ['Ash settles on the silt strider platform.'],
      },
      interaction: null,
    },
    resolution: null,
  };
}

function snapshotIdentityComponents(
  ownerId: string,
  storyId: string,
  viewVersion: number,
): string[] {
  return [ownerId, storyId, String(viewVersion)];
}

function wrapStore(
  inner: CacheStore,
  hooks: {
    onGet?: (key: string) => void;
    get?: CacheStore['get'];
  } = {},
): CacheStore {
  return {
    async get(key) {
      hooks.onGet?.(key);
      if (hooks.get) {
        return hooks.get(key);
      }
      return inner.get(key);
    },
    async set(key, entry) {
      return inner.set(key, entry);
    },
  };
}

async function seedMalformedHit(
  store: CacheStore,
  identity: string[],
  now: number,
): Promise<string> {
  const key = makeCacheKey(environment, 'story-snapshot', 1, identity);
  const entry: CacheEntry = {
    bytes: new TextEncoder().encode('{not-a-snapshot'),
    expiresAtMs: now + 60_000,
    observedAtMs: now,
  };
  await store.set(key, entry);
  return key;
}

test('owner denial occurs before storySnapshotCache lookup', async () => {
  let cacheLookups = 0;
  const storySnapshotCache = createStorySnapshotCache(
    createFakeStore(() => 0),
    environment,
  );
  const guardedLookup = async (authorized: boolean) => {
    if (!authorized) {
      throw new StoryError('not_found');
    }
    cacheLookups += 1;
    return storySnapshotCache.getOrLoad(['owner', 'story'], async () => ({
      value: minimalSnapshot(),
      identity: ['owner', 'story'],
      observedAtMs: 0,
    }));
  };

  await assert.rejects(
    () => guardedLookup(false),
    (error: unknown) =>
      error instanceof StoryError && error.code === 'not_found',
  );
  assert.equal(cacheLookups, 0);
});

test('malformed cached bytes fall back to loader without throwing', async () => {
  const clock = () => Date.now();
  const now = clock();
  const store = createFakeStore(clock);
  const cache = createStorySnapshotCache(store, environment);
  const identity = snapshotIdentityComponents('owner', randomUUID(), 1);
  await seedMalformedHit(store, identity, now);

  let loads = 0;
  const snapshot = minimalSnapshot({ viewVersion: 1 });
  const value = await cache.getOrLoad(identity, async () => {
    loads += 1;
    return {
      value: snapshot,
      identity,
      observedAtMs: clock(),
    };
  });

  assert.deepEqual(value, snapshot);
  assert.equal(loads, 1);
});

test('store get failures bypass cache and still return loaded snapshot', async () => {
  const clock = () => Date.now();
  const inner = createFakeStore(clock);
  const store = wrapStore(inner, {
    get: async () => {
      throw new Error('store unavailable');
    },
  });
  const cache = createStorySnapshotCache(store, environment);
  const identity = snapshotIdentityComponents('owner', randomUUID(), 3);
  const snapshot = minimalSnapshot({ viewVersion: 3 });

  const value = await cache.getOrLoad(identity, async () => ({
    value: snapshot,
    identity,
    observedAtMs: clock(),
  }));

  assert.deepEqual(value, snapshot);
});

test('preflight identity mismatch forces a second origin load', async () => {
  const clock = () => Date.now();
  const store = createFakeStore(clock);
  const cache = createStorySnapshotCache(store, environment);
  const storyId = randomUUID();
  const preflight = snapshotIdentityComponents('owner', storyId, 1);
  const built = snapshotIdentityComponents('owner', storyId, 2);

  let loads = 0;
  const raced = minimalSnapshot({ id: storyId, viewVersion: 2 });
  const first = await cache.getOrLoad(preflight, async () => {
    loads += 1;
    return {
      value: raced,
      identity: built,
      observedAtMs: clock(),
    };
  });
  assert.deepEqual(first, raced);
  assert.equal(loads, 1);

  const second = await cache.getOrLoad(preflight, async () => {
    loads += 1;
    return {
      value: raced,
      identity: built,
      observedAtMs: clock(),
    };
  });
  assert.deepEqual(second, raced);
  assert.equal(loads, 2, 'stale preflight identity must not hit built cache key');

  let loadsAtBuilt = loads;
  const third = await cache.getOrLoad(built, async () => {
    loads += 1;
    return {
      value: raced,
      identity: built,
      observedAtMs: clock(),
    };
  });
  assert.deepEqual(third, raced);
  assert.equal(loads, loadsAtBuilt, 'built identity should hit the stored entry');
});

test('disabled store parity matches always loading from origin', async () => {
  const store = createDisabledStore();
  const cache = createStorySnapshotCache(store, environment);
  const identity = snapshotIdentityComponents('owner', randomUUID(), 1);
  const snapshot = minimalSnapshot();

  let loads = 0;
  const clock = () => Date.now();
  const first = await cache.getOrLoad(identity, async () => {
    loads += 1;
    return {
      value: snapshot,
      identity,
      observedAtMs: clock(),
    };
  });
  const second = await cache.getOrLoad(identity, async () => {
    loads += 1;
    return {
      value: snapshot,
      identity,
      observedAtMs: clock(),
    };
  });

  assert.deepEqual(first, snapshot);
  assert.deepEqual(second, snapshot);
  assert.equal(loads, 2);
});

test('matching identity reuses a warmed snapshot without a second load', async () => {
  const clock = () => Date.now();
  const store = createFakeStore(clock);
  const cache = createStorySnapshotCache(store, environment);
  const storyId = randomUUID();
  const identity = snapshotIdentityComponents('owner', storyId, 1);
  const snapshot = minimalSnapshot({ id: storyId, viewVersion: 1 });

  let loads = 0;
  await cache.getOrLoad(identity, async () => {
    loads += 1;
    return {
      value: snapshot,
      identity,
      observedAtMs: clock(),
    };
  });
  const warmed = await cache.getOrLoad(identity, async () => {
    loads += 1;
    return {
      value: minimalSnapshot({ id: storyId, viewVersion: 99 }),
      identity,
      observedAtMs: clock(),
    };
  });

  assert.deepEqual(warmed, snapshot);
  assert.equal(loads, 1);
});