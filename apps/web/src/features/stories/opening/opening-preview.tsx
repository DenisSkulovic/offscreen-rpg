'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Draft } from '@offscreen/contracts/drafts';
import type { OpeningPreview } from '@offscreen/contracts/openings';
import type { MechanicalContentSummary } from '@offscreen/contracts/openings';
import { SessionRefresh } from '@/src/features/session/session-refresh';
import { Action } from '@/src/shared/ui/action';
import { SystemNotice } from '@/src/shared/ui/system-notice';
import { paceOptions } from '@/src/features/play/model/pace-options';
import { openingQueryOptions } from '@/src/shared/api/opening-query';
import { useOpeningGenerate } from './use-opening-generate';
import { useStartStory } from './use-start-story';
import '../stories-library.css';
import '../../play/ui/story-frame.css';

export function OpeningPreviewPanel({
  viewerId,
  draft,
  initial,
  mechanicalContent,
}: {
  viewerId: string;
  draft: Draft;
  initial: OpeningPreview | null;
  mechanicalContent: MechanicalContentSummary[];
}) {
  const openingQuery = useQuery({
    ...openingQueryOptions(viewerId, draft.id),
    initialData: initial,
  });
  const generate = useOpeningGenerate(viewerId, draft.id);
  const start = useStartStory({ viewerId, draftId: draft.id });
  const [locked, setLocked] = useState(false);
  const [pace, setPace] = useState('steady');

  const preview = start.conflictPreview ?? openingQuery.data ?? null;
  const unresolved =
    preview && ['pending', 'running', 'uncertain'].includes(preview.state);
  const canStart = Boolean(
    preview &&
    preview.state === 'succeeded' &&
    preview.isCurrent &&
    preview.sourceRevision === draft.revision &&
    preview.candidate,
  );

  function onGenerate() {
    if (generate.pending || start.pending || unresolved) {
      return;
    }
    if (generate.canRetrySame) {
      generate.retryFrozen();
      return;
    }
    const reuseAttemptId =
      preview?.state === 'pending' ? preview.id : undefined;
    generate.submit({
      expectedRevision:
        preview?.state === 'pending' ? preview.sourceRevision : draft.revision,
      ...(draft.openingContentId
        ? { contentId: draft.openingContentId }
        : preview?.contentId
          ? { contentId: preview.contentId }
          : {}),
      ...(reuseAttemptId ? { reuseAttemptId } : {}),
    });
  }

  function onStart() {
    if (generate.pending || start.pending || !preview || !canStart) {
      return;
    }
    if (start.canRetrySame) {
      start.retryFrozen();
      return;
    }
    const paceValue = paceOptions.find((option) => option.value === pace)?.pace;
    start.captureAndSubmit({
      candidateId: preview.id,
      expectedDraftRevision: draft.revision,
      campaign: {
        mechanics: Boolean(preview.contentId),
        locked,
        ...(paceValue ? { pace: paceValue } : {}),
        ...(preview.startPackage ? { startPackage: preview.startPackage } : {}),
      },
    });
  }

  let generateLabel = 'Create opening';
  if (preview?.state === 'succeeded')
    generateLabel = 'Create a different opening';
  if (preview?.state === 'failed')
    generateLabel = 'Try creating the opening again';
  if (preview?.state === 'pending') generateLabel = 'Opening request queued…';
  if (preview?.state === 'running') generateLabel = 'Storyteller is writing…';
  if (preview?.state === 'uncertain') generateLabel = 'Generation stopped';
  if (generate.pending) {
    generateLabel = 'Sending to Storyteller…';
  }
  if (generate.canRetrySame) {
    generateLabel = 'Retry the same opening request';
  }

  const preparedStart = mechanicalContent.find(
    (entry) => entry.id === draft.openingContentId,
  );
  const statusMessage =
    start.message ||
    generate.message ||
    (start.recovery.status === 'blocked' ? start.recovery.message : '') ||
    (openingQuery.isError
      ? 'Unable to refresh the saved request. It can continue in the background; reload to check.'
      : '');
  const startLocked = Boolean(start.frozen) || start.canRetrySame;

  return (
    <main className="editor opening-editor stories-library">
      <SessionRefresh />
      <p className="stories-library__brand">Offscreen RPG · Your opening</p>
      <h1 className="stories-library__title">
        {draft.title || 'Untitled story'}
      </h1>
      <dl className="opening-setup-summary">
        <div>
          <dt>Foundation</dt>
          <dd>{preparedStart?.name ?? 'Custom story'}</dd>
        </div>
        <div>
          <dt>Storyteller</dt>
          <dd>
            {preview?.storyteller?.name ??
              draft.storyteller?.id ??
              'Selected profile'}
          </dd>
        </div>
      </dl>
      {!preview ? (
        <section className="opening-callout">
          <h2>Ready to create the first scene.</h2>
          <p>
            One bounded Storyteller call will use this saved setup and the
            prepared world material. It may cost up to one cent; there is no
            automatic retry or fallback model.
          </p>
        </section>
      ) : null}
      {preview && (
        <section aria-label="Opening candidate">
          <p className="field-help">
            Based on saved setup revision {preview.sourceRevision}.
          </p>
          {(!preview.isCurrent ||
            preview.sourceRevision !== draft.revision) && (
            <SystemNotice tone="error">
              This preview is from an earlier draft or request. It is not the
              current opening.
            </SystemNotice>
          )}
          {preview.candidate ? (
            <div
              className="story-frame story-frame__stage"
              aria-label="Opening excerpt"
            >
              <h2 className="story-frame__passage-title">
                {preview.candidate.content.title}
              </h2>
              <div className="story-frame__passage">
                {preview.candidate.content.paragraphs.map(
                  (paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ),
                )}
              </div>
              <section
                className="story-frame__threshold"
                aria-label="Offered interaction"
              >
                <p className="story-frame__threshold-heading">
                  {preview.candidate.interaction.prompt}
                </p>
                <ul className="story-frame__intentions">
                  {preview.candidate.interaction.options.map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        className="story-frame__intention story-frame__intention--commit"
                        disabled
                      >
                        {option.label}
                        {option.description || option.risk ? (
                          <span className="story-frame__intention-support">
                            {[
                              option.description,
                              option.risk
                                ? `Apparent risk: ${option.risk}`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="story-frame__intention-support">
                  Preview only — choosing here does not start the story.
                </p>
              </section>
            </div>
          ) : null}
          {['pending', 'running'].includes(preview.state) && (
            <SystemNotice tone="attention">
              <h2>
                {preview.state === 'pending'
                  ? 'Opening queued.'
                  : 'The Storyteller is writing.'}
              </h2>
              <p>
                You may leave this page and return. This screen checks the same
                saved request; it does not submit another one.
              </p>
            </SystemNotice>
          )}
          {preview.state === 'uncertain' && (
            <SystemNotice tone="error">
              <h2>Generation stopped for review.</h2>
              <p>
                The provider response or its billing could not be confirmed, so
                the game will not retry or spend again automatically.
              </p>
            </SystemNotice>
          )}
          {preview.state === 'failed' && (
            <SystemNotice tone="error">
              <h2>The opening was not created.</h2>
              <p>
                The failed request is recorded. You may make one new attempt
                below.
              </p>
            </SystemNotice>
          )}
        </section>
      )}
      {canStart && preview?.storyteller ? (
        <fieldset disabled={start.pending || generate.pending || startLocked}>
          <legend>Before you begin</legend>
          <label>
            <input
              type="checkbox"
              checked={
                startLocked && start.frozen
                  ? start.frozen.campaign.locked
                  : locked
              }
              onChange={(event) => setLocked(event.target.checked)}
            />{' '}
            Keep Storyteller and speed settings fixed for this story
          </label>
          <label>
            Game speed{' '}
            <select
              value={
                startLocked && start.frozen?.campaign.pace
                  ? (paceOptions.find(
                      (option) =>
                        JSON.stringify(option.pace) ===
                        JSON.stringify(start.frozen?.campaign.pace),
                    )?.value ?? pace)
                  : pace
              }
              onChange={(event) => setPace(event.target.value)}
            >
              {paceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <p className="field-help">
            You can pause play later. Start preserves exactly the opening shown
            above.
          </p>
        </fieldset>
      ) : null}
      <div className="stories-library__actions">
        <Action
          kind="button"
          variant="quiet"
          pending={generate.pending}
          disabled={
            start.pending || !draft.premise.trim() || Boolean(unresolved)
          }
          onClick={() => void onGenerate()}
        >
          {generateLabel}
        </Action>
        {canStart || start.canRetrySame ? (
          <Action
            kind="button"
            variant="primary"
            pending={start.pending}
            disabled={generate.pending}
            onClick={() =>
              void (start.canRetrySame ? start.retryFrozen() : onStart())
            }
          >
            {start.pending
              ? 'Starting story…'
              : start.canRetrySame
                ? 'Retry the same Start'
                : 'Start story'}
          </Action>
        ) : null}
      </div>
      {!draft.premise.trim() && (
        <p>Add and save a premise before generating.</p>
      )}
      {statusMessage ? (
        <SystemNotice tone="attention">{statusMessage}</SystemNotice>
      ) : null}
      {statusMessage && (
        <p>
          <Action
            kind="link"
            variant="quiet"
            href={`/stories/${draft.id}/preview`}
          >
            Reload this opening
          </Action>
        </p>
      )}
      <p>
        <Action kind="link" variant="quiet" href={`/stories/${draft.id}`}>
          Back to story setup
        </Action>
      </p>
    </main>
  );
}
