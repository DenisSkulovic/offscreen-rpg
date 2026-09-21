import { z } from 'zod';
import { rollSchema } from '@offscreen/game/checks';
import { outcomeEffectsSchema } from '@offscreen/game/effects';
import {
  activityAccessSchema,
  storyFactDeclarationsSchema,
} from '@offscreen/game/immediate-actions';
import { offerSchema } from '@offscreen/game/offers';
import { characterSchema, storyFactsSchema } from '@offscreen/game/state';
import { paceSchema } from '@offscreen/game/time';
import {
  defaultWorldTimeDefinition,
  worldTimeDefinitionSchema,
  worldTimeViewSchema,
} from '@offscreen/game/calendar';
import {
  publicWorldObligationSchema,
  worldConditionSchema,
  worldObligationDueSchema,
  worldObligationProposalSchema,
} from '@offscreen/game/world-obligations';
import { storytellerReferenceSchema } from './storytellers';
import {
  startPackageReferenceSchema,
  worldPackageReferenceSchema,
} from '@offscreen/documents/schema';
export { startPackageReferenceSchema } from '@offscreen/documents/schema';
export type { StartPackageReference } from '@offscreen/documents/schema';

export const narrativeTagSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]{1,60}$/),
  description: z.string().trim().min(1).max(400),
});
export const creativeSettingsSchema = z.strictObject({
  profile: storytellerReferenceSchema,
  tone: z.string().trim().min(1).max(1200),
  emphasis: z.enum(['balanced', 'economy', 'growth', 'adventure', 'social']),
  surprises: z.enum(['rare', 'occasional', 'frequent']),
  tags: z
    .array(narrativeTagSchema)
    .max(16)
    .refine((tags) => new Set(tags.map((tag) => tag.id)).size === tags.length),
  guidance: z.array(z.string().trim().min(1).max(1200)).max(4),
});
export type CreativeSettings = z.infer<typeof creativeSettingsSchema>;

export const campaignSettingsSchema = z.strictObject({
  revision: z.number().int().positive(),
  creative: creativeSettingsSchema,
  pace: paceSchema,
  time: worldTimeDefinitionSchema.default(defaultWorldTimeDefinition),
  locked: z.boolean(),
  rules: z.literal('srd-5.2.1-subset.v1'),
  risk: z.literal('nonlethal'),
});
export type CampaignSettings = z.infer<typeof campaignSettingsSchema>;

const campaignActivityViewSchema = z.strictObject({
  id: z.uuid(),
  label: z.string(),
  state: z.enum([
    'running',
    'paused',
    'encounter',
    'suspended',
    'blocked',
    'complete',
    'abandoned',
  ]),
  boundariesSettled: z.number().int().nonnegative(),
  revision: z.number().int(),
  completionPending: z.boolean(),
  progress: z.discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('contribution'),
      label: z.string().min(1).max(120),
      earned: z.number().int().nonnegative(),
      required: z.number().int().positive(),
    }),
    z.strictObject({
      kind: z.literal('wait'),
      label: z.string().min(1).max(120),
      elapsedTicks: z.number().int().nonnegative(),
      requiredTicks: z.number().int().positive(),
    }),
  ]),
  dueAt: z.iso.datetime().nullable(),
  estimatedCompletionAt: z.iso.datetime().nullable(),
  resolvedTicks: z.number().int().nonnegative(),
  settingsRevision: z.number().int(),
});

export const campaignActivityEventKindSchema = z.enum([
  'started',
  'paused',
  'resumed',
  'suspended',
  'blocked',
  'interrupted',
  'completion-pending',
  'completed',
  'abandoned',
  'failed',
  'expired',
  'invalidated',
]);
export type CampaignActivityEventKind = z.infer<
  typeof campaignActivityEventKindSchema
>;

export const campaignActivityEventSchema = z.strictObject({
  id: z.uuid(),
  ordinal: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  activityId: z.uuid(),
  activityRevision: z.number().int().nonnegative(),
  tick: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  kind: campaignActivityEventKindSchema,
  label: z.string().trim().min(1).max(200),
  summary: z.string().trim().min(1).max(1000),
  createdAt: z.iso.datetime(),
});

export const campaignActivityReportSchema = z.strictObject({
  id: z.uuid(),
  activityId: z.uuid(),
  activityRevision: z.number().int().nonnegative(),
  sourceTick: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  label: z.string().trim().min(1).max(200),
  factualSummary: z.string().trim().min(1).max(1000),
  state: z.enum(['pending', 'generating', 'published', 'unavailable']),
  report: z
    .strictObject({
      version: z.literal(1),
      title: z.string().min(1).max(160),
      paragraphs: z.array(z.string().min(1).max(6000)).min(1).max(10),
    })
    .nullable(),
  createdAt: z.iso.datetime(),
  publishedAt: z.iso.datetime().nullable(),
});

export const campaignWorldObligationReportSchema = z.strictObject({
  id: z.uuid(),
  obligationId: z.uuid(),
  obligationRevision: z.number().int().positive(),
  sourceTick: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  label: z.string().trim().min(1).max(200),
  factualSummary: z.string().trim().min(1).max(1000),
  state: z.enum(['pending', 'generating', 'published', 'unavailable']),
  report: z
    .strictObject({
      version: z.literal(1),
      title: z.string().min(1).max(160),
      paragraphs: z.array(z.string().min(1).max(6000)).min(1).max(10),
    })
    .nullable(),
  createdAt: z.iso.datetime(),
  publishedAt: z.iso.datetime().nullable(),
});

export const acceptedActivityPlanViewSchema = z.strictObject({
  id: z.uuid(),
  revision: z.number().int().nonnegative(),
  state: z.enum([
    'active',
    'blocked',
    'complete',
    'cancelled',
    'horizon-reached',
  ]),
  cursor: z.number().int().nonnegative(),
  acceptedAtTick: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  horizonTick: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  entries: z
    .array(
      z.strictObject({
        id: z.uuid(),
        label: z.string().trim().min(1).max(200),
        state: z.enum([
          'pending',
          'running',
          'complete',
          'blocked',
          'cancelled',
        ]),
        activityId: z.uuid().nullable(),
      }),
    )
    .min(2)
    .max(6),
  blockedReason: z.string().trim().min(1).max(500).nullable(),
});

export const campaignViewSchema = z.strictObject({
  settings: campaignSettingsSchema,
  character: characterSchema.nullable(),
  storyFacts: storyFactsSchema,
  location: z.string().nullable(),
  tick: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  worldTime: worldTimeViewSchema,
  holds: z.array(
    z.discriminatedUnion('kind', [
      z.strictObject({
        kind: z.literal('storyteller-intent'),
        operationId: z.uuid(),
        reason: z.literal('required-turn'),
      }),
      z.strictObject({
        kind: z.literal('storyteller'),
        generationId: z.uuid(),
        reason: z.literal('required-turn'),
      }),
      z.strictObject({
        kind: z.literal('decision'),
        offerId: z.uuid(),
        reason: z.literal('player-choice'),
      }),
      z.strictObject({
        kind: z.literal('world-obligation'),
        obligationId: z.uuid(),
        reason: z.literal('controlling-event'),
      }),
    ]),
  ),
  offer: offerSchema.nullable(),
  activityAccess: activityAccessSchema,
  activity: campaignActivityViewSchema.nullable(),
  actionExecution: z
    .strictObject({
      operationId: z.uuid(),
      label: z.string().min(1).max(200),
      startTick: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
      targetTick: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
      state: z.enum(['running', 'paused']),
      revision: z.number().int().nonnegative(),
      dueAt: z.iso.datetime().nullable(),
    })
    .nullable(),
  actionExecutionEvents: z
    .array(
      z.strictObject({
        id: z.uuid(),
        ordinal: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
        executionId: z.uuid(),
        executionRevision: z.number().int().nonnegative(),
        tick: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
        kind: z.enum([
          'started',
          'paused',
          'resumed',
          'pace-changed',
          'interrupted',
          'settled',
        ]),
        label: z.string().min(1).max(200),
        createdAt: z.iso.datetime(),
      }),
    )
    .max(100),
  // This is a compact set of unfinished promises, not a universal task list.
  // `activity` remains the one identity allowed to advance right now.
  commitments: z.array(campaignActivityViewSchema).max(20),
  activityEvents: z.array(campaignActivityEventSchema).max(100),
  activityReports: z.array(campaignActivityReportSchema).max(50),
  worldObligationReports: z.array(campaignWorldObligationReportSchema).max(50),
  worldConditions: z.array(worldConditionSchema).max(64),
  worldObligations: z.array(publicWorldObligationSchema).max(50),
  worldObligationEvents: z
    .array(
      z.strictObject({
        id: z.uuid(),
        ordinal: z.number().int().positive(),
        obligationId: z.uuid(),
        obligationRevision: z.number().int().positive(),
        tick: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
        kind: z.enum(['fired', 'postponed', 'cancelled']),
        label: z.string().trim().min(1).max(160),
        createdAt: z.iso.datetime(),
      }),
    )
    .max(100),
  acceptedActivityPlan: acceptedActivityPlanViewSchema.nullable(),
  rolls: z
    .array(
      z.strictObject({
        id: z.uuid(),
        segment: z.number().int(),
        tick: z.number().int().nonnegative(),
        roll: rollSchema,
        effects: outcomeEffectsSchema,
      }),
    )
    .max(100),
  actionReceipts: z
    .array(
      z.strictObject({
        id: z.uuid(),
        label: z.string().max(200),
        intention: z.string().max(500),
        outcome: z.enum(['automatic', 'success', 'failure']),
        text: z.string().max(1000),
        effects: outcomeEffectsSchema,
        declarations: storyFactDeclarationsSchema,
        roll: rollSchema.nullable(),
        state: z.enum(['pending', 'generating', 'published', 'failed']),
      }),
    )
    .max(20),
});
export type CampaignView = z.infer<typeof campaignViewSchema>;

export const settingsCommandSchema = z.strictObject({
  expectedRevision: z.number().int().positive(),
  creative: creativeSettingsSchema,
  presetId: z.uuid().optional(),
});
export const actionCommandSchema = z
  .strictObject({
    expectedRevision: z.number().int().positive(),
    offerId: z.uuid(),
    path: z.array(z.string().max(80)).min(1).max(3),
    successorPaths: z
      .array(z.array(z.string().max(80)).min(1).max(3))
      .min(1)
      .max(5)
      .optional(),
    horizonTicks: z.number().int().positive().max(10080).optional(),
  })
  .refine(
    (value) =>
      (value.successorPaths === undefined) ===
      (value.horizonTicks === undefined),
    'Accepted successors require exactly one finite tick horizon',
  );
export const activityControlSchema = z
  .strictObject({
    activityId: z.uuid(),
    expectedRevision: z.number().int().nonnegative(),
    action: z.enum(['pause', 'resume', 'pace']),
    pace: paceSchema.optional(),
  })
  .refine((value) => (value.action === 'pace') === (value.pace !== undefined));
export const actionExecutionControlSchema = z
  .strictObject({
    executionId: z.uuid(),
    expectedRevision: z.number().int().nonnegative(),
    action: z.enum(['pause', 'resume', 'pace']),
    pace: paceSchema.optional(),
  })
  .refine((value) => (value.action === 'pace') === (value.pace !== undefined));
export const acceptedActivityPlanControlSchema = z.strictObject({
  planId: z.uuid(),
  expectedRevision: z.number().int().nonnegative(),
  action: z.literal('cancel-pending'),
});
export const worldObligationControlSchema = z.discriminatedUnion('action', [
  z.strictObject({
    obligationId: z.uuid(),
    expectedRevision: z.number().int().positive(),
    action: z.literal('postpone'),
    due: worldObligationDueSchema,
  }),
  z.strictObject({
    obligationId: z.uuid(),
    expectedRevision: z.number().int().positive(),
    action: z.literal('cancel'),
  }),
]);
export const campaignStartSchema = z.strictObject({
  mechanics: z.boolean().default(false),
  locked: z.boolean().default(false),
  pace: paceSchema.default({ kind: 'rate', ticks: 1, realMs: 1000 }),
  time: worldTimeDefinitionSchema.default(defaultWorldTimeDefinition),
  worldObligations: z.array(worldObligationProposalSchema).max(50).default([]),
  worlds: z.array(worldPackageReferenceSchema).max(8).default([]),
  startPackage: startPackageReferenceSchema.optional(),
});
export type CampaignStart = z.infer<typeof campaignStartSchema>;
