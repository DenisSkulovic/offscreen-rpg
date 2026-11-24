import type { ReadCache } from '@offscreen/cache-port/read-cache';
import { defineCache } from '@offscreen/cache/core';
import type {
  CacheIdentity,
  CacheStore,
  CacheTelemetry,
} from '@offscreen/cache/core';
import { jsonCodec } from '@offscreen/cache/codecs';
import { bindCache } from '@offscreen/cache/strategies';
import {
  storySnapshotSchema,
  type StorySnapshot,
} from '@offscreen/story-interface/stories';

export type {
  ReadCacheWrite,
  ReadCache,
} from '@offscreen/cache-port/read-cache';
export { disabledReadCache } from '@offscreen/cache-port/read-cache';

export type CacheIncident = Readonly<{
  operation: 'get' | 'set';
  projection: 'story-snapshot';
  errorKind: string;
}>;

const snapshotCacheTtlMs = 30_000;
const snapshotCacheMaximumBytes = 512 * 1024;
const snapshotCacheJitterRatio = 0.15;

const storySnapshotCacheDefinition = defineCache({
  namespace: 'story-snapshot',
  version: 1,
  consistency: 'versioned',
  codec: jsonCodec((value: unknown) => storySnapshotSchema.parse(value)),
  policy: {
    ttlMs: snapshotCacheTtlMs,
    maxEntryBytes: snapshotCacheMaximumBytes,
    jitterRatio: snapshotCacheJitterRatio,
    maxActiveKeys: 128,
    maxWaitersPerKey: 8,
    originConcurrency: 4,
    originQueueLimit: 32,
    originQueueTimeoutMs: 5_000,
  },
});

export type StorySnapshotCache = Readonly<{
  getOrLoad(
    identity: CacheIdentity,
    load: () => Promise<{
      value: StorySnapshot;
      identity: CacheIdentity;
      observedAtMs: number;
    }>,
    options?: { signal?: AbortSignal },
  ): Promise<StorySnapshot>;
}>;

const CACHE_ENVIRONMENT_PATTERN = /^[a-z0-9][a-z0-9:_-]{0,49}$/;

/** Matches Redis key-prefix token rules used for cache environment separation. */
export function readStorySnapshotCacheEnvironment(
  env: Record<string, string | undefined>,
): string {
  const raw = env['REDIS_KEY_PREFIX']?.trim();
  if (raw && CACHE_ENVIRONMENT_PATTERN.test(raw)) {
    return raw;
  }
  return 'offscreen';
}

export function createStorySnapshotCache(
  store: CacheStore,
  environment: string,
  options?: Readonly<{ telemetry?: CacheTelemetry }>,
): StorySnapshotCache {
  return bindCache(storySnapshotCacheDefinition, {
    store,
    environment,
    ...(options?.telemetry ? { telemetry: options.telemetry } : {}),
  });
}

export type ReadCacheOptions = Readonly<{
  cache?: ReadCache;
  storySnapshotCache?: StorySnapshotCache;
  onCacheIncident?: (incident: CacheIncident) => void;
}>;
