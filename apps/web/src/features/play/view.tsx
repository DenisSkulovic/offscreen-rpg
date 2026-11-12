'use client';
import { CampaignPlay } from './campaign-play';
import { CampaignSettingsEditor } from './campaign-settings';
import { StoryHistoryView } from './history';
import { ResolutionRecovery } from './resolution-recovery';
import { useControlCommand } from './use-control-command';
import { useResolutionCommand } from './use-resolution-command';
import { useStoryLiveUpdates } from './use-story-live-updates';

import { useEffect, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { StorySnapshot } from '@offscreen/contracts/stories';
import { SessionRefresh } from '@/src/features/session/session-refresh';
import {
  classifyReadRecovery,
} from '@/src/features/recovery/read-error';
import { RouteRecoveryPanel } from '@/src/features/recovery/route-recovery';
import { playStorySnapshotQueryOptions } from '@/src/shared/api/story-snapshot-query';
import {
  allocateStorySnapshotEpoch,
  writeStorySnapshot,
} from '@/src/shared/api/story-snapshot-write';

function subscribeOnline(onStoreChange: () => void) {
  window.addEventListener('online', onStoreChange);
  window.addEventListener('offline', onStoreChange);
  return () => {
    window.removeEventListener('online', onStoreChange);
    window.removeEventListener('offline', onStoreChange);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getOnlineServerSnapshot() {
  return true;
}

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

export function PlayScene({
  viewerId,
  storyId,
}: {
  viewerId: string;
  storyId: string;
}) {
  const queryClient = useQueryClient();
  const online = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getOnlineServerSnapshot,
  );
  const liveUpdates = useStoryLiveUpdates({ viewerId, storyId });
  const {
    data: story,
    error: snapshotError,
    isError: snapshotReadFailed,
    isFetching: snapshotFetching,
    isPaused: snapshotPaused,
    isPending: snapshotPending,
    refetch: refetchSnapshot,
  } = useQuery(
    playStorySnapshotQueryOptions(viewerId, storyId, {
      liveStreamHealthy: liveUpdates.healthy,
    }),
  );
  const resolution = useResolutionCommand({ viewerId, storyId });
  const control = useControlCommand({ viewerId, storyId });

  function acceptSnapshot(next: StorySnapshot) {
    writeStorySnapshot(
      queryClient,
      {
        viewerId,
        storyId,
        requestEpoch: allocateStorySnapshotEpoch(),
      },
      next,
    );
  }

  const offer = story?.current.interaction ?? null;
  const waiting = story?.waiting ?? null;
  const isResolving = story?.resolution != null;
  const canChoose =
    story?.canRespond === true &&
    offer !== null &&
    !isResolving &&
    !resolution.envelope;
  const showRefreshRecovery =
    story != null && (snapshotReadFailed || !online || snapshotPaused);

  useEffect(() => {
    if (
      story &&
      story.resolution == null &&
      resolution.intentStatus === 'admitted'
    ) {
      resolution.clearAfterSettlement();
    }
  }, [story, resolution.intentStatus, resolution.clearAfterSettlement]);

  if (!story) {
    if (snapshotReadFailed) {
      const { kind } = classifyReadRecovery(snapshotError);
      return (
        <RouteRecoveryPanel
          kind={kind}
          resource="story"
          onRetry={() => {
            void refetchSnapshot();
          }}
        />
      );
    }
    return (
      <main className="story-demo play-screen">
        <p role="status">
          {snapshotPending || snapshotFetching
            ? 'Loading the saved scene…'
            : 'The saved scene is not available yet.'}
        </p>
      </main>
    );
  }
  const scene = story;
  const pending = resolution.pending || control.pending;
  const status = resolution.error || control.error || resolutionMessage(scene);

  return (
    <main className="story-demo play-screen">
      <SessionRefresh />
      <header className="story-header">
        <a href="/stories">← Stories</a>
        <span className="demo-label">
          {scene.storyteller?.name ?? 'Storyteller'} ·{' '}
          {scene.campaign?.worldTime.label ?? `revision ${scene.revision}`}
        </span>
      </header>
      <div className="play-layout">
        <section className="play-main" aria-label="Current scene">
          <article className="story-scene">
            <p className="eyebrow">Current scene</p>
            <h1>{scene.current.content.title}</h1>
            <div className="scene-prose">
              {scene.current.content.paragraphs.map((paragraph, index) => (
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
                  disabled={pending || control.hasFrozen}
                  onClick={() =>
                    control.submit({
                      intervalId: scene.current.id,
                      expectedControlRevision: waiting.controlRevision,
                      action: journeyAction(waiting),
                    })
                  }
                >
                  {waiting.remainingMs === null ? 'Pause' : 'Resume'}
                </button>
              ) : null}
            </section>
          ) : null}
          {control.canRetrySame ? (
            <button
              disabled={pending}
              type="button"
              onClick={() => control.retryFrozen()}
            >
              Retry control
            </button>
          ) : null}
          {offer && !scene.campaign?.character ? (
            <section className="scene-choices" aria-label="Offered interaction">
              <p>{offer.specification.prompt}</p>
              {offer.specification.options.map((option) => (
                <article className="campaign-option" key={option.id}>
                  <button
                    type="button"
                    disabled={pending || !canChoose}
                    onClick={() =>
                      void resolution.submitChoice({
                        expectedRevision: scene.revision,
                        interactionId: offer.id,
                        optionId: option.id,
                      })
                    }
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
              {resolution.canRetrySame ? (
                <button
                  disabled={pending}
                  type="button"
                  onClick={() => resolution.retryFrozen()}
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
          {showRefreshRecovery ? (
            <section className="play-notice" aria-label="Snapshot refresh">
              <p role="status">
                {!online || snapshotPaused
                  ? 'Offline — last update may be stale. Refresh does not send a command.'
                  : 'Last update failed. Refresh does not send a command.'}
              </p>
              <button
                type="button"
                disabled={snapshotFetching || !online}
                onClick={() => {
                  void refetchSnapshot();
                }}
              >
                Refresh scene
              </button>
            </section>
          ) : null}
          <ResolutionRecovery story={scene} onSnapshot={acceptSnapshot} />
          {scene.campaign?.character ? (
            <CampaignPlay
              key={scene.campaign.offer?.id ?? scene.id}
              story={scene}
              campaign={scene.campaign}
              onSnapshot={acceptSnapshot}
            />
          ) : null}
        </section>
        <aside className="play-sidebar" aria-label="Story information">
          <StoryHistoryView viewerId={viewerId} storyId={scene.id} />
          {scene.campaign ? (
            <CampaignSettingsEditor
              key={scene.campaign.settings.revision}
              story={scene}
              campaign={scene.campaign}
              onSnapshot={acceptSnapshot}
            />
          ) : null}
          <details>
            <summary>Technical details</summary>
            <dl>
              {scene.usage ? (
                <>
                  <dt>Settled model usage (USD)</dt>
                  <dd>
                    {(Number(scene.usage.settledMicrousd) / 1000000).toFixed(6)}
                  </dd>
                  <dt>Reserved pending usage (USD)</dt>
                  <dd>
                    {(Number(scene.usage.reservedMicrousd) / 1000000).toFixed(
                      6,
                    )}
                  </dd>
                </>
              ) : null}
              <dt>Story ID</dt>
              <dd>{scene.id}</dd>
              <dt>Revision</dt>
              <dd>{scene.revision}</dd>
              <dt>Passage ID</dt>
              <dd>{scene.current.id}</dd>
            </dl>
          </details>
        </aside>
      </div>
    </main>
  );
}
