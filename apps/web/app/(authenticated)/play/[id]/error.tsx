'use client';

import { RouteErrorRecovery } from '@/src/features/recovery/route-recovery';

export default function PlayError({
  error,
  reset,
}: {
  error: Error & { digest?: string; status?: number; kind?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorRecovery error={error} reset={reset} resource="story" />
  );
}
