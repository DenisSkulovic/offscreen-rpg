import { infiniteQueryOptions } from '@tanstack/react-query';
import {
  storyHistorySchema,
  type StoryHistory,
} from '@offscreen/contracts/stories';
import { queryKeys } from './query-keys';
import { STALE } from './query-defaults';

/** `undefined` = latest page; positive int = older-than sequence cursor. */
export type StoryHistoryPageParam = number | undefined;

export async function readStoryHistoryPage(
  storyId: string,
  before: StoryHistoryPageParam,
  signal?: AbortSignal,
): Promise<StoryHistory> {
  const query = before === undefined ? '' : `?before=${before}`;
  const response = await fetch(`/api/stories/${storyId}/history${query}`, {
    cache: 'no-store',
    signal: signal ?? AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const error = new Error('Unavailable') as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  return storyHistorySchema.parse(await response.json());
}

/** Viewer+story chronology: numeric `before` continuation. */
export function storyHistoryInfiniteOptions(
  viewerId: string,
  storyId: string,
) {
  return infiniteQueryOptions({
    queryKey: queryKeys.storyHistory(viewerId, storyId),
    queryFn: ({ pageParam, signal }) =>
      readStoryHistoryPage(storyId, pageParam, signal),
    initialPageParam: undefined as StoryHistoryPageParam,
    getNextPageParam: (last) => last.nextBefore ?? undefined,
    staleTime: STALE.historyOrSettingsMs,
  });
}
