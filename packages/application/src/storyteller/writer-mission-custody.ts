/**
 * WR03: writer-mission provider step custody — reserve on storyteller_operation,
 * attempt insert, dispatch/settle/replay without StorytellerTask.
 */
import { createHash } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  storytellerAttempt,
  storytellerFunding,
  storytellerOperation,
  storytellerRun,
  storytellerWriterMission,
  storytellerWriterStep,
} from '@offscreen/db/storyteller-schema';
import type { ExecutionPolicy } from '@offscreen/storyteller/tasks';
import type { ProviderTelemetry, ProviderUsage } from '@offscreen/storyteller/providers/openrouter';
import type { Transaction } from '@offscreen/db/outbox';
import { createStorytellerBudget, StorytellerBudgetError } from './budget';
import type { WriterMissionParentStepInsert } from './writer-mission-store';

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

export type WriterMissionProviderTransport = () => Promise<
  | { kind: 'delivered'; serializedResponse: string }
  | { kind: 'unknown' }
>;

export type AdvanceWriterMissionProviderStepInput = {
  missionId: string;
  ordinal: number;
  attemptId: string;
  expectedRevision: number;
  reservedMicrousd?: bigint;
  reservedInputTokens?: number;
  reservedGeneratedTokens?: number;
  reservedReasoningTokens?: number;
  requestBytes?: number;
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
  | { status: 'held'; reason: string; transportInvoked: false }
  | { status: 'uncertain'; transportInvoked: boolean };

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
    policy: row.policy as Extract<ExecutionPolicy, { mode: 'provider' }>['policy'],
  };
}

async function lockWriterParentStep(
  tx: Transaction,
  missionId: string,
  ordinal: number,
) {
  const [step] = await tx
    .select()
    .from(storytellerWriterStep)
    .where(
      and(
        eq(storytellerWriterStep.missionId, missionId),
        eq(storytellerWriterStep.contextId, missionId),
        eq(storytellerWriterStep.ordinal, ordinal),
      ),
    )
    .for('update');
  if (!step) {
    throw new WriterMissionCustodyError('step_not_found');
  }
  const [mission] = await tx
    .select()
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.id, missionId))
    .for('update');
  if (!mission) {
    throw new WriterMissionCustodyError('mission_not_found');
  }
  return { mission, step };
}

async function casWriterStep(
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
    ordinal: number;
    expectedRevision: number;
    reason: string;
  },
) {
  await casWriterStep(tx, {
    missionId: input.missionId,
    ordinal: input.ordinal,
    expectedRevision: input.expectedRevision,
    patch: { state: 'held' },
  });
  await tx
    .update(storytellerWriterMission)
    .set({ state: 'held', updatedAt: sql`clock_timestamp()` })
    .where(eq(storytellerWriterMission.id, input.missionId));
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
  },
): Promise<'reserved' | typeof storytellerAttempt.$inferSelect.state> {
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
    return prior.state;
  }

  const snapshotMaxMicrousd = BigInt(input.budgetSnapshot.maxMicrousd);
  if (input.reservedMicrousd > snapshotMaxMicrousd) {
    throw new StorytellerBudgetError('budget_unavailable');
  }

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
      input.budgetSnapshot.maxModelRounds ||
    operationRecord.reservedInputTokens +
      operationRecord.consumedInputTokens +
      input.reservedInputTokens >
      Math.min(
        operationRecord.maxInputTokens,
        input.budgetSnapshot.maxInputTokens,
      ) ||
    operationRecord.reservedGeneratedTokens +
      operationRecord.consumedGeneratedTokens +
      input.reservedGeneratedTokens >
      Math.min(
        operationRecord.maxGeneratedTokens,
        input.budgetSnapshot.maxGeneratedTokens,
      ) ||
    operationRecord.reservedMicrousd +
      operationRecord.consumedMicrousd +
      input.reservedMicrousd >
      BigInt(
        operationRecord.maxMicrousd < snapshotMaxMicrousd
          ? operationRecord.maxMicrousd
          : snapshotMaxMicrousd,
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
    account.limitMicrousd -
      account.settledMicrousd -
      account.reservedMicrousd <
      input.reservedMicrousd ||
    allowance.limitMicrousd -
      allowance.settledMicrousd -
      allowance.reservedMicrousd <
      input.reservedMicrousd
  ) {
    throw new StorytellerBudgetError('budget_unavailable');
  }

  const attribution = {
    kind: 'writer-mission.v1' as const,
    missionId: input.missionId,
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
    requestedModel: writerMissionProviderPolicy.model,
    requestedProvider: writerMissionProviderPolicy.provider,
    priceVersion: writerMissionProviderPolicy.priceVersion,
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
    policy: writerMissionProviderPolicy,
  });

  await tx
    .update(storytellerOperation)
    .set({
      reservedRounds: operationRecord.reservedRounds + 1,
      reservedInputTokens:
        operationRecord.reservedInputTokens + input.reservedInputTokens,
      reservedGeneratedTokens:
        operationRecord.reservedGeneratedTokens +
        input.reservedGeneratedTokens,
      reservedReasoningTokens:
        operationRecord.reservedReasoningTokens + input.reservedReasoningTokens,
      reservedMicrousd: operationRecord.reservedMicrousd + input.reservedMicrousd,
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

/**
 * Advances one writer-mission provider step: reserve, optional transport, settle/replay.
 */
export async function advanceWriterMissionProviderStep(
  database: Database,
  input: AdvanceWriterMissionProviderStepInput,
  transport: WriterMissionProviderTransport,
): Promise<AdvanceWriterMissionProviderStepResult> {
  const budget = createStorytellerBudget(database);
  const reservedMicrousd = input.reservedMicrousd ?? 1_000n;
  const reservedInputTokens = input.reservedInputTokens ?? 256;
  const reservedGeneratedTokens = input.reservedGeneratedTokens ?? 256;
  const reservedReasoningTokens = input.reservedReasoningTokens ?? 0;
  const requestBytes = input.requestBytes ?? 128;

  const plan = await database.db.transaction(async (tx) => {
    const { mission, step } = await lockWriterParentStep(
      tx,
      input.missionId,
      input.ordinal,
    );

    if (step.revision !== input.expectedRevision) {
      throw new WriterMissionCustodyError('revision_conflict');
    }

    if (step.attemptId && step.attemptId !== input.attemptId) {
      return holdWriterStep(tx, {
        missionId: input.missionId,
        ordinal: input.ordinal,
        expectedRevision: input.expectedRevision,
        reason: 'attempt_mismatch',
      });
    }

    if (step.state === 'result-settled' || step.state === 'uncertain') {
      return {
        status: 'replayed' as const,
        resultCasHash: step.resultCasHash,
        stepState: step.state,
      };
    }

    if (step.state === 'held' || step.state === 'failed') {
      return {
        status: 'held' as const,
        reason: step.state,
        transportInvoked: false as const,
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
          generationId: mission.generationId,
          operationId: mission.operationId,
          ownerId: String(mission.ownerId),
          storyId: mission.storyId,
          requestCasHash: step.requestCasHash,
          requestBytes,
          reservedMicrousd,
          reservedInputTokens,
          reservedGeneratedTokens,
          reservedReasoningTokens,
          budgetSnapshot:
            mission.budgetSnapshot as WriterMissionBudgetSnapshot,
        });
        if (reserveState !== 'reserved') {
          return {
            status: 'held' as const,
            reason: `attempt_${reserveState}`,
            transportInvoked: false as const,
          };
        }
        const reservedStep = await casWriterStep(tx, {
          missionId: input.missionId,
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
      } catch (error) {
        if (error instanceof StorytellerBudgetError) {
          return holdWriterStep(tx, {
            missionId: input.missionId,
            ordinal: input.ordinal,
            expectedRevision: revision,
            reason: error.code,
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
          ordinal: input.ordinal,
          expectedRevision: revision,
          reason: 'dispatch_failed',
        });
      }
      const dispatchedStep = await casWriterStep(tx, {
        missionId: input.missionId,
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
      status: 'transport' as const,
      attemptId,
      revision,
    };
  });

  if (plan.status === 'replayed') {
    return plan;
  }
  if (plan.status === 'held') {
    return plan;
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
    );
    await database.db.transaction(async (tx) => {
      const { step } = await lockWriterParentStep(
        tx,
        input.missionId,
        input.ordinal,
      );
      await casWriterStep(tx, {
        missionId: input.missionId,
        ordinal: input.ordinal,
        expectedRevision: step.revision,
        patch: { state: 'uncertain' },
      });
      await tx
        .update(storytellerWriterMission)
        .set({ state: 'uncertain', updatedAt: sql`clock_timestamp()` })
        .where(eq(storytellerWriterMission.id, input.missionId));
    });
    return { status: 'uncertain', transportInvoked: true };
  }

  const resultCasHash = hashWriterMissionSerializedResponse(
    transportOutcome.serializedResponse,
  );
  const attemptRow = await loadAttempt(database, plan.attemptId);
  const execution = providerExecutionFromAttempt(attemptRow);
  await budget.settle({
    id: plan.attemptId,
    execution,
    usage: zeroUsage,
    telemetry: zeroTelemetry,
    operationOutcome: 'continue',
  });

  await database.db.transaction(async (tx) => {
    const { step } = await lockWriterParentStep(
      tx,
      input.missionId,
      input.ordinal,
    );
    await casWriterStep(tx, {
      missionId: input.missionId,
      ordinal: input.ordinal,
      expectedRevision: step.revision,
      patch: {
        state: 'result-settled',
        resultCasHash,
        attemptId: plan.attemptId,
      },
    });
    await tx
      .update(storytellerWriterMission)
      .set({ state: 'active', updatedAt: sql`clock_timestamp()` })
      .where(eq(storytellerWriterMission.id, input.missionId));
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