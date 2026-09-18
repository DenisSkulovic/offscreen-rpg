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
        (skills) => new Set(skills.map((skill) => skill.id)).size === skills.length,
        'Duplicate skill identity',
      ),
    proficientSkills: z.array(skillSchema.shape.id).max(30),
    proficiencyBonus: z.number().int().min(0).max(6),
    hp: z.number().int().nonnegative(),
    maxHp: z.number().int().positive(),
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
    const skills = new Set(character.skills.map((skill) => skill.id));
    if (
      new Set(character.proficientSkills).size !== character.proficientSkills.length ||
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
