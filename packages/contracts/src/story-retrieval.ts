import { z } from 'zod';

const hashSchema = z.string().regex(/^[0-9a-f]{64}$/);
const pathSchema = z.string().min(1).max(320);

export const storyRetrievalTuningSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
    version: z.number().int().positive(),
    maxQueryTerms: z.number().int().min(1).max(32),
    includeSourcePassages: z.boolean(),
    fieldWeights: z.strictObject({
      title: z.number().min(0).max(20),
      path: z.number().min(0).max(20),
      context: z.number().min(0).max(20),
      body: z.number().min(0).max(20),
    }),
    maxBodyTermFrequency: z.number().int().min(1).max(20),
  })
  .refine(
    (tuning) => Object.values(tuning.fieldWeights).some((weight) => weight > 0),
    { message: 'At least one retrieval field weight must be positive' },
  );

export const balancedStoryRetrievalTuning = {
  id: 'balanced-lexical',
  version: 1,
  maxQueryTerms: 16,
  includeSourcePassages: true,
  fieldWeights: { title: 5, path: 3, context: 2, body: 1 },
  maxBodyTermFrequency: 3,
} as const;

export const storyRetrievalQuerySchema = z.strictObject({
  storyId: z.uuid(),
  rootHash: hashSchema,
  rootRevision: z.number().int().positive(),
  query: z.string().trim().min(2).max(200),
  maxResults: z.number().int().min(1).max(12).default(5),
  maxExaminedUnits: z.number().int().min(1).max(4096).default(128),
  maxExaminedBytes: z
    .number()
    .int()
    .min(1024)
    .max(4 * 1024 * 1024)
    .default(128 * 1024),
  maxUnitBytes: z
    .number()
    .int()
    .min(256)
    .max(512 * 1024)
    .default(16 * 1024),
  tuning: storyRetrievalTuningSchema.default(balancedStoryRetrievalTuning),
});

export const storyRetrievalUnitSchema = z.strictObject({
  unitId: z.string().min(1).max(420),
  documentId: z.uuid(),
  revision: z.number().int().positive(),
  sourceHash: hashSchema,
  path: pathSchema,
  kind: z.string().min(1).max(80),
  authority: z.string().min(1).max(40),
  visibility: z.string().min(1).max(40),
  branchKey: z.string().min(1).max(100).nullable(),
  current: z.boolean(),
  headingPath: z.array(z.string().min(1).max(240)).max(8),
  linkedDocumentIds: z.array(z.uuid()).max(64),
  effectiveFromGameSecond: z.string().regex(/^\d+$/).nullable(),
  effectiveThroughGameSecond: z.string().regex(/^\d+$/).nullable(),
  title: z.string().min(1).max(240),
  contextualKey: z.string().min(1).max(800),
  bodyBytes: z.number().int().nonnegative(),
});

export const storyRetrievalCandidateSchema = z.strictObject({
  unit: storyRetrievalUnitSchema,
  snippet: z.string().max(400),
  matchedFields: z
    .array(z.enum(['title', 'path', 'heading', 'context', 'body']))
    .min(1)
    .max(5),
  matchedTerms: z.array(z.string().min(1).max(100)).max(32),
  score: z.strictObject({
    provider: z.string().min(1).max(80),
    value: z.number(),
  }),
});

export const storyRetrievalResultSchema = z.strictObject({
  format: z.literal('offscreen.story-retrieval-result.v1'),
  query: z.string().min(2).max(200),
  candidates: z.array(storyRetrievalCandidateSchema).max(12),
  coverage: z.strictObject({
    state: z.enum(['complete', 'partial', 'not-indexed']),
    rootHash: hashSchema,
    indexedThroughRevision: z.number().int().nonnegative(),
    eligibleUnits: z.number().int().nonnegative(),
    examinedUnits: z.number().int().nonnegative(),
    examinedBytes: z.number().int().nonnegative(),
    omissions: z
      .array(
        z.enum([
          'unit-limit',
          'byte-limit',
          'oversized-unit',
          'index-unavailable',
        ]),
      )
      .max(4),
  }),
  diagnostics: z.strictObject({
    tuning: storyRetrievalTuningSchema.nullable(),
    limits: z.strictObject({
      maxResults: z.number().int().positive(),
      maxExaminedUnits: z.number().int().positive(),
      maxExaminedBytes: z.number().int().positive(),
      maxUnitBytes: z.number().int().positive(),
    }),
    normalizedTerms: z.array(z.string().min(1).max(100)).max(32),
    termsTruncated: z.boolean(),
    matchedUnits: z.number().int().nonnegative(),
    returnedUnits: z.number().int().nonnegative(),
  }),
});

export type StoryRetrievalQuery = z.input<typeof storyRetrievalQuerySchema>;
export type StoryRetrievalTuning = z.infer<typeof storyRetrievalTuningSchema>;
export type StoryRetrievalUnit = z.infer<typeof storyRetrievalUnitSchema>;
export type StoryRetrievalCandidate = z.infer<
  typeof storyRetrievalCandidateSchema
>;
export type StoryRetrievalResult = z.infer<typeof storyRetrievalResultSchema>;

export const evidenceRepresentationLevelSchema = z.enum([
  'lead',
  'card',
  'exact',
]);

export const packableEvidenceItemSchema = z
  .strictObject({
    id: z.string().min(1).max(240),
    group: z.strictObject({
      kind: z.enum(['identity', 'place', 'thread', 'event', 'rule', 'other']),
      key: z.string().min(1).max(240),
    }),
    required: z.boolean(),
    minimumLevel: evidenceRepresentationLevelSchema,
    relevance: z.number().int().min(0).max(100),
    representations: z
      .array(
        z.strictObject({
          level: evidenceRepresentationLevelSchema,
          content: z.string().min(1).max(64 * 1024),
          sourceKeys: z.array(z.string().min(1).max(240)).min(1).max(32),
          utility: z.number().int().min(0).max(100),
        }),
      )
      .min(1)
      .max(3),
  })
  .superRefine((item, context) => {
    const levels = item.representations.map((entry) => entry.level);
    if (new Set(levels).size !== levels.length) {
      context.addIssue({
        code: 'custom',
        path: ['representations'],
        message: 'Evidence representation levels must be unique',
      });
    }
    const rank = { lead: 0, card: 1, exact: 2 } as const;
    if (!item.representations.some((entry) => rank[entry.level] >= rank[item.minimumLevel])) {
      context.addIssue({
        code: 'custom',
        path: ['minimumLevel'],
        message: 'Evidence item must provide its minimum representation level',
      });
    }
  });

export type PackableEvidenceItem = z.infer<typeof packableEvidenceItemSchema>;
export type EvidenceRepresentationLevel = z.infer<
  typeof evidenceRepresentationLevelSchema
>;

export const evidencePacketSchema = z.strictObject({
  format: z.literal('offscreen.evidence-pack.v1'),
  contents: z
    .array(
      z.strictObject({
        id: z.string().regex(/^c[1-9][0-9]*$/),
        text: z.string().min(1).max(64 * 1024),
      }),
    )
    .max(64),
  sources: z
    .array(
      z.strictObject({
        id: z.string().regex(/^s[1-9][0-9]*$/),
        key: z.string().min(1).max(240),
      }),
    )
    .max(2048),
  evidence: z.array(
    z.strictObject({
      itemId: z.string().min(1).max(240),
      group: z.strictObject({
        kind: z.enum(['identity', 'place', 'thread', 'event', 'rule', 'other']),
        key: z.string().min(1).max(240),
      }),
      required: z.boolean(),
      level: evidenceRepresentationLevelSchema,
      contentId: z.string().regex(/^c[1-9][0-9]*$/),
      sourceIds: z.array(z.string().regex(/^s[1-9][0-9]*$/)).max(32),
    }),
  ).max(64),
}).superRefine((packet, context) => {
  const unique = (values: readonly string[]) =>
    new Set(values).size === values.length;
  const contentIds = packet.contents.map((entry) => entry.id);
  const sourceIds = packet.sources.map((entry) => entry.id);
  const itemIds = packet.evidence.map((entry) => entry.itemId);
  if (!unique(contentIds) || !unique(sourceIds) || !unique(itemIds)) {
    context.addIssue({
      code: 'custom',
      message: 'Evidence packet identities must be unique',
    });
  }
  const knownContents = new Set(contentIds);
  const knownSources = new Set(sourceIds);
  packet.evidence.forEach((entry, index) => {
    if (!knownContents.has(entry.contentId)) {
      context.addIssue({
        code: 'custom',
        path: ['evidence', index, 'contentId'],
        message: 'Evidence content reference is missing',
      });
    }
    if (entry.sourceIds.some((id) => !knownSources.has(id))) {
      context.addIssue({
        code: 'custom',
        path: ['evidence', index, 'sourceIds'],
        message: 'Evidence source reference is missing',
      });
    }
  });
});

export type EvidencePacket = z.infer<typeof evidencePacketSchema>;
