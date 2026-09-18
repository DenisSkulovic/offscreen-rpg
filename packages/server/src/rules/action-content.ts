import { z } from 'zod';
import type { Character } from '@offscreen/contracts/campaign';
import { actionDefinitionSchema, type ActionDefinition, type ActionContent } from '@offscreen/contracts/action-content';
export { actionContentSchema, type ActionContent, type ActionDefinition } from '@offscreen/contracts/action-content';
export function actionAvailable(character: Character, action: ActionDefinition) {
  return action.requires.every((required) => character.facts.some(
    (fact) => fact.id === required.id && fact.value === required.value,
  ));
}

/** Content cannot refer to state it never declared, even on a rare outcome branch. */
export function validateContentState(content: ActionContent, character: Character) {
  for (const action of content.actions) {
    for (const required of action.requires) {
      if (!character.facts.some((fact) => fact.id === required.id && typeof fact.value === typeof required.value)) {
        throw new Error('Prerequisite references an undeclared or incompatible fact');
      }
    }
    const effects = [action.completion.effects, ...action.checks.flatMap((schedule) => [schedule.success.effects, schedule.failure.effects])].flat();
    for (const effect of effects) {
      if (effect.kind === 'fact.set.v1') {
        if (!character.facts.some((fact) => fact.id === effect.fact.id && typeof fact.value === typeof effect.fact.value)) {
          throw new Error('Outcome references an undeclared or incompatible fact');
        }
      } else if (!character.quantities.some((quantity) => quantity.id === effect.quantityId)) {
        throw new Error('Outcome references an undeclared quantity');
      }
    }
  }
}

export const resolvedActivityPlanSchema = z.strictObject({
  version: z.literal(3),
  action: actionDefinitionSchema,
  startTick: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  settingsRevision: z.number().int().positive(),
  resolvedThroughTick: z.number().int().nonnegative().default(0),
});
export type ResolvedActivityPlan = z.infer<typeof resolvedActivityPlanSchema>;

export const tickProgressSchema = z.strictObject({
  elapsedTicks: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  remainder: z.strictObject({
    numerator: z.string().regex(/^(0|[1-9]\d*)$/),
    denominator: z.string().regex(/^[1-9]\d*$/),
  }).refine((fraction) => BigInt(fraction.numerator) < BigInt(fraction.denominator)),
});

/** Skip quiet ticks while preserving the earliest due mechanical boundary. */
export function nextBoundaryTick(plan: ResolvedActivityPlan, cursorTick: number) {
  const duration = BigInt(plan.action.durationTicks);
  let next = duration;
  for (const schedule of plan.action.checks) {
    const cadence = BigInt(schedule.everyTicks);
    const candidate = (BigInt(cursorTick) / cadence + 1n) * cadence;
    if (candidate < next) {
      next = candidate;
    }
  }
  return Number(next);
}

