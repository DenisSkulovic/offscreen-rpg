/**
 * Deliberate negative fixture for W13. Checked by `pnpm lint:web:negatives`.
 */
'use client';

import { useQuery } from '@tanstack/react-query';

export function RestDestructureProbe({ storyId }: { storyId: string }) {
  // Rest-destructuring query results is rejected by TanStack Query lint.
  const { data, ...rest } = useQuery({
    queryKey: ['story', storyId],
    queryFn: async () => storyId,
  });
  return (
    <span>
      {data}
      {Object.keys(rest).length}
    </span>
  );
}
