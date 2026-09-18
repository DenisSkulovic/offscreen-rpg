import { randomUUID } from 'node:crypto';
import type { Character } from '@offscreen/contracts/campaign';
import { actionAvailable, type ActionContent } from './action-content';
import { validateOffer } from './options';

/** An empty offer is legitimate while an admitted activity owns progression. */
export function composeOpportunities(content: ActionContent, character: Character, busy: boolean) {
  const available = busy ? [] : content.actions.filter((action) => actionAvailable(character, action));
  return validateOffer({
    id: randomUUID(),
    nodes: available.map((action) => ({
      id: action.id,
      parent: null,
      label: action.label,
      description: action.description,
      action: { kind: 'attempt', definition: action.id },
    })),
  });
}
