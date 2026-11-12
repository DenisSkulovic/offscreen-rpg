'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserQueryClient } from '@/src/shared/api/query-client';
import { clearStorySnapshotEpochs } from '@/src/shared/api/story-snapshot-write';

const LOGOUT_CHANNEL = 'offscreen-auth';

export function flushAuthenticatedQueryCachesLocally(queryClient: {
  clear: () => void;
}) {
  queryClient.clear();
  clearStorySnapshotEpochs();
}

export function clearAuthenticatedQueryCaches(queryClient: {
  clear: () => void;
}) {
  flushAuthenticatedQueryCachesLocally(queryClient);
  if (typeof BroadcastChannel !== 'undefined') {
    new BroadcastChannel(LOGOUT_CHANNEL).postMessage({ type: 'logout' });
  }
}

export function AuthenticatedQueryProvider({
  viewerId,
  children,
}: {
  viewerId: string;
  children: ReactNode;
}) {
  const [queryClient] = useState(() => createBrowserQueryClient());

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') {
      return;
    }
    const channel = new BroadcastChannel(LOGOUT_CHANNEL);
    channel.onmessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type !== 'logout') {
        return;
      }
      // Sibling tab: clear locally without re-broadcasting.
      flushAuthenticatedQueryCachesLocally(queryClient);
    };
    return () => {
      channel.close();
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient} key={viewerId}>
      {children}
    </QueryClientProvider>
  );
}

export { LOGOUT_CHANNEL };
