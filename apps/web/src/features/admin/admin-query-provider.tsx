'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserQueryClient } from '@/src/shared/api/query-client';

const ADMIN_LOGOUT_CHANNEL = 'offscreen-admin-auth';

export function flushAdminQueryCachesLocally(queryClient: { clear: () => void }) {
  queryClient.clear();
}

export function clearAdminQueryCaches(queryClient: { clear: () => void }) {
  flushAdminQueryCachesLocally(queryClient);
  if (typeof BroadcastChannel !== 'undefined') {
    new BroadcastChannel(ADMIN_LOGOUT_CHANNEL).postMessage({ type: 'admin-exit' });
  }
}

/**
 * Isolated Admin Query provider. Keyed by staff principal + epoch so a
 * different actor/revocation cannot reuse hydrated private cache.
 */
export function AdminQueryProvider({
  staffPrincipalId,
  accessEpoch,
  children,
}: {
  staffPrincipalId: string;
  accessEpoch: number;
  children: ReactNode;
}) {
  const [queryClient] = useState(() => createBrowserQueryClient());

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(ADMIN_LOGOUT_CHANNEL);
    channel.onmessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type !== 'admin-exit') return;
      flushAdminQueryCachesLocally(queryClient);
    };
    return () => {
      channel.close();
    };
  }, [queryClient]);

  return (
    <QueryClientProvider
      client={queryClient}
      key={`${staffPrincipalId}:${accessEpoch}`}
    >
      {children}
    </QueryClientProvider>
  );
}

export { ADMIN_LOGOUT_CHANNEL };
