'use client';

import { useRef, useState } from 'react';
import type { Draft } from '@offscreen/contracts/drafts';
import { openingPreviewSchema } from '@offscreen/contracts/openings';
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
  async function generate() {
    if (pending) return;
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
    preview && ['running', 'uncertain'].includes(preview.state);
  return (
    <main className="editor">
      <SessionRefresh />
      <p className="eyebrow">Offscreen RPG · Scripted preview</p>
      <h1>{draft.title || 'A possible beginning.'}</h1>
      <p className="field-help">
        This fixed sample tests saving and reopening an opening. It is not
        adapted to your premise or storytelling direction. No AI calls are made,
        and it does not start a story.
      </p>
      <p>Saved premise: {draft.premise || 'No premise yet.'}</p>
      {preview && (
        <section aria-label="Saved opening">
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
          {preview.opening && (
            <p style={{ whiteSpace: 'pre-wrap' }}>{preview.opening}</p>
          )}
          {preview.state === 'pending' && (
            <p>Saved request awaiting completion. Resume it below.</p>
          )}
          {unresolved && (
            <p>This request needs reconciliation before another can begin.</p>
          )}
          {preview.state === 'failed' && <p>The previous request failed.</p>}
        </section>
      )}
      <button
        disabled={pending || !draft.premise.trim() || Boolean(unresolved)}
        onClick={() => void generate()}
      >
        {pending
          ? 'Preparing sample…'
          : message
            ? 'Retry scripted preview'
            : preview?.state === 'pending'
              ? 'Resume scripted preview'
              : preview
                ? 'Generate another scripted preview'
                : 'Generate scripted preview'}
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
