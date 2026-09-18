import { z } from 'zod';

export const microusdSchema = z.string().regex(/^(0|[1-9]\d{0,14})$/);
export const modelPolicySchema = z.strictObject({
  version: z.string().min(1).max(80),
  model: z.string().min(1).max(160),
  provider: z.string().min(1).max(100),
  priceVersion: z.string().min(1).max(100),
  inputMicrousdPerMillion: microusdSchema,
  outputMicrousdPerMillion: microusdSchema,
  maxInputTokens: z.number().int().positive().max(100000),
  maxOutputTokens: z.number().int().positive().max(8000),
  timeoutMs: z.number().int().min(1000).max(120000),
});
export const executionPolicySchema = z.discriminatedUnion('mode', [
  z.strictObject({
    mode: z.literal('scripted'),
    version: z.literal('pineapple.v1'),
  }),
  z.strictObject({
    mode: z.literal('provider'),
    accountId: z.uuid(),
    runId: z.uuid(),
    policy: modelPolicySchema,
  }),
]);
export type ExecutionPolicy = z.infer<typeof executionPolicySchema>;
export const offlineExecution: ExecutionPolicy = {
  mode: 'scripted',
  version: 'pineapple.v1',
};

/** Byte count conservatively bounds tokenizer input; include framing/schema overhead. */
export function reservationForRequest(
  request: unknown,
  policy: z.infer<typeof modelPolicySchema>,
): bigint {
  const inputBound = Buffer.byteLength(JSON.stringify(request), 'utf8') + 1024;
  if (inputBound > policy.maxInputTokens) {
    throw new Error('context_too_large');
  }
  const amount =
    BigInt(policy.maxInputTokens) * BigInt(policy.inputMicrousdPerMillion) +
    BigInt(policy.maxOutputTokens) * BigInt(policy.outputMicrousdPerMillion);
  return (amount + 999999n) / 1000000n;
}
