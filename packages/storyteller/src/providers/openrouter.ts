import { z } from 'zod';
import { createHash } from 'node:crypto';
import type { CapturedProviderRequest, StorytellerTask } from '../tasks';
import {
  describeStorytellerRequestPurpose,
  validateStorytellerResult,
} from '../tasks';
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
export type StorytellerProviderDispatch = Readonly<{
  request: CapturedProviderRequest;
  maxGeneratedTokens: number;
}>;
export type StorytellerProvider = (
  task: StorytellerTask,
  dispatch?: StorytellerProviderDispatch,
) => Promise<ProviderOutcome>;

function providerDispatch(
  task: StorytellerTask,
  dispatch?: StorytellerProviderDispatch,
) {
  const selected = dispatch ?? {
    request: task.request,
    maxGeneratedTokens: task.resources.envelope.maxGeneratedTokens,
  };
  if (
    !Number.isSafeInteger(selected.maxGeneratedTokens) ||
    selected.maxGeneratedTokens <= 0 ||
    selected.maxGeneratedTokens > task.resources.envelope.maxGeneratedTokens
  ) {
    throw new Error('Invalid provider dispatch output ceiling');
  }
  return selected;
}

/**
 * OpenAI strict structured outputs intentionally support only a JSON Schema
 * subset. Keep the domain validator expressive and project its captured schema
 * at the transport boundary: discriminated unions become supported `anyOf`,
 * defaults remain an application concern, and every object field is explicit.
 */
export function projectOpenAiStrictSchema(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(projectOpenAiStrictSchema);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const source = value as Record<string, unknown>;
  const projected: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(source)) {
    if (key === 'default') continue;
    // OpenAI's strict subset accepts ordinary ECMA-262 patterns but rejects
    // lookaround. The application validator remains authoritative, so omit an
    // unsupported transport hint instead of weakening the domain contract.
    if (
      key === 'pattern' &&
      typeof child === 'string' &&
      /\(\?(?:[=!]|<[=!])/.test(child)
    ) {
      continue;
    }
    projected[key === 'oneOf' ? 'anyOf' : key] =
      projectOpenAiStrictSchema(child);
  }
  if (
    projected['properties'] &&
    typeof projected['properties'] === 'object' &&
    !Array.isArray(projected['properties'])
  ) {
    projected['required'] = Object.keys(
      projected['properties'] as Record<string, unknown>,
    );
  }
  return projected;
}

/**
 * Build the complete credential-free JSON body used by transport. Dry-run
 * inspection and live dispatch must share this function so reviewed evidence
 * cannot differ from the eventual request through adapter-only decoration.
 */
export function buildOpenRouterRequest(
  task: StorytellerTask,
  dispatch?: StorytellerProviderDispatch,
) {
  if (task.execution.mode !== 'provider') {
    throw new Error('Wrong execution mode');
  }
  const selected = providerDispatch(task, dispatch);
  const policy = task.execution.policy;
  const outputProtocol = policy.outputProtocol ?? 'native-json-schema';
  const responseTransport = policy.responseTransport ?? 'buffered-json';
  const request =
    outputProtocol === 'native-json-schema' && policy.provider === 'OpenAI'
      ? {
          ...selected.request,
          outputSchema: projectOpenAiStrictSchema(
            selected.request.outputSchema,
          ),
        }
      : selected.request;
  reservationForRequest(
    request,
    policy,
    task.resources.envelope.maxSerializedRequestBytes,
    task.resources.envelope.maxInputTokens,
    selected.maxGeneratedTokens,
  );
  return {
    model: policy.model,
    messages: request.messages,
    stream: responseTransport === 'streaming-sse',
    ...(responseTransport === 'streaming-sse'
      ? { stream_options: { include_usage: true } }
      : {}),
    max_tokens: selected.maxGeneratedTokens,
    reasoning: { enabled: false, exclude: true },
    plugins: [
      { id: 'web', enabled: false },
      { id: 'context-compression', enabled: false },
    ],
    provider: {
      only: [policy.provider],
      allow_fallbacks: false,
      require_parameters: true,
    },
    response_format:
      outputProtocol === 'native-json-schema'
        ? {
            type: 'json_schema' as const,
            json_schema: {
              name: 'storyteller_result',
              strict: true,
              schema: request.outputSchema,
            },
          }
        : { type: 'json_object' as const },
  };
}

/** Exact packet facts only; token counts remain unknown without a verified tokenizer. */
export function inspectOpenRouterRequest(
  task: StorytellerTask,
  dispatch?: StorytellerProviderDispatch,
) {
  const selected = providerDispatch(task, dispatch);
  const body = buildOpenRouterRequest(task, selected);
  const serialized = JSON.stringify(body);
  const userMessage = body.messages.find((message) => message.role === 'user');
  let userSections: ReadonlyArray<{
    key: string;
    stability: 'stable' | 'changing';
    valueKind: 'array' | 'object' | 'scalar' | 'null';
    itemCount: number | null;
    characters: number;
    bytes: number;
    sha256: string;
  }> = [];
  if (userMessage) {
    try {
      const parsed = JSON.parse(userMessage.content) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        userSections = Object.entries(parsed).map(([key, value]) => {
          const serializedValue = JSON.stringify(value);
          return {
            key,
            stability:
              key === 'currentState' || key === 'selectedIntention'
                ? ('changing' as const)
                : ('stable' as const),
            valueKind:
              value === null
                ? ('null' as const)
                : Array.isArray(value)
                  ? ('array' as const)
                  : typeof value === 'object'
                    ? ('object' as const)
                    : ('scalar' as const),
            itemCount: Array.isArray(value)
              ? value.length
              : value && typeof value === 'object'
                ? Object.keys(value).length
                : null,
            characters: serializedValue.length,
            bytes: Buffer.byteLength(serializedValue, 'utf8'),
            sha256: createHash('sha256').update(serializedValue).digest('hex'),
          };
        });
      }
    } catch {
      // The exact message remains inspectable even when it is not JSON.
    }
  }
  return {
    purpose: describeStorytellerRequestPurpose(task),
    promptVersion: task.promptVersion,
    contextPolicyVersion: task.contextManifest.policyVersion,
    outputProtocol:
      task.execution.mode === 'provider'
        ? (task.execution.policy.outputProtocol ?? 'native-json-schema')
        : 'native-json-schema',
    responseTransport:
      task.execution.mode === 'provider'
        ? (task.execution.policy.responseTransport ?? 'buffered-json')
        : 'buffered-json',
    body,
    sha256: createHash('sha256').update(serialized).digest('hex'),
    serializedBytes: Buffer.byteLength(serialized, 'utf8'),
    capturedRequestBytes: Buffer.byteLength(
      JSON.stringify(selected.request),
      'utf8',
    ),
    outputSchemaBytes: Buffer.byteLength(
      JSON.stringify(selected.request.outputSchema),
      'utf8',
    ),
    outputSchemaSha256: createHash('sha256')
      .update(JSON.stringify(selected.request.outputSchema))
      .digest('hex'),
    messages: body.messages.map((message, index) => ({
      index,
      role: message.role,
      characters: message.content.length,
      bytes: Buffer.byteLength(message.content, 'utf8'),
      sha256: createHash('sha256').update(message.content).digest('hex'),
    })),
    userSections,
    estimatedInputTokens: null,
  } as const;
}

export type OpenRouterRequestInspection = ReturnType<
  typeof inspectOpenRouterRequest
>;

function commonPrefixBytes(left: string, right: string): number {
  const leftBytes = Buffer.from(left, 'utf8');
  const rightBytes = Buffer.from(right, 'utf8');
  const limit = Math.min(leftBytes.length, rightBytes.length);
  let index = 0;
  while (index < limit && leftBytes[index] === rightBytes[index]) index++;
  return index;
}

function reusableMessageContentPrefixBytes(
  left: OpenRouterRequestInspection,
  right: OpenRouterRequestInspection,
) {
  let total = 0;
  const messageCount = Math.min(
    left.body.messages.length,
    right.body.messages.length,
  );
  for (let index = 0; index < messageCount; index++) {
    const leftMessage = left.body.messages[index]!;
    const rightMessage = right.body.messages[index]!;
    if (leftMessage.role !== rightMessage.role) {
      break;
    }
    const shared = commonPrefixBytes(leftMessage.content, rightMessage.content);
    total += shared;
    const leftBytes = Buffer.byteLength(leftMessage.content, 'utf8');
    const rightBytes = Buffer.byteLength(rightMessage.content, 'utf8');
    if (shared < leftBytes || shared < rightBytes) {
      break;
    }
  }
  return total;
}

/** Compare exact assembled content; byte overlap is not a tokenizer/cache claim. */
export function compareOpenRouterRequests(
  left: OpenRouterRequestInspection,
  right: OpenRouterRequestInspection,
) {
  const messageCount = Math.max(
    left.body.messages.length,
    right.body.messages.length,
  );
  return {
    leftPurpose: left.purpose.id,
    rightPurpose: right.purpose.id,
    samePacket: left.sha256 === right.sha256,
    serializedBytesDelta: right.serializedBytes - left.serializedBytes,
    sameOutputSchema: left.outputSchemaSha256 === right.outputSchemaSha256,
    potentialReusableMessageContentBytes: reusableMessageContentPrefixBytes(
      left,
      right,
    ),
    messages: Array.from({ length: messageCount }, (_, index) => {
      const leftMessage = left.body.messages[index];
      const rightMessage = right.body.messages[index];
      return {
        index,
        rolesMatch: leftMessage?.role === rightMessage?.role,
        commonPrefixBytes:
          leftMessage && rightMessage
            ? commonPrefixBytes(leftMessage.content, rightMessage.content)
            : 0,
      };
    }),
    estimatedSharedInputTokens: null,
    observedProviderCacheHitTokens: null,
  } as const;
}

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
const providerIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[\x21-\x7e]+$/);

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
  id: providerIdSchema,
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

const streamChunkSchema = z.object({
  id: providerIdSchema.optional(),
  model: z.string().min(1).max(200).optional(),
  usage: usageSchema.nullable().optional(),
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullable().optional(),
        delta: z.object({
          content: z.string().nullable().optional(),
          refusal: z.string().nullable().optional(),
        }),
      }),
    )
    .max(1),
});

export type OpenRouterResponseDiagnostic = Readonly<{
  stage: 'provider-envelope' | 'model-json' | 'task-output' | 'valid';
  issues: ReadonlyArray<
    Readonly<{
      path: string;
      code: string;
      message: string;
    }>
  >;
}>;

function diagnosticIssues(
  error: z.ZodError,
): OpenRouterResponseDiagnostic['issues'] {
  return error.issues.slice(0, 12).map((issue) => ({
    path: issue.path.map(String).join('.'),
    code: issue.code,
    message: issue.message.slice(0, 240),
  }));
}

/**
 * Explain a captured response without retaining model prose in the diagnostic.
 * This is developer evidence only; it never repairs output or changes admission.
 */
export function diagnoseOpenRouterResponse(
  raw: string,
  task: StorytellerTask,
): OpenRouterResponseDiagnostic {
  let envelope: unknown;
  try {
    envelope = JSON.parse(raw);
  } catch {
    return {
      stage: 'provider-envelope',
      issues: [
        {
          path: '',
          code: 'invalid_json',
          message: 'Provider envelope is not valid JSON',
        },
      ],
    };
  }
  const parsedEnvelope = responseSchema.safeParse(envelope);
  if (!parsedEnvelope.success) {
    return {
      stage: 'provider-envelope',
      issues: diagnosticIssues(parsedEnvelope.error),
    };
  }
  const content = parsedEnvelope.data.choices[0]?.message.content ?? '';
  let output: unknown;
  try {
    output = JSON.parse(content);
  } catch {
    return {
      stage: 'model-json',
      issues: [
        {
          path: '',
          code: 'invalid_json',
          message: 'Model content is not valid JSON',
        },
      ],
    };
  }
  try {
    validateStorytellerResult(task, output);
    return { stage: 'valid', issues: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { stage: 'task-output', issues: diagnosticIssues(error) };
    }
    return {
      stage: 'task-output',
      issues: [
        {
          path: '',
          code: 'storyteller_policy',
          message:
            error instanceof Error
              ? error.message.slice(0, 240)
              : 'Storyteller output failed policy validation',
        },
      ],
    };
  }
}

function parseSseResponse(raw: string, headerProviderId: string | null) {
  let providerId = headerProviderId;
  let model: string | null = null;
  let usage: z.infer<typeof usageSchema> | null = null;
  let content = '';
  let refusal: string | null = null;
  let finishReason: string | null = null;
  let done = false;

  for (const event of raw.split(/\r?\n\r?\n/)) {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');
    if (!data) continue;
    if (data === '[DONE]') {
      done = true;
      continue;
    }
    const chunk = streamChunkSchema.parse(JSON.parse(data) as unknown);
    if (chunk.id && providerId && chunk.id !== providerId) {
      throw new Error('Streaming response generation identity changed');
    }
    if (chunk.model && model && chunk.model !== model) {
      throw new Error('Streaming response model identity changed');
    }
    providerId ??= chunk.id ?? null;
    model ??= chunk.model ?? null;
    usage = chunk.usage ?? usage;
    const choice = chunk.choices[0];
    content += choice?.delta.content ?? '';
    refusal = choice?.delta.refusal ?? refusal;
    finishReason = choice?.finish_reason ?? finishReason;
  }
  if (!done || !providerId || !model || !usage) {
    throw new Error('Incomplete streaming response');
  }
  return {
    id: providerId,
    model,
    usage,
    choices: [
      {
        finish_reason: finishReason,
        message: { content, refusal },
      },
    ],
  };
}

async function boundedResponse(
  response: Response,
  responseTransport: 'buffered-json' | 'streaming-sse',
  headerProviderId: string | null,
) {
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
  const raw = Buffer.concat(chunks).toString('utf8');
  return {
    raw,
    parsed:
      responseTransport === 'streaming-sse'
        ? parseSseResponse(raw, headerProviderId)
        : (JSON.parse(raw) as unknown),
  };
}

function responseGenerationId(response: Response) {
  const parsed = providerIdSchema.safeParse(
    response.headers.get('x-generation-id'),
  );
  return parsed.success ? parsed.data : null;
}

/** Explicit composition only: importing this file cannot read keys or send requests. No retries. */
export function createOpenRouterProvider(config: {
  enabled: boolean;
  apiKey: string;
  transport?: typeof fetch;
  /** Developer evidence hook. Receives the bounded literal provider envelope, never credentials. */
  recordResponse?: (evidence: {
    raw: string;
    httpStatus: number;
    receivedAt: string;
    providerId: string | null;
    requestSha256: string;
    purpose: ReturnType<typeof describeStorytellerRequestPurpose>;
  }) => void | Promise<void>;
}): StorytellerProvider {
  if (!config.enabled || !config.apiKey.trim()) {
    throw new Error('Live provider is disabled');
  }
  const transport = config.transport ?? fetch;
  return async (task, dispatch) => {
    const request = buildOpenRouterRequest(task, dispatch);
    const policy = task.execution.mode === 'provider' && task.execution.policy;
    if (!policy) throw new Error('Wrong execution mode');
    const startedAt = Date.now();
    let httpStatus: number | null = null;
    let providerId: string | null = null;
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
          body: JSON.stringify(request),
        },
      );
      httpStatus = response.status;
      providerId = responseGenerationId(response);
      // Even HTTP errors may follow a billed attempt. Missing accounting is not zero.
      const bounded = await boundedResponse(
        response,
        policy.responseTransport ?? 'buffered-json',
        providerId,
      );
      await config.recordResponse?.({
        raw: bounded.raw,
        httpStatus,
        receivedAt: new Date().toISOString(),
        providerId,
        requestSha256: createHash('sha256')
          .update(JSON.stringify(request))
          .digest('hex'),
        purpose: describeStorytellerRequestPurpose(task),
      });
      const parsed = responseSchema.safeParse(bounded.parsed);
      if (!parsed.success) {
        const rejected = rejectedSchemaEnvelope.safeParse(bounded.parsed);
        if (
          response.status === 400 &&
          rejected.success &&
          rejected.data.error.metadata?.provider_error_code ===
            'invalid_json_schema'
        ) {
          return {
            kind: 'failed',
            failureCode: 'invalid_output',
            usage: {
              reportedCostMicrousd: 0n,
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
              reasoningTokens: null,
              cachedTokens: null,
              cacheWriteTokens: null,
            },
            telemetry: {
              durationMs: Date.now() - startedAt,
              httpStatus,
              providerId: null,
              reportedModel: null,
              finishReason: 'invalid-json-schema',
            },
          };
        }
        return {
          kind: 'uncertain',
          telemetry: {
            durationMs: Date.now() - startedAt,
            httpStatus,
            providerId,
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
          providerId,
          reportedModel: null,
          finishReason: null,
        },
      };
    }
  };
}
