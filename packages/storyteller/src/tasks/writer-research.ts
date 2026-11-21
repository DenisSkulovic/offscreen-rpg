import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  writerModelSelectionSchema,
  writerToolCallIdSchema,
} from './writer-mission.js';

const sha256HexSchema = z.string().regex(/^[a-f0-9]{64}$/);

/** Read-only tools a research child may execute; never includes delegation or Workdesk. */
export const WRITER_RESEARCH_READ_ONLY_TOOL_NAMES = [
  'library.browse',
  'library.find',
  'library.read',
  'library.diff',
  'skills.open',
] as const;

export const writerResearchChildToolNameSchema = z.enum(
  WRITER_RESEARCH_READ_ONLY_TOOL_NAMES,
);

export type WriterResearchChildToolName = z.infer<
  typeof writerResearchChildToolNameSchema
>;

export const writerResearchFundingV1Schema = z.strictObject({
  maxModelRounds: z.number().int().positive().max(3),
  maxInputTokens: z.number().int().positive().max(200_000),
  maxGeneratedTokens: z.number().int().positive().max(32_000),
  maxMicrousd: z
    .number()
    .int()
    .positive()
    .max(10_000_000_000),
});

export type WriterResearchFundingV1 = z.infer<
  typeof writerResearchFundingV1Schema
>;

export const writerResearchCaptureV1Schema = z
  .strictObject({
    version: z.literal('writer-research.v1'),
    missionId: z.uuid(),
    parentToolCallId: writerToolCallIdSchema,
    childOrdinal: z.number().int().min(1).max(2),
    question: z.string().trim().min(1).max(1200),
    rootHash: sha256HexSchema,
    rootRevision: z.number().int().positive(),
    skillObjectHashes: z.array(sha256HexSchema).max(16),
    toolAllowlist: z
      .array(writerResearchChildToolNameSchema)
      .min(1)
      .max(WRITER_RESEARCH_READ_ONLY_TOOL_NAMES.length),
    modelSelection: writerModelSelectionSchema,
    funding: writerResearchFundingV1Schema,
    required: z.boolean(),
  })
  .superRefine((capture, context) => {
  const tools = capture.toolAllowlist;
  if (new Set(tools).size !== tools.length) {
    context.addIssue({
      code: 'custom',
      path: ['toolAllowlist'],
      message: 'Research child tool grant must not list duplicate tool names',
    });
  }
  const skillHashes = capture.skillObjectHashes;
  if (new Set(skillHashes).size !== skillHashes.length) {
    context.addIssue({
      code: 'custom',
      path: ['skillObjectHashes'],
      message: 'Skill pins must be unique within a research child capture',
    });
  }
  if ((tools as string[]).includes(WRITER_RESEARCH_DELEGATE_TOOL_NAME)) {
    context.addIssue({
      code: 'custom',
      path: ['toolAllowlist'],
      message: 'Research child grant must not include research.delegate',
    });
  }
});

export type WriterResearchCaptureV1 = z.infer<
  typeof writerResearchCaptureV1Schema
>;

export const writerResearchResultEvidenceSchema = z.strictObject({
  rootHash: sha256HexSchema,
  documentId: z.uuid(),
  objectHash: sha256HexSchema,
  section: z.string().trim().min(1).max(240),
});

export const writerResearchResultClaimSchema = z.strictObject({
  text: z.string().trim().min(1).max(400),
  evidence: z.array(writerResearchResultEvidenceSchema).max(8),
});

export const writerResearchResultV1Schema = z
  .strictObject({
    version: z.literal('writer-research-result.v1'),
    claims: z.array(writerResearchResultClaimSchema).max(16),
    gaps: z.array(z.string().trim().min(1).max(400)).max(8),
    contradictions: z.array(z.string().trim().min(1).max(400)).max(8),
  })
  .superRefine((result, context) => {
    const evidenceKeys = result.claims.flatMap((claim) =>
      claim.evidence.map(
        (item) =>
          `${item.rootHash}:${item.documentId}:${item.objectHash}:${item.section}`,
      ),
    );
    if (new Set(evidenceKeys).size !== evidenceKeys.length) {
      context.addIssue({
        code: 'custom',
        path: ['claims'],
        message: 'Research result evidence rows must be unique',
      });
    }
  });

export type WriterResearchResultV1 = z.infer<
  typeof writerResearchResultV1Schema
>;

/** Model-supplied delegate args; host pins root, funding and tool grants separately. */
export const writerResearchDelegateQuestionSchema = z.strictObject({
  question: z.string().trim().min(1).max(1200),
  required: z.boolean(),
});

export const writerResearchDelegateArgsSchema = z.strictObject({
  parentToolCallId: writerToolCallIdSchema,
  questions: z.array(writerResearchDelegateQuestionSchema).min(1).max(2),
});

export type WriterResearchDelegateArgs = z.infer<
  typeof writerResearchDelegateArgsSchema
>;

export const WRITER_RESEARCH_DELEGATE_TOOL_NAME = 'research.delegate' as const;

function normalizeCanonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeCanonicalJson);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, normalizeCanonicalJson(child)]),
    );
  }
  return value;
}

export function hashWriterResearchChildRequest(
  capture: WriterResearchCaptureV1,
): string {
  return createHash('sha256')
    .update(`${JSON.stringify(normalizeCanonicalJson(capture))}\n`, 'utf8')
    .digest('hex');
}

/** Stable child context id for `(missionId, parentToolCallId, childOrdinal)`. */
export function computeWriterResearchChildId(input: {
  missionId: string;
  parentToolCallId: string;
  childOrdinal: number;
}): string {
  return stableNamespacedDocumentId(
    'writer-child',
    input.missionId,
    `${input.parentToolCallId}:${input.childOrdinal}`,
  );
}

function stableNamespacedDocumentId(
  namespace: string,
  ownerId: string,
  path: string,
): string {
  const bytes = createHash('sha256')
    .update(`offscreen:${namespace}:${ownerId}:${path}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function parseWriterResearchChildToolAllowlist(
  tools: unknown,
): WriterResearchChildToolName[] {
  return writerResearchCaptureV1Schema.shape.toolAllowlist.parse(tools);
}

/** Reject recursive delegation and any tool outside the read-only research grant. */
export function assertWriterResearchChildToolsGranted(
  toolName: string,
  grant: readonly WriterResearchChildToolName[],
): void {
  if (toolName === WRITER_RESEARCH_DELEGATE_TOOL_NAME) {
    throw new Error('writer_research_recursive_delegate');
  }
  if (!grant.includes(toolName as WriterResearchChildToolName)) {
    throw new Error('ungranted_writer_research_tool');
  }
}

export function assertWriterResearchCaptureRoot(
  capture: WriterResearchCaptureV1,
  expectedRootHash: string,
  expectedRootRevision: number,
): void {
  if (
    capture.rootHash !== expectedRootHash ||
    capture.rootRevision !== expectedRootRevision
  ) {
    throw new Error('writer_research_root_mismatch');
  }
}

export function assertWriterResearchFundingWithinCap(input: {
  childFunding: WriterResearchFundingV1;
  perChildCapMicrousd: number;
  missionMaxMicrousd: number;
  outstandingChildMicrousd: number;
}): void {
  const { childFunding, perChildCapMicrousd, missionMaxMicrousd, outstandingChildMicrousd } =
    input;
  if (childFunding.maxMicrousd > perChildCapMicrousd) {
    throw new Error('writer_research_child_over_cap');
  }
  if (
    outstandingChildMicrousd + childFunding.maxMicrousd >
    missionMaxMicrousd
  ) {
    throw new Error('writer_research_mission_over_cap');
  }
}

/** Different questions at the same ordinal must not share a request hash. */
export function assertDistinctWriterResearchChildRequests(
  left: WriterResearchCaptureV1,
  right: WriterResearchCaptureV1,
): void {
  if (
    left.missionId !== right.missionId ||
    left.parentToolCallId !== right.parentToolCallId ||
    left.childOrdinal !== right.childOrdinal
  ) {
    return;
  }
  if (left.question === right.question) {
    return;
  }
  const leftHash = hashWriterResearchChildRequest(left);
  const rightHash = hashWriterResearchChildRequest(right);
  if (leftHash === rightHash) {
    throw new Error('writer_research_request_hash_collision');
  }
}