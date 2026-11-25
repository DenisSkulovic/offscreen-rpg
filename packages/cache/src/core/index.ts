export type {
  CacheBypassReason,
  CacheClock,
  CacheCodec,
  CacheConsistency,
  CacheEntry,
  CacheIdentity,
  CacheLookup,
  CacheStore,
  CacheWriteResult,
} from './cache-store.js';
export {
  assertCacheEntry,
  classifyCacheLookup,
  isCacheEntryLive,
} from './cache-store.js';

export type { CacheDefinition } from './cache-policy.js';
export { defineCache, validateCacheDefinition } from './cache-policy.js';

export { makeCacheKey, validateCacheIdentity } from './cache-key.js';

export type { CacheTelemetry } from './cache-telemetry.js';
export { emitCacheTelemetry } from './cache-telemetry.js';

export { createDisabledStore } from './disabled-store.js';
export { createFakeStore } from './test-stores.js';
