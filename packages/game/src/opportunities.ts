import { actionAvailable, type ActionContent } from './activities';
import { offerSchema } from './offers';
import type { Character } from './state';

/** An empty offer is legitimate while an admitted activity owns progression. */
export function composeOpportunities(input: {
  id: string;
  content: ActionContent;
  character: Character;
  busy: boolean;
}) {
  const available = input.busy
    ? []
    : input.content.actions.filter((action) =>
        actionAvailable(input.character, action),
      );
  return offerSchema.parse({
    id: input.id,
    nodes: available.map((action) => ({
      id: action.id,
      parent: null,
      label: action.label,
      description: action.description,
      action: { kind: 'attempt', definition: action.id },
    })),
  });
}
