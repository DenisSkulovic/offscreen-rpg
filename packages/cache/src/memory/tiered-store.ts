import {
  isCacheEntryLive,
  type CacheEntry,
  type CacheClock,
  type CacheLookup,
  type CacheStore,
  type CacheWriteResult,
} from '../core/cache-store.js';

function copyCacheEntry(entry: CacheEntry): CacheEntry {
  return {
    bytes: new Uint8Array(entry.bytes),
    expiresAtMs: entry.expiresAtMs,
    observedAtMs: entry.observedAtMs,
  };
}

async function safeGet(
  store: CacheStore,
  key: string,
): Promise<{ ok: true; lookup: CacheLookup } | { ok: false }> {
  try {
    const lookup = await store.get(key);
    return { ok: true, lookup };
  } catch {
    return { ok: false };
  }
}

async function safeSet(
  store: CacheStore,
  key: string,
  entry: CacheEntry,
): Promise<{ ok: true; result: CacheWriteResult } | { ok: false }> {
  try {
    const result = await store.set(key, entry);
    return { ok: true, result };
  } catch {
    return { ok: false };
  }
}

export function createTieredStore(options: {
  l1: CacheStore;
  l2: CacheStore;
  clock?: () => number;
}): CacheStore {
  const clock: CacheClock = options.clock ?? (() => Date.now());
  const { l1, l2 } = options;

  return {
    async get(key: string): Promise<CacheLookup> {
      const nowMs = clock();
      const l1Attempt = await safeGet(l1, key);

      if (l1Attempt.ok && l1Attempt.lookup.kind === 'hit') {
        return l1Attempt.lookup;
      }

      const l2Attempt = await safeGet(l2, key);

      if (!l1Attempt.ok && !l2Attempt.ok) {
        return { kind: 'bypass', reason: 'unavailable' };
      }

      if (!l2Attempt.ok) {
        if (!l1Attempt.ok) {
          return { kind: 'bypass', reason: 'unavailable' };
        }
        if (l1Attempt.lookup.kind === 'miss') {
          return { kind: 'miss' };
        }
        if (
          l1Attempt.lookup.kind === 'bypass' &&
          l1Attempt.lookup.reason === 'expired'
        ) {
          return { kind: 'bypass', reason: 'expired' };
        }
        return l1Attempt.lookup;
      }

      const l2Lookup = l2Attempt.lookup;

      if (l2Lookup.kind === 'miss') {
        return { kind: 'miss' };
      }

      if (l2Lookup.kind === 'bypass' && l2Lookup.reason === 'expired') {
        return { kind: 'bypass', reason: 'expired' };
      }

      if (l2Lookup.kind === 'hit') {
        const entry = l2Lookup.entry;
        if (!isCacheEntryLive(entry, nowMs)) {
          return { kind: 'bypass', reason: 'expired' };
        }
        const promoted = copyCacheEntry(entry);
        await safeSet(l1, key, promoted);
        return { kind: 'hit', entry: promoted };
      }

      return l2Lookup;
    },

    async set(key: string, entry: CacheEntry): Promise<CacheWriteResult> {
      const l1Attempt = await safeSet(l1, key, entry);
      const l2Attempt = await safeSet(l2, key, entry);

      const l1Stored = l1Attempt.ok && l1Attempt.result.kind === 'stored';
      const l2Stored = l2Attempt.ok && l2Attempt.result.kind === 'stored';
      if (l1Stored || l2Stored) {
        return { kind: 'stored' };
      }
      if (l1Attempt.ok) {
        return l1Attempt.result;
      }
      if (l2Attempt.ok) {
        return l2Attempt.result;
      }
      return { kind: 'bypass', reason: 'unavailable' };
    },
  };
}
