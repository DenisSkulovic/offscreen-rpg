import { passageContentSchema } from '@offscreen/contracts/stories';
import { interactionSpecificationSchema } from '@offscreen/contracts/interactions';
import { z } from 'zod';

export const waitPlanSchema = z.strictObject({
  version: z.literal(1),
  realDurationMs: z.number().int().min(1000).max(86400000),
  gameDurationMs: z.number().int().positive().max(2147483647),
  arrival: z.strictObject({
    content: passageContentSchema,
    interaction: interactionSpecificationSchema.nullable(),
  }),
});

export const decisionPlanSchema = z.strictObject({
  version: z.literal(1),
  responseDurationMs: z.number().int().min(1000).max(86400000),
  defaultOptionId: z.string().min(1).max(100),
  outcome: z.strictObject({
    content: passageContentSchema,
    interaction: interactionSpecificationSchema.nullable(),
  }),
});
