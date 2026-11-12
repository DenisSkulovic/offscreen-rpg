import { QueryClient } from '@tanstack/react-query';
import {
  browserQueryClientConfig,
  serverQueryClientConfig,
} from './query-defaults';

/** One browser QueryClient per authenticated session (constructed in the provider). */
export function createBrowserQueryClient() {
  return new QueryClient(browserQueryClientConfig());
}

/**
 * Always allocate a fresh server QueryClient per SSR request.
 * Never cache this at module scope — that would share private data across viewers.
 */
export function createServerQueryClient() {
  return new QueryClient(serverQueryClientConfig());
}
