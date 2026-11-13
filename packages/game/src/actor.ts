import { z } from 'zod';
import {
  abilitySchema,
  characterHasHealth,
  characterSchema,
  checkSubjectFromCharacter,
  checkSubjectSchema,
  factSchema,
  quantitySchema,
  skillSchema,
  type Character,
  type CheckSubject,
} from './state';

const srdAbilitiesCapabilitySchema = z.strictObject({
  kind: z.literal('srd-abilities.v1'),
  scores: z.record(abilitySchema, z.number().int().min(1).max(30)),
  applicableAbilities: z
    .array(abilitySchema)
    .max(6)
    .refine(
      (abilities) => new Set(abilities).size === abilities.length,
      'Duplicate applicable ability',
    ),
  skills: z
    .array(skillSchema)
    .max(64)
    .refine(
      (skills) =>
        new Set(skills.map((skill) => skill.id)).size === skills.length,
      'Duplicate skill identity',
    ),
  proficientSkills: z.array(skillSchema.shape.id).max(30),
  proficiencyBonus: z.number().int().min(0).max(6),
});

const healthCapabilitySchema = z.strictObject({
  kind: z.literal('health.v1'),
  hp: z.number().int().nonnegative(),
  maxHp: z.number().int().positive(),
});

export const actorCapabilitySchema = z.discriminatedUnion('kind', [
  srdAbilitiesCapabilitySchema,
  healthCapabilitySchema,
]);
export type ActorCapability = z.infer<typeof actorCapabilitySchema>;

export const actorEnvelopeSchema = z
  .strictObject({
    version: z.literal(1),
    name: z.string().min(1).max(100),
    capabilities: z.array(actorCapabilitySchema).max(8),
    facts: z
      .array(factSchema)
      .max(64)
      .refine(
        (facts) => new Set(facts.map((fact) => fact.id)).size === facts.length,
      )
      .default([]),
    quantities: z
      .array(quantitySchema)
      .max(50)
      .refine(
        (values) =>
          new Set(values.map((value) => value.id)).size === values.length,
      )
      .default([]),
  })
  .superRefine((actor, context) => {
    const kinds = actor.capabilities.map((capability) => capability.kind);
    if (new Set(kinds).size !== kinds.length) {
      context.addIssue({
        code: 'custom',
        path: ['capabilities'],
        message: 'Duplicate capability kind',
      });
    }
    const abilities = actor.capabilities.find(
      (capability) => capability.kind === 'srd-abilities.v1',
    );
    if (abilities) {
      const skills = new Set(abilities.skills.map((skill) => skill.id));
      if (
        new Set(abilities.proficientSkills).size !==
          abilities.proficientSkills.length ||
        abilities.proficientSkills.some((skill) => !skills.has(skill))
      ) {
        context.addIssue({
          code: 'custom',
          path: ['capabilities'],
          message: 'Proficiency must reference one declared skill exactly once',
        });
      }
    }
  });
export type ActorEnvelope = z.infer<typeof actorEnvelopeSchema>;

export function actorFromLegacyCharacter(character: Character): ActorEnvelope {
  const parsed = characterSchema.parse(character);
  const capabilities: ActorCapability[] = [
    {
      kind: 'srd-abilities.v1',
      scores: parsed.scores,
      applicableAbilities: parsed.applicableAbilities,
      skills: parsed.skills,
      proficientSkills: parsed.proficientSkills,
      proficiencyBonus: parsed.proficiencyBonus,
    },
  ];
  if (characterHasHealth(parsed)) {
    capabilities.push({
      kind: 'health.v1',
      hp: parsed.hp,
      maxHp: parsed.maxHp,
    });
  }
  return actorEnvelopeSchema.parse({
    version: 1,
    name: parsed.name,
    capabilities,
    facts: parsed.facts,
    quantities: parsed.quantities,
  });
}

export function legacyCharacterFromActor(actor: ActorEnvelope): Character {
  const parsed = actorEnvelopeSchema.parse(actor);
  const abilities = parsed.capabilities.find(
    (capability) => capability.kind === 'srd-abilities.v1',
  );
  if (!abilities) {
    throw new Error('Actor has no SRD ability capability');
  }
  const health = parsed.capabilities.find(
    (capability) => capability.kind === 'health.v1',
  );
  return characterSchema.parse({
    name: parsed.name,
    scores: abilities.scores,
    applicableAbilities: abilities.applicableAbilities,
    skills: abilities.skills,
    proficientSkills: abilities.proficientSkills,
    proficiencyBonus: abilities.proficiencyBonus,
    ...(health ? { hp: health.hp, maxHp: health.maxHp } : {}),
    facts: parsed.facts,
    quantities: parsed.quantities,
  });
}

export function checkSubjectFromActor(actor: ActorEnvelope): CheckSubject {
  const abilities = actorEnvelopeSchema
    .parse(actor)
    .capabilities.find((capability) => capability.kind === 'srd-abilities.v1');
  if (!abilities) {
    throw new Error('Actor has no SRD ability capability');
  }
  return checkSubjectSchema.parse({
    scores: abilities.scores,
    applicableAbilities: abilities.applicableAbilities,
    skills: abilities.skills,
    proficientSkills: abilities.proficientSkills,
    proficiencyBonus: abilities.proficiencyBonus,
  });
}

/**
 * Campaign JSON may be a legacy Character document or an actor envelope.
 * Envelope is the versioned target; Character remains the compatibility bridge.
 */
export function parseActorState(value: unknown): ActorEnvelope {
  if (
    value &&
    typeof value === 'object' &&
    'version' in value &&
    (value as { version?: unknown }).version === 1 &&
    'capabilities' in value
  ) {
    return actorEnvelopeSchema.parse(value);
  }
  return actorFromLegacyCharacter(characterSchema.parse(value));
}

export function actorHasHealth(actor: ActorEnvelope) {
  return actor.capabilities.some((capability) => capability.kind === 'health.v1');
}

export function checkSubjectFromActorState(value: unknown): CheckSubject {
  const actor = parseActorState(value);
  return checkSubjectFromActor(actor);
}

export function characterProjectionFromActorState(value: unknown): Character {
  return legacyCharacterFromActor(parseActorState(value));
}

export { checkSubjectFromCharacter };
