import { queryOptions } from '@tanstack/react-query';
import { draftSchema } from '@offscreen/contracts/drafts';
import { queryKeys } from './query-keys';
import { STALE } from './query-defaults';

export async function readDraft(draftId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/drafts/${draftId}`, {
    cache: 'no-store',
    signal: signal ?? AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const error = new Error('Unavailable') as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  return draftSchema.parse(await response.json());
}

/** Viewer-scoped draft Query. Editor does not auto-reset RHF from background reads. */
export function draftQueryOptions(viewerId: string, draftId: string) {
  return queryOptions({
    queryKey: queryKeys.draft(viewerId, draftId),
    queryFn: ({ signal }) => readDraft(draftId, signal),
    staleTime: STALE.draftOrListMs,
    refetchOnWindowFocus: false,
  });
}
