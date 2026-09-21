import { z } from 'zod';
import { storytellerReferenceSchema } from './storytellers';

export const draftIdSchema = z.uuid();
export const draftContentSchema = z.strictObject({
  storyteller: storytellerReferenceSchema.nullable().optional(),
  openingContentId: z
    .string()
    .regex(/^[a-z0-9][a-z0-9.-]{0,99}$/)
    .nullable()
    .default(null),
  characterName: z.string().max(120).default(''),
  title: z.string().max(160),
  premise: z.string().max(6000),
  storytellingDirection: z.string().max(2000),
});
export const saveDraftSchema = draftContentSchema.extend({
  expectedRevision: z.number().int().min(0).max(2147483646),
});
export const draftSchema = draftContentSchema.extend({
  id: draftIdSchema,
  revision: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const draftListSchema = z.strictObject({
  items: z.array(draftSchema),
  nextCursor: draftIdSchema.nullable(),
});
export type Draft = z.infer<typeof draftSchema>;
export type DraftContent = z.infer<typeof draftContentSchema>;
export type SaveDraft = z.infer<typeof saveDraftSchema>;
