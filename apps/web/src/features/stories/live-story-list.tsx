'use client';

import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { flattenUniqueById } from '@/src/shared/api/list-page';
import { storiesListInfiniteOptions } from '@/src/shared/api/stories-list-query';

export function LiveStoryList({ viewerId }: { viewerId: string }) {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useInfiniteQuery(storiesListInfiniteOptions(viewerId));
  const items = flattenUniqueById(data?.pages);
  const pending = isPending || isFetchingNextPage;

  return (
    <section aria-label="Live stories">
      <h2>Your live stories</h2>
      {items.length === 0 && !isPending ? (
        <p>No live stories yet. Review an opening and choose Start.</p>
      ) : null}
      {items.map((story) => (
        <article key={story.id}>
          <h3>
            <Link href={`/play/${story.id}`}>{story.title}</Link>
          </h3>
          <p>
            {story.storyteller?.name ?? 'Scripted story'} · {story.status}
          </p>
        </article>
      ))}
      {hasNextPage ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (isFetchingNextPage) {
              return;
            }
            void fetchNextPage();
          }}
        >
          Older stories
        </button>
      ) : items.length > 0 ? (
        <p role="status">End of live stories.</p>
      ) : null}
      {error ? (
        <p role="status">Stories could not be loaded. Try again.</p>
      ) : null}
    </section>
  );
}
