'use client';

import { useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { flattenUniqueById } from '@/src/shared/api/list-page';
import { queryKeys } from '@/src/shared/api/query-keys';
import { storyHistoryInfiniteOptions } from '@/src/shared/api/story-history-query';

export function StoryHistoryView({
  viewerId,
  storyId,
}: {
  viewerId: string;
  storyId: string;
}) {
  const queryClient = useQueryClient();
  const [opened, setOpened] = useState(false);
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    isLoading,
  } = useInfiniteQuery({
    ...storyHistoryInfiniteOptions(viewerId, storyId),
    enabled: opened,
  });
  const items = flattenUniqueById(data?.pages);
  // Disabled queries stay isPending without data; only busy after the user opens.
  const pending = isFetchingNextPage || (opened && (isLoading || isFetching));

  return (
    <section
      className="story-history"
      aria-label="Saved chronology"
      aria-busy={pending}
    >
      <h2>Chronology</h2>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!opened) {
            setOpened(true);
            return;
          }
          void queryClient.resetQueries({
            queryKey: queryKeys.storyHistory(viewerId, storyId),
          });
        }}
      >
        {opened ? 'Show latest passages' : 'Read saved passages'}
      </button>
      {opened ? (
        <>
          <p>
            Newest first. Earlier choices are history, not buttons to play
            again.
          </p>
          {!pending && items.length === 0 ? (
            <p>No passages in this range.</p>
          ) : null}
          {items.map((entry) => (
            <article key={entry.id}>
              <h3>
                {entry.sequence}. {entry.content.title}
              </h3>
              {entry.content.paragraphs.map((text, index) => (
                <p key={index}>{text}</p>
              ))}
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
              Read older passages
            </button>
          ) : items.length > 0 ? (
            <p role="status">End of saved passages.</p>
          ) : null}
        </>
      ) : null}
      {error ? (
        <p role="status">
          History could not be loaded. Try again; if your session expired, sign
          in again.
        </p>
      ) : null}
    </section>
  );
}
