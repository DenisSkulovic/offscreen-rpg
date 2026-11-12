'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/src/shared/api/query-keys';
import { openStoryUpdateStream } from '@/src/shared/api/story-update-stream';

/**
 * Play SSE → Query bridge: one EventSource per viewed story.
 * Hints only invalidate the scoped snapshot key; GET remains authoritative.
 */
export function useStoryLiveUpdates(args: {
  viewerId: string;
  storyId: string;
}) {
  const queryClient = useQueryClient();
  const [healthy, setHealthy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let pendingInvalidate = false;
    const key = queryKeys.storySnapshot(args.viewerId, args.storyId);

    function invalidateScopedSnapshot() {
      if (cancelled) {
        return;
      }
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'hidden'
      ) {
        pendingInvalidate = true;
        return;
      }
      pendingInvalidate = false;
      void queryClient.invalidateQueries({ queryKey: key });
    }

    function onVisibility() {
      if (cancelled) {
        return;
      }
      if (document.visibilityState !== 'visible') {
        return;
      }
      if (pendingInvalidate) {
        pendingInvalidate = false;
        void queryClient.invalidateQueries({ queryKey: key });
      }
    }

    document.addEventListener('visibilitychange', onVisibility);

    let stream: ReturnType<typeof openStoryUpdateStream> | null = null;
    try {
      stream = openStoryUpdateStream({
        storyId: args.storyId,
        onOpen: () => {
          if (cancelled) {
            return;
          }
          setHealthy(true);
          invalidateScopedSnapshot();
        },
        onHint: () => {
          invalidateScopedSnapshot();
        },
        onError: () => {
          if (!cancelled) {
            setHealthy(false);
          }
        },
      });
    } catch {
      setHealthy(false);
    }

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      stream?.close();
      setHealthy(false);
    };
  }, [args.viewerId, args.storyId, queryClient]);

  return { healthy };
}
