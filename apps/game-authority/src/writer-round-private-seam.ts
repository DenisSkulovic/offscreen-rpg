import { and, asc, eq, isNotNull, sql } from 'drizzle-orm';
import type { z } from 'zod';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { storytellerWriterMission, storytellerWriterStep } from '@offscreen/db/storyteller-schema';
import { hashCanonicalJson, type DocumentStore } from '@offscreen/documents';
import {
  writerRoundModelPolicyToWire,
  writerRoundProviderTelemetryWireSchema,
  writerRoundProviderUsageFromWire,
  type WriterRoundPrivatePrepareResponse,
  type WriterRoundPrivateStatusResponse,
  type WriterRoundPrivateSubmitOutcomeRequest,
  type WriterRoundPrivateSubmitOutcomeResponse,
} from '@offscreen/contracts/writer-round-private-custody';
import {
  buildWriterMissionRoundWire,
  prepareWriterMissionModelStep,
  WriterLoopError,
} from '@offscreen/story-engine/storyteller/writer-loop';
import { defaultWriterContextId } from '@offscreen/story-engine/storyteller/writer-child-custody';
import {
  preparePrivateWriterRound,
  submitPrivateWriterRoundOutcome,
  WriterRoundPrivateCustodyError,
} from '@offscreen/story-engine/storyteller/writer-round-private-custody';
import {
  readWriterMissionStepRow,
  WriterMissionCustodyError,
} from '@offscreen/story-engine/storyteller/writer-mission-custody';
import type { ProviderTelemetry } from '@offscreen/storyteller/providers/openrouter';
import type { WriterRoundModelPolicy } from '@offscreen/storyteller/providers/writer-round-transport';
import {
  writerMissionCaptureV3ContinuationSchema,
  type WriterMissionCapture,
  type WriterToolInvocationResult,
  type WriterToolName,
} from '@offscreen/storyteller/tasks';

const WRITER_TOOL_SUMMARY_SCHEMA = 'writer-tool-invocation-summary.v1';

type WriterMissionBudgetSnapshot = WriterMissionCapture['budgets'];

export type WriterRoundPrivateSeam = {
  prepareRound(input: {
    missionId: string;
    ordinal: number;
    contextId: string;
    attemptId: string;
    expectedRevision: number;
  }): Promise<WriterRoundPrivatePrepareResponse>;
  submitOutcome(input: {
    missionId: string;
    ordinal: number;
    attemptId: string;
    body: WriterRoundPrivateSubmitOutcomeRequest;
  }): Promise<WriterRoundPrivateSubmitOutcomeResponse>;
  getStatus(input: {
    missionId: string;
    ordinal: number;
    contextId?: string;
  }): Promise<WriterRoundPrivateStatusResponse>;
};

export type WriterRoundPrivateSeamOptions = {
  /** Frozen GA-owned provider policy; never accepted from HTTP callers. */
  providerPolicy: WriterRoundModelPolicy;
};

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
      throw new WriterLoopError('invalid_step_state');
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
        throw new WriterLoopError('invalid_step_state');
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
    throw new WriterLoopError('invalid_step_state');
  }
  return summaries;
}

function validateCaptureAgainstPolicy(
  capture: WriterMissionCapture,
  policy: WriterRoundModelPolicy,
  budgetSnapshot: WriterMissionBudgetSnapshot,
): string | null {
  if (capture.version !== 'writer-mission.v3') {
    return 'invalid_capture_version';
  }
  if (capture.modelSelection.model === 'scripted-offline') {
    return 'scripted_offline_model';
  }
  if (capture.modelSelection.model !== policy.model) {
    return 'model_policy_mismatch';
  }
  const captureMicrousd = BigInt(capture.budgets.maxMicrousd);
  const snapshotMicrousd = BigInt(budgetSnapshot.maxMicrousd);
  if (captureMicrousd !== snapshotMicrousd) {
    return 'budget_snapshot_mismatch';
  }
  if (capture.budgets.maxModelRounds !== budgetSnapshot.maxModelRounds) {
    return 'budget_snapshot_mismatch';
  }
  if (
    policy.maxModelRounds > budgetSnapshot.maxModelRounds ||
    policy.maxMicrousd > snapshotMicrousd
  ) {
    return 'policy_budget_too_permissive';
  }
  return null;
}

async function loadWriterMissionCapture(
  database: Database,
  missionId: string,
): Promise<
  | {
      capture: WriterMissionCapture;
      budgetSnapshot: WriterMissionBudgetSnapshot;
      libraryRootHash: string;
    }
  | null
> {
  const [mission] = await database.db
    .select({
      generationId: storytellerWriterMission.generationId,
      captureSha256: storytellerWriterMission.captureSha256,
      libraryRootHash: storytellerWriterMission.libraryRootHash,
      budgetSnapshot: storytellerWriterMission.budgetSnapshot,
    })
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.id, missionId))
    .limit(1);
  if (!mission) {
    return null;
  }
  const [generationRow] = await database.db
    .select({ input: generation.input })
    .from(generation)
    .where(eq(generation.id, mission.generationId))
    .limit(1);
  if (!generationRow) {
    return null;
  }
  const generationInput = (generationRow.input ?? {}) as {
    writerMissionCapture?: unknown;
  };
  const capture = writerMissionCaptureV3ContinuationSchema.safeParse(
    generationInput.writerMissionCapture,
  );
  if (!capture.success) {
    return null;
  }
  if (capture.data.capturedRequestHash !== mission.captureSha256) {
    return null;
  }
  return {
    capture: capture.data,
    budgetSnapshot: mission.budgetSnapshot as WriterMissionBudgetSnapshot,
    libraryRootHash: mission.libraryRootHash,
  };
}

function telemetryFromWire(
  wire: z.infer<typeof writerRoundProviderTelemetryWireSchema>,
): ProviderTelemetry {
  return {
    durationMs: wire.durationMs,
    httpStatus: wire.httpStatus,
    providerId: wire.providerId,
    reportedModel: wire.reportedModel,
    finishReason: wire.finishReason,
  };
}

function mapPrepareResult(
  result: Awaited<ReturnType<typeof preparePrivateWriterRound>>,
): WriterRoundPrivatePrepareResponse {
  if (result.status === 'ready') {
    return {
      status: 'ready',
      missionId: result.missionId,
      contextId: result.contextId,
      ordinal: result.ordinal,
      attemptId: result.attemptId,
      requestSha256: result.requestSha256,
      wire: result.wire,
      modelPolicy: writerRoundModelPolicyToWire(result.modelPolicy),
    };
  }
  if (result.status === 'replayed') {
    return {
      status: 'replayed',
      ...(result.responseSha256
        ? { responseSha256: result.responseSha256 }
        : {}),
    };
  }
  if (result.status === 'held') {
    return { status: 'held', reason: result.reason };
  }
  return { status: 'uncertain' };
}

function mapSubmitResult(
  result: Awaited<ReturnType<typeof submitPrivateWriterRoundOutcome>>,
): WriterRoundPrivateSubmitOutcomeResponse {
  if (result.status === 'delivered') {
    return { status: 'delivered', resultCasHash: result.resultCasHash };
  }
  if (result.status === 'replayed') {
    return { status: 'replayed', resultCasHash: result.resultCasHash };
  }
  if (result.status === 'held') {
    return { status: 'held', reason: result.reason };
  }
  if (result.status === 'failed') {
    return { status: 'failed', reason: result.reason };
  }
  return { status: 'uncertain' };
}

function mapStepStatus(
  step: Awaited<ReturnType<typeof readWriterMissionStepRow>>,
): WriterRoundPrivateStatusResponse {
  if (step.state === 'attempt-reserved') {
    return {
      status: 'uncertain',
      ...(step.attemptId ? { attemptId: step.attemptId } : {}),
    };
  }
  if (step.state === 'dispatched') {
    return {
      status: 'dispatched',
      ...(step.attemptId ? { attemptId: step.attemptId } : {}),
    };
  }
  if (step.state === 'uncertain') {
    return {
      status: 'uncertain',
      ...(step.attemptId ? { attemptId: step.attemptId } : {}),
    };
  }
  if (step.state === 'held') {
    return { status: 'held', ...(step.attemptId ? { attemptId: step.attemptId } : {}) };
  }
  if (step.state === 'failed') {
    return { status: 'failed', ...(step.attemptId ? { attemptId: step.attemptId } : {}) };
  }
  if (
    step.state === 'result-settled' ||
    step.state === 'tools-applied' ||
    step.state === 'proposal-ready'
  ) {
    return {
      status: 'settled',
      ...(step.attemptId ? { attemptId: step.attemptId } : {}),
      ...(step.resultCasHash ? { responseSha256: step.resultCasHash } : {}),
    };
  }
  return { status: 'held' };
}

export function createWriterRoundPrivateSeam(
  database: Database,
  storage: DocumentStore,
  options: WriterRoundPrivateSeamOptions,
): WriterRoundPrivateSeam {
  const policy = options.providerPolicy;

  return {
    async prepareRound(input) {
      const loaded = await loadWriterMissionCapture(database, input.missionId);
      if (!loaded) {
        return { status: 'held', reason: 'mission_not_found' };
      }

      const captureFault = validateCaptureAgainstPolicy(
        loaded.capture,
        policy,
        loaded.budgetSnapshot,
      );
      if (captureFault) {
        return { status: 'held', reason: captureFault };
      }

      if (loaded.libraryRootHash !== loaded.capture.libraryRootHash) {
        return { status: 'held', reason: 'library_root_mismatch' };
      }

      const contextId = defaultWriterContextId(input.missionId, input.contextId);
      if (contextId !== input.contextId) {
        return { status: 'held', reason: 'context_mismatch' };
      }

      const current = await readWriterMissionStepRow(
        database,
        input.missionId,
        contextId,
        input.ordinal,
      );
      // The legacy preparer only accepts captured / model-request-prepared.
      // A later prepare must bind the durable attempt, not reset that step.
      if (
        current.state === 'captured' ||
        current.state === 'model-request-prepared'
      ) {
        try {
          await prepareWriterMissionModelStep(database, storage, {
            missionId: input.missionId,
            contextId,
            ordinal: input.ordinal,
            expectedRevision: input.expectedRevision,
            capture: loaded.capture,
          });
        } catch (error) {
          if (error instanceof WriterLoopError) {
            return { status: 'held', reason: error.code };
          }
          throw error;
        }
      }

      const prior = await loadPriorToolSummaries(
        database,
        storage,
        input.missionId,
        contextId,
        input.ordinal,
      );
      const { wire } = buildWriterMissionRoundWire(loaded.capture, prior);
      const preparedStep = await readWriterMissionStepRow(
        database,
        input.missionId,
        contextId,
        input.ordinal,
      );

      const prepared = await preparePrivateWriterRound(database, {
        missionId: input.missionId,
        contextId,
        ordinal: input.ordinal,
        attemptId: input.attemptId,
        expectedRevision: preparedStep.revision,
        wire,
        policy,
      });
      return mapPrepareResult(prepared);
    },

    async submitOutcome(input) {
      const body = input.body;
      const contextId = defaultWriterContextId(input.missionId);
      const step = await readWriterMissionStepRow(
        database,
        input.missionId,
        contextId,
        input.ordinal,
      );

      let outcome: Parameters<typeof submitPrivateWriterRoundOutcome>[2]['outcome'];
      if (body.outcome.kind === 'delivered') {
        outcome = {
          kind: 'delivered',
          serializedResponse: body.outcome.serializedResponse,
          usage: writerRoundProviderUsageFromWire(body.outcome.usage),
          telemetry: telemetryFromWire(body.outcome.telemetry),
          exactWireSha256: body.outcome.exactWireSha256,
        };
      } else if (body.outcome.kind === 'failed') {
        outcome = {
          kind: 'failed',
          failureCode: body.outcome.failureCode,
          sent: body.outcome.sent,
          ...(body.outcome.usage
            ? { usage: writerRoundProviderUsageFromWire(body.outcome.usage) }
            : {}),
          ...(body.outcome.telemetry
            ? { telemetry: telemetryFromWire(body.outcome.telemetry) }
            : {}),
        };
      } else {
        outcome = {
          kind: 'unknown',
          ...(body.outcome.telemetry
            ? { telemetry: telemetryFromWire(body.outcome.telemetry) }
            : {}),
        };
      }

      try {
        const result = await submitPrivateWriterRoundOutcome(database, storage, {
          missionId: input.missionId,
          contextId,
          ordinal: input.ordinal,
          attemptId: input.attemptId,
          requestSha256: body.requestSha256,
          expectedRevision: step.revision,
          outcome,
        });
        return mapSubmitResult(result);
      } catch (error) {
        if (error instanceof WriterRoundPrivateCustodyError) {
          throw error;
        }
        if (error instanceof WriterMissionCustodyError) {
          throw error;
        }
        throw error;
      }
    },

    async getStatus(input) {
      const contextId = defaultWriterContextId(input.missionId, input.contextId);
      try {
        const step = await readWriterMissionStepRow(
          database,
          input.missionId,
          contextId,
          input.ordinal,
        );
        return mapStepStatus(step);
      } catch (error) {
        if (error instanceof WriterMissionCustodyError) {
          return { status: 'held' };
        }
        throw error;
      }
    },
  };
}