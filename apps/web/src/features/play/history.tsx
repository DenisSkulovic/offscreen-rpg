'use client';
import { useRef, useState } from 'react';
import {
  storyHistorySchema,
  type StoryHistory,
} from '@offscreen/contracts/stories';

export function StoryHistoryView({ storyId }: { storyId: string }) {
  const [page, setPage] = useState<StoryHistory | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  async function load(before?: number) {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError('');
    try {
      const query = before === undefined ? '' : `?before=${before}`;
      const response = await fetch(`/api/stories/${storyId}/history${query}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        throw new Error('Unavailable');
      }
      setPage(storyHistorySchema.parse(await response.json()));
    } catch {
      setError(
        'History could not be loaded. Try again; if your session expired, sign in again.',
      );
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  return (
    <section
      className="story-history"
      aria-label="Saved chronology"
      aria-busy={pending}
    >
      <h2>Chronology</h2>
      <button disabled={pending} onClick={() => void load()}>
        {page ? 'Show latest passages' : 'Read saved passages'}
      </button>
      {page && (
        <>
          <p>
            Newest first. Earlier choices are history, not buttons to play
            again.
          </p>
          {page.items.length === 0 && <p>No passages in this range.</p>}
          {page.items.map((entry) => (
            <article key={entry.id}>
              <h3>
                {entry.sequence}. {entry.content.title}
              </h3>
              {entry.content.paragraphs.map((text, index) => (
                <p key={index}>{text}</p>
              ))}
            </article>
          ))}
          {page.nextBefore !== null && (
            <button
              disabled={pending}
              onClick={() => {
                const olderThan = page.nextBefore;
                if (olderThan === null) {
                  return;
                }
                void load(olderThan);
              }}
            >
              Read older passages
            </button>
          )}
        </>
      )}
      <p role="status">{error}</p>
    </section>
  );
}
