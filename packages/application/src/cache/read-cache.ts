import type { ReadCache } from '@offscreen/contracts/read-cache';

export type {
  ReadCacheWrite,
  ReadCache,
} from '@offscreen/contracts/read-cache';
export { disabledReadCache } from '@offscreen/contracts/read-cache';

export type CacheIncident = Readonly<{
  operation: 'get' | 'set';
  projection: 'story-snapshot';
  errorKind: string;
}>;

export type ReadCacheOptions = Readonly<{
  cache?: ReadCache;
  onCacheIncident?: (incident: CacheIncident) => void;
}>;
