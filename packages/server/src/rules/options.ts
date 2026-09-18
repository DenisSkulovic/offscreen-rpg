import { offerSchema, type GameAction, type GameOffer } from '@offscreen/contracts/campaign';
import { StoryError } from '../story-errors';

export function validateOffer(value: unknown): GameOffer {
  const offer = offerSchema.parse(value);
  const byId = new Map(offer.nodes.map((node) => [node.id, node]));
  if (byId.size !== offer.nodes.length) throw new StoryError('invalid');
  for (const node of offer.nodes) {
    const seen = new Set([node.id]);
    let parent = node.parent;
    while (parent !== null) {
      const ancestor = byId.get(parent);
      if (!ancestor || ancestor.action || seen.has(parent)) throw new StoryError('invalid');
      seen.add(parent);
      parent = ancestor.parent;
    }
    if (seen.size > 3) throw new StoryError('invalid');
    const children = offer.nodes.filter((child) => child.parent === node.id);
    if ((!node.action && !children.length) || (node.action && children.length) || children.length > 6) throw new StoryError('invalid');
  }
  if (offer.nodes.filter((node) => node.parent === null).length > 6) throw new StoryError('invalid');
  return offer;
}

export function selectedAction(offer: GameOffer, path: string[]): GameAction {
  let parent: string | null = null;
  let selected;
  for (const id of path) {
    selected = offer.nodes.find((node) => node.id === id && node.parent === parent);
    if (!selected) throw new StoryError('conflict');
    parent = id;
  }
  if (!selected?.action) throw new StoryError('invalid');
  return selected.action;
}
