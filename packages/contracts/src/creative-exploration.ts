import { z } from 'zod';
import { creativeLensSchema } from './creative-exploration-evaluation.js';

const hashSchema = z.string().regex(/^[0-9a-f]{64}$/);
const keySchema = z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);

export const creativeExplorationPostureSchema = z.enum([
  'off',
  'minimal',
  'balanced',
  'rich',
]);

export const creativeExplorationLimitsSchema = z.strictObject({
  maxLenses: z.number().int().min(0).max(8),
  maxQueries: z.number().int().min(0).max(12),
  maxCandidatesPerQuery: z.number().int().min(0).max(12),
  maxReads: z.number().int().min(0).max(12),
  maxLeads: z.number().int().min(0).max(16),
  maxCandidateDirections: z.number().int().min(0).max(8),
  maxRetainedBytes: z
    .number()
    .int()
    .min(0)
    .max(128 * 1024),
  maxModelRounds: z.number().int().min(0).max(4),
  maxGeneratedTokens: z
    .number()
    .int()
    .min(0)
    .max(16 * 1024),
  maxLatencyMs: z
    .number()
    .int()
    .min(0)
    .max(10 * 60 * 1000),
  maxCostMicrousd: z.number().int().min(0).max(10_000_000),
});

export const creativeExplorationRecipeSchema = z
  .strictObject({
    format: z.literal('offscreen.creative-exploration-recipe.v1'),
    id: keySchema,
    posture: creativeExplorationPostureSchema,
    enabled: z.boolean(),
    limits: creativeExplorationLimitsSchema,
  })
  .superRefine((recipe, context) => {
    const values = Object.values(recipe.limits);
    if (!recipe.enabled && values.some((value) => value !== 0)) {
      context.addIssue({
        code: 'custom',
        message: 'Disabled creative exploration must have zero limits',
        path: ['limits'],
      });
    }
    if (
      recipe.enabled &&
      (recipe.limits.maxLenses === 0 ||
        recipe.limits.maxQueries === 0 ||
        recipe.limits.maxCandidatesPerQuery === 0 ||
        recipe.limits.maxLeads === 0 ||
        recipe.limits.maxCandidateDirections === 0 ||
        recipe.limits.maxModelRounds === 0 ||
        recipe.limits.maxGeneratedTokens === 0 ||
        recipe.limits.maxLatencyMs === 0)
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'Enabled creative exploration requires bounded working capacity',
        path: ['limits'],
      });
    }
  });

export const creativeExplorationNeedSchema = z
  .strictObject({
    format: z.literal('offscreen.creative-exploration-need.v1'),
    purpose: z.string().trim().min(2).max(240),
    situation: z.string().trim().min(2).max(800),
    playerIntention: z.string().trim().min(2).max(400),
    narrativeMode: z.enum(['directed', 'quiet', 'no-grand-narrative']),
    lenses: z.array(creativeLensSchema).min(1).max(8),
    scope: z.strictObject({
      storyId: z.uuid(),
      rootHash: hashSchema,
      rootRevision: z.number().int().positive(),
      branchKey: keySchema.nullable(),
      currentVersionsOnly: z.boolean(),
      visibilities: z
        .array(z.enum(['player-known', 'storyteller-private']))
        .min(1)
        .max(2),
      time: z.enum(['current', 'historical', 'any']),
    }),
  })
  .superRefine((need, context) => {
    if (new Set(need.lenses).size !== need.lenses.length) {
      context.addIssue({
        code: 'custom',
        message: 'Creative exploration lenses must be unique',
        path: ['lenses'],
      });
    }
    if (
      new Set(need.scope.visibilities).size !== need.scope.visibilities.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Creative exploration visibilities must be unique',
        path: ['scope', 'visibilities'],
      });
    }
  });

export const creativeDiscoveryRequestSchema = z
  .strictObject({
    format: z.literal('offscreen.creative-discovery-request.v1'),
    need: creativeExplorationNeedSchema,
    searches: z
      .array(
        z.strictObject({
          id: z.string().regex(/^q[1-9][0-9]*$/),
          lens: creativeLensSchema,
          query: z.string().trim().min(2).max(200),
        }),
      )
      .min(1)
      .max(12),
    limits: creativeExplorationLimitsSchema,
  })
  .superRefine((request, context) => {
    if (
      new Set(request.searches.map((search) => search.id)).size !==
      request.searches.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Creative discovery search IDs must be unique',
        path: ['searches'],
      });
    }
    const allowedLenses = new Set(request.need.lenses);
    if (request.searches.some((search) => !allowedLenses.has(search.lens))) {
      context.addIssue({
        code: 'custom',
        message: 'Creative discovery search uses an undeclared lens',
        path: ['searches'],
      });
    }
    if (
      request.searches.length > request.limits.maxQueries ||
      request.need.lenses.length > request.limits.maxLenses
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Creative discovery request exceeds its captured limits',
      });
    }
  });

const creativeEvidenceReferenceSchema = z.strictObject({
  documentId: z.uuid(),
  revision: z.number().int().positive(),
  sourceHash: hashSchema,
  path: z.string().trim().min(1).max(320),
  authority: z.string().trim().min(1).max(40),
  visibility: z.enum(['player-known', 'storyteller-private']),
  branchKey: keySchema.nullable(),
  current: z.boolean(),
});

export const creativeDiscoveryResultSchema = z
  .strictObject({
    format: z.literal('offscreen.creative-discovery-result.v1'),
    requestHash: hashSchema,
    coverage: z.strictObject({
      state: z.enum(['complete', 'partial', 'no-useful-leads', 'not-indexed']),
      searchedQueries: z.number().int().nonnegative().max(12),
      candidatesExamined: z.number().int().nonnegative(),
      omissions: z
        .array(
          z.enum([
            'query-limit',
            'candidate-limit',
            'read-limit',
            'byte-limit',
            'latency-limit',
            'index-unavailable',
          ]),
        )
        .max(6),
    }),
    leads: z
      .array(
        z.strictObject({
          id: z.string().regex(/^l[1-9][0-9]*$/),
          lens: creativeLensSchema,
          status: z.literal('private-possibility'),
          connection: z.strictObject({
            basis: z.literal('inferred'),
            summary: z.string().trim().min(2).max(400),
          }),
          potential: z.string().trim().min(2).max(400),
          constraints: z.array(z.string().trim().min(2).max(240)).max(8),
          evidence: z.array(creativeEvidenceReferenceSchema).min(1).max(6),
        }),
      )
      .max(16),
  })
  .superRefine((result, context) => {
    if (
      new Set(result.leads.map((lead) => lead.id)).size !== result.leads.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Creative discovery lead IDs must be unique',
        path: ['leads'],
      });
    }
    if (result.coverage.state === 'no-useful-leads' && result.leads.length) {
      context.addIssue({
        code: 'custom',
        message: 'No-useful-leads coverage cannot contain leads',
        path: ['leads'],
      });
    }
  });

export type CreativeExplorationPosture = z.infer<
  typeof creativeExplorationPostureSchema
>;
export type CreativeExplorationLimits = z.infer<
  typeof creativeExplorationLimitsSchema
>;
export type CreativeExplorationRecipe = z.infer<
  typeof creativeExplorationRecipeSchema
>;
export type CreativeExplorationNeed = z.infer<
  typeof creativeExplorationNeedSchema
>;
export type CreativeDiscoveryRequest = z.infer<
  typeof creativeDiscoveryRequestSchema
>;
export type CreativeDiscoveryResult = z.infer<
  typeof creativeDiscoveryResultSchema
>;
