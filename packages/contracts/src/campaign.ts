import { z } from 'zod';
import { storytellerReferenceSchema } from './storytellers';

export const paceSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('rate'), game: z.number().int().min(1).max(86400), real: z.number().int().min(1).max(86400) }),
  z.strictObject({ kind: z.literal('instant') }),
]);
export type Pace = z.infer<typeof paceSchema>;
export const narrativeTagSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]{1,60}$/),
  description: z.string().trim().min(1).max(400),
});
export const creativeSettingsSchema = z.strictObject({
  profile: storytellerReferenceSchema,
  tone: z.string().trim().min(1).max(1200),
  emphasis: z.enum(['balanced', 'economy', 'growth', 'adventure', 'social']),
  surprises: z.enum(['rare', 'occasional', 'frequent']),
  tags: z.array(narrativeTagSchema).max(16).refine((tags) => new Set(tags.map((t) => t.id)).size === tags.length),
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
export const abilitySchema = z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']);
export const quantitySchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,79}$/),
  label: z.string().trim().min(1).max(100),
  value: z.number().int().nonnegative().max(2147483647),
});
export const quantityEffectSchema = z.strictObject({
  kind: z.literal('quantity.change.v1'),
  quantityId: z.string().regex(/^[a-z][a-z0-9-]{0,79}$/),
  delta: z.number().int().min(-2147483647).max(2147483647),
});
export const factSchema = z.strictObject({
  id: z.string().min(1).max(80),
  value: z.union([z.string().max(300), z.boolean()]),
});
export const outcomeEffectSchema = z.discriminatedUnion('kind', [
  quantityEffectSchema,
  z.strictObject({ kind: z.literal('fact.set.v1'), fact: factSchema }),
]);
export const outcomeEffectsSchema = z.array(outcomeEffectSchema).max(16);
export type OutcomeEffect = z.infer<typeof outcomeEffectSchema>;
export const characterSchema = z.strictObject({
  name: z.string().min(1).max(100),
  scores: z.record(abilitySchema, z.number().int().min(1).max(30)),
  proficientSkills: z.array(z.string().min(1).max(80)).max(30),
  proficiencyBonus: z.number().int().min(0).max(6),
  hp: z.number().int().nonnegative(),
  maxHp: z.number().int().positive(),
  facts: z.array(factSchema).max(64).refine((facts) => new Set(facts.map((fact) => fact.id)).size === facts.length).default([]),
  quantities: z.array(quantitySchema).max(50).refine(
    (values) => new Set(values.map((value) => value.id)).size === values.length,
  ).default([]),
});
export type Character = z.infer<typeof characterSchema>;
export const checkPlanSchema = z.strictObject({
  rule: z.literal('srd-5.2.1-subset.v1'),
  purpose: z.string().max(200),
  skill: z.string().min(1).max(80),
  ability: abilitySchema,
  dc: z.number().int().min(5).max(30),
  advantage: z.boolean(),
  disadvantage: z.boolean(),
  modifiers: z.array(z.strictObject({ source: z.string().max(100), value: z.number().int().min(-10).max(10) })).max(8),
});
export type CheckPlan = z.infer<typeof checkPlanSchema>;
export const rollSchema = z.strictObject({
  kind: z.enum(['ability', 'event']).default('ability'),
  purpose: z.string(),
  dice: z.array(z.number().int().min(1).max(20)).min(1).max(2),
  chosen: z.number().int().min(1).max(20),
  modifiers: z.array(z.strictObject({ source: z.string(), value: z.number().int() })),
  total: z.number().int(),
  dc: z.number().int(),
  success: z.boolean(),
});
export type Roll = z.infer<typeof rollSchema>;
export const actionSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('attempt'), definition: z.string().min(1).max(100) }),
  z.strictObject({ kind: z.literal('activity'), definition: z.string().min(1).max(100), hours: z.number().int().min(1).max(24) }),
  z.strictObject({ kind: z.literal('check'), definition: z.string().min(1).max(100) }),
  z.strictObject({ kind: z.literal('move'), destination: z.string().min(1).max(100) }),
  z.strictObject({ kind: z.literal('encounter'), choice: z.enum(['continue', 'abandon']) }),
]);
export type GameAction = z.infer<typeof actionSchema>;
export const menuNodeSchema = z.strictObject({
  id: z.string().min(1).max(80),
  parent: z.string().nullable(),
  label: z.string().min(1).max(200),
  description: z.string().max(500),
  action: actionSchema.nullable(),
});
export const offerSchema = z.strictObject({
  id: z.uuid(),
  nodes: z.array(menuNodeSchema).max(24),
});
export type GameOffer = z.infer<typeof offerSchema>;
export const campaignViewSchema = z.strictObject({
  unavailableReason: z.string().optional(),
  settings: campaignSettingsSchema,
  character: characterSchema.nullable(),
  location: z.string().nullable(),
  gameTimeMs: z.number().nonnegative(),
  offer: offerSchema.nullable(),
  activity: z.strictObject({
    id: z.uuid(), label: z.string(), state: z.enum(['running', 'paused', 'encounter', 'complete', 'abandoned']),
    completed: z.number().int(), hours: z.number().nonnegative(), revision: z.number().int(),
    durationMs: z.number().nonnegative().optional(),
    dueAt: z.iso.datetime().nullable(), elapsedMs: z.number().nonnegative(),
    settingsRevision: z.number().int(),
  }).nullable(),
  rolls: z.array(z.strictObject({ id: z.uuid(), segment: z.number().int(), gameTimeMs: z.number(), roll: rollSchema, effects: outcomeEffectsSchema })).max(100),
});
export type CampaignView = z.infer<typeof campaignViewSchema>;
export const settingsCommandSchema = z.strictObject({ expectedRevision: z.number().int().positive(), creative: creativeSettingsSchema, presetId: z.uuid().optional() });
export const actionCommandSchema = z.strictObject({ expectedRevision: z.number().int().positive(), offerId: z.uuid(), path: z.array(z.string().max(80)).min(1).max(3) });
export const activityControlSchema = z.strictObject({
  activityId: z.uuid(), expectedRevision: z.number().int().nonnegative(),
  action: z.enum(['pause', 'resume', 'pace']), pace: paceSchema.optional(),
}).refine((v) => (v.action === 'pace') === (v.pace !== undefined));
export const campaignStartSchema = z.strictObject({
  mechanics: z.boolean().default(false), locked: z.boolean().default(false),
  pace: paceSchema.default({ kind: 'rate', game: 1440, real: 1 }),
});
export type CampaignStart = z.infer<typeof campaignStartSchema>;
