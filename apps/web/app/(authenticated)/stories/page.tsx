import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { storyListSchema } from '@offscreen/contracts/stories';
import { draftListSchema } from '@offscreen/contracts/drafts';
import { LiveStoryList } from '@/src/features/stories/live-story-list';
import { DraftList } from '@/src/features/stories/draft-list';
import Link from 'next/link';
import { requireViewer } from '@/src/server/viewer';
import { readNestJson } from '@/src/server/nest-reader';
import { SignOutButton } from '@/src/features/session/sign-out-button';
import { SessionRefresh } from '@/src/features/session/session-refresh';
import { createServerQueryClient } from '@/src/shared/api/query-client';
import { storiesListInfiniteOptions } from '@/src/shared/api/stories-list-query';
import { draftsListInfiniteOptions } from '@/src/shared/api/drafts-list-query';

export default async function Stories() {
  const viewer = await requireViewer();
  const viewerId = viewer.user.id;
  const queryClient = createServerQueryClient();
  await Promise.all([
    queryClient.prefetchInfiniteQuery({
      ...storiesListInfiniteOptions(viewerId),
      queryFn: async ({ pageParam }) =>
        readNestJson(
          viewer,
          pageParam === null
            ? '/api/stories'
            : `/api/stories?before=${encodeURIComponent(pageParam)}`,
          storyListSchema,
        ),
    }),
    queryClient.prefetchInfiniteQuery({
      ...draftsListInfiniteOptions(viewerId),
      queryFn: async ({ pageParam }) =>
        readNestJson(
          viewer,
          pageParam === null
            ? '/api/drafts'
            : `/api/drafts?cursor=${encodeURIComponent(pageParam)}`,
          draftListSchema,
        ),
    }),
  ]);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main>
        <SessionRefresh />
        <p className="eyebrow">Offscreen RPG</p>
        <h1>Welcome, {viewer.user.name}.</h1>
        <Link className="button" href="/stories/new">
          New story
        </Link>
        <LiveStoryList viewerId={viewerId} />
        <DraftList viewerId={viewerId} />
        <SignOutButton />
      </main>
    </HydrationBoundary>
  );
}
