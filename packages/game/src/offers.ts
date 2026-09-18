import { z } from 'zod';

export const gameActionSchema = z.strictObject({
  kind: z.literal('attempt'),
  definition: z.string().min(1).max(100),
});
export type GameAction = z.infer<typeof gameActionSchema>;

export const menuNodeSchema = z.strictObject({
  id: z.string().min(1).max(80),
  parent: z.string().nullable(),
  label: z.string().min(1).max(200),
  description: z.string().max(500),
  action: gameActionSchema.nullable(),
});
export const offerSchema = z
  .strictObject({
    id: z.uuid(),
    nodes: z.array(menuNodeSchema).max(24),
  })
  .superRefine((offer, context) => {
    const byId = new Map(offer.nodes.map((node) => [node.id, node]));
    if (byId.size !== offer.nodes.length) {
      context.addIssue({
        code: 'custom',
        message: 'Duplicate option identity',
      });
      return;
    }
    for (const node of offer.nodes) {
      const seen = new Set([node.id]);
      let parent = node.parent;
      while (parent !== null) {
        const ancestor = byId.get(parent);
        if (!ancestor || ancestor.action || seen.has(parent)) {
          context.addIssue({
            code: 'custom',
            message: 'Invalid option ancestry',
          });
          break;
        }
        seen.add(parent);
        parent = ancestor.parent;
      }
      const children = offer.nodes.filter((child) => child.parent === node.id);
      if (
        seen.size > 3 ||
        (!node.action && children.length === 0) ||
        (node.action !== null && children.length > 0) ||
        children.length > 6
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Invalid option node',
        });
      }
    }
    if (offer.nodes.filter((node) => node.parent === null).length > 6) {
      context.addIssue({ code: 'custom', message: 'Too many root options' });
    }
  });
export type GameOffer = z.infer<typeof offerSchema>;

export type OfferSelection =
  | Readonly<{ state: 'selected'; action: GameAction }>
  | Readonly<{ state: 'missing' }>
  | Readonly<{ state: 'incomplete' }>;

export function selectOfferAction(
  offer: GameOffer,
  path: readonly string[],
): OfferSelection {
  let parent: string | null = null;
  let selected: GameOffer['nodes'][number] | undefined;
  for (const id of path) {
    selected = offer.nodes.find(
      (node) => node.id === id && node.parent === parent,
    );
    if (!selected) {
      return { state: 'missing' };
    }
    parent = id;
  }
  return selected?.action
    ? { state: 'selected', action: selected.action }
    : { state: 'incomplete' };
}
