import type { QueryClientConfig } from '@tanstack/react-query';

export const QUERY_GC_TIME_MS = 300_000;

export const STALE = {
  storySnapshotMs: 5_000,
  draftOrListMs: 15_000,
  historyOrSettingsMs: 30_000,
  catalogueMs: 300_000,
  presetsMs: 60_000,
  chamberMs: 5_000,
} as const;

function isRetryableStatus(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const status = (error as Error & { status?: number }).status;
  return status === 502 || status === 503 || status === 504 || status === 0;
}

/** GET: at most one retry on network/502/503/504. Never retry auth/contract errors. */
export function shouldRetryQuery(
  failureCount: number,
  error: unknown,
): boolean {
  if (failureCount >= 1) return false;
  return isRetryableStatus(error);
}

export function browserQueryClientConfig(): QueryClientConfig {
  return {
    defaultOptions: {
      queries: {
        staleTime: STALE.draftOrListMs,
        gcTime: QUERY_GC_TIME_MS,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: shouldRetryQuery,
      },
      mutations: {
        retry: 0,
        networkMode: 'always',
      },
    },
  };
}

/** Per-request server client only — never module-global. */
export function serverQueryClientConfig(): QueryClientConfig {
  return {
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: QUERY_GC_TIME_MS,
        retry: false,
      },
    },
  };
}
