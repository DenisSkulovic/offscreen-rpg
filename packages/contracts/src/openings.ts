import { z } from 'zod';
import { storytellerSummarySchema } from './storytellers';
import { choiceSpecificationSchema } from './interactions';
import { passageContentSchema } from './stories';

export const requestOpeningSchema = z.strictObject({
  expectedRevision: z.number().int().positive().max(2147483647),
});
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
  state: z.enum(['pending', 'running', 'succeeded', 'failed', 'uncertain']),
  candidate: openingCandidateSchema.nullable(),
});
export type OpeningCandidate = z.infer<typeof openingCandidateSchema>;
export type OpeningPreview = z.infer<typeof openingPreviewSchema>;
export const latestOpeningSchema = z.strictObject({
  preview: openingPreviewSchema.nullable(),
});
