'use client';

import { useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { flattenUniqueById } from '@/src/shared/api/list-page';
import { queryKeys } from '@/src/shared/api/query-keys';
import { storyHistoryInfiniteOptions } from '@/src/shared/api/story-history-query';
import './ui/story-frame.css';

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
      className="story-frame__journal"
      aria-label="Saved chronology"
      aria-busy={pending}
    >
      <h2 className="story-frame__threshold-heading">Chronology</h2>
      <p className="story-frame__intention-support">
        Published passages only. Browsing here does not advance fictional time
        or reopen past choices.
      </p>
      <button
        type="button"
        className="story-frame__intention story-frame__intention--explore"
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
          <p className="story-frame__intention-support">
            Newest first. Earlier choices are history, not buttons to play
            again.
          </p>
          {!pending && items.length === 0 ? (
            <p className="story-frame__intention-support">
              No passages in this range. A quiet stretch with no published
              events is legitimate — nothing is invented here.
            </p>
          ) : null}
          <ol className="story-frame__journal-list">
            {items.map((entry) => (
              <li key={entry.id}>
                <article className="story-frame__journal-entry">
                  <h3 className="story-frame__passage-title">
                    {entry.sequence}. {entry.content.title}
                  </h3>
                  <div className="story-frame__passage">
                    {entry.content.paragraphs.map((text, index) => (
                      <p key={index}>{text}</p>
                    ))}
                  </div>
                </article>
              </li>
            ))}
          </ol>
          {hasNextPage ? (
            <button
              type="button"
              className="story-frame__intention story-frame__intention--explore"
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
            <p className="story-frame__intention-support" role="status">
              End of saved passages.
            </p>
          ) : null}
        </>
      ) : null}
      {error ? (
        <p className="story-frame__stage-status" role="status">
          History could not be loaded. Try again; if your session expired, sign
          in again.
        </p>
      ) : null}
    </section>
  );
}
