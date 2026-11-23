import { z } from 'zod';

export const storytellerReferenceSchema = z.strictObject({
  id: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z][a-z0-9-]*$/),
  revision: z.number().int().positive(),
});
export const storytellerSummarySchema = storytellerReferenceSchema.extend({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(300),
});
export const storytellerCatalogueSchema = z.strictObject({
  items: z.array(storytellerSummarySchema).max(200),
});
export type StorytellerReference = z.infer<typeof storytellerReferenceSchema>;
export type StorytellerSummary = z.infer<typeof storytellerSummarySchema>;
