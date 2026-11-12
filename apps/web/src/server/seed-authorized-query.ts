import 'server-only';
import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * Seed an SSR Query cache from a value already loaded through Nest route policy.
 * Do not put Nest reads that must throw redirect/notFound/transient inside
 * `prefetchQuery`'s queryFn — TanStack swallows those failures.
 */
export async function seedAuthorizedQuery<T>(
  queryClient: QueryClient,
  args: {
    queryKey: QueryKey;
    staleTime?: number;
  },
  data: T,
): Promise<T> {
  await queryClient.prefetchQuery({
    queryKey: args.queryKey,
    ...(args.staleTime !== undefined ? { staleTime: args.staleTime } : {}),
    queryFn: async () => data,
  });
  return data;
}
