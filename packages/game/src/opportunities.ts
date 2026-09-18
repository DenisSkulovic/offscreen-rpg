import {
  immediateActionAvailable,
  type ImmediateActionContent,
} from './immediate-actions';
import { offerSchema } from './offers';
import type { Character } from './state';

/** An empty offer is legitimate while an admitted activity owns progression. */
export function composeOpportunities(input: {
  id: string;
  content: ImmediateActionContent;
  character: Character;
  busy: boolean;
}) {
  const available = input.busy
    ? []
    : input.content.plans.filter((plan) =>
        immediateActionAvailable(input.character, plan),
      );
  const offer = offerSchema.parse({
    id: input.id,
    nodes: available.map((plan) => ({
      id: plan.key,
      parent: null,
      label: plan.label,
      description: plan.intention,
      action: { kind: 'attempt' },
    })),
  });
  return { offer, plans: available };
}
