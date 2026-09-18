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
  version: z.literal(2),
  action: actionDefinitionSchema,
  startGameTimeMs: z.number().int().nonnegative(),
  settingsRevision: z.number().int().positive(),
  resolvedThroughMs: z.number().int().nonnegative().default(0),
});
export type ResolvedActivityPlan = z.infer<typeof resolvedActivityPlanSchema>;

/** The cursor is committed game milliseconds, not a count of hours or dice. */
export function nextBoundaryMs(plan: ResolvedActivityPlan, cursorMs: number) {
  return Math.min(plan.action.durationMs, ...plan.action.checks.map(
    (schedule) => (Math.floor(cursorMs / schedule.everyMs) + 1) * schedule.everyMs,
  ));
}

