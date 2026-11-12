'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Draft } from '@offscreen/contracts/drafts';
import type { OpeningPreview } from '@offscreen/contracts/openings';
import type { MechanicalContentSummary } from '@offscreen/contracts/openings';
import { SessionRefresh } from '@/src/features/session/session-refresh';
import { paceOptions } from '@/src/features/play/model/pace-options';
import { openingQueryOptions } from '@/src/shared/api/opening-query';
import { useOpeningGenerate } from './use-opening-generate';
import { useStartStory } from './use-start-story';

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
    <main className="editor opening-editor">
      <SessionRefresh />
      <p className="eyebrow">Offscreen RPG · Your opening</p>
      <h1>{draft.title || 'Untitled story'}</h1>
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
            <p role="alert">
              This preview is from an earlier draft or request. It is not the
              current opening.
            </p>
          )}
          {preview.candidate ? (
            <>
              <h2>{preview.candidate.content.title}</h2>
              {preview.candidate.content.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              <section aria-label="Offered interaction">
                <p>{preview.candidate.interaction.prompt}</p>
                {preview.candidate.interaction.options.map((option) => (
                  <article className="campaign-option" key={option.id}>
                    <button type="button" disabled>
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
              </section>
            </>
          ) : null}
          {['pending', 'running'].includes(preview.state) && (
            <div className="opening-callout" role="status">
              <h2>
                {preview.state === 'pending'
                  ? 'Opening queued.'
                  : 'The Storyteller is writing.'}
              </h2>
              <p>
                You may leave this page and return. This screen checks the same
                saved request; it does not submit another one.
              </p>
            </div>
          )}
          {preview.state === 'uncertain' && (
            <div className="opening-callout opening-problem" role="alert">
              <h2>Generation stopped for review.</h2>
              <p>
                The provider response or its billing could not be confirmed, so
                the game will not retry or spend again automatically.
              </p>
            </div>
          )}
          {preview.state === 'failed' && (
            <div className="opening-callout opening-problem" role="alert">
              <h2>The opening was not created.</h2>
              <p>
                The failed request is recorded. You may make one new attempt
                below.
              </p>
            </div>
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
      {canStart || start.canRetrySame ? (
        <p>
          <button
            type="button"
            disabled={generate.pending || start.pending}
            onClick={() =>
              void (start.canRetrySame ? start.retryFrozen() : onStart())
            }
          >
            {start.pending
              ? 'Starting story…'
              : start.canRetrySame
                ? 'Retry the same Start'
                : 'Start story'}
          </button>
        </p>
      ) : null}
      <button
        disabled={
          generate.pending ||
          start.pending ||
          !draft.premise.trim() ||
          Boolean(unresolved)
        }
        onClick={() => void onGenerate()}
      >
        {generateLabel}
      </button>
      {!draft.premise.trim() && (
        <p>Add and save a premise before generating.</p>
      )}
      <p role="status">{statusMessage}</p>
      {statusMessage && (
        <p>
          <a href={`/stories/${draft.id}/preview`}>Reload this opening</a>
        </p>
      )}
      <p>
        <a href={`/stories/${draft.id}`}>Back to story setup</a>
      </p>
    </main>
  );
}
