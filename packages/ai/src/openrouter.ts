import { z } from 'zod';
import type { StorytellerTask } from './storyteller-tasks';
import { reservationForRequest } from './storyteller-policy';

export type ProviderOutcome =
  | {
      kind: 'result';
      output: unknown;
      chargeMicrousd: bigint;
      providerId: string;
    }
  | {
      kind: 'failed';
      failureCode: 'provider_refusal' | 'invalid_output';
      chargeMicrousd: bigint;
      providerId: string;
    }
  | { kind: 'uncertain' };
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
  usage: z.object({
    cost: z.union([z.number().finite().nonnegative(), z.string().max(100)]),
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
    reservationForRequest(task.request, policy);
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
            max_tokens: policy.maxOutputTokens,
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
      // Even HTTP errors may follow a billed attempt. Missing accounting is not zero.
      const parsed = responseSchema.safeParse(await boundedResponse(response));
      if (!parsed.success) {
        return { kind: 'uncertain' };
      }
      const chargeMicrousd = usdToMicrousd(parsed.data.usage.cost);
      const providerId = parsed.data.id;
      const choice = parsed.data.choices[0];
      if (
        !choice ||
        !response.ok ||
        choice.message.refusal ||
        choice.finish_reason !== 'stop'
      ) {
        return {
          kind: 'failed',
          failureCode: 'provider_refusal',
          chargeMicrousd,
          providerId,
        };
      }
      try {
        return {
          kind: 'result',
          output: JSON.parse(choice.message.content ?? ''),
          chargeMicrousd,
          providerId,
        };
      } catch {
        return {
          kind: 'failed',
          failureCode: 'invalid_output',
          chargeMicrousd,
          providerId,
        };
      }
    } catch {
      return { kind: 'uncertain' };
    }
  };
}
