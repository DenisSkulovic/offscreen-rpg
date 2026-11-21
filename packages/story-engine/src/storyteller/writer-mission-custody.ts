/**
 * WR03: writer-mission provider step custody — reserve on storyteller_operation,
 * attempt insert, dispatch/settle/replay without StorytellerTask.
 */
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  storytellerAttempt,
  storytellerFunding,
  storytellerOperation,
  storytellerRun,
  storytellerWriterChild,
  storytellerWriterMission,
  storytellerWriterStep,
} from '@offscreen/db/storyteller-schema';
import type { ExecutionPolicy } from '@offscreen/storyteller/tasks';
import type {
  ProviderTelemetry,
  ProviderUsage,
} from '@offscreen/storyteller/providers/openrouter';
import type {
  PreparedWriterRoundTransport,
  WriterRoundModelPolicy,
} from '@offscreen/storyteller/providers/writer-round-transport';
import type { DocumentStore } from '@offscreen/documents';
import type { Transaction } from '@offscreen/db/outbox';
import {
  createStorytellerBudget,
  settleStorytellerAttemptInTransaction,
  StorytellerBudgetError,
} from './budget';
import {
  putDurableWriterProviderResponse,
  readDurableWriterProviderResponse,
} from './writer-provider-response';
import type { WriterMissionParentStepInsert } from './writer-mission-store';
import {
  assertWriterSharedMicrousdBudget,
  defaultWriterContextId,
  markWriterChildState,
  resolveWriterStepContext,
  type ResolvedWriterStepContext,
} from './writer-child-custody';

export const WRITER_MISSION_ATTEMPT_PURPOSE = 'writer-mission.v1';

const WRITER_MISSION_CUSTODY_PROVIDER = 'writer-mission-custody.v1';

const writerMissionProviderPolicy = {
  version: 'writer-mission-custody.v1',
  route: 'writer-mission.v1',
  model: WRITER_MISSION_CUSTODY_PROVIDER,
  provider: WRITER_MISSION_CUSTODY_PROVIDER,
  priceVersion: 'writer-mission-custody.v1',
  outputProtocol: 'json-object-local-validation' as const,
  responseTransport: 'buffered-json' as const,
  inputMicrousdPerMillion: '0',
  outputMicrousdPerMillion: '0',
  maxInputTokens: 12_288,
  maxOutputTokens: 4_096,
  timeoutMs: 60_000,
};

function writerRoundPersistedPolicy(policy: WriterRoundModelPolicy) {
  return {
    version: 'writer-round.v1',
    route: 'writer-round.v1',
    model: policy.model,
    provider: policy.provider,
    priceVersion: policy.priceVersion,
    outputProtocol: 'native-json-schema' as const,
    responseTransport: 'buffered-json' as const,
    inputMicrousdPerMillion: policy.inputMicrousdPerMillion,
    outputMicrousdPerMillion: policy.outputMicrousdPerMillion,
    maxInputTokens: policy.maxInputTokens,
    maxOutputTokens: policy.maxOutputTokens,
    timeoutMs: policy.timeoutMs,
  };
}

function isStrictWriterRoundAttemptPolicy(
  policy: unknown,
): policy is ReturnType<typeof writerRoundPersistedPolicy> {
  return (
    typeof policy === 'object' &&
    policy !== null &&
    (policy as { version?: string }).version === 'writer-round.v1' &&
    typeof (policy as { model?: string }).model === 'string'
  );
}

type WriterRoundAttemptPolicyPin =
  | 'ok'
  | 'hold_missing_caller'
  | 'mismatch'
  | 'legacy_skip';

function evaluateWriterRoundAttemptPolicyPin(
  attempt: typeof storytellerAttempt.$inferSelect,
  callerPolicy?: WriterRoundModelPolicy,
): WriterRoundAttemptPolicyPin {
  const strictStored = isStrictWriterRoundAttemptPolicy(attempt.policy);
  if (!strictStored) {
    return 'legacy_skip';
  }
  if (!callerPolicy) {
    return 'hold_missing_caller';
  }
  const expected = writerRoundPersistedPolicy(callerPolicy!);
  if (
    !isDeepStrictEqual(attempt.policy, expected) ||
    attempt.requestedModel !== callerPolicy!.model ||
    attempt.requestedProvider !== callerPolicy!.provider ||
    attempt.priceVersion !== callerPolicy!.priceVersion
  ) {
    return 'mismatch';
  }
  return 'ok';
}

export class WriterMissionCustodyError extends Error {
  constructor(
    public readonly code:
      | 'step_not_found'
      | 'mission_not_found'
      | 'revision_conflict'
      | 'operation_missing'
      | 'invalid_step_state',
  ) {
    super(code);
  }
}

export type WriterMissionProviderTransportResult =
  | {
      kind: 'delivered';
      serializedResponse: string;
      usage?: ProviderUsage;
      telemetry?: ProviderTelemetry;
      exactWireSha256?: string;
    }
  | {
      kind: 'failed';
      failureCode:
        | 'provider_refusal'
        | 'provider_unavailable'
        | 'invalid_output'
        | 'malformed_output'
        | 'over_budget'
        | 'wire_rejected';
      usage: ProviderUsage;
      telemetry: ProviderTelemetry;
      exactWireSha256: string | null;
      sent: boolean;
    }
  | {
      kind: 'unknown';
      telemetry?: ProviderTelemetry;
      exactWireSha256?: string;
    };

export type WriterMissionProviderTransport =
  () => Promise<WriterMissionProviderTransportResult>;

export type AdvanceWriterMissionProviderStepInput = {
  missionId: string;
  /** Defaults to missionId (parent context). Child contexts use durable childId. */
  contextId?: string;
  ordinal: number;
  attemptId: string;
  expectedRevision: number;
  reservedMicrousd?: bigint;
  reservedInputTokens?: number;
  reservedGeneratedTokens?: number;
  reservedReasoningTokens?: number;
  requestBytes?: number;
  providerPolicy?: WriterRoundModelPolicy;
  expectedWireSha256?: string;
};

export type AdvanceDurableWriterMissionProviderStepInput =
  AdvanceWriterMissionProviderStepInput & {
    expectedWireSha256: string;
  };

export type AdvanceWriterMissionProviderStepResult =
  | {
      status: 'delivered';
      resultCasHash: string;
      transportInvoked: boolean;
    }
  | {
      status: 'replayed';
      resultCasHash: string | null;
      stepState: string;
    }
  | { status: 'held'; reason: string; transportInvoked: boolean }
  | { status: 'uncertain'; transportInvoked: boolean }
  | { status: 'failed'; reason: string; transportInvoked: boolean };

export function hashWriterMissionSerializedResponse(body: string): string {
  return createHash('sha256').update(body, 'utf8').digest('hex');
}

type WriterMissionBudgetSnapshot = {
  maxModelRounds: number;
  maxInputTokens: number;
  maxGeneratedTokens: number;
  maxMicrousd: string;
  deadlineMs: number;
};

function providerExecutionFromAttempt(
  row: typeof storytellerAttempt.$inferSelect,
): Extract<ExecutionPolicy, { mode: 'provider' }> {
  return {
    mode: 'provider',
    accountId: row.accountId,
    runId: row.runId,
    dispatchReview: { mode: 'off' },
    policy: row.policy as Extract<
      ExecutionPolicy,
      { mode: 'provider' }
    >['policy'],
  };
}

async function lockWriterContextStep(
  tx: Transaction,
  missionId: string,
  contextId: string,
  ordinal: number,
): Promise<{
  step: typeof storytellerWriterStep.$inferSelect;
  context: ResolvedWriterStepContext;
}> {
  const context = await resolveWriterStepContext(tx, missionId, contextId);
  const [mission] = await tx
    .select()
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.id, missionId))
    .for('update');
  if (!mission) {
    throw new WriterMissionCustodyError('mission_not_found');
  }
  if (context.role === 'child' && context.child) {
    await tx
      .select()
      .from(storytellerWriterChild)
      .where(eq(storytellerWriterChild.childId, context.child.childId))
      .for('update');
  }
  const [step] = await tx
    .select()
    .from(storytellerWriterStep)
    .where(
      and(
        eq(storytellerWriterStep.missionId, missionId),
        eq(storytellerWriterStep.contextId, context.contextId),
        eq(storytellerWriterStep.ordinal, ordinal),
      ),
    )
    .for('update');
  if (!step) {
    throw new WriterMissionCustodyError('step_not_found');
  }
  return {
    step,
    context: { ...context, mission },
  };
}

async function casWriterStep(
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
      ),
    )
    .returning();
  if (!updated) {
    throw new WriterMissionCustodyError('revision_conflict');
  }
  return updated;
}

async function holdWriterStep(
  tx: Transaction,
  input: {
    missionId: string;
    contextId: string;
    ordinal: number;
    expectedRevision: number;
    reason: string;
    childId?: string | null;
  },
) {
  await casWriterStep(tx, {
    missionId: input.missionId,
    contextId: input.contextId,
    ordinal: input.ordinal,
    expectedRevision: input.expectedRevision,
    patch: { state: 'held' },
  });
  if (input.childId) {
    await markWriterChildState(tx, input.childId, 'held');
  } else {
    await tx
      .update(storytellerWriterMission)
      .set({ state: 'held', updatedAt: sql`clock_timestamp()` })
      .where(eq(storytellerWriterMission.id, input.missionId));
  }
  return {
    status: 'held' as const,
    reason: input.reason,
    transportInvoked: false as const,
  };
}

export async function reserveWriterMissionProviderAttempt(
  tx: Transaction,
  input: {
    attemptId: string;
    missionId: string;
    contextId: string;
    context: ResolvedWriterStepContext;
    generationId: string;
    operationId: string;
    ownerId: string;
    storyId: string;
    requestCasHash: string;
    requestBytes: number;
    reservedMicrousd: bigint;
    reservedInputTokens: number;
    reservedGeneratedTokens: number;
    reservedReasoningTokens: number;
    budgetSnapshot: WriterMissionBudgetSnapshot;
    providerPolicy?: WriterRoundModelPolicy;
  },
): Promise<'reserved' | typeof storytellerAttempt.$inferSelect.state> {
  const attemptPolicy = input.providerPolicy
    ? writerRoundPersistedPolicy(input.providerPolicy)
    : writerMissionProviderPolicy;
  const requestedModel = input.providerPolicy
    ? input.providerPolicy.model
    : writerMissionProviderPolicy.model;
  const requestedProvider = input.providerPolicy
    ? input.providerPolicy.provider
    : writerMissionProviderPolicy.provider;
  const priceVersion = input.providerPolicy
    ? input.providerPolicy.priceVersion
    : writerMissionProviderPolicy.priceVersion;
  const [prior] = await tx
    .select()
    .from(storytellerAttempt)
    .where(eq(storytellerAttempt.id, input.attemptId));
  if (prior) {
    if (
      prior.generationId !== input.generationId ||
      prior.ownerId !== String(input.ownerId) ||
      prior.storyId !== input.storyId ||
      prior.purpose !== WRITER_MISSION_ATTEMPT_PURPOSE ||
      prior.reservedMicrousd !== input.reservedMicrousd ||
      prior.requestBytes !== input.requestBytes
    ) {
      throw new StorytellerBudgetError('budget_unavailable');
    }
    if (input.providerPolicy) {
      if (
        !isDeepStrictEqual(prior.policy, attemptPolicy) ||
        prior.requestedModel !== requestedModel ||
        prior.requestedProvider !== requestedProvider ||
        prior.priceVersion !== priceVersion
      ) {
        throw new StorytellerBudgetError('budget_unavailable');
      }
    }
    return prior.state;
  }

  const snapshotMaxMicrousd = BigInt(input.budgetSnapshot.maxMicrousd);
  if (input.reservedMicrousd > snapshotMaxMicrousd) {
    throw new StorytellerBudgetError('budget_unavailable');
  }

  await assertWriterSharedMicrousdBudget(
    tx,
    input.context,
    input.reservedMicrousd,
  );

  const childFunding =
    input.context.role === 'child' && input.context.child
      ? (
          input.context.child.policy as {
            funding: {
              maxModelRounds: number;
              maxInputTokens: number;
              maxGeneratedTokens: number;
              maxMicrousd: number;
            };
          }
        ).funding
      : null;
  const effectiveMaxMicrousd = childFunding
    ? BigInt(childFunding.maxMicrousd)
    : snapshotMaxMicrousd;
  const effectiveMaxModelRounds =
    childFunding?.maxModelRounds ?? input.budgetSnapshot.maxModelRounds;
  const effectiveMaxInputTokens =
    childFunding?.maxInputTokens ?? input.budgetSnapshot.maxInputTokens;
  const effectiveMaxGeneratedTokens =
    childFunding?.maxGeneratedTokens ?? input.budgetSnapshot.maxGeneratedTokens;

  const [operationRecord] = await tx
    .select()
    .from(storytellerOperation)
    .where(eq(storytellerOperation.generationId, input.operationId))
    .for('update');
  if (!operationRecord) {
    throw new WriterMissionCustodyError('operation_missing');
  }

  const [unknown] = await tx
    .select({ id: storytellerAttempt.id })
    .from(storytellerAttempt)
    .where(eq(storytellerAttempt.state, 'uncertain'))
    .limit(1);
  if (unknown) {
    throw new StorytellerBudgetError('usage_uncertain');
  }

  if (
    operationRecord.state !== 'open' ||
    operationRecord.reservedRounds + operationRecord.dispatchedRounds >=
      effectiveMaxModelRounds ||
    operationRecord.reservedInputTokens +
      operationRecord.consumedInputTokens +
      input.reservedInputTokens >
      Math.min(
        operationRecord.maxInputTokens,
        effectiveMaxInputTokens,
      ) ||
    operationRecord.reservedGeneratedTokens +
      operationRecord.consumedGeneratedTokens +
      input.reservedGeneratedTokens >
      Math.min(
        operationRecord.maxGeneratedTokens,
        effectiveMaxGeneratedTokens,
      ) ||
    operationRecord.reservedMicrousd +
      operationRecord.consumedMicrousd +
      input.reservedMicrousd >
      BigInt(
        operationRecord.maxMicrousd < effectiveMaxMicrousd
          ? operationRecord.maxMicrousd
          : effectiveMaxMicrousd,
      )
  ) {
    throw new StorytellerBudgetError('budget_unavailable');
  }

  const [account] = await tx
    .select()
    .from(storytellerFunding)
    .where(eq(storytellerFunding.id, operationRecord.accountId))
    .for('update');
  const [allowance] = await tx
    .select()
    .from(storytellerRun)
    .where(
      and(
        eq(storytellerRun.id, operationRecord.runId),
        eq(storytellerRun.accountId, operationRecord.accountId),
      ),
    )
    .for('update');
  if (!account || !allowance) {
    throw new StorytellerBudgetError('budget_unavailable');
  }
  if (
    account.stopped ||
    !allowance.enabled ||
    allowance.admittedAttempts >= allowance.maxAttempts ||
    account.limitMicrousd - account.settledMicrousd - account.reservedMicrousd <
      input.reservedMicrousd ||
    allowance.limitMicrousd -
      allowance.settledMicrousd -
      allowance.reservedMicrousd <
      input.reservedMicrousd
  ) {
    throw new StorytellerBudgetError('budget_unavailable');
  }

  const attribution =
    input.context.role === 'child'
      ? {
          kind: 'writer-research.v1' as const,
          missionId: input.missionId,
          contextId: input.contextId,
          childId: input.contextId,
          requestCasHash: input.requestCasHash,
        }
      : {
          kind: 'writer-mission.v1' as const,
          missionId: input.missionId,
          contextId: input.contextId,
          requestCasHash: input.requestCasHash,
        };

  await tx.insert(storytellerAttempt).values({
    id: input.attemptId,
    generationId: input.generationId,
    accountId: operationRecord.accountId,
    runId: operationRecord.runId,
    ownerId: String(input.ownerId),
    storyId: input.storyId,
    draftId: null,
    purpose: WRITER_MISSION_ATTEMPT_PURPOSE,
    storytellerProfileId: WRITER_MISSION_ATTEMPT_PURPOSE,
    storytellerProfileRevision: 1,
    taskInputVersion: 1,
    promptVersion: WRITER_MISSION_ATTEMPT_PURPOSE,
    recipeVersion: WRITER_MISSION_ATTEMPT_PURPOSE,
    resourcePolicyVersion: WRITER_MISSION_ATTEMPT_PURPOSE,
    requestedModel,
    requestedProvider,
    priceVersion,
    attribution,
    state: 'reserved',
    reservedMicrousd: input.reservedMicrousd,
    reservedInputTokens: input.reservedInputTokens,
    reservedGeneratedTokens: input.reservedGeneratedTokens,
    reservedReasoningTokens: input.reservedReasoningTokens,
    estimatedMicrousd: input.reservedMicrousd,
    estimatedInputTokens: input.reservedInputTokens,
    estimationMethod: 'writer-mission-custody',
    reconciliation: 'pending',
    requestBytes: input.requestBytes,
    policy: attemptPolicy,
  });

  await tx
    .update(storytellerOperation)
    .set({
      reservedRounds: operationRecord.reservedRounds + 1,
      reservedInputTokens:
        operationRecord.reservedInputTokens + input.reservedInputTokens,
      reservedGeneratedTokens:
        operationRecord.reservedGeneratedTokens + input.reservedGeneratedTokens,
      reservedReasoningTokens:
        operationRecord.reservedReasoningTokens + input.reservedReasoningTokens,
      reservedMicrousd:
        operationRecord.reservedMicrousd + input.reservedMicrousd,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(eq(storytellerOperation.generationId, input.operationId));

  await tx
    .update(storytellerFunding)
    .set({
      reservedMicrousd: account.reservedMicrousd + input.reservedMicrousd,
    })
    .where(eq(storytellerFunding.id, account.id));
  await tx
    .update(storytellerRun)
    .set({
      reservedMicrousd: allowance.reservedMicrousd + input.reservedMicrousd,
      admittedAttempts: allowance.admittedAttempts + 1,
    })
    .where(eq(storytellerRun.id, allowance.id));

  return 'reserved';
}

async function markWriterMissionDispatched(tx: Transaction, attemptId: string) {
  const [record] = await tx
    .select()
    .from(storytellerAttempt)
    .where(
      and(
        eq(storytellerAttempt.id, attemptId),
        eq(storytellerAttempt.purpose, WRITER_MISSION_ATTEMPT_PURPOSE),
      ),
    )
    .for('update');
  if (!record || record.state !== 'reserved') {
    return false;
  }
  const [operationRecord] = await tx
    .select()
    .from(storytellerOperation)
    .where(eq(storytellerOperation.generationId, record.generationId))
    .for('update');
  if (!operationRecord) {
    throw new WriterMissionCustodyError('operation_missing');
  }
  await tx
    .update(storytellerAttempt)
    .set({
      state: 'dispatched',
      dispatchedAt: sql`clock_timestamp()`,
    })
    .where(eq(storytellerAttempt.id, attemptId));
  await tx
    .update(storytellerOperation)
    .set({
      reservedRounds: operationRecord.reservedRounds - 1,
      dispatchedRounds: operationRecord.dispatchedRounds + 1,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(eq(storytellerOperation.generationId, record.generationId));
  return true;
}

const zeroUsage: ProviderUsage = {
  reportedCostMicrousd: 0n,
  promptTokens: 0,
  completionTokens: 0,
  reasoningTokens: 0,
  cachedTokens: 0,
  cacheWriteTokens: 0,
  totalTokens: 0,
};

const zeroTelemetry: ProviderTelemetry = {
  providerId: WRITER_MISSION_CUSTODY_PROVIDER,
  reportedModel: WRITER_MISSION_CUSTODY_PROVIDER,
  finishReason: 'stop',
  httpStatus: 200,
  durationMs: 0,
};

type WriterCustodyScope = {
  contextId: string;
  childId: string | null;
};

function writerCustodyScope(
  input: AdvanceWriterMissionProviderStepInput,
): WriterCustodyScope {
  const contextId = defaultWriterContextId(input.missionId, input.contextId);
  return {
    contextId,
    childId: contextId === input.missionId ? null : contextId,
  };
}

async function markWriterContextUncertain(
  tx: Transaction,
  missionId: string,
  childId: string | null,
) {
  if (childId) {
    await markWriterChildState(tx, childId, 'uncertain');
    return;
  }
  await tx
    .update(storytellerWriterMission)
    .set({ state: 'uncertain', updatedAt: sql`clock_timestamp()` })
    .where(eq(storytellerWriterMission.id, missionId));
}

async function markWriterContextHeld(
  tx: Transaction,
  missionId: string,
  childId: string | null,
) {
  if (childId) {
    await markWriterChildState(tx, childId, 'held');
    return;
  }
  await tx
    .update(storytellerWriterMission)
    .set({ state: 'held', updatedAt: sql`clock_timestamp()` })
    .where(eq(storytellerWriterMission.id, missionId));
}

async function markWriterContextActive(
  tx: Transaction,
  missionId: string,
  childId: string | null,
) {
  if (childId) {
    await markWriterChildState(tx, childId, 'running');
    return;
  }
  await tx
    .update(storytellerWriterMission)
    .set({ state: 'active', updatedAt: sql`clock_timestamp()` })
    .where(eq(storytellerWriterMission.id, missionId));
}

const strictReplayStepStates = new Set([
  'result-settled',
  'tools-applied',
  'proposal-ready',
]);

async function acquireGlobalBudgetAdvisoryLock(tx: Transaction) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(714092631)`);
}

type PlanWriterProviderStepInput = {
  missionId: string;
  contextId: string;
  childId: string | null;
  ordinal: number;
  attemptId: string;
  expectedRevision: number;
  reservedMicrousd: bigint;
  reservedInputTokens: number;
  reservedGeneratedTokens: number;
  reservedReasoningTokens: number;
  requestBytes: number;
  providerPolicy?: WriterRoundModelPolicy;
  /** When true, reserveWriterMissionProviderAttempt always receives providerPolicy. */
  requireProviderPolicy: boolean;
};

type PlanWriterProviderStepResult =
  | {
      status: 'replayed';
      resultCasHash: string | null;
      stepState: string;
    }
  | { status: 'held'; reason: string; transportInvoked: false }
  | {
      status: 'already_dispatched';
      attemptId: string;
      requestCasHash: string;
    }
  | {
      status: 'transport';
      attemptId: string;
      revision: number;
      requestCasHash: string;
    };

async function readWriterMissionStepRow(
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
      ),
    )
    .limit(1);
  if (!step) {
    throw new WriterMissionCustodyError('step_not_found');
  }
  return step;
}

function writerProviderPreflightReason(
  transport: PreparedWriterRoundTransport,
  expectedWireSha256: string,
  requestCasHash: string,
): string | null {
  const preflight = transport.preflight();
  if (preflight.kind === 'rejected') {
    return preflight.reason === 'credential_missing'
      ? 'credential_missing'
      : 'wire_rejected';
  }
  if (preflight.wireSha256 !== expectedWireSha256) {
    return 'wire_mismatch';
  }
  if (preflight.wireSha256 !== requestCasHash) {
    return 'request_pin_mismatch';
  }
  return null;
}

/**
 * Shared reserve/dispatch SQL used by scripted and strict provider custody.
 * Does not acquire the global budget advisory lock; strict callers must do that first.
 */
async function planWriterProviderStepInTransaction(
  tx: Transaction,
  input: PlanWriterProviderStepInput,
): Promise<PlanWriterProviderStepResult> {
  const { step, context } = await lockWriterContextStep(
    tx,
    input.missionId,
    input.contextId,
    input.ordinal,
  );
  const mission = context.mission;

  if (step.revision !== input.expectedRevision) {
    throw new WriterMissionCustodyError('revision_conflict');
  }

  if (step.attemptId && step.attemptId !== input.attemptId) {
    return holdWriterStep(tx, {
      missionId: input.missionId,
      contextId: input.contextId,
      ordinal: input.ordinal,
      expectedRevision: input.expectedRevision,
      reason: 'attempt_mismatch',
      childId: input.childId,
    });
  }

  if (step.state === 'result-settled' || step.state === 'uncertain') {
    return {
      status: 'replayed',
      resultCasHash: step.resultCasHash,
      stepState: step.state,
    };
  }

  if (step.state === 'held' || step.state === 'failed') {
    return {
      status: 'held',
      reason: step.state,
      transportInvoked: false,
    };
  }

  if (step.state === 'dispatched') {
    const boundAttemptId = step.attemptId ?? input.attemptId;
    await casWriterStep(tx, {
      missionId: input.missionId,
      contextId: input.contextId,
      ordinal: input.ordinal,
      expectedRevision: step.revision,
      patch: { state: 'uncertain', attemptId: boundAttemptId },
    });
    await markWriterContextUncertain(tx, input.missionId, input.childId);
    return {
      status: 'already_dispatched',
      attemptId: boundAttemptId,
      requestCasHash: step.requestCasHash,
    };
  }

  let revision = step.revision;
  let state: WriterMissionParentStepInsert['state'] = step.state;
  let attemptId = step.attemptId ?? input.attemptId;

  if (state === 'model-request-prepared') {
    try {
      const reserveState = await reserveWriterMissionProviderAttempt(tx, {
        attemptId: input.attemptId,
        missionId: input.missionId,
        contextId: input.contextId,
        context,
        generationId: mission.generationId,
        operationId: mission.operationId,
        ownerId: String(mission.ownerId),
        storyId: mission.storyId,
        requestCasHash: step.requestCasHash,
        requestBytes: input.requestBytes,
        reservedMicrousd: input.reservedMicrousd,
        reservedInputTokens: input.reservedInputTokens,
        reservedGeneratedTokens: input.reservedGeneratedTokens,
        reservedReasoningTokens: input.reservedReasoningTokens,
        budgetSnapshot: mission.budgetSnapshot as WriterMissionBudgetSnapshot,
        ...(input.requireProviderPolicy || input.providerPolicy
          ? { providerPolicy: input.providerPolicy! }
          : {}),
      });
      if (reserveState !== 'reserved') {
        return {
          status: 'held',
          reason: `attempt_${reserveState}`,
          transportInvoked: false,
        };
      }
      const reservedStep = await casWriterStep(tx, {
        missionId: input.missionId,
        contextId: input.contextId,
        ordinal: input.ordinal,
        expectedRevision: revision,
        patch: {
          state: 'attempt-reserved',
          attemptId: input.attemptId,
        },
      });
      revision = reservedStep.revision;
      state = reservedStep.state;
      attemptId = input.attemptId;
      if (input.childId) {
        await markWriterChildState(tx, input.childId, 'running');
      }
    } catch (error) {
      if (error instanceof StorytellerBudgetError) {
        return holdWriterStep(tx, {
          missionId: input.missionId,
          contextId: input.contextId,
          ordinal: input.ordinal,
          expectedRevision: revision,
          reason: error.code,
          childId: input.childId,
        });
      }
      throw error;
    }
  }

  if (state === 'attempt-reserved') {
    const dispatched = await markWriterMissionDispatched(tx, attemptId);
    if (!dispatched) {
      return holdWriterStep(tx, {
        missionId: input.missionId,
        contextId: input.contextId,
        ordinal: input.ordinal,
        expectedRevision: revision,
        reason: 'dispatch_failed',
        childId: input.childId,
      });
    }
    const dispatchedStep = await casWriterStep(tx, {
      missionId: input.missionId,
      contextId: input.contextId,
      ordinal: input.ordinal,
      expectedRevision: revision,
      patch: { state: 'dispatched', attemptId },
    });
    revision = dispatchedStep.revision;
    state = dispatchedStep.state;
  }

  if (state !== 'dispatched') {
    throw new WriterMissionCustodyError('invalid_step_state');
  }

  return {
    status: 'transport',
    attemptId,
    revision,
    requestCasHash: step.requestCasHash,
  };
}

type FinalizeDurableDeliveryInput = {
  missionId: string;
  contextId: string;
  childId: string | null;
  ordinal: number;
  expectedRevision: number;
  attemptId: string;
  requestCasHash: string;
  resultCasHash: string;
  responseObjectHash: string;
  execution: Extract<ExecutionPolicy, { mode: 'provider' }>;
  usage: ProviderUsage;
  telemetry: ProviderTelemetry;
};

async function finalizeDurableWriterDeliveryInTransaction(
  tx: Transaction,
  input: FinalizeDurableDeliveryInput,
) {
  await acquireGlobalBudgetAdvisoryLock(tx);
  await settleStorytellerAttemptInTransaction(tx, {
    id: input.attemptId,
    execution: input.execution,
    usage: input.usage,
    telemetry: input.telemetry,
    operationOutcome: 'continue',
  });
  const { step } = await lockWriterContextStep(
    tx,
    input.missionId,
    input.contextId,
    input.ordinal,
  );
  if (step.revision !== input.expectedRevision) {
    throw new WriterMissionCustodyError('revision_conflict');
  }
  if (step.attemptId !== input.attemptId) {
    throw new WriterMissionCustodyError('invalid_step_state');
  }
  if (step.requestCasHash !== input.requestCasHash) {
    throw new WriterMissionCustodyError('invalid_step_state');
  }
  if (step.state !== 'dispatched') {
    throw new WriterMissionCustodyError('invalid_step_state');
  }
  if (step.responseObjectHash) {
    throw new WriterMissionCustodyError('invalid_step_state');
  }
  if (step.toolCallId !== null) {
    throw new WriterMissionCustodyError('invalid_step_state');
  }
  await casWriterStep(tx, {
    missionId: input.missionId,
    contextId: input.contextId,
    ordinal: input.ordinal,
    expectedRevision: input.expectedRevision,
    patch: {
      state: 'result-settled',
      resultCasHash: input.resultCasHash,
      responseObjectHash: input.responseObjectHash,
      attemptId: input.attemptId,
    },
  });
  await markWriterContextActive(tx, input.missionId, input.childId);
}

type FinalizeDurableSentFailureInput = {
  missionId: string;
  contextId: string;
  childId: string | null;
  ordinal: number;
  expectedRevision: number;
  attemptId: string;
  execution: Extract<ExecutionPolicy, { mode: 'provider' }>;
  usage: ProviderUsage;
  telemetry: ProviderTelemetry;
};

async function finalizeDurableWriterSentFailureInTransaction(
  tx: Transaction,
  input: FinalizeDurableSentFailureInput,
) {
  await acquireGlobalBudgetAdvisoryLock(tx);
  await settleStorytellerAttemptInTransaction(tx, {
    id: input.attemptId,
    execution: input.execution,
    usage: input.usage,
    telemetry: input.telemetry,
    operationOutcome: 'continue',
  });
  const { step } = await lockWriterContextStep(
    tx,
    input.missionId,
    input.contextId,
    input.ordinal,
  );
  if (step.revision !== input.expectedRevision) {
    throw new WriterMissionCustodyError('revision_conflict');
  }
  if (step.attemptId !== input.attemptId) {
    throw new WriterMissionCustodyError('invalid_step_state');
  }
  if (step.state !== 'dispatched') {
    throw new WriterMissionCustodyError('invalid_step_state');
  }
  await casWriterStep(tx, {
    missionId: input.missionId,
    contextId: input.contextId,
    ordinal: input.ordinal,
    expectedRevision: input.expectedRevision,
    patch: { state: 'failed', attemptId: input.attemptId },
  });
  await markWriterContextHeld(tx, input.missionId, input.childId);
}

/**
 * Advances one writer-mission provider step: reserve, optional transport, settle/replay.
 */
export async function advanceWriterMissionProviderStep(
  database: Database,
  input: AdvanceWriterMissionProviderStepInput,
  transport: WriterMissionProviderTransport,
): Promise<AdvanceWriterMissionProviderStepResult> {
  const budget = createStorytellerBudget(database);
  const scope = writerCustodyScope(input);
  const reservedMicrousd = input.reservedMicrousd ?? 1_000n;
  const reservedInputTokens = input.reservedInputTokens ?? 256;
  const reservedGeneratedTokens = input.reservedGeneratedTokens ?? 256;
  const reservedReasoningTokens = input.reservedReasoningTokens ?? 0;
  const requestBytes = input.requestBytes ?? 128;
  const isRealMode = Boolean(input.providerPolicy && input.expectedWireSha256);

  const plan = await database.db.transaction(async (tx) =>
    planWriterProviderStepInTransaction(tx, {
      missionId: input.missionId,
      contextId: scope.contextId,
      childId: scope.childId,
      ordinal: input.ordinal,
      attemptId: input.attemptId,
      expectedRevision: input.expectedRevision,
      reservedMicrousd,
      reservedInputTokens,
      reservedGeneratedTokens,
      reservedReasoningTokens,
      requestBytes,
      ...(input.providerPolicy ? { providerPolicy: input.providerPolicy } : {}),
      requireProviderPolicy: isRealMode,
    }),
  );

  if (plan.status === 'replayed') {
    return plan;
  }
  if (plan.status === 'held') {
    return plan;
  }
  if (plan.status === 'already_dispatched') {
    const uncertainAttempt = await loadAttempt(database, plan.attemptId);
    await budget.uncertain(
      plan.attemptId,
      providerExecutionFromAttempt(uncertainAttempt),
    );
    return { status: 'uncertain', transportInvoked: false };
  }
  if (plan.status !== 'transport') {
    return plan;
  }

  const transportOutcome = await transport();

  if (transportOutcome.kind === 'unknown') {
    const uncertainAttempt = await loadAttempt(database, plan.attemptId);
    await budget.uncertain(
      plan.attemptId,
      providerExecutionFromAttempt(uncertainAttempt),
      transportOutcome.telemetry,
    );
    await database.db.transaction(async (tx) => {
      const { step } = await lockWriterContextStep(
        tx,
        input.missionId,
        scope.contextId,
        input.ordinal,
      );
      await casWriterStep(tx, {
        missionId: input.missionId,
        contextId: scope.contextId,
        ordinal: input.ordinal,
        expectedRevision: step.revision,
        patch: { state: 'uncertain' },
      });
      await markWriterContextUncertain(tx, input.missionId, scope.childId);
    });
    return { status: 'uncertain', transportInvoked: true };
  }

  if (transportOutcome.kind === 'failed') {
    const attemptRow = await loadAttempt(database, plan.attemptId);
    const execution = providerExecutionFromAttempt(attemptRow);

    if (!transportOutcome.sent) {
      await budget.confirmUnsent(
        plan.attemptId,
        execution,
        transportOutcome.telemetry,
      );
      await database.db.transaction(async (tx) => {
        await holdWriterStep(tx, {
          missionId: input.missionId,
          contextId: scope.contextId,
          ordinal: input.ordinal,
          expectedRevision: plan.revision,
          reason: transportOutcome.failureCode,
          childId: scope.childId,
        });
      });
      return {
        status: 'held',
        reason: transportOutcome.failureCode,
        transportInvoked: true,
      };
    }

    await budget.settle({
      id: plan.attemptId,
      execution,
      usage: transportOutcome.usage,
      telemetry: transportOutcome.telemetry,
      operationOutcome: 'continue',
    });
    await database.db.transaction(async (tx) => {
      await casWriterStep(tx, {
        missionId: input.missionId,
        contextId: scope.contextId,
        ordinal: input.ordinal,
        expectedRevision: plan.revision,
        patch: { state: 'failed', attemptId: plan.attemptId },
      });
      await markWriterContextHeld(tx, input.missionId, scope.childId);
    });
    return {
      status: 'failed',
      reason: transportOutcome.failureCode,
      transportInvoked: true,
    };
  }

  const attemptRow = await loadAttempt(database, plan.attemptId);
  const execution = providerExecutionFromAttempt(attemptRow);

  if (isRealMode) {
    const wireOk =
      transportOutcome.exactWireSha256 === input.expectedWireSha256 &&
      transportOutcome.exactWireSha256 === plan.requestCasHash;
    const usageOk =
      transportOutcome.usage !== undefined &&
      transportOutcome.telemetry !== undefined;
    if (!wireOk || !usageOk) {
      await budget.uncertain(plan.attemptId, execution);
      await database.db.transaction(async (tx) => {
        const { step } = await lockWriterContextStep(
          tx,
          input.missionId,
          scope.contextId,
          input.ordinal,
        );
        await casWriterStep(tx, {
          missionId: input.missionId,
          contextId: scope.contextId,
          ordinal: input.ordinal,
          expectedRevision: step.revision,
          patch: { state: 'uncertain' },
        });
        await markWriterContextUncertain(tx, input.missionId, scope.childId);
      });
      return { status: 'uncertain', transportInvoked: true };
    }
    await budget.settle({
      id: plan.attemptId,
      execution,
      usage: transportOutcome.usage!,
      telemetry: transportOutcome.telemetry!,
      operationOutcome: 'continue',
    });
  } else {
    await budget.settle({
      id: plan.attemptId,
      execution,
      usage: zeroUsage,
      telemetry: zeroTelemetry,
      operationOutcome: 'continue',
    });
  }

  const resultCasHash = hashWriterMissionSerializedResponse(
    transportOutcome.serializedResponse,
  );

  await database.db.transaction(async (tx) => {
    const { step } = await lockWriterContextStep(
      tx,
      input.missionId,
      scope.contextId,
      input.ordinal,
    );
    await casWriterStep(tx, {
      missionId: input.missionId,
      contextId: scope.contextId,
      ordinal: input.ordinal,
      expectedRevision: step.revision,
      patch: {
        state: 'result-settled',
        resultCasHash,
        attemptId: plan.attemptId,
      },
    });
    await markWriterContextActive(tx, input.missionId, scope.childId);
  });

  return {
    status: 'delivered',
    resultCasHash,
    transportInvoked: true,
  };
}

async function loadAttempt(database: Database, attemptId: string) {
  const [row] = await database.db
    .select()
    .from(storytellerAttempt)
    .where(eq(storytellerAttempt.id, attemptId))
    .limit(1);
  if (!row) {
    throw new Error('writer_mission_attempt_missing');
  }
  return row;
}

/** Strict paid-provider custody: preflight, advisory-first SQL, durable response pointer. */
export async function advanceDurableWriterMissionProviderStep(
  database: Database,
  storage: Pick<DocumentStore, 'putStructuredDocument' | 'readStructuredDocument'>,
  input: AdvanceDurableWriterMissionProviderStepInput,
  transport: PreparedWriterRoundTransport,
): Promise<AdvanceWriterMissionProviderStepResult> {
  const budget = createStorytellerBudget(database);
  const scope = writerCustodyScope(input);
  const reservedMicrousd = input.reservedMicrousd ?? 1_000n;
  const reservedInputTokens = input.reservedInputTokens ?? 256;
  const reservedGeneratedTokens = input.reservedGeneratedTokens ?? 256;
  const reservedReasoningTokens = input.reservedReasoningTokens ?? 0;
  const requestBytes = input.requestBytes ?? 128;

  const peek = await readWriterMissionStepRow(
    database,
    input.missionId,
    scope.contextId,
    input.ordinal,
  );

  if (peek.revision !== input.expectedRevision) {
    throw new WriterMissionCustodyError('revision_conflict');
  }

  if (peek.attemptId && peek.attemptId !== input.attemptId) {
    return {
      status: 'held',
      reason: 'attempt_mismatch',
      transportInvoked: false,
    };
  }

  if (peek.requestCasHash !== input.expectedWireSha256) {
    return {
      status: 'held',
      reason: 'request_cas_mismatch',
      transportInvoked: false,
    };
  }

  if (peek.attemptId) {
    const pinnedAttempt = await loadAttempt(database, peek.attemptId);
    const policyPin = evaluateWriterRoundAttemptPolicyPin(
      pinnedAttempt,
      input.providerPolicy,
    );
    if (policyPin === 'hold_missing_caller') {
      return {
        status: 'held',
        reason: 'provider_policy_unpinned',
        transportInvoked: false,
      };
    }
    if (policyPin === 'mismatch') {
      return {
        status: 'held',
        reason: 'attempt_policy_mismatch',
        transportInvoked: false,
      };
    }
  }

  if (
    strictReplayStepStates.has(peek.state) &&
    peek.responseObjectHash &&
    peek.resultCasHash
  ) {
    await readDurableWriterMissionResponse(database, storage, {
      missionId: input.missionId,
      contextId: scope.contextId,
      ordinal: input.ordinal,
      attemptId: peek.attemptId ?? input.attemptId,
      requestSha256: peek.requestCasHash,
    });
    return {
      status: 'replayed',
      resultCasHash: peek.resultCasHash,
      stepState: peek.state,
    };
  }

  if (peek.state === 'dispatched' || peek.state === 'uncertain') {
    return { status: 'uncertain', transportInvoked: false };
  }

  if (peek.state === 'held' || peek.state === 'failed') {
    return {
      status: 'held',
      reason: peek.state,
      transportInvoked: false,
    };
  }

  if (
    peek.state === 'result-settled' ||
    peek.state === 'tools-applied' ||
    peek.state === 'proposal-ready'
  ) {
    return {
      status: 'held',
      reason: 'strict_response_pointer_missing',
      transportInvoked: false,
    };
  }

  const needsPreflight =
    peek.state === 'model-request-prepared' || peek.state === 'attempt-reserved';
  if (needsPreflight) {
    const preflightReason = writerProviderPreflightReason(
      transport,
      input.expectedWireSha256,
      peek.requestCasHash,
    );
    if (preflightReason) {
      return {
        status: 'held',
        reason: preflightReason,
        transportInvoked: false,
      };
    }
  }

  const shouldPlan =
    peek.state === 'model-request-prepared' || peek.state === 'attempt-reserved';
  if (!shouldPlan) {
    throw new WriterMissionCustodyError('invalid_step_state');
  }

  if (!input.providerPolicy) {
    return {
      status: 'held',
      reason: 'provider_policy_unpinned',
      transportInvoked: false,
    };
  }
  const pinnedProviderPolicy = input.providerPolicy;

  const plan = await database.db.transaction(async (tx) => {
    await acquireGlobalBudgetAdvisoryLock(tx);
    return planWriterProviderStepInTransaction(tx, {
      missionId: input.missionId,
      contextId: scope.contextId,
      childId: scope.childId,
      ordinal: input.ordinal,
      attemptId: input.attemptId,
      expectedRevision: input.expectedRevision,
      reservedMicrousd,
      reservedInputTokens,
      reservedGeneratedTokens,
      reservedReasoningTokens,
      requestBytes,
      providerPolicy: pinnedProviderPolicy,
      requireProviderPolicy: true,
    });
  });

  if (plan.status === 'replayed') {
    return plan;
  }
  if (plan.status === 'held') {
    return plan;
  }
  if (plan.status === 'already_dispatched') {
    const uncertainAttempt = await loadAttempt(database, plan.attemptId);
    await budget.uncertain(
      plan.attemptId,
      providerExecutionFromAttempt(uncertainAttempt),
    );
    return { status: 'uncertain', transportInvoked: false };
  }
  if (plan.status !== 'transport') {
    return plan;
  }

  const transportOutcome = await transport.invoke();

  if (transportOutcome.kind === 'unknown') {
    const uncertainAttempt = await loadAttempt(database, plan.attemptId);
    await budget.uncertain(
      plan.attemptId,
      providerExecutionFromAttempt(uncertainAttempt),
      transportOutcome.telemetry,
    );
    await database.db.transaction(async (tx) => {
      const { step } = await lockWriterContextStep(
        tx,
        input.missionId,
        scope.contextId,
        input.ordinal,
      );
      await casWriterStep(tx, {
        missionId: input.missionId,
        contextId: scope.contextId,
        ordinal: input.ordinal,
        expectedRevision: step.revision,
        patch: { state: 'uncertain' },
      });
      await markWriterContextUncertain(tx, input.missionId, scope.childId);
    });
    return { status: 'uncertain', transportInvoked: true };
  }

  if (transportOutcome.kind === 'failed') {
    const attemptRow = await loadAttempt(database, plan.attemptId);
    const execution = providerExecutionFromAttempt(attemptRow);

    if (!transportOutcome.sent) {
      await budget.confirmUnsent(
        plan.attemptId,
        execution,
        transportOutcome.telemetry,
      );
      await database.db.transaction(async (tx) => {
        await holdWriterStep(tx, {
          missionId: input.missionId,
          contextId: scope.contextId,
          ordinal: input.ordinal,
          expectedRevision: plan.revision,
          reason: transportOutcome.failureCode,
          childId: scope.childId,
        });
      });
      return {
        status: 'held',
        reason: transportOutcome.failureCode,
        transportInvoked: true,
      };
    }

    await database.db.transaction(async (tx) =>
      finalizeDurableWriterSentFailureInTransaction(tx, {
        missionId: input.missionId,
        contextId: scope.contextId,
        childId: scope.childId,
        ordinal: input.ordinal,
        expectedRevision: plan.revision,
        attemptId: plan.attemptId,
        execution,
        usage: transportOutcome.usage,
        telemetry: transportOutcome.telemetry,
      }),
    );
    return {
      status: 'failed',
      reason: transportOutcome.failureCode,
      transportInvoked: true,
    };
  }

  const wireOk =
    transportOutcome.exactWireSha256 === input.expectedWireSha256 &&
    transportOutcome.exactWireSha256 === plan.requestCasHash;
  if (!wireOk) {
    const attemptRow = await loadAttempt(database, plan.attemptId);
    const execution = providerExecutionFromAttempt(attemptRow);
    await budget.uncertain(plan.attemptId, execution);
    await database.db.transaction(async (tx) => {
      const { step } = await lockWriterContextStep(
        tx,
        input.missionId,
        scope.contextId,
        input.ordinal,
      );
      await casWriterStep(tx, {
        missionId: input.missionId,
        contextId: scope.contextId,
        ordinal: input.ordinal,
        expectedRevision: step.revision,
        patch: { state: 'uncertain' },
      });
      await markWriterContextUncertain(tx, input.missionId, scope.childId);
    });
    return { status: 'uncertain', transportInvoked: true };
  }

  const attemptRow = await loadAttempt(database, plan.attemptId);
  const execution = providerExecutionFromAttempt(attemptRow);
  const resultCasHash = hashWriterMissionSerializedResponse(
    transportOutcome.serializedResponse,
  );

  let responseObjectHash: string;
  try {
    responseObjectHash = await putDurableWriterProviderResponse(
      storage,
      {
        missionId: input.missionId,
        contextId: scope.contextId,
        ordinal: input.ordinal,
        attemptId: plan.attemptId,
        requestSha256: plan.requestCasHash,
      },
      transportOutcome.serializedResponse,
    );
  } catch {
    await budget.uncertain(plan.attemptId, execution);
    await database.db.transaction(async (tx) => {
      const { step } = await lockWriterContextStep(
        tx,
        input.missionId,
        scope.contextId,
        input.ordinal,
      );
      await casWriterStep(tx, {
        missionId: input.missionId,
        contextId: scope.contextId,
        ordinal: input.ordinal,
        expectedRevision: step.revision,
        patch: { state: 'uncertain' },
      });
      await markWriterContextUncertain(tx, input.missionId, scope.childId);
    });
    return { status: 'uncertain', transportInvoked: true };
  }

  await database.db.transaction(async (tx) =>
    finalizeDurableWriterDeliveryInTransaction(tx, {
      missionId: input.missionId,
      contextId: scope.contextId,
      childId: scope.childId,
      ordinal: input.ordinal,
      expectedRevision: plan.revision,
      attemptId: plan.attemptId,
      requestCasHash: plan.requestCasHash,
      resultCasHash,
      responseObjectHash,
      execution,
      usage: transportOutcome.usage,
      telemetry: transportOutcome.telemetry,
    }),
  );

  return {
    status: 'delivered',
    resultCasHash,
    transportInvoked: true,
  };
}

/** Rehydrates a strict provider response body from SQL step pointer and private CAS. */
export async function readDurableWriterMissionResponse(
  database: Database,
  storage: Pick<DocumentStore, 'readStructuredDocument'>,
  input: {
    missionId: string;
    contextId?: string;
    ordinal: number;
    attemptId: string;
    requestSha256: string;
  },
): Promise<string> {
  const contextId = defaultWriterContextId(input.missionId, input.contextId);
  const step = await readWriterMissionStepRow(
    database,
    input.missionId,
    contextId,
    input.ordinal,
  );

  if (!strictReplayStepStates.has(step.state)) {
    throw new WriterMissionCustodyError('invalid_step_state');
  }
  if (step.attemptId !== input.attemptId) {
    throw new WriterMissionCustodyError('invalid_step_state');
  }
  if (step.requestCasHash !== input.requestSha256) {
    throw new WriterMissionCustodyError('invalid_step_state');
  }
  if (!step.responseObjectHash || !step.resultCasHash) {
    throw new WriterMissionCustodyError('invalid_step_state');
  }
  if (step.toolCallId !== null) {
    throw new WriterMissionCustodyError('invalid_step_state');
  }

  const attemptRow = await loadAttempt(database, input.attemptId);
  if (attemptRow.state !== 'settled') {
    throw new WriterMissionCustodyError('invalid_step_state');
  }

  return readDurableWriterProviderResponse(
    storage,
    step.responseObjectHash,
    {
      missionId: input.missionId,
      contextId,
      ordinal: input.ordinal,
      attemptId: input.attemptId,
      requestSha256: input.requestSha256,
    },
    step.resultCasHash,
  );
}
