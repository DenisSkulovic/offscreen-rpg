import { z } from 'zod';

const keySchema = z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const uniqueKeysSchema = z
  .array(keySchema)
  .max(64)
  .refine((keys) => new Set(keys).size === keys.length, 'Keys must be unique');

export const creativeLensSchema = z.enum([
  'echo',
  'contrast',
  'consequence',
  'relationship',
  'dormant-thread',
  'setting-affordance',
  'thematic-resonance',
  'serendipity',
]);

export const creativeExplorationBenchmarkCaseSchema = z
  .strictObject({
    id: keySchema,
    corpusId: keySchema,
    worldContrast: z.enum(['conventional', 'abstract']),
    checkpoint: z.strictObject({
      branchKey: keySchema,
      throughSequence: z.number().int().positive(),
      situation: z.string().trim().min(1).max(500),
      playerIntention: z.string().trim().min(1).max(300),
      narrativeMode: z.enum(['directed', 'quiet', 'no-grand-narrative']),
    }),
    sources: z
      .array(
        z.strictObject({
          evidenceKey: keySchema,
          documentId: z.uuid(),
          revision: z.number().int().positive(),
          path: z.string().trim().min(1).max(320),
          authority: z.enum([
            'canon',
            'derived',
            'attributed',
            'noncanonical',
            'projection',
          ]),
          visibility: z.enum([
            'player-known',
            'storyteller-private',
            'developer-private',
          ]),
        }),
      )
      .min(1)
      .max(64),
    literalBaselineEvidenceKeys: uniqueKeysSchema,
    directionFamilies: z
      .array(
        z.strictObject({
          id: keySchema,
          label: z.string().trim().min(1).max(160),
          lens: creativeLensSchema,
          requiredEvidenceKeys: uniqueKeysSchema.min(1),
          intendedValue: z.string().trim().min(1).max(400),
        }),
      )
      .min(1)
      .max(12),
    forbiddenConnections: z
      .array(
        z.strictObject({
          id: keySchema,
          evidenceKeys: uniqueKeysSchema.min(1),
          kind: z.enum([
            'wrong-branch',
            'private-leak',
            'stale-as-current',
            'unsupported-invention',
            'world-default',
            'forced-escalation',
          ]),
          reason: z.string().trim().min(1).max(400),
        }),
      )
      .max(16),
    minimumDistinctDirections: z.number().int().min(1).max(8),
    reviewDimensions: z
      .array(
        z.enum([
          'specificity',
          'coherence',
          'surprise',
          'restraint',
          'continuity-payoff',
          'desire-to-continue',
        ]),
      )
      .min(1)
      .max(6),
  })
  .superRefine((value, context) => {
    const sourceKeys = new Set(
      value.sources.map((source) => source.evidenceKey),
    );
    const referenced = [
      ...value.literalBaselineEvidenceKeys,
      ...value.directionFamilies.flatMap(
        (family) => family.requiredEvidenceKeys,
      ),
      ...value.forbiddenConnections.flatMap((entry) => entry.evidenceKeys),
    ];
    if (referenced.some((key) => !sourceKeys.has(key))) {
      context.addIssue({
        code: 'custom',
        message: 'Benchmark references evidence outside its source catalogue',
      });
    }
    if (
      new Set(value.sources.map((source) => source.evidenceKey)).size !==
      value.sources.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Benchmark source keys must be unique',
      });
    }
    if (
      new Set(value.directionFamilies.map((family) => family.id)).size !==
      value.directionFamilies.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Direction family IDs must be unique',
      });
    }
  });

export const creativeExplorationObservationSchema = z.strictObject({
  format: z.literal('offscreen.creative-exploration-observation.v1'),
  caseId: keySchema,
  route: z.enum(['literal', 'noisy', 'curated']),
  discoveredEvidenceKeys: uniqueKeysSchema,
  directions: z
    .array(
      z.strictObject({
        id: keySchema,
        familyId: keySchema,
        evidenceKeys: uniqueKeysSchema.min(1),
        premise: z.string().trim().min(1).max(500),
      }),
    )
    .max(12),
  selectedDirectionId: keySchema.nullable(),
  finalUsedEvidenceKeys: uniqueKeysSchema,
});

const evaluationStageSchema = z.strictObject({
  status: z.enum(['passed', 'failed', 'not-run']),
  reasons: z.array(z.string().min(1).max(300)).max(24),
});

export const creativeExplorationEvaluationReportSchema = z.strictObject({
  format: z.literal('offscreen.creative-exploration-report.v1'),
  caseId: keySchema,
  route: z.enum(['literal', 'noisy', 'curated']),
  sourceValidity: evaluationStageSchema,
  connectionCoverage: evaluationStageSchema.extend({
    coveredFamilies: uniqueKeysSchema,
    totalFamilies: z.number().int().positive(),
  }),
  directionDiversity: evaluationStageSchema.extend({
    distinctValidFamilies: z.number().int().nonnegative(),
    requiredDistinctFamilies: z.number().int().positive(),
  }),
  finalGrounding: evaluationStageSchema,
  humanTaste: z.strictObject({
    status: z.literal('not-run'),
    dimensions: z.array(z.string().min(1)).min(1),
  }),
});

export type CreativeExplorationBenchmarkCase = z.infer<
  typeof creativeExplorationBenchmarkCaseSchema
>;
export type CreativeExplorationObservation = z.infer<
  typeof creativeExplorationObservationSchema
>;
export type CreativeExplorationEvaluationReport = z.infer<
  typeof creativeExplorationEvaluationReportSchema
>;
