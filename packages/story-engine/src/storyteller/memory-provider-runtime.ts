import { z } from 'zod';
import type { Database } from '@offscreen/db';
import type { EffectiveUsagePolicy } from '@offscreen/usage-policy/usage-policy';
import {
  type ProviderOutcome,
  type StorytellerProvider,
  type StorytellerProviderDispatch,
} from '@offscreen/storyteller/providers/openrouter';
import type { StorytellerTask } from '@offscreen/storyteller/tasks';
import { createStorytellerBudget, StorytellerBudgetError } from './budget';
import { retainsCapturedAuthority } from './dispatch-authority';
import { prepareReviewedDispatch } from './dispatch-review';
import type {
  CapturedMemoryRoundDelivery,
  PersistedMemoryRoundSettlement,
  ScriptedMemoryRoundSource,
} from './memory-exploration-controller';
import {
  MemoryProviderRoundError,
  classifyMemoryProviderRoundError,
} from './loop-lifecycle';

const telemetrySchema = z.strictObject({
  durationMs: z.number().int().nonnegative().nullable(),
  httpStatus: z.number().int().nullable(),
  providerId: z.string().nullable(),
  reportedModel: z.string().nullable(),
  finishReason: z.string().nullable(),
});

const usageSchema = z.strictObject({
  reportedCostMicrousd: z.string().regex(/^\d+$/),
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  reasoningTokens: z.number().int().nonnegative().nullable(),
  cachedTokens: z.number().int().nonnegative().nullable(),
  cacheWriteTokens: z.number().int().nonnegative().nullable(),
});

const settlementSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('result'),
    usage: usageSchema,
    telemetry: telemetrySchema,
  }),
  z.strictObject({
    kind: z.literal('failed'),
    failureCode: z.enum([
      'provider_refusal',
      'provider_unavailable',
      'invalid_output',
    ]),
    usage: usageSchema,
    telemetry: telemetrySchema,
  }),
  z.strictObject({ kind: z.literal('uncertain'), telemetry: telemetrySchema }),
]);

export function memoryRoundGeneratedTokenCeilings(input: {
  maxGeneratedTokens: number;
  maxModelRounds: number;
  maxRepairRounds: number;
}) {
  const publishableRounds = 1 + input.maxRepairRounds;
  const decisionRounds = Math.max(0, input.maxModelRounds - publishableRounds);
  const evenShare = Math.max(
    1,
    Math.floor(input.maxGeneratedTokens / input.maxModelRounds),
  );
  const decision = Math.min(256, evenShare);
  const publishableBudget = Math.max(
    publishableRounds,
    input.maxGeneratedTokens - decision * decisionRounds,
  );
  return {
    decision,
    final: Math.max(1, Math.floor(publishableBudget / publishableRounds)),
  } as const;
}

function jsonUsage(
  usage: Extract<ProviderOutcome, { kind: 'result' | 'failed' }>['usage'],
) {
  return {
    ...usage,
    reportedCostMicrousd: usage.reportedCostMicrousd.toString(),
  };
}

function captureOutcome(raw: unknown): CapturedMemoryRoundDelivery {
  const outcome = raw as ProviderOutcome;
  if (outcome.kind === 'result') {
    return {
      output: outcome.output,
      settlement: {
        kind: outcome.kind,
        usage: jsonUsage(outcome.usage),
        telemetry: outcome.telemetry,
      },
    };
  }
  if (outcome.kind === 'failed') {
    return {
      output: null,
      settlement: {
        kind: outcome.kind,
        failureCode: outcome.failureCode,
        usage: jsonUsage(outcome.usage),
        telemetry: outcome.telemetry,
      },
    };
  }
  return {
    output: null,
    settlement: { kind: outcome.kind, telemetry: outcome.telemetry },
  };
}

function providerUsage(value: z.infer<typeof usageSchema>) {
  return { ...value, reportedCostMicrousd: BigInt(value.reportedCostMicrousd) };
}

/**
 * Composes private memory rounds with the same reviewed, funded provider
 * boundary as ordinary generation. It deliberately does not complete or
 * publish the generation; the exploration controller owns only a candidate.
 */
export function createMemoryProviderRoundRuntime(
  database: Database,
  input: {
    generationId: string;
    ownerId: string;
    task: StorytellerTask;
    provider: StorytellerProvider;
    dispatchAuthority: (input: {
      generationId: string;
      ownerId: string;
      task: StorytellerTask;
    }) => EffectiveUsagePolicy | null | Promise<EffectiveUsagePolicy | null>;
  },
): {
  source: ScriptedMemoryRoundSource;
  captureDelivery: (raw: unknown) => CapturedMemoryRoundDelivery;
  settlePersistedRound: PersistedMemoryRoundSettlement;
  classifyRoundError: typeof classifyMemoryProviderRoundError;
  closeSettledOperation: () => Promise<void>;
} {
  if (input.task.execution.mode !== 'provider') {
    throw new Error('Memory provider runtime requires provider execution');
  }
  if (input.task.resources.authority.kind !== 'effective-usage-policy') {
    throw new Error('Memory provider runtime requires usage authority');
  }
  const budget = createStorytellerBudget(database);
  const execution = input.task.execution;
  const recipe = input.task.resources.recipe;
  if (recipe.version !== 'memory-exploration.v1') {
    throw new Error('Memory provider runtime requires memory exploration');
  }
  const generatedTokens = memoryRoundGeneratedTokenCeilings({
    maxGeneratedTokens: input.task.resources.envelope.maxGeneratedTokens,
    maxModelRounds: recipe.maxModelRounds,
    maxRepairRounds: recipe.maxRepairRounds,
  });
  const maxReasoningTokens = Math.floor(
    input.task.resources.envelope.maxReasoningTokens / recipe.maxModelRounds,
  );
  const maxInputTokensPerRound = Math.min(
    execution.policy.maxInputTokens,
    input.task.resources.authority.policy.limits.maxInputTokensPerRequest,
  );

  const source: ScriptedMemoryRoundSource = async (round) => {
    const maxGeneratedTokens = round.canRequestContext
      ? generatedTokens.decision
      : generatedTokens.final;
    const providerDispatch: StorytellerProviderDispatch = {
      request: round.request,
      maxGeneratedTokens,
      ...(execution.policy.outputProtocol === 'memory-json-object-native-final'
        ? {
            outputProtocol: round.canRequestContext
              ? ('json-object-local-validation' as const)
              : ('native-json-schema' as const),
          }
        : {}),
    };
    const reviewed = await prepareReviewedDispatch(
      database,
      input.generationId,
      round.attemptId,
      input.task,
      providerDispatch,
      input.provider,
    );
    if (reviewed.disposition !== 'proceed') {
      // A wire refusal is a stopped review: the bytes the provider would send
      // are not the approved packet. Refused before reserve/dispatch (OBS00-C).
      throw new MemoryProviderRoundError(
        reviewed.disposition === 'held' ? 'review-held' : 'review-stopped',
      );
    }
    const wireDispatch = reviewed.dispatch;

    let reservation;
    try {
      reservation = await budget.reserve({
        id: round.attemptId,
        generationId: input.generationId,
        ownerId: input.ownerId,
        task: input.task,
        dispatch: {
          request: round.request,
          maxSerializedRequestBytes: round.boundedRequestBytes,
          // Serialized bytes are a tokenizer-independent upper bound, but a
          // round cannot consume more input tokens than its captured route.
          maxInputTokens: Math.min(
            round.boundedRequestBytes,
            maxInputTokensPerRound,
          ),
          maxGeneratedTokens,
          maxReasoningTokens,
        },
      });
    } catch (error) {
      if (error instanceof StorytellerBudgetError) {
        throw new MemoryProviderRoundError(
          error.code === 'usage_uncertain'
            ? 'usage-uncertain'
            : 'budget-unavailable',
        );
      }
      throw error;
    }
    if (reservation === 'unsent') {
      throw new MemoryProviderRoundError('budget-unavailable');
    }
    if (reservation === 'dispatched') {
      await budget.uncertain(round.attemptId, execution);
      throw new MemoryProviderRoundError('provider-uncertain');
    }
    if (reservation === 'settled' || reservation === 'uncertain') {
      throw new MemoryProviderRoundError(
        reservation === 'uncertain'
          ? 'provider-uncertain'
          : 'budget-unavailable',
      );
    }

    let authorityGranted = false;
    try {
      authorityGranted = retainsCapturedAuthority(
        input.task,
        await input.dispatchAuthority({
          generationId: input.generationId,
          ownerId: input.ownerId,
          task: input.task,
        }),
      );
    } catch {
      // Resolver failure is denial, never evidence that transport occurred.
    }
    if (
      !(await budget.dispatch(round.attemptId, execution, authorityGranted))
    ) {
      const state = await budget.attemptState(round.attemptId);
      if (state === 'unsent') {
        throw new MemoryProviderRoundError(
          authorityGranted ? 'budget-unavailable' : 'authority-unavailable',
        );
      }
      await budget.uncertain(round.attemptId, execution);
      throw new MemoryProviderRoundError('provider-uncertain');
    }
    try {
      return await input.provider(input.task, wireDispatch);
    } catch {
      return {
        kind: 'uncertain',
        telemetry: {
          durationMs: null,
          httpStatus: null,
          providerId: null,
          reportedModel: null,
          finishReason: null,
        },
      } satisfies ProviderOutcome;
    }
  };

  const settlePersistedRound: PersistedMemoryRoundSettlement = async (
    round,
  ) => {
    const settlement = settlementSchema.parse(round.delivery.settlement);
    if (settlement.kind === 'uncertain') {
      await budget.uncertain(round.attemptId, execution, settlement.telemetry);
      throw new MemoryProviderRoundError('provider-uncertain');
    }
    if (
      settlement.kind === 'failed' &&
      settlement.failureCode === 'provider_unavailable'
    ) {
      await budget.confirmUnsent(
        round.attemptId,
        execution,
        settlement.telemetry,
      );
      throw new MemoryProviderRoundError('provider-refusal');
    }
    await budget.settle({
      id: round.attemptId,
      execution,
      usage: providerUsage(settlement.usage),
      telemetry: settlement.telemetry,
      operationOutcome: round.operationOutcome,
    });
    if (settlement.kind === 'failed') {
      throw new MemoryProviderRoundError(
        settlement.failureCode === 'provider_refusal'
          ? 'provider-refusal'
          : 'invalid-output',
      );
    }
  };

  const closeSettledOperation = async () => {
    await budget.completeOperation(input.generationId, execution);
  };

  return {
    source,
    captureDelivery: captureOutcome,
    settlePersistedRound,
    classifyRoundError: classifyMemoryProviderRoundError,
    closeSettledOperation,
  };
}
