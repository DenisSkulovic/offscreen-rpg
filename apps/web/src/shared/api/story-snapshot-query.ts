import { queryOptions } from '@tanstack/react-query';
import { readStorySnapshot } from '@/src/lib/story-transport';
import { queryKeys } from './query-keys';
import { STALE } from './query-defaults';

/** Shared story snapshot options: same key/schema for SSR hydrate and browser useQuery. */
export function storySnapshotQueryOptions(viewerId: string, storyId: string) {
  return queryOptions({
    queryKey: queryKeys.storySnapshot(viewerId, storyId),
    queryFn: ({ signal }) => readStorySnapshot(storyId, signal),
    staleTime: STALE.storySnapshotMs,
  });
}
