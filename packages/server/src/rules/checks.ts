import { randomInt } from 'node:crypto';
import { checkPlanSchema, characterSchema, rollSchema, type Character, type CheckPlan, type Roll } from '@offscreen/contracts/campaign';
import type { z } from 'zod';
import type { scheduledCheckSchema } from '@offscreen/contracts/action-content';

export type DrawD20 = () => number;
export const drawD20: DrawD20 = () => randomInt(1, 21);

/** Event occurrence and ability success have different comparison semantics. */
export function resolveScheduledCheck(character: Character, resolution: z.infer<typeof scheduledCheckSchema>['resolution'], draw: DrawD20 = drawD20): Roll {
  if (resolution.kind === 'ability') {
    return resolveCheck(character, resolution.plan, draw);
  }
  const die = draw();
  const total = die + resolution.modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
  return rollSchema.parse({
    kind: 'event', purpose: resolution.purpose, dice: [die], chosen: die,
    modifiers: resolution.modifiers, total, dc: resolution.threshold,
    success: total <= resolution.threshold,
  });
}

/** No persistence, model judgments or implicit retries. Call inside the commit boundary. */
export function resolveCheck(character: Character, plan: CheckPlan, draw: DrawD20 = drawD20): Roll {
  characterSchema.parse(character);
  checkPlanSchema.parse(plan);
  const dice = [draw()];
  if (plan.advantage !== plan.disadvantage) dice.push(draw());
  const chosen = plan.advantage && !plan.disadvantage ? Math.max(...dice) : Math.min(...dice);
  const modifiers = [
    { source: plan.ability, value: Math.floor((character.scores[plan.ability] - 10) / 2) },
    { source: `${plan.skill} proficiency`, value: character.proficientSkills.includes(plan.skill) ? character.proficiencyBonus : 0 },
    ...plan.modifiers,
  ];
  const total = chosen + modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
  return rollSchema.parse({ purpose: plan.purpose, dice, chosen, modifiers, total, dc: plan.dc, success: total >= plan.dc });
}
