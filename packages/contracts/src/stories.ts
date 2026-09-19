import { campaignViewSchema, campaignStartSchema } from './campaign';
import { storytellerSummarySchema } from './storytellers';
import { z } from 'zod';
import { interactionSchema, interactionSubmissionSchema } from './interactions';

const itemReference = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const storyItemSchema = z.strictObject({
  key: itemReference,
  label: z.string().min(1).max(160),
  holderKey: itemReference,
});
export const storyItemsSchema = z
  .array(storyItemSchema)
  .max(50)
  .refine(
    (items) => new Set(items.map((item) => item.key)).size === items.length,
    'Item identities must be unique',
  );
export const itemTransferSchema = z
  .strictObject({
    kind: z.literal('item.transfer.v1'),
    itemKey: itemReference,
    fromHolder: itemReference,
    toHolder: itemReference,
  })
  .refine(
    (effect) => effect.fromHolder !== effect.toHolder,
    'Transfer must change holder',
  );
export const passageContentSchema = z.strictObject({
  version: z.literal(1),
  title: z.string().min(1).max(160),
  paragraphs: z.array(z.string().min(1).max(6000)).min(1).max(10),
});
export const storySnapshotSchema = z.strictObject({
  campaign: campaignViewSchema.nullable().optional(),
  id: z.uuid(),
  revision: z.number().int().positive(),
  viewVersion: z.number().int().positive(),
  canRespond: z.boolean().default(false),
  storyteller: storytellerSummarySchema.nullable().optional(),
  sourceMode: z.enum(['scripted', 'provider']).optional(),
  usage: z
    .strictObject({
      settledMicrousd: z.string().regex(/^\d+$/),
      reservedMicrousd: z.string().regex(/^\d+$/),
    })
    .optional(),
  items: storyItemsSchema.default([]),
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
  resolution: z
    .strictObject({
      state: z.enum(['pending', 'running', 'failed', 'uncertain', 'blocked']),
      version: z.number().int().nonnegative().optional(),
      reason: z.string().max(80).nullable().optional(),
      blocker: z
        .strictObject({
          kind: z.enum([
            'funding',
            'usage-window',
            'authority',
            'task-input',
            'provider-disabled',
            'usage-uncertain',
            'publication',
            'generation',
          ]),
          recovery: z.enum(['retry', 'refresh', 'operator', 'none']),
        })
        .nullable()
        .optional(),
      canRetry: z.boolean().optional(),
    })
    .nullable()
    .default(null),
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
export const startStorySchema = z.strictObject({
  campaign: campaignStartSchema.optional(),
  candidateId: z.uuid(),
  expectedDraftRevision: z.number().int().positive().max(2147483646),
});
export const startChamberSchema = z.strictObject({
  scenario: z.enum([
    'chamber.v1',
    'chamber.v2',
    'chamber.v3',
    'chamber.v4',
    'chamber.v5',
  ]),
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

export const storyListSchema = z.strictObject({
  items: z
    .array(
      z.strictObject({
        id: z.uuid(),
        title: z.string(),
        storyteller: storytellerSummarySchema.nullable(),
        status: z.string(),
      }),
    )
    .max(20),
  nextBefore: z.uuid().nullable(),
});
export type StoryList = z.infer<typeof storyListSchema>;
