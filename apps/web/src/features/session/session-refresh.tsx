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
    if (!redirectOnExpiry || isPending || error || data) {
      return;
    }
    const path = `${window.location.pathname}${window.location.search}`;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch('/api/me', { credentials: 'include' });
        if (cancelled) {
          return;
        }
        if (response.ok) {
          return;
        }
        window.location.replace(signInHrefFor(path));
      } catch {
        if (!cancelled) {
          window.location.replace(signInHrefFor(path));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data, isPending, error, redirectOnExpiry]);
  return null;
}
