import { and, eq, inArray, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import {
  diagnoseStorytellerResult,
  prepareStorytellerRepairRequest,
  storytellerOutputDiagnosticSchema,
  validateStorytellerResult,
  type StorytellerTask,
} from '@offscreen/storyteller/tasks';
import { scriptedStorytellerResult } from '@offscreen/storyteller/fixtures';
import type {
  StorytellerProvider,
  StorytellerProviderDispatch,
} from '@offscreen/storyteller/providers/openrouter';
import type { EffectiveUsagePolicy } from '@offscreen/contracts/usage-policy';
import { createStorytellerBudget, StorytellerBudgetError } from './budget';
import { prepareReviewedDispatch } from './dispatch-review';
import { retainsCapturedAuthority } from './dispatch-authority';
import type { DocumentStore } from '@offscreen/documents';
import { createLexicalStoryIndexCache } from './lexical-story-index-cache';
import type { LexicalStoryIndexCache } from './lexical-story-index-cache';
import { createCanonicalMemoryExplorer } from './memory-exploration';
import {
  MemoryExplorationControllerError,
  runMemoryExploration,
} from './memory-exploration-controller';
import { createMemoryProviderRoundRuntime } from './memory-provider-runtime';
import { resolveStoryRetrievalRecipe } from './retrieval-recipes';
import { recordExecutionStage } from './execution-stages';

export type StorytellerRuntimeOptions = {
  provider?: StorytellerProvider;
  scriptedSource?: (task: StorytellerTask) => unknown | Promise<unknown>;
  scriptedGate?: (input: {
    generationId: string;
    task: StorytellerTask;
  }) => 'proceed' | 'hold' | 'fail' | Promise<'proceed' | 'hold' | 'fail'>;
  realDurationMs?: (gameDurationMs: number) => number;
  documentStore?: DocumentStore;
  /**
   * Optional root-keyed lexical index reuse for memory exploration.
   * Defaults to a process-local LRU when omitted.
   */
  lexicalIndexCache?: LexicalStoryIndexCache;
  /** Resolves current server authority immediately before transport. */
  dispatchAuthority?: (input: {
    generationId: string;
    ownerId: string;
    task: StorytellerTask;
  }) => EffectiveUsagePolicy | null | Promise<EffectiveUsagePolicy | null>;
};

export function createStorytellerExecution(
  database: Database,
  options: StorytellerRuntimeOptions,
) {
  const budget = createStorytellerBudget(database);
  const scriptedSource = options.scriptedSource ?? scriptedStorytellerResult;
  const lexicalIndexCache =
    options.lexicalIndexCache ??
    createLexicalStoryIndexCache({ maxEntries: 8 });
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
      await recordExecutionStage(database.db, {
        generationId: record.id,
        stage: 'task-prepared',
        outcome: 'completed',
        idempotencyKey: `task-prepared:${attemptId}`,
        attemptId,
        sourceKind: 'generation',
        sourceId: record.id,
      });
      await recordExecutionStage(database.db, {
        generationId: record.id,
        stage: 'stage-skipped',
        outcome: 'not-run',
        idempotencyKey: `provider-skipped:scripted:${attemptId}`,
        attemptId,
        sourceKind: 'none',
        failureClass: 'scripted_execution',
      });
      const gate =
        (await options.scriptedGate?.({
          generationId: record.id,
          task,
        })) ?? 'proceed';
      if (gate === 'hold') {
        await recordExecutionStage(database.db, {
          generationId: record.id,
          stage: 'stage-held',
          outcome: 'held',
          idempotencyKey: `held:scripted:${attemptId}`,
          attemptId,
          sourceKind: 'generation',
          sourceId: record.id,
          failureClass: 'scripted_hold',
        });
        return 'held' as const;
      }
      if (gate === 'fail') {
        await saveOutcome(record.id, attemptId, {
          state: 'failed',
          failureCode: 'chamber_injected_failure',
        });
        await recordExecutionStage(database.db, {
          generationId: record.id,
          stage: 'validation-settled',
          outcome: 'failed',
          idempotencyKey: `validation:${attemptId}`,
          attemptId,
          sourceKind: 'generation',
          sourceId: record.id,
          failureClass: 'chamber_injected_failure',
        });
        return;
      }
      // This injected contract is explicitly side-effect-free; duplicate delivery may recompute it.
      let output: unknown;
      try {
        output = validateStorytellerResult(task, await scriptedSource(task));
      } catch {
        await saveOutcome(record.id, attemptId, {
          state: 'failed',
          failureCode: 'invalid_output',
        });
        await recordExecutionStage(database.db, {
          generationId: record.id,
          stage: 'validation-settled',
          outcome: 'failed',
          idempotencyKey: `validation:${attemptId}`,
          attemptId,
          sourceKind: 'generation',
          sourceId: record.id,
          failureClass: 'invalid_output',
        });
        return;
      }
      await saveOutcome(record.id, attemptId, { state: 'succeeded', output });
      await recordExecutionStage(database.db, {
        generationId: record.id,
        stage: 'validation-settled',
        outcome: 'completed',
        idempotencyKey: `validation:${attemptId}`,
        attemptId,
        sourceKind: 'generation',
        sourceId: record.id,
      });
      return;
    }
    if (task.resources.recipe.version === 'memory-exploration.v1') {
      if (!options.provider || !options.documentStore) {
        await saveOutcome(record.id, attemptId, {
          state: 'failed',
          failureCode: options.provider
            ? 'memory_store_disabled'
            : 'provider_disabled',
        });
        return;
      }
      if (!('storyId' in task.source) || !task.context.canonicalKnowledge) {
        await saveOutcome(record.id, attemptId, {
          state: 'failed',
          failureCode: 'memory_context_unavailable',
        });
        return;
      }
      const root = task.context.canonicalKnowledge;
      const retrievalRecipe = resolveStoryRetrievalRecipe({
        posture:
          task.resources.creativeExploration.posture === 'off'
            ? 'minimal'
            : task.resources.creativeExploration.posture,
        operationLimits: {
          maxReads: task.resources.recipe.maxReads,
          maxRetainedBytes: task.resources.recipe.maxRetainedReadBytes,
        },
      });
      const { index } = await lexicalIndexCache.resolve(options.documentStore, {
        storyId: task.source.storyId,
        rootHash: root.rootHash,
        rootRevision: root.rootRevision,
      });
      const providerRuntime = createMemoryProviderRoundRuntime(database, {
        generationId: record.id,
        ownerId: record.ownerId,
        task,
        provider: options.provider,
        dispatchAuthority: async (input) =>
          (await options.dispatchAuthority?.(input)) ?? null,
      });
      try {
        const completed = await runMemoryExploration(database, {
          generationId: record.id,
          task,
          createExplorer: (snapshot) =>
            createCanonicalMemoryExplorer({
              storage: options.documentStore!,
              index,
              recipe: retrievalRecipe,
              creativeExploration: task.resources.creativeExploration,
              ...(snapshot ? { snapshot } : {}),
            }),
          ...providerRuntime,
        });
        await saveOutcome(record.id, attemptId, {
          state: 'succeeded',
          output: completed.output,
        });
      } catch (error) {
        if (!(error instanceof MemoryExplorationControllerError)) throw error;
        if (error.code === 'review-held') return 'held' as const;
        await saveOutcome(record.id, attemptId, {
          state:
            error.code === 'usage-uncertain' ||
            error.code === 'provider-uncertain'
              ? 'uncertain'
              : 'failed',
          failureCode: error.code.replaceAll('-', '_'),
        });
      }
      return;
    }
    const repairable = task.resources.recipe.version === 'repairable-turn.v1';
    const hasRepairEvidence =
      record.repairCandidate !== null || record.repairDiagnostic !== null;
    if (
      hasRepairEvidence &&
      (!repairable ||
        record.repairCandidate === null ||
        record.repairDiagnostic === null)
    ) {
      throw new Error('Invalid Storyteller repair evidence');
    }
    const repairing = repairable && hasRepairEvidence;
    const request = repairing
      ? prepareStorytellerRepairRequest({
          task,
          candidate: record.repairCandidate,
          diagnostic: storytellerOutputDiagnosticSchema.parse(
            record.repairDiagnostic,
          ),
        })
      : task.request;
    const roundCount = repairable ? 2 : 1;
    const providerDispatch: StorytellerProviderDispatch = {
      request,
      maxGeneratedTokens: Math.max(
        1,
        Math.floor(task.resources.envelope.maxGeneratedTokens / roundCount),
      ),
    };
    const reviewed = await prepareReviewedDispatch(
      database,
      record.id,
      attemptId,
      task,
      providerDispatch,
      options.provider,
    );
    if (reviewed.disposition === 'held' || reviewed.disposition === 'stopped') {
      return reviewed.disposition;
    }
    if (!options.provider) {
      await saveOutcome(record.id, attemptId, {
        state: 'failed',
        failureCode: 'provider_disabled',
      });
      return;
    }
    if (reviewed.disposition === 'wire-refused') {
      // OBS00-C: refused before reserve/dispatch. No HTTP, no liability, and
      // the persisted review row is left exactly as approved.
      await saveOutcome(record.id, attemptId, {
        state: 'failed',
        failureCode: 'wire_mismatch',
      });
      return;
    }
    const wireDispatch = reviewed.dispatch;
    try {
      const state = await budget.reserve({
        id: attemptId,
        generationId: record.id,
        ownerId: record.ownerId,
        task,
        dispatch: {
          request,
          maxSerializedRequestBytes:
            task.resources.envelope.maxSerializedRequestBytes,
          maxInputTokens: Math.min(
            task.execution.policy.maxInputTokens,
            task.resources.authority.kind === 'effective-usage-policy'
              ? task.resources.authority.policy.limits.maxInputTokensPerRequest
              : task.execution.policy.maxInputTokens,
          ),
          maxGeneratedTokens: providerDispatch.maxGeneratedTokens,
          maxReasoningTokens: Math.floor(
            task.resources.envelope.maxReasoningTokens / roundCount,
          ),
        },
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
        outcome = await options.provider(task, wireDispatch);
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
      if (
        outcome.kind === 'failed' &&
        outcome.failureCode === 'provider_unavailable'
      ) {
        await budget.confirmUnsent(
          attemptId,
          task.execution,
          outcome.telemetry,
        );
        await saveOutcome(record.id, attemptId, {
          state: 'failed',
          failureCode: 'provider_unavailable',
        });
        return;
      }
      let output: unknown = null;
      let failureCode = outcome.kind === 'failed' ? outcome.failureCode : null;
      let repairCandidate: unknown = null;
      let repairDiagnostic: unknown = null;
      if (outcome.kind === 'result') {
        try {
          output = validateStorytellerResult(task, outcome.output);
        } catch {
          failureCode = 'invalid_output';
          if (task.resources.recipe.version === 'repairable-turn.v1') {
            repairCandidate = outcome.output;
            repairDiagnostic = diagnoseStorytellerResult(task, outcome.output);
          }
        }
      }
      await budget.settle({
        id: attemptId,
        execution: task.execution,
        usage: outcome.usage,
        telemetry: outcome.telemetry,
        generationOutcome: failureCode
          ? {
              state: 'failed',
              output: null,
              failureCode,
              repairCandidate,
              repairDiagnostic,
            }
          : {
              state: 'succeeded',
              output,
              failureCode: null,
              repairCandidate: null,
              repairDiagnostic: null,
            },
        operationOutcome:
          !repairing &&
          failureCode === 'invalid_output' &&
          repairDiagnostic !== null
            ? 'continue'
            : 'complete',
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
