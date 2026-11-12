'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/src/lib/auth-client';
import { clearAuthenticatedQueryCaches } from './authenticated-query-provider';

export function SignOutButton() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  async function signOut() {
    setPending(true);
    setFailed(false);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setFailed(true);
        setPending(false);
        return;
      }
      clearAuthenticatedQueryCaches(queryClient);
      // Full navigation discards the client router's authenticated page cache.
      window.location.replace('/');
    } catch {
      setFailed(true);
      setPending(false);
    }
  }
  return (
    <>
      <button disabled={pending} onClick={() => void signOut()}>
        {pending ? 'Signing out…' : 'Sign out'}
      </button>
      {failed && (
        <p role="alert">Sign-out could not be completed. Please try again.</p>
      )}
    </>
  );
}
