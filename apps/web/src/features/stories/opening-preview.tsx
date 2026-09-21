'use client';

import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import type { Draft } from '@offscreen/contracts/drafts';
import {
  openingPreviewSchema,
  latestOpeningSchema,
} from '@offscreen/contracts/openings';
import type { OpeningPreview } from '@offscreen/contracts/openings';
import type { MechanicalContentSummary } from '@offscreen/contracts/openings';
import { SessionRefresh } from '@/src/features/session/session-refresh';
import { paceOptions } from '@/src/features/play/campaign-play';

export function OpeningPreviewPanel({
  draft,
  initial,
  mechanicalContent,
}: {
  draft: Draft;
  initial: OpeningPreview | null;
  mechanicalContent: MechanicalContentSummary[];
}) {
  const [preview, setPreview] = useState(initial);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const attempt = useRef<{
    id: string;
    revision: number;
    contentId: string | undefined;
  } | null>(null);
  const storyId = useRef<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pace, setPace] = useState('steady');
  useEffect(() => {
    const parsed = z
      .uuid()
      .safeParse(new URLSearchParams(window.location.search).get('story'));
    if (parsed.success) {
      storyId.current = parsed.data;
    }
  }, []);
  useEffect(() => {
    if (!preview || !['pending', 'running'].includes(preview.state)) {
      return;
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let reads = 0;
    async function poll() {
      if (controller.signal.aborted) {
        return;
      }
      if (!document.hidden) {
        try {
          const response = await fetch(
            `/api/drafts/${draft.id}/openings/latest`,
            {
              cache: 'no-store',
              signal: AbortSignal.any([
                controller.signal,
                AbortSignal.timeout(10000),
              ]),
            },
          );
          if (!response.ok) {
            throw new Error('Status unavailable');
          }
          const result = latestOpeningSchema.parse(await response.json());
          if (controller.signal.aborted) {
            return;
          }
          setPreview(result.preview);
          if (
            !result.preview ||
            !['pending', 'running'].includes(result.preview.state)
          ) {
            return;
          }
        } catch {
          if (controller.signal.aborted) {
            return;
          }
          setMessage(
            'Unable to refresh the saved request. It can continue in the background; reload to check.',
          );
          return;
        }
        if (++reads >= 30) {
          setMessage(
            'Still awaiting completion. You can leave this page and return later, or reload to check.',
          );
          return;
        }
      }
      timer = setTimeout(() => void poll(), 2000);
    }
    timer = setTimeout(() => void poll(), 2000);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [draft.id, preview?.id, preview?.state]);
  async function generate() {
    if (pending || starting) {
      return;
    }
    const request =
      attempt.current ??
      (preview?.state === 'pending'
        ? {
            id: preview.id,
            revision: preview.sourceRevision,
            contentId: preview.contentId,
          }
        : {
            id: crypto.randomUUID(),
            revision: draft.revision,
            contentId: draft.openingContentId ?? undefined,
          });
    attempt.current = request;
    setPending(true);
    setMessage('');
    try {
      const response = await fetch(
        `/api/drafts/${draft.id}/openings/${request.id}`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            expectedRevision: request.revision,
            contentId: request.contentId,
          }),
          signal: AbortSignal.timeout(15000),
        },
      );
      if (response.status === 401) {
        setMessage('Sign in again, then retry.');
        return;
      }
      if (response.status === 409) {
        setMessage(
          'The draft or its request changed. Reload this page to review the current state.',
        );
        return;
      }
      if (!response.ok) {
        throw new Error('Unavailable');
      }
      setPreview(openingPreviewSchema.parse(await response.json()));
      attempt.current = null;
    } catch {
      setMessage(
        'The result could not be confirmed. Retry to recover the same request, or reload to check its saved result.',
      );
    } finally {
      setPending(false);
    }
  }
  const unresolved =
    preview && ['pending', 'running', 'uncertain'].includes(preview.state);
  const canStart = Boolean(
    preview &&
    preview.state === 'succeeded' &&
    preview.isCurrent &&
    preview.sourceRevision === draft.revision &&
    preview.candidate,
  );
  async function startStory() {
    if (pending || starting || !preview || !canStart) {
      return;
    }
    storyId.current ??= crypto.randomUUID();
    window.history.replaceState(
      null,
      '',
      `/stories/${draft.id}/preview?story=${storyId.current}`,
    );
    setStarting(true);
    setMessage('');
    try {
      const response = await fetch(`/api/stories/${storyId.current}/start`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          candidateId: preview.id,
          expectedDraftRevision: draft.revision,
          campaign: {
            mechanics: Boolean(preview.contentId),
            locked,
            pace: paceOptions.find((option) => option.value === pace)?.pace,
            ...(preview.startPackage
              ? { startPackage: preview.startPackage }
              : {}),
          },
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (response.status === 401) {
        setMessage('Sign in again, then retry.');
        return;
      }
      if (response.status === 409) {
        const latest = await fetch(`/api/drafts/${draft.id}/openings/latest`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(10000),
        });
        if (latest.ok) {
          setPreview(latestOpeningSchema.parse(await latest.json()).preview);
        }
        setMessage(
          'The draft or candidate changed. The current preview is shown; it was not started.',
        );
        return;
      }
      if (!response.ok) {
        throw new Error('Unavailable');
      }
      window.location.assign(`/play/${storyId.current}`);
    } catch {
      setMessage(
        'The story could not be confirmed. Retry Start to recover the same story, or reload.',
      );
    } finally {
      setStarting(false);
    }
  }
  let generateLabel = 'Create opening';
  if (preview?.state === 'succeeded')
    generateLabel = 'Create a different opening';
  if (preview?.state === 'failed')
    generateLabel = 'Try creating the opening again';
  if (preview?.state === 'pending') generateLabel = 'Opening request queued…';
  if (preview?.state === 'running') generateLabel = 'Storyteller is writing…';
  if (preview?.state === 'uncertain') generateLabel = 'Generation stopped';
  if (pending) {
    generateLabel = 'Sending to Storyteller…';
  }
  const preparedStart = mechanicalContent.find(
    (entry) => entry.id === draft.openingContentId,
  );
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
        <fieldset disabled={starting || pending}>
          <legend>Before you begin</legend>
          <label>
            <input
              type="checkbox"
              checked={locked}
              onChange={(event) => setLocked(event.target.checked)}
            />{' '}
            Keep Storyteller and speed settings fixed for this story
          </label>
          <label>
            Game speed{' '}
            <select
              value={pace}
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
      {canStart ? (
        <p>
          <button
            type="button"
            disabled={pending || starting}
            onClick={() => void startStory()}
          >
            {starting ? 'Starting story…' : 'Start story'}
          </button>
        </p>
      ) : null}
      <button
        disabled={
          pending || starting || !draft.premise.trim() || Boolean(unresolved)
        }
        onClick={() => void generate()}
      >
        {generateLabel}
      </button>
      {!draft.premise.trim() && (
        <p>Add and save a premise before generating.</p>
      )}
      <p role="status">{message}</p>
      {message && (
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
