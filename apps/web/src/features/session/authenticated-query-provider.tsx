'use client';

import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserQueryClient } from '@/src/shared/api/query-client';
import { clearStorySnapshotEpochs } from '@/src/shared/api/story-snapshot-write';

const LOGOUT_CHANNEL = 'offscreen-auth';

export function clearAuthenticatedQueryCaches(queryClient: {
  clear: () => void;
}) {
  queryClient.clear();
  clearStorySnapshotEpochs();
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

  return (
    <QueryClientProvider client={queryClient} key={viewerId}>
      {children}
    </QueryClientProvider>
  );
}

export { LOGOUT_CHANNEL };
