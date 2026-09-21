import { z } from 'zod';
import {
  storytellerReferenceSchema,
  storytellerSummarySchema,
} from '@offscreen/contracts/storytellers';
import comedy from './definitions/absurd-action-comedy.json';
import drama from './definitions/character-driven-drama.json';
import adventure from './definitions/driven-adventure.json';
import mystery from './definitions/quiet-eerie-mystery.json';

const guidance = z.string().min(1).max(1200);
export const storytellerProfileSchema = storytellerSummarySchema
  .extend({
    schemaVersion: z.literal(1),
    tone: guidance,
    dramaticRhythm: guidance,
    surprisePolicy: guidance,
    consequenceStyle: guidance,
    choiceGuidance: guidance,
    avoid: z.array(z.string().min(1).max(240)).max(8),
    tasks: z.strictObject({ opening: guidance, continuation: guidance }),
  })
  .refine(
    (profile) => Buffer.byteLength(JSON.stringify(profile), 'utf8') <= 12000,
    'Profile exceeds its serialized content allowance',
  );
export type StorytellerProfile = z.infer<typeof storytellerProfileSchema>;

/** Validate content once; callers get detached copies rather than mutable catalogue state. */
export function createStorytellerCatalogue(definitions: readonly unknown[]) {
  const profiles = definitions.map((definition) =>
    storytellerProfileSchema.parse(definition),
  );
  const identities = profiles.map(
    (profile) => `${profile.id}/${profile.revision}`,
  );
  if (new Set(identities).size !== identities.length) {
    throw new Error('Duplicate storyteller revision');
  }
  return {
    list() {
      return profiles.map(storytellerSummary);
    },
    resolve(reference: unknown): StorytellerProfile {
      const selected = storytellerReferenceSchema.parse(reference);
      const profile = profiles.find(
        (item) =>
          item.id === selected.id && item.revision === selected.revision,
      );
      if (!profile) {
        throw new Error('Unknown storyteller revision');
      }
      return structuredClone(profile);
    },
  };
}

export function storytellerSummary(profile: StorytellerProfile) {
  return storytellerSummarySchema.parse({
    id: profile.id,
    revision: profile.revision,
    name: profile.name,
    description: profile.description,
  });
}
export const storytellerCatalogue = createStorytellerCatalogue([
  comedy,
  drama,
  adventure,
  mystery,
]);
