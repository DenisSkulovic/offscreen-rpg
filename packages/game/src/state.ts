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

export const characterSchema = z.strictObject({
  name: z.string().min(1).max(100),
  scores: z.record(abilitySchema, z.number().int().min(1).max(30)),
  proficientSkills: z.array(z.string().min(1).max(80)).max(30),
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
});
export type Character = z.infer<typeof characterSchema>;
