'use client';

import { useState } from 'react';
import { authClient } from '@/src/lib/auth-client';

export function SignInButton() {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  async function signIn() {
    setPending(true);
    setFailed(false);
    try {
      const result = await authClient.signIn.social({
        provider: 'github',
        callbackURL: '/stories',
        errorCallbackURL: '/sign-in?error=signin',
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
