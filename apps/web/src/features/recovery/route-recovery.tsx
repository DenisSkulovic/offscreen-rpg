'use client';

import { useEffect, useRef } from 'react';
import {
  classifyReadRecovery,
  readRecoveryCopy,
  type ReadRecoveryKind,
} from './read-error';

export function RouteRecoveryPanel({
  kind,
  resource = 'page',
  onRetry,
  href,
}: {
  kind: ReadRecoveryKind;
  resource?: 'story' | 'account' | 'page';
  onRetry?: () => void;
  href?: string;
}) {
  const actionRef = useRef<HTMLElement | null>(null);
  const copy = readRecoveryCopy(kind, resource);
  const canRetry = kind === 'transient' || kind === 'unknown';

  useEffect(() => {
    actionRef.current?.focus();
  }, [kind]);

  return (
    <main className="route-recovery" aria-labelledby="route-recovery-title">
      <h1 id="route-recovery-title">{copy.title}</h1>
      <p role="alert">{copy.body}</p>
      {kind === 'unauthorized' ? (
        <a
          ref={(node) => {
            actionRef.current = node;
          }}
          className="button"
          href={href ?? '/sign-in'}
        >
          {copy.action}
        </a>
      ) : kind === 'not_found' ? (
        <a
          ref={(node) => {
            actionRef.current = node;
          }}
          className="button"
          href={href ?? '/stories'}
        >
          {copy.action}
        </a>
      ) : canRetry && onRetry ? (
        <button
          ref={(node) => {
            actionRef.current = node;
          }}
          type="button"
          onClick={onRetry}
        >
          {copy.action}
        </button>
      ) : (
        <a
          ref={(node) => {
            actionRef.current = node;
          }}
          className="button"
          href={href ?? '/stories'}
        >
          Back to stories
        </a>
      )}
    </main>
  );
}

/** Next App Router error.tsx helper: NestTransientError → transient; else unknown. */
export function RouteErrorRecovery({
  error,
  reset,
  resource = 'page',
}: {
  error: Error & { digest?: string; status?: number; kind?: string };
  reset: () => void;
  resource?: 'story' | 'account' | 'page';
}) {
  const classified =
    error.kind === 'transient' || typeof error.status === 'number'
      ? classifyReadRecovery(error)
      : { kind: 'unknown' as const, status: null };
  return (
    <RouteRecoveryPanel
      kind={classified.kind}
      resource={resource}
      onRetry={reset}
    />
  );
}
