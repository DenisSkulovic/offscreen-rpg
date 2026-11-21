/**
 * WR03 T06: one writer model round — compile request, prepare wire, custody, tools.
 */
import { randomUUID } from 'node:crypto';
import { and, asc, eq, isNotNull, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  storytellerWriterMission,
  storytellerWriterStep,
} from '@offscreen/db/storyteller-schema';
import type { DocumentStore } from '@offscreen/documents';
import { hashCanonicalJson } from '@offscreen/documents';
import { prepareWriterRoundWire } from '@offscreen/storyteller/providers/openrouter';
import {
  compileWriterRoundCapturedRequest,
  writerRoundDecisionSchema,
  validateWriterRoundDecisionForCapture,
  type WriterMissionCapture,
  type WriterRoundDecision,
  type WriterToolInvocationResult,
  type WriterToolName,
} from '@offscreen/storyteller/tasks';
import type { Transaction } from '@offscreen/db/outbox';
import {
  advanceWriterMissionProviderStep,
  hashWriterMissionSerializedResponse,
  type WriterMissionProviderTransport,
} from './writer-mission-custody';
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
      | 'tool_execution_failed',
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
      accepted: WriterSceneProposalAccepted;
      wireSha256: string;
    }
  | {
      status: 'tool-round-complete';
      decision: WriterRoundDecision & { kind: 'tool-calls' };
      wireSha256: string;
      toolSummaries: readonly WriterToolInvocationResult[];
    };

type LibraryReader = Parameters<
  typeof createWriterLibraryToolExecutor
>[0]['reader'];

async function loadModelStep(
  database: Database,
  missionId: string,
  ordinal: number,
) {
  const [step] = await database.db
    .select()
    .from(storytellerWriterStep)
    .where(
      and(
        eq(storytellerWriterStep.missionId, missionId),
        eq(storytellerWriterStep.contextId, missionId),
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
        eq(storytellerWriterStep.contextId, missionId),
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
        eq(storytellerWriterStep.contextId, input.missionId),
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
    toolCallId: string;
    requestCasHash: string;
    resultCasHash: string;
  },
): Promise<number> {
  const ordinals = await tx
    .select({ ordinal: storytellerWriterStep.ordinal })
    .from(storytellerWriterStep)
    .where(eq(storytellerWriterStep.missionId, input.missionId));
  const ordinal =
    ordinals.reduce((max, row) => Math.max(max, row.ordinal), 0) + 1;
  await tx.insert(storytellerWriterStep).values({
    missionId: input.missionId,
    contextId: input.missionId,
    ordinal,
    toolCallId: input.toolCallId,
    requestCasHash: input.requestCasHash,
    resultCasHash: input.resultCasHash,
    revision: 1,
    state: 'tools-applied',
  });
  await tx
    .update(storytellerWriterMission)
    .set({
      nextRevision: ordinal + 1,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(eq(storytellerWriterMission.id, input.missionId));
  return ordinal;
}

async function insertNextModelStepPrepared(
  tx: Transaction,
  input: {
    missionId: string;
    requestCasHash: string;
  },
): Promise<number> {
  const ordinals = await tx
    .select({ ordinal: storytellerWriterStep.ordinal })
    .from(storytellerWriterStep)
    .where(eq(storytellerWriterStep.missionId, input.missionId));
  const ordinal =
    ordinals.reduce((max, row) => Math.max(max, row.ordinal), 0) + 1;
  await tx.insert(storytellerWriterStep).values({
    missionId: input.missionId,
    contextId: input.missionId,
    ordinal,
    requestCasHash: input.requestCasHash,
    revision: 1,
    state: 'model-request-prepared',
  });
  await tx
    .update(storytellerWriterMission)
    .set({
      nextRevision: ordinal + 1,
      state: 'active',
      updatedAt: sql`clock_timestamp()`,
    })
    .where(eq(storytellerWriterMission.id, input.missionId));
  return ordinal;
}

function toolRequestCasHash(
  name: WriterToolName,
  args: Record<string, unknown>,
): string {
  return hashCanonicalJson({ name, args });
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

async function holdModelRound(
  database: Database,
  input: {
    missionId: string;
    ordinal: number;
    revision: number;
    reason: string;
  },
) {
  await database.db.transaction(async (tx) => {
    await casModelStep(tx, {
      missionId: input.missionId,
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
    transportInvoked: true as const,
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
    ordinal: number;
    expectedRevision: number;
    capture: WriterMissionCapture;
  },
): Promise<{ wireSha256: string; revision: number }> {
  const step = await loadModelStep(database, input.missionId, input.ordinal);
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

async function applyToolCalls(
  database: Database,
  storage: DocumentStore,
  input: {
    missionId: string;
    capture: WriterMissionCapture;
    access: LibraryAccess;
    reader: LibraryReader;
    calls: WriterRoundDecision & { kind: 'tool-calls' };
  },
): Promise<WriterToolInvocationResult[]> {
  const library = createWriterLibraryToolExecutor({
    capture: input.capture,
    reader: input.reader,
    authorize: async () => input.access,
  });
  const summaries: WriterToolInvocationResult[] = [];

  for (const call of input.calls.calls) {
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
      const outcome = await library.execute(call as WriterLibraryToolCall);
      if (!outcome.ok) {
        if (
          outcome.code === 'tool-not-granted' ||
          outcome.code === 'tool-not-supported'
        ) {
          throw new WriterLoopError('ungranted_tool');
        }
        throw new WriterLoopError('tool_execution_failed');
      }
      resultHash = hashCanonicalJson(outcome.result);
      const summary = summarizeToolResult(call, resultHash);
      const resultCasHash = await persistToolSummary(storage, summary);
      await database.db.transaction(async (tx) => {
        await recordToolInvocationStep(tx, {
          missionId: input.missionId,
          toolCallId: call.id,
          requestCasHash,
          resultCasHash,
        });
      });
      summaries.push(summary);
    }
  }
  return summaries;
}

function parseProviderDecisionBody(body: string): WriterRoundDecision | null {
  try {
    const parsed = JSON.parse(body) as unknown;
    return writerRoundDecisionSchema.parse(parsed);
  } catch {
    return null;
  }
}

export type RunWriterMissionModelRoundInput = {
  missionId: string;
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
  const prepared = await prepareWriterMissionModelStep(database, input.storage, {
    missionId: input.missionId,
    ordinal: input.ordinal,
    expectedRevision: input.expectedRevision,
    capture: input.capture,
  });
  const wireSha256 = prepared.wireSha256;
  let stepRevision = prepared.revision;

  const preStep = await loadModelStep(database, input.missionId, input.ordinal);
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

  const step = await loadModelStep(database, input.missionId, input.ordinal);
  if (!step) {
    throw new WriterLoopError('step_not_found');
  }
  stepRevision = step.revision;

  const decision = parseProviderDecisionBody(input.scriptedDecisionBody);
  if (!decision) {
    await holdModelRound(database, {
      missionId: input.missionId,
      ordinal: input.ordinal,
      revision: stepRevision,
      reason: 'malformed_decision',
    });
    return {
      status: 'held',
      reason: 'malformed_decision',
      wireSha256,
      transportInvoked: transportCalls > 0,
    };
  }

  try {
    validateWriterRoundDecisionForCapture(input.capture, decision);
  } catch {
    await holdModelRound(database, {
      missionId: input.missionId,
      ordinal: input.ordinal,
      revision: stepRevision,
      reason: 'ungranted_tool',
    });
    return {
      status: 'held',
      reason: 'ungranted_tool',
      wireSha256,
      transportInvoked: transportCalls > 0,
    };
  }

  if (decision.kind === 'final') {
    let accepted: WriterSceneProposalAccepted;
    try {
      accepted = await acceptWriterSceneProposal(database, input.storage, {
        missionId: input.missionId,
        capture: input.capture,
        access: input.access,
        reader: input.reader,
        proposal: decision.proposal,
      });
    } catch (error) {
      const reason =
        error instanceof WriterSceneProposalError
          ? error.code
          : 'invalid_proposal';
      await holdModelRound(database, {
        missionId: input.missionId,
        ordinal: input.ordinal,
        revision: stepRevision,
        reason,
      });
      return {
        status: 'held',
        reason,
        wireSha256,
        transportInvoked: transportCalls > 0,
      };
    }
    await database.db.transaction(async (tx) => {
      await casModelStep(tx, {
        missionId: input.missionId,
        ordinal: input.ordinal,
        expectedRevision: stepRevision,
        patch: { state: 'proposal-ready', resultCasHash: custody.resultCasHash },
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
      accepted,
      wireSha256,
    };
  }

  try {
    const toolSummaries = await applyToolCalls(database, input.storage, {
      missionId: input.missionId,
      capture: input.capture,
      access: input.access,
      reader: input.reader,
      calls: decision,
    });
    const latestStep = await loadModelStep(
      database,
      input.missionId,
      input.ordinal,
    );
    if (!latestStep) {
      throw new WriterLoopError('step_not_found');
    }
    const ordinals = await database.db
      .select({ ordinal: storytellerWriterStep.ordinal })
      .from(storytellerWriterStep)
      .where(eq(storytellerWriterStep.missionId, input.missionId));
    const maxOrdinal = ordinals.reduce(
      (max, row) => Math.max(max, row.ordinal),
      0,
    );
    const priorForNextRound = await loadPriorToolSummaries(
      database,
      input.storage,
      input.missionId,
      maxOrdinal + 1,
    );
    const nextWire = buildWriterMissionRoundWire(
      input.capture,
      priorForNextRound,
    );
    await database.db.transaction(async (tx) => {
      await casModelStep(tx, {
        missionId: input.missionId,
        ordinal: input.ordinal,
        expectedRevision: latestStep.revision,
        patch: { state: 'tools-applied' },
      });
      await insertNextModelStepPrepared(tx, {
        missionId: input.missionId,
        requestCasHash: nextWire.wire.sha256,
      });
    });
    return {
      status: 'tool-round-complete',
      decision,
      wireSha256,
      toolSummaries,
    };
  } catch (error) {
    const reason =
      error instanceof WriterLoopError
        ? error.code
        : error instanceof WriterLibraryToolError
          ? error.code
          : 'tool_execution_failed';
    const stepNow = await loadModelStep(database, input.missionId, input.ordinal);
    if (stepNow) {
      await holdModelRound(database, {
        missionId: input.missionId,
        ordinal: input.ordinal,
        revision: stepNow.revision,
        reason,
      });
    }
    return {
      status: 'held',
      reason,
      wireSha256,
      transportInvoked: transportCalls > 0,
    };
  }
}