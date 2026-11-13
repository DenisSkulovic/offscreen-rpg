'use client';

import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { flattenUniqueById } from '@/src/shared/api/list-page';
import { storiesListInfiniteOptions } from '@/src/shared/api/stories-list-query';
import './stories-library.css';

function featuredKicker(total: number): string {
  if (total === 1) return 'Your story';
  // List order alone is not attention ranking or “needs you.”
  return 'One of your stories';
}

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
  const verifiedEmpty = !isPending && !error && items.length === 0;
  const [featured, ...rest] = items;

  return (
    <section className="stories-library__section" aria-label="Live stories">
      <h2 className="stories-library__section-heading">Your lives</h2>
      {verifiedEmpty ? (
        <div className="stories-library__empty-block">
          <p className="stories-library__empty">
            Every story begins with a situation. Create a beginning, review an
            opening, then Start — fictional time waits until you enter.
          </p>
          <p className="stories-library__empty">
            Prefer a rehearsal first?{' '}
            <Link href="/demo">Try the public preview</Link> — scripted, no
            account charge.
          </p>
        </div>
      ) : null}
      {featured ? (
        <article className="stories-library__featured">
          <p className="stories-library__featured-kicker">
            {featuredKicker(items.length)}
          </p>
          <h3 className="stories-library__story-title">
            <Link href={`/play/${featured.id}`}>{featured.title}</Link>
          </h3>
          <p className="stories-library__meta">
            {featured.storyteller?.name ?? 'Scripted story'}
            {featured.status ? ` · ${featured.status}` : null}
          </p>
          <Link className="stories-library__enter" href={`/play/${featured.id}`}>
            Enter story
          </Link>
        </article>
      ) : null}
      {rest.length ? (
        <>
          <h3 className="stories-library__subsection-heading">Other lives</h3>
          <ul className="stories-library__list">
            {rest.map((story) => (
              <li className="stories-library__row" key={story.id}>
                <h3 className="stories-library__story-title">
                  <Link href={`/play/${story.id}`}>{story.title}</Link>
                </h3>
                <p className="stories-library__meta">
                  {story.storyteller?.name ?? 'Scripted story'}
                  {story.status ? ` · ${story.status}` : null}
                </p>
                <Link
                  className="stories-library__enter"
                  href={`/play/${story.id}`}
                >
                  Enter story
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {hasNextPage ? (
        <button
          type="button"
          className="stories-library__more"
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
        <p className="stories-library__status" role="status">
          End of live stories.
        </p>
      ) : null}
      {error ? (
        <p className="stories-library__status" role="alert">
          Stories could not be loaded. Try again. Drafts below may still work.
        </p>
      ) : null}
    </section>
  );
}
