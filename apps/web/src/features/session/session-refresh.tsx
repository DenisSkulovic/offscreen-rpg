'use client';

import { useEffect } from 'react';
import { authClient } from '@/src/lib/auth-client';
import { signInHrefFor } from './safe-entry-destination';

export function SessionRefresh({
  redirectOnExpiry = true,
}: {
  redirectOnExpiry?: boolean;
}) {
  // Renew through a browser request so Set-Cookie reaches the browser, not only Next.
  const { data, isPending, error } = authClient.useSession();
  useEffect(() => {
    if (redirectOnExpiry && !isPending && !error && !data) {
      const path = `${window.location.pathname}${window.location.search}`;
      window.location.replace(signInHrefFor(path));
    }
  }, [data, isPending, error, redirectOnExpiry]);
  return null;
}
