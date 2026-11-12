import { useMutation, useQueryClient } from '@tanstack/react-query';
import { draftSchema, type Draft, type DraftContent } from '@offscreen/contracts/drafts';
import { queryKeys } from '@/src/shared/api/query-keys';

export type FrozenDraftSave = {
  draftId: string;
  expectedRevision: number;
  content: DraftContent;
};

export type DraftSaveResult =
  | { kind: 'saved'; draft: Draft }
  | { kind: 'conflict' }
  | { kind: 'unauthorized' }
  | { kind: 'unavailable' };

export async function saveDraftFrozen(
  frozen: FrozenDraftSave,
  signal?: AbortSignal,
): Promise<DraftSaveResult> {
  const response = await fetch(`/api/drafts/${frozen.draftId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ...frozen.content,
      expectedRevision: frozen.expectedRevision,
    }),
    signal: signal ?? AbortSignal.timeout(15_000),
  });
  if (response.status === 409) {
    return { kind: 'conflict' };
  }
  if (response.status === 401) {
    return { kind: 'unauthorized' };
  }
  if (!response.ok) {
    return { kind: 'unavailable' };
  }
  return {
    kind: 'saved',
    draft: draftSchema.parse(await response.json()),
  };
}

export function useDraftSave(viewerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (frozen: FrozenDraftSave) => saveDraftFrozen(frozen),
    retry: 0,
    networkMode: 'always' as const,
    onSuccess: (result, frozen) => {
      if (result.kind !== 'saved') {
        return;
      }
      queryClient.setQueryData(
        queryKeys.draft(viewerId, frozen.draftId),
        result.draft,
      );
    },
  });
}
