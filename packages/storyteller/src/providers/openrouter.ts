import { z } from 'zod';
import type { StorytellerTask } from '../tasks';
import { reservationForRequest } from '../tasks/policy';

export type ProviderUsage = Readonly<{
  reportedCostMicrousd: bigint;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  reasoningTokens: number | null;
  cachedTokens: number | null;
  cacheWriteTokens: number | null;
}>;
export type ProviderTelemetry = Readonly<{
  durationMs: number | null;
  httpStatus: number | null;
  providerId: string | null;
  reportedModel: string | null;
  finishReason: string | null;
}>;
export type ProviderOutcome =
  | {
      kind: 'result';
      output: unknown;
      usage: ProviderUsage;
      telemetry: ProviderTelemetry;
    }
  | {
      kind: 'failed';
      failureCode: 'provider_refusal' | 'invalid_output';
      usage: ProviderUsage;
      telemetry: ProviderTelemetry;
    }
  | { kind: 'uncertain'; telemetry: ProviderTelemetry };
export type StorytellerProvider = (
  task: StorytellerTask,
) => Promise<ProviderOutcome>;

/** Round fractions of a microunit upward; never use float arithmetic for the ledger. */
export function usdToMicrousd(value: string | number): bigint {
  const match = /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(String(value));
  if (!match) {
    throw new Error('Invalid reported charge');
  }
  const whole = match[1] ?? '';
  const fraction = match[2] ?? '';
  const exponent = Number(match[3] ?? 0) - fraction.length + 6;
  if (Math.abs(exponent) > 100 || whole.length + fraction.length > 100) {
    throw new Error('Charge out of range');
  }
  const digits = BigInt(whole + fraction);
  if (exponent >= 0) {
    return digits * 10n ** BigInt(exponent);
  }
  const divisor = 10n ** BigInt(-exponent);
  return (digits + divisor - 1n) / divisor;
}
const responseSchema = z.object({
  id: z.string().min(1).max(200),
  model: z.string().min(1).max(200),
  usage: z.object({
    cost: z.union([z.number().finite().nonnegative(), z.string().max(100)]),
    prompt_tokens: z.number().int().nonnegative(),
    completion_tokens: z.number().int().nonnegative(),
    total_tokens: z.number().int().nonnegative(),
    prompt_tokens_details: z
      .object({
        cached_tokens: z.number().int().nonnegative().optional(),
        cache_write_tokens: z.number().int().nonnegative().optional(),
      })
      .optional(),
    completion_tokens_details: z
      .object({ reasoning_tokens: z.number().int().nonnegative().optional() })
      .optional(),
  }),
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullable().optional(),
        message: z.object({
          content: z.string().nullable().optional(),
          refusal: z.string().nullable().optional(),
        }),
      }),
    )
    .min(1)
    .max(1),
});

async function boundedResponse(response: Response): Promise<unknown> {
  if (!response.body) {
    throw new Error('Missing response');
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) {
        break;
      }
      total += chunk.value.byteLength;
      if (total > 512 * 1024) {
        throw new Error('Response too large');
      }
      chunks.push(chunk.value);
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/** Explicit composition only: importing this file cannot read keys or send requests. No retries. */
export function createOpenRouterProvider(config: {
  enabled: boolean;
  apiKey: string;
  transport?: typeof fetch;
}): StorytellerProvider {
  if (!config.enabled || !config.apiKey.trim()) {
    throw new Error('Live provider is disabled');
  }
  const transport = config.transport ?? fetch;
  return async (task) => {
    if (task.execution.mode !== 'provider') {
      throw new Error('Wrong execution mode');
    }
    const policy = task.execution.policy;
    reservationForRequest(
      task.request,
      policy,
      task.resources.envelope.maxSerializedRequestBytes,
    );
    const startedAt = Date.now();
    let httpStatus: number | null = null;
    try {
      const response = await transport(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(policy.timeoutMs),
          headers: {
            authorization: `Bearer ${config.apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: policy.model,
            messages: task.request.messages,
            stream: false,
            max_tokens: task.resources.envelope.maxGeneratedTokens,
            provider: {
              only: [policy.provider],
              allow_fallbacks: false,
              require_parameters: true,
            },
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'storyteller_result',
                strict: true,
                schema: task.request.outputSchema,
              },
            },
          }),
        },
      );
      httpStatus = response.status;
      // Even HTTP errors may follow a billed attempt. Missing accounting is not zero.
      const parsed = responseSchema.safeParse(await boundedResponse(response));
      if (!parsed.success) {
        return {
          kind: 'uncertain',
          telemetry: {
            durationMs: Date.now() - startedAt,
            httpStatus,
            providerId: null,
            reportedModel: null,
            finishReason: null,
          },
        };
      }
      const choice = parsed.data.choices[0];
      const usage: ProviderUsage = {
        reportedCostMicrousd: usdToMicrousd(parsed.data.usage.cost),
        promptTokens: parsed.data.usage.prompt_tokens,
        completionTokens: parsed.data.usage.completion_tokens,
        totalTokens: parsed.data.usage.total_tokens,
        reasoningTokens:
          parsed.data.usage.completion_tokens_details?.reasoning_tokens ?? null,
        cachedTokens:
          parsed.data.usage.prompt_tokens_details?.cached_tokens ?? null,
        cacheWriteTokens:
          parsed.data.usage.prompt_tokens_details?.cache_write_tokens ?? null,
      };
      const telemetry: ProviderTelemetry = {
        durationMs: Date.now() - startedAt,
        httpStatus,
        providerId: parsed.data.id,
        reportedModel: parsed.data.model,
        finishReason: choice?.finish_reason ?? null,
      };
      if (
        !choice ||
        !response.ok ||
        choice.message.refusal ||
        choice.finish_reason !== 'stop'
      ) {
        return {
          kind: 'failed',
          failureCode: 'provider_refusal',
          usage,
          telemetry,
        };
      }
      try {
        return {
          kind: 'result',
          output: JSON.parse(choice.message.content ?? ''),
          usage,
          telemetry,
        };
      } catch {
        return {
          kind: 'failed',
          failureCode: 'invalid_output',
          usage,
          telemetry,
        };
      }
    } catch {
      return {
        kind: 'uncertain',
        telemetry: {
          durationMs: Date.now() - startedAt,
          httpStatus,
          providerId: null,
          reportedModel: null,
          finishReason: null,
        },
      };
    }
  };
}
