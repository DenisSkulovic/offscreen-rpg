import { z } from 'zod';
import { checkPlanSchema } from './checks';
import { outcomeEffectsSchema } from './effects';
import { factSchema, type Character } from './state';

const actionKeySchema = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const outcomeSchema = z.strictObject({
  text: z.string().min(1).max(1000),
  effects: outcomeEffectsSchema,
});

export const immediateActionPlanSchema = z.strictObject({
  version: z.literal(1),
  key: actionKeySchema,
  label: z.string().min(1).max(200),
  intention: z.string().min(1).max(500),
  risk: z.string().min(1).max(300).nullable(),
  evidence: z.array(z.string().min(1).max(100)).max(8),
  requires: z.array(factSchema).max(16),
  resolution: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('automatic'), outcome: outcomeSchema }),
    z.strictObject({
      kind: z.literal('check'),
      check: checkPlanSchema,
      difficultyBasis: z.string().min(1).max(300),
      success: outcomeSchema,
      failure: outcomeSchema,
    }),
  ]),
});
export type ImmediateActionPlan = z.infer<typeof immediateActionPlanSchema>;

export const immediateActionContentSchema = z
  .strictObject({
    version: z.literal(1),
    id: z.string().min(1).max(100),
    plans: z.array(immediateActionPlanSchema).max(6),
  })
  .superRefine((content, context) => {
    if (new Set(content.plans.map((plan) => plan.key)).size !== content.plans.length) {
      context.addIssue({ code: 'custom', message: 'Duplicate action key' });
    }
  });
export type ImmediateActionContent = z.infer<typeof immediateActionContentSchema>;

export function immediateActionAvailable(
  character: Character,
  plan: ImmediateActionPlan,
) {
  return plan.requires.every((required) =>
    character.facts.some(
      (fact) => fact.id === required.id && fact.value === required.value,
    ),
  );
}

/** A plan may currently write only state whose identity and value type are declared. */
export function validateImmediateActionState(
  content: ImmediateActionContent,
  character: Character,
) {
  const knownFacts = new Map(
    character.facts.map((fact) => [fact.id, typeof fact.value]),
  );
  const knownQuantities = new Set(character.quantities.map((value) => value.id));
  for (const plan of content.plans) {
    for (const required of plan.requires) {
      if (knownFacts.get(required.id) !== typeof required.value) {
        throw new Error('Prerequisite references an undeclared fact');
      }
    }
    const outcomes =
      plan.resolution.kind === 'automatic'
        ? [plan.resolution.outcome]
        : [plan.resolution.success, plan.resolution.failure];
    for (const effect of outcomes.flatMap((outcome) => outcome.effects)) {
      if (effect.kind === 'fact.set.v1') {
        if (knownFacts.get(effect.fact.id) !== typeof effect.fact.value) {
          throw new Error('Outcome references an undeclared fact');
        }
      } else if (!knownQuantities.has(effect.quantityId)) {
        throw new Error('Outcome references an undeclared quantity');
      }
    }
  }
}
