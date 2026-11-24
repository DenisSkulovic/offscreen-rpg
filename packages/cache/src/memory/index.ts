import {
  classifyCacheLookup,
  isCacheEntryLive,
  type CacheEntry,
  type CacheClock,
  type CacheStore,
} from '../core/cache-store.js';

const ENTRY_OVERHEAD_BYTES = 128;

function isValidatedWeight(weight: number): boolean {
  return Number.isSafeInteger(weight) && weight >= 0;
}

function entryByteCost(weight: number): number {
  return weight + ENTRY_OVERHEAD_BYTES;
}

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

type WeightedLruHandle<T> = {
  get(key: string): T | undefined;
  peek(key: string): T | undefined;
  set(key: string, value: T): boolean;
  delete(key: string): void;
  clear(): void;
  forEach(fn: (value: T, key: string) => void): void;
};

function createWeightedLruHandle<T>(options: {
  maxBytes: number;
  maxEntries: number;
  weight: (value: T) => number;
  copy: (value: T) => T;
}): WeightedLruHandle<T> {
  const { maxBytes, maxEntries, weight, copy } = options;
  const entries = new Map<string, T>();
  const costs = new Map<string, number>();
  let totalBytes = 0;

  const touch = (key: string, value: T, cost: number): void => {
    entries.delete(key);
    entries.set(key, value);
    costs.set(key, cost);
  };

  const removeKey = (key: string): void => {
    const cost = costs.get(key);
    if (cost === undefined) {
      return;
    }
    entries.delete(key);
    costs.delete(key);
    totalBytes -= cost;
  };

  const evictLeastRecent = (): void => {
    const oldest = entries.keys().next().value as string | undefined;
    if (oldest === undefined) {
      return;
    }
    removeKey(oldest);
  };

  const admit = (key: string, value: T, cost: number): boolean => {
    const replacing = entries.has(key);
    if (replacing) {
      removeKey(key);
    }
    if (!replacing) {
      while (entries.size >= maxEntries && entries.size > 0) {
        evictLeastRecent();
      }
      if (entries.size >= maxEntries) {
        return false;
      }
    }
    while (totalBytes + cost > maxBytes && entries.size > 0) {
      evictLeastRecent();
    }
    if (totalBytes + cost > maxBytes) {
      return false;
    }
    const stored = copy(value);
    touch(key, stored, cost);
    totalBytes += cost;
    return true;
  };

  return {
    get(key: string): T | undefined {
      const value = entries.get(key);
      if (value === undefined) {
        return undefined;
      }
      const stored = copy(value);
      const cost = costs.get(key)!;
      touch(key, value, cost);
      return stored;
    },

    peek(key: string): T | undefined {
      const value = entries.get(key);
      if (value === undefined) {
        return undefined;
      }
      return copy(value);
    },

    set(key: string, value: T): boolean {
      const w = weight(value);
      if (!isValidatedWeight(w)) {
        return false;
      }
      const cost = entryByteCost(w);
      if (cost > maxBytes) {
        return false;
      }
      return admit(key, value, cost);
    },

    delete(key: string): void {
      removeKey(key);
    },

    clear(): void {
      entries.clear();
      costs.clear();
      totalBytes = 0;
    },

    forEach(fn: (value: T, key: string) => void): void {
      for (const [key, value] of entries) {
        fn(value, key);
      }
    },
  };
}

export { createTieredStore } from './tiered-store.js';

export function createWeightedLru<T>(options: {
  maxBytes: number;
  maxEntries: number;
  weight: (value: T) => number;
  copy: (value: T) => T;
}): {
  get(key: string): T | undefined;
  set(key: string, value: T): boolean;
  delete(key: string): void;
  clear(): void;
} {
  const handle = createWeightedLruHandle(options);
  return {
    get: (key) => handle.get(key),
    set: (key, value) => handle.set(key, value),
    delete: (key) => handle.delete(key),
    clear: () => handle.clear(),
  };
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
      const stored = lru.peek(key);
      if (!stored) {
        return { kind: 'miss' };
      }
      const lookup = classifyCacheLookup(stored, clock());
      if (lookup.kind !== 'hit') {
        lru.delete(key);
        return { kind: 'bypass', reason: 'expired' };
      }
      const promoted = lru.get(key);
      if (!promoted) {
        return { kind: 'miss' };
      }
      return { kind: 'hit', entry: promoted };
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
      const stored = copyCacheEntry(entry);
      const admitted = lru.set(key, stored);
      if (!admitted) {
        return { kind: 'bypass', reason: 'saturated' };
      }
      return { kind: 'stored' };
    },
  };
}