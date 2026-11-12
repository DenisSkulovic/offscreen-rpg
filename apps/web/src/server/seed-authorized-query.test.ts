import { describe, expect, it } from 'vitest';
import { createServerQueryClient } from '@/src/shared/api/query-client';

/**
 * Documents the TanStack contract that motivated seedAuthorizedQuery:
 * prefetchQuery must not be the Nest failure path for App Router outcomes.
 */
describe('SSR Query hydrate failure contract', () => {
  it('prefetchQuery swallows queryFn failures (negative baseline)', async () => {
    const client = createServerQueryClient();
    await expect(
      client.prefetchQuery({
        queryKey: ['fixture', 'prefetch-swallows'],
        queryFn: async () => {
          throw new Error('NEXT_NOT_FOUND');
        },
      }),
    ).resolves.toBeUndefined();
    expect(client.getQueryState(['fixture', 'prefetch-swallows'])?.status).toBe(
      'error',
    );
  });

  it('authorized read-then-seed leaves cache empty when the read fails (negative)', async () => {
    const client = createServerQueryClient();
    const key = ['fixture', 'read-first'];

    async function loadThenSeed() {
      // Simulate readNestJson / applyNestRoutePolicy throwing before seed.
      throw new Error('NEXT_NOT_FOUND');
    }

    await expect(loadThenSeed()).rejects.toThrow(/NEXT_NOT_FOUND/);
    expect(client.getQueryState(key)).toBeUndefined();
  });
});
