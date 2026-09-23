import { z } from 'zod';
import { characterSchema, factSchema, type Character } from './state';

export const quantityEffectSchema = z.strictObject({
  kind: z.literal('quantity.change.v1'),
  quantityId: z.string().regex(/^[a-z][a-z0-9-]{0,79}$/),
  delta: z.union([
    z.number().int().min(-2147483647).max(-1),
    z.number().int().min(1).max(2147483647),
  ]),
});
export const outcomeEffectSchema = z.discriminatedUnion('kind', [
  quantityEffectSchema,
  z.strictObject({ kind: z.literal('fact.set.v1'), fact: factSchema }),
]);
export const outcomeEffectsSchema = z.array(outcomeEffectSchema).max(16);
export type OutcomeEffect = z.infer<typeof outcomeEffectSchema>;

/** Effects modify declared state; resources and facts never appear implicitly. */
export function applyOutcomeEffects(
  character: Character,
  input: readonly OutcomeEffect[],
): Character {
  const effects = outcomeEffectsSchema.parse(input);
  const quantities = character.quantities.map((quantity) => ({ ...quantity }));
  const facts = character.facts.map((fact) => ({ ...fact }));
  for (const effect of effects) {
    if (effect.kind === 'fact.set.v1') {
      const fact = facts.find((item) => item.id === effect.fact.id);
      if (!fact) {
        throw new Error('Outcome references an undeclared fact');
      }
      fact.value = effect.fact.value;
      continue;
    }
    const quantity = quantities.find((item) => item.id === effect.quantityId);
    if (!quantity) {
      throw new Error('Outcome references an undeclared quantity');
    }
    quantity.value += effect.delta;
  }
  return characterSchema.parse({ ...character, quantities, facts });
}

export function describeOutcomeEffects(
  character: Character,
  effects: readonly OutcomeEffect[],
): string {
  return effects
    .map((effect) => {
      if (effect.kind === 'fact.set.v1') {
        return `${effect.fact.id}: ${effect.fact.value}`;
      }
      const quantity = character.quantities.find(
        (item) => item.id === effect.quantityId,
      );
      return `${quantity?.label ?? effect.quantityId}: ${effect.delta >= 0 ? '+' : ''}${effect.delta}`;
    })
    .join(', ');
}
