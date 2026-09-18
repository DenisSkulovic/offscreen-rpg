'use client';

import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import type { Draft } from '@offscreen/contracts/drafts';
import {
  openingPreviewSchema,
  latestOpeningSchema,
} from '@offscreen/contracts/openings';
import type { OpeningPreview } from '@offscreen/contracts/openings';
import { SessionRefresh } from '@/src/features/session/session-refresh';
import { paceOptions } from '@/src/features/play/campaign-play';

export function OpeningPreviewPanel({
  draft,
  initial,
}: {
  draft: Draft;
  initial: OpeningPreview | null;
}) {
  const [preview, setPreview] = useState(initial);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const attempt = useRef<{ id: string; revision: number; contentId?: string } | null>(null);
  const storyId = useRef<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [contentId, setContentId] = useState(initial?.contentId ?? '');
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
    attempt.current ??=
      preview?.state === 'pending'
        ? { id: preview.id, revision: preview.sourceRevision, contentId: preview.contentId }
        : { id: crypto.randomUUID(), revision: draft.revision, contentId: contentId || undefined };
    setPending(true);
    setMessage('');
    try {
      const response = await fetch(
        `/api/drafts/${draft.id}/openings/${attempt.current.id}`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ expectedRevision: attempt.current.revision, contentId: attempt.current.contentId }),
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
          campaign: { mechanics: Boolean(preview.contentId), locked, pace: paceOptions.find((option) => option.value === pace)?.pace },
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
    generateLabel = 'Preparing candidate�';
  }
  return (
    <main className="editor">
      <SessionRefresh />
      <p className="eyebrow">Offscreen RPG · Opening candidate</p>
      <h1>{draft.title || 'A possible beginning.'}</h1>
      <p className="field-help">
        {preview?.mode === 'provider'
          ? 'This opening was requested from the selected storyteller. Start uses exactly the candidate you review here.'
          : 'Offline rehearsal: authored scenes exercise choices, continuity and real waits without model calls. The pineapple scenario has two styles; arbitrary premises are saved but are not improvised.'}
      </p>
      {preview?.storyteller ? (
        <p>Storyteller: {preview.storyteller.name}</p>
      ) : null}
      <p>Saved premise: {draft.premise || 'No premise yet.'}</p>
      {draft.storyteller ? <label>Opening content <select disabled={pending || starting || Boolean(unresolved)} value={contentId} onChange={(event) => setContentId(event.target.value)}>
        <option value="">Narrative rehearsal</option>
        <option value="pineapple-mechanics.v4">Pineapple — dice and consequences</option>
        <option value="microbe.v3">Microbe — environmental response</option>
      </select><span className="field-help">Authored examples. Generate a candidate to review its actual starting situation and choices. Selecting content does not rewrite an existing candidate.</span></label> : null}
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
                  <p key={option.id}>
                    <button type="button" disabled>
                      {option.label}
                    </button>
                  </p>
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
      {canStart && preview?.storyteller ? (
        <fieldset disabled={starting || pending}>
          <legend>Campaign rules</legend>
          <label><input type="checkbox" checked={locked} onChange={(event) => setLocked(event.target.checked)} /> Lock storyteller and speed settings at Start</label>
          <label>Game speed <select value={pace} onChange={(event) => setPace(event.target.value)}>{paceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <p>Nonlethal rules subset. Pausing remains available. Start preserves the reviewed content and choices.</p>
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
