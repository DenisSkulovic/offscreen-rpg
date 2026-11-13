import { campaignViewSchema, campaignStartSchema } from './campaign';
import { storytellerSummarySchema } from './storytellers';
import { z } from 'zod';
import { interactionSchema, interactionSubmissionSchema } from './interactions';

export const storyItemReferenceSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const storyItemSchema = z.strictObject({
  key: storyItemReferenceSchema,
  label: z.string().min(1).max(160),
  holderKey: storyItemReferenceSchema,
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
    itemKey: storyItemReferenceSchema,
    fromHolder: storyItemReferenceSchema,
    toHolder: storyItemReferenceSchema,
  })
  .refine(
    (effect) => effect.fromHolder !== effect.toHolder,
    'Transfer must change holder',
  );
export const itemCreateSchema = z.strictObject({
  kind: z.literal('item.create.v1'),
  itemKey: storyItemReferenceSchema,
  label: z.string().min(1).max(160),
  holderKey: storyItemReferenceSchema,
});
export const storyItemEffectSchema = z.discriminatedUnion('kind', [
  itemCreateSchema,
  itemTransferSchema,
]);
export const passageContentSchema = z.strictObject({
  version: z.literal(1),
  title: z.string().min(1).max(160),
  paragraphs: z.array(z.string().min(1).max(6000)).min(1).max(10),
});

/** Published optional scene appearance. Directive body is frontend-validated. */
export const publicSceneAppearanceAssetSchema = z.strictObject({
  src: z
    .string()
    .min(1)
    .max(500)
    .refine(
      (value) =>
        value.startsWith('/') ||
        value.startsWith('https://') ||
        value.startsWith('http://localhost'),
      'Asset src must be a same-origin path or approved https/localhost URL',
    ),
  width: z.number().int().positive().max(8192),
  height: z.number().int().positive().max(8192),
  description: z.string().max(500).nullable(),
});
export const publicSceneAppearanceV1Schema = z.strictObject({
  source: z.strictObject({
    storyId: z.uuid(),
    passageId: z.uuid(),
    interactionId: z.string().min(1).max(100).optional(),
    campaignOfferId: z.uuid().optional(),
  }),
  directive: z.unknown(),
  assets: z
    .record(z.string().min(1).max(80), publicSceneAppearanceAssetSchema)
    .optional(),
});
export type PublicSceneAppearanceV1 = z.infer<
  typeof publicSceneAppearanceV1Schema
>;

/** Drop corrupt decoration without failing the story snapshot. */
export function readOptionalSceneAppearance(
  value: unknown,
): PublicSceneAppearanceV1 | undefined {
  if (value === undefined || value === null) return undefined;
  const parsed = publicSceneAppearanceV1Schema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export const storySnapshotSchema = z.strictObject({
  campaign: campaignViewSchema.nullable().optional(),
  id: z.uuid(),
  lineage: z
    .strictObject({
      sourceStoryId: z.uuid(),
      sourcePassageId: z.uuid(),
      sourceSequence: z.number().int().positive(),
    })
    .nullable()
    .default(null),
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
    appearance: publicSceneAppearanceV1Schema.optional(),
  }),
  resolution: z
    .strictObject({
      state: z.enum(['pending', 'running', 'failed', 'uncertain', 'blocked']),
      evidence: z.enum(['committed', 'pending-action']).default('committed'),
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

/** GM05 public committed-event page (derived projection). */
export const publicStoryEventSchema = z.strictObject({
  id: z.uuid(),
  sequence: z.number().int().positive(),
  kind: z.enum([
    'passage-published',
    'action-settled',
    'action-interrupted',
    'activity-development',
    'world-development',
  ]),
  gameSecond: z.number().int().nonnegative().nullable(),
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500).nullable(),
  source: z.strictObject({
    kind: z.enum([
      'passage',
      'action-execution',
      'activity-event',
      'world-obligation',
    ]),
    id: z.uuid(),
    passageId: z.uuid().optional(),
  }),
});
export const storyEventPageSchema = z.strictObject({
  items: z.array(publicStoryEventSchema).max(50),
  nextBefore: z.number().int().positive().nullable(),
  coverage: z.enum(['since-enabled', 'complete']),
});
export type PublicStoryEvent = z.infer<typeof publicStoryEventSchema>;
export type StoryEventPage = z.infer<typeof storyEventPageSchema>;

export const startStorySchema = z.strictObject({
  campaign: campaignStartSchema.optional(),
  candidateId: z.uuid(),
  expectedDraftRevision: z.number().int().positive().max(2147483646),
});
export const forkStorySchema = z.strictObject({
  expectedRevision: z.number().int().positive().max(2147483646),
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
/** Owner-scoped read-only resolution operation receipt (W19). Never includes submission body. */
export const resolutionOperationReceiptSchema = z.strictObject({
  operationId: z.uuid(),
  storyId: z.uuid(),
  state: z.enum(['admitted', 'processing', 'settled', 'failed', 'uncertain']),
  viewVersion: z.number().int().positive(),
  resolutionVersion: z.number().int().nonnegative(),
  reason: z.string().max(80).nullable(),
  recovery: z.enum(['retry', 'refresh', 'operator', 'none']).nullable(),
  requestDigest: z.string().regex(/^[a-f0-9]{64}$/),
});
export type ResolutionOperationReceipt = z.infer<
  typeof resolutionOperationReceiptSchema
>;
/**
 * Deterministic JSON for SHA-256 requestDigest. Object keys are sorted at every
 * level so Postgres jsonb round-trips and client envelopes compare equal.
 */
export function canonicalResolutionRequestJson(input: {
  expectedRevision: number;
  submission: unknown;
}): string {
  return canonicalJsonValue({
    expectedRevision: input.expectedRevision,
    submission: input.submission,
  });
}
function canonicalJsonValue(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJsonValue(entry)).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([left], [right]) => left.localeCompare(right),
  );
  return `{${entries
    .map(
      ([key, entry]) => `${JSON.stringify(key)}:${canonicalJsonValue(entry)}`,
    )
    .join(',')}}`;
}
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

/**
 * Public SSE invalidation hint only (W16). Never carries narration, plans,
 * receipts or private logs. Clients must GET the authorized snapshot.
 */
export const storyUpdateHintSchema = z.strictObject({
  eventId: z.uuid(),
  storyId: z.uuid(),
  viewVersion: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  kind: z.literal('committed-view'),
});
export type StoryUpdateHint = z.infer<typeof storyUpdateHintSchema>;

/** PostgreSQL NOTIFY channel for committed story viewVersion bumps. */
export const STORY_VIEW_NOTIFY_CHANNEL = 'offscreen_story_view' as const;
