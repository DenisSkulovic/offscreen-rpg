'use client';

import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { StorySnapshot } from '@offscreen/contracts/stories';
import {
  readSnapshotFromResponse,
  readStorySnapshot,
  submitStoryJson,
} from '@/src/lib/story-transport';

type FrozenCampaignEnvelope = {
  url: string;
  body: unknown;
};

export function useCampaignCommand(
  storyId: string,
  onSnapshot: (story: StorySnapshot) => void,
) {
  const saved = useRef<FrozenCampaignEnvelope | null>(null);
  const [message, setMessage] = useState('');
  const [retry, setRetry] = useState(false);

  const mutation = useMutation({
    mutationKey: ['story', storyId, 'campaign-command'],
    networkMode: 'always',
    retry: 0,
    mutationFn: async (envelope: FrozenCampaignEnvelope) => {
      const response = await submitStoryJson(envelope);
      return { response, envelope };
    },
    onSuccess: async ({ response }) => {
      if (response.status === 409) {
        saved.current = null;
        setRetry(false);
        onSnapshot(await readStorySnapshot(storyId));
        setMessage(
          'The saved state changed or these settings are locked. Review the latest state.',
        );
        return;
      }
      if (response.status === 400) {
        saved.current = null;
        setRetry(false);
        setMessage(
          'These values are not supported. Review the settings and try again.',
        );
        return;
      }
      if (!response.ok) {
        setRetry(true);
        setMessage(
          'Could not confirm the result. Retry the same request or reload to recover saved state.',
        );
        return;
      }
      onSnapshot(await readSnapshotFromResponse(response));
      saved.current = null;
      setRetry(false);
      setMessage('Saved.');
    },
    onError: () => {
      setRetry(true);
      setMessage(
        'Could not confirm the result. Retry the same request or reload to recover saved state.',
      );
    },
  });

  function send(route?: string, body?: unknown) {
    if (mutation.isPending || (route && saved.current)) {
      return;
    }
    if (route) {
      saved.current = {
        url: `/api/stories/${storyId}/${route}/${crypto.randomUUID()}`,
        body,
      };
      setRetry(false);
    }
    if (!saved.current) {
      return;
    }
    setMessage('');
    mutation.mutate(saved.current);
  }

  return {
    send,
    busy: mutation.isPending,
    message,
    retry: retry && saved.current !== null,
  };
}
