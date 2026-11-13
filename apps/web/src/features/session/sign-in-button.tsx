'use client';

import { useState } from 'react';
import { authClient } from '@/src/lib/auth-client';
import {
  DEFAULT_SAFE_ENTRY,
  resolveSafeEntryDestination,
} from './safe-entry-destination';

export function SignInButton({
  next = DEFAULT_SAFE_ENTRY,
}: {
  next?: string;
}) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const callbackURL = resolveSafeEntryDestination(next);
  async function signIn() {
    setPending(true);
    setFailed(false);
    try {
      const result = await authClient.signIn.social({
        provider: 'github',
        callbackURL,
        errorCallbackURL: `/sign-in?error=signin&next=${encodeURIComponent(callbackURL)}`,
      });
      if (result.error) {
        setFailed(true);
        setPending(false);
      }
    } catch {
      setFailed(true);
      setPending(false);
    }
  }
  return (
    <>
      <button disabled={pending} onClick={() => void signIn()}>
        {pending ? 'Opening GitHub…' : 'Continue with GitHub'}
      </button>
      {failed && <p role="alert">Sign-in could not start. Please try again.</p>}
    </>
  );
}
