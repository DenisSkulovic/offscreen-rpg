'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { StorySnapshot } from '@offscreen/contracts/stories';
import {
  allocateStorySnapshotEpoch,
  writeStorySnapshot,
} from '@/src/shared/api/story-snapshot-write';
import {
  readSnapshotFromResponse,
  readStorySnapshot,
  submitStoryJson,
} from '@/src/lib/story-transport';

type FrozenControlEnvelope = {
  id: string;
  body: {
    intervalId: string;
    expectedControlRevision: number;
    action: 'pause' | 'resume';
  };
};

export function useControlCommand(args: { viewerId: string; storyId: string }) {
  const { viewerId, storyId } = args;
  const queryClient = useQueryClient();
  const envelope = useRef<FrozenControlEnvelope | null>(null);
  const [error, setError] = useState('');
  const [retryVisible, setRetryVisible] = useState(false);
  const [hasFrozen, setHasFrozen] = useState(false);

  function acceptSnapshot(next: StorySnapshot, epoch?: number) {
    writeStorySnapshot(
      queryClient,
      {
        viewerId,
        storyId,
        requestEpoch: epoch ?? allocateStorySnapshotEpoch(),
      },
      next,
    );
  }

  const mutation = useMutation({
    mutationKey: ['viewer', viewerId, 'story', storyId, 'control-command'],
    networkMode: 'always',
    retry: 0,
    mutationFn: async (current: FrozenControlEnvelope) => {
      const epoch = allocateStorySnapshotEpoch();
      const response = await submitStoryJson({
        url: `/api/stories/${storyId}/controls/${current.id}`,
        body: current.body,
      });
      return { response, epoch };
    },
    onSuccess: async ({ response, epoch }) => {
      if (response.status === 409) {
        acceptSnapshot(await readStorySnapshot(storyId), epoch);
        envelope.current = null;
        setHasFrozen(false);
        setRetryVisible(false);
        setError(
          'The wait changed or is already due. The current saved situation is shown.',
        );
        return;
      }
      if (!response.ok) {
        setRetryVisible(true);
        setError(
          'Could not confirm the control. Retry the same request or reload to check saved progress.',
        );
        return;
      }
      acceptSnapshot(await readSnapshotFromResponse(response), epoch);
      envelope.current = null;
      setHasFrozen(false);
      setRetryVisible(false);
      setError('');
    },
    onError: () => {
      setRetryVisible(true);
      setError(
        'Could not confirm the control. Retry the same request or reload to check saved progress.',
      );
    },
  });

  function submit(input: {
    intervalId: string;
    expectedControlRevision: number;
    action: 'pause' | 'resume';
  }) {
    if (mutation.isPending || envelope.current) {
      return;
    }
    envelope.current = {
      id: crypto.randomUUID(),
      body: input,
    };
    setHasFrozen(true);
    setError('');
    setRetryVisible(false);
    mutation.mutate(envelope.current);
  }

  function retryFrozen() {
    if (!envelope.current || mutation.isPending) {
      return;
    }
    setError('');
    mutation.mutate(envelope.current);
  }

  return {
    pending: mutation.isPending,
    error,
    canRetrySame: retryVisible && hasFrozen,
    submit,
    retryFrozen,
    acceptSnapshot,
    hasFrozen,
  };
}
