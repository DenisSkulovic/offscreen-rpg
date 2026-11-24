import { createHash } from 'node:crypto';
import { z } from 'zod';
import { gameAuthorityErrorSchema } from './game-authority';

/** Private Game Authority seam for committed Storyteller task custody. Not a player route. */
export const storytellerTaskCustodyContractVersion =
  'storyteller.generation-custody.v1' as const;

export const storytellerTaskCustodyVersionHeader =
  'x-offscreen-storyteller-task-custody-version' as const;

/** Matches apps/game-authority/src/server.ts BODY_LIMIT for JSON command bodies. */
export const storytellerTaskCustodyBodyByteLimit = 64 * 1024;

export const storytellerTaskCustodyGenerationIdSchema = z.uuid();

export const pinnedStorytellerRootSchema = z.union([
  z.string().regex(/^[0-9a-f]{64}$/),
  z.null(),
]);

export const storytellerTaskCustodyResultHashSchema = z
  .string()
  .regex(/^[0-9a-f]{64}$/);

const storytellerTaskCustodyRequestVersionSchema = z.literal(
  storytellerTaskCustodyContractVersion,
);

/** Executor PUT claim — trusted owner/root come from DB, not the body. */
export const storytellerTaskCustodyClaimRequestSchema = z.strictObject({
  schemaVersion: storytellerTaskCustodyRequestVersionSchema,
  pinnedRoot: pinnedStorytellerRootSchema,
});

/**
 * Executor PUT result — `result` is validated server-side with
 * `validateStorytellerResult` and hashed with `hashStorytellerTaskCustodyResult`.
 */
export const storytellerTaskCustodySaveResultRequestSchema = z.strictObject({
  schemaVersion: storytellerTaskCustodyRequestVersionSchema,
  pinnedRoot: pinnedStorytellerRootSchema,
  resultHash: storytellerTaskCustodyResultHashSchema,
  result: z.unknown(),
});

export type StorytellerTaskCustodyClaimRequest = z.infer<
  typeof storytellerTaskCustodyClaimRequestSchema
>;

export type StorytellerTaskCustodySaveResultRequest = z.infer<
  typeof storytellerTaskCustodySaveResultRequestSchema
>;

const storytellerTaskCustodyRootHashSchema = z
  .string()
  .regex(/^[0-9a-f]{64}$/);

const storytellerTaskCustodyPositiveRevisionSchema = z.number().int().positive();

export const storytellerTaskCustodyEvidenceRequestSchema = z.strictObject({
  schemaVersion: storytellerTaskCustodyRequestVersionSchema,
  storyId: z.uuid(),
  rootHash: storytellerTaskCustodyRootHashSchema,
  rootRevision: storytellerTaskCustodyPositiveRevisionSchema,
  handles: z.array(z.uuid()).max(8),
});

export type StorytellerTaskCustodyEvidenceRequest = z.infer<
  typeof storytellerTaskCustodyEvidenceRequestSchema
>;

const storytellerTaskCustodyEvidenceItemSchema = z.strictObject({
  documentId: z.uuid(),
  path: z.string().min(1).max(320),
  kind: z.string().min(1).max(64),
  objectHash: storytellerTaskCustodyResultHashSchema,
  revision: storytellerTaskCustodyPositiveRevisionSchema,
});

export const storytellerTaskCustodyEvidenceResponseSchema =
  z.discriminatedUnion('status', [
    z.strictObject({
      status: z.literal('ready'),
      generationId: storytellerTaskCustodyGenerationIdSchema,
      ownerId: z.string().min(1).max(128),
      rootHash: storytellerTaskCustodyRootHashSchema,
      rootRevision: storytellerTaskCustodyPositiveRevisionSchema,
      partial: z.literal(false),
      evidence: z.array(storytellerTaskCustodyEvidenceItemSchema).max(8),
    }),
    z.strictObject({
      status: z.literal('refused'),
      reason: z.enum([
        'unknown-generation',
        'unreadable-task',
        'unsupported-execution',
        'root-mismatch',
        'story-mismatch',
        'unknown-handle',
        'read-limit',
      ]),
    }),
  ]);

export type StorytellerTaskCustodyEvidenceResponse = z.infer<
  typeof storytellerTaskCustodyEvidenceResponseSchema
>;

export const storytellerTaskCustodyFetchResponseSchema = z.discriminatedUnion(
  'status',
  [
    z.strictObject({
      status: z.literal('ready'),
      generationId: storytellerTaskCustodyGenerationIdSchema,
      ownerId: z.string().min(1).max(128),
      pinnedRoot: pinnedStorytellerRootSchema,
      task: z.unknown(),
    }),
    z.strictObject({
      status: z.literal('refused'),
      reason: z.enum([
        'unknown-generation',
        'unreadable-task',
        'unsupported-execution',
      ]),
    }),
  ],
);

export const storytellerTaskCustodyClaimResponseSchema = z.discriminatedUnion(
  'status',
  [
    z.strictObject({
      status: z.literal('claimed'),
      generationId: storytellerTaskCustodyGenerationIdSchema,
      attemptId: z.uuid(),
      created: z.boolean(),
    }),
    z.strictObject({
      status: z.literal('refused'),
      reason: z.enum([
        'unknown-generation',
        'root-mismatch',
        'unreadable-task',
        'unsupported-execution',
      ]),
    }),
  ],
);

export const storytellerTaskCustodySaveResultResponseSchema =
  z.discriminatedUnion('status', [
    z.strictObject({
      status: z.literal('saved'),
      generationId: storytellerTaskCustodyGenerationIdSchema,
      attemptId: z.uuid(),
      resultHash: storytellerTaskCustodyResultHashSchema,
      result: z.unknown(),
    }),
    z.strictObject({
      status: z.literal('conflict'),
      reason: z.literal('result-hash'),
      generationId: storytellerTaskCustodyGenerationIdSchema,
      attemptId: z.uuid(),
      resultHash: storytellerTaskCustodyResultHashSchema,
    }),
    z.strictObject({
      status: z.literal('refused'),
      reason: z.enum([
        'unknown-generation',
        'root-mismatch',
        'unreadable-task',
        'unsupported-execution',
        'invalid-result',
        'hash-mismatch',
        'unclaimed',
      ]),
    }),
  ]);

export const storytellerTaskCustodyReadSavedResponseSchema =
  z.discriminatedUnion('status', [
    z.strictObject({
      status: z.literal('saved'),
      generationId: storytellerTaskCustodyGenerationIdSchema,
      attemptId: z.uuid(),
      resultHash: storytellerTaskCustodyResultHashSchema,
      result: z.unknown(),
    }),
    z.strictObject({
      status: z.literal('claimed'),
      generationId: storytellerTaskCustodyGenerationIdSchema,
      attemptId: z.uuid(),
    }),
    z.strictObject({
      status: z.literal('unclaimed'),
      generationId: storytellerTaskCustodyGenerationIdSchema,
    }),
    z.strictObject({
      status: z.literal('refused'),
      reason: z.enum([
        'unknown-generation',
        'unreadable-task',
        'unsupported-execution',
      ]),
    }),
  ]);

export type StorytellerTaskCustodyFetchResponse = z.infer<
  typeof storytellerTaskCustodyFetchResponseSchema
>;

export type StorytellerTaskCustodyClaimResponse = z.infer<
  typeof storytellerTaskCustodyClaimResponseSchema
>;

export type StorytellerTaskCustodySaveResultResponse = z.infer<
  typeof storytellerTaskCustodySaveResultResponseSchema
>;

export type StorytellerTaskCustodyReadSavedResponse = z.infer<
  typeof storytellerTaskCustodyReadSavedResponseSchema
>;

export const storytellerTaskCustodyHttpErrorSchema = gameAuthorityErrorSchema;

export type StorytellerTaskCustodyParseFailure =
  | 'oversized-body'
  | 'invalid-json'
  | 'invalid-shape';

export function storytellerTaskCustodyGenerationBasePath(
  generationId: string,
): string {
  storytellerTaskCustodyGenerationIdSchema.parse(generationId);
  return `/internal/v1/storyteller-generations/${generationId}`;
}

export function storytellerTaskCustodyTaskPath(generationId: string): string {
  return `${storytellerTaskCustodyGenerationBasePath(generationId)}/task`;
}

export function storytellerTaskCustodyClaimPath(generationId: string): string {
  return `${storytellerTaskCustodyGenerationBasePath(generationId)}/claim`;
}

export function storytellerTaskCustodySaveResultPath(
  generationId: string,
): string {
  return `${storytellerTaskCustodyGenerationBasePath(generationId)}/result`;
}

export function storytellerTaskCustodyReadSavedPath(
  generationId: string,
): string {
  return `${storytellerTaskCustodyGenerationBasePath(generationId)}/saved-result`;
}

export function storytellerTaskCustodyEvidencePath(
  generationId: string,
): string {
  return `${storytellerTaskCustodyGenerationBasePath(generationId)}/evidence`;
}

export function storytellerGenerationPublishPath(generationId: string): string {
  return `${storytellerTaskCustodyGenerationBasePath(generationId)}/publish`;
}

export const storytellerGenerationPublishResponseSchema = z.discriminatedUnion(
  'status',
  [
    z.strictObject({
      status: z.literal('published'),
      generationId: storytellerTaskCustodyGenerationIdSchema,
      attemptId: z.uuid(),
      resultHash: storytellerTaskCustodyResultHashSchema,
      passageId: z.uuid().optional(),
    }),
    z.strictObject({
      status: z.literal('already_published'),
      generationId: storytellerTaskCustodyGenerationIdSchema,
      attemptId: z.uuid(),
      resultHash: storytellerTaskCustodyResultHashSchema,
      passageId: z.uuid().optional(),
    }),
    z.strictObject({
      status: z.literal('stale'),
      generationId: storytellerTaskCustodyGenerationIdSchema,
    }),
    z.strictObject({
      status: z.literal('blocked'),
      generationId: storytellerTaskCustodyGenerationIdSchema,
      reason: z.string().min(1).max(128),
    }),
    z.strictObject({
      status: z.literal('refused'),
      reason: z.literal('unknown-generation'),
    }),
  ],
);

export type StorytellerGenerationPublishResponse = z.infer<
  typeof storytellerGenerationPublishResponseSchema
>;

export type StorytellerTaskCustodyRoute =
  | { kind: 'task'; generationId: string }
  | { kind: 'claim'; generationId: string }
  | { kind: 'save-result'; generationId: string }
  | { kind: 'read-saved'; generationId: string }
  | { kind: 'publish'; generationId: string }
  | { kind: 'evidence'; generationId: string }
  | { kind: 'invalid' }
  | { kind: 'absent' };

export function routeStorytellerTaskCustody(
  method: string,
  pathname: string,
): StorytellerTaskCustodyRoute {
  const parts = pathname.split('/').filter((part) => part.length > 0);
  if (parts[0] !== 'internal' || parts[1] !== 'v1') {
    return { kind: 'absent' };
  }
  if (parts[2] !== 'storyteller-generations' || parts.length < 4) {
    return { kind: 'absent' };
  }
  const generationId = storytellerTaskCustodyGenerationIdSchema.safeParse(
    parts[3],
  );
  if (!generationId.success) {
    return { kind: 'invalid' };
  }
  const id = generationId.data;
  if (parts.length === 5 && parts[4] === 'task' && method === 'GET') {
    return { kind: 'task', generationId: id };
  }
  if (parts.length === 5 && parts[4] === 'claim' && method === 'PUT') {
    return { kind: 'claim', generationId: id };
  }
  if (parts.length === 5 && parts[4] === 'result' && method === 'PUT') {
    return { kind: 'save-result', generationId: id };
  }
  if (parts.length === 5 && parts[4] === 'saved-result' && method === 'GET') {
    return { kind: 'read-saved', generationId: id };
  }
  if (parts.length === 5 && parts[4] === 'publish' && method === 'POST') {
    return { kind: 'publish', generationId: id };
  }
  if (parts.length === 5 && parts[4] === 'evidence' && method === 'POST') {
    return { kind: 'evidence', generationId: id };
  }
  return { kind: 'absent' };
}

function canonicalStorytellerCustodyJson(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('invalid-result');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalStorytellerCustodyJson(entry)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
    return `{${entries
      .map(
        ([key, child]) =>
          `${JSON.stringify(key)}:${canonicalStorytellerCustodyJson(child)}`,
      )
      .join(',')}}`;
  }
  throw new Error('invalid-result');
}

/** Same digest as packages/application/src/storyteller/execution.ts custody hashing. */
export function hashStorytellerTaskCustodyResult(result: unknown): string {
  return createHash('sha256')
    .update(canonicalStorytellerCustodyJson(result))
    .digest('hex');
}

export type StorytellerTaskCustodyParsedBody =
  | { ok: true; value: unknown }
  | { ok: false; reason: StorytellerTaskCustodyParseFailure };

export function parseStorytellerTaskCustodyJsonBody(
  raw: string | Uint8Array,
  limit = storytellerTaskCustodyBodyByteLimit,
): StorytellerTaskCustodyParsedBody {
  const bytes =
    typeof raw === 'string'
      ? Buffer.byteLength(raw, 'utf8')
      : raw.byteLength;
  if (bytes > limit) {
    return { ok: false, reason: 'oversized-body' };
  }
  if (bytes === 0) {
    return { ok: false, reason: 'invalid-shape' };
  }
  const text =
    typeof raw === 'string' ? raw : Buffer.from(raw).toString('utf8');
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, reason: 'invalid-json' };
  }
  return { ok: true, value };
}

export function parseStorytellerTaskCustodyClaimRequest(
  raw: string | Uint8Array,
  limit = storytellerTaskCustodyBodyByteLimit,
) {
  const body = parseStorytellerTaskCustodyJsonBody(raw, limit);
  if (!body.ok) return body;
  const parsed = storytellerTaskCustodyClaimRequestSchema.safeParse(body.value);
  if (!parsed.success) {
    return { ok: false as const, reason: 'invalid-shape' as const };
  }
  return { ok: true as const, value: parsed.data };
}

export function parseStorytellerTaskCustodySaveResultRequest(
  raw: string | Uint8Array,
  limit = storytellerTaskCustodyBodyByteLimit,
) {
  const body = parseStorytellerTaskCustodyJsonBody(raw, limit);
  if (!body.ok) return body;
  const parsed = storytellerTaskCustodySaveResultRequestSchema.safeParse(
    body.value,
  );
  if (!parsed.success) {
    return { ok: false as const, reason: 'invalid-shape' as const };
  }
  return { ok: true as const, value: parsed.data };
}

export function parseStorytellerTaskCustodyEvidenceRequest(
  raw: string | Uint8Array,
  limit = storytellerTaskCustodyBodyByteLimit,
) {
  const body = parseStorytellerTaskCustodyJsonBody(raw, limit);
  if (!body.ok) return body;
  const parsed = storytellerTaskCustodyEvidenceRequestSchema.safeParse(
    body.value,
  );
  if (!parsed.success) {
    return { ok: false as const, reason: 'invalid-shape' as const };
  }
  return { ok: true as const, value: parsed.data };
}