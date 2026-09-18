import {
  characterSchema,
  outcomeEffectsSchema,
  type Character,
  type OutcomeEffect,
} from '@offscreen/contracts/campaign';

/** Effects modify declared state; neither resource balances nor facts appear implicitly. */
export function applyOutcomeEffects(character: Character, input: readonly OutcomeEffect[]): Character {
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

export function describeOutcomeEffects(character: Character, effects: readonly OutcomeEffect[]): string {
  return effects.map((effect) => {
    if (effect.kind === 'fact.set.v1') {
      return `${effect.fact.id}: ${effect.fact.value}`;
    }
    const quantity = character.quantities.find((item) => item.id === effect.quantityId);
    return `${quantity?.label ?? effect.quantityId}: ${effect.delta >= 0 ? '+' : ''}${effect.delta}`;
  }).join(', ');
}
