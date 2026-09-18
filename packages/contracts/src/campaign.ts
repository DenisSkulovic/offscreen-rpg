import { z } from 'zod';
import { rollSchema } from '@offscreen/game/checks';
import { outcomeEffectsSchema } from '@offscreen/game/effects';
import { offerSchema } from '@offscreen/game/offers';
import { characterSchema } from '@offscreen/game/state';
import { paceSchema } from '@offscreen/game/time';
import { storytellerReferenceSchema } from './storytellers';

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
  locked: z.boolean(),
  rules: z.literal('srd-5.2.1-subset.v1'),
  risk: z.literal('nonlethal'),
});
export type CampaignSettings = z.infer<typeof campaignSettingsSchema>;

export const campaignViewSchema = z.strictObject({
  settings: campaignSettingsSchema,
  character: characterSchema.nullable(),
  location: z.string().nullable(),
  tick: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  offer: offerSchema.nullable(),
  activity: z
    .strictObject({
      id: z.uuid(),
      label: z.string(),
      state: z.enum([
        'running',
        'paused',
        'encounter',
        'complete',
        'abandoned',
      ]),
      completed: z.number().int(),
      revision: z.number().int(),
      durationTicks: z.number().int().nonnegative(),
      dueAt: z.iso.datetime().nullable(),
      resolvedTicks: z.number().int().nonnegative(),
      settingsRevision: z.number().int(),
    })
    .nullable(),
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
});
export type CampaignView = z.infer<typeof campaignViewSchema>;

export const settingsCommandSchema = z.strictObject({
  expectedRevision: z.number().int().positive(),
  creative: creativeSettingsSchema,
  presetId: z.uuid().optional(),
});
export const actionCommandSchema = z.strictObject({
  expectedRevision: z.number().int().positive(),
  offerId: z.uuid(),
  path: z.array(z.string().max(80)).min(1).max(3),
});
export const activityControlSchema = z
  .strictObject({
    activityId: z.uuid(),
    expectedRevision: z.number().int().nonnegative(),
    action: z.enum(['pause', 'resume', 'pace']),
    pace: paceSchema.optional(),
  })
  .refine((value) => (value.action === 'pace') === (value.pace !== undefined));
export const campaignStartSchema = z.strictObject({
  mechanics: z.boolean().default(false),
  locked: z.boolean().default(false),
  pace: paceSchema.default({ kind: 'rate', ticks: 1, realMs: 1000 }),
});
export type CampaignStart = z.infer<typeof campaignStartSchema>;
