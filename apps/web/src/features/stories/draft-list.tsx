'use client';

import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { draftsListInfiniteOptions } from '@/src/shared/api/drafts-list-query';
import { flattenUniqueById } from '@/src/shared/api/list-page';

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
    <section aria-label="Story drafts">
      {items.length === 0 && !isPending ? (
        <p>No stories yet. Start with a thought, a character, or a place.</p>
      ) : (
        <ul className="draft-list">
          {items.map((draft) => (
            <li key={draft.id}>
              <Link href={`/stories/${draft.id}`}>
                {draft.title.trim() || 'Untitled draft'}
              </Link>
              <p>{draft.premise.slice(0, 180) || 'An unwritten beginning.'}</p>
            </li>
          ))}
        </ul>
      )}
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
          {isFetchingNextPage ? 'Loading…' : 'More drafts'}
        </button>
      ) : items.length > 0 ? (
        <p role="status">End of drafts.</p>
      ) : null}
      {error ? (
        <p role="alert">Couldn’t load more drafts. Please try again.</p>
      ) : null}
    </section>
  );
}
