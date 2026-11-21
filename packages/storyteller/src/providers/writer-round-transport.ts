import { z } from 'zod';
import type {
  PreparedProviderWire,
  ProviderTelemetry,
  ProviderUsage,
} from './openrouter.js';
import { preparedWireIsSelfConsistent, usdToMicrousd } from './openrouter.js';

export type WriterRoundModelPolicy = Readonly<{
  model: string;
  provider: string;
  priceVersion: string;
  inputMicrousdPerMillion: string;
  outputMicrousdPerMillion: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  maxModelRounds: number;
  maxMicrousd: bigint;
  timeoutMs: number;
}>;

export type WriterRoundTransportResult =
  | {
      kind: 'delivered';
      serializedResponse: string;
      usage: ProviderUsage;
      telemetry: ProviderTelemetry;
      exactWireSha256: string;
    }
  | {
      kind: 'failed';
      failureCode:
        | 'provider_refusal'
        | 'provider_unavailable'
        | 'invalid_output'
        | 'malformed_output'
        | 'over_budget'
        | 'wire_rejected';
      usage: ProviderUsage;
      telemetry: ProviderTelemetry;
      exactWireSha256: string | null;
      sent: boolean;
    }
  | {
      kind: 'unknown';
      telemetry: ProviderTelemetry;
      exactWireSha256: string;
    };

const zeroUsage: ProviderUsage = {
  reportedCostMicrousd: 0n,
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  reasoningTokens: null,
  cachedTokens: null,
  cacheWriteTokens: null,
};

function isPositiveIntegerString(value: string): boolean {
  return /^[1-9]\d*$/.test(value);
}

function policyPrecheck(policy: WriterRoundModelPolicy): string | null {
  if (!isPositiveIntegerString(policy.inputMicrousdPerMillion)) {
    return 'input price';
  }
  if (!isPositiveIntegerString(policy.outputMicrousdPerMillion)) {
    return 'output price';
  }
  if (policy.maxMicrousd <= 0n) return 'maxMicrousd';
  if (
    !Number.isFinite(policy.timeoutMs) ||
    policy.timeoutMs < 1 ||
    policy.timeoutMs > 120_000
  ) {
    return 'timeoutMs';
  }
  if (!Number.isFinite(policy.maxModelRounds) || policy.maxModelRounds <= 0) {
    return 'maxModelRounds';
  }
  return null;
}

function wireRejected(
  telemetry: ProviderTelemetry,
): WriterRoundTransportResult {
  return {
    kind: 'failed',
    failureCode: 'wire_rejected',
    usage: zeroUsage,
    telemetry,
    exactWireSha256: null,
    sent: false,
  };
}

function validateWireAgainstPolicy(
  wire: PreparedProviderWire,
  policy: WriterRoundModelPolicy,
): WriterRoundTransportResult | null {
  const policyFault = policyPrecheck(policy);
  if (policyFault) {
    return wireRejected({
      durationMs: null,
      httpStatus: null,
      providerId: null,
      reportedModel: null,
      finishReason: 'wire-rejected',
    });
  }
  if (!preparedWireIsSelfConsistent(wire)) {
    return wireRejected({
      durationMs: null,
      httpStatus: null,
      providerId: null,
      reportedModel: null,
      finishReason: 'wire-rejected',
    });
  }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(wire.serialized) as Record<string, unknown>;
  } catch {
    return wireRejected({
      durationMs: null,
      httpStatus: null,
      providerId: null,
      reportedModel: null,
      finishReason: 'wire-rejected',
    });
  }
  if (body['model'] !== policy.model) {
    return wireRejected({
      durationMs: null,
      httpStatus: null,
      providerId: null,
      reportedModel: null,
      finishReason: 'wire-rejected',
    });
  }
  const provider = body['provider'];
  if (!provider || typeof provider !== 'object' || Array.isArray(provider)) {
    return wireRejected({
      durationMs: null,
      httpStatus: null,
      providerId: null,
      reportedModel: null,
      finishReason: 'wire-rejected',
    });
  }
  const providerRecord = provider as Record<string, unknown>;
  const only = providerRecord['only'];
  if (
    !Array.isArray(only) ||
    only.length !== 1 ||
    only[0] !== policy.provider
  ) {
    return wireRejected({
      durationMs: null,
      httpStatus: null,
      providerId: null,
      reportedModel: null,
      finishReason: 'wire-rejected',
    });
  }
  if (providerRecord['allow_fallbacks'] !== false) {
    return wireRejected({
      durationMs: null,
      httpStatus: null,
      providerId: null,
      reportedModel: null,
      finishReason: 'wire-rejected',
    });
  }
  const maxTokens = body['max_tokens'];
  if (
    typeof maxTokens !== 'number' ||
    !Number.isFinite(maxTokens) ||
    maxTokens <= 0 ||
    maxTokens !== policy.maxOutputTokens
  ) {
    return wireRejected({
      durationMs: null,
      httpStatus: null,
      providerId: null,
      reportedModel: null,
      finishReason: 'wire-rejected',
    });
  }
  return null;
}

const usageSchema = z.object({
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
});

const responseSchema = z.object({
  id: z.string().min(1).max(200),
  model: z.string().min(1).max(200),
  usage: usageSchema,
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

const rejectedSchemaEnvelope = z.object({
  error: z.object({
    code: z.union([z.number(), z.string()]),
    metadata: z
      .object({ provider_error_code: z.string().optional() })
      .optional(),
  }),
});

function usageFromParsed(usage: z.infer<typeof usageSchema>): ProviderUsage {
  return {
    reportedCostMicrousd: usdToMicrousd(usage.cost),
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    reasoningTokens: usage.completion_tokens_details?.reasoning_tokens ?? null,
    cachedTokens: usage.prompt_tokens_details?.cached_tokens ?? null,
    cacheWriteTokens: usage.prompt_tokens_details?.cache_write_tokens ?? null,
  };
}

function contentIsJsonObject(content: string): boolean {
  try {
    const parsed = JSON.parse(content) as unknown;
    return !!parsed && typeof parsed === 'object' && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export function createWriterRoundTransport(input: {
  capturedWire: PreparedProviderWire;
  pinnedModelPolicy: WriterRoundModelPolicy;
  outputSchema: unknown;
  fetchImpl: typeof fetch;
}): () => Promise<WriterRoundTransportResult> {
  const { capturedWire, pinnedModelPolicy, fetchImpl } = input;
  void input.outputSchema;

  return async function invokeWriterRoundTransport(): Promise<WriterRoundTransportResult> {
    const wireReject = validateWireAgainstPolicy(
      capturedWire,
      pinnedModelPolicy,
    );
    if (wireReject) {
      return wireReject;
    }

    const wireSha = capturedWire.sha256;
    const startedAt = Date.now();

    let httpStatus: number | null = null;
    let providerId: string | null = null;

    try {
      const response = await fetchImpl(OPENROUTER_URL, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(pinnedModelPolicy.timeoutMs),
        headers: {
          authorization: 'Bearer test-not-live',
          'content-type': 'application/json',
        },
        body: capturedWire.serialized,
      });
      httpStatus = response.status;
      const raw = await response.text();
      let envelope: unknown;
      try {
        envelope = JSON.parse(raw);
      } catch {
        return {
          kind: 'unknown',
          telemetry: {
            durationMs: Date.now() - startedAt,
            httpStatus,
            providerId,
            reportedModel: null,
            finishReason: null,
          },
          exactWireSha256: wireSha,
        };
      }

      const rejected = rejectedSchemaEnvelope.safeParse(envelope);
      if (rejected.success) {
        const providerErrorCode =
          rejected.data.error.metadata?.provider_error_code;
        if (providerErrorCode === 'provider_unavailable') {
          return {
            kind: 'failed',
            failureCode: 'provider_unavailable',
            usage: zeroUsage,
            telemetry: {
              durationMs: Date.now() - startedAt,
              httpStatus,
              providerId: null,
              reportedModel: null,
              finishReason: 'provider-unavailable',
            },
            exactWireSha256: wireSha,
            sent: true,
          };
        }
      }

      const parsed = responseSchema.safeParse(envelope);
      if (!parsed.success) {
        return {
          kind: 'unknown',
          telemetry: {
            durationMs: Date.now() - startedAt,
            httpStatus,
            providerId,
            reportedModel: null,
            finishReason: null,
          },
          exactWireSha256: wireSha,
        };
      }

      providerId = parsed.data.id;
      const choice = parsed.data.choices[0];
      const usage = usageFromParsed(parsed.data.usage);
      const telemetry: ProviderTelemetry = {
        durationMs: Date.now() - startedAt,
        httpStatus,
        providerId: parsed.data.id,
        reportedModel: parsed.data.model,
        finishReason: choice?.finish_reason ?? null,
      };

      if (usage.reportedCostMicrousd > pinnedModelPolicy.maxMicrousd) {
        return {
          kind: 'failed',
          failureCode: 'over_budget',
          usage,
          telemetry,
          exactWireSha256: wireSha,
          sent: true,
        };
      }

      const content = choice?.message.content ?? '';
      const refusal = choice?.message.refusal;

      if (
        refusal ||
        (choice?.finish_reason !== 'stop' && choice?.finish_reason !== 'length')
      ) {
        return {
          kind: 'failed',
          failureCode: 'provider_refusal',
          usage,
          telemetry,
          exactWireSha256: wireSha,
          sent: true,
        };
      }

      if (!content || !contentIsJsonObject(content)) {
        return {
          kind: 'failed',
          failureCode: 'malformed_output',
          usage,
          telemetry,
          exactWireSha256: wireSha,
          sent: true,
        };
      }

      return {
        kind: 'delivered',
        serializedResponse: content,
        usage,
        telemetry,
        exactWireSha256: wireSha,
      };
    } catch {
      return {
        kind: 'unknown',
        telemetry: {
          durationMs: Date.now() - startedAt,
          httpStatus,
          providerId,
          reportedModel: null,
          finishReason: 'lost-response',
        },
        exactWireSha256: wireSha,
      };
    }
  };
}
