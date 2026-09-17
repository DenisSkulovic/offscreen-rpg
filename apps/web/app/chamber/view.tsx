'use client';
import { useEffect, useRef, useState } from 'react';
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
  const [scenario, setScenario] = useState('chamber.v3');
  const hasWaiting = story?.waiting != null;
  const storyId = story?.id;
  useEffect(() => {
    if (!hasWaiting || !storyId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const response = await fetch(`/api/stories/${storyId}`, {
          cache: 'no-store',
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(10000),
          ]),
        });
        if (!response.ok) throw new Error('Unavailable');
        const latest = storySnapshotSchema.parse(await response.json());
        if (!controller.signal.aborted)
          setStory((prior) =>
            !prior || latest.viewVersion >= prior.viewVersion ? latest : prior,
          );
      } catch {
        /* Failed reads never advance the story; reopening also recovers it. */
      }
      if (!controller.signal.aborted)
        timer = setTimeout(() => void refresh(), 2000);
    }
    timer = setTimeout(() => void refresh(), 2000);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [hasWaiting, storyId]);
  const responseOperation = useRef<{ id: string; body: unknown } | null>(null);
  function acceptSnapshot(next: StorySnapshot) {
    setStory((prior) =>
      !prior || next.viewVersion >= prior.viewVersion ? next : prior,
    );
  }
  const controlOperation = useRef<{ id: string; body: unknown } | null>(null);
  async function control(action?: 'pause' | 'resume') {
    if (!story || pending) return;
    if (!controlOperation.current) {
      if (!action || !story.waiting?.canControl) return;
      controlOperation.current = {
        id: crypto.randomUUID(),
        body: {
          intervalId: story.current.id,
          expectedControlRevision: story.waiting.controlRevision,
          action,
        },
      };
    } else if (action) return;
    setPending(true);
    setError('');
    try {
      const response = await fetch(
        `/api/stories/${story.id}/controls/${controlOperation.current.id}`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(controlOperation.current.body),
          signal: AbortSignal.timeout(10000),
        },
      );
      if (response.status === 409) {
        const latest = await fetch(`/api/stories/${story.id}`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(10000),
        });
        if (!latest.ok) throw new Error('Unavailable');
        acceptSnapshot(storySnapshotSchema.parse(await latest.json()));
        setError(
          'The wait changed or is already due. The current saved situation is shown.',
        );
      } else {
        if (!response.ok) throw new Error('Unavailable');
        acceptSnapshot(storySnapshotSchema.parse(await response.json()));
      }
      controlOperation.current = null;
    } catch {
      setError(
        'Could not confirm the control. Retry the same request or reload.',
      );
    } finally {
      setPending(false);
    }
  }
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
        acceptSnapshot(storySnapshotSchema.parse(await latest.json()));
        responseOperation.current = null;
        setError('The situation changed. The latest saved scene is shown.');
      } else {
        if (!response.ok) throw new Error('Unavailable');
        acceptSnapshot(storySnapshotSchema.parse(await response.json()));
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
          body: JSON.stringify({ scenario }),
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!response.ok) throw new Error('Unavailable');
      acceptSnapshot(storySnapshotSchema.parse(await response.json()));
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
        calls. A timed visit can be paused and resumed; pace controls and
        possessions are not connected yet.
      </p>
      {story ? (
        <>
          <h1>{story.current.content.title}</h1>
          {story.current.content.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          {story.waiting && (
            <section aria-label="Journey timing">
              {story.waiting.remainingMs !== null ? (
                <p>
                  Journey paused. {Math.ceil(story.waiting.remainingMs / 1000)}{' '}
                  real seconds remain.
                </p>
              ) : (
                <p>
                  Arrival estimated at {story.waiting.dueAt}. Processing may be
                  delayed while the worker is unavailable.
                </p>
              )}
              <p>
                Fictional duration: {story.waiting.gameDurationMs / 60000}{' '}
                minutes. Reloading never restarts the wait.
              </p>
              {story.waiting.canControl && (
                <button
                  disabled={pending || controlOperation.current !== null}
                  onClick={() =>
                    void control(
                      story.waiting!.remainingMs === null ? 'pause' : 'resume',
                    )
                  }
                >
                  {story.waiting.remainingMs === null
                    ? 'Pause journey'
                    : 'Resume journey'}
                </button>
              )}
            </section>
          )}
          {controlOperation.current && (
            <button disabled={pending} onClick={() => void control()}>
              Retry control
            </button>
          )}
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
          <label>
            Scenario{' '}
            <select
              value={scenario}
              disabled={pending || operation.current !== null}
              onChange={(event) => setScenario(event.target.value)}
            >
              <option value="chamber.v3">Timed cafe visit (20 seconds)</option>
              <option value="chamber.v2">Immediate gate conversation</option>
            </select>
          </label>
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
