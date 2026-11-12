'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  clearStartEnvelope,
  loadStartEnvelope,
  saveStartEnvelope,
  type FrozenStartEnvelope,
} from '@/src/shared/api/start-intent-store';
import { readLatestOpening } from '@/src/shared/api/opening-query';
import type { OpeningPreview } from '@offscreen/contracts/openings';

export type StartStoryResult =
  | { kind: 'started'; storyId: string }
  | { kind: 'conflict'; preview: OpeningPreview | null }
  | { kind: 'unauthorized' }
  | { kind: 'unavailable' };

function isStoryUuid(value: string | null): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

async function putStartFrozen(
  envelope: FrozenStartEnvelope,
  signal?: AbortSignal,
): Promise<StartStoryResult> {
  // Send the exact frozen campaign slice; Nest applies campaignStartSchema defaults.
  const response = await fetch(`/api/stories/${envelope.storyId}/start`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      candidateId: envelope.candidateId,
      expectedDraftRevision: envelope.expectedDraftRevision,
      campaign: envelope.campaign,
    }),
    signal: signal ?? AbortSignal.timeout(15_000),
  });
  if (response.status === 401) {
    return { kind: 'unauthorized' };
  }
  if (response.status === 409) {
    let preview: OpeningPreview | null = null;
    try {
      preview = await readLatestOpening(envelope.draftId);
    } catch {
      preview = null;
    }
    return { kind: 'conflict', preview };
  }
  if (!response.ok) {
    return { kind: 'unavailable' };
  }
  return { kind: 'started', storyId: envelope.storyId };
}

export type StartRecoveryState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'ready_retry'; envelope: FrozenStartEnvelope }
  | { status: 'blocked'; message: string }
  | { status: 'navigating'; storyId: string };

/**
 * Immutable Start intent. Captures body once; reload GETs story first and
 * never auto-PUTs. Settings changes after capture cannot alter the frozen body.
 */
export function useStartStory(args: {
  viewerId: string;
  draftId: string;
}) {
  const { viewerId, draftId } = args;
  const envelopeRef = useRef<FrozenStartEnvelope | null>(null);
  const recoveryStarted = useRef(false);
  const [recovery, setRecovery] = useState<StartRecoveryState>({
    status: 'idle',
  });
  const [message, setMessage] = useState('');
  const [conflictPreview, setConflictPreview] = useState<OpeningPreview | null>(
    null,
  );

  const mutation = useMutation({
    mutationKey: ['viewer', viewerId, 'draft', draftId, 'start-story'],
    networkMode: 'always',
    retry: 0,
    mutationFn: (envelope: FrozenStartEnvelope) => putStartFrozen(envelope),
    onSuccess: (result, envelope) => {
      if (result.kind === 'started') {
        clearStartEnvelope(viewerId, envelope.storyId);
        envelopeRef.current = null;
        setMessage('');
        setRecovery({ status: 'navigating', storyId: result.storyId });
        window.location.assign(`/play/${result.storyId}`);
        return;
      }
      if (result.kind === 'conflict') {
        clearStartEnvelope(viewerId, envelope.storyId);
        envelopeRef.current = null;
        setConflictPreview(result.preview);
        setRecovery({ status: 'idle' });
        setMessage(
          'The draft or candidate changed. The current preview is shown; it was not started.',
        );
        return;
      }
      if (result.kind === 'unauthorized') {
        clearStartEnvelope(viewerId, envelope.storyId);
        envelopeRef.current = null;
        setRecovery({ status: 'idle' });
        setMessage('Sign in again, then retry.');
        return;
      }
      setRecovery({ status: 'ready_retry', envelope });
      setMessage(
        'The story could not be confirmed. Retry Start to recover the same story, or reload.',
      );
    },
    onError: (_error, envelope) => {
      setRecovery({ status: 'ready_retry', envelope });
      setMessage(
        'The story could not be confirmed. Retry Start to recover the same story, or reload.',
      );
    },
  });

  useEffect(() => {
    if (recoveryStarted.current) {
      return;
    }
    recoveryStarted.current = true;
    const storyParam = new URLSearchParams(window.location.search).get('story');
    const storyParsed = isStoryUuid(storyParam) ? storyParam : null;
    if (!storyParsed) {
      return;
    }
    const stored = loadStartEnvelope(viewerId, storyParsed);
    if (stored && stored.draftId !== draftId) {
      setRecovery({
        status: 'blocked',
        message:
          'A saved Start request does not match this draft. Reload or clear the story link before starting again.',
      });
      return;
    }
    if (stored && stored.viewerId !== viewerId) {
      clearStartEnvelope(stored.viewerId, stored.storyId);
      setRecovery({
        status: 'blocked',
        message:
          'A saved Start request belongs to a different viewer and cannot be retried here.',
      });
      return;
    }
    setRecovery({ status: 'checking' });
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/stories/${storyParsed}`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(10_000),
        });
        if (cancelled) {
          return;
        }
        if (response.status === 401) {
          setRecovery({
            status: 'blocked',
            message: 'Sign in again before recovering this Start.',
          });
          return;
        }
        if (response.ok) {
          clearStartEnvelope(viewerId, storyParsed);
          envelopeRef.current = null;
          setRecovery({ status: 'navigating', storyId: storyParsed });
          window.location.assign(`/play/${storyParsed}`);
          return;
        }
        if (response.status === 404) {
          if (stored) {
            envelopeRef.current = stored;
            setRecovery({ status: 'ready_retry', envelope: stored });
            setMessage(
              'Start was not confirmed. Retry the same story request, or reload.',
            );
            return;
          }
          setRecovery({
            status: 'blocked',
            message:
              'This story link has no recoverable Start body. Start again from a reviewed opening.',
          });
          return;
        }
        if (stored) {
          envelopeRef.current = stored;
          setRecovery({ status: 'ready_retry', envelope: stored });
          setMessage(
            'Could not check the story. Retry the same Start request, or reload.',
          );
          return;
        }
        setRecovery({
          status: 'blocked',
          message:
            'Could not check the story and no safe Start body is available.',
        });
      } catch {
        if (cancelled) {
          return;
        }
        if (stored) {
          envelopeRef.current = stored;
          setRecovery({ status: 'ready_retry', envelope: stored });
          setMessage(
            'Could not check the story. Retry the same Start request, or reload.',
          );
          return;
        }
        setRecovery({
          status: 'blocked',
          message:
            'Could not check the story and no safe Start body is available.',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewerId, draftId]);

  function captureAndSubmit(input: {
    candidateId: string;
    expectedDraftRevision: number;
    campaign: FrozenStartEnvelope['campaign'];
  }) {
    if (mutation.isPending || envelopeRef.current) {
      if (envelopeRef.current && !mutation.isPending) {
        mutation.mutate(envelopeRef.current);
      }
      return;
    }
    const existingStory = new URLSearchParams(window.location.search).get(
      'story',
    );
    const storyId = isStoryUuid(existingStory)
      ? existingStory
      : crypto.randomUUID();
    window.history.replaceState(
      null,
      '',
      `/stories/${draftId}/preview?story=${storyId}`,
    );
    const envelope: FrozenStartEnvelope = {
      version: 1,
      kind: 'start',
      viewerId,
      draftId,
      storyId,
      candidateId: input.candidateId,
      expectedDraftRevision: input.expectedDraftRevision,
      campaign: input.campaign,
      createdAt: Date.now(),
    };
    envelopeRef.current = envelope;
    saveStartEnvelope(envelope);
    setMessage('');
    setConflictPreview(null);
    setRecovery({ status: 'idle' });
    mutation.mutate(envelope);
  }

  function retryFrozen() {
    const envelope =
      envelopeRef.current ??
      (recovery.status === 'ready_retry' ? recovery.envelope : null);
    if (!envelope || mutation.isPending) {
      return;
    }
    envelopeRef.current = envelope;
    setMessage('');
    mutation.mutate(envelope);
  }

  const frozen = envelopeRef.current;
  const pending =
    mutation.isPending ||
    recovery.status === 'checking' ||
    recovery.status === 'navigating';
  const canRetrySame =
    recovery.status === 'ready_retry' ||
    (Boolean(frozen) && Boolean(message) && !mutation.isPending);

  return {
    pending,
    message,
    canRetrySame,
    recovery,
    conflictPreview,
    frozen,
    captureAndSubmit,
    retryFrozen,
    clearConflictPreview: () => setConflictPreview(null),
  };
}
