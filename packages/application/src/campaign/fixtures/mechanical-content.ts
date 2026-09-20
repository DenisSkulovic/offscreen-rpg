import { z } from 'zod';
import { passageContentSchema } from '@offscreen/contracts/stories';
import { characterSchema } from '@offscreen/game/state';
import definitions from './content/mechanical-openings.json';

const contentIdSchema = z.string().regex(/^[a-z0-9][a-z0-9.-]{0,99}$/);
const mechanicalOpeningEntrySchema = z.strictObject({
  id: contentIdSchema,
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(300),
  character: characterSchema,
  opening: passageContentSchema,
});

const mechanicalOpeningCatalogueSchema = z
  .strictObject({
    version: z.literal(1),
    entries: z.array(mechanicalOpeningEntrySchema).min(1).max(32),
  })
  .superRefine((content, context) => {
    const ids = content.entries.map((entry) => entry.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: 'custom',
        message: 'Duplicate content identity',
      });
    }
  });

const catalogue = mechanicalOpeningCatalogueSchema.parse(definitions);
// This catalogue owns setup seeds only. Scripted Storyteller fixtures own the
// authored benchmark outputs, so an example plan cannot drift between copies.

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
  return {
    id: seed.id,
    character: seed.character,
    storyFacts: [],
    opening: seed.opening,
  };
}
