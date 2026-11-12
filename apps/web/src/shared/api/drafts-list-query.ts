import { infiniteQueryOptions } from '@tanstack/react-query';
import { draftListSchema } from '@offscreen/contracts/drafts';
import type { Draft } from '@offscreen/contracts/drafts';
import { queryKeys } from './query-keys';
import { STALE } from './query-defaults';

export type DraftsListPageParam = string | null;

export type DraftsListPage = {
  items: Draft[];
  nextCursor: string | null;
};

export async function readDraftsListPage(
  cursor: DraftsListPageParam,
  signal?: AbortSignal,
): Promise<DraftsListPage> {
  const url =
    cursor === null
      ? '/api/drafts'
      : `/api/drafts?cursor=${encodeURIComponent(cursor)}`;
  const response = await fetch(url, {
    cache: 'no-store',
    signal: signal ?? AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const error = new Error('Unavailable') as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  return draftListSchema.parse(await response.json());
}

/** Viewer-scoped drafts: opaque string `cursor` continuation. */
export function draftsListInfiniteOptions(viewerId: string) {
  return infiniteQueryOptions({
    queryKey: queryKeys.draftsList(viewerId),
    queryFn: ({ pageParam, signal }) => readDraftsListPage(pageParam, signal),
    initialPageParam: null as DraftsListPageParam,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: STALE.draftOrListMs,
  });
}
