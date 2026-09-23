import { z } from 'zod';
import { effectiveUsagePolicySchema } from '@offscreen/contracts/usage-policy';
import {
  creativeExplorationRecipeSchema,
  disabledCreativeExplorationRecipe,
} from '@offscreen/contracts/creative-exploration';
import type { ExecutionPolicy } from './policy';

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

const oneShotRecipeSchema = z.strictObject({
  version: z.literal('single-turn.v1'),
  maxModelRounds: z.literal(1),
  maxReads: z.literal(0),
  tools: z.literal('disabled'),
  automaticEscalation: z.literal(false),
});

const repairableTurnRecipeSchema = z.strictObject({
  version: z.literal('repairable-turn.v1'),
  maxModelRounds: z.literal(2),
  maxReads: z.literal(0),
  tools: z.literal('disabled'),
  automaticEscalation: z.literal(false),
  maxRepairRounds: z.literal(1),
});

const memoryExplorationRecipeSchema = z
  .strictObject({
    version: z.literal('memory-exploration.v1'),
    maxModelRounds: z.number().int().min(2).max(3),
    maxReads: z.number().int().min(1).max(6),
    maxRetainedReadBytes: z
      .number()
      .int()
      .min(1024)
      .max(48 * 1024),
    tools: z.literal('memory-read.v1'),
    automaticEscalation: z.literal(false),
    finalAnswerReserveRounds: z.literal(1),
    maxRepairRounds: z.union([z.literal(0), z.literal(1)]),
  })
  .refine(
    (recipe) => recipe.maxModelRounds > recipe.finalAnswerReserveRounds,
    'Exploration must leave a final-answer round',
  );

export const storytellerTaskResourcesSchema = z.strictObject({
  version: z.literal('storyteller-resources.v2'),
  recipe: z.union([
    oneShotRecipeSchema,
    repairableTurnRecipeSchema,
    memoryExplorationRecipeSchema,
  ]),
  creativeExploration: creativeExplorationRecipeSchema.default(
    disabledCreativeExplorationRecipe,
  ),
  envelope: z.strictObject({
    maxSerializedRequestBytes: count.positive().max(1_000_000),
    maxInputTokens: count.positive().max(200_000),
    maxGeneratedTokens: count.positive().max(32_000),
    maxReasoningTokens: count.max(32_000),
    maxMicrousd: z.string().regex(/^\d{1,16}$/),
    deadlineMs: count.positive().max(120_000),
  }),
  authority: z.discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('offline'),
      version: z.literal('offline-rehearsal.v1'),
    }),
    z.strictObject({
      kind: z.literal('effective-usage-policy'),
      policy: effectiveUsagePolicySchema,
    }),
  ]),
});
export type StorytellerTaskResources = z.infer<
  typeof storytellerTaskResourcesSchema
>;
export type StorytellerTaskResourcesInput = z.input<
  typeof storytellerTaskResourcesSchema
>;

const oneShotRecipe = {
  version: 'single-turn.v1',
  maxModelRounds: 1,
  maxReads: 0,
  tools: 'disabled',
  automaticEscalation: false,
} as const;

/** Offline rehearsal is free; provider work needs application-level authority. */
export function resourcesForExecution(
  execution: ExecutionPolicy,
): StorytellerTaskResources {
  if (execution.mode === 'scripted') {
    return storytellerTaskResourcesSchema.parse({
      version: 'storyteller-resources.v2',
      recipe: oneShotRecipe,
      envelope: {
        maxSerializedRequestBytes: 48 * 1024,
        maxInputTokens: 12_288,
        maxGeneratedTokens: 8_000,
        maxReasoningTokens: 0,
        maxMicrousd: '0',
        deadlineMs: 120_000,
      },
      authority: { kind: 'offline', version: execution.version },
    });
  }
  throw new Error('effective_usage_policy_required');
}

/** Prevents a captured envelope from granting more than its execution route. */
export function validateResourcesForExecution(
  execution: ExecutionPolicy,
  resources: StorytellerTaskResources,
): void {
  const creative = resources.creativeExploration;
  const creativeFitsRecipe =
    !creative.enabled ||
    (resources.recipe.version === 'memory-exploration.v1' &&
      creative.limits.maxModelRounds <=
        resources.recipe.maxModelRounds -
          resources.recipe.finalAnswerReserveRounds &&
      creative.limits.maxReads <= resources.recipe.maxReads &&
      creative.limits.maxRetainedBytes <=
        resources.recipe.maxRetainedReadBytes);
  const creativeFitsEnvelope =
    creative.limits.maxGeneratedTokens <=
      resources.envelope.maxGeneratedTokens &&
    creative.limits.maxLatencyMs <= resources.envelope.deadlineMs &&
    BigInt(creative.limits.maxCostMicrousd) <=
      BigInt(resources.envelope.maxMicrousd);
  if (!creativeFitsRecipe || !creativeFitsEnvelope) {
    throw new Error('invalid_task_resources');
  }
  if (execution.mode === 'scripted') {
    if (
      resources.authority.kind !== 'offline' ||
      resources.envelope.maxMicrousd !== '0'
    ) {
      throw new Error('invalid_task_resources');
    }
    return;
  }
  if (
    resources.authority.kind !== 'effective-usage-policy' ||
    resources.authority.policy.route !== execution.policy.route ||
    resources.recipe.maxModelRounds >
      resources.authority.policy.limits.maxModelRoundsPerOperation ||
    resources.recipe.maxReads >
      resources.authority.policy.limits.maxReadsPerOperation ||
    (resources.recipe.version === 'memory-exploration.v1' &&
      resources.recipe.maxRetainedReadBytes >
        resources.authority.policy.limits.maxRetainedReadBytes) ||
    resources.envelope.maxInputTokens >
      Math.min(
        200_000,
        resources.authority.policy.limits.maxInputTokensPerOperation,
        resources.authority.policy.limits.maxInputTokensPerRequest *
          resources.recipe.maxModelRounds,
        execution.policy.maxInputTokens * resources.recipe.maxModelRounds,
      ) ||
    resources.envelope.maxGeneratedTokens >
      execution.policy.maxOutputTokens * resources.recipe.maxModelRounds ||
    resources.envelope.deadlineMs > execution.policy.timeoutMs
  ) {
    throw new Error('invalid_task_resources');
  }
}
