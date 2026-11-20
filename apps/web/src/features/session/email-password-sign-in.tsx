'use client';

import { useState } from 'react';
import { authClient } from '@/src/lib/auth-client';
import {
  DEFAULT_SAFE_ENTRY,
  resolveSafeEntryDestination,
} from './safe-entry-destination';
import { resolveSafeControlDestination } from '@/src/features/admin/safe-control-destination';
import { SignInButton } from './sign-in-button';

function resolveCallbackURL(next: string): string {
  if (next.startsWith('/control')) {
    return resolveSafeControlDestination(next);
  }
  return resolveSafeEntryDestination(next);
}

export function EmailPasswordSignIn({
  next = DEFAULT_SAFE_ENTRY,
  githubSignInAvailable = false,
}: {
  next?: string;
  githubSignInAvailable?: boolean;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const callbackURL = resolveCallbackURL(next);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFailed(false);
    try {
      const result =
        mode === 'sign-up'
          ? await authClient.signUp.email({
              email,
              password,
              name: email.split('@')[0] || 'Player',
              callbackURL,
            })
          : await authClient.signIn.email({
              email,
              password,
              callbackURL,
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
      <form onSubmit={(event) => void submit(event)}>
        <label>
          Email
          <input
            autoComplete="email"
            name="email"
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            autoComplete={
              mode === 'sign-up' ? 'new-password' : 'current-password'
            }
            name="password"
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button disabled={pending} type="submit">
          {pending
            ? 'Working…'
            : mode === 'sign-up'
              ? 'Create account'
              : 'Sign in with email'}
        </button>
      </form>
      <p>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
            setFailed(false);
          }}
        >
          {mode === 'sign-in'
            ? 'Need an account? Sign up'
            : 'Already have an account? Sign in'}
        </button>
      </p>
      {failed ? (
        <p role="alert">Email sign-in was not completed. You can try again.</p>
      ) : null}
      {githubSignInAvailable ? (
        <>
          <p>Or continue with GitHub</p>
          <SignInButton next={next} />
        </>
      ) : null}
    </>
  );
}