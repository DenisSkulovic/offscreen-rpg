import { z } from 'zod';
import type { AgentDefinitionV1 } from '../../src/missions/contracts.js';
import { DEFINITIONS } from './scenarios.mjs';

/** Workflow-safe fixture definitions. No model SDK, Activity, or credential import. */

export const readDocumentSchema = z.strictObject({
  path: z.literal('history/promise.md'),
});

export const calculateSchema = z.strictObject({
  a: z.number().int().min(-1000).max(1000),
  b: z.number().int().min(-1000).max(1000),
  op: z.literal('add'),
});

const researcher = DEFINITIONS.researcher;
const arithmetic = DEFINITIONS.arithmetic;

export const fixtureDefinitions: readonly AgentDefinitionV1[] = [
  {
    id: researcher.id,
    version: 1,
    instructions: researcher.instructions,
    toolNames: [researcher.toolName],
  },
  {
    id: arithmetic.id,
    version: 1,
    instructions: arithmetic.instructions,
    toolNames: [arithmetic.toolName],
  },
];

export const fixtureToolSchemas = {
  readDocument: readDocumentSchema,
  calculate: calculateSchema,
} as const;
