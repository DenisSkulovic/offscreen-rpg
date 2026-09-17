'use client';

import { useState } from 'react';
import { authClient } from '../auth-client';

export function SignOutButton() {
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
