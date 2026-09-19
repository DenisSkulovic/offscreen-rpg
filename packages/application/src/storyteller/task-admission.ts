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

function minimumMicrousd(left: string, right: string) {
  return BigInt(left) <= BigInt(right) ? left : right;
}

function executionMaximumCharge(
  execution: Extract<ExecutionPolicy, { mode: 'provider' }>,
) {
  const amount =
    BigInt(execution.policy.maxInputTokens) *
      BigInt(execution.policy.inputMicrousdPerMillion) +
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
): StorytellerTaskResources {
  const policy = effectiveUsagePolicySchema.parse(policyInput);
  if (policy.route !== execution.policy.route) {
    throw new Error('storyteller_route_not_authorized');
  }
  if (policy.limits.maxModelRoundsPerOperation < 1) {
    throw new Error('storyteller_recipe_not_authorized');
  }
  return storytellerTaskResourcesSchema.parse({
    version: 'storyteller-resources.v2',
    recipe: {
      version: 'single-turn.v1',
      maxModelRounds: 1,
      maxReads: 0,
      tools: 'disabled',
      automaticEscalation: false,
    },
    envelope: {
      maxSerializedRequestBytes: Math.min(
        policy.limits.maxSerializedBytesPerRequest,
        execution.policy.maxInputTokens * 4,
      ),
      maxInputTokens: Math.min(
        policy.limits.maxInputTokensPerRequest,
        policy.limits.maxInputTokensPerOperation,
        execution.policy.maxInputTokens,
      ),
      maxGeneratedTokens: Math.min(
        policy.limits.maxGeneratedTokensPerRequest,
        policy.limits.maxGeneratedTokensPerOperation,
        execution.policy.maxOutputTokens,
      ),
      maxReasoningTokens: Math.min(
        policy.limits.maxReasoningTokensPerRequest,
        execution.policy.maxOutputTokens,
      ),
      maxMicrousd: minimumMicrousd(
        policy.limits.maxMicrousdPerOperation,
        executionMaximumCharge(execution),
      ),
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
): StorytellerTask {
  if (input.execution.mode === 'scripted') {
    return prepareStorytellerTask(input);
  }
  if (!usagePolicy) {
    throw new Error('effective_usage_policy_required');
  }
  return prepareStorytellerTask({
    ...input,
    resources: resourcesForEffectiveUsagePolicy(input.execution, usagePolicy),
  });
}
