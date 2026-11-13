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
        <header className="stories-library__chrome">
          <div className="stories-library__identity">
            <p className="stories-library__brand">Offscreen RPG</p>
            <p className="stories-library__viewer" title={viewer.user.name}>
              {viewer.user.name}
            </p>
          </div>
          <nav className="stories-library__nav" aria-label="Player home">
            <span aria-current="page">Your stories</span>
            <Link href="/stories/new">Create story</Link>
            <Link href="/demo">Try preview</Link>
          </nav>
          <div className="stories-library__account">
            <SignOutButton />
          </div>
        </header>
        <h1 className="stories-library__title">Your stories</h1>
        <p className="stories-library__lede">
          Return to a saved life, or continue shaping a draft. Live stories and
          unfinished creation stay separate. List status comes only from the
          server — nothing here invents progress.
        </p>
        <div className="stories-library__actions">
          <Link className="stories-library__cta" href="/stories/new">
            Create a story
          </Link>
          <Link className="stories-library__cta stories-library__cta--quiet" href="/demo">
            Try the public preview
          </Link>
        </div>
        <LiveStoryList viewerId={viewerId} />
        <DraftList viewerId={viewerId} />
      </main>
    </HydrationBoundary>
  );
}
