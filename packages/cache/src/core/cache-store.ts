export type CacheEntry = Readonly<{
  bytes: Uint8Array;
  expiresAtMs: number;
  observedAtMs: number;
}>;

export type CacheBypassReason =
  | 'disabled'
  | 'unavailable'
  | 'timeout'
  | 'saturated'
  | 'circuit-open'
  | 'invalid'
  | 'oversize'
  | 'expired';

export type CacheLookup =
  | { kind: 'hit'; entry: CacheEntry }
  | { kind: 'miss' }
  | { kind: 'bypass'; reason: CacheBypassReason };

export type CacheWriteResult =
  | { kind: 'stored' }
  | { kind: 'skipped'; reason: 'oversize' | 'expired' }
  | { kind: 'bypass'; reason: CacheBypassReason };

export interface CacheStore {
  get(key: string): Promise<CacheLookup>;
  set(key: string, entry: CacheEntry): Promise<CacheWriteResult>;
}

export type CacheIdentity = readonly string[];

export type CacheClock = () => number;

export interface CacheCodec<T> {
  encode(value: T): Uint8Array;
  decode(bytes: Uint8Array): T;
}

export type CacheConsistency = 'immutable' | 'versioned' | 'expiring';

/**
 * Validates cache entry timestamps. Expired entries must not be treated as hits by callers.
 */
export function assertCacheEntry(entry: CacheEntry, nowMs: number): void {
  if (
    !Number.isSafeInteger(entry.expiresAtMs) ||
    !Number.isSafeInteger(entry.observedAtMs)
  ) {
    throw new Error(
      'Cache entry times must be safe integer epoch milliseconds',
    );
  }
  if (entry.observedAtMs > entry.expiresAtMs) {
    throw new Error('Cache entry observation must not exceed expiry');
  }
  if (entry.expiresAtMs <= nowMs) {
    throw new Error('Cache entry is expired');
  }
}

/**
 * Returns true when the entry is still valid at {@link nowMs} (non-expired, well-formed times).
 */
export function isCacheEntryLive(entry: CacheEntry, nowMs: number): boolean {
  if (
    !Number.isSafeInteger(entry.expiresAtMs) ||
    !Number.isSafeInteger(entry.observedAtMs)
  ) {
    return false;
  }
  if (entry.observedAtMs > entry.expiresAtMs) {
    return false;
  }
  return entry.expiresAtMs > nowMs;
}

export function classifyCacheLookup(
  entry: CacheEntry | undefined,
  nowMs: number,
): CacheLookup {
  if (!entry) {
    return { kind: 'miss' };
  }
  if (!isCacheEntryLive(entry, nowMs)) {
    return { kind: 'bypass', reason: 'expired' };
  }
  return { kind: 'hit', entry };
}
