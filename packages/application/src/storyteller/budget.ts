import { generation } from '@offscreen/db/generation-schema';
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  storytellerAttempt as attempt,
  storytellerFunding as funding,
  storytellerRun as run,
} from '@offscreen/db/storyteller-schema';
import {
  executionPolicySchema,
  reservationForRequest,
  type ExecutionPolicy,
} from '@offscreen/storyteller/tasks';
import { isDeepStrictEqual } from 'node:util';
import type { Transaction } from '../outbox/index';

export class StorytellerBudgetError extends Error {
  constructor(
    public readonly code:
      'budget_unavailable' | 'usage_uncertain' | 'context_too_large',
  ) {
    super(code);
  }
}
type ProviderExecution = Extract<ExecutionPolicy, { mode: 'provider' }>;

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
      execution: ProviderExecution;
      request: unknown;
    }) {
      const execution = executionPolicySchema.parse(input.execution);
      if (execution.mode !== 'provider') {
        throw new StorytellerBudgetError('budget_unavailable');
      }
      let amount: bigint;
      try {
        amount = reservationForRequest(input.request, execution.policy);
      } catch {
        throw new StorytellerBudgetError('context_too_large');
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
            !isDeepStrictEqual(prior.policy, execution.policy)
          ) {
            throw new StorytellerBudgetError('budget_unavailable');
          }
          return prior.state;
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
        await tx.insert(attempt).values({
          id: input.id,
          generationId: input.generationId,
          accountId: account.id,
          runId: allowance.id,
          state: 'reserved',
          reservedMicrousd: amount,
          policy: execution.policy,
        });
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
    async dispatch(id: string, execution: ProviderExecution) {
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
        const [unknown] = await tx
          .select({ id: attempt.id })
          .from(attempt)
          .where(eq(attempt.state, 'uncertain'))
          .limit(1);
        if (account.stopped || !allowance.enabled || unknown) {
          await tx
            .update(attempt)
            .set({ state: 'unsent', chargedMicrousd: 0n })
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
          return false;
        }
        await tx
          .update(attempt)
          .set({ state: 'dispatched' })
          .where(eq(attempt.id, id));
        return true;
      });
    },
    async uncertain(id: string, execution: ProviderExecution) {
      await database.db.transaction(async (tx) => {
        await lockAllowance(tx, execution);
        await tx
          .update(attempt)
          .set({ state: 'uncertain' })
          .where(
            and(
              eq(attempt.id, id),
              eq(attempt.runId, execution.runId),
              eq(attempt.state, 'dispatched'),
            ),
          );
        await tx.update(funding).set({ stopped: true });
      });
    },
    async settle(input: {
      id: string;
      execution: ProviderExecution;
      chargeMicrousd: bigint;
      providerId: string;
      generationOutcome?: {
        state: 'succeeded' | 'failed';
        output: unknown;
        failureCode: string | null;
      };
    }) {
      if (input.chargeMicrousd < 0n) {
        throw new Error('Invalid charge');
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
            record.chargedMicrousd !== input.chargeMicrousd ||
            record.providerId !== input.providerId
          ) {
            throw new Error('Conflicting settlement');
          }
          return;
        }
        if (!['dispatched', 'uncertain'].includes(record.state)) {
          throw new Error('Attempt was not dispatched');
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
        await tx
          .update(attempt)
          .set({
            state: 'settled',
            chargedMicrousd: input.chargeMicrousd,
            providerId: input.providerId,
          })
          .where(eq(attempt.id, record.id));
        await tx
          .update(funding)
          .set({
            reservedMicrousd:
              account.reservedMicrousd - record.reservedMicrousd,
            settledMicrousd: account.settledMicrousd + input.chargeMicrousd,
            stopped:
              account.stopped || input.chargeMicrousd > record.reservedMicrousd,
          })
          .where(eq(funding.id, account.id));
        await tx
          .update(run)
          .set({
            reservedMicrousd:
              allowance.reservedMicrousd - record.reservedMicrousd,
            settledMicrousd: allowance.settledMicrousd + input.chargeMicrousd,
          })
          .where(eq(run.id, allowance.id));
        if (input.chargeMicrousd > record.reservedMicrousd) {
          await tx.update(funding).set({ stopped: true });
        }
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
