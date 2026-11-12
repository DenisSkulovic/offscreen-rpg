import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { StorySnapshot } from '@offscreen/contracts/stories';
import { queryKeys } from '@/src/shared/api/query-keys';
import { createBrowserQueryClient } from '@/src/shared/api/query-client';

export function renderWithStoryQuery(
  ui: (args: { viewerId: string; storyId: string }) => ReactNode,
  story: StorySnapshot,
  viewerId = 'viewer-test',
) {
  const queryClient = createBrowserQueryClient();
  queryClient.setQueryData(queryKeys.storySnapshot(viewerId, story.id), story);
  return {
    queryClient,
    element: (
      <QueryClientProvider client={queryClient}>
        {ui({ viewerId, storyId: story.id })}
      </QueryClientProvider>
    ),
  };
}

export function seedStoryQuery(
  queryClient: QueryClient,
  viewerId: string,
  story: StorySnapshot,
) {
  queryClient.setQueryData(queryKeys.storySnapshot(viewerId, story.id), story);
}
