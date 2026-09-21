import { z } from 'zod';

const hashSchema = z.string().regex(/^[0-9a-f]{64}$/);
const pathSchema = z.string().min(1).max(320);

export const storyRetrievalQuerySchema = z.strictObject({
  storyId: z.uuid(),
  rootHash: hashSchema,
  rootRevision: z.number().int().positive(),
  query: z.string().trim().min(2).max(200),
  maxResults: z.number().int().min(1).max(12).default(5),
  maxExaminedUnits: z.number().int().min(1).max(4096).default(128),
  maxExaminedBytes: z.number().int().min(1024).max(4 * 1024 * 1024).default(128 * 1024),
  maxUnitBytes: z.number().int().min(256).max(512 * 1024).default(16 * 1024),
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
  effectiveFromTick: z.string().regex(/^\d+$/).nullable(),
  effectiveThroughTick: z.string().regex(/^\d+$/).nullable(),
  title: z.string().min(1).max(240),
  contextualKey: z.string().min(1).max(800),
  bodyBytes: z.number().int().nonnegative(),
});

export const storyRetrievalCandidateSchema = z.strictObject({
  unit: storyRetrievalUnitSchema,
  snippet: z.string().max(400),
  matchedFields: z.array(z.enum(['title', 'path', 'heading', 'context', 'body'])).min(1).max(5),
  matchedTerms: z.array(z.string().min(1).max(100)).max(16),
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
    omissions: z.array(z.enum(['unit-limit', 'byte-limit', 'oversized-unit', 'index-unavailable'])).max(4),
  }),
  diagnostics: z.strictObject({
    normalizedTerms: z.array(z.string().min(1).max(100)).max(16),
    termsTruncated: z.boolean(),
    matchedUnits: z.number().int().nonnegative(),
    returnedUnits: z.number().int().nonnegative(),
  }),
});

export type StoryRetrievalQuery = z.input<typeof storyRetrievalQuerySchema>;
export type StoryRetrievalUnit = z.infer<typeof storyRetrievalUnitSchema>;
export type StoryRetrievalCandidate = z.infer<
  typeof storyRetrievalCandidateSchema
>;
export type StoryRetrievalResult = z.infer<typeof storyRetrievalResultSchema>;
