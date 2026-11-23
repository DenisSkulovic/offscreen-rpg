'use client';

import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { flattenUniqueById } from '@/src/shared/api/list-page';
import { storiesListInfiniteOptions } from '@/src/shared/api/stories-list-query';
import { Action } from '@/src/shared/ui/action';
import { SystemNotice } from '@/src/shared/ui/system-notice';
import '../stories-library.css';

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
            <Action kind="link" variant="quiet" href="/demo">
              Try the public preview
            </Action>{' '}
            — scripted, no account charge.
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
          <Action
            kind="link"
            variant="secondary"
            className="stories-library__action"
            href={`/play/${featured.id}`}
          >
            Enter story
          </Action>
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
                <Action
                  kind="link"
                  variant="secondary"
                  className="stories-library__action"
                  href={`/play/${story.id}`}
                >
                  Enter story
                </Action>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {isPending && items.length === 0 && !error ? (
        <SystemNotice tone="attention">Loading stories.</SystemNotice>
      ) : null}
      {hasNextPage ? (
        <Action
          kind="button"
          variant="quiet"
          className="stories-library__action"
          pending={isFetchingNextPage}
          disabled={pending && !isFetchingNextPage}
          onClick={() => {
            if (isFetchingNextPage) {
              return;
            }
            void fetchNextPage();
          }}
        >
          Older stories
        </Action>
      ) : items.length > 0 ? (
        <SystemNotice tone="attention">End of live stories.</SystemNotice>
      ) : null}
      {error ? (
        <SystemNotice tone="error">
          Stories could not be loaded. Try again. Drafts below may still work.
        </SystemNotice>
      ) : null}
    </section>
  );
}
