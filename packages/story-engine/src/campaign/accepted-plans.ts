import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { immediateActionPlanSchema } from '@offscreen/game/immediate-actions';

type ImmediateActionPlan = z.infer<typeof immediateActionPlanSchema>;

/** One quiet watch may be admitted at most three times on the existing plan. */
export const QUIET_REPEAT_ITERATION_LIMIT = 3;

/**
 * A quiet repeat is one authored clock-wait: repeatable, unbounded, no reward,
 * no check, and no scene or report. It is not a general standing-life policy.
 */
export function quietRepeatableActivity(plan: ImmediateActionPlan) {
  if (plan.resolution.kind !== 'process') return false;
  if (plan.resolution.reuse !== 'repeatable') return false;
  const action = plan.resolution.action;
  return (
    action.process.kind === 'clock-wait.v1' &&
    action.completionFollowUp === 'quiet' &&
    action.occurrence.kind === 'unbounded' &&
    action.checks.length === 0 &&
    action.completion.effects.length === 0
  );
}

export function sameQuietRepeat(plans: readonly ImmediateActionPlan[]) {
  const first = plans[0];
  return (
    Boolean(first) &&
    plans.length >= 2 &&
    plans.length <= QUIET_REPEAT_ITERATION_LIMIT &&
    quietRepeatableActivity(first!) &&
    plans.every((plan) => isDeepStrictEqual(plan, first))
  );
}

/** Duplicate successors are legal only as another copy of that one quiet watch. */
export function admitAcceptedPlanSuccessor(args: {
  accepted: readonly ImmediateActionPlan[];
  successor: ImmediateActionPlan;
}) {
  const duplicate = args.accepted.some(
    (entry) => entry.key === args.successor.key,
  );
  if (!duplicate) return 'admit' as const;
  const first = args.accepted[0];
  if (
    !first ||
    args.accepted.length >= QUIET_REPEAT_ITERATION_LIMIT ||
    !quietRepeatableActivity(first) ||
    !args.accepted.every((entry) => isDeepStrictEqual(entry, first)) ||
    !isDeepStrictEqual(args.successor, first)
  ) {
    return 'reject' as const;
  }
  return 'admit' as const;
}

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
  acceptedAtGameSecond: z
    .number()
    .int()
    .nonnegative()
    .max(Number.MAX_SAFE_INTEGER),
  horizonGameSecond: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  sourceOfferId: z.uuid(),
  entries: z.array(acceptedPlanEntrySchema).min(2).max(6),
  blockedReason: z.string().trim().min(1).max(500).nullable(),
});

export type AcceptedActivityPlan = z.infer<typeof acceptedActivityPlanSchema>;

export function createAcceptedActivityPlan(args: {
  offerId: string;
  plans: z.infer<typeof immediateActionPlanSchema>[];
  firstActivityId: string;
  acceptedAtGameSecond: number;
  horizonGameSeconds: number;
}): AcceptedActivityPlan {
  return acceptedActivityPlanSchema.parse({
    version: 1,
    id: randomUUID(),
    revision: 0,
    state: 'active',
    cursor: 0,
    acceptedAtGameSecond: args.acceptedAtGameSecond,
    horizonGameSecond: args.acceptedAtGameSecond + args.horizonGameSeconds,
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

/**
 * Rebind a scene-blocked itinerary only when the player selects the exact
 * private plan that was queued. Storyteller publication merely makes that
 * choice available again; it never restarts unattended work by itself.
 */
export function reenterAcceptedActivityPlan(args: {
  value: unknown;
  selectedPlan: z.infer<typeof immediateActionPlanSchema>;
  activityId: string;
  currentGameSecond: number;
}) {
  const accepted = readAcceptedActivityPlan(args.value);
  if (
    !accepted ||
    accepted.state !== 'blocked' ||
    args.currentGameSecond >= accepted.horizonGameSecond
  ) {
    return null;
  }
  const entry = accepted.entries[accepted.cursor];
  if (
    !entry ||
    entry.state !== 'blocked' ||
    entry.activityId !== null ||
    !isDeepStrictEqual(entry.plan, args.selectedPlan)
  ) {
    return null;
  }
  return acceptedActivityPlanSchema.parse({
    ...accepted,
    revision: accepted.revision + 1,
    state: 'active',
    entries: accepted.entries.map((candidate, index) =>
      index === accepted.cursor
        ? { ...candidate, state: 'running', activityId: args.activityId }
        : candidate,
    ),
    blockedReason: null,
  });
}

export function projectAcceptedActivityPlan(plan: AcceptedActivityPlan | null) {
  if (!plan) return null;
  return {
    id: plan.id,
    revision: plan.revision,
    state: plan.state,
    cursor: plan.cursor,
    acceptedAtGameSecond: plan.acceptedAtGameSecond,
    horizonGameSecond: plan.horizonGameSecond,
    entries: plan.entries.map((entry) => ({
      id: entry.id,
      label: entry.plan.label,
      state: entry.state,
      activityId: entry.activityId,
    })),
    blockedReason: plan.blockedReason,
  };
}
