import { generation } from '@offscreen/db/generation-schema';
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  storytellerAttempt as attempt,
  storytellerFunding as funding,
  storytellerOperation as operation,
  storytellerRun as run,
} from '@offscreen/db/storyteller-schema';
import {
  executionPolicySchema,
  reservationForRequest,
  serializedRequestBytes,
  type ExecutionPolicy,
  type StorytellerTask,
} from '@offscreen/storyteller/tasks';
import type {
  ProviderTelemetry,
  ProviderUsage,
  StorytellerProviderDispatch,
} from '@offscreen/storyteller/providers/openrouter';
import { isDeepStrictEqual } from 'node:util';
import type { Transaction } from '../outbox/index';
import {
  markUsageWindows,
  reserveUsageWindows,
  settleUsageWindows,
  UsageWindowError,
} from './window-accounting';

export class StorytellerBudgetError extends Error {
  constructor(
    public readonly code:
      | 'budget_unavailable'
      | 'usage_uncertain'
      | 'context_too_large'
      | 'window_exhausted',
  ) {
    super(code);
  }
}
type ProviderExecution = Extract<ExecutionPolicy, { mode: 'provider' }>;

export type StorytellerDispatchReservation = {
  request: StorytellerProviderDispatch['request'];
  maxSerializedRequestBytes: number;
  maxInputTokens: number;
  maxGeneratedTokens: number;
  maxReasoningTokens: number;
};

function dispatchReservation(
  task: StorytellerTask,
  dispatch?: StorytellerDispatchReservation,
): StorytellerDispatchReservation {
  const reservation = dispatch ?? {
    request: task.request,
    maxSerializedRequestBytes:
      task.resources.envelope.maxSerializedRequestBytes,
    maxInputTokens: task.resources.envelope.maxInputTokens,
    maxGeneratedTokens: task.resources.envelope.maxGeneratedTokens,
    maxReasoningTokens: task.resources.envelope.maxReasoningTokens,
  };
  const envelope = task.resources.envelope;
  const integerLimits = [
    reservation.maxSerializedRequestBytes,
    reservation.maxInputTokens,
    reservation.maxGeneratedTokens,
    reservation.maxReasoningTokens,
  ];
  if (
    integerLimits.some((value) => !Number.isSafeInteger(value) || value < 0) ||
    reservation.maxSerializedRequestBytes >
      envelope.maxSerializedRequestBytes ||
    reservation.maxInputTokens > envelope.maxInputTokens ||
    reservation.maxGeneratedTokens > envelope.maxGeneratedTokens ||
    reservation.maxReasoningTokens > envelope.maxReasoningTokens
  ) {
    throw new StorytellerBudgetError('budget_unavailable');
  }
  return reservation;
}

function taskAttribution(task: StorytellerTask) {
  return {
    storyId: 'storyId' in task.source ? task.source.storyId : null,
    draftId: 'draftId' in task.source ? task.source.draftId : null,
    purpose: task.task,
    profileId: task.profile.id,
    profileRevision: task.profile.revision,
    source: task.source,
    usageAuthority: task.resources.authority,
  };
}

function calculatedCharge(
  execution: ProviderExecution,
  usage: ProviderUsage,
): bigint | null {
  // The current price snapshot has no cache-read/write prices. Returning
  // unknown is safer than presenting a plausible but dimensionally wrong cost.
  if ((usage.cachedTokens ?? 0) > 0 || (usage.cacheWriteTokens ?? 0) > 0) {
    return null;
  }
  const amount =
    BigInt(usage.promptTokens) *
      BigInt(execution.policy.inputMicrousdPerMillion) +
    BigInt(usage.completionTokens) *
      BigInt(execution.policy.outputMicrousdPerMillion);
  return (amount + 999_999n) / 1_000_000n;
}

function estimatedCharge(
  execution: ProviderExecution,
  requestBytes: number,
  reservation: StorytellerDispatchReservation,
) {
  // A tokenizer token represents at least one encoded byte. This is a useful
  // labelled input upper bound, not provider metering or a route tokenizer.
  const estimatedInputTokens = Math.min(
    execution.policy.maxInputTokens,
    reservation.maxInputTokens,
    requestBytes,
  );
  const amount =
    BigInt(estimatedInputTokens) *
      BigInt(execution.policy.inputMicrousdPerMillion) +
    BigInt(reservation.maxGeneratedTokens) *
      BigInt(execution.policy.outputMicrousdPerMillion);
  return {
    inputTokens: estimatedInputTokens,
    microusd: (amount + 999_999n) / 1_000_000n,
    method: 'serialized-byte-upper-bound.v1',
  } as const;
}

async function lockAllowance(tx: Transaction, execution: ProviderExecution) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(714092631)`);
  const [account] = await tx
    .select()
    .from(funding)
    .where(eq(funding.id, execution.accountId))
    .for('update');
  const [allowance] = await tx
    .select()
    .from(run)
    .where(
      and(eq(run.id, execution.runId), eq(run.accountId, execution.accountId)),
    )
    .for('update');
  if (!account || !allowance) {
    throw new StorytellerBudgetError('budget_unavailable');
  }
  return { account, allowance };
}

/** Accounting transactions never acquire story locks. Dispatch is a separate durable boundary. */
export function createStorytellerBudget(database: Database) {
  return {
    async reserve(input: {
      id: string;
      generationId: string;
      ownerId: string;
      task: StorytellerTask;
      dispatch?: StorytellerDispatchReservation;
    }) {
      const { task } = input;
      const execution = executionPolicySchema.parse(task.execution);
      if (execution.mode !== 'provider') {
        throw new StorytellerBudgetError('budget_unavailable');
      }
      const dispatch = dispatchReservation(task, input.dispatch);
      let amount: bigint;
      try {
        amount = reservationForRequest(
          dispatch.request,
          execution.policy,
          dispatch.maxSerializedRequestBytes,
          dispatch.maxInputTokens,
          dispatch.maxGeneratedTokens,
        );
      } catch {
        throw new StorytellerBudgetError('context_too_large');
      }
      if (amount > BigInt(task.resources.envelope.maxMicrousd)) {
        throw new StorytellerBudgetError('budget_unavailable');
      }
      return database.db.transaction(async (tx) => {
        const { account, allowance } = await lockAllowance(tx, execution);
        const [prior] = await tx
          .select()
          .from(attempt)
          .where(eq(attempt.id, input.id));
        if (prior) {
          if (
            prior.generationId !== input.generationId ||
            prior.accountId !== execution.accountId ||
            prior.runId !== execution.runId ||
            prior.requestBytes !== serializedRequestBytes(dispatch.request) ||
            prior.reservedInputTokens !== dispatch.maxInputTokens ||
            prior.reservedGeneratedTokens !== dispatch.maxGeneratedTokens ||
            prior.reservedReasoningTokens !== dispatch.maxReasoningTokens ||
            prior.reservedMicrousd !== amount ||
            !isDeepStrictEqual(prior.policy, execution.policy)
          ) {
            throw new StorytellerBudgetError('budget_unavailable');
          }
          return prior.state;
        }
        const envelope = task.resources.envelope;
        let [operationRecord] = await tx
          .select()
          .from(operation)
          .where(eq(operation.generationId, input.generationId))
          .for('update');
        if (!operationRecord) {
          [operationRecord] = await tx
            .insert(operation)
            .values({
              generationId: input.generationId,
              accountId: account.id,
              runId: allowance.id,
              ownerId: input.ownerId,
              purpose: task.task,
              resources: task.resources,
              maxModelRounds: task.resources.recipe.maxModelRounds,
              maxInputTokens: envelope.maxInputTokens,
              maxGeneratedTokens: envelope.maxGeneratedTokens,
              maxReasoningTokens: envelope.maxReasoningTokens,
              maxMicrousd: BigInt(envelope.maxMicrousd),
            })
            .returning();
        }
        if (
          !operationRecord ||
          operationRecord.accountId !== account.id ||
          operationRecord.runId !== allowance.id ||
          operationRecord.ownerId !== input.ownerId ||
          operationRecord.purpose !== task.task ||
          !isDeepStrictEqual(operationRecord.resources, task.resources)
        ) {
          throw new StorytellerBudgetError('budget_unavailable');
        }
        if (
          operationRecord.state !== 'open' ||
          operationRecord.reservedRounds + operationRecord.dispatchedRounds >=
            operationRecord.maxModelRounds ||
          operationRecord.reservedInputTokens +
            operationRecord.consumedInputTokens +
            dispatch.maxInputTokens >
            operationRecord.maxInputTokens ||
          operationRecord.reservedGeneratedTokens +
            operationRecord.consumedGeneratedTokens +
            dispatch.maxGeneratedTokens >
            operationRecord.maxGeneratedTokens ||
          operationRecord.reservedReasoningTokens +
            operationRecord.consumedReasoningTokens +
            dispatch.maxReasoningTokens >
            operationRecord.maxReasoningTokens ||
          operationRecord.reservedMicrousd +
            operationRecord.consumedMicrousd +
            amount >
            operationRecord.maxMicrousd
        ) {
          throw new StorytellerBudgetError('budget_unavailable');
        }
        // Any unresolved dispatched attempt across funding scopes stops new paid admission.
        const [unknown] = await tx
          .select({ id: attempt.id })
          .from(attempt)
          .where(eq(attempt.state, 'uncertain'))
          .limit(1);
        if (unknown) {
          throw new StorytellerBudgetError('usage_uncertain');
        }
        if (
          account.stopped ||
          !allowance.enabled ||
          allowance.admittedAttempts >= allowance.maxAttempts ||
          account.limitMicrousd -
            account.settledMicrousd -
            account.reservedMicrousd <
            amount ||
          allowance.limitMicrousd -
            allowance.settledMicrousd -
            allowance.reservedMicrousd <
            amount
        ) {
          throw new StorytellerBudgetError('budget_unavailable');
        }
        const attribution = taskAttribution(task);
        const requestBytes = serializedRequestBytes(dispatch.request);
        const estimate = estimatedCharge(execution, requestBytes, dispatch);
        await tx.insert(attempt).values({
          id: input.id,
          generationId: input.generationId,
          accountId: account.id,
          runId: allowance.id,
          ownerId: input.ownerId,
          storyId: attribution.storyId,
          draftId: attribution.draftId,
          purpose: task.task,
          storytellerProfileId: task.profile.id,
          storytellerProfileRevision: task.profile.revision,
          taskInputVersion: task.inputVersion,
          promptVersion: task.promptVersion,
          recipeVersion: task.resources.recipe.version,
          resourcePolicyVersion: task.resources.version,
          requestedModel: execution.policy.model,
          requestedProvider: execution.policy.provider,
          priceVersion: execution.policy.priceVersion,
          attribution,
          state: 'reserved',
          reservedMicrousd: amount,
          reservedInputTokens: dispatch.maxInputTokens,
          reservedGeneratedTokens: dispatch.maxGeneratedTokens,
          reservedReasoningTokens: dispatch.maxReasoningTokens,
          estimatedMicrousd: estimate.microusd,
          estimatedInputTokens: estimate.inputTokens,
          estimationMethod: estimate.method,
          reconciliation: 'pending',
          requestBytes,
          policy: execution.policy,
        });
        await tx
          .update(operation)
          .set({
            reservedRounds: operationRecord.reservedRounds + 1,
            reservedInputTokens:
              operationRecord.reservedInputTokens + dispatch.maxInputTokens,
            reservedGeneratedTokens:
              operationRecord.reservedGeneratedTokens +
              dispatch.maxGeneratedTokens,
            reservedReasoningTokens:
              operationRecord.reservedReasoningTokens +
              dispatch.maxReasoningTokens,
            reservedMicrousd: operationRecord.reservedMicrousd + amount,
            updatedAt: sql`clock_timestamp()`,
          })
          .where(eq(operation.generationId, input.generationId));
        if (task.resources.authority.kind !== 'effective-usage-policy') {
          throw new StorytellerBudgetError('budget_unavailable');
        }
        try {
          await reserveUsageWindows(tx, {
            attemptId: input.id,
            accountId: account.id,
            task,
            policy: task.resources.authority.policy,
            reservedMicrousd: amount,
            reservedInputTokens: dispatch.maxInputTokens,
            reservedGeneratedTokens: dispatch.maxGeneratedTokens,
          });
        } catch (error) {
          if (error instanceof UsageWindowError) {
            throw new StorytellerBudgetError('window_exhausted');
          }
          throw error;
        }
        await tx
          .update(funding)
          .set({ reservedMicrousd: account.reservedMicrousd + amount })
          .where(eq(funding.id, account.id));
        await tx
          .update(run)
          .set({
            reservedMicrousd: allowance.reservedMicrousd + amount,
            admittedAttempts: allowance.admittedAttempts + 1,
          })
          .where(eq(run.id, allowance.id));
        return 'reserved' as const;
      });
    },
    async dispatch(
      id: string,
      execution: ProviderExecution,
      authorityGranted: boolean,
    ) {
      return database.db.transaction(async (tx) => {
        const { account, allowance } = await lockAllowance(tx, execution);
        const [record] = await tx
          .select()
          .from(attempt)
          .where(and(eq(attempt.id, id), eq(attempt.runId, allowance.id)))
          .for('update');
        if (!record || record.state !== 'reserved') {
          return false;
        }
        const [operationRecord] = await tx
          .select()
          .from(operation)
          .where(eq(operation.generationId, record.generationId))
          .for('update');
        if (!operationRecord) {
          throw new Error('Missing Storyteller operation');
        }
        const [unknown] = await tx
          .select({ id: attempt.id })
          .from(attempt)
          .where(eq(attempt.state, 'uncertain'))
          .limit(1);
        if (
          !authorityGranted ||
          account.stopped ||
          !allowance.enabled ||
          unknown
        ) {
          await tx
            .update(attempt)
            .set({
              state: 'unsent',
              chargedMicrousd: 0n,
              reconciliation: 'unavailable',
              settledAt: sql`clock_timestamp()`,
            })
            .where(eq(attempt.id, id));
          await tx
            .update(funding)
            .set({
              reservedMicrousd:
                account.reservedMicrousd - record.reservedMicrousd,
            })
            .where(eq(funding.id, account.id));
          await tx
            .update(run)
            .set({
              reservedMicrousd:
                allowance.reservedMicrousd - record.reservedMicrousd,
            })
            .where(eq(run.id, allowance.id));
          await tx
            .update(operation)
            .set({
              reservedRounds: operationRecord.reservedRounds - 1,
              reservedInputTokens:
                operationRecord.reservedInputTokens -
                record.reservedInputTokens,
              reservedGeneratedTokens:
                operationRecord.reservedGeneratedTokens -
                record.reservedGeneratedTokens,
              reservedReasoningTokens:
                operationRecord.reservedReasoningTokens -
                record.reservedReasoningTokens,
              reservedMicrousd:
                operationRecord.reservedMicrousd - record.reservedMicrousd,
              updatedAt: sql`clock_timestamp()`,
            })
            .where(eq(operation.generationId, record.generationId));
          await markUsageWindows(tx, record.id, 'released');
          return false;
        }
        await tx
          .update(attempt)
          .set({ state: 'dispatched', dispatchedAt: sql`clock_timestamp()` })
          .where(eq(attempt.id, id));
        await tx
          .update(operation)
          .set({
            reservedRounds: operationRecord.reservedRounds - 1,
            dispatchedRounds: operationRecord.dispatchedRounds + 1,
            updatedAt: sql`clock_timestamp()`,
          })
          .where(eq(operation.generationId, record.generationId));
        await markUsageWindows(tx, record.id, 'dispatched');
        return true;
      });
    },
    async uncertain(
      id: string,
      execution: ProviderExecution,
      telemetry?: ProviderTelemetry,
    ) {
      await database.db.transaction(async (tx) => {
        await lockAllowance(tx, execution);
        const [record] = await tx
          .select({ generationId: attempt.generationId })
          .from(attempt)
          .where(
            and(
              eq(attempt.id, id),
              eq(attempt.runId, execution.runId),
              eq(attempt.state, 'dispatched'),
            ),
          )
          .for('update');
        await tx
          .update(attempt)
          .set({
            state: 'uncertain',
            reconciliation: 'unknown',
            durationMs: telemetry?.durationMs,
            httpStatus: telemetry?.httpStatus,
            providerId: telemetry?.providerId,
            reportedModel: telemetry?.reportedModel,
            finishReason: telemetry?.finishReason,
          })
          .where(
            and(
              eq(attempt.id, id),
              eq(attempt.runId, execution.runId),
              eq(attempt.state, 'dispatched'),
            ),
          );
        await markUsageWindows(tx, id, 'uncertain');
        if (record) {
          await tx
            .update(operation)
            .set({ state: 'uncertain', updatedAt: sql`clock_timestamp()` })
            .where(eq(operation.generationId, record.generationId));
        }
        await tx.update(funding).set({ stopped: true });
      });
    },
    async settle(input: {
      id: string;
      execution: ProviderExecution;
      usage: ProviderUsage;
      telemetry: ProviderTelemetry;
      generationOutcome?: {
        state: 'succeeded' | 'failed';
        output: unknown;
        failureCode: string | null;
      };
      operationOutcome?: 'continue' | 'complete';
    }) {
      if (input.usage.reportedCostMicrousd < 0n) {
        throw new Error('Invalid charge');
      }
      const operationOutcome = input.operationOutcome ?? 'complete';
      if (operationOutcome === 'continue' && input.generationOutcome) {
        throw new Error('Intermediate settlement cannot finish generation');
      }
      return database.db.transaction(async (tx) => {
        const { account, allowance } = await lockAllowance(tx, input.execution);
        const [record] = await tx
          .select()
          .from(attempt)
          .where(and(eq(attempt.id, input.id), eq(attempt.runId, allowance.id)))
          .for('update');
        if (!record) {
          throw new Error('Missing budget attempt');
        }
        if (record.state === 'settled') {
          if (
            record.chargedMicrousd !== input.usage.reportedCostMicrousd ||
            record.providerId !== input.telemetry.providerId ||
            record.promptTokens !== input.usage.promptTokens ||
            record.completionTokens !== input.usage.completionTokens ||
            record.reasoningTokens !== input.usage.reasoningTokens ||
            record.cachedTokens !== input.usage.cachedTokens ||
            record.cacheWriteTokens !== input.usage.cacheWriteTokens ||
            record.totalTokens !== input.usage.totalTokens ||
            record.reportedModel !== input.telemetry.reportedModel ||
            record.finishReason !== input.telemetry.finishReason ||
            record.httpStatus !== input.telemetry.httpStatus ||
            record.durationMs !== input.telemetry.durationMs
          ) {
            throw new Error('Conflicting settlement');
          }
          return;
        }
        if (!['dispatched', 'uncertain'].includes(record.state)) {
          throw new Error('Attempt was not dispatched');
        }
        const [operationRecord] = await tx
          .select()
          .from(operation)
          .where(eq(operation.generationId, record.generationId))
          .for('update');
        if (!operationRecord) {
          throw new Error('Missing Storyteller operation');
        }
        if (input.generationOutcome) {
          await tx
            .update(generation)
            .set({
              ...input.generationOutcome,
              updatedAt: sql`clock_timestamp()`,
              statusRevision: sql`${generation.statusRevision} + 1`,
            })
            .where(
              and(
                eq(generation.id, record.generationId),
                eq(generation.attemptId, record.id),
              ),
            );
        }
        const calculatedMicrousd = calculatedCharge(
          input.execution,
          input.usage,
        );
        const reconciliation =
          calculatedMicrousd === null
            ? 'unavailable'
            : calculatedMicrousd === input.usage.reportedCostMicrousd
              ? 'matched'
              : 'different';
        await tx
          .update(attempt)
          .set({
            state: 'settled',
            chargedMicrousd: input.usage.reportedCostMicrousd,
            calculatedMicrousd,
            reconciliation,
            promptTokens: input.usage.promptTokens,
            completionTokens: input.usage.completionTokens,
            reasoningTokens: input.usage.reasoningTokens,
            cachedTokens: input.usage.cachedTokens,
            cacheWriteTokens: input.usage.cacheWriteTokens,
            totalTokens: input.usage.totalTokens,
            providerId: input.telemetry.providerId,
            reportedModel: input.telemetry.reportedModel,
            finishReason: input.telemetry.finishReason,
            httpStatus: input.telemetry.httpStatus,
            durationMs: input.telemetry.durationMs,
            settledAt: sql`clock_timestamp()`,
          })
          .where(eq(attempt.id, record.id));
        await tx
          .update(funding)
          .set({
            reservedMicrousd:
              account.reservedMicrousd - record.reservedMicrousd,
            settledMicrousd:
              account.settledMicrousd + input.usage.reportedCostMicrousd,
            stopped:
              account.stopped ||
              input.usage.reportedCostMicrousd > record.reservedMicrousd,
          })
          .where(eq(funding.id, account.id));
        await tx
          .update(run)
          .set({
            reservedMicrousd:
              allowance.reservedMicrousd - record.reservedMicrousd,
            settledMicrousd:
              allowance.settledMicrousd + input.usage.reportedCostMicrousd,
          })
          .where(eq(run.id, allowance.id));
        const consumedInputTokens =
          operationRecord.consumedInputTokens + input.usage.promptTokens;
        const consumedGeneratedTokens =
          operationRecord.consumedGeneratedTokens +
          input.usage.completionTokens;
        const consumedReasoningTokens =
          operationRecord.consumedReasoningTokens +
          (input.usage.reasoningTokens ?? 0);
        const consumedMicrousd =
          operationRecord.consumedMicrousd + input.usage.reportedCostMicrousd;
        const operationExceeded =
          consumedInputTokens > operationRecord.maxInputTokens ||
          consumedGeneratedTokens > operationRecord.maxGeneratedTokens ||
          consumedReasoningTokens > operationRecord.maxReasoningTokens ||
          consumedMicrousd > operationRecord.maxMicrousd;
        await tx
          .update(operation)
          .set({
            state: operationExceeded
              ? 'exhausted'
              : operationOutcome === 'complete'
                ? 'complete'
                : 'open',
            reservedInputTokens:
              operationRecord.reservedInputTokens - record.reservedInputTokens,
            consumedInputTokens,
            reservedGeneratedTokens:
              operationRecord.reservedGeneratedTokens -
              record.reservedGeneratedTokens,
            consumedGeneratedTokens,
            reservedReasoningTokens:
              operationRecord.reservedReasoningTokens -
              record.reservedReasoningTokens,
            consumedReasoningTokens,
            reservedMicrousd:
              operationRecord.reservedMicrousd - record.reservedMicrousd,
            consumedMicrousd,
            updatedAt: sql`clock_timestamp()`,
          })
          .where(eq(operation.generationId, record.generationId));
        const exceededUsageWindow = await settleUsageWindows(
          tx,
          record.id,
          input.usage,
        );
        // A known operation-local overrun exhausts that immutable operation,
        // but its already bounded, settled charge is not an unresolved account
        // liability. Stop shared funding only when the provider exceeded the
        // monetary reservation or a shared usage-window reservation.
        if (
          input.usage.reportedCostMicrousd > record.reservedMicrousd ||
          exceededUsageWindow
        ) {
          await tx.update(funding).set({ stopped: true });
        }
      });
    },
    /**
     * Close a multi-round operation after deterministic work fails between
     * paid rounds. This never releases or reconciles an attempt liability.
     */
    async completeOperation(
      generationId: string,
      execution: ProviderExecution,
    ) {
      return database.db.transaction(async (tx) => {
        const { account, allowance } = await lockAllowance(tx, execution);
        const [record] = await tx
          .select()
          .from(operation)
          .where(eq(operation.generationId, generationId))
          .for('update');
        if (!record) return 'missing' as const;
        if (record.accountId !== account.id || record.runId !== allowance.id) {
          throw new StorytellerBudgetError('budget_unavailable');
        }
        if (record.state === 'complete') return 'complete' as const;
        if (record.state !== 'open') {
          throw new StorytellerBudgetError(
            record.state === 'uncertain'
              ? 'usage_uncertain'
              : 'budget_unavailable',
          );
        }
        if (
          record.reservedRounds !== 0 ||
          record.reservedInputTokens !== 0 ||
          record.reservedGeneratedTokens !== 0 ||
          record.reservedReasoningTokens !== 0 ||
          record.reservedMicrousd !== 0n
        ) {
          throw new StorytellerBudgetError('usage_uncertain');
        }
        await tx
          .update(operation)
          .set({ state: 'complete', updatedAt: sql`clock_timestamp()` })
          .where(
            and(
              eq(operation.generationId, generationId),
              eq(operation.state, 'open'),
            ),
          );
        return 'complete' as const;
      });
    },
    async attemptState(id: string) {
      const [record] = await database.db
        .select({ state: attempt.state })
        .from(attempt)
        .where(eq(attempt.id, id));
      return record?.state;
    },
    async stop(accountId: string) {
      await database.db
        .update(funding)
        .set({ stopped: true })
        .where(eq(funding.id, accountId));
    },
    async inspect(accountId: string) {
      const [account] = await database.db
        .select()
        .from(funding)
        .where(eq(funding.id, accountId));
      if (!account) {
        throw new Error('Unknown funding account');
      }
      return {
        ...account,
        availableMicrousd:
          account.limitMicrousd -
          account.settledMicrousd -
          account.reservedMicrousd,
      };
    },
  };
}
