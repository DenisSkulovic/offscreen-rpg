/**
 * WR10 T01: shared two-phase Writer round custody — prepare (possible-send) and submit (settle).
 */
import { Buffer } from 'node:buffer';
import { eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { storytellerWriterMission } from '@offscreen/db/storyteller-schema';
import type { DocumentStore } from '@offscreen/documents';
import type { PreparedProviderWire } from '@offscreen/storyteller/providers/openrouter';
import { preparedWireIsSelfConsistent } from '@offscreen/storyteller/providers/openrouter';
import type {
  ProviderTelemetry,
  ProviderUsage,
} from '@offscreen/storyteller/providers/openrouter';
import type { WriterRoundModelPolicy } from '@offscreen/storyteller/providers/writer-round-transport';
import { createStorytellerBudget } from './budget';
import { defaultWriterContextId } from './writer-child-custody';
import {
  acquireGlobalBudgetAdvisoryLock,
  casWriterStep,
  evaluateWriterRoundAttemptPolicyPin,
  finalizeDurableWriterDeliveryInTransaction,
  finalizeDurableWriterSentFailureInTransaction,
  hashWriterMissionSerializedResponse,
  holdWriterStep,
  loadWriterMissionProviderAttempt,
  lockWriterContextStep,
  markWriterContextUncertain,
  planWriterProviderStepInTransaction,
  providerExecutionFromAttempt,
  readWriterMissionStepRow,
  WriterMissionCustodyError,
} from './writer-mission-custody';
import { putDurableWriterProviderResponse } from './writer-provider-response';

export const WRITER_ROUND_PRIVATE_MAX_WIRE_BYTES = 32_768;

const STRICT_REPLAY_STEP_STATES = new Set([
  'result-settled',
  'tools-applied',
  'proposal-ready',
]);

const MICRUM_PER_MILLION = 1_000_000n;

type WriterMissionBudgetSnapshot = {
  maxModelRounds: number;
  maxInputTokens: number;
  maxGeneratedTokens: number;
  maxMicrousd: string;
  deadlineMs: number;
};

export class WriterRoundPrivateCustodyError extends Error {
  constructor(
    public readonly code: 'outcome_conflict' | 'invalid_outcome',
  ) {
    super(code);
  }
}

export function computeWriterRoundWorstCaseReservedMicrousd(
  policy: WriterRoundModelPolicy,
): bigint {
  const inputMicrousdPerMillion = BigInt(policy.inputMicrousdPerMillion);
  const outputMicrousdPerMillion = BigInt(policy.outputMicrousdPerMillion);
  const inputCeil =
    (BigInt(policy.maxInputTokens) * inputMicrousdPerMillion +
      (MICRUM_PER_MILLION - 1n)) /
    MICRUM_PER_MILLION;
  const outputCeil =
    (BigInt(policy.maxOutputTokens) * outputMicrousdPerMillion +
      (MICRUM_PER_MILLION - 1n)) /
    MICRUM_PER_MILLION;
  return inputCeil + outputCeil;
}

export function validateWriterRoundReservationPolicy(
  policy: WriterRoundModelPolicy,
  missionMaxMicrousd: bigint,
): string | null {
  const reservedMicrousd = computeWriterRoundWorstCaseReservedMicrousd(policy);
  if (reservedMicrousd <= 0n) {
    return 'reservation_non_positive';
  }
  if (reservedMicrousd > policy.maxMicrousd) {
    return 'policy_max_microusd_exceeded';
  }
  if (reservedMicrousd > missionMaxMicrousd) {
    return 'mission_budget_exceeded';
  }
  return null;
}

export function validatePreparedProviderWireForPrivateRound(
  wire: PreparedProviderWire,
): string | null {
  if (wire.version !== 'openrouter-wire.v1') {
    return 'wire_version';
  }
  if (!preparedWireIsSelfConsistent(wire)) {
    return 'wire_inconsistent';
  }
  const byteLength = Buffer.byteLength(wire.serialized, 'utf8');
  if (wire.serializedBytes !== byteLength) {
    return 'wire_byte_count';
  }
  if (byteLength > WRITER_ROUND_PRIVATE_MAX_WIRE_BYTES) {
    return 'wire_too_large';
  }
  return null;
}

export type PreparePrivateWriterRoundInput = {
  missionId: string;
  contextId?: string;
  ordinal: number;
  attemptId: string;
  expectedRevision: number;
  wire: PreparedProviderWire;
  policy: WriterRoundModelPolicy;
};

export type PreparePrivateWriterRoundResult =
  | {
      status: 'ready';
      missionId: string;
      contextId: string;
      ordinal: number;
      attemptId: string;
      requestSha256: string;
      wire: PreparedProviderWire;
      modelPolicy: WriterRoundModelPolicy;
      revision: number;
    }
  | {
      status: 'replayed';
      responseSha256: string | null;
      stepState: string;
    }
  | { status: 'held'; reason: string }
  | { status: 'uncertain' };

export type PrivateWriterRoundSubmitFailureCode =
  | 'provider_refusal'
  | 'provider_unavailable'
  | 'invalid_output'
  | 'malformed_output'
  | 'over_budget'
  | 'wire_rejected';

export type PrivateWriterRoundOutcome =
  | {
      kind: 'delivered';
      serializedResponse: string;
      usage: ProviderUsage;
      telemetry: ProviderTelemetry;
      exactWireSha256: string;
    }
  | {
      kind: 'failed';
      failureCode: PrivateWriterRoundSubmitFailureCode;
      sent: boolean;
      usage?: ProviderUsage;
      telemetry?: ProviderTelemetry;
    }
  | {
      kind: 'unknown';
      telemetry?: ProviderTelemetry;
    };

export type SubmitPrivateWriterRoundInput = {
  missionId: string;
  contextId?: string;
  ordinal: number;
  attemptId: string;
  requestSha256: string;
  expectedRevision: number;
  outcome: PrivateWriterRoundOutcome;
};

export type SubmitPrivateWriterRoundResult =
  | { status: 'delivered'; resultCasHash: string }
  | { status: 'replayed'; resultCasHash: string }
  | { status: 'held'; reason: string }
  | { status: 'uncertain' }
  | { status: 'failed'; reason: string };

function writerRoundScope(missionId: string, contextId: string) {
  return {
    contextId,
    childId: contextId === missionId ? null : contextId,
  };
}

async function loadMissionBudgetSnapshot(
  database: Database,
  missionId: string,
): Promise<WriterMissionBudgetSnapshot | null> {
  const [mission] = await database.db
    .select({ budgetSnapshot: storytellerWriterMission.budgetSnapshot })
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.id, missionId))
    .limit(1);
  if (!mission) {
    return null;
  }
  return mission.budgetSnapshot as WriterMissionBudgetSnapshot;
}

function reservationFields(
  policy: WriterRoundModelPolicy,
  wire: PreparedProviderWire,
) {
  return {
    reservedMicrousd: computeWriterRoundWorstCaseReservedMicrousd(policy),
    reservedInputTokens: policy.maxInputTokens,
    reservedGeneratedTokens: policy.maxOutputTokens,
    reservedReasoningTokens: 0,
    requestBytes: Buffer.byteLength(wire.serialized, 'utf8'),
  };
}

export async function preparePrivateWriterRound(
  database: Database,
  input: PreparePrivateWriterRoundInput,
): Promise<PreparePrivateWriterRoundResult> {
  const wireFault = validatePreparedProviderWireForPrivateRound(input.wire);
  if (wireFault) {
    return { status: 'held', reason: wireFault };
  }

  const contextId = defaultWriterContextId(input.missionId, input.contextId);
  const scope = writerRoundScope(input.missionId, contextId);

  const budgetSnapshot = await loadMissionBudgetSnapshot(
    database,
    input.missionId,
  );
  if (!budgetSnapshot) {
    return { status: 'held', reason: 'mission_not_found' };
  }

  const policyFault = validateWriterRoundReservationPolicy(
    input.policy,
    BigInt(budgetSnapshot.maxMicrousd),
  );
  if (policyFault) {
    return { status: 'held', reason: policyFault };
  }

  const peek = await readWriterMissionStepRow(
    database,
    input.missionId,
    scope.contextId,
    input.ordinal,
  );

  if (peek.revision !== input.expectedRevision) {
    throw new WriterMissionCustodyError('revision_conflict');
  }

  if (
    STRICT_REPLAY_STEP_STATES.has(peek.state) &&
    peek.responseObjectHash &&
    peek.resultCasHash
  ) {
    return {
      status: 'replayed',
      responseSha256: peek.resultCasHash,
      stepState: peek.state,
    };
  }

  if (
    peek.state === 'dispatched' ||
    peek.state === 'uncertain' ||
    peek.state === 'attempt-reserved'
  ) {
    return { status: 'uncertain' };
  }

  if (peek.attemptId && peek.attemptId !== input.attemptId) {
    return { status: 'held', reason: 'attempt_mismatch' };
  }

  if (peek.requestCasHash !== input.wire.sha256) {
    return { status: 'held', reason: 'request_cas_mismatch' };
  }

  if (peek.attemptId) {
    const pinnedAttempt = await loadWriterMissionProviderAttempt(
      database,
      peek.attemptId,
    );
    const policyPin = evaluateWriterRoundAttemptPolicyPin(
      pinnedAttempt,
      input.policy,
    );
    if (policyPin === 'hold_missing_caller') {
      return { status: 'held', reason: 'provider_policy_unpinned' };
    }
    if (policyPin === 'mismatch') {
      return { status: 'held', reason: 'attempt_policy_mismatch' };
    }
  }

  if (peek.state === 'held' || peek.state === 'failed') {
    return { status: 'held', reason: peek.state };
  }

  if (
    peek.state === 'result-settled' ||
    peek.state === 'tools-applied' ||
    peek.state === 'proposal-ready'
  ) {
    return { status: 'held', reason: 'strict_response_pointer_missing' };
  }

  if (peek.state !== 'model-request-prepared') {
    throw new WriterMissionCustodyError('invalid_step_state');
  }

  const reservation = reservationFields(input.policy, input.wire);

  const plan = await database.db.transaction(async (tx) => {
    await acquireGlobalBudgetAdvisoryLock(tx);
    return planWriterProviderStepInTransaction(tx, {
      missionId: input.missionId,
      contextId: scope.contextId,
      childId: scope.childId,
      ordinal: input.ordinal,
      attemptId: input.attemptId,
      expectedRevision: input.expectedRevision,
      ...reservation,
      providerPolicy: input.policy,
      requireProviderPolicy: true,
    });
  });

  if (plan.status === 'replayed') {
    return {
      status: 'replayed',
      responseSha256: plan.resultCasHash,
      stepState: plan.stepState,
    };
  }
  if (plan.status === 'held') {
    return { status: 'held', reason: plan.reason };
  }
  if (plan.status === 'already_dispatched') {
    return { status: 'uncertain' };
  }
  if (plan.status !== 'transport') {
    return { status: 'held', reason: 'unexpected_plan_status' };
  }

  return {
    status: 'ready',
    missionId: input.missionId,
    contextId,
    ordinal: input.ordinal,
    attemptId: plan.attemptId,
    requestSha256: plan.requestCasHash,
    wire: input.wire,
    modelPolicy: input.policy,
    revision: plan.revision,
  };
}

function usageFieldsMatch(
  attempt: Awaited<ReturnType<typeof loadWriterMissionProviderAttempt>>,
  usage: ProviderUsage,
  telemetry: ProviderTelemetry,
): boolean {
  return (
    attempt.chargedMicrousd === usage.reportedCostMicrousd &&
    attempt.providerId === telemetry.providerId &&
    attempt.promptTokens === usage.promptTokens &&
    attempt.completionTokens === usage.completionTokens &&
    attempt.reasoningTokens === usage.reasoningTokens &&
    attempt.cachedTokens === usage.cachedTokens &&
    attempt.cacheWriteTokens === usage.cacheWriteTokens &&
    attempt.totalTokens === usage.totalTokens &&
    attempt.reportedModel === telemetry.reportedModel &&
    attempt.finishReason === telemetry.finishReason &&
    attempt.httpStatus === telemetry.httpStatus &&
    attempt.durationMs === telemetry.durationMs
  );
}

export async function submitPrivateWriterRoundOutcome(
  database: Database,
  storage: Pick<DocumentStore, 'putStructuredDocument' | 'readStructuredDocument'>,
  input: SubmitPrivateWriterRoundInput,
): Promise<SubmitPrivateWriterRoundResult> {
  const contextId = defaultWriterContextId(input.missionId, input.contextId);
  const scope = writerRoundScope(input.missionId, contextId);
  const budget = createStorytellerBudget(database);

  const step = await readWriterMissionStepRow(
    database,
    input.missionId,
    scope.contextId,
    input.ordinal,
  );

  if (step.revision !== input.expectedRevision) {
    throw new WriterMissionCustodyError('revision_conflict');
  }

  if (step.attemptId && step.attemptId !== input.attemptId) {
    return { status: 'held', reason: 'attempt_mismatch' };
  }

  if (step.requestCasHash !== input.requestSha256) {
    return { status: 'held', reason: 'request_pin_mismatch' };
  }

  if (input.outcome.kind === 'unknown') {
    if (step.state === 'uncertain') {
      return { status: 'uncertain' };
    }
    if (step.state !== 'dispatched') {
      return { status: 'held', reason: 'invalid_step_state' };
    }
    const attemptRow = await loadWriterMissionProviderAttempt(
      database,
      input.attemptId,
    );
    const execution = providerExecutionFromAttempt(attemptRow);
    await budget.uncertain(
      input.attemptId,
      execution,
      input.outcome.telemetry,
    );
    await database.db.transaction(async (tx) => {
      const { step: locked } = await lockWriterContextStep(
        tx,
        input.missionId,
        scope.contextId,
        input.ordinal,
      );
      await casWriterStep(tx, {
        missionId: input.missionId,
        contextId: scope.contextId,
        ordinal: input.ordinal,
        expectedRevision: locked.revision,
        patch: { state: 'uncertain' },
      });
      await markWriterContextUncertain(tx, input.missionId, scope.childId);
    });
    return { status: 'uncertain' };
  }

  if (input.outcome.kind === 'failed') {
    if (step.state === 'failed') {
      return { status: 'failed', reason: input.outcome.failureCode };
    }
    if (step.state !== 'dispatched') {
      if (step.state === 'result-settled' && step.resultCasHash) {
        throw new WriterRoundPrivateCustodyError('outcome_conflict');
      }
      return { status: 'held', reason: 'invalid_step_state' };
    }

    const attemptRow = await loadWriterMissionProviderAttempt(
      database,
      input.attemptId,
    );
    const execution = providerExecutionFromAttempt(attemptRow);

    if (!input.outcome.sent) {
      const failureCode = input.outcome.failureCode;
      await budget.confirmUnsent(
        input.attemptId,
        execution,
        input.outcome.telemetry ?? {
          durationMs: null,
          httpStatus: null,
          providerId: null,
          reportedModel: null,
          finishReason: null,
        },
      );
      await database.db.transaction(async (tx) => {
        await holdWriterStep(tx, {
          missionId: input.missionId,
          contextId: scope.contextId,
          ordinal: input.ordinal,
          expectedRevision: step.revision,
          reason: failureCode,
          childId: scope.childId,
        });
      });
      return { status: 'held', reason: failureCode };
    }

    const usage = input.outcome.usage;
    const telemetry = input.outcome.telemetry;
    if (!usage || !telemetry) {
      throw new WriterRoundPrivateCustodyError('invalid_outcome');
    }

    if (attemptRow.state === 'settled') {
      if (!usageFieldsMatch(attemptRow, usage, telemetry)) {
        throw new WriterRoundPrivateCustodyError('outcome_conflict');
      }
      return { status: 'failed', reason: input.outcome.failureCode };
    }

    await database.db.transaction(async (tx) =>
      finalizeDurableWriterSentFailureInTransaction(tx, {
        missionId: input.missionId,
        contextId: scope.contextId,
        childId: scope.childId,
        ordinal: input.ordinal,
        expectedRevision: step.revision,
        attemptId: input.attemptId,
        execution,
        usage,
        telemetry,
      }),
    );
    return { status: 'failed', reason: input.outcome.failureCode };
  }

  const { serializedResponse, usage, telemetry, exactWireSha256 } =
    input.outcome;

  if (
    Buffer.byteLength(serializedResponse, 'utf8') >
    WRITER_ROUND_PRIVATE_MAX_WIRE_BYTES
  ) {
    return { status: 'held', reason: 'response_too_large' };
  }

  if (
    exactWireSha256 !== input.requestSha256 ||
    exactWireSha256 !== step.requestCasHash
  ) {
    return { status: 'held', reason: 'wire_pin_mismatch' };
  }

  const resultCasHash = hashWriterMissionSerializedResponse(serializedResponse);

  if (
    STRICT_REPLAY_STEP_STATES.has(step.state) &&
    step.resultCasHash &&
    step.responseObjectHash
  ) {
    if (step.resultCasHash === resultCasHash) {
      const attemptRow = await loadWriterMissionProviderAttempt(
        database,
        input.attemptId,
      );
      if (
        attemptRow.state === 'settled' &&
        usageFieldsMatch(attemptRow, usage, telemetry)
      ) {
        return { status: 'replayed', resultCasHash };
      }
    }
    throw new WriterRoundPrivateCustodyError('outcome_conflict');
  }

  if (step.state !== 'dispatched') {
    return { status: 'held', reason: 'invalid_step_state' };
  }

  const attemptRow = await loadWriterMissionProviderAttempt(
    database,
    input.attemptId,
  );
  const execution = providerExecutionFromAttempt(attemptRow);

  let responseObjectHash: string;
  try {
    responseObjectHash = await putDurableWriterProviderResponse(
      storage,
      {
        missionId: input.missionId,
        contextId: scope.contextId,
        ordinal: input.ordinal,
        attemptId: input.attemptId,
        requestSha256: step.requestCasHash,
      },
      serializedResponse,
    );
  } catch {
    await budget.uncertain(input.attemptId, execution);
    await database.db.transaction(async (tx) => {
      const { step: locked } = await lockWriterContextStep(
        tx,
        input.missionId,
        scope.contextId,
        input.ordinal,
      );
      await casWriterStep(tx, {
        missionId: input.missionId,
        contextId: scope.contextId,
        ordinal: input.ordinal,
        expectedRevision: locked.revision,
        patch: { state: 'uncertain' },
      });
      await markWriterContextUncertain(tx, input.missionId, scope.childId);
    });
    return { status: 'uncertain' };
  }

  try {
    await database.db.transaction(async (tx) =>
      finalizeDurableWriterDeliveryInTransaction(tx, {
        missionId: input.missionId,
        contextId: scope.contextId,
        childId: scope.childId,
        ordinal: input.ordinal,
        expectedRevision: step.revision,
        attemptId: input.attemptId,
        requestCasHash: step.requestCasHash,
        resultCasHash,
        responseObjectHash,
        execution,
        usage,
        telemetry,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'Conflicting settlement') {
      throw new WriterRoundPrivateCustodyError('outcome_conflict');
    }
    throw error;
  }

  return { status: 'delivered', resultCasHash };
}