import { z } from 'zod';
import { contentHashSchema } from './hash-schema.js';

export const worldPackageReferenceSchema = z.strictObject({
  worldId: z.uuid(),
  rootHash: contentHashSchema,
  revision: z.number().int().positive(),
  mount: z.string().regex(/^[a-z][a-z0-9-]{0,79}$/),
});

export const rulePackageReferenceSchema = z.strictObject({
  ruleSetId: z.uuid(),
  rootHash: contentHashSchema,
  revision: z.number().int().positive(),
  engine: z.strictObject({
    adapterId: z.string().regex(/^[a-z][a-z0-9.-]{0,119}$/),
    adapterVersion: z.number().int().positive(),
  }),
});

export const startPackageReferenceSchema = z.strictObject({
  startPackageId: z.uuid(),
  rootHash: contentHashSchema,
  revision: z.number().int().positive(),
});
