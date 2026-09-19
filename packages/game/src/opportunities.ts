import {
  immediateActionAvailable,
  type ImmediateActionContent,
} from './immediate-actions';
import { offerSchema } from './offers';
import type { Character, StoryFact } from './state';

/** An empty offer is legitimate while an admitted activity owns progression. */
export function composeOpportunities(input: {
  id: string;
  content: ImmediateActionContent;
  character: Character;
  storyFacts?: readonly StoryFact[];
  busy: boolean;
}) {
  const available = input.busy
    ? []
    : input.content.plans.filter((plan) =>
        immediateActionAvailable(input.character, input.storyFacts ?? [], plan),
      );
  const offer = offerSchema.parse({
    id: input.id,
    nodes: available.map((plan) => ({
      id: plan.key,
      parent: null,
      label: plan.label,
      description: plan.intention,
      risk: plan.risk,
      action: {
        kind: 'attempt',
        timing:
          plan.resolution.kind === 'process' ||
          plan.resolution.kind === 'resume'
            ? 'process'
            : 'instant',
      },
    })),
  });
  return { offer, plans: available };
}
