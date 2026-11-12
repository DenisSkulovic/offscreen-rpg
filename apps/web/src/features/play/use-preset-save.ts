'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreativeSettings } from '@offscreen/contracts/campaign';
import { queryKeys } from '@/src/shared/api/query-keys';
import {
  storytellerPresetSchema,
  type StorytellerPreset,
} from '@/src/shared/api/settings-query';
import { submitStoryJson } from '@/src/lib/story-transport';

export type FrozenPresetSave = {
  id: string;
  body: { name: string; creative: CreativeSettings };
};

export type PresetSaveResult =
  | { kind: 'saved'; preset: StorytellerPreset }
  | { kind: 'unauthorized' }
  | { kind: 'unavailable' };

async function putPresetFrozen(
  frozen: FrozenPresetSave,
  signal?: AbortSignal,
): Promise<PresetSaveResult> {
  const response = await submitStoryJson({
    url: `/api/stories/presets/${frozen.id}`,
    body: frozen.body,
    signal,
  });
  if (response.status === 401) {
    return { kind: 'unauthorized' };
  }
  if (!response.ok) {
    return { kind: 'unavailable' };
  }
  return {
    kind: 'saved',
    preset: storytellerPresetSchema.parse(await response.json()),
  };
}

/** Immutable private-preset save; retries reuse the frozen UUID/body. */
export function usePresetSave(viewerId: string) {
  const queryClient = useQueryClient();
  const frozenRef = useRef<FrozenPresetSave | null>(null);
  const [needsRetry, setNeedsRetry] = useState(false);
  const [message, setMessage] = useState('');

  const mutation = useMutation({
    mutationKey: ['viewer', viewerId, 'preset-save'],
    networkMode: 'always',
    retry: 0,
    mutationFn: (frozen: FrozenPresetSave) => putPresetFrozen(frozen),
    onSuccess: (result) => {
      if (result.kind === 'saved') {
        frozenRef.current = null;
        setNeedsRetry(false);
        setMessage('Private preset saved.');
        void queryClient.invalidateQueries({
          queryKey: queryKeys.presets(viewerId),
        });
        return;
      }
      if (result.kind === 'unauthorized') {
        frozenRef.current = null;
        setNeedsRetry(false);
        setMessage('Sign in again, then retry.');
        return;
      }
      setNeedsRetry(true);
      setMessage(
        'Could not confirm preset save. The next save retries the same captured values.',
      );
    },
    onError: () => {
      setNeedsRetry(true);
      setMessage(
        'Could not confirm preset save. The next save retries the same captured values.',
      );
    },
  });

  function save(args: { name: string; creative: CreativeSettings }) {
    if (mutation.isPending) {
      return;
    }
    frozenRef.current ??= {
      id: crypto.randomUUID(),
      body: { name: args.name, creative: args.creative },
    };
    setNeedsRetry(false);
    setMessage('');
    mutation.mutate(frozenRef.current);
  }

  function retry() {
    if (!frozenRef.current || mutation.isPending) {
      return;
    }
    setMessage('');
    mutation.mutate(frozenRef.current);
  }

  return {
    save,
    retry,
    busy: mutation.isPending,
    canRetry: needsRetry && frozenRef.current != null,
    message,
    frozenId: frozenRef.current?.id ?? null,
  };
}
