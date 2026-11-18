'use client';

import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { draftsListInfiniteOptions } from '@/src/shared/api/drafts-list-query';
import { flattenUniqueById } from '@/src/shared/api/list-page';
import { Action } from '@/src/shared/ui/action';
import { SystemNotice } from '@/src/shared/ui/system-notice';
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
  const verifiedEmpty = !isPending && !error && items.length === 0;

  return (
    <section className="stories-library__section" aria-label="Story drafts">
      <h2 className="stories-library__section-heading">Continue creating</h2>
      {verifiedEmpty ? (
        <p className="stories-library__empty">
          No drafts yet. Start with a thought, a character, or a place — this is
          setup, not a live world.
        </p>
      ) : items.length > 0 ? (
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
              <Action
                kind="link"
                variant="secondary"
                className="stories-library__action"
                href={`/stories/${draft.id}`}
              >
                Continue creation
              </Action>
            </li>
          ))}
        </ul>
      ) : null}
      {isPending && items.length === 0 && !error ? (
        <SystemNotice tone="attention">Loading drafts.</SystemNotice>
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
          {isFetchingNextPage ? 'Loading…' : 'More drafts'}
        </Action>
      ) : items.length > 0 ? (
        <SystemNotice tone="attention">End of drafts.</SystemNotice>
      ) : null}
      {error ? (
        <SystemNotice tone="error">
          Drafts could not be loaded. Try again.
        </SystemNotice>
      ) : null}
    </section>
  );
}
