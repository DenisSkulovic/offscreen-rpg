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
import type { StartPackageReference } from '@offscreen/contracts/campaign';
import { SessionRefresh } from '@/src/features/session/session-refresh';
import { paceOptions } from '@/src/features/play/campaign-play';
import {
  dispatchReviewResponseSchema,
  type DispatchReviewView,
} from '@offscreen/contracts/chamber';

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
    startPackage: StartPackageReference | undefined;
  } | null>(null);
  const storyId = useRef<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [contentId, setContentId] = useState(
    initial?.contentId ?? mechanicalContent[0]?.id ?? '',
  );
  const [locked, setLocked] = useState(false);
  const [pace, setPace] = useState('steady');
  const [dispatchReview, setDispatchReview] =
    useState<DispatchReviewView | null>(null);
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
          if (result.preview?.mode === 'provider') {
            const reviewResponse = await fetch(
              `/api/chamber-tools/generations/${result.preview.id}/dispatch-review`,
              { cache: 'no-store', signal: controller.signal },
            );
            if (reviewResponse.ok) {
              const captured = dispatchReviewResponseSchema.parse(
                await reviewResponse.json(),
              ).review;
              setDispatchReview(captured);
              if (captured.state === 'awaiting-review') return;
            }
          }
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
            startPackage: preview.startPackage,
          }
        : {
            id: crypto.randomUUID(),
            revision: draft.revision,
            contentId: contentId || undefined,
            startPackage: mechanicalContent.find((entry) => entry.id === contentId)?.startPackage,
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
            startPackage: request.startPackage,
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
  let generateLabel = 'Generate opening candidate';
  if (preview) {
    generateLabel = 'Generate another opening candidate';
  }
  if (unresolved) {
    generateLabel = 'Awaiting opening candidate';
  }
  if (message) {
    generateLabel = 'Retry opening candidate';
  }
  if (pending) {
    generateLabel = 'Preparing candidate…';
  }
  return (
    <main className="editor">
      <SessionRefresh />
      <p className="eyebrow">Offscreen RPG · Opening candidate</p>
      <h1>{draft.title || 'A possible beginning.'}</h1>
      <p className="field-help">
        {preview?.mode === 'provider'
          ? 'This opening was requested from the selected storyteller. Start uses exactly the candidate you review here.'
          : preview?.contentId
            ? 'Offline mechanical rehearsal: the saved seed is planned through the same private-plan boundary used after each action. No model call is made.'
            : 'Offline narrative rehearsal: authored scenes exercise choices, continuity and real waits without model calls. Arbitrary premises are saved but are not improvised.'}
      </p>
      {preview?.storyteller ? (
        <p>Storyteller: {preview.storyteller.name}</p>
      ) : null}
      <p>Saved premise: {draft.premise || 'No premise yet.'}</p>
      {draft.storyteller ? (
        <label>
          Opening seed{' '}
          <select
            disabled={pending || starting || Boolean(unresolved)}
            value={contentId}
            onChange={(event) => setContentId(event.target.value)}
          >
            <option value="">Blank narrative rehearsal</option>
            {mechanicalContent.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
          <span className="field-help">
            Authored starting-state examples. The offline planner creates the
            candidate's private actions; selecting a seed does not rewrite an
            existing candidate.
          </span>
        </label>
      ) : null}
      {preview && (
        <section aria-label="Opening candidate">
          <p className="field-help">
            Based on saved draft revision {preview.sourceRevision}.
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
            <p>
              Request saved. You can leave this page while the candidate is
              prepared.
            </p>
          )}
          {preview.state === 'uncertain' && (
            <p>This request needs reconciliation before another can begin.</p>
          )}
          {preview.state === 'failed' && <p>The previous request failed.</p>}
        </section>
      )}
      {dispatchReview ? (
        <section aria-label="Held provider request">
          <h2>Held before provider dispatch</h2>
          <p>
            No provider request, reservation, or model charge has occurred. This
            immutable packet is waiting for developer review.
          </p>
          <dl>
            <dt>State</dt>
            <dd>{dispatchReview.state}</dd>
            <dt>Packet SHA-256</dt>
            <dd><code>{dispatchReview.packetSha256}</code></dd>
          </dl>
          <details>
            <summary>Structural inspection</summary>
            <pre>{JSON.stringify(dispatchReview.inspection, null, 2)}</pre>
          </details>
          <details>
            <summary>Exact credential-free provider body</summary>
            <pre>{JSON.stringify(dispatchReview.packet, null, 2)}</pre>
          </details>
        </section>
      ) : null}
      {canStart && preview?.storyteller ? (
        <fieldset disabled={starting || pending}>
          <legend>Campaign rules</legend>
          <label>
            <input
              type="checkbox"
              checked={locked}
              onChange={(event) => setLocked(event.target.checked)}
            />{' '}
            Lock storyteller and speed settings at Start
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
          <p>
            Nonlethal rules subset. Pausing remains available. Start preserves
            the reviewed content and choices.
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
          <a href={`/stories/${draft.id}/preview`}>Reload preview</a> ·{' '}
          <a href="/sign-in">Sign in</a>
        </p>
      )}
      <p>
        <a href={`/stories/${draft.id}`}>Back to draft</a>
      </p>
    </main>
  );
}
