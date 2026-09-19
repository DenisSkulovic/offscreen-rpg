import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { immediateActionPlanSchema } from '@offscreen/game/immediate-actions';

const acceptedPlanEntrySchema = z.strictObject({
  id: z.uuid(),
  plan: immediateActionPlanSchema.refine(
    (plan) => plan.resolution.kind === 'process',
    'Accepted plan entries must be extended activities',
  ),
  state: z.enum(['pending', 'running', 'complete', 'blocked', 'cancelled']),
  activityId: z.uuid().nullable(),
});

export const acceptedActivityPlanSchema = z.strictObject({
  version: z.literal(1),
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
  sourceOfferId: z.uuid(),
  entries: z.array(acceptedPlanEntrySchema).min(2).max(6),
  blockedReason: z.string().trim().min(1).max(500).nullable(),
});

export type AcceptedActivityPlan = z.infer<typeof acceptedActivityPlanSchema>;

export function createAcceptedActivityPlan(args: {
  offerId: string;
  plans: z.infer<typeof immediateActionPlanSchema>[];
  firstActivityId: string;
  acceptedAtTick: number;
  horizonTicks: number;
}): AcceptedActivityPlan {
  return acceptedActivityPlanSchema.parse({
    version: 1,
    id: randomUUID(),
    revision: 0,
    state: 'active',
    cursor: 0,
    acceptedAtTick: args.acceptedAtTick,
    horizonTick: args.acceptedAtTick + args.horizonTicks,
    sourceOfferId: args.offerId,
    entries: args.plans.map((plan, index) => ({
      id: randomUUID(),
      plan,
      state: index === 0 ? 'running' : 'pending',
      activityId: index === 0 ? args.firstActivityId : null,
    })),
    blockedReason: null,
  });
}

export function readAcceptedActivityPlan(value: unknown) {
  return value === null ? null : acceptedActivityPlanSchema.parse(value);
}

export function projectAcceptedActivityPlan(plan: AcceptedActivityPlan | null) {
  if (!plan) return null;
  return {
    id: plan.id,
    revision: plan.revision,
    state: plan.state,
    cursor: plan.cursor,
    acceptedAtTick: plan.acceptedAtTick,
    horizonTick: plan.horizonTick,
    entries: plan.entries.map((entry) => ({
      id: entry.id,
      label: entry.plan.label,
      state: entry.state,
      activityId: entry.activityId,
    })),
    blockedReason: plan.blockedReason,
  };
}
