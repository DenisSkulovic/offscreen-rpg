import { z } from 'zod';
import { interactionSchema } from './interactions';

export const passageContentSchema = z.strictObject({
  version: z.literal(1),
  title: z.string().min(1).max(160),
  paragraphs: z.array(z.string().min(1).max(6000)).min(1).max(10),
});
export const storySnapshotSchema = z.strictObject({
  id: z.uuid(),
  revision: z.number().int().positive(),
  current: z.strictObject({
    id: z.uuid(),
    content: passageContentSchema,
    interaction: interactionSchema.nullable(),
  }),
});
export type StorySnapshot = z.infer<typeof storySnapshotSchema>;
// History is read-only presentation. Past offers are not actionable controls.
export const storyHistorySchema = z.strictObject({
  items: z
    .array(
      z.strictObject({
        id: z.uuid(),
        sequence: z.number().int().positive(),
        content: passageContentSchema,
      }),
    )
    .max(20),
  nextBefore: z.number().int().positive().nullable(),
});
export type StoryHistory = z.infer<typeof storyHistorySchema>;
export const startChamberSchema = z.strictObject({
  scenario: z.literal('chamber.v1'),
});
