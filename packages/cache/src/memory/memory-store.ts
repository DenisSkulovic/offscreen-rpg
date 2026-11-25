import {
  isCacheEntryLive,
  type CacheEntry,
  type CacheClock,
  type CacheStore,
} from '../core/cache-store.js';
import {
  createWeightedLruHandle,
  ENTRY_OVERHEAD_BYTES,
} from './weighted-lru.js';

function copyCacheEntry(entry: CacheEntry): CacheEntry {
  return {
    bytes: new Uint8Array(entry.bytes),
    expiresAtMs: entry.expiresAtMs,
    observedAtMs: entry.observedAtMs,
  };
}

function isExpiredForWrite(entry: CacheEntry, nowMs: number): boolean {
  return !isCacheEntryLive(entry, nowMs);
}

export function createMemoryStore(options: {
  maxBytes: number;
  maxEntries: number;
  clock?: () => number;
}): CacheStore {
  const clock: CacheClock = options.clock ?? (() => Date.now());
  const lru = createWeightedLruHandle<CacheEntry>({
    maxBytes: options.maxBytes,
    maxEntries: options.maxEntries,
    weight: (entry) => entry.bytes.length,
    copy: copyCacheEntry,
  });

  const purgeExpired = (nowMs: number): void => {
    const toDelete: string[] = [];
    lru.forEach((entry, key) => {
      if (!isCacheEntryLive(entry, nowMs)) {
        toDelete.push(key);
      }
    });
    for (const key of toDelete) {
      lru.delete(key);
    }
  };

  return {
    async get(key: string) {
      const nowMs = clock();
      const outcome = lru.getIf(key, (stored) =>
        isCacheEntryLive(stored, nowMs),
      );
      if (outcome.kind === 'missing') {
        return { kind: 'miss' };
      }
      if (outcome.kind === 'rejected') {
        return { kind: 'bypass', reason: 'expired' };
      }
      return { kind: 'hit', entry: outcome.value };
    },

    async set(key: string, entry: CacheEntry) {
      const nowMs = clock();
      const payloadBytes = entry.bytes.length;
      if (payloadBytes + ENTRY_OVERHEAD_BYTES > options.maxBytes) {
        return { kind: 'skipped', reason: 'oversize' };
      }
      if (isExpiredForWrite(entry, nowMs)) {
        return { kind: 'skipped', reason: 'expired' };
      }
      purgeExpired(nowMs);
      const admitted = lru.set(key, entry);
      if (!admitted) {
        return { kind: 'bypass', reason: 'saturated' };
      }
      return { kind: 'stored' };
    },
  };
}
