import { z } from 'zod';

/** Aligns with choice.v1 option id reference bounds (trimmed, max 80 for intent keys). */
const narrativeIntentKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9_-]+$/);

/** Same non-null bounds as choice.v1 option `risk` in @offscreen/contracts interactions. */
const narrativeIntentRiskSchema = z.string().trim().min(1).max(300);

export const narrativeIntentPlanSchema = z.strictObject({
  kind: z.literal('narrative-intent.v1'),
  key: narrativeIntentKeySchema,
  label: z.string().trim().min(1).max(160),
  intention: z.string().trim().min(1).max(500),
  risk: narrativeIntentRiskSchema,
  fictionalDurationSeconds: z.number().int().min(1).max(86_400),
  effects: z.array(z.never()).max(0),
});

export type NarrativeIntentPlan = z.infer<typeof narrativeIntentPlanSchema>;