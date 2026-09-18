'use client';

import { useEffect } from 'react';
import { authClient } from '@/src/lib/auth-client';

export function SessionRefresh({
  redirectOnExpiry = true,
}: {
  redirectOnExpiry?: boolean;
}) {
  // Renew through a browser request so Set-Cookie reaches the browser, not only Next.
  const { data, isPending, error } = authClient.useSession();
  useEffect(() => {
    if (redirectOnExpiry && !isPending && !error && !data)
      window.location.replace('/sign-in');
  }, [data, isPending, error, redirectOnExpiry]);
  return null;
}
