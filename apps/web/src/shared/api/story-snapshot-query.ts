import { queryOptions } from '@tanstack/react-query';
import type { StorySnapshot } from '@offscreen/contracts/stories';
import { readStorySnapshot } from '@/src/lib/story-transport';
import { queryKeys } from './query-keys';
import { STALE } from './query-defaults';
import {
  pendingStoryRefetchMs,
  storyNeedsPendingRefresh,
} from './story-pending-refresh';
import {
  allocateStorySnapshotEpoch,
  writeStorySnapshot,
} from './story-snapshot-write';

type StorySnapshotKey = ReturnType<typeof queryKeys.storySnapshot>;

export type PlayStorySnapshotQueryOptionsArgs = {
  /** When true, unresolved status uses 30s safety GET; otherwise 2s fallback. */
  liveStreamHealthy?: boolean;
};

/** Shared story snapshot options: same key/schema for SSR hydrate and browser useQuery. */
export function storySnapshotQueryOptions(viewerId: string, storyId: string) {
  return queryOptions({
    queryKey: queryKeys.storySnapshot(viewerId, storyId),
    queryFn: ({ signal }) => readStorySnapshot(storyId, signal),
    staleTime: STALE.storySnapshotMs,
  });
}

/**
 * Play observer options: SSE-aware pending refetch, hidden-tab pause,
 * and every GET merge through the W03 write gate (never raw setQueryData).
 */
export function playStorySnapshotQueryOptions(
  viewerId: string,
  storyId: string,
  options: PlayStorySnapshotQueryOptionsArgs = {},
) {
  const liveStreamHealthy = options.liveStreamHealthy === true;
  return queryOptions<
    StorySnapshot,
    Error,
    StorySnapshot,
    StorySnapshotKey
  >({
    queryKey: queryKeys.storySnapshot(viewerId, storyId),
    staleTime: STALE.storySnapshotMs,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchIntervalInBackground: false,
    refetchInterval: (query) =>
      storyNeedsPendingRefresh(query.state.data)
        ? pendingStoryRefetchMs(liveStreamHealthy)
        : false,
    queryFn: async ({ client, queryKey, signal }) => {
      const epoch = allocateStorySnapshotEpoch();
      const latest = await readStorySnapshot(storyId, signal);
      writeStorySnapshot(
        client,
        { viewerId, storyId, requestEpoch: epoch },
        latest,
      );
      return client.getQueryData<StorySnapshot>(queryKey) ?? latest;
    },
  });
}
