import { z } from 'zod';

export const microusdSchema = z.string().regex(/^(0|[1-9]\d{0,14})$/);
export const modelPolicySchema = z.strictObject({
  version: z.string().min(1).max(80),
  /** Stable commercial route identity authorized by an effective usage policy. */
  route: z.string().regex(/^[a-z0-9][a-z0-9._:-]{0,99}$/),
  model: z.string().min(1).max(160),
  provider: z.string().min(1).max(100),
  priceVersion: z.string().min(1).max(100),
  /** Provider output constraint; application validation remains authoritative. */
  outputProtocol: z
    .enum(['native-json-schema', 'json-object-local-validation'])
    .optional(),
  inputMicrousdPerMillion: microusdSchema,
  outputMicrousdPerMillion: microusdSchema,
  maxInputTokens: z.number().int().positive().max(100000),
  maxOutputTokens: z.number().int().positive().max(8000),
  timeoutMs: z.number().int().min(1000).max(120000),
});
export const dispatchReviewPolicySchema = z.strictObject({
  /** Captured per run; never inherited from a process-global toggle. */
  mode: z.enum(['hold', 'observe', 'off']),
});
export const executionPolicySchema = z.discriminatedUnion('mode', [
  z.strictObject({
    mode: z.literal('scripted'),
    version: z.literal('offline-rehearsal.v1'),
  }),
  z.strictObject({
    mode: z.literal('provider'),
    accountId: z.uuid(),
    runId: z.uuid(),
    dispatchReview: dispatchReviewPolicySchema,
    policy: modelPolicySchema,
  }),
]);
export type ExecutionPolicy = z.infer<typeof executionPolicySchema>;
export const offlineExecution: ExecutionPolicy = {
  mode: 'scripted',
  version: 'offline-rehearsal.v1',
};

/** Byte count conservatively bounds tokenizer input; include framing/schema overhead. */
export function serializedRequestBytes(request: unknown): number {
  return Buffer.byteLength(JSON.stringify(request), 'utf8') + 1024;
}

export function reservationForRequest(
  request: unknown,
  policy: z.infer<typeof modelPolicySchema>,
  maxSerializedRequestBytes = 48 * 1024,
  maxInputTokens = policy.maxInputTokens,
  maxOutputTokens = policy.maxOutputTokens,
): bigint {
  const inputBound = serializedRequestBytes(request);
  if (inputBound > maxSerializedRequestBytes) {
    throw new Error('context_too_large');
  }
  const amount =
    BigInt(Math.min(maxInputTokens, policy.maxInputTokens)) *
      BigInt(policy.inputMicrousdPerMillion) +
    BigInt(Math.min(maxOutputTokens, policy.maxOutputTokens)) *
      BigInt(policy.outputMicrousdPerMillion);
  return (amount + 999999n) / 1000000n;
}
