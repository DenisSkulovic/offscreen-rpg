import { classifyNestStatus } from '@/src/shared/api/classify-nest-status';

export type ReadRecoveryKind =
  'unauthorized' | 'not_found' | 'transient' | 'unknown';

/** Map a thrown/read failure to distinct recovery copy — never treat 503 as deleted. */
export function classifyReadRecovery(error: unknown): {
  kind: ReadRecoveryKind;
  status: number | null;
} {
  const status =
    error instanceof Error && 'status' in error
      ? Number((error as Error & { status?: number }).status)
      : NaN;
  if (!Number.isFinite(status)) {
    return { kind: 'unknown', status: null };
  }
  const classified = classifyNestStatus(status);
  if (classified.kind === 'unauthorized') {
    return { kind: 'unauthorized', status };
  }
  if (classified.kind === 'not_found') {
    return { kind: 'not_found', status };
  }
  if (classified.kind === 'transient') {
    return { kind: 'transient', status };
  }
  return { kind: 'unknown', status };
}

export function readRecoveryCopy(
  kind: ReadRecoveryKind,
  resource: 'story' | 'account' | 'page',
): { title: string; body: string; action: string } {
  if (kind === 'unauthorized') {
    return {
      title: 'Sign in required',
      body: 'Your session expired. Sign in again to continue. No command was sent.',
      action: 'Sign in',
    };
  }
  if (kind === 'not_found') {
    const noun =
      resource === 'story'
        ? 'story'
        : resource === 'account'
          ? 'account'
          : 'page';
    return {
      title: `This ${noun} is unavailable`,
      body: `It may not exist, or you may not have access. This is not a temporary outage.`,
      action: 'Back to stories',
    };
  }
  if (kind === 'transient') {
    return {
      title: 'Temporary interruption',
      body: 'The saved scene could not be refreshed right now. Retry does not send a paid command.',
      action: 'Try again',
    };
  }
  return {
    title: 'Something went wrong',
    body: 'Please try again. Retry does not send a paid command.',
    action: 'Try again',
  };
}
