import type { Decorator } from '@storybook/nextjs-vite';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserQueryClient } from '@/src/shared/api/query-client';

/**
 * Fresh QueryClient per story mount — never share private viewer cache across stories.
 * Tests assert createBrowserQueryClient identity isolation; this decorator is the runtime seam.
 */
export const withIsolatedQueryClient: Decorator = (Story) => {
  const queryClient = createBrowserQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <Story />
    </QueryClientProvider>
  );
};

/** Exported for Vitest negative proof that consecutive clients are distinct instances. */
export function allocateIsolatedQueryClients(count: number) {
  return Array.from({ length: count }, () => createBrowserQueryClient());
}
