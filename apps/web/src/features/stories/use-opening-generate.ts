import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  openingPreviewSchema,
  type OpeningPreview,
} from '@offscreen/contracts/openings';
import { queryKeys } from '@/src/shared/api/query-keys';

export type FrozenOpeningGenerate = {
  draftId: string;
  attemptId: string;
  expectedRevision: number;
  contentId?: string;
};

export type OpeningGenerateResult =
  | { kind: 'accepted'; preview: OpeningPreview }
  | { kind: 'conflict' }
  | { kind: 'unauthorized' }
  | { kind: 'unavailable' };

export async function generateOpeningFrozen(
  frozen: FrozenOpeningGenerate,
  signal?: AbortSignal,
): Promise<OpeningGenerateResult> {
  const response = await fetch(
    `/api/drafts/${frozen.draftId}/openings/${frozen.attemptId}`,
    {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        expectedRevision: frozen.expectedRevision,
        ...(frozen.contentId ? { contentId: frozen.contentId } : {}),
      }),
      signal: signal ?? AbortSignal.timeout(15_000),
    },
  );
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
    kind: 'accepted',
    preview: openingPreviewSchema.parse(await response.json()),
  };
}

/**
 * Generation admission only. Never auto-retries paid provider work.
 * Network uncertainty keeps the same attemptId for explicit user retry.
 */
export function useOpeningGenerate(viewerId: string, draftId: string) {
  const queryClient = useQueryClient();
  const frozenRef = useRef<FrozenOpeningGenerate | null>(null);
  const [message, setMessage] = useState('');
  const [canRetrySame, setCanRetrySame] = useState(false);

  const mutation = useMutation({
    mutationKey: ['viewer', viewerId, 'draft', draftId, 'opening-generate'],
    networkMode: 'always',
    retry: 0,
    mutationFn: (frozen: FrozenOpeningGenerate) => generateOpeningFrozen(frozen),
    onSuccess: (result, frozen) => {
      if (result.kind === 'accepted') {
        frozenRef.current = null;
        setCanRetrySame(false);
        setMessage('');
        queryClient.setQueryData(
          queryKeys.draftOpening(viewerId, frozen.draftId),
          result.preview,
        );
        return;
      }
      if (result.kind === 'conflict') {
        frozenRef.current = null;
        setCanRetrySame(false);
        setMessage(
          'The draft or its request changed. Reload this page to review the current state.',
        );
        void queryClient.invalidateQueries({
          queryKey: queryKeys.draftOpening(viewerId, draftId),
        });
        return;
      }
      if (result.kind === 'unauthorized') {
        frozenRef.current = null;
        setCanRetrySame(false);
        setMessage('Sign in again, then retry.');
        return;
      }
      setCanRetrySame(true);
      setMessage(
        'The result could not be confirmed. Retry to recover the same request, or reload to check its saved result.',
      );
    },
    onError: () => {
      setCanRetrySame(true);
      setMessage(
        'The result could not be confirmed. Retry to recover the same request, or reload to check its saved result.',
      );
    },
  });

  function submit(input: {
    expectedRevision: number;
    contentId?: string;
    reuseAttemptId?: string;
  }) {
    if (mutation.isPending) {
      return;
    }
    if (frozenRef.current) {
      mutation.mutate(frozenRef.current);
      return;
    }
    const frozen: FrozenOpeningGenerate = {
      draftId,
      attemptId: input.reuseAttemptId ?? crypto.randomUUID(),
      expectedRevision: input.expectedRevision,
      ...(input.contentId ? { contentId: input.contentId } : {}),
    };
    frozenRef.current = frozen;
    setMessage('');
    setCanRetrySame(false);
    mutation.mutate(frozen);
  }

  function retryFrozen() {
    if (!frozenRef.current || mutation.isPending) {
      return;
    }
    setMessage('');
    mutation.mutate(frozenRef.current);
  }

  function clearMessage() {
    setMessage('');
  }

  return {
    pending: mutation.isPending,
    message,
    canRetrySame,
    submit,
    retryFrozen,
    clearMessage,
    frozenAttemptId: frozenRef.current?.attemptId ?? null,
  };
}
