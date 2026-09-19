import { and, eq, inArray, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import {
  validateStorytellerResult,
  type StorytellerTask,
} from '@offscreen/storyteller/tasks';
import { scriptedStorytellerResult } from '@offscreen/storyteller/fixtures';
import type { StorytellerProvider } from '@offscreen/storyteller/providers/openrouter';
import {
  effectiveUsagePolicySchema,
  type EffectiveUsagePolicy,
} from '@offscreen/contracts/usage-policy';
import { isDeepStrictEqual } from 'node:util';
import { createStorytellerBudget, StorytellerBudgetError } from './budget';

export type StorytellerRuntimeOptions = {
  provider?: StorytellerProvider;
  scriptedSource?: (task: StorytellerTask) => unknown | Promise<unknown>;
  realDurationMs?: (gameDurationMs: number) => number;
  /** Resolves current server authority immediately before transport. */
  dispatchAuthority?: (input: {
    generationId: string;
    ownerId: string;
    task: StorytellerTask;
  }) => EffectiveUsagePolicy | null | Promise<EffectiveUsagePolicy | null>;
};

function retainsCapturedAuthority(
  task: StorytellerTask,
  current: EffectiveUsagePolicy | null,
) {
  if (task.resources.authority.kind !== 'effective-usage-policy' || !current) {
    return false;
  }
  return isDeepStrictEqual(
    task.resources.authority.policy,
    effectiveUsagePolicySchema.parse(current),
  );
}

export function createStorytellerExecution(
  database: Database,
  options: StorytellerRuntimeOptions,
) {
  const budget = createStorytellerBudget(database);
  const scriptedSource = options.scriptedSource ?? scriptedStorytellerResult;
  async function saveOutcome(
    id: string,
    attemptId: string,
    outcome:
      | { state: 'succeeded'; output: unknown }
      | { state: 'failed' | 'uncertain'; failureCode?: string },
  ) {
    await database.db
      .update(generation)
      .set({
        state: outcome.state,
        output: outcome.state === 'succeeded' ? outcome.output : null,
        failureCode:
          outcome.state === 'failed'
            ? (outcome.failureCode ?? 'invalid_output')
            : null,
        updatedAt: sql`clock_timestamp()`,
        statusRevision: sql`${generation.statusRevision} + 1`,
      })
      .where(
        and(
          eq(generation.id, id),
          eq(generation.attemptId, attemptId),
          inArray(generation.state, ['running', 'uncertain']),
        ),
      );
  }

  async function generate(
    record: typeof generation.$inferSelect,
    task: StorytellerTask,
  ) {
    const attemptId = record.attemptId ?? randomUUID();
    if (record.state === 'pending') {
      const claimed = await database.db
        .update(generation)
        .set({
          state: 'running',
          attemptId,
          updatedAt: sql`clock_timestamp()`,
          statusRevision: sql`${generation.statusRevision} + 1`,
        })
        .where(
          and(eq(generation.id, record.id), eq(generation.state, 'pending')),
        )
        .returning({ id: generation.id });
      if (!claimed.length) {
        return;
      }
    }
    if (task.execution.mode === 'scripted') {
      // This injected contract is explicitly side-effect-free; duplicate delivery may recompute it.
      let output: unknown;
      try {
        output = validateStorytellerResult(task, await scriptedSource(task));
      } catch {
        await saveOutcome(record.id, attemptId, {
          state: 'failed',
          failureCode: 'invalid_output',
        });
        return;
      }
      await saveOutcome(record.id, attemptId, { state: 'succeeded', output });
      return;
    }
    if (!options.provider) {
      await saveOutcome(record.id, attemptId, {
        state: 'failed',
        failureCode: 'provider_disabled',
      });
      return;
    }
    try {
      const state = await budget.reserve({
        id: attemptId,
        generationId: record.id,
        ownerId: record.ownerId,
        task,
      });
      if (state === 'settled') {
        return;
      }
      if (state === 'unsent') {
        await saveOutcome(record.id, attemptId, {
          state: 'failed',
          failureCode: 'budget_unavailable',
        });
        return;
      }
      if (state !== 'reserved') {
        await budget.uncertain(attemptId, task.execution);
        await saveOutcome(record.id, attemptId, { state: 'uncertain' });
        return;
      }
      let authorityGranted = false;
      try {
        authorityGranted = retainsCapturedAuthority(
          task,
          (await options.dispatchAuthority?.({
            generationId: record.id,
            ownerId: record.ownerId,
            task,
          })) ?? null,
        );
      } catch {
        // Resolver failure is denial. It must not turn into an uncertain call.
      }
      if (
        !(await budget.dispatch(attemptId, task.execution, authorityGranted))
      ) {
        // A racing delivery could already have dispatched. Inspect, never assume no charge.
        const stateNow = await budget.attemptState(attemptId);
        if (stateNow === 'unsent') {
          await saveOutcome(record.id, attemptId, {
            state: 'failed',
            failureCode: authorityGranted
              ? 'budget_unavailable'
              : 'authority_unavailable',
          });
        }
        return;
      }
      let outcome;
      try {
        outcome = await options.provider(task);
      } catch {
        outcome = {
          kind: 'uncertain' as const,
          telemetry: {
            durationMs: null,
            httpStatus: null,
            providerId: null,
            reportedModel: null,
            finishReason: null,
          },
        };
      }
      if (outcome.kind === 'uncertain') {
        await budget.uncertain(attemptId, task.execution, outcome.telemetry);
        await saveOutcome(record.id, attemptId, { state: 'uncertain' });
        return;
      }
      let output: unknown = null;
      let failureCode = outcome.kind === 'failed' ? outcome.failureCode : null;
      if (outcome.kind === 'result') {
        try {
          output = validateStorytellerResult(task, outcome.output);
        } catch {
          failureCode = 'invalid_output';
        }
      }
      await budget.settle({
        id: attemptId,
        execution: task.execution,
        usage: outcome.usage,
        telemetry: outcome.telemetry,
        generationOutcome: failureCode
          ? { state: 'failed', output: null, failureCode }
          : { state: 'succeeded', output, failureCode: null },
      });
    } catch (error) {
      if (!(error instanceof StorytellerBudgetError)) {
        throw error;
      }
      await saveOutcome(record.id, attemptId, {
        state: 'failed',
        failureCode: error.code,
      });
    }
  }

  return { execute: generate };
}
