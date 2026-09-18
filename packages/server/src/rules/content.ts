import { z } from 'zod';
import { checkPlanSchema, outcomeEffectsSchema } from '@offscreen/contracts/campaign';

export const hourMs = 3_600_000;
export const activityPlanSchema = z.strictObject({
  version: z.literal(1), definition: z.string().min(1).max(100), label: z.string(),
  hours: z.number().int().min(1).max(24), startGameTimeMs: z.number().nonnegative(),
  settingsRevision: z.number().int().positive(), check: checkPlanSchema.nullable(),
  successEffects: outcomeEffectsSchema, failureEffects: outcomeEffectsSchema,
  encounterThreshold: z.number().int().min(0).max(20),
  encounterModifiers: z.array(z.strictObject({ source: z.string(), value: z.number().int() })),
  origin: z.string(), destination: z.string(),
  narration: z.strictObject({ completion: z.string().max(1000), encounter: z.string().max(1000) }),
});
export type ActivityPlan = z.infer<typeof activityPlanSchema>;
