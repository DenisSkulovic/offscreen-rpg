'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { draftContentSchema, draftSchema } from '@offscreen/contracts/drafts';
import type { Draft, DraftContent } from '@offscreen/contracts/drafts';
import type { MechanicalContentSummary } from '@offscreen/contracts/openings';
import { SessionRefresh } from '@/src/features/session/session-refresh';
import { StorytellerSelect } from './storyteller-select';

type CreationStep = 'foundation' | 'role' | 'storyteller' | 'review';

const empty: DraftContent = {
  storyteller: null,
  openingContentId: null,
  characterName: '',
  title: '',
  premise: '',
  storytellingDirection: '',
};

const steps: ReadonlyArray<{ id: CreationStep; label: string }> = [
  { id: 'foundation', label: 'Foundation' },
  { id: 'role', label: 'Your role' },
  { id: 'storyteller', label: 'Storyteller' },
  { id: 'review', label: 'Review' },
];

function contentFromDraft(draft: Draft): DraftContent {
  return draftContentSchema.parse({
    storyteller: draft.storyteller ?? null,
    openingContentId: draft.openingContentId,
    characterName: draft.characterName,
    title: draft.title,
    premise: draft.premise,
    storytellingDirection: draft.storytellingDirection,
  });
}

export function DraftEditor({
  id,
  initial,
  preparedStarts,
}: {
  id: string;
  initial: Draft | null;
  preparedStarts: MechanicalContentSummary[];
}) {
  const [saved, setSaved] = useState(initial);
  const [content, setContent] = useState<DraftContent>(
    initial ? contentFromDraft(initial) : empty,
  );
  const [step, setStep] = useState<CreationStep>(
    initial ? 'review' : 'foundation',
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [conflict, setConflict] = useState(false);
  const selectedStart = useMemo(
    () =>
      preparedStarts.find((entry) => entry.id === content.openingContentId) ??
      null,
    [content.openingContentId, preparedStarts],
  );
  const dirty = (Object.keys(empty) as (keyof DraftContent)[]).some(
    (field) =>
      JSON.stringify(content[field] ?? null) !==
      JSON.stringify(
        saved?.[field] ??
          (field === 'storyteller' || field === 'openingContentId' ? null : ''),
      ),
  );

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function choosePrepared(entry: MechanicalContentSummary) {
    setContent({
      ...content,
      openingContentId: entry.id,
      title: entry.draft?.title ?? '',
      premise: entry.draft?.premise ?? '',
      storytellingDirection: entry.draft?.storytellingDirection ?? '',
    });
    setMessage('');
    setStep('role');
  }

  function chooseCustom() {
    setContent({ ...empty, storyteller: content.storyteller });
    setMessage('');
    setStep('role');
  }

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
          'This setup changed elsewhere. Your choices are still here; load the saved version or keep this one open while you compare.',
        );
        return;
      }
      if (response.status === 401) {
        setMessage(
          'Your session expired. Sign in again, then save this setup.',
        );
        return;
      }
      if (!response.ok) throw new Error('Save unavailable');
      const result = draftSchema.parse(await response.json());
      setSaved(result);
      setContent(contentFromDraft(result));
      setMessage('Setup saved. It is ready to create an opening.');
      window.history.replaceState(null, '', `/stories/${id}`);
    } catch {
      setMessage(
        'The save could not be confirmed. Your setup is still on this screen; retry when ready.',
      );
    } finally {
      setPending(false);
    }
  }

  async function loadSaved() {
    if (!window.confirm('Discard these choices and load the saved setup?'))
      return;
    setPending(true);
    try {
      const response = await fetch(`/api/drafts/${id}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Read unavailable');
      const latest = draftSchema.parse(await response.json());
      setSaved(latest);
      setContent(contentFromDraft(latest));
      setConflict(false);
      setMessage('Saved setup loaded.');
      setStep('review');
    } catch {
      setMessage(
        'The saved setup could not be loaded. Your choices are unchanged.',
      );
    } finally {
      setPending(false);
    }
  }

  const roleReady = content.premise.trim().length > 0;
  const storytellerReady = Boolean(content.storyteller);

  return (
    <main className="editor creation-editor">
      <SessionRefresh redirectOnExpiry={false} />
      <p className="eyebrow">Offscreen RPG · New story</p>
      <h1>Create a story worth entering.</h1>
      <ol className="creation-progress" aria-label="Story creation progress">
        {steps.map((item, index) => (
          <li
            key={item.id}
            className={item.id === step ? 'current' : undefined}
            aria-current={item.id === step ? 'step' : undefined}
          >
            <span>{index + 1}</span> {item.label}
          </li>
        ))}
      </ol>

      <form onSubmit={(event) => void save(event)}>
        <fieldset disabled={pending}>
          {step === 'foundation' ? (
            <section aria-labelledby="foundation-title">
              <h2 id="foundation-title">Where will this story begin?</h2>
              <p className="creation-intro">
                Choose a grounded prepared experience, or invent something new.
                Nothing is generated yet.
              </p>
              <div className="creation-paths">
                {preparedStarts.map((entry) => (
                  <article key={entry.id}>
                    <p className="eyebrow">Prepared experience</p>
                    <h3>{entry.name}</h3>
                    <p>{entry.description}</p>
                    <button type="button" onClick={() => choosePrepared(entry)}>
                      Choose this beginning
                    </button>
                  </article>
                ))}
                <article>
                  <p className="eyebrow">Blank canvas</p>
                  <h3>Create your own story</h3>
                  <p>
                    Describe the world, who you are and the situation in which
                    play begins. No prepared lore is silently attached.
                  </p>
                  <button type="button" onClick={chooseCustom}>
                    Create from scratch
                  </button>
                </article>
              </div>
            </section>
          ) : null}

          {step === 'role' ? (
            <section aria-labelledby="role-title" className="creation-step">
              <p className="eyebrow">
                {selectedStart ? selectedStart.name : 'Custom story'}
              </p>
              <h2 id="role-title">Who are you in this story?</h2>
              <p className="creation-intro">
                {selectedStart
                  ? 'The world and arrival are fixed. Shape the prisoner you want to play while keeping this beginning compatible.'
                  : 'Give the Storyteller enough to establish the world, your role and the immediate starting situation.'}
              </p>
              <label htmlFor="title">
                Story title <small>(optional)</small>
              </label>
              <input
                id="title"
                maxLength={160}
                value={content.title}
                onChange={(event) =>
                  setContent({ ...content, title: event.target.value })
                }
              />
              <label htmlFor="character-name">
                Character name <small>(optional)</small>
              </label>
              <input
                id="character-name"
                maxLength={120}
                value={content.characterName}
                onChange={(event) =>
                  setContent({ ...content, characterName: event.target.value })
                }
              />
              <label htmlFor="premise">
                {selectedStart
                  ? 'Your prisoner and their circumstances'
                  : 'World, character and starting circumstances'}
              </label>
              <textarea
                id="premise"
                rows={8}
                maxLength={6000}
                value={content.premise}
                onChange={(event) =>
                  setContent({ ...content, premise: event.target.value })
                }
              />
              <div className="creation-actions">
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => setStep('foundation')}
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!roleReady}
                  onClick={() => setStep('storyteller')}
                >
                  Continue to Storyteller
                </button>
              </div>
            </section>
          ) : null}

          {step === 'storyteller' ? (
            <section
              aria-labelledby="storyteller-title"
              className="creation-step"
            >
              <h2 id="storyteller-title">How should this be told?</h2>
              <p className="creation-intro">
                The Storyteller shapes voice, restraint and dramatic initiative.
                It does not replace the world or your character.
              </p>
              <StorytellerSelect
                value={content.storyteller ?? null}
                onChange={(storyteller) =>
                  setContent({ ...content, storyteller })
                }
              />
              <label htmlFor="direction">
                Personal direction <small>(optional)</small>
              </label>
              <p id="direction-help" className="field-help">
                Add tone, intensity, themes or boundaries for this story. Leave
                blank to trust the selected profile.
              </p>
              <textarea
                id="direction"
                rows={5}
                maxLength={2000}
                aria-describedby="direction-help"
                value={content.storytellingDirection}
                onChange={(event) =>
                  setContent({
                    ...content,
                    storytellingDirection: event.target.value,
                  })
                }
              />
              <div className="creation-actions">
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => setStep('role')}
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!storytellerReady}
                  onClick={() => setStep('review')}
                >
                  Review setup
                </button>
              </div>
            </section>
          ) : null}

          {step === 'review' ? (
            <section aria-labelledby="review-title" className="creation-step">
              <h2 id="review-title">Review your story setup.</h2>
              <p className="creation-intro">
                Saving still spends nothing. You will explicitly create the
                opening on the next screen with one bounded Storyteller call.
              </p>
              <dl className="creation-summary">
                <div>
                  <dt>Foundation</dt>
                  <dd>{selectedStart?.name ?? 'Custom story'}</dd>
                </div>
                <div>
                  <dt>Title</dt>
                  <dd>{content.title.trim() || 'Untitled story'}</dd>
                </div>
                <div>
                  <dt>Character</dt>
                  <dd>
                    {content.characterName.trim() ||
                      'Let the Storyteller establish the name'}
                  </dd>
                </div>
                <div>
                  <dt>Your role and beginning</dt>
                  <dd>{content.premise}</dd>
                </div>
                <div>
                  <dt>Storyteller</dt>
                  <dd>{content.storyteller?.id ?? 'Not selected'}</dd>
                </div>
                <div>
                  <dt>Personal direction</dt>
                  <dd>
                    {content.storytellingDirection.trim() ||
                      'Use the profile defaults'}
                  </dd>
                </div>
              </dl>
              <div className="creation-actions">
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => setStep('storyteller')}
                >
                  Edit setup
                </button>
                <button
                  type="submit"
                  disabled={
                    !roleReady ||
                    !storytellerReady ||
                    (!dirty && Boolean(saved))
                  }
                >
                  {pending
                    ? 'Saving…'
                    : dirty || !saved
                      ? 'Save setup'
                      : 'Setup saved'}
                </button>
              </div>
            </section>
          ) : null}
        </fieldset>
      </form>

      <p role={conflict ? 'alert' : 'status'}>{message}</p>
      {conflict ? (
        <p>
          <button disabled={pending} onClick={() => void loadSaved()}>
            Load saved setup
          </button>
        </p>
      ) : null}
      {saved && !dirty && !pending && step === 'review' ? (
        <p className="creation-primary-link">
          <a className="button" href={`/stories/${id}/preview`}>
            Create the opening
          </a>
        </p>
      ) : null}
      <p>
        <a
          href="/stories"
          onClick={(event) => {
            if (dirty && !window.confirm('Leave without saving this setup?'))
              event.preventDefault();
          }}
        >
          Back to your stories
        </a>
      </p>
    </main>
  );
}
