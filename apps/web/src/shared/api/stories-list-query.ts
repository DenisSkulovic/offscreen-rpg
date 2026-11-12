import { infiniteQueryOptions } from '@tanstack/react-query';
import { storyListSchema, type StoryList } from '@offscreen/contracts/stories';
import { queryKeys } from './query-keys';
import { STALE } from './query-defaults';

export type StoriesListPageParam = string | null;

export async function readStoriesListPage(
  before: StoriesListPageParam,
  signal?: AbortSignal,
): Promise<StoryList> {
  const url =
    before === null
      ? '/api/stories'
      : `/api/stories?before=${encodeURIComponent(before)}`;
  const response = await fetch(url, {
    cache: 'no-store',
    signal: signal ?? AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const error = new Error('Unavailable') as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  return storyListSchema.parse(await response.json());
}

/** Viewer-scoped live stories: UUID `before` continuation (not draft/history cursors). */
export function storiesListInfiniteOptions(viewerId: string) {
  return infiniteQueryOptions({
    queryKey: queryKeys.storiesList(viewerId),
    queryFn: ({ pageParam, signal }) => readStoriesListPage(pageParam, signal),
    initialPageParam: null as StoriesListPageParam,
    getNextPageParam: (last) => last.nextBefore,
    staleTime: STALE.draftOrListMs,
  });
}
