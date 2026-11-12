'use client';

import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Draft } from '@offscreen/contracts/drafts';
import type { MechanicalContentSummary } from '@offscreen/contracts/openings';
import { SessionRefresh } from '@/src/features/session/session-refresh';
import { draftQueryOptions, readDraft } from '@/src/shared/api/draft-query';
import { queryKeys } from '@/src/shared/api/query-keys';
import {
  contentFromDraft,
  draftEditorFormSchema,
  emptyDraftContent,
  toDraftContent,
  type DraftEditorFormValues,
} from './draft-content';
import { StorytellerSelect } from './storyteller-select';
import { useDraftSave } from './use-draft-save';

type CreationStep = 'foundation' | 'role' | 'storyteller' | 'review';

const steps: ReadonlyArray<{ id: CreationStep; label: string }> = [
  { id: 'foundation', label: 'Foundation' },
  { id: 'role', label: 'Your role' },
  { id: 'storyteller', label: 'Storyteller' },
  { id: 'review', label: 'Review' },
];

export function DraftEditor({
  viewerId,
  id,
  initial,
  preparedStarts,
}: {
  viewerId: string;
  id: string;
  initial: Draft | null;
  preparedStarts: MechanicalContentSummary[];
}) {
  const queryClient = useQueryClient();
  const [draftKnown, setDraftKnown] = useState(initial != null);
  const { data: saved = initial } = useQuery({
    ...draftQueryOptions(viewerId, id),
    enabled: draftKnown,
    ...(initial ? { initialData: initial } : {}),
  });
  const save = useDraftSave(viewerId);
  const [step, setStep] = useState<CreationStep>(
    initial ? 'review' : 'foundation',
  );
  const [message, setMessage] = useState('');
  const [conflict, setConflict] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    getValues,
    setValue,
    reset,
    resetDefaultValues,
    setFocus,
    formState: { isDirty, errors, dirtyFields: _dirtyFields },
  } = useForm<DraftEditorFormValues>({
    resolver: zodResolver(draftEditorFormSchema),
    mode: 'onTouched',
    defaultValues: initial ? contentFromDraft(initial) : emptyDraftContent,
  });

  const content = watch();
  const selectedStart = useMemo(
    () =>
      preparedStarts.find((entry) => entry.id === content.openingContentId) ??
      null,
    [content.openingContentId, preparedStarts],
  );

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  function choosePrepared(entry: MechanicalContentSummary) {
    setValue('openingContentId', entry.id, { shouldDirty: true });
    setValue('title', entry.draft?.title ?? '', { shouldDirty: true });
    setValue('premise', entry.draft?.premise ?? '', { shouldDirty: true });
    setValue(
      'storytellingDirection',
      entry.draft?.storytellingDirection ?? '',
      { shouldDirty: true },
    );
    setMessage('');
    setStep('role');
  }

  function chooseCustom() {
    const storyteller = getValues('storyteller');
    reset({ ...emptyDraftContent, storyteller });
    setMessage('');
    setStep('role');
  }

  const onSave = handleSubmit(
    async (values) => {
      setMessage('');
      setConflict(false);
      const frozen = {
        draftId: id,
        expectedRevision: saved?.revision ?? 0,
        content: toDraftContent(values),
      };
      const result = await save.mutateAsync(frozen);
      if (result.kind === 'conflict') {
        setConflict(true);
        setMessage(
          'This setup changed elsewhere. Your choices are still here; load the saved version or keep this one open while you compare.',
        );
        return;
      }
      if (result.kind === 'unauthorized') {
        setMessage(
          'Your session expired. Sign in again, then save this setup.',
        );
        return;
      }
      if (result.kind === 'unavailable') {
        setMessage(
          'The save could not be confirmed. Your setup is still on this screen; retry when ready.',
        );
        return;
      }
      setDraftKnown(true);
      resetDefaultValues(contentFromDraft(result.draft));
      setMessage('Setup saved. It is ready to create an opening.');
      window.history.replaceState(null, '', `/stories/${id}`);
    },
    (formErrors) => {
      setMessage('Check the highlighted fields, then try again.');
      const order: (keyof DraftEditorFormValues)[] = [
        'title',
        'characterName',
        'premise',
        'storytellingDirection',
        'storyteller',
        'openingContentId',
      ];
      for (const field of order) {
        if (formErrors[field]) {
          setFocus(field);
          break;
        }
      }
    },
  );

  async function loadSaved() {
    if (!window.confirm('Discard these choices and load the saved setup?'))
      return;
    try {
      const latest = await readDraft(id);
      queryClient.setQueryData(queryKeys.draft(viewerId, id), latest);
      setDraftKnown(true);
      reset(contentFromDraft(latest));
      setConflict(false);
      setMessage('Saved setup loaded.');
      setStep('review');
    } catch {
      setMessage(
        'The saved setup could not be loaded. Your choices are unchanged.',
      );
    }
  }

  const pending = save.isPending;
  const roleReady = (content.premise ?? '').trim().length > 0;
  const storytellerReady = Boolean(content.storyteller);
  const premiseError = errors.premise?.message;
  const titleError = errors.title?.message;
  const directionError = errors.storytellingDirection?.message;
  const characterError = errors.characterName?.message;

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

      <form onSubmit={(event) => void onSave(event)}>
        <fieldset>
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
                aria-invalid={titleError ? true : undefined}
                aria-describedby={titleError ? 'title-error' : undefined}
                {...register('title')}
              />
              {titleError ? (
                <p id="title-error" role="alert" className="field-help">
                  {titleError}
                </p>
              ) : null}
              <label htmlFor="character-name">
                Character name <small>(optional)</small>
              </label>
              <input
                id="character-name"
                maxLength={120}
                aria-invalid={characterError ? true : undefined}
                aria-describedby={
                  characterError ? 'character-name-error' : undefined
                }
                {...register('characterName')}
              />
              {characterError ? (
                <p
                  id="character-name-error"
                  role="alert"
                  className="field-help"
                >
                  {characterError}
                </p>
              ) : null}
              <label htmlFor="premise">
                {selectedStart
                  ? 'Your prisoner and their circumstances'
                  : 'World, character and starting circumstances'}
              </label>
              <textarea
                id="premise"
                rows={8}
                maxLength={6000}
                aria-invalid={premiseError ? true : undefined}
                aria-describedby={premiseError ? 'premise-error' : undefined}
                {...register('premise')}
              />
              {premiseError ? (
                <p id="premise-error" role="alert" className="field-help">
                  {premiseError}
                </p>
              ) : null}
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
              <Controller
                control={control}
                name="storyteller"
                render={({ field }) => (
                  <StorytellerSelect
                    value={field.value ?? null}
                    onChange={field.onChange}
                  />
                )}
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
                aria-describedby={
                  directionError
                    ? 'direction-help direction-error'
                    : 'direction-help'
                }
                aria-invalid={directionError ? true : undefined}
                {...register('storytellingDirection')}
              />
              {directionError ? (
                <p id="direction-error" role="alert" className="field-help">
                  {directionError}
                </p>
              ) : null}
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
                  <dd>{(content.title ?? '').trim() || 'Untitled story'}</dd>
                </div>
                <div>
                  <dt>Character</dt>
                  <dd>
                    {(content.characterName ?? '').trim() ||
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
                    {(content.storytellingDirection ?? '').trim() ||
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
                    pending ||
                    !roleReady ||
                    !storytellerReady ||
                    (!isDirty && Boolean(saved))
                  }
                >
                  {pending
                    ? 'Saving…'
                    : isDirty || !saved
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
          <button
            type="button"
            disabled={pending}
            onClick={() => void loadSaved()}
          >
            Load saved setup
          </button>
        </p>
      ) : null}
      {saved && !isDirty && !pending && step === 'review' ? (
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
            if (isDirty && !window.confirm('Leave without saving this setup?'))
              event.preventDefault();
          }}
        >
          Back to your stories
        </a>
      </p>
    </main>
  );
}
