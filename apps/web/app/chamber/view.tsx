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
  const responseOperation = useRef<{ id: string; body: unknown } | null>(null);
  async function respond(optionId?: string) {
    if (!story || pending || !story.canRespond || !story.current.interaction)
      return;
    if (!responseOperation.current) {
      if (!optionId) return;
      responseOperation.current = {
        id: crypto.randomUUID(),
        body: {
          expectedRevision: story.revision,
          submission: {
            interactionId: story.current.interaction.id,
            answer: { kind: 'choice.v1', optionId },
          },
        },
      };
    } else if (optionId) return;
    setPending(true);
    setError('');
    try {
      const response = await fetch(
        `/api/stories/${story.id}/responses/${responseOperation.current.id}`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(responseOperation.current.body),
          signal: AbortSignal.timeout(10000),
        },
      );
      if (response.status === 409) {
        const latest = await fetch(`/api/stories/${story.id}`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(10000),
        });
        if (!latest.ok) throw new Error('Unavailable');
        setStory(storySnapshotSchema.parse(await latest.json()));
        responseOperation.current = null;
        setError('The situation changed. The latest saved scene is shown.');
      } else {
        if (!response.ok) throw new Error('Unavailable');
        setStory(storySnapshotSchema.parse(await response.json()));
        responseOperation.current = null;
      }
    } catch {
      setError(
        'Could not confirm this choice. Retry the same choice or reload to check saved progress.',
      );
    } finally {
      setPending(false);
    }
  }
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
          body: JSON.stringify({ scenario: 'chamber.v2' }),
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
        A short branching story with saved choices and consequences. No AI
        calls. Travel time, possessions and background progression are not
        connected yet.
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
                  <button
                    disabled={
                      pending ||
                      !story.canRespond ||
                      responseOperation.current !== null
                    }
                    onClick={() => void respond(option.id)}
                  >
                    {option.label}
                  </button>
                </p>
              ))}
              {!story.canRespond && (
                <p>
                  This saved scenario does not support responses. Start a fresh
                  chamber to play.
                </p>
              )}
              {responseOperation.current && (
                <button disabled={pending} onClick={() => void respond()}>
                  Retry the same choice
                </button>
              )}
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
          <StoryHistoryView
            key={`${story.id}:${story.revision}`}
            storyId={story.id}
          />
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
