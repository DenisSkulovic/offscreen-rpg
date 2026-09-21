import { z } from 'zod';
import { storytellerSummarySchema } from './storytellers';
import { choiceSpecificationSchema } from './interactions';
import { passageContentSchema } from './stories';
import { startPackageReferenceSchema } from './campaign';

export const requestOpeningSchema = z.strictObject({
  expectedRevision: z.number().int().positive().max(2147483647),
  contentId: z
    .string()
    .regex(/^[a-z0-9][a-z0-9.-]{0,99}$/)
    .optional(),
  startPackage: startPackageReferenceSchema.optional(),
});
export const mechanicalContentSummarySchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9.-]{0,99}$/),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(300),
  startPackage: startPackageReferenceSchema.optional(),
  draft: z
    .strictObject({
      title: z.string().max(160),
      premise: z.string().max(6000),
      storytellingDirection: z.string().max(2000),
    })
    .optional(),
});
export const mechanicalContentCatalogueSchema = z.strictObject({
  entries: z.array(mechanicalContentSummarySchema).max(32),
});
export type MechanicalContentSummary = z.infer<
  typeof mechanicalContentSummarySchema
>;
export const openingCandidateSchema = z.strictObject({
  content: passageContentSchema,
  interaction: choiceSpecificationSchema,
});
export const openingPreviewSchema = z.strictObject({
  id: z.uuid(),
  sourceRevision: z.number().int().positive(),
  isCurrent: z.boolean(),
  mode: z.enum(['scripted', 'provider']),
  storyteller: storytellerSummarySchema.nullable().optional(),
  contentId: z.string().optional(),
  startPackage: startPackageReferenceSchema.optional(),
  state: z.enum(['pending', 'running', 'succeeded', 'failed', 'uncertain']),
  candidate: openingCandidateSchema.nullable(),
});
export type OpeningCandidate = z.infer<typeof openingCandidateSchema>;
export type OpeningPreview = z.infer<typeof openingPreviewSchema>;
export const latestOpeningSchema = z.strictObject({
  preview: openingPreviewSchema.nullable(),
});
