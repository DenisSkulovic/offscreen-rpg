import { queryOptions } from '@tanstack/react-query';
import {
  latestOpeningSchema,
  type OpeningPreview,
} from '@offscreen/contracts/openings';
import { queryKeys } from './query-keys';
import { STALE } from './query-defaults';

export const PENDING_OPENING_REFETCH_MS = 2_000;

export function openingNeedsPendingRefresh(
  preview: OpeningPreview | null | undefined,
): boolean {
  return Boolean(
    preview && (preview.state === 'pending' || preview.state === 'running'),
  );
}

export async function readLatestOpening(
  draftId: string,
  signal?: AbortSignal,
): Promise<OpeningPreview | null> {
  const response = await fetch(`/api/drafts/${draftId}/openings/latest`, {
    cache: 'no-store',
    signal: signal ?? AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const error = new Error('Unavailable') as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  return latestOpeningSchema.parse(await response.json()).preview;
}

/** Viewer/draft-keyed latest opening. Polls only while pending/running. */
export function openingQueryOptions(viewerId: string, draftId: string) {
  return queryOptions<OpeningPreview | null>({
    queryKey: queryKeys.draftOpening(viewerId, draftId),
    queryFn: ({ signal }) => readLatestOpening(draftId, signal),
    staleTime: STALE.draftOrListMs,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchIntervalInBackground: false,
    refetchInterval: (query) =>
      openingNeedsPendingRefresh(query.state.data)
        ? PENDING_OPENING_REFETCH_MS
        : false,
  });
}
