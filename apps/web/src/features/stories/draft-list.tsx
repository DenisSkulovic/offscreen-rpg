'use client';

import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { draftsListInfiniteOptions } from '@/src/shared/api/drafts-list-query';
import { flattenUniqueById } from '@/src/shared/api/list-page';
import './stories-library.css';

export function DraftList({ viewerId }: { viewerId: string }) {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useInfiniteQuery(draftsListInfiniteOptions(viewerId));
  const items = flattenUniqueById(data?.pages);
  const pending = isPending || isFetchingNextPage;

  return (
    <section className="stories-library__section" aria-label="Story drafts">
      <h2 className="stories-library__section-heading">Drafts in creation</h2>
      {items.length === 0 && !isPending ? (
        <p className="stories-library__empty">
          No drafts yet. Start with a thought, a character, or a place — this is
          setup, not a live world.
        </p>
      ) : (
        <ul className="stories-library__list">
          {items.map((draft) => (
            <li className="stories-library__row" key={draft.id}>
              <h3 className="stories-library__story-title">
                <Link href={`/stories/${draft.id}`}>
                  {draft.title.trim() || 'Untitled draft'}
                </Link>
              </h3>
              <p className="stories-library__meta">
                {draft.premise.slice(0, 180) || 'An unwritten beginning.'}
              </p>
              <Link
                className="stories-library__enter"
                href={`/stories/${draft.id}`}
              >
                Continue creation
              </Link>
            </li>
          ))}
        </ul>
      )}
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
          {isFetchingNextPage ? 'Loading…' : 'More drafts'}
        </button>
      ) : items.length > 0 ? (
        <p className="stories-library__status" role="status">
          End of drafts.
        </p>
      ) : null}
      {error ? (
        <p className="stories-library__status" role="alert">
          Couldn’t load more drafts. Please try again.
        </p>
      ) : null}
    </section>
  );
}
