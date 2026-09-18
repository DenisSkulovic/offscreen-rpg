import { z } from 'zod';
import { checkPlanSchema, factSchema, outcomeEffectsSchema } from './campaign';

const outcomeSchema = z.strictObject({
  text: z.string().min(1).max(1000),
  effects: outcomeEffectsSchema,
  interrupts: z.boolean().default(false),
});
export const scheduledCheckSchema = z.strictObject({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  everyTicks: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  resolution: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('ability'), plan: checkPlanSchema }),
    z.strictObject({
      kind: z.literal('event'),
      purpose: z.string().min(1).max(200),
      threshold: z.number().int().min(0).max(20),
      modifiers: z.array(z.strictObject({ source: z.string().min(1).max(100), value: z.number().int().min(-10).max(10) })).max(8),
    }),
  ]),
  success: outcomeSchema,
  failure: outcomeSchema,
});
export const actionDefinitionSchema = z.strictObject({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  label: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  requires: z.array(factSchema).max(16),
  durationTicks: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  checks: z.array(scheduledCheckSchema).max(8),
  completion: outcomeSchema.omit({ interrupts: true }),
});
export const actionContentSchema = z.strictObject({
  version: z.literal(2),
  id: z.string().min(1).max(100),
  actions: z.array(actionDefinitionSchema).min(1).max(6),
}).superRefine((content, ctx) => {
  if (new Set(content.actions.map((action) => action.id)).size !== content.actions.length) {
    ctx.addIssue({ code: 'custom', message: 'Duplicate action identity' });
  }
  for (const action of content.actions) {
    if (new Set(action.checks.map((check) => check.id)).size !== action.checks.length) {
      ctx.addIssue({ code: 'custom', message: 'Duplicate schedule identity' });
    }
  }
});
export type ActionContent = z.infer<typeof actionContentSchema>;
export type ActionDefinition = z.infer<typeof actionDefinitionSchema>;


