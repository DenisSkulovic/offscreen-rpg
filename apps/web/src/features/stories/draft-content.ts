import { z } from 'zod';
import { draftContentSchema } from '@offscreen/contracts/drafts';
import type { Draft, DraftContent } from '@offscreen/contracts/drafts';
import { storytellerReferenceSchema } from '@offscreen/contracts/storytellers';

/** RHF input schema: same fields as draft content, no Zod defaults (avoids input/output skew). */
export const draftEditorFormSchema = z.strictObject({
  storyteller: storytellerReferenceSchema.nullable(),
  openingContentId: z
    .string()
    .regex(/^[a-z0-9][a-z0-9.-]{0,99}$/)
    .nullable(),
  characterName: z.string().max(120),
  title: z.string().max(160),
  premise: z.string().max(6000),
  storytellingDirection: z.string().max(2000),
});

export type DraftEditorFormValues = z.infer<typeof draftEditorFormSchema>;

export const emptyDraftContent: DraftEditorFormValues = {
  storyteller: null,
  openingContentId: null,
  characterName: '',
  title: '',
  premise: '',
  storytellingDirection: '',
};

export function contentFromDraft(draft: Draft): DraftEditorFormValues {
  return draftEditorFormSchema.parse({
    storyteller: draft.storyteller ?? null,
    openingContentId: draft.openingContentId,
    characterName: draft.characterName,
    title: draft.title,
    premise: draft.premise,
    storytellingDirection: draft.storytellingDirection,
  });
}

export function toDraftContent(values: DraftEditorFormValues): DraftContent {
  return draftContentSchema.parse(values);
}
