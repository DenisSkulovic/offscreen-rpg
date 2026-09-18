import { z } from 'zod';
import { checkResolutionSchema } from './checks';
import { outcomeEffectsSchema } from './effects';
import { factSchema, type Character } from './state';
import { tickProgressSchema } from './time';

const outcomeSchema = z.strictObject({
  text: z.string().min(1).max(1000),
  effects: outcomeEffectsSchema,
  interrupts: z.boolean().default(false),
});
export const scheduledCheckSchema = z.strictObject({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  everyTicks: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  resolution: checkResolutionSchema,
  success: outcomeSchema,
  failure: outcomeSchema,
});
export const actionDefinitionSchema = z.strictObject({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  label: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  requires: z.array(factSchema).max(16),
  capacity: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  process: z.strictObject({
    kind: z.literal('contribution.v1'),
    progressLabel: z.string().min(1).max(120),
    requiredContribution: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    contributionPerBoundary: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    everyTicks: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  }),
  checks: z.array(scheduledCheckSchema).max(8),
  completion: outcomeSchema.omit({ interrupts: true }),
});
export const actionContentSchema = z
  .strictObject({
    version: z.literal(2),
    id: z.string().min(1).max(100),
    actions: z.array(actionDefinitionSchema).min(1).max(6),
  })
  .superRefine((content, context) => {
    if (
      new Set(content.actions.map((action) => action.id)).size !==
      content.actions.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Duplicate action identity',
      });
    }
    for (const action of content.actions) {
      if (
        new Set(action.checks.map((check) => check.id)).size !==
        action.checks.length
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Duplicate schedule identity',
        });
      }
    }
  });
export type ActionContent = z.infer<typeof actionContentSchema>;
export type ActionDefinition = z.infer<typeof actionDefinitionSchema>;

export function actionAvailable(
  character: Character,
  action: ActionDefinition,
) {
  return action.requires.every((required) =>
    character.facts.some(
      (fact) => fact.id === required.id && fact.value === required.value,
    ),
  );
}

/** Content cannot refer to state it never declared. */
export function validateContentState(
  content: ActionContent,
  character: Character,
) {
  for (const action of content.actions) {
    for (const required of action.requires) {
      if (
        !character.facts.some(
          (fact) =>
            fact.id === required.id &&
            typeof fact.value === typeof required.value,
        )
      ) {
        throw new Error('Prerequisite references an undeclared fact');
      }
    }
    const effects = [
      action.completion.effects,
      ...action.checks.flatMap((schedule) => [
        schedule.success.effects,
        schedule.failure.effects,
      ]),
    ].flat();
    for (const effect of effects) {
      if (effect.kind === 'fact.set.v1') {
        if (
          !character.facts.some(
            (fact) =>
              fact.id === effect.fact.id &&
              typeof fact.value === typeof effect.fact.value,
          )
        ) {
          throw new Error('Outcome references an undeclared fact');
        }
      } else if (
        !character.quantities.some(
          (quantity) => quantity.id === effect.quantityId,
        )
      ) {
        throw new Error('Outcome references an undeclared quantity');
      }
    }
  }
}

export const resolvedActivityPlanSchema = z.strictObject({
  version: z.literal(4),
  action: actionDefinitionSchema,
  startTick: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  settingsRevision: z.number().int().positive(),
  resolvedThroughTick: z.number().int().nonnegative().default(0),
});
export type ResolvedActivityPlan = z.infer<typeof resolvedActivityPlanSchema>;

export const contributionProgressSchema = z.strictObject({
  kind: z.literal('contribution.v1'),
  earned: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
});
export type ContributionProgress = z.infer<typeof contributionProgressSchema>;
export const activityProgressSchema = z.strictObject({
  clock: tickProgressSchema,
  process: contributionProgressSchema,
});
export type ActivityProgress = z.infer<typeof activityProgressSchema>;

export function completionBoundaryTick(
  plan: ResolvedActivityPlan,
  progress: ContributionProgress,
) {
  const remaining = Math.max(
    0,
    plan.action.process.requiredContribution - progress.earned,
  );
  const boundariesRemaining = Math.ceil(
    remaining / plan.action.process.contributionPerBoundary,
  );
  if (boundariesRemaining === 0) {
    return plan.resolvedThroughTick;
  }
  const cadence = plan.action.process.everyTicks;
  const nextBoundary =
    (Math.floor(plan.resolvedThroughTick / cadence) + 1) * cadence;
  return nextBoundary + (boundariesRemaining - 1) * cadence;
}

/**
 * Settle productive progress at one already-due clock boundary. Elapsed time
 * never enters this policy: it only determines when the caller may invoke it.
 */
export function contributeAtBoundary(
  plan: ResolvedActivityPlan,
  progress: ContributionProgress,
) {
  const earned = Math.min(
    plan.action.process.requiredContribution,
    progress.earned + plan.action.process.contributionPerBoundary,
  );
  return {
    progress: { kind: 'contribution.v1', earned } as const,
    complete: earned === plan.action.process.requiredContribution,
  };
}

/** Skip quiet ticks while preserving the earliest due mechanical boundary. */
export function nextBoundaryTick(
  plan: ResolvedActivityPlan,
  cursorTick: number,
) {
  const contributionCadence = BigInt(plan.action.process.everyTicks);
  let next =
    (BigInt(cursorTick) / contributionCadence + 1n) * contributionCadence;
  for (const schedule of plan.action.checks) {
    const cadence = BigInt(schedule.everyTicks);
    const candidate = (BigInt(cursorTick) / cadence + 1n) * cadence;
    if (candidate < next) {
      next = candidate;
    }
  }
  return Number(next);
}
