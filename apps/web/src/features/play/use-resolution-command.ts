'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { StorySnapshot } from '@offscreen/contracts/stories';
import { respondToStorySchema } from '@offscreen/contracts/stories';
import { digestResolutionRequest } from '@/src/shared/api/canonical-digest';
import {
  clearResolutionEnvelope,
  loadResolutionEnvelope,
  saveResolutionEnvelope,
  type FrozenResolutionEnvelope,
} from '@/src/shared/api/resolution-intent-store';
import { readResolutionReceipt } from '@/src/shared/api/resolution-receipt-client';
import {
  allocateStorySnapshotEpoch,
  writeStorySnapshot,
} from '@/src/shared/api/story-snapshot-write';
import {
  readSnapshotFromResponse,
  readStorySnapshot,
  submitStoryJson,
} from '@/src/lib/story-transport';
import {
  intentEnvelope,
  playResolutionIntentReducer,
  type PlayResolutionIntent,
} from './play-command-intent';

const awaitingAckMessage =
  'Could not confirm this choice. Retry the same request or reload to check saved progress.';
const conflictMessage =
  'The situation changed. The latest saved scene is shown.';
const blockedMessage =
  'This choice was not confirmed on the server. Do not start a new intention; retry the same frozen request only if you still intend it.';
const digestMismatchMessage =
  'A saved recovery request no longer matches the server receipt. Refresh the scene before choosing again.';

export function useResolutionCommand(args: {
  viewerId: string;
  storyId: string;
}) {
  const { viewerId, storyId } = args;
  const queryClient = useQueryClient();
  const [intent, dispatch] = useReducer(playResolutionIntentReducer, {
    status: 'idle',
  } satisfies PlayResolutionIntent);
  const recoveryStarted = useRef(false);

  const acceptSnapshot = useCallback(
    (next: StorySnapshot, epoch?: number) => {
      writeStorySnapshot(
        queryClient,
        {
          viewerId,
          storyId,
          requestEpoch: epoch ?? allocateStorySnapshotEpoch(),
        },
        next,
      );
    },
    [queryClient, viewerId, storyId],
  );

  const mutation = useMutation({
    mutationKey: ['viewer', viewerId, 'story', storyId, 'resolution-command'],
    networkMode: 'always',
    retry: 0,
    mutationFn: async (envelope: FrozenResolutionEnvelope) => {
      const epoch = allocateStorySnapshotEpoch();
      const response = await submitStoryJson({
        url: envelope.endpoint,
        body: envelope.body,
      });
      return { response, envelope, epoch };
    },
    onSuccess: async ({ response, envelope, epoch }) => {
      if (response.status === 409) {
        acceptSnapshot(await readStorySnapshot(storyId), epoch);
        clearResolutionEnvelope(viewerId, storyId);
        dispatch({
          type: 'conflict',
          envelope,
          message: conflictMessage,
        });
        return;
      }
      if (response.status === 401) {
        clearResolutionEnvelope(viewerId, storyId);
        dispatch({
          type: 'failed',
          envelope,
          message: 'Sign in again before retrying this choice.',
        });
        return;
      }
      if (response.status === 400 || response.status === 422) {
        clearResolutionEnvelope(viewerId, storyId);
        dispatch({
          type: 'failed',
          envelope,
          message: 'This choice is not valid for the current scene.',
        });
        return;
      }
      if (response.status === 429) {
        dispatch({
          type: 'awaiting_ack',
          envelope,
          message:
            'Too many requests. Wait, then retry the same frozen choice.',
        });
        return;
      }
      if (!response.ok) {
        dispatch({
          type: 'awaiting_ack',
          envelope,
          message: awaitingAckMessage,
        });
        return;
      }
      acceptSnapshot(await readSnapshotFromResponse(response), epoch);
      dispatch({ type: 'admitted', envelope });
    },
    onError: (_error, envelope) => {
      dispatch({
        type: 'awaiting_ack',
        envelope,
        message: awaitingAckMessage,
      });
    },
  });

  useEffect(() => {
    if (recoveryStarted.current) {
      return;
    }
    recoveryStarted.current = true;
    const stored = loadResolutionEnvelope(viewerId, storyId);
    if (!stored) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const epoch = allocateStorySnapshotEpoch();
        const [receiptRead, snapshot] = await Promise.all([
          readResolutionReceipt(storyId, stored.operationId),
          readStorySnapshot(storyId),
        ]);
        if (cancelled) {
          return;
        }
        acceptSnapshot(snapshot, epoch);
        if (receiptRead.kind === 'unauthorized') {
          clearResolutionEnvelope(viewerId, storyId);
          dispatch({ type: 'reset' });
          return;
        }
        if (receiptRead.kind === 'not_found') {
          dispatch({
            type: 'blocked',
            envelope: stored,
            message: blockedMessage,
          });
          return;
        }
        if (receiptRead.kind === 'transient') {
          dispatch({
            type: 'awaiting_ack',
            envelope: stored,
            message: awaitingAckMessage,
          });
          return;
        }
        if (receiptRead.receipt.requestDigest !== stored.requestDigest) {
          clearResolutionEnvelope(viewerId, storyId);
          dispatch({
            type: 'failed',
            envelope: stored,
            message: digestMismatchMessage,
          });
          return;
        }
        if (receiptRead.receipt.state === 'settled') {
          clearResolutionEnvelope(viewerId, storyId);
          dispatch({ type: 'reset' });
          return;
        }
        if (
          receiptRead.receipt.state === 'failed' ||
          receiptRead.receipt.state === 'uncertain'
        ) {
          dispatch({
            type: 'awaiting_ack',
            envelope: stored,
            message: awaitingAckMessage,
          });
          return;
        }
        dispatch({ type: 'admitted', envelope: stored });
      } catch {
        if (!cancelled) {
          dispatch({
            type: 'awaiting_ack',
            envelope: stored,
            message: awaitingAckMessage,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewerId, storyId, queryClient, acceptSnapshot]);

  async function submitChoice(input: {
    expectedRevision: number;
    interactionId: string;
    optionId: string;
  }) {
    if (mutation.isPending || intentEnvelope(intent)) {
      return;
    }
    const body = respondToStorySchema.parse({
      expectedRevision: input.expectedRevision,
      submission: {
        interactionId: input.interactionId,
        answer: { kind: 'choice.v1', optionId: input.optionId },
      },
    });
    const operationId = crypto.randomUUID();
    const requestDigest = await digestResolutionRequest(body);
    const envelope: FrozenResolutionEnvelope = {
      version: 1,
      kind: 'resolution',
      viewerId,
      storyId,
      operationId,
      endpoint: `/api/stories/${storyId}/resolutions/${operationId}`,
      body,
      requestDigest,
      createdAt: Date.now(),
    };
    saveResolutionEnvelope(envelope);
    dispatch({ type: 'begin', envelope });
    mutation.mutate(envelope);
  }

  function retryFrozen() {
    const envelope = intentEnvelope(intent);
    if (!envelope || mutation.isPending) {
      return;
    }
    if (
      intent.status !== 'awaiting_ack' &&
      intent.status !== 'blocked' &&
      intent.status !== 'admitted'
    ) {
      return;
    }
    // Admitted means Nest already has the operation — only retry when ACK was lost.
    if (intent.status === 'admitted') {
      return;
    }
    dispatch({ type: 'begin', envelope });
    mutation.mutate(envelope);
  }

  const clearAfterSettlement = useCallback(() => {
    clearResolutionEnvelope(viewerId, storyId);
    dispatch({ type: 'reset' });
  }, [viewerId, storyId]);

  const envelope = intentEnvelope(intent);
  const pending = mutation.isPending || intent.status === 'submitting';
  const error =
    intent.status === 'awaiting_ack' ||
    intent.status === 'conflict' ||
    intent.status === 'blocked' ||
    intent.status === 'failed'
      ? intent.message
      : '';
  const canRetrySame =
    !!envelope &&
    (intent.status === 'awaiting_ack' || intent.status === 'blocked');

  return {
    intentStatus: intent.status,
    envelope,
    pending,
    error,
    canRetrySame,
    submitChoice,
    retryFrozen,
    clearAfterSettlement,
    acceptSnapshot,
  };
}
