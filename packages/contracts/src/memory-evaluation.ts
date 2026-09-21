import { z } from 'zod';

const keySchema = z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const pathSchema = z
  .string()
  .min(1)
  .max(320)
  .regex(/^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))(?!.*\\).+$/);

export const memoryQueryClassSchema = z.enum([
  'exact-current-state',
  'alias-disambiguation',
  'exact-wording',
  'paraphrased-callback',
  'multi-hop-relation',
  'temporal-update',
  'attributed-claim',
  'private-decoy',
  'low-drama-detail',
  'broad-synthesis',
  'absence-abstention',
  'abstract-world-contrast',
  'branch-isolation',
]);

export const memoryOracleQuerySchema = z.strictObject({
  id: keySchema,
  queryClass: memoryQueryClassSchema,
  informationNeed: z.string().trim().min(1).max(300),
  query: z.string().trim().min(2).max(200),
  expectedEvidence: z.array(keySchema).max(16),
  acceptableEvidence: z.array(keySchema).max(16),
  forbiddenEvidence: z.array(keySchema).max(24),
  scope: z.strictObject({
    branchKey: keySchema,
    currentVersionsOnly: z.boolean(),
    visibilities: z
      .array(z.enum(['player-known', 'storyteller-private']))
      .min(1)
      .max(2),
    time: z.enum(['current', 'historical', 'any']),
  }),
  abstainWhenExpectedMissing: z.boolean(),
  budget: z.strictObject({
    maxCandidates: z.number().int().min(1).max(12),
    maxReads: z.number().int().min(0).max(6),
    maxBytes: z.number().int().min(1024).max(48 * 1024),
    maxRounds: z.number().int().min(0).max(3),
  }),
});

const visibilitySchema = z.enum([
  'player-known',
  'storyteller-private',
  'developer-private',
]);

export const longStoryMemoryCorpusSchema = z
  .strictObject({
    format: z.literal('offscreen.memory-evaluation-corpus.v1'),
    id: keySchema,
    worldContrast: z.enum(['conventional', 'abstract']),
    campaignId: z.uuid(),
    branch: z.strictObject({
      key: keySchema,
      id: z.uuid(),
      parentKey: keySchema.nullable(),
      forkSequence: z.number().int().positive().nullable(),
    }),
    scenes: z
      .array(
        z.strictObject({
          sequence: z.number().int().positive(),
          tick: z.string().regex(/^\d+$/),
          documentId: z.uuid(),
          path: pathSchema,
          title: z.string().min(1).max(160),
          paragraphs: z.array(z.string().min(1).max(6000)).min(1).max(10),
        }),
      )
      .min(1)
      .max(2000),
    evidence: z
      .array(
        z.strictObject({
          key: keySchema,
          documentId: z.uuid(),
          revision: z.number().int().positive(),
          path: pathSchema,
          kind: z.enum([
            'identity',
            'relationship',
            'narrative-thread',
            'lore',
            'private-possibility',
            'state-projection',
          ]),
          authority: z.enum([
            'canon',
            'derived',
            'attributed',
            'noncanonical',
            'projection',
          ]),
          visibility: visibilitySchema,
          title: z.string().min(1).max(240),
          body: z.string().min(1).max(64 * 1024),
          sourceSequences: z.array(z.number().int().positive()).max(16),
        }),
      )
      .max(256),
    queries: z.array(memoryOracleQuerySchema).min(1).max(64),
  })
  .superRefine((corpus, context) => {
    const unique = (values: readonly string[]) => new Set(values).size === values.length;
    if (!unique(corpus.scenes.map((scene) => scene.documentId)))
      context.addIssue({ code: 'custom', message: 'Scene document IDs must be unique' });
    if (!unique(corpus.scenes.map((scene) => scene.path)))
      context.addIssue({ code: 'custom', message: 'Scene paths must be unique' });
    if (!unique(corpus.evidence.map((entry) => entry.key)))
      context.addIssue({ code: 'custom', message: 'Evidence keys must be unique' });
    if (!unique(corpus.queries.map((query) => query.id)))
      context.addIssue({ code: 'custom', message: 'Query IDs must be unique' });
    const sequences = new Set(corpus.scenes.map((scene) => scene.sequence));
    corpus.evidence.forEach((entry, index) =>
      entry.sourceSequences.forEach((sequence) => {
        if (!sequences.has(sequence))
          context.addIssue({
            code: 'custom',
            message: 'Evidence source sequence must exist in the corpus',
            path: ['evidence', index, 'sourceSequences'],
          });
      }),
    );
    const evidenceKeys = new Set(corpus.evidence.map((entry) => entry.key));
    corpus.queries.forEach((query, index) => {
      for (const key of [...query.expectedEvidence, ...query.acceptableEvidence])
        if (!evidenceKeys.has(key))
          context.addIssue({
            code: 'custom',
            message: 'Expected and acceptable evidence must exist in the corpus',
            path: ['queries', index],
          });
    });
  });

export type LongStoryMemoryCorpus = z.infer<typeof longStoryMemoryCorpusSchema>;
export type MemoryOracleQuery = z.infer<typeof memoryOracleQuerySchema>;

const uniqueKeysSchema = z
  .array(keySchema)
  .max(64)
  .refine((keys) => new Set(keys).size === keys.length, 'Evidence keys must be unique');

export const memoryEvaluationObservationSchema = z.strictObject({
  format: z.literal('offscreen.memory-evaluation-observation.v1'),
  corpusId: keySchema,
  queryId: keySchema,
  retrieval: z.strictObject({
    evidenceKeys: uniqueKeysSchema,
    coverage: z.enum(['complete', 'partial', 'not-indexed']),
    candidatesExamined: z.number().int().nonnegative(),
    durationMs: z.number().nonnegative(),
  }),
  assembly: z.strictObject({
    evidenceKeys: uniqueKeysSchema,
    bytes: z.number().int().nonnegative(),
    duplicateBytes: z.number().int().nonnegative(),
  }),
  generation: z.discriminatedUnion('disposition', [
    z.strictObject({ disposition: z.literal('not-run'), usedEvidenceKeys: z.tuple([]) }),
    z.strictObject({
      disposition: z.enum(['answered', 'abstained']),
      usedEvidenceKeys: uniqueKeysSchema,
    }),
  ]),
});

export const memoryEvaluationStageSchema = z.strictObject({
  status: z.enum(['passed', 'failed', 'not-run']),
  missingExpected: uniqueKeysSchema,
  forbiddenObserved: uniqueKeysSchema,
  unexpectedObserved: uniqueKeysSchema,
});

export const memoryEvaluationReportSchema = z.strictObject({
  format: z.literal('offscreen.memory-evaluation-report.v1'),
  corpusId: keySchema,
  queryId: keySchema,
  retrieval: memoryEvaluationStageSchema.extend({
    expectedRecall: z.number().min(0).max(1),
    contextPrecision: z.number().min(0).max(1),
    coverage: z.enum(['complete', 'partial', 'not-indexed']),
    candidatesExamined: z.number().int().nonnegative(),
    durationMs: z.number().nonnegative(),
  }),
  assembly: memoryEvaluationStageSchema.extend({
    bytes: z.number().int().nonnegative(),
    duplicateBytes: z.number().int().nonnegative(),
  }),
  generation: memoryEvaluationStageSchema.extend({
    disposition: z.enum(['answered', 'abstained', 'not-run']),
  }),
});

export const memoryEvaluationSuiteReportSchema = z.strictObject({
  format: z.literal('offscreen.memory-evaluation-suite-report.v1'),
  corpusId: keySchema,
  reports: z.array(memoryEvaluationReportSchema).min(1).max(64),
  summary: z.strictObject({
    queries: z.number().int().positive(),
    retrievalPassed: z.number().int().nonnegative(),
    assemblyPassed: z.number().int().nonnegative(),
    generationPassed: z.number().int().nonnegative(),
    generationNotRun: z.number().int().nonnegative(),
    meanExpectedRecall: z.number().min(0).max(1),
    meanContextPrecision: z.number().min(0).max(1),
  }),
});

export type MemoryEvaluationObservation = z.infer<
  typeof memoryEvaluationObservationSchema
>;
export type MemoryEvaluationReport = z.infer<typeof memoryEvaluationReportSchema>;
