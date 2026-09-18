import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { passageContentSchema } from '@offscreen/contracts/stories';
import {
  immediateActionContentSchema,
  validateImmediateActionState,
} from '@offscreen/game/immediate-actions';
import { composeOpportunities } from '@offscreen/game/opportunities';
import { characterSchema } from '@offscreen/game/state';
import definitions from './content/mechanical-openings.json';

const contentIdSchema = z.string().regex(/^[a-z0-9][a-z0-9.-]{0,99}$/);
const mechanicalOpeningEntrySchema = z
  .strictObject({
    id: contentIdSchema,
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(300),
    character: characterSchema,
    content: immediateActionContentSchema,
    opening: passageContentSchema,
  })
  .superRefine((entry, context) => {
    if (entry.id !== entry.content.id) {
      context.addIssue({
        code: 'custom',
        path: ['content', 'id'],
        message: 'Content identity must match its catalogue identity',
      });
    }
  });

const mechanicalOpeningCatalogueSchema = z
  .strictObject({
    version: z.literal(1),
    entries: z.array(mechanicalOpeningEntrySchema).min(1).max(32),
  })
  .superRefine((content, context) => {
    const ids = content.entries.map((entry) => entry.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: 'custom', message: 'Duplicate content identity' });
    }
  });

const catalogue = mechanicalOpeningCatalogueSchema.parse(definitions);
for (const entry of catalogue.entries) {
  validateImmediateActionState(entry.content, entry.character);
}

export function mechanicalContentCatalogue() {
  return catalogue.entries.map(({ id, name, description }) => ({
    id,
    name,
    description,
  }));
}

export function mechanicalOpening(id: string) {
  const entry = catalogue.entries.find((candidate) => candidate.id === id);
  if (!entry) {
    throw new Error('Unknown mechanical content');
  }
  const seed = structuredClone(entry);
  const opportunities = composeOpportunities({
    id: randomUUID(),
    content: seed.content,
    character: seed.character,
    busy: false,
  });
  return {
    character: seed.character,
    content: seed.content,
    opening: seed.opening,
    offer: opportunities.offer,
  };
}
