import { z } from 'zod';
import { abilitySchema, characterSchema, type Character } from './state';

export const checkPlanSchema = z.strictObject({
  rule: z.literal('srd-5.2.1-subset.v1'),
  purpose: z.string().max(200),
  skill: z.string().min(1).max(80),
  ability: abilitySchema,
  dc: z.number().int().min(5).max(30),
  advantage: z.boolean(),
  disadvantage: z.boolean(),
  modifiers: z
    .array(
      z.strictObject({
        source: z.string().max(100),
        value: z.number().int().min(-10).max(10),
      }),
    )
    .max(8),
});
export type CheckPlan = z.infer<typeof checkPlanSchema>;

export const eventCheckPlanSchema = z.strictObject({
  kind: z.literal('event'),
  purpose: z.string().min(1).max(200),
  threshold: z.number().int().min(0).max(20),
  modifiers: z
    .array(
      z.strictObject({
        source: z.string().min(1).max(100),
        value: z.number().int().min(-10).max(10),
      }),
    )
    .max(8),
});
export const checkResolutionSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('ability'), plan: checkPlanSchema }),
  eventCheckPlanSchema,
]);
export type CheckResolution = z.infer<typeof checkResolutionSchema>;

export const rollSchema = z.strictObject({
  kind: z.enum(['ability', 'event']).default('ability'),
  purpose: z.string(),
  dice: z.array(z.number().int().min(1).max(20)).min(1).max(2),
  chosen: z.number().int().min(1).max(20),
  modifiers: z.array(
    z.strictObject({ source: z.string(), value: z.number().int() }),
  ),
  total: z.number().int(),
  dc: z.number().int(),
  success: z.boolean(),
});
export type Roll = z.infer<typeof rollSchema>;

export type DrawD20 = () => number;

/** Event occurrence and ability success have different comparison semantics. */
export function resolveCheckResolution(
  character: Character,
  resolution: CheckResolution,
  draw: DrawD20,
): Roll {
  if (resolution.kind === 'ability') {
    return resolveCheck(character, resolution.plan, draw);
  }
  const die = draw();
  const total =
    die +
    resolution.modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
  return rollSchema.parse({
    kind: 'event',
    purpose: resolution.purpose,
    dice: [die],
    chosen: die,
    modifiers: resolution.modifiers,
    total,
    dc: resolution.threshold,
    success: total <= resolution.threshold,
  });
}

/** No persistence, model judgments or implicit retries. */
export function resolveCheck(
  character: Character,
  plan: CheckPlan,
  draw: DrawD20,
): Roll {
  characterSchema.parse(character);
  checkPlanSchema.parse(plan);
  const dice = [draw()];
  if (plan.advantage !== plan.disadvantage) {
    dice.push(draw());
  }
  const chosen =
    plan.advantage && !plan.disadvantage
      ? Math.max(...dice)
      : Math.min(...dice);
  const modifiers = [
    {
      source: plan.ability,
      value: Math.floor((character.scores[plan.ability] - 10) / 2),
    },
    {
      source: `${plan.skill} proficiency`,
      value: character.proficientSkills.includes(plan.skill)
        ? character.proficiencyBonus
        : 0,
    },
    ...plan.modifiers,
  ];
  const total =
    chosen + modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
  return rollSchema.parse({
    purpose: plan.purpose,
    dice,
    chosen,
    modifiers,
    total,
    dc: plan.dc,
    success: total >= plan.dc,
  });
}
