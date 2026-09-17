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
export const startChamberSchema = z.strictObject({
  scenario: z.literal('chamber.v1'),
});
