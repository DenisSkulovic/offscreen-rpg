'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { enterAdminSession } from '@/src/lib/admin-transport';
import { resolveSafeControlDestination } from './safe-control-destination';

export function EnterAdminSessionButton({
  returnTo = '/control',
}: {
  returnTo?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const destination = resolveSafeControlDestination(returnTo);

  async function onEnter() {
    setPending(true);
    setError(null);
    try {
      await enterAdminSession();
      router.replace(destination === '/control/enter' ? '/control' : destination);
      router.refresh();
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : 'enter_failed';
      if (code === 'step_up_required') {
        setError(
          'Sign in again so Admin can verify a fresh login, then retry enter.',
        );
      } else if (code === 'not_authorized') {
        setError('This account is not enrolled as staff.');
      } else {
        setError('Admin session could not start.');
      }
      setPending(false);
    }
  }

  return (
    <div>
      <button type="button" disabled={pending} onClick={() => void onEnter()}>
        {pending ? 'Entering Offscreen Control…' : 'Enter Offscreen Control'}
      </button>
      {error ? (
        <p role="alert">{error}</p>
      ) : null}
    </div>
  );
}
