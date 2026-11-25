/**
 * WR03 T06: one writer model round — compile request, prepare wire, custody, tools.
 */
import { randomUUID } from 'node:crypto';
import { and, asc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  storytellerWriterMission,
  storytellerWriterStep,
} from '@offscreen/story-persistence/storyteller';
import type { DocumentStore } from '@offscreen/documents';
import { hashCanonicalJson } from '@offscreen/documents';
import { prepareWriterRoundWire } from '@offscreen/storyteller/providers/openrouter';
import {
  compileWriterRoundCapturedRequest,
  writerRoundDecisionSchema,
  validateWriterRoundDecisionForCapture,
  writerSceneProposalV3Schema,
  type WriterMissionCapture,
  type WriterRoundDecision,
  type WriterToolInvocationResult,
  type WriterToolName,
} from '@offscreen/storyteller/tasks';
import type { Transaction } from '@offscreen/db';
import {
  advanceWriterMissionProviderStep,
  hashWriterMissionSerializedResponse,
  type WriterMissionProviderTransport,
} from './writer-mission-custody';
import { defaultWriterContextId } from './writer-child-custody';
import {
  createWriterLibraryToolExecutor,
  type WriterLibraryToolCall,
  WriterLibraryToolError,
} from './writer-library-tools';
import {
  executeWriterWorkdeskTool,
  type WriterWorkdeskToolCall,
} from './writer-workdesk';
import type { LibraryAccess } from './library-navigation';
import {
  acceptWriterSceneProposal,
  WriterSceneProposalError,
  type WriterSceneProposalAccepted,
} from './writer-scene-proposal';
import {
  applyWriterResearchDelegate,
  WriterResearchDelegateError,
} from './writer-research';
import { WRITER_RESEARCH_DELEGATE_TOOL_NAME } from '@offscreen/storyteller/tasks';

const WRITER_ROUND_GATEWAY_PROVIDER = 'OpenAI';
const WRITER_TOOL_SUMMARY_SCHEMA = 'writer-tool-invocation-summary.v1';
const MAX_SERIALIZED_REQUEST_BYTES = 48 * 1024;

export class WriterLoopError extends Error {
  constructor(
    readonly code:
      | 'step_not_found'
      | 'revision_conflict'
      | 'invalid_step_state'
      | 'malformed_decision'
      | 'ungranted_tool'
      | 'tool_execution_failed'
      | 'tool_call_replay_mismatch',
  ) {
    super(code);
    this.name = 'WriterLoopError';
  }
}

export type WriterLoopRoundResult =
  | {
      status: 'replayed';
      wireSha256: string;
      transportInvoked: false;
    }
  | {
      status: 'delivered';
      wireSha256: string;
      decision: WriterRoundDecision;
      transportInvoked: true;
    }
  | {
      status: 'held';
      reason: string;
      wireSha256: string;
      transportInvoked: boolean;
    }
  | { status: 'uncertain'; transportInvoked: boolean }
  | {
      status: 'proposal-ready';
      proposal: WriterRoundDecision & { kind: 'final' };
      accepted?: WriterSceneProposalAccepted;
      wireSha256: string;
    }
  | {
      status: 'tool-round-complete';
      decision: WriterRoundDecision & { kind: 'tool-calls' };
      wireSha256: string;
      toolSummaries: readonly WriterToolInvocationResult[];
    }
  | {
      status: 'research-delegated';
      parentToolCallId: string;
      childIds: readonly string[];
      joinOperationId: string;
      wireSha256: string;
      replayed: boolean;
    };

type LibraryReader = Parameters<
  typeof createWriterLibraryToolExecutor
>[0]['reader'];

export async function loadModelStep(
  database: Database,
  missionId: string,
  ordinal: number,
  contextId: string,
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
      ordinal: storytellerWriterStep.ordinal,
      toolCallId: storytellerWriterStep.toolCallId,
      resultCasHash: storytellerWriterStep.resultCasHash,
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
    if (record.data === null || typeof record.data !== 'object') {
      throw new Error('invalid_writer_tool_summary');
    }
    if (record.schemaId === WRITER_TOOL_SUMMARY_SCHEMA) {
      summaries.push(record.data as WriterToolInvocationResult);
      continue;
    }
    if (record.schemaId === 'writer-workdesk-tool-result.v1') {
      const data = record.data as {
        toolCallId?: string;
        name?: WriterToolName;
        result?: unknown;
      };
      const toolCallId = row.toolCallId ?? data.toolCallId;
      if (!toolCallId || !data.name) {
        throw new Error('invalid_writer_tool_summary');
      }
      summaries.push({
        version: 'writer-tool-result.v1',
        toolCallId,
        name: data.name,
        resultHash: hashCanonicalJson(data.result),
        summary: `${data.name} completed`,
      });
      continue;
    }
    throw new Error('invalid_writer_tool_summary');
  }
  return summaries;
}

function writerRoundWireInput(
  capture: WriterMissionCapture,
  request: ReturnType<typeof compileWriterRoundCapturedRequest>,
) {
  return {
    model: capture.modelSelection.model,
    provider: WRITER_ROUND_GATEWAY_PROVIDER,
    messages: request.messages,
    outputSchema: request.outputSchema,
    maxGeneratedTokens: capture.budgets.maxGeneratedTokens,
    maxSerializedRequestBytes: MAX_SERIALIZED_REQUEST_BYTES,
    maxInputTokens: capture.budgets.maxInputTokens,
  };
}

export function buildWriterMissionRoundWire(
  capture: WriterMissionCapture,
  priorToolResults: readonly WriterToolInvocationResult[],
) {
  const request = compileWriterRoundCapturedRequest(capture, priorToolResults);
  const wire = prepareWriterRoundWire(writerRoundWireInput(capture, request));
  return { request, wire };
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
    throw new WriterLoopError('revision_conflict');
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
  const ordinal = await nextContextOrdinal(
    tx,
    input.missionId,
    input.contextId,
  );
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
    touchMissionState?: boolean;
  },
): Promise<number> {
  const ordinal = await nextContextOrdinal(
    tx,
    input.missionId,
    input.contextId,
  );
  await tx.insert(storytellerWriterStep).values({
    missionId: input.missionId,
    contextId: input.contextId,
    ordinal,
    requestCasHash: input.requestCasHash,
    revision: 1,
    state: 'model-request-prepared',
  });
  if (input.touchMissionState !== false) {
    await tx
      .update(storytellerWriterMission)
      .set({ state: 'active', updatedAt: sql`clock_timestamp()` })
      .where(eq(storytellerWriterMission.id, input.missionId));
  }
  await bumpMissionNextRevision(tx, input.missionId, ordinal);
  return ordinal;
}

function toolRequestCasHash(
  name: WriterToolName,
  args: Record<string, unknown>,
): string {
  return hashCanonicalJson({ name, args });
}

/** Exported for replay mismatch tests without disposable SQL. */
export function libraryToolRequestReplayMatches(
  storedRequestCasHash: string,
  name: WriterToolName,
  args: Record<string, unknown>,
): boolean {
  return storedRequestCasHash === toolRequestCasHash(name, args);
}

function isUniqueViolation(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    if ('code' in current && current.code === '23505') return true;
    current = 'cause' in current ? current.cause : undefined;
  }
  return false;
}

async function loadExistingToolReceiptStep(
  database: Database,
  missionId: string,
  contextId: string,
  toolCallId: string,
) {
  const [row] = await database.db
    .select({
      requestCasHash: storytellerWriterStep.requestCasHash,
      resultCasHash: storytellerWriterStep.resultCasHash,
      state: storytellerWriterStep.state,
    })
    .from(storytellerWriterStep)
    .where(
      and(
        eq(storytellerWriterStep.missionId, missionId),
        eq(storytellerWriterStep.contextId, contextId),
        eq(storytellerWriterStep.toolCallId, toolCallId),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function readValidatedToolInvocationSummary(
  storage: DocumentStore,
  resultCasHash: string,
  toolCallId: string,
): Promise<WriterToolInvocationResult> {
  const record = await storage.readStructuredDocument(resultCasHash);
  if (record.data === null || typeof record.data !== 'object') {
    throw new Error('invalid_writer_tool_summary');
  }
  if (record.schemaId === WRITER_TOOL_SUMMARY_SCHEMA) {
    const summary = record.data as WriterToolInvocationResult;
    if (summary.toolCallId !== toolCallId) {
      throw new Error('invalid_writer_tool_summary');
    }
    return summary;
  }
  if (record.schemaId === 'writer-workdesk-tool-result.v1') {
    const data = record.data as {
      toolCallId?: string;
      name?: WriterToolName;
      result?: unknown;
    };
    if (!data.name || (data.toolCallId ?? toolCallId) !== toolCallId) {
      throw new Error('invalid_writer_tool_summary');
    }
    return {
      version: 'writer-tool-result.v1',
      toolCallId,
      name: data.name,
      resultHash: hashCanonicalJson(data.result),
      summary: `${data.name} completed`,
    };
  }
  throw new Error('invalid_writer_tool_summary');
}

async function lockParentModelStep(
  tx: Transaction,
  missionId: string,
  contextId: string,
  ordinal: number,
) {
  const [step] = await tx
    .select()
    .from(storytellerWriterStep)
    .where(
      and(
        eq(storytellerWriterStep.missionId, missionId),
        eq(storytellerWriterStep.contextId, contextId),
        eq(storytellerWriterStep.ordinal, ordinal),
        isNull(storytellerWriterStep.toolCallId),
      ),
    )
    .for('update')
    .limit(1);
  return step ?? null;
}

async function findNextPreparedModelStep(
  tx: Transaction,
  missionId: string,
  contextId: string,
  afterOrdinal: number,
) {
  const [step] = await tx
    .select()
    .from(storytellerWriterStep)
    .where(
      and(
        eq(storytellerWriterStep.missionId, missionId),
        eq(storytellerWriterStep.contextId, contextId),
        sql`${storytellerWriterStep.ordinal} > ${afterOrdinal}`,
        isNull(storytellerWriterStep.toolCallId),
      ),
    )
    .orderBy(asc(storytellerWriterStep.ordinal))
    .limit(1);
  return step ?? null;
}

async function commitParentToolRoundCompletion(
  database: Database,
  input: {
    missionId: string;
    contextId: string;
    ordinal: number;
    expectedRevision: number;
    capture: WriterMissionCapture;
    nextRequestCasHash: string;
  },
): Promise<{ replayed: boolean }> {
  const maxModelRounds = input.capture.budgets.maxModelRounds;

  const finishReplayedNext = async (
    tx: Transaction,
    parentOrdinal: number,
  ): Promise<{ replayed: boolean }> => {
    const next = await findNextPreparedModelStep(
      tx,
      input.missionId,
      input.contextId,
      parentOrdinal,
    );
    if (
      !next ||
      next.requestCasHash !== input.nextRequestCasHash ||
      next.state !== 'model-request-prepared'
    ) {
      throw new WriterLoopError('revision_conflict');
    }
    return { replayed: true };
  };

  try {
    return await database.db.transaction(async (tx) => {
      const parent = await lockParentModelStep(
        tx,
        input.missionId,
        input.contextId,
        input.ordinal,
      );
      if (!parent) {
        throw new WriterLoopError('step_not_found');
      }

      if (parent.state === 'tools-applied') {
        return finishReplayedNext(tx, parent.ordinal);
      }

      if (parent.revision !== input.expectedRevision) {
        throw new WriterLoopError('revision_conflict');
      }
      if (parent.state !== 'result-settled') {
        throw new WriterLoopError('invalid_step_state');
      }

      const modelSteps = await tx
        .select({ ordinal: storytellerWriterStep.ordinal })
        .from(storytellerWriterStep)
        .where(
          and(
            eq(storytellerWriterStep.missionId, input.missionId),
            eq(storytellerWriterStep.contextId, input.contextId),
            isNull(storytellerWriterStep.toolCallId),
          ),
        );
      if (modelSteps.length >= maxModelRounds) {
        throw new WriterLoopError('invalid_step_state');
      }

      await casModelStep(tx, {
        missionId: input.missionId,
        contextId: input.contextId,
        ordinal: input.ordinal,
        expectedRevision: input.expectedRevision,
        patch: { state: 'tools-applied' },
      });

      try {
        await insertNextModelStepPrepared(tx, {
          missionId: input.missionId,
          contextId: input.contextId,
          requestCasHash: input.nextRequestCasHash,
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          return finishReplayedNext(tx, input.ordinal);
        }
        throw error;
      }

      return { replayed: false };
    });
  } catch (error) {
    if (
      error instanceof WriterLoopError &&
      error.code === 'revision_conflict'
    ) {
      const parent = await loadModelStep(
        database,
        input.missionId,
        input.ordinal,
        input.contextId,
      );
      if (parent?.state === 'tools-applied') {
        return database.db.transaction(async (tx) =>
          finishReplayedNext(tx, parent.ordinal),
        );
      }
    }
    throw error;
  }
}

function summarizeToolResult(
  call: { id: string; name: WriterToolName },
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

export async function holdModelRound(
  database: Database,
  input: {
    missionId: string;
    contextId: string;
    ordinal: number;
    revision: number;
    reason: string;
    transportInvoked?: boolean;
  },
) {
  await database.db.transaction(async (tx) => {
    await casModelStep(tx, {
      missionId: input.missionId,
      contextId: input.contextId,
      ordinal: input.ordinal,
      expectedRevision: input.revision,
      patch: { state: 'held' },
    });
    await tx
      .update(storytellerWriterMission)
      .set({ state: 'held', updatedAt: sql`clock_timestamp()` })
      .where(eq(storytellerWriterMission.id, input.missionId));
  });
  return {
    status: 'held' as const,
    reason: input.reason,
    transportInvoked: (input.transportInvoked ?? true) as boolean,
  };
}

/**
 * Compile messages from durable tool summaries and persist wire SHA on the model step.
 */
export async function prepareWriterMissionModelStep(
  database: Database,
  storage: DocumentStore,
  input: {
    missionId: string;
    contextId?: string;
    ordinal: number;
    expectedRevision: number;
    capture: WriterMissionCapture;
  },
): Promise<{ wireSha256: string; revision: number }> {
  const contextId = defaultWriterContextId(input.missionId, input.contextId);
  const step = await loadModelStep(
    database,
    input.missionId,
    input.ordinal,
    contextId,
  );
  if (!step) {
    throw new WriterLoopError('step_not_found');
  }
  if (step.revision !== input.expectedRevision) {
    throw new WriterLoopError('revision_conflict');
  }
  const prior = await loadPriorToolSummaries(
    database,
    storage,
    input.missionId,
    contextId,
    input.ordinal,
  );
  const { wire } = buildWriterMissionRoundWire(input.capture, prior);

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

  const allowedStates = new Set(['captured', 'model-request-prepared']);
  if (!allowedStates.has(step.state)) {
    throw new WriterLoopError('invalid_step_state');
  }

  const updated = await database.db.transaction(async (tx) => {
    return casModelStep(tx, {
      missionId: input.missionId,
      contextId,
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

type ApplyToolCallsResult =
  | {
      kind: 'completed';
      summaries: WriterToolInvocationResult[];
    }
  | {
      kind: 'research-delegated';
      parentToolCallId: string;
      childIds: readonly string[];
      joinOperationId: string;
      replayed: boolean;
    };

async function executeIdempotentLibraryTool(
  database: Database,
  storage: DocumentStore,
  input: {
    missionId: string;
    contextId: string;
    call: WriterLibraryToolCall;
    requestCasHash: string;
    library: ReturnType<typeof createWriterLibraryToolExecutor>;
  },
): Promise<WriterToolInvocationResult> {
  const existing = await loadExistingToolReceiptStep(
    database,
    input.missionId,
    input.contextId,
    input.call.id,
  );
  if (existing?.resultCasHash) {
    if (existing.requestCasHash !== input.requestCasHash) {
      throw new WriterLoopError('tool_call_replay_mismatch');
    }
    if (existing.state !== 'tools-applied') {
      throw new WriterLoopError('invalid_step_state');
    }
    return readValidatedToolInvocationSummary(
      storage,
      existing.resultCasHash,
      input.call.id,
    );
  }

  const outcome = await input.library.execute(input.call);
  if (!outcome.ok) {
    if (
      outcome.code === 'tool-not-granted' ||
      outcome.code === 'tool-not-supported'
    ) {
      throw new WriterLoopError('ungranted_tool');
    }
    throw new WriterLoopError('tool_execution_failed');
  }
  const resultHash = hashCanonicalJson(outcome.result);
  const summary = summarizeToolResult(input.call, resultHash);
  const resultCasHash = await persistToolSummary(storage, summary);

  try {
    await database.db.transaction(async (tx) => {
      await recordToolInvocationStep(tx, {
        missionId: input.missionId,
        contextId: input.contextId,
        toolCallId: input.call.id,
        requestCasHash: input.requestCasHash,
        resultCasHash,
      });
    });
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }
    const winner = await loadExistingToolReceiptStep(
      database,
      input.missionId,
      input.contextId,
      input.call.id,
    );
    if (!winner?.resultCasHash) {
      throw new WriterLoopError('revision_conflict');
    }
    if (winner.requestCasHash !== input.requestCasHash) {
      throw new WriterLoopError('tool_call_replay_mismatch');
    }
    if (winner.state !== 'tools-applied') {
      throw new WriterLoopError('invalid_step_state');
    }
    return readValidatedToolInvocationSummary(
      storage,
      winner.resultCasHash,
      input.call.id,
    );
  }

  return summary;
}

async function applyToolCalls(
  database: Database,
  storage: DocumentStore,
  input: {
    missionId: string;
    contextId: string;
    capture: WriterMissionCapture;
    access: LibraryAccess;
    reader: LibraryReader;
    calls: WriterRoundDecision & { kind: 'tool-calls' };
  },
): Promise<ApplyToolCallsResult> {
  const delegateCalls = input.calls.calls.filter(
    (call) => call.name === WRITER_RESEARCH_DELEGATE_TOOL_NAME,
  );
  const otherCalls = input.calls.calls.filter(
    (call) => call.name !== WRITER_RESEARCH_DELEGATE_TOOL_NAME,
  );
  if (delegateCalls.length > 0) {
    if (otherCalls.length > 0 || delegateCalls.length !== 1) {
      throw new WriterLoopError('tool_execution_failed');
    }
    const delegate = delegateCalls[0];
    if (!delegate) {
      throw new WriterLoopError('tool_execution_failed');
    }
    try {
      const delegated = await applyWriterResearchDelegate(database, {
        missionId: input.missionId,
        capture: input.capture,
        call: delegate,
      });
      return {
        kind: 'research-delegated',
        parentToolCallId: delegated.parentToolCallId,
        childIds: delegated.childIds,
        joinOperationId: delegated.joinOperationId,
        replayed: delegated.replayed,
      };
    } catch (error) {
      if (error instanceof WriterResearchDelegateError) {
        if (error.code === 'ungranted_tool') {
          throw new WriterLoopError('ungranted_tool');
        }
        throw new WriterLoopError('tool_execution_failed');
      }
      throw error;
    }
  }

  const library = createWriterLibraryToolExecutor({
    capture: input.capture,
    reader: input.reader,
    authorize: async () => input.access,
  });
  const summaries: WriterToolInvocationResult[] = [];

  for (const call of otherCalls) {
    const requestCasHash = toolRequestCasHash(call.name, call.args);
    const name = call.name;
    const isWorkdesk = name.startsWith('workdesk.');

    let resultHash: string;
    if (isWorkdesk) {
      const outcome = await executeWriterWorkdeskTool(database, storage, {
        missionId: input.missionId,
        capture: input.capture,
        access: input.access,
        call: call as WriterWorkdeskToolCall,
      });
      if (!outcome.ok) {
        throw new WriterLoopError('tool_execution_failed');
      }
      resultHash = hashCanonicalJson(outcome.result);
      summaries.push(summarizeToolResult(call, resultHash));
    } else {
      const summary = await executeIdempotentLibraryTool(database, storage, {
        missionId: input.missionId,
        contextId: input.contextId,
        call: call as WriterLibraryToolCall,
        requestCasHash,
        library,
      });
      summaries.push(summary);
    }
  }
  return { kind: 'completed', summaries };
}

export function parseProviderDecisionBody(
  body: string,
): WriterRoundDecision | null {
  try {
    const parsed = JSON.parse(body) as unknown;
    return writerRoundDecisionSchema.parse(parsed);
  } catch {
    return null;
  }
}

export async function interpretPersistedWriterDecision(
  database: Database,
  input: {
    missionId: string;
    contextId: string;
    ordinal: number;
    capture: WriterMissionCapture;
    access: LibraryAccess;
    reader: LibraryReader;
    storage: DocumentStore;
    body: string;
    resultCasHash: string;
    wireSha256: string;
    transportInvoked: boolean;
  },
): Promise<WriterLoopRoundResult> {
  const step = await loadModelStep(
    database,
    input.missionId,
    input.ordinal,
    input.contextId,
  );
  if (!step) {
    throw new WriterLoopError('step_not_found');
  }
  const stepRevision = step.revision;

  const decision = parseProviderDecisionBody(input.body);
  if (!decision) {
    await holdModelRound(database, {
      missionId: input.missionId,
      contextId: input.contextId,
      ordinal: input.ordinal,
      revision: stepRevision,
      reason: 'malformed_decision',
    });
    return {
      status: 'held',
      reason: 'malformed_decision',
      wireSha256: input.wireSha256,
      transportInvoked: input.transportInvoked,
    };
  }

  try {
    validateWriterRoundDecisionForCapture(input.capture, decision);
  } catch {
    await holdModelRound(database, {
      missionId: input.missionId,
      contextId: input.contextId,
      ordinal: input.ordinal,
      revision: stepRevision,
      reason: 'ungranted_tool',
    });
    return {
      status: 'held',
      reason: 'ungranted_tool',
      wireSha256: input.wireSha256,
      transportInvoked: input.transportInvoked,
    };
  }

  if (decision.kind === 'final') {
    let accepted: WriterSceneProposalAccepted | undefined;
    try {
      if (
        input.capture.version === 'writer-mission.v3' &&
        decision.proposal.version === 3
      ) {
        writerSceneProposalV3Schema.parse(decision.proposal);
      } else {
        accepted = await acceptWriterSceneProposal(database, input.storage, {
          missionId: input.missionId,
          capture: input.capture,
          access: input.access,
          reader: input.reader,
          proposal: decision.proposal,
        });
      }
    } catch (error) {
      const reason =
        error instanceof WriterSceneProposalError
          ? error.code
          : 'invalid_proposal';
      await holdModelRound(database, {
        missionId: input.missionId,
        contextId: input.contextId,
        ordinal: input.ordinal,
        revision: stepRevision,
        reason,
      });
      return {
        status: 'held',
        reason,
        wireSha256: input.wireSha256,
        transportInvoked: input.transportInvoked,
      };
    }
    await database.db.transaction(async (tx) => {
      await casModelStep(tx, {
        missionId: input.missionId,
        contextId: input.contextId,
        ordinal: input.ordinal,
        expectedRevision: stepRevision,
        patch: {
          state: 'proposal-ready',
          resultCasHash: input.resultCasHash,
        },
      });
      await tx
        .update(storytellerWriterMission)
        .set({
          state: 'proposal-ready',
          updatedAt: sql`clock_timestamp()`,
        })
        .where(eq(storytellerWriterMission.id, input.missionId));
    });
    return {
      status: 'proposal-ready',
      proposal: decision,
      ...(accepted === undefined ? {} : { accepted }),
      wireSha256: input.wireSha256,
    };
  }

  try {
    const applied = await applyToolCalls(database, input.storage, {
      missionId: input.missionId,
      contextId: input.contextId,
      capture: input.capture,
      access: input.access,
      reader: input.reader,
      calls: decision,
    });
    const latestStep = await loadModelStep(
      database,
      input.missionId,
      input.ordinal,
      input.contextId,
    );
    if (!latestStep) {
      throw new WriterLoopError('step_not_found');
    }
    if (applied.kind === 'research-delegated') {
      await database.db.transaction(async (tx) => {
        await casModelStep(tx, {
          missionId: input.missionId,
          contextId: input.contextId,
          ordinal: input.ordinal,
          expectedRevision: latestStep.revision,
          patch: { state: 'tools-applied' },
        });
      });
      return {
        status: 'research-delegated',
        parentToolCallId: applied.parentToolCallId,
        childIds: applied.childIds,
        joinOperationId: applied.joinOperationId,
        wireSha256: input.wireSha256,
        replayed: applied.replayed,
      };
    }
    const ordinals = await database.db
      .select({ ordinal: storytellerWriterStep.ordinal })
      .from(storytellerWriterStep)
      .where(
        and(
          eq(storytellerWriterStep.missionId, input.missionId),
          eq(storytellerWriterStep.contextId, input.contextId),
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
      input.contextId,
      maxOrdinal + 1,
    );
    const nextWire = buildWriterMissionRoundWire(
      input.capture,
      priorForNextRound,
    );
    await commitParentToolRoundCompletion(database, {
      missionId: input.missionId,
      contextId: input.contextId,
      ordinal: input.ordinal,
      expectedRevision: latestStep.revision,
      capture: input.capture,
      nextRequestCasHash: nextWire.wire.sha256,
    });
    return {
      status: 'tool-round-complete',
      decision,
      wireSha256: input.wireSha256,
      toolSummaries: applied.summaries,
    };
  } catch (error) {
    const reason =
      error instanceof WriterLoopError
        ? error.code
        : error instanceof WriterLibraryToolError
          ? error.code
          : 'tool_execution_failed';
    const stepNow = await loadModelStep(
      database,
      input.missionId,
      input.ordinal,
      input.contextId,
    );
    if (stepNow) {
      await holdModelRound(database, {
        missionId: input.missionId,
        contextId: input.contextId,
        ordinal: input.ordinal,
        revision: stepNow.revision,
        reason,
      });
    }
    return {
      status: 'held',
      reason,
      wireSha256: input.wireSha256,
      transportInvoked: input.transportInvoked,
    };
  }
}

export type RunWriterMissionModelRoundInput = {
  missionId: string;
  contextId?: string;
  ordinal: number;
  attemptId: string;
  expectedRevision: number;
  capture: WriterMissionCapture;
  access: LibraryAccess;
  reader: LibraryReader;
  storage: DocumentStore;
  /** Serialized model JSON (not the OpenRouter envelope). */
  scriptedDecisionBody: string;
};

/**
 * One writer model round: prepare wire, reserve, scripted transport, apply tools or finalize.
 */
export async function runWriterMissionModelRound(
  database: Database,
  input: RunWriterMissionModelRoundInput,
): Promise<WriterLoopRoundResult> {
  const contextId = defaultWriterContextId(input.missionId, input.contextId);
  const prepared = await prepareWriterMissionModelStep(
    database,
    input.storage,
    {
      missionId: input.missionId,
      contextId,
      ordinal: input.ordinal,
      expectedRevision: input.expectedRevision,
      capture: input.capture,
    },
  );
  const wireSha256 = prepared.wireSha256;
  let stepRevision = prepared.revision;

  const preStep = await loadModelStep(
    database,
    input.missionId,
    input.ordinal,
    contextId,
  );
  if (preStep) {
    if (preStep.state === 'held' || preStep.state === 'failed') {
      return {
        status: 'held',
        reason: preStep.state,
        wireSha256: preStep.requestCasHash,
        transportInvoked: false,
      };
    }
    if (preStep.state === 'uncertain') {
      return { status: 'uncertain', transportInvoked: false as const };
    }
    if (
      preStep.state === 'tools-applied' ||
      preStep.state === 'result-settled' ||
      preStep.state === 'proposal-ready'
    ) {
      return {
        status: 'replayed',
        wireSha256: preStep.requestCasHash,
        transportInvoked: false as const,
      };
    }
  }

  let transportCalls = 0;
  const transport: WriterMissionProviderTransport = async () => {
    transportCalls += 1;
    return {
      kind: 'delivered',
      serializedResponse: input.scriptedDecisionBody,
    };
  };

  const custody = await advanceWriterMissionProviderStep(
    database,
    {
      missionId: input.missionId,
      contextId,
      ordinal: input.ordinal,
      attemptId: input.attemptId,
      expectedRevision: stepRevision,
      requestBytes: MAX_SERIALIZED_REQUEST_BYTES,
    },
    transport,
  );

  if (custody.status === 'replayed') {
    return {
      status: 'replayed',
      wireSha256,
      transportInvoked: false as const,
    };
  }
  if (custody.status === 'held') {
    return {
      status: 'held',
      reason: custody.reason,
      wireSha256,
      transportInvoked: transportCalls > 0,
    };
  }
  if (custody.status === 'uncertain') {
    return { status: 'uncertain', transportInvoked: true };
  }
  if (custody.status !== 'delivered') {
    throw new WriterLoopError('invalid_step_state');
  }

  const expectedResultHash = hashWriterMissionSerializedResponse(
    input.scriptedDecisionBody,
  );
  if (custody.resultCasHash !== expectedResultHash) {
    throw new WriterLoopError('invalid_step_state');
  }

  return interpretPersistedWriterDecision(database, {
    missionId: input.missionId,
    contextId,
    ordinal: input.ordinal,
    capture: input.capture,
    access: input.access,
    reader: input.reader,
    storage: input.storage,
    body: input.scriptedDecisionBody,
    resultCasHash: custody.resultCasHash,
    wireSha256,
    transportInvoked: transportCalls > 0,
  });
}

export type { RunDurableWriterMissionModelRoundInput } from './writer-round-replay';
export { runDurableWriterMissionModelRound } from './writer-round-replay';
