import { z } from 'zod';

export const abilitySchema = z.enum([
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
]);
export type Ability = z.infer<typeof abilitySchema>;
export const skillSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,79}$/),
  label: z.string().trim().min(1).max(100),
});
export type Skill = z.infer<typeof skillSchema>;

export const quantitySchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,79}$/),
  label: z.string().trim().min(1).max(100),
  value: z.number().int().nonnegative().max(2147483647),
});
export type Quantity = z.infer<typeof quantitySchema>;

export const factSchema = z.strictObject({
  id: z.string().min(1).max(80),
  value: z.union([z.string().max(300), z.boolean()]),
});
export type Fact = z.infer<typeof factSchema>;

export const storyFactSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,79}$/),
  value: z.union([z.string().max(300), z.boolean()]),
  declaredBy: z.string().uuid(),
});
export type StoryFact = z.infer<typeof storyFactSchema>;
export const storyFactsSchema = z
  .array(storyFactSchema)
  .max(64)
  .refine(
    (facts) => new Set(facts.map((fact) => fact.id)).size === facts.length,
    'Duplicate story fact identity',
  );

export const characterSchema = z
  .strictObject({
    name: z.string().min(1).max(100),
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
    // Absent health is not HP 0. Both fields are present for legacy humans and
    // both are omitted for actors that have no health capability.
    hp: z.number().int().nonnegative().optional(),
    maxHp: z.number().int().positive().optional(),
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
  .superRefine((character, context) => {
    if ((character.hp === undefined) !== (character.maxHp === undefined)) {
      context.addIssue({
        code: 'custom',
        path: ['hp'],
        message: 'Health is present as a pair or entirely absent',
      });
    }
    const skills = new Set(character.skills.map((skill) => skill.id));
    if (
      new Set(character.proficientSkills).size !==
        character.proficientSkills.length ||
      character.proficientSkills.some((skill) => !skills.has(skill))
    ) {
      context.addIssue({
        code: 'custom',
        path: ['proficientSkills'],
        message: 'Proficiency must reference one declared skill exactly once',
      });
    }
  });
export type Character = z.infer<typeof characterSchema>;

/** Ability checks never require a health domain. */
export const checkSubjectSchema = z.strictObject({
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
export type CheckSubject = z.infer<typeof checkSubjectSchema>;

export function checkSubjectFromCharacter(character: Character): CheckSubject {
  return checkSubjectSchema.parse({
    scores: character.scores,
    applicableAbilities: character.applicableAbilities,
    skills: character.skills,
    proficientSkills: character.proficientSkills,
    proficiencyBonus: character.proficiencyBonus,
  });
}

export function characterHasHealth(
  character: Character,
): character is Character & { hp: number; maxHp: number } {
  return character.hp !== undefined && character.maxHp !== undefined;
}
