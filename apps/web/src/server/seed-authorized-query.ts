import 'server-only';
import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * Seed an SSR Query cache from a value already loaded through Nest route policy.
 * Do not put Nest reads that must throw redirect/notFound/transient inside
 * `prefetchQuery`'s queryFn — TanStack swallows those failures.
 */
export function seedAuthorizedQuery<T>(
  queryClient: QueryClient,
  args: {
    queryKey: QueryKey;
  },
  data: T,
): T {
  queryClient.setQueryData(args.queryKey, data);
  return data;
}
