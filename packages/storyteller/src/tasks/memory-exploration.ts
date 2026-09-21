import { z } from 'zod';

const requestIdSchema = z.string().regex(/^r[1-9][0-9]*$/);
const memoryHandleSchema = z.string().regex(/^m[1-9][0-9]*$/);
const sourceHandleSchema = z.string().regex(/^s[1-9][0-9]*$/);

export const memoryExplorationOperationSchema = z.discriminatedUnion(
  'operation',
  [
    z.strictObject({
      requestId: requestIdSchema,
      operation: z.literal('query_registry'),
      query: z.string().trim().min(2).max(160),
    }),
    z.strictObject({
      requestId: requestIdSchema,
      operation: z.literal('search_memory'),
      query: z.string().trim().min(2).max(200),
    }),
    z.strictObject({
      requestId: requestIdSchema,
      operation: z.literal('inspect_memory'),
      handle: memoryHandleSchema,
    }),
    z.strictObject({
      requestId: requestIdSchema,
      operation: z.literal('read_source'),
      handle: sourceHandleSchema,
    }),
  ],
);

/** Private non-publishable response requesting bounded canonical evidence. */
export const storytellerNeedsContextSchema = z
  .strictObject({
    kind: z.literal('needs_context'),
    version: z.literal(1),
    purpose: z.string().trim().min(2).max(240),
    requests: z.array(memoryExplorationOperationSchema).min(1).max(6),
  })
  .superRefine((request, context) => {
    const ids = request.requests.map((entry) => entry.requestId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: 'custom',
        message: 'Exploration request IDs must be unique within a round',
        path: ['requests'],
      });
    }
  });

export type MemoryExplorationOperation = z.infer<
  typeof memoryExplorationOperationSchema
>;
export type StorytellerNeedsContext = z.infer<
  typeof storytellerNeedsContextSchema
>;
