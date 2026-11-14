'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { exitAdminSession } from '@/src/lib/admin-transport';
import { clearAdminQueryCaches } from './admin-query-provider';
import { useQueryClient } from '@tanstack/react-query';

export function ExitAdminSessionButton() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  async function onExit() {
    setPending(true);
    try {
      await exitAdminSession();
    } finally {
      clearAdminQueryCaches(queryClient);
      router.replace('/control/enter');
      router.refresh();
    }
  }

  return (
    <button type="button" disabled={pending} onClick={() => void onExit()}>
      {pending ? 'Leaving…' : 'Exit Admin session'}
    </button>
  );
}
