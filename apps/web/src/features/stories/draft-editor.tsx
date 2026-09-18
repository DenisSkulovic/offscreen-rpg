'use client';
import { StorytellerSelect } from './storyteller-select';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { draftContentSchema, draftSchema } from '@offscreen/contracts/drafts';
import type { Draft, DraftContent } from '@offscreen/contracts/drafts';
import { SessionRefresh } from '@/src/features/session/session-refresh';

const empty: DraftContent = {
  storyteller: null,
  title: '',
  premise: '',
  storytellingDirection: '',
};

export function DraftEditor({
  id,
  initial,
}: {
  id: string;
  initial: Draft | null;
}) {
  const [saved, setSaved] = useState(initial);
  const [content, setContent] = useState<DraftContent>(
    initial
      ? draftContentSchema.parse({
          storyteller: initial.storyteller ?? null,
          title: initial.title,
          premise: initial.premise,
          storytellingDirection: initial.storytellingDirection,
        })
      : empty,
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [conflict, setConflict] = useState(false);
  const dirty = (Object.keys(empty) as (keyof DraftContent)[]).some(
    (field) =>
      JSON.stringify(content[field] ?? null) !==
      JSON.stringify(saved?.[field] ?? (field === 'storyteller' ? null : '')),
  );
  useEffect(() => {
    if (!dirty) {
      return;
    }
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    setConflict(false);
    try {
      const response = await fetch(`/api/drafts/${id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...content,
          expectedRevision: saved?.revision ?? 0,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (response.status === 409) {
        setConflict(true);
        setMessage(
          'This draft changed elsewhere. Your text is still here. Compare with the saved version before replacing anything.',
        );
        return;
      }
      if (response.status === 401) {
        setMessage(
          'Your session expired. Sign in in another tab, then retry. Your text is still here.',
        );
        return;
      }
      if (!response.ok) {
        throw new Error('Save unavailable');
      }
      const result = draftSchema.parse(await response.json());
      setSaved(result);
      setMessage('Saved.');
      window.history.replaceState(null, '', `/stories/${id}`);
    } catch {
      setMessage(
        'Save could not be confirmed. Your text is still here; retrying will not create another draft.',
      );
    } finally {
      setPending(false);
    }
  }

  async function loadSaved() {
    if (
      !window.confirm('Discard your current text and load the saved version?')
    ) {
      return;
    }
    setPending(true);
    try {
      const response = await fetch(`/api/drafts/${id}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Read unavailable');
      }
      const latest = draftSchema.parse(await response.json());
      setSaved(latest);
      setContent({
        storyteller: latest.storyteller ?? null,
        title: latest.title,
        premise: latest.premise,
        storytellingDirection: latest.storytellingDirection,
      });
      setConflict(false);
      setMessage('Saved version loaded.');
    } catch {
      setMessage(
        'Couldn’t load the saved version. Your current text is unchanged.',
      );
    } finally {
      setPending(false);
    }
  }

  let saveStatus = 'Not saved yet.';
  if (saved) {
    saveStatus = 'All changes saved.';
  }
  if (dirty) {
    saveStatus = 'Unsaved changes.';
  }
  return (
    <main className="editor">
      <SessionRefresh redirectOnExpiry={false} />
      <p className="eyebrow">Offscreen RPG · Story draft</p>
      <h1>A beginning.</h1>
      <p>
        Write as much or as little as you like. Saving keeps your ideas; it does
        not start the story.
      </p>
      <form
        onSubmit={(event) => void save(event)}
        onChange={() => {
          if (message === 'Saved.' || message === 'Saved version loaded.') {
            setMessage('');
          }
        }}
      >
        <fieldset disabled={pending}>
          <StorytellerSelect
            value={content.storyteller ?? null}
            onChange={(storyteller) => setContent({ ...content, storyteller })}
          />
          <label htmlFor="title">
            Title <small>(optional)</small>
          </label>
          <input
            id="title"
            maxLength={160}
            value={content.title}
            onChange={(e) => setContent({ ...content, title: e.target.value })}
          />
          <label htmlFor="premise">
            Who are you, and where does this begin?
          </label>
          <textarea
            id="premise"
            rows={7}
            maxLength={6000}
            value={content.premise}
            onChange={(e) =>
              setContent({ ...content, premise: e.target.value })
            }
          />
          <label htmlFor="direction">
            How should the story feel? <small>(optional)</small>
          </label>
          <p id="direction-help" className="field-help">
            Describe the tone, intensity, or things you want it to avoid.
          </p>
          <textarea
            id="direction"
            rows={4}
            maxLength={2000}
            aria-describedby="direction-help"
            value={content.storytellingDirection}
            onChange={(e) =>
              setContent({ ...content, storytellingDirection: e.target.value })
            }
          />
          <button type="submit">{pending ? 'Saving…' : 'Save draft'}</button>
        </fieldset>
      </form>
      <p role="status">{message || saveStatus}</p>
      {conflict && (
        <div>
          <a href={`/stories/${id}`} target="_blank" rel="noopener noreferrer">
            Compare saved version
          </a>{' '}
          <button disabled={pending} onClick={() => void loadSaved()}>
            Load saved version
          </button>
        </div>
      )}
      {saved && !dirty && !pending && (
        <p>
          <a href={`/stories/${id}/preview`}>Review opening candidate</a>
        </p>
      )}
      <p className="field-help">
        <a href="/sign-in" target="_blank" rel="noopener noreferrer">
          Sign in in another tab
        </a>
      </p>
      <a
        href="/stories"
        onClick={(event) => {
          if (dirty && !window.confirm('Leave without saving your changes?')) {
            event.preventDefault();
          }
        }}
      >
        Back to your stories
      </a>
    </main>
  );
}
