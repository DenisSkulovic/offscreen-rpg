import {
  effectiveUsagePolicySchema,
  type EffectiveUsagePolicy,
} from '@offscreen/contracts/usage-policy';
import {
  prepareStorytellerTask,
  storytellerTaskResourcesSchema,
  type ExecutionPolicy,
  type StorytellerTask,
  type StorytellerTaskResources,
} from '@offscreen/storyteller/tasks';
import type {
  CreativeExplorationLimits,
  CreativeExplorationPosture,
} from '@offscreen/contracts/creative-exploration';
import { resolveCreativeExplorationRecipe } from './creative-exploration-recipes';

function minimumMicrousd(left: string, right: string) {
  return BigInt(left) <= BigInt(right) ? left : right;
}

function executionMaximumCharge(
  execution: Extract<ExecutionPolicy, { mode: 'provider' }>,
) {
  const admittedInputPrice = [
    execution.policy.inputMicrousdPerMillion,
    execution.policy.cacheReadMicrousdPerMillion ??
      execution.policy.inputMicrousdPerMillion,
    execution.policy.cacheWriteMicrousdPerMillion ??
      execution.policy.inputMicrousdPerMillion,
  ].reduce((maximum, price) => {
    const parsed = BigInt(price);
    return parsed > maximum ? parsed : maximum;
  }, 0n);
  const amount =
    BigInt(execution.policy.maxInputTokens) * admittedInputPrice +
    BigInt(execution.policy.maxOutputTokens) *
      BigInt(execution.policy.outputMicrousdPerMillion);
  return ((amount + 999_999n) / 1_000_000n).toString();
}

/**
 * Intersects commercial entitlement with the concrete provider route. Neither
 * snapshot can grant capability absent from the other, and the result travels
 * immutably with the task for replay and cost attribution.
 */
export function resourcesForEffectiveUsagePolicy(
  execution: Extract<ExecutionPolicy, { mode: 'provider' }>,
  policyInput: EffectiveUsagePolicy,
  creativeInput?: {
    posture: CreativeExplorationPosture;
    requested?: Partial<CreativeExplorationLimits>;
    maxRepairRounds?: 0 | 1;
  },
): StorytellerTaskResources {
  const policy = effectiveUsagePolicySchema.parse(policyInput);
  if (policy.route !== execution.policy.route) {
    throw new Error('storyteller_route_not_authorized');
  }
  if (policy.limits.maxModelRoundsPerOperation < 1) {
    throw new Error('storyteller_recipe_not_authorized');
  }
  const maxGeneratedTokens = Math.min(
    policy.limits.maxGeneratedTokensPerRequest,
    policy.limits.maxGeneratedTokensPerOperation,
    execution.policy.maxOutputTokens,
  );
  const maxMicrousdPerRequest = minimumMicrousd(
    policy.limits.maxMicrousdPerOperation,
    executionMaximumCharge(execution),
  );
  const creativeExplorationAvailable =
    policy.limits.maxModelRoundsPerOperation > 1 &&
    policy.limits.maxReadsPerOperation > 0 &&
    policy.limits.maxRetainedReadBytes >= 1024;
  const creativeExploration = resolveCreativeExplorationRecipe({
    posture: creativeInput?.posture ?? 'off',
    ...(creativeInput?.requested ? { requested: creativeInput.requested } : {}),
    operationLimits: {
      maxQueries: Math.max(
        0,
        creativeExplorationAvailable
          ? Math.min(12, (policy.limits.maxModelRoundsPerOperation - 1) * 6)
          : 0,
      ),
      maxReads: Math.min(6, policy.limits.maxReadsPerOperation),
      maxRetainedBytes: Math.min(48 * 1024, policy.limits.maxRetainedReadBytes),
      maxModelRounds: Math.max(
        0,
        Math.min(2, policy.limits.maxModelRoundsPerOperation - 1),
      ),
      maxGeneratedTokens,
      maxLatencyMs: execution.policy.timeoutMs,
      maxCostMicrousd: Number(
        BigInt(maxMicrousdPerRequest) > 10_000_000n
          ? 10_000_000n
          : BigInt(maxMicrousdPerRequest),
      ),
    },
  });
  const recipe = creativeExploration.enabled
    ? {
        version: 'memory-exploration.v1' as const,
        maxModelRounds: creativeExploration.limits.maxModelRounds + 1,
        maxReads: creativeExploration.limits.maxReads,
        maxRetainedReadBytes: creativeExploration.limits.maxRetainedBytes,
        tools: 'memory-read.v1' as const,
        automaticEscalation: false as const,
        finalAnswerReserveRounds: 1 as const,
        maxRepairRounds: creativeInput?.maxRepairRounds ?? 0,
      }
    : {
        version: 'single-turn.v1' as const,
        maxModelRounds: 1 as const,
        maxReads: 0 as const,
        tools: 'disabled' as const,
        automaticEscalation: false as const,
      };
  const maxMicrousd = minimumMicrousd(
    policy.limits.maxMicrousdPerOperation,
    (
      BigInt(executionMaximumCharge(execution)) * BigInt(recipe.maxModelRounds)
    ).toString(),
  );
  return storytellerTaskResourcesSchema.parse({
    version: 'storyteller-resources.v2',
    recipe,
    creativeExploration,
    envelope: {
      maxSerializedRequestBytes: Math.min(
        policy.limits.maxSerializedBytesPerRequest,
        execution.policy.maxInputTokens * 4,
      ),
      maxInputTokens: Math.min(
        200_000,
        policy.limits.maxInputTokensPerOperation,
        policy.limits.maxInputTokensPerRequest * recipe.maxModelRounds,
        execution.policy.maxInputTokens * recipe.maxModelRounds,
      ),
      maxGeneratedTokens,
      maxReasoningTokens: Math.min(
        policy.limits.maxReasoningTokensPerRequest,
        execution.policy.maxOutputTokens,
      ),
      maxMicrousd,
      deadlineMs: execution.policy.timeoutMs,
    },
    authority: { kind: 'effective-usage-policy', policy },
  });
}

type PreparedTaskInput = Parameters<typeof prepareStorytellerTask>[0];

/** Provider admission fails closed unless the caller supplies resolved authority. */
export function prepareAdmittedStorytellerTask(
  input: PreparedTaskInput,
  usagePolicy?: EffectiveUsagePolicy | null,
  creativeInput?: {
    posture: CreativeExplorationPosture;
    requested?: Partial<CreativeExplorationLimits>;
    maxRepairRounds?: 0 | 1;
  },
): StorytellerTask {
  if (input.execution.mode === 'scripted') {
    return prepareStorytellerTask(input);
  }
  if (!usagePolicy) {
    throw new Error('effective_usage_policy_required');
  }
  return prepareStorytellerTask({
    ...input,
    resources: resourcesForEffectiveUsagePolicy(
      input.execution,
      usagePolicy,
      creativeInput,
    ),
  });
}
