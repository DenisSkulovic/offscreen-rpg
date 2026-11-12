'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  draftEditorFormSchema,
  emptyDraftContent,
  contentFromDraft,
  type DraftEditorFormValues,
} from '@/src/features/stories/draft-content';
import type { Draft } from '@offscreen/contracts/drafts';

/**
 * RHF draft surface for Storybook pristine/dirty/409 states.
 * Does not call Nest; conflict is a controlled prop.
 */
export function DraftStatePanel({
  draft = null,
  conflict = false,
  message = '',
}: {
  draft?: Draft | null;
  conflict?: boolean;
  message?: string;
}) {
  const {
    register,
    formState: { isDirty, errors },
  } = useForm<DraftEditorFormValues>({
    resolver: zodResolver(draftEditorFormSchema),
    mode: 'onTouched',
    defaultValues: draft ? contentFromDraft(draft) : emptyDraftContent,
  });

  return (
    <main className="editor">
      <p className="eyebrow">Storybook · Draft editor states</p>
      <h1>{draft ? 'Continue setup' : 'New draft'}</h1>
      <form
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <label>
          Title{' '}
          <input aria-invalid={Boolean(errors.title)} {...register('title')} />
        </label>
        <label>
          Premise{' '}
          <textarea
            aria-invalid={Boolean(errors.premise)}
            {...register('premise')}
          />
        </label>
        <p role="status">
          Form session: {isDirty ? 'dirty' : 'pristine'}
          {draft ? ` · revision ${draft.revision}` : ''}
        </p>
        <button type="submit" disabled={!isDirty && Boolean(draft)}>
          Save setup
        </button>
      </form>
      <p role={conflict ? 'alert' : 'status'}>
        {message ||
          (conflict
            ? 'Another save updated this draft. Load the saved setup before editing again.'
            : '')}
      </p>
      {conflict ? (
        <p>
          <button type="button">Load saved setup</button>
        </p>
      ) : null}
    </main>
  );
}
