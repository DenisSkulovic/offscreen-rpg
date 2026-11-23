import { z } from 'zod';

export const contentHashSchema = z
  .string()
  .regex(/^[0-9a-f]{64}$/, 'Expected a lowercase SHA-256 hash');
