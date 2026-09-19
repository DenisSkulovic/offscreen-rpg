import { z } from 'zod';
import { effectiveUsagePolicySchema } from '@offscreen/contracts/usage-policy';
import type { ExecutionPolicy } from './policy';

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

export const storytellerTaskResourcesSchema = z.strictObject({
  version: z.literal('storyteller-resources.v2'),
  recipe: z.strictObject({
    version: z.literal('single-turn.v1'),
    maxModelRounds: z.literal(1),
    maxReads: z.literal(0),
    tools: z.literal('disabled'),
    automaticEscalation: z.literal(false),
  }),
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
    resources.envelope.maxInputTokens > execution.policy.maxInputTokens ||
    resources.envelope.maxGeneratedTokens > execution.policy.maxOutputTokens ||
    resources.envelope.deadlineMs > execution.policy.timeoutMs
  ) {
    throw new Error('invalid_task_resources');
  }
}
