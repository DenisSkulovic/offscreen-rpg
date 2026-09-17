'use client';

import { useEffect, useRef, useState } from 'react';
import type { StorySnapshot } from '@offscreen/contracts/stories';
import { storySnapshotSchema } from '@offscreen/contracts/stories';
import { SessionRefresh } from '../../stories/session-refresh';

const requestTimeoutMs = 10000;

function preferNewerSnapshot(prior: StorySnapshot, next: StorySnapshot) {
  if (next.viewVersion >= prior.viewVersion) {
    return next;
  }
  return prior;
}

async function readStorySnapshot(storyId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/stories/${storyId}`, {
    cache: 'no-store',
    signal:
      signal === undefined
        ? AbortSignal.timeout(requestTimeoutMs)
        : AbortSignal.any([signal, AbortSignal.timeout(requestTimeoutMs)]),
  });
  if (!response.ok) {
    throw new Error('Unavailable');
  }
  return storySnapshotSchema.parse(await response.json());
}

function resolutionMessage(story: StorySnapshot) {
  if (!story.resolution) {
    return null;
  }
  if (story.resolution.state === 'failed') {
    return 'Continuation failed. The current scene is unchanged.';
  }
  if (story.resolution.state === 'uncertain') {
    return 'The continuation outcome is uncertain. Retry the same request or reload the saved story.';
  }
  return 'The storyteller is resolving this intention.';
}

export function PlayScene({ story: initial }: { story: StorySnapshot }) {
  const [story, setStory] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const operation = useRef<{ id: string; body: unknown } | null>(null);
  const offer = story.current.interaction;
  const storyId = story.id;
  const isResolving = story.resolution !== null;
  const canChoose = story.canRespond && offer !== null && !isResolving;

  function acceptSnapshot(next: StorySnapshot) {
    setStory((prior) => preferNewerSnapshot(prior, next));
  }

  useEffect(() => {
    if (!isResolving) {
      return;
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const latest = await readStorySnapshot(storyId, controller.signal);
        if (!controller.signal.aborted) {
          setStory((prior) => preferNewerSnapshot(prior, latest));
        }
      } catch {
        /* Failed reads never advance the story; reopening also recovers it. */
      }
      if (!controller.signal.aborted) {
        timer = setTimeout(() => void refresh(), 2000);
      }
    }
    timer = setTimeout(() => void refresh(), 2000);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [isResolving, storyId]);

  async function respond(optionId?: string) {
    if (!offer || pending) {
      return;
    }
    if (!operation.current) {
      if (!optionId || !canChoose) {
        return;
      }
      operation.current = {
        id: crypto.randomUUID(),
        body: {
          expectedRevision: story.revision,
          submission: {
            interactionId: offer.id,
            answer: { kind: 'choice.v1', optionId },
          },
        },
      };
    } else if (optionId) {
      return;
    }
    setPending(true);
    setError('');
    try {
      const response = await fetch(
        `/api/stories/${story.id}/resolutions/${operation.current.id}`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(operation.current.body),
          signal: AbortSignal.timeout(requestTimeoutMs),
        },
      );
      if (response.status === 409) {
        acceptSnapshot(await readStorySnapshot(story.id));
        operation.current = null;
        setError('The situation changed. The latest saved scene is shown.');
      } else if (!response.ok) {
        throw new Error('Unavailable');
      } else {
        acceptSnapshot(storySnapshotSchema.parse(await response.json()));
        operation.current = null;
      }
    } catch {
      setError(
        'Could not confirm this choice. Retry the same request or reload to check saved progress.',
      );
    } finally {
      setPending(false);
    }
  }

  const status = error || resolutionMessage(story);

  return (
    <main className="editor">
      <SessionRefresh />
      <p className="eyebrow">Offscreen RPG · Live story</p>
      <h1>{story.current.content.title}</h1>
      {story.current.content.paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
      {offer ? (
        <section aria-label="Offered interaction">
          <p>{offer.specification.prompt}</p>
          {offer.specification.options.map((option) => (
            <p key={option.id}>
              <button
                type="button"
                disabled={pending || !canChoose || operation.current !== null}
                onClick={() => void respond(option.id)}
              >
                {option.label}
              </button>
            </p>
          ))}
          {operation.current ? (
            <button disabled={pending} onClick={() => void respond()}>
              Retry the same choice
            </button>
          ) : null}
        </section>
      ) : null}
      {status ? <p role="status">{status}</p> : null}
      <details>
        <summary>Inspect saved state</summary>
        <dl>
          <dt>Story ID</dt>
          <dd>{story.id}</dd>
          <dt>Revision</dt>
          <dd>{story.revision}</dd>
          <dt>Passage ID</dt>
          <dd>{story.current.id}</dd>
        </dl>
      </details>
      <p>Bookmark this URL to reopen the same story.</p>
      <p>
        <a href="/stories">Back to stories</a>
      </p>
    </main>
  );
}
