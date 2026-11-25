import {
  classifyCacheLookup,
  type CacheClock,
  type CacheEntry,
  type CacheStore,
} from './cache-store.js';

const FAKE_STORE_MAX_ENTRY_BYTES = 1_048_576;
const FAKE_STORE_MAX_ENTRIES = 10_000;

function copyEntry(entry: CacheEntry): CacheEntry {
  return {
    bytes: new Uint8Array(entry.bytes),
    expiresAtMs: entry.expiresAtMs,
    observedAtMs: entry.observedAtMs,
  };
}

function isExpiredForWrite(entry: CacheEntry, nowMs: number): boolean {
  if (
    !Number.isSafeInteger(entry.expiresAtMs) ||
    !Number.isSafeInteger(entry.observedAtMs)
  ) {
    return true;
  }
  if (entry.observedAtMs > entry.expiresAtMs) {
    return true;
  }
  return entry.expiresAtMs <= nowMs;
}

export { createDisabledStore } from './disabled-store.js';

/**
 * Bounded in-memory {@link CacheStore} for tests: copies bytes, uses injected clock, rejects oversize/expired writes.
 */
export function createFakeStore(clock: CacheClock): CacheStore {
  const entries = new Map<string, CacheEntry>();

  return {
    async get(key: string) {
      const stored = entries.get(key);
      if (!stored) {
        return { kind: 'miss' };
      }
      const lookup = classifyCacheLookup(stored, clock());
      if (lookup.kind === 'hit') {
        return { kind: 'hit', entry: copyEntry(lookup.entry) };
      }
      return lookup;
    },

    async set(key: string, entry: CacheEntry) {
      if (entries.size >= FAKE_STORE_MAX_ENTRIES && !entries.has(key)) {
        return { kind: 'bypass', reason: 'saturated' };
      }
      if (entry.bytes.length > FAKE_STORE_MAX_ENTRY_BYTES) {
        return { kind: 'skipped', reason: 'oversize' };
      }
      if (isExpiredForWrite(entry, clock())) {
        return { kind: 'skipped', reason: 'expired' };
      }
      entries.set(key, copyEntry(entry));
      return { kind: 'stored' };
    },
  };
}
