import type { ReadCache } from '@offscreen/cache-port/read-cache';

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

export type ReadCacheOptions = Readonly<{
  cache?: ReadCache;
  onCacheIncident?: (incident: CacheIncident) => void;
}>;
