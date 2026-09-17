'use client';

import { useEffect } from 'react';
import { authClient } from '../auth-client';

export function SessionRefresh() {
  // Renew through a browser request so Set-Cookie reaches the browser, not only Next.
  const { data, isPending, error } = authClient.useSession();
  useEffect(() => {
    if (!isPending && !error && !data) window.location.replace('/sign-in');
  }, [data, isPending, error]);
  return null;
}
