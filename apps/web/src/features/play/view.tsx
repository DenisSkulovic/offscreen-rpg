'use client';
import { CampaignPlay } from './campaign-play';
import { CampaignSettingsEditor } from './campaign-settings';
import { StoryHistoryView } from './history';
import { ResolutionRecovery } from './resolution-recovery';

import { useEffect, useRef, useState } from 'react';
import type { StorySnapshot } from '@offscreen/contracts/stories';
import { SessionRefresh } from '@/src/features/session/session-refresh';
import {
  preferNewerSnapshot,
  readSnapshotFromResponse,
  readStorySnapshot,
  submitStoryJson,
} from '@/src/lib/story-transport';

function journeyAction(waiting: NonNullable<StorySnapshot['waiting']>) {
  if (waiting.remainingMs === null) {
    return 'pause' as const;
  }
  return 'resume' as const;
}

function resolutionMessage(story: StorySnapshot) {
  if (!story.resolution) {
    return null;
  }
  const pendingAction =
    story.resolution.evidence === 'pending-action' &&
    story.campaign?.actionExecution;
  if (pendingAction) {
    if (story.resolution.state === 'uncertain') {
      return 'Private narration preparation has uncertain provider usage and is stopped. The accepted action is still in progress; its outcome, roll and effects are not current before the target.';
    }
    if (story.resolution.state === 'failed') {
      return 'Private narration preparation failed. The accepted action is still in progress; its outcome, roll and effects are not current before the target. Recovery can reuse the same frozen result after mechanics settle.';
    }
    if (story.resolution.state === 'blocked') {
      return 'Private narration is prepared but cannot publish before the accepted action settles.';
    }
    return 'The storyteller is preparing privately while the accepted action runs. No outcome, roll, effect or next choice is current before the target.';
  }
  const savedOutcome = story.campaign?.character
    ? 'The outcome and dice are saved. '
    : '';
  if (story.resolution.state === 'uncertain') {
    return `${savedOutcome}Provider usage is uncertain. Paid generation is stopped until it is reconciled; refreshing does not send another model request.`;
  }
  if (story.resolution.state === 'failed') {
    if (story.resolution.blocker?.kind === 'funding') {
      return `${savedOutcome}The generation allowance is unavailable. Your scene is unchanged.`;
    }
    if (story.resolution.blocker?.kind === 'usage-window') {
      return `${savedOutcome}This story has reached a renewable generation limit. Your scene is saved; retry after capacity returns.`;
    }
    if (story.resolution.blocker?.kind === 'authority') {
      return `${savedOutcome}Generation authorization changed before dispatch. Nothing was sent and your scene is unchanged.`;
    }
    if (story.resolution.blocker?.kind === 'task-input') {
      return `${savedOutcome}The required story context does not fit this generation policy. Retrying the unchanged request will not help.`;
    }
    if (story.resolution.blocker?.kind === 'provider-disabled') {
      return `${savedOutcome}Live generation is disabled. Your scene is unchanged.`;
    }
    if (story.campaign?.character) {
      return 'The outcome and dice are saved. Narration could not finish, and this spent operation cannot be repeated.';
    }
    return 'Continuation failed. Your intention is saved and the current scene is unchanged.';
  }
  if (story.resolution.state === 'blocked') {
    return `${savedOutcome}The saved continuation could not be published. Your current scene is unchanged.`;
  }
  if (story.campaign?.character) {
    return 'The outcome and dice are saved. The storyteller is preparing the next passage.';
  }
  return 'The storyteller is resolving this intention.';
}

export function PlayScene({ story: initial }: { story: StorySnapshot }) {
  const [story, setStory] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const operation = useRef<{ id: string; body: unknown } | null>(null);
  const controlOperation = useRef<{ id: string; body: unknown } | null>(null);
  const offer = story.current.interaction;
  const waiting = story.waiting;
  const storyId = story.id;
  const isResolving = story.resolution !== null;
  const canChoose = story.canRespond && offer !== null && !isResolving;
  const shouldPoll =
    story.resolution?.state === 'pending' ||
    story.resolution?.state === 'running' ||
    waiting != null ||
    story.campaign?.activity?.state === 'running' ||
    story.campaign?.actionExecution?.state === 'running' ||
    story.campaign?.holds.some(
      (hold) =>
        hold.kind === 'storyteller' || hold.kind === 'storyteller-intent',
    ) === true;

  function acceptSnapshot(next: StorySnapshot) {
    setStory((prior) => preferNewerSnapshot(prior, next));
  }

  useEffect(() => {
    if (!shouldPoll) {
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
  }, [shouldPoll, storyId]);

  async function control(action?: 'pause' | 'resume') {
    if (!waiting?.canControl || pending) {
      return;
    }
    if (!controlOperation.current) {
      if (!action) {
        return;
      }
      controlOperation.current = {
        id: crypto.randomUUID(),
        body: {
          intervalId: story.current.id,
          expectedControlRevision: waiting.controlRevision,
          action,
        },
      };
    } else if (action) {
      return;
    }
    setPending(true);
    setError('');
    try {
      const response = await submitStoryJson({
        url: `/api/stories/${story.id}/controls/${controlOperation.current.id}`,
        body: controlOperation.current.body,
      });
      if (response.status === 409) {
        acceptSnapshot(await readStorySnapshot(story.id));
        setError(
          'The wait changed or is already due. The current saved situation is shown.',
        );
      } else if (!response.ok) {
        throw new Error('Unavailable');
      } else {
        acceptSnapshot(await readSnapshotFromResponse(response));
      }
      controlOperation.current = null;
    } catch {
      setError(
        'Could not confirm the control. Retry the same request or reload to check saved progress.',
      );
    } finally {
      setPending(false);
    }
  }

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
      const response = await submitStoryJson({
        url: `/api/stories/${story.id}/resolutions/${operation.current.id}`,
        body: operation.current.body,
      });
      if (response.status === 409) {
        acceptSnapshot(await readStorySnapshot(story.id));
        operation.current = null;
        setError('The situation changed. The latest saved scene is shown.');
      } else if (!response.ok) {
        throw new Error('Unavailable');
      } else {
        acceptSnapshot(await readSnapshotFromResponse(response));
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
    <main className="story-demo play-screen">
      <SessionRefresh />
      <header className="story-header">
        <a href="/stories">← Stories</a>
        <span className="demo-label">
          {story.storyteller?.name ?? 'Storyteller'} ·{' '}
          {story.campaign?.worldTime.label ?? `revision ${story.revision}`}
        </span>
      </header>
      <div className="play-layout">
        <section className="play-main" aria-label="Current scene">
          <article className="story-scene">
            <p className="eyebrow">Current scene</p>
            <h1>{story.current.content.title}</h1>
            <div className="scene-prose">
              {story.current.content.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </article>
          {waiting ? (
            <section className="play-notice" aria-label="Journey timing">
              {waiting.remainingMs !== null ? (
                <p>
                  Journey paused. {Math.ceil(waiting.remainingMs / 1000)} real
                  seconds remain.
                </p>
              ) : (
                <p>
                  Still travelling. Arrival estimated at {waiting.dueAt}.
                  Reloading never restarts the wait.
                </p>
              )}
              <p>
                Fictional duration: {waiting.gameDurationMs / 60000} minutes.
                The saved deadline is authoritative.
              </p>
              {waiting.canControl ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void control(journeyAction(waiting))}
                >
                  {waiting.remainingMs === null ? 'Pause' : 'Resume'}
                </button>
              ) : null}
            </section>
          ) : null}
          {controlOperation.current ? (
            <button
              disabled={pending}
              type="button"
              onClick={() => void control()}
            >
              Retry control
            </button>
          ) : null}
          {offer && !story.campaign?.character ? (
            <section className="scene-choices" aria-label="Offered interaction">
              <p>{offer.specification.prompt}</p>
              {offer.specification.options.map((option) => (
                <article className="campaign-option" key={option.id}>
                  <button
                    type="button"
                    disabled={
                      pending || !canChoose || operation.current !== null
                    }
                    onClick={() => void respond(option.id)}
                  >
                    {option.label}
                  </button>
                  {option.description ? (
                    <p className="campaign-option-intention">
                      {option.description}
                    </p>
                  ) : null}
                  {option.risk ? (
                    <p className="campaign-option-risk">
                      <strong>Apparent risk:</strong> {option.risk}
                    </p>
                  ) : null}
                </article>
              ))}
              {operation.current ? (
                <button
                  disabled={pending}
                  type="button"
                  onClick={() => void respond()}
                >
                  Retry the same choice
                </button>
              ) : null}
            </section>
          ) : null}
          {status ? (
            <p className="scene-status" role="status">
              {status}
            </p>
          ) : null}
          <ResolutionRecovery story={story} onSnapshot={acceptSnapshot} />
          {story.campaign?.character ? (
            <CampaignPlay
              key={story.campaign.offer?.id ?? story.id}
              story={story}
              campaign={story.campaign}
              onSnapshot={acceptSnapshot}
            />
          ) : null}
        </section>
        <aside className="play-sidebar" aria-label="Story information">
          <StoryHistoryView storyId={story.id} />
          {story.campaign ? (
            <CampaignSettingsEditor
              key={story.campaign.settings.revision}
              story={story}
              campaign={story.campaign}
              onSnapshot={acceptSnapshot}
            />
          ) : null}
          <details>
            <summary>Technical details</summary>
            <dl>
              {story.usage ? (
                <>
                  <dt>Settled model usage (USD)</dt>
                  <dd>
                    {(Number(story.usage.settledMicrousd) / 1000000).toFixed(6)}
                  </dd>
                  <dt>Reserved pending usage (USD)</dt>
                  <dd>
                    {(Number(story.usage.reservedMicrousd) / 1000000).toFixed(
                      6,
                    )}
                  </dd>
                </>
              ) : null}
              <dt>Story ID</dt>
              <dd>{story.id}</dd>
              <dt>Revision</dt>
              <dd>{story.revision}</dd>
              <dt>Passage ID</dt>
              <dd>{story.current.id}</dd>
            </dl>
          </details>
        </aside>
      </div>
    </main>
  );
}
