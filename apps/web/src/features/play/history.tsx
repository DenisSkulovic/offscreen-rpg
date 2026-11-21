'use client';

import { useEffect, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { flattenUniqueById } from '@/src/shared/api/list-page';
import { queryKeys } from '@/src/shared/api/query-keys';
import { storyHistoricalSceneOptions } from '@/src/shared/api/story-historical-query';
import { storyHistoryInfiniteOptions } from '@/src/shared/api/story-history-query';
import { ForkHistoricalScene } from './fork-historical-scene';
import './ui/story-frame.css';

type HistoryItem = {
  id: string;
  sequence: number;
  content: { title: string; paragraphs: readonly string[] };
};

const EXCERPT_LIMIT = 80;

function excerpt(paragraph: string | undefined) {
  const trimmed = paragraph?.trim() ?? '';
  if (trimmed.length <= EXCERPT_LIMIT) return trimmed;
  return `${trimmed.slice(0, EXCERPT_LIMIT - 1)}…`;
}

function byPublication(items: readonly HistoryItem[]) {
  return [...items].sort((left, right) => left.sequence - right.sequence);
}

export function StoryHistoryView({
  viewerId,
  storyId,
}: {
  viewerId: string;
  storyId: string;
}) {
  const queryClient = useQueryClient();
  const [opened, setOpened] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [droppedSelection, setDroppedSelection] = useState(false);
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
  const pending = isFetchingNextPage || (opened && (isLoading || isFetching));
  const publication = byPublication(items);
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const selectedIndex = selected
    ? publication.findIndex((item) => item.id === selected.id)
    : -1;
  const previous = selectedIndex > 0 ? publication[selectedIndex - 1] : null;
  const next =
    selectedIndex >= 0 && selectedIndex < publication.length - 1
      ? publication[selectedIndex + 1]
      : null;
  const atOlderEdge = Boolean(
    selected && publication[0]?.id === selected.id,
  );
  const historicalQuery = useQuery({
    ...storyHistoricalSceneOptions(
      viewerId,
      storyId,
      selected?.sequence ?? 1,
    ),
    enabled: opened && selected !== null,
  });

  useEffect(() => {
    setOpened(false);
    setSelectedId(null);
    setDroppedSelection(false);
  }, [viewerId, storyId]);

  useEffect(() => {
    if (!opened || pending || selectedId === null) return;
    if (items.some((item) => item.id === selectedId)) return;
    setSelectedId(null);
    setDroppedSelection(true);
  }, [items, opened, pending, selectedId]);

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
          setSelectedId(null);
          void queryClient.resetQueries({
            queryKey: queryKeys.storyHistory(viewerId, storyId),
          });
        }}
      >
        {opened ? 'Show latest passages' : 'Read saved passages'}
      </button>
      {opened && !selected ? (
        <>
          <p className="story-frame__intention-support">
            Newest first. Open one saved passage to read it. Earlier choices
            are history, not buttons to play again.
          </p>
          {droppedSelection ? (
            <p className="story-frame__stage-status" role="status">
              That saved passage is no longer in the loaded history.
            </p>
          ) : null}
          {!pending && items.length === 0 ? (
            <p className="story-frame__intention-support">
              No passages in this range. A quiet stretch with no published
              events is legitimate — nothing is invented here.
            </p>
          ) : null}
          <ol className="story-frame__journal-list">
            {items.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className="story-frame__intention story-frame__intention--explore"
                  onClick={() => {
                    setDroppedSelection(false);
                    setSelectedId(entry.id);
                  }}
                >
                  {entry.sequence}. {entry.content.title}
                  <span className="story-frame__intention-support">
                    {excerpt(entry.content.paragraphs[0])}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {hasNextPage ? (
            <button
              type="button"
              className="story-frame__intention story-frame__intention--explore"
              disabled={pending}
              onClick={() => {
                if (isFetchingNextPage || !hasNextPage) return;
                void fetchNextPage();
              }}
            >
              Load older
            </button>
          ) : items.length > 0 ? (
            <p className="story-frame__intention-support" role="status">
              End of saved passages.
            </p>
          ) : null}
        </>
      ) : null}
      {selected ? (
        <article aria-label="Saved passage">
          <p className="story-frame__intention-support">
            Saved passage. This is not the current situation.
          </p>
          <h3 className="story-frame__passage-title" tabIndex={-1}>
            {selected.sequence}. {selected.content.title}
          </h3>
          <div className="story-frame__passage">
            {selected.content.paragraphs.map((text, index) => (
              <p key={index}>{text}</p>
            ))}
          </div>
          {historicalQuery.data ? (
            <p className="story-frame__intention-support">
              Frozen scene {historicalQuery.data.asOfSequence}. Items and facts
              are this checkpoint, not the live story.
              {historicalQuery.data.items.length
                ? ` ${historicalQuery.data.items
                    .map((item) => `${item.label} (${item.holderKey})`)
                    .join(', ')}.`
                : ''}
            </p>
          ) : null}
          {historicalQuery.isError ? (
            <p className="story-frame__intention-support">
              This saved scene is not an independent fork point.
            </p>
          ) : null}
          {historicalQuery.data ? (
            <ForkHistoricalScene
              sourceStoryId={storyId}
              scene={historicalQuery.data}
            />
          ) : null}
          <button
            type="button"
            className="story-frame__intention story-frame__intention--explore"
            disabled={!previous || pending}
            onClick={() => {
              if (!previous) return;
              setSelectedId(previous.id);
            }}
          >
            Previous saved passage
          </button>
          <button
            type="button"
            className="story-frame__intention story-frame__intention--explore"
            disabled={!next || pending}
            onClick={() => {
              if (!next) return;
              setSelectedId(next.id);
            }}
          >
            Next saved passage
          </button>
          {atOlderEdge && hasNextPage ? (
            <button
              type="button"
              className="story-frame__intention story-frame__intention--explore"
              disabled={pending}
              onClick={() => {
                if (isFetchingNextPage || !hasNextPage) return;
                void fetchNextPage();
              }}
            >
              Load older
            </button>
          ) : null}
          {atOlderEdge && !hasNextPage ? (
            <p className="story-frame__intention-support" role="status">
              End of saved passages.
            </p>
          ) : null}
          <button
            type="button"
            className="story-frame__intention story-frame__intention--explore"
            onClick={() => setSelectedId(null)}
          >
            Back to the overview
          </button>
        </article>
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
