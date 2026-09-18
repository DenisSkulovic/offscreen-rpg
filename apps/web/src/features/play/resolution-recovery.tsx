'use client';
import { useRef, useState } from 'react';
import type { StorySnapshot } from '@offscreen/contracts/stories';
import {
  readStorySnapshot,
  readSnapshotFromResponse,
  submitStoryJson,
} from '@/src/lib/story-transport';

export function ResolutionRecovery({
  story,
  onSnapshot,
}: {
  story: StorySnapshot;
  onSnapshot: (snapshot: StorySnapshot) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const retryId = useRef<string | null>(null);
  async function act(retry: boolean) {
    if (pending) {
      return;
    }
    setPending(true);
    setError('');
    try {
      if (retry) {
        retryId.current ??= crypto.randomUUID();
        const response = await submitStoryJson({
          url: `/api/stories/${story.id}/retries/${retryId.current}`,
          body: {},
        });
        if (!response.ok) {
          throw new Error('Retry unavailable');
        }
        onSnapshot(await readSnapshotFromResponse(response));
        retryId.current = null;
      } else {
        onSnapshot(await readStorySnapshot(story.id));
      }
    } catch {
      setError(
        'Could not confirm the request. Refresh the saved state or retry the same request.',
      );
    } finally {
      setPending(false);
    }
  }
  if (!story.resolution) {
    return null;
  }
  return (
    <section aria-label="Resolution recovery">
      <button disabled={pending} onClick={() => void act(false)}>
        Refresh saved state
      </button>
      {story.resolution.canRetry ? (
        <button disabled={pending} onClick={() => void act(true)}>
          Retry this intention
        </button>
      ) : null}
      {error ? <p role="status">{error}</p> : null}
    </section>
  );
}
