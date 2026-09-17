import { z } from 'zod';
import { interactionSchema, interactionSubmissionSchema } from './interactions';

export const passageContentSchema = z.strictObject({
  version: z.literal(1),
  title: z.string().min(1).max(160),
  paragraphs: z.array(z.string().min(1).max(6000)).min(1).max(10),
});
export const storySnapshotSchema = z.strictObject({
  id: z.uuid(),
  revision: z.number().int().positive(),
  viewVersion: z.number().int().positive(),
  canRespond: z.boolean().default(false),
  decision: z
    .strictObject({
      dueAt: z.iso.datetime(),
      defaultOptionId: z.string(),
    })
    .nullable()
    .default(null),
  waiting: z
    .strictObject({
      dueAt: z.iso.datetime().nullable(),
      canControl: z.boolean(),
      controlRevision: z.number().int().nonnegative(),
      remainingMs: z.number().int().nonnegative().nullable(),
      gameDurationMs: z.number().int().positive(),
    })
    .nullable()
    .default(null),
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
  scenario: z.enum(['chamber.v1', 'chamber.v2', 'chamber.v3', 'chamber.v4']),
});
export const respondToStorySchema = z.strictObject({
  expectedRevision: z.number().int().positive().max(2147483646),
  submission: interactionSubmissionSchema,
});
export const controlIntervalSchema = z.strictObject({
  intervalId: z.uuid(),
  expectedControlRevision: z.number().int().nonnegative().max(2147483646),
  action: z.enum(['pause', 'resume']),
});
