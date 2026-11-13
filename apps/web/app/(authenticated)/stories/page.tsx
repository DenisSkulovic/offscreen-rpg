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
import '@/src/features/stories/stories-library.css';

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
      <main className="stories-library">
        <SessionRefresh />
        <p className="stories-library__brand">Offscreen RPG</p>
        <h1 className="stories-library__title">Welcome, {viewer.user.name}.</h1>
        <p className="stories-library__lede">
          Return to a life in progress, or continue shaping a draft. Live
          stories and unfinished creation stay separate.
        </p>
        <div className="stories-library__actions">
          <Link className="stories-library__cta" href="/stories/new">
            Create a story
          </Link>
        </div>
        <LiveStoryList viewerId={viewerId} />
        <DraftList viewerId={viewerId} />
        <div className="stories-library__sign-out">
          <SignOutButton />
        </div>
      </main>
    </HydrationBoundary>
  );
}
