'use client';
import Link from 'next/link';
import { useState } from 'react';
import { storyListSchema, type StoryList } from '@offscreen/contracts/stories';

export function LiveStoryList({ initial }: { initial: StoryList }) {
  const [page, setPage] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function older() {
    if (!page.nextBefore || pending) {
      return;
    }
    setPending(true);
    setError('');
    try {
      const response = await fetch(
        `/api/stories?before=${encodeURIComponent(page.nextBefore)}`,
        { cache: 'no-store', signal: AbortSignal.timeout(10000) },
      );
      if (!response.ok) {
        throw new Error('Unavailable');
      }
      setPage(storyListSchema.parse(await response.json()));
    } catch {
      setError('Stories could not be loaded. Try again.');
    } finally {
      setPending(false);
    }
  }
  return (
    <section aria-label="Live stories">
      <h2>Your live stories</h2>
      {page.items.length === 0 ? (
        <p>No live stories yet. Review an opening and choose Start.</p>
      ) : null}
      {page.items.map((story) => (
        <article key={story.id}>
          <h3>
            <Link href={`/play/${story.id}`}>{story.title}</Link>
          </h3>
          <p>
            {story.storyteller?.name ?? 'Legacy scripted story'} ·{' '}
            {story.status}
          </p>
        </article>
      ))}
      {page.nextBefore ? (
        <button disabled={pending} onClick={() => void older()}>
          Older stories
        </button>
      ) : null}
      {error ? <p role="status">{error}</p> : null}
    </section>
  );
}
