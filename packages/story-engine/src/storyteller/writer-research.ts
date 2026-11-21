/**
 * WR04 T03: child research wire, read-only tool dispatch, and result CAS.
 */
import { randomUUID } from 'node:crypto';
import { and, asc, eq, isNotNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '@offscreen/db';
import { enqueue } from '@offscreen/db/outbox';
import type { Transaction } from '@offscreen/db/outbox';
import {
  storytellerWriterChild,
  storytellerWriterMission,
  storytellerWriterStep,
} from '@offscreen/db/storyteller-schema';
import type { DocumentStore } from '@offscreen/documents';
import { hashCanonicalJson } from '@offscreen/documents';
import { prepareWriterRoundWire } from '@offscreen/storyteller/providers/openrouter';
import type { CapturedProviderRequest } from '@offscreen/storyteller/tasks';
import {
  assertWriterResearchChildToolsGranted,
  assertWriterResearchFundingWithinCap,
  computeWriterResearchChildId,
  hashWriterResearchChildRequest,
  WRITER_RESEARCH_DELEGATE_TOOL_NAME,
  WRITER_RESEARCH_READ_ONLY_TOOL_NAMES,
  writerResearchCaptureV1Schema,
  writerResearchChildToolNameSchema,
  writerResearchDelegateArgsSchema,
  writerResearchResultV1Schema,
  writerToolCallIdSchema,
  type WriterResearchCaptureV1,
  type WriterResearchChildToolName,
  type WriterResearchResultV1,
  type WriterMissionCapture,
  type WriterToolInvocationResult,
} from '@offscreen/storyteller/tasks';
import {
  advanceWriterMissionProviderStep,
  hashWriterMissionSerializedResponse,
  type WriterMissionProviderTransport,
} from './writer-mission-custody';
import {
  defaultWriterContextId,
  markWriterChildState,
  sumOutstandingChildSuballocationForMission,
} from './writer-child-custody';
import { insertWriterResearchChildStepInTransaction } from './writer-mission-store';
import {
  createWriterLibraryToolExecutor,
  type WriterLibraryToolCall,
  WriterLibraryToolError,
} from './writer-library-tools';
import type { LibraryAccess } from './library-navigation';
import {
  hashVerifiedWriterResearchResult,
  verifyWriterResearchResultCitations,
  WriterResearchJoinError,
} from './writer-research-join';

const WRITER_RESEARCH_GATEWAY_PROVIDER = 'OpenAI';
const WRITER_TOOL_SUMMARY_SCHEMA = 'writer-tool-invocation-summary.v1';
export const WRITER_RESEARCH_RESULT_SCHEMA = 'writer-research-result.v1';
const MAX_SERIALIZED_REQUEST_BYTES = 48 * 1024;

const WRITER_RESEARCH_SYSTEM =
  'You are a read-only research agent. Reply with exactly one JSON object: either tool-calls using only your granted library and skills tools, or a final structured research result.';

const FORBIDDEN_WRITER_RESEARCH_TOOLS = new Set<string>([
  'submit_scene',
  WRITER_RESEARCH_DELEGATE_TOOL_NAME,
  'workdesk.stage',
  'workdesk.read',
  'workdesk.diff',
  'workdesk.discard',
]);

export const writerResearchToolCallSchema = z.strictObject({
  id: writerToolCallIdSchema,
  name: writerResearchChildToolNameSchema,
  args: z.record(z.string(), z.unknown()),
});

export const writerResearchRoundDecisionSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('tool-calls'),
      calls: z.array(writerResearchToolCallSchema).min(1).max(8),
    }),
    z.strictObject({
      kind: z.literal('final'),
      result: writerResearchResultV1Schema,
    }),
  ])
  .superRefine((decision, context) => {
    if (decision.kind !== 'tool-calls') return;
    const ids = decision.calls.map((call) => call.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: 'custom',
        path: ['calls'],
        message: 'Tool-call ids must be unique within a research round',
      });
    }
  });

export type WriterResearchRoundDecision = z.infer<
  typeof writerResearchRoundDecisionSchema
>;

type LibraryReader = Parameters<
  typeof createWriterLibraryToolExecutor
>[0]['reader'];

export class WriterResearchLoopError extends Error {
  constructor(
    readonly code:
      | 'step_not_found'
      | 'revision_conflict'
      | 'invalid_step_state'
      | 'malformed_decision'
      | 'forbidden_tool'
      | 'ungranted_tool'
      | 'tool_execution_failed'
      | 'invalid_result'
      | 'child_not_found',
  ) {
    super(code);
    this.name = 'WriterResearchLoopError';
  }
}

export type WriterResearchLoopRoundResult =
  | {
      status: 'replayed';
      wireSha256: string;
      transportInvoked: false;
    }
  | {
      status: 'held';
      reason: string;
      wireSha256: string;
      transportInvoked: boolean;
    }
  | { status: 'uncertain'; transportInvoked: boolean }
  | {
      status: 'tool-round-complete';
      decision: WriterResearchRoundDecision & { kind: 'tool-calls' };
      wireSha256: string;
      toolSummaries: readonly WriterToolInvocationResult[];
    }
  | {
      status: 'research-ready';
      result: WriterResearchResultV1;
      resultCasHash: string;
      verifiedResultHash: string;
      wireSha256: string;
    };

export function buildWriterResearchCaptureFromChildRow(input: {
  missionId: string;
  child: typeof storytellerWriterChild.$inferSelect;
  required: boolean;
}): WriterResearchCaptureV1 {
  return writerResearchCaptureV1Schema.parse({
    version: 'writer-research.v1',
    missionId: input.missionId,
    parentToolCallId: input.child.parentToolCallId,
    childOrdinal: input.child.childOrdinal,
    question: input.child.question,
    rootHash: input.child.rootHash,
    rootRevision: input.child.rootRevision,
    skillObjectHashes: input.child.skillHashes,
    toolAllowlist: parseWriterResearchChildToolAllowlist(input.child.toolAllowlist),
    modelSelection: input.child.policy.modelSelection,
    funding: input.child.policy.funding,
    required: input.required,
  });
}

function parseWriterResearchChildToolAllowlist(
  tools: string[],
): WriterResearchChildToolName[] {
  const parsed: WriterResearchChildToolName[] = [];
  for (const name of tools) {
    parsed.push(writerResearchChildToolNameSchema.parse(name));
  }
  return parsed;
}

export function buildWriterResearchLibraryCapture(input: {
  storyId: string;
  capture: WriterResearchCaptureV1;
}): Pick<
  WriterMissionCapture,
  | 'storyId'
  | 'libraryRootHash'
  | 'libraryRootRevision'
  | 'toolsAllowlist'
  | 'skillObjectHashes'
> {
  return {
    storyId: input.storyId,
    libraryRootHash: input.capture.rootHash,
    libraryRootRevision: input.capture.rootRevision,
    toolsAllowlist: [...input.capture.toolAllowlist],
    skillObjectHashes: [...input.capture.skillObjectHashes],
  };
}

export function compileWriterResearchRoundCapturedRequest(
  capture: WriterResearchCaptureV1,
  priorToolResults: readonly WriterToolInvocationResult[],
): CapturedProviderRequest {
  return {
    messages: [
      { role: 'system', content: WRITER_RESEARCH_SYSTEM },
      {
        role: 'user',
        content: JSON.stringify({
          version: 'writer-research.v1',
          question: capture.question,
          pins: {
            rootHash: capture.rootHash,
            rootRevision: capture.rootRevision,
            skillObjectHashes: capture.skillObjectHashes,
            toolAllowlist: capture.toolAllowlist,
          },
          priorToolResults,
        }),
      },
    ],
    outputSchema: z.toJSONSchema(
      writerResearchRoundDecisionSchema,
    ) as CapturedProviderRequest['outputSchema'],
  };
}

function writerResearchRoundWireInput(
  capture: WriterResearchCaptureV1,
  request: CapturedProviderRequest,
) {
  return {
    model: capture.modelSelection.model,
    provider: WRITER_RESEARCH_GATEWAY_PROVIDER,
    messages: request.messages,
    outputSchema: request.outputSchema,
    maxGeneratedTokens: capture.funding.maxGeneratedTokens,
    maxSerializedRequestBytes: MAX_SERIALIZED_REQUEST_BYTES,
    maxInputTokens: capture.funding.maxInputTokens,
  };
}

export function buildWriterResearchRoundWire(
  capture: WriterResearchCaptureV1,
  priorToolResults: readonly WriterToolInvocationResult[],
) {
  const request = compileWriterResearchRoundCapturedRequest(
    capture,
    priorToolResults,
  );
  const wire = prepareWriterRoundWire(writerResearchRoundWireInput(capture, request));
  return { request, wire };
}

/** Reject forged or parent-only tools before any library/workdesk execution. */
function validateRawResearchToolCalls(
  raw: unknown,
  grant: readonly WriterResearchChildToolName[],
): void {
  if (raw === null || typeof raw !== 'object') return;
  const decision = raw as { kind?: string; calls?: { name?: string }[] };
  if (decision.kind !== 'tool-calls' || !Array.isArray(decision.calls)) return;
  for (const call of decision.calls) {
    if (typeof call?.name === 'string') {
      assertWriterResearchToolCallAllowed(call.name, grant);
    }
  }
}

export function assertWriterResearchToolCallAllowed(
  toolName: string,
  grant: readonly WriterResearchChildToolName[],
): void {
  if (FORBIDDEN_WRITER_RESEARCH_TOOLS.has(toolName) || toolName.startsWith('workdesk.')) {
    throw new WriterResearchLoopError('forbidden_tool');
  }
  if (
    !(WRITER_RESEARCH_READ_ONLY_TOOL_NAMES as readonly string[]).includes(toolName)
  ) {
    throw new WriterResearchLoopError('forbidden_tool');
  }
  try {
    assertWriterResearchChildToolsGranted(toolName, grant);
  } catch {
    throw new WriterResearchLoopError('ungranted_tool');
  }
}

async function loadModelStep(
  database: Database,
  missionId: string,
  contextId: string,
  ordinal: number,
) {
  const [step] = await database.db
    .select()
    .from(storytellerWriterStep)
    .where(
      and(
        eq(storytellerWriterStep.missionId, missionId),
        eq(storytellerWriterStep.contextId, contextId),
        eq(storytellerWriterStep.ordinal, ordinal),
        sql`${storytellerWriterStep.toolCallId} IS NULL`,
      ),
    )
    .limit(1);
  return step ?? null;
}

async function loadPriorToolSummaries(
  database: Database,
  storage: DocumentStore,
  missionId: string,
  contextId: string,
  beforeOrdinal: number,
): Promise<WriterToolInvocationResult[]> {
  const rows = await database.db
    .select({
      resultCasHash: storytellerWriterStep.resultCasHash,
      toolCallId: storytellerWriterStep.toolCallId,
    })
    .from(storytellerWriterStep)
    .where(
      and(
        eq(storytellerWriterStep.missionId, missionId),
        eq(storytellerWriterStep.contextId, contextId),
        sql`${storytellerWriterStep.ordinal} < ${beforeOrdinal}`,
        isNotNull(storytellerWriterStep.toolCallId),
        isNotNull(storytellerWriterStep.resultCasHash),
      ),
    )
    .orderBy(asc(storytellerWriterStep.ordinal));

  const summaries: WriterToolInvocationResult[] = [];
  for (const row of rows) {
    if (!row.resultCasHash || !row.toolCallId) continue;
    const record = await storage.readStructuredDocument(row.resultCasHash);
    if (record.schemaId === WRITER_TOOL_SUMMARY_SCHEMA && record.data) {
      summaries.push(record.data as WriterToolInvocationResult);
    }
  }
  return summaries;
}

async function casModelStep(
  tx: Transaction,
  input: {
    missionId: string;
    contextId: string;
    ordinal: number;
    expectedRevision: number;
    patch: Partial<typeof storytellerWriterStep.$inferInsert>;
  },
) {
  const nextRevision = input.expectedRevision + 1;
  const [updated] = await tx
    .update(storytellerWriterStep)
    .set({
      ...input.patch,
      revision: nextRevision,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(
      and(
        eq(storytellerWriterStep.missionId, input.missionId),
        eq(storytellerWriterStep.contextId, input.contextId),
        eq(storytellerWriterStep.ordinal, input.ordinal),
        eq(storytellerWriterStep.revision, input.expectedRevision),
        sql`${storytellerWriterStep.toolCallId} IS NULL`,
      ),
    )
    .returning();
  if (!updated) {
    throw new WriterResearchLoopError('revision_conflict');
  }
  return updated;
}

async function nextContextOrdinal(
  tx: Transaction,
  missionId: string,
  contextId: string,
): Promise<number> {
  const ordinals = await tx
    .select({ ordinal: storytellerWriterStep.ordinal })
    .from(storytellerWriterStep)
    .where(
      and(
        eq(storytellerWriterStep.missionId, missionId),
        eq(storytellerWriterStep.contextId, contextId),
      ),
    );
  return ordinals.reduce((max, row) => Math.max(max, row.ordinal), 0) + 1;
}

async function bumpMissionNextRevision(
  tx: Transaction,
  missionId: string,
  insertedOrdinal: number,
) {
  const ordinals = await tx
    .select({ ordinal: storytellerWriterStep.ordinal })
    .from(storytellerWriterStep)
    .where(eq(storytellerWriterStep.missionId, missionId));
  const globalMax = ordinals.reduce(
    (max, row) => Math.max(max, row.ordinal),
    insertedOrdinal,
  );
  await tx
    .update(storytellerWriterMission)
    .set({
      nextRevision: sql`GREATEST(${storytellerWriterMission.nextRevision}, ${globalMax + 1})`,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(eq(storytellerWriterMission.id, missionId));
}

async function persistToolSummary(
  storage: DocumentStore,
  summary: WriterToolInvocationResult,
): Promise<string> {
  return storage.putStructuredDocument({
    format: 'offscreen.structured-document.v1',
    envelope: {
      documentId: randomUUID(),
      schemaVersion: 1,
      revision: 1,
      kind: 'lore',
      authority: 'noncanonical',
      visibility: 'storyteller-private',
      sources: [],
    },
    schemaId: WRITER_TOOL_SUMMARY_SCHEMA,
    data: JSON.parse(JSON.stringify(summary)),
  });
}

export async function persistWriterResearchResultCas(
  storage: DocumentStore,
  result: WriterResearchResultV1,
): Promise<string> {
  return storage.putStructuredDocument({
    format: 'offscreen.structured-document.v1',
    envelope: {
      documentId: randomUUID(),
      schemaVersion: 1,
      revision: 1,
      kind: 'lore',
      authority: 'noncanonical',
      visibility: 'storyteller-private',
      sources: [],
    },
    schemaId: WRITER_RESEARCH_RESULT_SCHEMA,
    data: JSON.parse(JSON.stringify(result)),
  });
}

async function recordToolInvocationStep(
  tx: Transaction,
  input: {
    missionId: string;
    contextId: string;
    toolCallId: string;
    requestCasHash: string;
    resultCasHash: string;
  },
): Promise<number> {
  const ordinal = await nextContextOrdinal(tx, input.missionId, input.contextId);
  await tx.insert(storytellerWriterStep).values({
    missionId: input.missionId,
    contextId: input.contextId,
    ordinal,
    toolCallId: input.toolCallId,
    requestCasHash: input.requestCasHash,
    resultCasHash: input.resultCasHash,
    revision: 1,
    state: 'tools-applied',
  });
  await bumpMissionNextRevision(tx, input.missionId, ordinal);
  return ordinal;
}

async function insertNextModelStepPrepared(
  tx: Transaction,
  input: {
    missionId: string;
    contextId: string;
    requestCasHash: string;
  },
): Promise<number> {
  const ordinal = await nextContextOrdinal(tx, input.missionId, input.contextId);
  await tx.insert(storytellerWriterStep).values({
    missionId: input.missionId,
    contextId: input.contextId,
    ordinal,
    requestCasHash: input.requestCasHash,
    revision: 1,
    state: 'model-request-prepared',
  });
  await bumpMissionNextRevision(tx, input.missionId, ordinal);
  return ordinal;
}

function toolRequestCasHash(
  name: WriterResearchChildToolName,
  args: Record<string, unknown>,
): string {
  return hashCanonicalJson({ name, args });
}

function summarizeToolResult(
  call: { id: string; name: WriterResearchChildToolName },
  resultHash: string,
): WriterToolInvocationResult {
  return {
    version: 'writer-tool-result.v1',
    toolCallId: call.id,
    name: call.name,
    resultHash,
    summary: `${call.name} completed`,
  };
}

export async function applyWriterResearchToolCalls(
  database: Database,
  storage: DocumentStore,
  input: {
    missionId: string;
    contextId: string;
    storyId: string;
    capture: WriterResearchCaptureV1;
    access: LibraryAccess;
    reader: LibraryReader;
    calls: WriterResearchRoundDecision & { kind: 'tool-calls' };
  },
): Promise<WriterToolInvocationResult[]> {
  const libraryCapture = buildWriterResearchLibraryCapture({
    storyId: input.storyId,
    capture: input.capture,
  }) as WriterMissionCapture;

  const library = createWriterLibraryToolExecutor({
    capture: libraryCapture,
    reader: input.reader,
    authorize: async () => input.access,
  });
  const summaries: WriterToolInvocationResult[] = [];

  for (const call of input.calls.calls) {
    assertWriterResearchToolCallAllowed(call.name, input.capture.toolAllowlist);
    const requestCasHash = toolRequestCasHash(call.name, call.args);
    const outcome = await library.execute(call as WriterLibraryToolCall);
    if (!outcome.ok) {
      if (
        outcome.code === 'tool-not-granted' ||
        outcome.code === 'tool-not-supported'
      ) {
        throw new WriterResearchLoopError('ungranted_tool');
      }
      throw new WriterResearchLoopError('tool_execution_failed');
    }
    const resultHash = hashCanonicalJson(outcome.result);
    const summary = summarizeToolResult(call, resultHash);
    const resultCasHash = await persistToolSummary(storage, summary);
    await database.db.transaction(async (tx) => {
      await recordToolInvocationStep(tx, {
        missionId: input.missionId,
        contextId: input.contextId,
        toolCallId: call.id,
        requestCasHash,
        resultCasHash,
      });
    });
    summaries.push(summary);
  }
  return summaries;
}

export async function prepareWriterResearchModelStep(
  database: Database,
  storage: DocumentStore,
  input: {
    missionId: string;
    contextId: string;
    ordinal: number;
    expectedRevision: number;
    capture: WriterResearchCaptureV1;
  },
): Promise<{ wireSha256: string; revision: number }> {
  const prior = await loadPriorToolSummaries(
    database,
    storage,
    input.missionId,
    input.contextId,
    input.ordinal,
  );
  const { wire } = buildWriterResearchRoundWire(input.capture, prior);
  const step = await loadModelStep(
    database,
    input.missionId,
    input.contextId,
    input.ordinal,
  );
  if (!step) {
    throw new WriterResearchLoopError('step_not_found');
  }
  if (step.revision !== input.expectedRevision) {
    throw new WriterResearchLoopError('revision_conflict');
  }
  if (
    step.state === 'model-request-prepared' &&
    step.requestCasHash === wire.sha256
  ) {
    return { wireSha256: wire.sha256, revision: step.revision };
  }
  const settledStates = new Set([
    'result-settled',
    'tools-applied',
    'proposal-ready',
    'held',
    'failed',
    'uncertain',
  ]);
  if (settledStates.has(step.state)) {
    return { wireSha256: step.requestCasHash, revision: step.revision };
  }
  const updated = await database.db.transaction(async (tx) => {
    return casModelStep(tx, {
      missionId: input.missionId,
      contextId: input.contextId,
      ordinal: input.ordinal,
      expectedRevision: input.expectedRevision,
      patch: {
        state: 'model-request-prepared',
        requestCasHash: wire.sha256,
      },
    });
  });
  return { wireSha256: wire.sha256, revision: updated.revision };
}

export type RunWriterResearchModelRoundInput = {
  missionId: string;
  contextId: string;
  childId: string;
  ordinal: number;
  attemptId: string;
  expectedRevision: number;
  storyId: string;
  capture: WriterResearchCaptureV1;
  required: boolean;
  access?: LibraryAccess;
  reader: LibraryReader;
  storage: DocumentStore;
  scriptedDecisionBody: string;
};

export async function runWriterResearchModelRound(
  database: Database,
  input: RunWriterResearchModelRoundInput,
): Promise<WriterResearchLoopRoundResult> {
  const contextId = defaultWriterContextId(input.missionId, input.contextId);
  const access = input.access ?? { privateDocuments: false };
  const prepared = await prepareWriterResearchModelStep(database, input.storage, {
    missionId: input.missionId,
    contextId,
    ordinal: input.ordinal,
    expectedRevision: input.expectedRevision,
    capture: input.capture,
  });
  const wireSha256 = prepared.wireSha256;
  let stepRevision = prepared.revision;

  const preStep = await loadModelStep(
    database,
    input.missionId,
    contextId,
    input.ordinal,
  );
  if (preStep?.state === 'held' || preStep?.state === 'failed') {
    return {
      status: 'held',
      reason: preStep.state,
      wireSha256: preStep.requestCasHash,
      transportInvoked: false,
    };
  }
  if (preStep?.state === 'uncertain') {
    return { status: 'uncertain', transportInvoked: false };
  }
  if (preStep?.state === 'result-settled' && preStep.resultCasHash) {
    const record = await input.storage.readStructuredDocument(preStep.resultCasHash);
    if (record.schemaId === WRITER_RESEARCH_RESULT_SCHEMA && record.data) {
      const result = writerResearchResultV1Schema.parse(record.data);
      return {
        status: 'research-ready',
        result,
        resultCasHash: preStep.resultCasHash,
        verifiedResultHash: hashVerifiedWriterResearchResult(result),
        wireSha256: preStep.requestCasHash,
      };
    }
  }

  try {
    const raw = JSON.parse(input.scriptedDecisionBody) as unknown;
    validateRawResearchToolCalls(raw, input.capture.toolAllowlist);
  } catch (error) {
    if (error instanceof WriterResearchLoopError) {
      await database.db.transaction(async (tx) => {
        await casModelStep(tx, {
          missionId: input.missionId,
          contextId,
          ordinal: input.ordinal,
          expectedRevision: stepRevision,
          patch: { state: 'held' },
        });
        await markWriterChildState(tx, input.childId, 'held');
      });
      return {
        status: 'held',
        reason: error.code,
        wireSha256,
        transportInvoked: false,
      };
    }
    throw error;
  }

  const transport: WriterMissionProviderTransport = async () => ({
    kind: 'delivered',
    serializedResponse: input.scriptedDecisionBody,
  });

  const custody = await advanceWriterMissionProviderStep(
    database,
    {
      missionId: input.missionId,
      contextId: input.childId,
      ordinal: input.ordinal,
      attemptId: input.attemptId,
      expectedRevision: stepRevision,
      requestBytes: MAX_SERIALIZED_REQUEST_BYTES,
      expectedWireSha256: wireSha256,
    },
    transport,
  );

  if (custody.status === 'replayed') {
    return { status: 'replayed', wireSha256, transportInvoked: false };
  }
  if (custody.status === 'held') {
    return {
      status: 'held',
      reason: custody.reason,
      wireSha256,
      transportInvoked: true,
    };
  }
  if (custody.status === 'uncertain') {
    return { status: 'uncertain', transportInvoked: true };
  }
  if (custody.status !== 'delivered') {
    throw new WriterResearchLoopError('invalid_step_state');
  }

  const expectedResultHash = hashWriterMissionSerializedResponse(
    input.scriptedDecisionBody,
  );
  if (custody.resultCasHash !== expectedResultHash) {
    throw new WriterResearchLoopError('invalid_step_state');
  }

  const stepAfterCustody = await loadModelStep(
    database,
    input.missionId,
    contextId,
    input.ordinal,
  );
  if (stepAfterCustody) {
    stepRevision = stepAfterCustody.revision;
  }

  let decision: WriterResearchRoundDecision | null = null;
  const parsedBody = JSON.parse(input.scriptedDecisionBody) as unknown;
  try {
    decision = writerResearchRoundDecisionSchema.parse(parsedBody);
  } catch {
    try {
      validateRawResearchToolCalls(parsedBody, input.capture.toolAllowlist);
    } catch (error) {
      if (error instanceof WriterResearchLoopError) {
        await database.db.transaction(async (tx) => {
          await casModelStep(tx, {
            missionId: input.missionId,
            contextId,
            ordinal: input.ordinal,
            expectedRevision: stepRevision,
            patch: { state: 'held' },
          });
          await markWriterChildState(tx, input.childId, 'held');
        });
        return {
          status: 'held',
          reason: error.code,
          wireSha256,
          transportInvoked: true,
        };
      }
    }
    await database.db.transaction(async (tx) => {
      await casModelStep(tx, {
        missionId: input.missionId,
        contextId,
        ordinal: input.ordinal,
        expectedRevision: stepRevision,
        patch: { state: 'held' },
      });
      await markWriterChildState(tx, input.childId, 'held');
    });
    return {
      status: 'held',
      reason: 'malformed_decision',
      wireSha256,
      transportInvoked: true,
    };
  }

  if (decision.kind === 'final') {
    let verified: WriterResearchResultV1;
    try {
      verified = await verifyWriterResearchResultCitations({
        storyId: input.storyId,
        capture: input.capture,
        access,
        reader: input.reader,
        result: decision.result,
      });
    } catch (error) {
      const reason =
        error instanceof WriterResearchJoinError
          ? error.code
          : error instanceof WriterResearchLoopError
            ? error.code
            : 'invalid_result';
      await database.db.transaction(async (tx) => {
        await casModelStep(tx, {
          missionId: input.missionId,
          contextId,
          ordinal: input.ordinal,
          expectedRevision: stepRevision,
          patch: { state: 'held' },
        });
        await markWriterChildState(tx, input.childId, 'held');
      });
      return { status: 'held', reason, wireSha256, transportInvoked: true };
    }

    const resultCasHash = await persistWriterResearchResultCas(
      input.storage,
      verified,
    );
    const verifiedResultHash = hashVerifiedWriterResearchResult(verified);
    await database.db.transaction(async (tx) => {
      await casModelStep(tx, {
        missionId: input.missionId,
        contextId,
        ordinal: input.ordinal,
        expectedRevision: stepRevision,
        patch: {
          state: 'result-settled',
          resultCasHash,
        },
      });
      await tx
        .update(storytellerWriterChild)
        .set({
          resultCasHash,
          state: 'ready',
          updatedAt: sql`clock_timestamp()`,
        })
        .where(eq(storytellerWriterChild.childId, input.childId));
    });
    return {
      status: 'research-ready',
      result: verified,
      resultCasHash,
      verifiedResultHash,
      wireSha256,
    };
  }

  try {
    const toolSummaries = await applyWriterResearchToolCalls(database, input.storage, {
      missionId: input.missionId,
      contextId,
      storyId: input.storyId,
      capture: input.capture,
      access,
      reader: input.reader,
      calls: decision,
    });
    const latestStep = await loadModelStep(
      database,
      input.missionId,
      contextId,
      input.ordinal,
    );
    if (!latestStep) {
      throw new WriterResearchLoopError('step_not_found');
    }
    const ordinals = await database.db
      .select({ ordinal: storytellerWriterStep.ordinal })
      .from(storytellerWriterStep)
      .where(
        and(
          eq(storytellerWriterStep.missionId, input.missionId),
          eq(storytellerWriterStep.contextId, contextId),
        ),
      );
    const maxOrdinal = ordinals.reduce(
      (max, row) => Math.max(max, row.ordinal),
      0,
    );
    const priorForNextRound = await loadPriorToolSummaries(
      database,
      input.storage,
      input.missionId,
      contextId,
      maxOrdinal + 1,
    );
    const nextWire = buildWriterResearchRoundWire(input.capture, priorForNextRound);
    await database.db.transaction(async (tx) => {
      await casModelStep(tx, {
        missionId: input.missionId,
        contextId,
        ordinal: input.ordinal,
        expectedRevision: latestStep.revision,
        patch: { state: 'tools-applied' },
      });
      await insertNextModelStepPrepared(tx, {
        missionId: input.missionId,
        contextId,
        requestCasHash: nextWire.wire.sha256,
      });
      await markWriterChildState(tx, input.childId, 'running');
    });
    return {
      status: 'tool-round-complete',
      decision,
      wireSha256,
      toolSummaries,
    };
  } catch (error) {
    const reason =
      error instanceof WriterResearchLoopError
        ? error.code
        : error instanceof WriterLibraryToolError
          ? error.code
          : 'tool_execution_failed';
    const stepNow = await loadModelStep(
      database,
      input.missionId,
      contextId,
      input.ordinal,
    );
    if (stepNow) {
      await database.db.transaction(async (tx) => {
        await casModelStep(tx, {
          missionId: input.missionId,
          contextId,
          ordinal: input.ordinal,
          expectedRevision: stepNow.revision,
          patch: { state: 'held' },
        });
        await markWriterChildState(tx, input.childId, 'held');
      });
    }
    return {
      status: 'held',
      reason,
      wireSha256,
      transportInvoked: true,
    };
  }
}

export const WRITER_RESEARCH_WAKE_TOPIC = 'writer.research.v1';

/** Stable parent-join notice identity; distinct from child ids (ordinal >= 1). */
export function writerResearchJoinOperationId(
  missionId: string,
  parentToolCallId: string,
): string {
  return computeWriterResearchChildId({
    missionId,
    parentToolCallId,
    childOrdinal: 0,
  });
}

export type WriterMissionResearchPolicy = Readonly<{
  maxConcurrentChildren: 1 | 2;
  maxMicrousdPerChild: number;
  childToolAllowlist: WriterResearchChildToolName[];
  childMaxModelRounds: number;
  childMaxInputTokens: number;
  childMaxGeneratedTokens: number;
}>;

export class WriterResearchDelegateError extends Error {
  constructor(
    readonly code:
      | 'ungranted_tool'
      | 'delegate_args_invalid'
      | 'delegate_id_mismatch'
      | 'mission_over_cap'
      | 'child_over_cap'
      | 'too_many_children'
      | 'duplicate_request_conflict'
      | 'mission_not_found',
  ) {
    super(code);
    this.name = 'WriterResearchDelegateError';
  }
}

export type ApplyWriterResearchDelegateResult =
  | {
      status: 'delegated';
      parentToolCallId: string;
      childIds: readonly string[];
      joinOperationId: string;
      replayed: false;
    }
  | {
      status: 'delegated';
      parentToolCallId: string;
      childIds: readonly string[];
      joinOperationId: string;
      replayed: true;
    };

/** Host policy from captured parent mission; never model-supplied roots or budgets. */
export function resolveWriterMissionResearchPolicy(
  capture: WriterMissionCapture,
): WriterMissionResearchPolicy {
  if (!capture.toolsAllowlist.includes(WRITER_RESEARCH_DELEGATE_TOOL_NAME)) {
    throw new WriterResearchDelegateError('ungranted_tool');
  }
  const missionMax = Number(capture.budgets.maxMicrousd);
  const perChild = Math.min(
    80_000,
    Math.max(10_000, Math.floor(missionMax / 4)),
  );
  return {
    maxConcurrentChildren: 2,
    maxMicrousdPerChild: perChild,
    childToolAllowlist: [...WRITER_RESEARCH_READ_ONLY_TOOL_NAMES],
    childMaxModelRounds: 2,
    childMaxInputTokens: Math.min(4096, capture.budgets.maxInputTokens),
    childMaxGeneratedTokens: Math.min(1024, capture.budgets.maxGeneratedTokens),
  };
}

function hashDelegateToolRequest(
  toolCallId: string,
  args: Record<string, unknown>,
): string {
  return hashCanonicalJson({
    name: WRITER_RESEARCH_DELEGATE_TOOL_NAME,
    toolCallId,
    args,
  });
}

async function loadParentDelegateToolStep(
  tx: Transaction,
  missionId: string,
  toolCallId: string,
) {
  const [row] = await tx
    .select()
    .from(storytellerWriterStep)
    .where(
      and(
        eq(storytellerWriterStep.missionId, missionId),
        eq(storytellerWriterStep.contextId, missionId),
        eq(storytellerWriterStep.toolCallId, toolCallId),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function nextParentToolOrdinal(
  tx: Transaction,
  missionId: string,
): Promise<number> {
  const ordinals = await tx
    .select({ ordinal: storytellerWriterStep.ordinal })
    .from(storytellerWriterStep)
    .where(
      and(
        eq(storytellerWriterStep.missionId, missionId),
        eq(storytellerWriterStep.contextId, missionId),
      ),
    );
  return ordinals.reduce((max, row) => Math.max(max, row.ordinal), 0) + 1;
}

export async function applyWriterResearchDelegateInTransaction(
  tx: Transaction,
  input: {
    missionId: string;
    capture: WriterMissionCapture;
    call: { id: string; args: Record<string, unknown> };
    policy?: WriterMissionResearchPolicy;
  },
): Promise<ApplyWriterResearchDelegateResult> {
  const policy = input.policy ?? resolveWriterMissionResearchPolicy(input.capture);
  const args = writerResearchDelegateArgsSchema.parse(input.call.args);
  if (args.parentToolCallId !== input.call.id) {
    throw new WriterResearchDelegateError('delegate_id_mismatch');
  }
  if (args.questions.length > policy.maxConcurrentChildren) {
    throw new WriterResearchDelegateError('too_many_children');
  }

  const requestHash = hashDelegateToolRequest(input.call.id, input.call.args);
  const existing = await loadParentDelegateToolStep(
    tx,
    input.missionId,
    input.call.id,
  );
  if (existing) {
    if (existing.requestCasHash !== requestHash) {
      throw new WriterResearchDelegateError('duplicate_request_conflict');
    }
    const childRows = await tx
      .select({ childId: storytellerWriterChild.childId })
      .from(storytellerWriterChild)
      .where(
        and(
          eq(storytellerWriterChild.missionId, input.missionId),
          eq(storytellerWriterChild.parentToolCallId, input.call.id),
        ),
      )
      .orderBy(asc(storytellerWriterChild.childOrdinal));
    return {
      status: 'delegated',
      parentToolCallId: input.call.id,
      childIds: childRows.map((row) => row.childId),
      joinOperationId: writerResearchJoinOperationId(
        input.missionId,
        input.call.id,
      ),
      replayed: true,
    };
  }

  const [mission] = await tx
    .select()
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.id, input.missionId))
    .limit(1);
  if (!mission) {
    throw new WriterResearchDelegateError('mission_not_found');
  }
  const missionMax = Number(
    (mission.budgetSnapshot as { maxMicrousd: string }).maxMicrousd,
  );
  const outstanding = await sumOutstandingChildSuballocationForMission(
    tx,
    input.missionId,
  );

  const childIds: string[] = [];
  let childOrdinal = 0;
  let outstandingRunning = Number(outstanding);
  for (const question of args.questions) {
    childOrdinal += 1;
    const childId = computeWriterResearchChildId({
      missionId: input.missionId,
      parentToolCallId: input.call.id,
      childOrdinal,
    });
    const childCapture: WriterResearchCaptureV1 =
      writerResearchCaptureV1Schema.parse({
        version: 'writer-research.v1',
        missionId: input.missionId,
        parentToolCallId: input.call.id,
        childOrdinal,
        question: question.question,
        rootHash: input.capture.libraryRootHash,
        rootRevision: input.capture.libraryRootRevision,
        skillObjectHashes: [...input.capture.skillObjectHashes],
        toolAllowlist: [...policy.childToolAllowlist],
        modelSelection: input.capture.modelSelection,
        funding: {
          maxModelRounds: policy.childMaxModelRounds,
          maxInputTokens: policy.childMaxInputTokens,
          maxGeneratedTokens: policy.childMaxGeneratedTokens,
          maxMicrousd: policy.maxMicrousdPerChild,
        },
        required: question.required,
      });
    const childRequestHash = hashWriterResearchChildRequest(childCapture);
    try {
      assertWriterResearchFundingWithinCap({
        childFunding: childCapture.funding,
        perChildCapMicrousd: policy.maxMicrousdPerChild,
        missionMaxMicrousd: missionMax,
        outstandingChildMicrousd: outstandingRunning,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'writer_research_mission_over_cap') {
        throw new WriterResearchDelegateError('mission_over_cap');
      }
      if (error instanceof Error && error.message === 'writer_research_child_over_cap') {
        throw new WriterResearchDelegateError('child_over_cap');
      }
      throw error;
    }

    const childWire = buildWriterResearchRoundWire(childCapture, []);
    await insertWriterResearchChildStepInTransaction(
      tx,
      input.missionId,
      {
        childId,
        parentToolCallId: input.call.id,
        childOrdinal,
        question: question.question,
        requestSha256: childRequestHash,
        rootHash: input.capture.libraryRootHash,
        rootRevision: input.capture.libraryRootRevision,
        toolAllowlist: [...policy.childToolAllowlist],
        skillHashes: [...input.capture.skillObjectHashes],
        policy: {
          modelSelection: childCapture.modelSelection,
          funding: childCapture.funding,
          required: question.required,
        } as typeof storytellerWriterChild.$inferInsert.policy,
        maxMicrousd: policy.maxMicrousdPerChild,
        state: 'pending',
      },
      {
        ordinal: 1,
        requestCasHash: childWire.wire.sha256,
        revision: 1,
        state: 'model-request-prepared',
      },
    );
    await enqueue(tx, {
      id: childId,
      topic: WRITER_RESEARCH_WAKE_TOPIC,
      operationId: childId,
    });
    childIds.push(childId);
    outstandingRunning += policy.maxMicrousdPerChild;
  }

  const toolOrdinal = await nextParentToolOrdinal(tx, input.missionId);
  await tx.insert(storytellerWriterStep).values({
    missionId: input.missionId,
    contextId: input.missionId,
    ordinal: toolOrdinal,
    toolCallId: input.call.id,
    requestCasHash: requestHash,
    resultCasHash: null,
    revision: 1,
    state: 'captured',
  });
  await bumpMissionNextRevision(tx, input.missionId, toolOrdinal);

  return {
    status: 'delegated',
    parentToolCallId: input.call.id,
    childIds,
    joinOperationId: writerResearchJoinOperationId(
      input.missionId,
      input.call.id,
    ),
    replayed: false,
  };
}

export async function applyWriterResearchDelegate(
  database: Database,
  input: {
    missionId: string;
    capture: WriterMissionCapture;
    call: { id: string; args: Record<string, unknown> };
    policy?: WriterMissionResearchPolicy;
  },
): Promise<ApplyWriterResearchDelegateResult> {
  return database.db.transaction(async (tx) =>
    applyWriterResearchDelegateInTransaction(tx, input),
  );
}