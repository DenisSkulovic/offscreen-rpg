/**
 * Pure provider pricing shared by task admission, request reservation, and
 * settlement. No network, database, provider dispatch or policy authorization.
 *
 * Values are integer microusd per million tokens. All monetary rounding
 * happens once at the final charge boundary, never per token category.
 */
import type { ProviderUsage } from '../providers/openrouter';
import type { ExecutionPolicy } from './policy';

type ProviderExecution = Extract<ExecutionPolicy, { mode: 'provider' }>;
type ProviderPolicy = ProviderExecution['policy'];

const tokensPerMillion = 1_000_000n;

function roundCharge(amount: bigint): bigint {
  return (amount + tokensPerMillion - 1n) / tokensPerMillion;
}

/** Cache-write can cost more than uncached input. Reserve against the maximum. */
export function maximumInputMicrousdPerMillion(
  policy: ProviderPolicy,
): bigint {
  return [
    policy.inputMicrousdPerMillion,
    policy.cacheReadMicrousdPerMillion ?? policy.inputMicrousdPerMillion,
    policy.cacheWriteMicrousdPerMillion ?? policy.inputMicrousdPerMillion,
  ].reduce((maximum, price) => {
    const parsed = BigInt(price);
    return parsed > maximum ? parsed : maximum;
  }, 0n);
}

/** Conservative per-request route ceiling, used when intersecting entitlements. */
export function maximumProviderCharge(execution: ProviderExecution): string {
  const policy = execution.policy;
  const amount =
    BigInt(policy.maxInputTokens) * maximumInputMicrousdPerMillion(policy) +
    BigInt(policy.maxOutputTokens) *
      BigInt(policy.outputMicrousdPerMillion);
  return roundCharge(amount).toString();
}

/**
 * Diagnostic estimate for a held attempt. Serialized bytes bound the number
 * of input tokens but do not constitute tokenizer output or settled usage.
 */
export function estimatedProviderCharge(
  execution: ProviderExecution,
  requestBytes: number,
  reservation: Readonly<{
    maxInputTokens: number;
    maxGeneratedTokens: number;
  }>,
) {
  const estimatedInputTokens = Math.min(
    execution.policy.maxInputTokens,
    reservation.maxInputTokens,
    requestBytes,
  );
  const amount =
    BigInt(estimatedInputTokens) *
      maximumInputMicrousdPerMillion(execution.policy) +
    BigInt(reservation.maxGeneratedTokens) *
      BigInt(execution.policy.outputMicrousdPerMillion);
  return {
    inputTokens: estimatedInputTokens,
    microusd: roundCharge(amount),
    method: 'serialized-byte-upper-bound.v1',
  } as const;
}

/**
 * Independent charge reconstruction from reported token categories.
 * Missing cache-class prices or impossible token splits are not guessable.
 */
export function calculatedProviderCharge(
  execution: ProviderExecution,
  usage: ProviderUsage,
): bigint | null {
  const cachedTokens = usage.cachedTokens ?? 0;
  const cacheWriteTokens = usage.cacheWriteTokens ?? 0;
  const ordinaryInputTokens =
    usage.promptTokens - cachedTokens - cacheWriteTokens;
  if (
    ordinaryInputTokens < 0 ||
    (cachedTokens > 0 &&
      execution.policy.cacheReadMicrousdPerMillion === undefined) ||
    (cacheWriteTokens > 0 &&
      execution.policy.cacheWriteMicrousdPerMillion === undefined)
  ) {
    return null;
  }
  const amount =
    BigInt(ordinaryInputTokens) *
      BigInt(execution.policy.inputMicrousdPerMillion) +
    BigInt(cachedTokens) *
      BigInt(
        execution.policy.cacheReadMicrousdPerMillion ??
          execution.policy.inputMicrousdPerMillion,
      ) +
    BigInt(cacheWriteTokens) *
      BigInt(
        execution.policy.cacheWriteMicrousdPerMillion ??
          execution.policy.inputMicrousdPerMillion,
      ) +
    BigInt(usage.completionTokens) *
      BigInt(execution.policy.outputMicrousdPerMillion);
  return roundCharge(amount);
}
