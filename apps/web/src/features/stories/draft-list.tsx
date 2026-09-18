'use client';

import Link from 'next/link';
import { useState } from 'react';
import { draftListSchema } from '@offscreen/contracts/drafts';
import type { Draft } from '@offscreen/contracts/drafts';

export function DraftList({
  initial,
}: {
  initial: { items: Draft[]; nextCursor: string | null };
}) {
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function more() {
    setPending(true);
    setError(false);
    try {
      const response = await fetch(`/api/drafts?cursor=${cursor}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('Unavailable');
      const page = draftListSchema.parse(await response.json());
      setItems((current) => [
        ...current,
        ...page.items.filter(
          (item) => !current.some((old) => old.id === item.id),
        ),
      ]);
      setCursor(page.nextCursor);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }
  return (
    <section aria-label="Story drafts">
      {items.length === 0 ? (
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
      {cursor && (
        <button disabled={pending} onClick={() => void more()}>
          {pending ? 'Loading…' : 'More drafts'}
        </button>
      )}
      {error && (
        <p role="alert">Couldn’t load more drafts. Please try again.</p>
      )}
    </section>
  );
}
