'use client';
import { useRef, useState } from 'react';
import { storySnapshotSchema } from '@offscreen/contracts/stories';
import type { StorySnapshot } from '@offscreen/contracts/stories';
import { SessionRefresh } from '../stories/session-refresh';
import { StoryHistoryView } from './history';

export function Chamber({
  initial,
  initialId,
}: {
  initial: StorySnapshot | null;
  initialId: string | null;
}) {
  const [story, setStory] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const operation = useRef(initialId);
  async function start() {
    if (pending || story) return;
    operation.current ??= crypto.randomUUID();
    window.history.replaceState(null, '', `/chamber?id=${operation.current}`);
    setPending(true);
    setError('');
    try {
      const response = await fetch(
        `/api/stories/${operation.current}/chamber`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ scenario: 'chamber.v1' }),
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!response.ok) throw new Error('Unavailable');
      setStory(storySnapshotSchema.parse(await response.json()));
    } catch {
      setError(
        'Could not confirm the saved story. Retry the same request or reload. If your session expired, sign in again.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="editor">
      <SessionRefresh />
      <p className="eyebrow">Scripted testing chamber</p>
      <p>
        This tests saving and reopening a story. No AI calls. Choices,
        possessions and timers are not connected yet.
      </p>
      {story ? (
        <>
          <h1>{story.current.content.title}</h1>
          {story.current.content.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          {story.current.interaction && (
            <section aria-label="Offered interaction">
              <p>{story.current.interaction.specification.prompt}</p>
              {story.current.interaction.specification.options.map((option) => (
                <p key={option.id}>
                  <button disabled>{option.label}</button>
                </p>
              ))}
              <p>Options are saved data; answering them is the next slice.</p>
            </section>
          )}
          <details>
            <summary>Inspect saved state</summary>
            <dl>
              <dt>Story ID</dt>
              <dd>{story.id}</dd>
              <dt>Revision</dt>
              <dd>{story.revision}</dd>
              <dt>Passage ID</dt>
              <dd>{story.current.id}</dd>
              <dt>Interaction ID</dt>
              <dd>{story.current.interaction?.id ?? 'None'}</dd>
            </dl>
          </details>
          <p>Bookmark this URL to reopen the same story.</p>
          <StoryHistoryView key={story.id} storyId={story.id} />
          <a href="/chamber">Prepare a fresh chamber</a>
        </>
      ) : (
        <>
          <h1>A small persistent beginning.</h1>
          <button disabled={pending} onClick={() => void start()}>
            {pending ? 'Saving…' : 'Start scripted chamber'}
          </button>
        </>
      )}
      <p role="status">{error}</p>
      <p>
        <a href="/stories">Back to stories</a>
      </p>
    </main>
  );
}
