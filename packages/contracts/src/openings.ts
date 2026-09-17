import { z } from 'zod';

export const requestOpeningSchema = z.strictObject({
  expectedRevision: z.number().int().positive().max(2147483647),
});
export const openingPreviewSchema = z.strictObject({
  id: z.uuid(),
  sourceRevision: z.number().int().positive(),
  isCurrent: z.boolean(),
  mode: z.literal('scripted'),
  state: z.enum(['pending', 'running', 'succeeded', 'failed', 'uncertain']),
  opening: z.string().max(6000).nullable(),
});
export type OpeningPreview = z.infer<typeof openingPreviewSchema>;
export const latestOpeningSchema = z.strictObject({
  preview: openingPreviewSchema.nullable(),
});
