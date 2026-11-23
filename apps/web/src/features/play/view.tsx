'use client';
import { CampaignPlay } from './ui/campaign-play';
import { CampaignSettingsEditor } from './campaign-settings';
import { StoryHistoryView } from './history';
import { resolveLivePresentation } from './model/live-presentation';
import { resolutionMessage, stageStatusLabel } from './model/play-status';
import { ResolutionRecovery } from './resolution-recovery';
import { useControlCommand } from './use-control-command';
import { useResolutionCommand } from './use-resolution-command';
import { useStoryLiveUpdates } from './use-story-live-updates';
import { JourneyTimingNotice } from './ui/journey-timing-notice';
import { StoryFrame } from './ui/story-frame';
import { Action } from '@/src/shared/ui/action';
import { SystemNotice } from '@/src/shared/ui/system-notice';

import { useEffect, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { StorySnapshot } from '@offscreen/contracts/stories';
import { SessionRefresh } from '@/src/features/session/session-refresh';
import { classifyReadRecovery } from '@/src/features/recovery/read-error';
import { RouteRecoveryPanel } from '@/src/features/recovery/route-recovery';
import { playStorySnapshotQueryOptions } from '@/src/shared/api/story-snapshot-query';
import {
  allocateStorySnapshotEpoch,
  writeStorySnapshot,
} from '@/src/shared/api/story-snapshot-write';
import { isActivityActive } from './model/campaign-projections';
import type { ResolvedPresentation } from './presentation/types';

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

function playJournalSection(viewerId: string, storyId: string) {
  return (
    <section aria-label="Saved journal">
      <h2 className="story-frame__threshold-heading">Journal</h2>
      <p className="story-frame__intention-support">
        Return to Now for the current situation. This journal is read-only
        chronology of published passages.
      </p>
      <a className="story-frame__back" href="#story-frame-now">
        ← Back to Now
      </a>
      <StoryHistoryView viewerId={viewerId} storyId={storyId} />
    </section>
  );
}

function playTechnicalDetails(scene: StorySnapshot) {
  return (
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
              {(Number(scene.usage.reservedMicrousd) / 1000000).toFixed(6)}
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
  );
}

function playFrameDetails(args: {
  viewerId: string;
  scene: StorySnapshot;
  onSnapshot: (next: StorySnapshot) => void;
}) {
  const { viewerId, scene, onSnapshot } = args;
  return (
    <>
      {scene.campaign ? (
        <section aria-label="Story settings">
          <h2 className="story-frame__threshold-heading">Settings</h2>
          <CampaignSettingsEditor
            key={scene.id}
            viewerId={viewerId}
            story={scene}
            campaign={scene.campaign}
            onSnapshot={onSnapshot}
          />
        </section>
      ) : null}
      {playTechnicalDetails(scene)}
    </>
  );
}

type PlayStageExtrasProps = {
  scene: StorySnapshot;
  waiting: StorySnapshot['waiting'];
  pending: boolean;
  control: Pick<
    ReturnType<typeof useControlCommand>,
    'hasFrozen' | 'submit' | 'canRetrySame' | 'retryFrozen'
  >;
  resolution: Pick<
    ReturnType<typeof useResolutionCommand>,
    'canRetrySame' | 'retryFrozen'
  >;
  legacyOffer: NonNullable<StorySnapshot['current']['interaction']> | null;
  status: ReturnType<typeof resolutionMessage> | string | null | undefined;
  showRefreshRecovery: boolean;
  online: boolean;
  snapshotPaused: boolean;
  snapshotFetching: boolean;
  refetchSnapshot: () => void;
  onSnapshot: (next: StorySnapshot) => void;
  campaignSurface: boolean;
  presentation: ResolvedPresentation | null;
};

function playStageExtras(props: PlayStageExtrasProps) {
  const {
    scene,
    waiting,
    pending,
    control,
    resolution,
    legacyOffer,
    status,
    showRefreshRecovery,
    online,
    snapshotPaused,
    snapshotFetching,
    refetchSnapshot,
    onSnapshot,
    campaignSurface,
    presentation,
  } = props;

  return (
    <>
      {waiting ? (
        <JourneyTimingNotice
          waiting={waiting}
          disabled={pending || control.hasFrozen}
          onControl={() =>
            control.submit({
              intervalId: scene.current.id,
              expectedControlRevision: waiting.controlRevision,
              action: journeyAction(waiting),
            })
          }
        />
      ) : null}
      {control.canRetrySame ? (
        <button
          className="story-frame__intention"
          disabled={pending}
          type="button"
          onClick={() => control.retryFrozen()}
        >
          Retry control
        </button>
      ) : null}
      {legacyOffer !== null && resolution.canRetrySame ? (
        <button
          className="story-frame__intention"
          disabled={pending}
          type="button"
          onClick={() => resolution.retryFrozen()}
        >
          Retry the same choice
        </button>
      ) : null}
      {status ? (
        <p className="story-frame__stage-status" role="status">
          {status}
        </p>
      ) : null}
      {showRefreshRecovery ? (
        <SystemNotice
          tone="attention"
          label="Snapshot refresh"
          action={
            <Action
              kind="button"
              variant="quiet"
              pending={snapshotFetching}
              disabled={!online}
              onClick={() => {
                void refetchSnapshot();
              }}
            >
              Refresh scene
            </Action>
          }
        >
          {!online || snapshotPaused
            ? 'Offline — last update may be stale. Refresh does not send a command.'
            : 'Last update failed. Refresh does not send a command.'}
        </SystemNotice>
      ) : null}
      <ResolutionRecovery story={scene} onSnapshot={onSnapshot} />
      {campaignSurface ? (
        <div className="story-frame__threshold">
          <CampaignPlay
            key={scene.campaign!.offer?.id ?? scene.id}
            story={scene}
            campaign={scene.campaign!}
            onSnapshot={onSnapshot}
            presentation={presentation}
          />
        </div>
      ) : null}
    </>
  );
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

  const { intentStatus, clearAfterSettlement } = resolution;
  useEffect(() => {
    if (story && story.resolution == null && intentStatus === 'admitted') {
      clearAfterSettlement();
    }
  }, [story, intentStatus, clearAfterSettlement]);

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
      <main className="story-frame">
        <p className="story-frame__stage-status" role="status">
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
  const campaignSurface =
    scene.campaign &&
    (scene.campaign.offer != null || isActivityActive(scene.campaign.activity));
  const legacyOffer = offer && !scene.campaign?.offer ? offer : null;
  const storyLabel =
    scene.storyteller?.name?.trim() ||
    scene.current.content.title.trim() ||
    'Current story';
  const situationLabel = scene.campaign?.worldTime.label ?? null;
  const presentation = resolveLivePresentation(scene);

  return (
    <>
      <SessionRefresh />
      <StoryFrame
        storiesHref="/stories"
        storyLabel={storyLabel}
        situationLabel={situationLabel}
        statusLabel={stageStatusLabel(scene, canChoose)}
        passageTitle={scene.current.content.title}
        passageId={scene.current.id}
        interactionId={offer?.id}
        presentation={presentation}
        paragraphs={scene.current.content.paragraphs}
        journalHref="#story-journal"
        journal={playJournalSection(viewerId, scene.id)}
        thresholdHeading={offer?.specification.prompt || 'What will you do?'}
        intentions={
          legacyOffer
            ? legacyOffer.specification.options.map((option) => ({
                id: option.id,
                label: option.label,
                support: [option.description, option.risk]
                  .filter(Boolean)
                  .join(' · '),
              }))
            : []
        }
        intentionsDisabled={pending || !canChoose}
        onIntentionSelect={
          legacyOffer
            ? (optionId) => {
                if (!canChoose || pending) {
                  return;
                }
                void resolution.submitChoice({
                  expectedRevision: scene.revision,
                  interactionId: legacyOffer.id,
                  optionId,
                });
              }
            : undefined
        }
        stageExtras={playStageExtras({
          scene,
          waiting,
          pending,
          control,
          resolution,
          legacyOffer,
          status,
          showRefreshRecovery,
          online,
          snapshotPaused,
          snapshotFetching,
          refetchSnapshot: () => {
            void refetchSnapshot();
          },
          onSnapshot: acceptSnapshot,
          campaignSurface: Boolean(campaignSurface),
          presentation,
        })}
        details={playFrameDetails({
          viewerId,
          scene,
          onSnapshot: acceptSnapshot,
        })}
      />
    </>
  );
}
