'use client';

import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import type { Draft } from '@offscreen/contracts/drafts';
import {
  openingPreviewSchema,
  latestOpeningSchema,
} from '@offscreen/contracts/openings';
import type { OpeningPreview } from '@offscreen/contracts/openings';
import { SessionRefresh } from './session-refresh';

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
  const attempt = useRef<{ id: string; revision: number } | null>(null);
  const storyId = useRef<string | null>(null);
  const [starting, setStarting] = useState(false);
  useEffect(() => {
    const parsed = z
      .uuid()
      .safeParse(new URLSearchParams(window.location.search).get('story'));
    if (parsed.success) {
      storyId.current = parsed.data;
    }
  }, []);
  useEffect(() => {
    if (!preview || !['pending', 'running'].includes(preview.state)) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let reads = 0;
    async function poll() {
      if (controller.signal.aborted) return;
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
          if (!response.ok) throw new Error('Status unavailable');
          const result = latestOpeningSchema.parse(await response.json());
          if (controller.signal.aborted) return;
          setPreview(result.preview);
          if (
            !result.preview ||
            !['pending', 'running'].includes(result.preview.state)
          )
            return;
        } catch {
          if (controller.signal.aborted) return;
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
    if (pending || starting) return;
    attempt.current ??=
      preview?.state === 'pending'
        ? { id: preview.id, revision: preview.sourceRevision }
        : { id: crypto.randomUUID(), revision: draft.revision };
    setPending(true);
    setMessage('');
    try {
      const response = await fetch(
        `/api/drafts/${draft.id}/openings/${attempt.current.id}`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ expectedRevision: attempt.current.revision }),
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
      if (!response.ok) throw new Error('Unavailable');
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
  return (
    <main className="editor">
      <SessionRefresh />
      <p className="eyebrow">Offscreen RPG · Opening candidate</p>
      <h1>{draft.title || 'A possible beginning.'}</h1>
      <p className="field-help">
        This fixed sample tests saving, reviewing and starting a playable
        opening. It is not adapted to your premise or storytelling direction. No
        AI calls are made. Starting creates a live first scene; choosing an
        option is not connected yet.
      </p>
      <p>Saved premise: {draft.premise || 'No premise yet.'}</p>
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
        {pending
          ? 'Preparing candidate…'
          : message
            ? 'Retry opening candidate'
            : unresolved
              ? 'Awaiting opening candidate'
              : preview
                ? 'Generate another opening candidate'
                : 'Generate opening candidate'}
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
