/**
 * SA08: explicit model-route capability and packet cost report.
 * Reasoning stays disabled in the OpenRouter adapter until a proven route exists.
 */
import { z } from 'zod';
import type { StorytellerTask } from '../tasks';
import {
  calculatedProviderCharge,
  maximumInputMicrousdPerMillion,
  maximumProviderCharge,
  type ExecutionPolicy,
} from '../tasks/policy';
import {
  compareOpenRouterRequests,
  inspectOpenRouterRequest,
  type ProviderUsage,
  type StorytellerProviderDispatch,
} from './openrouter';

type ProviderExecution = Extract<ExecutionPolicy, { mode: 'provider' }>;

export const MODEL_ROUTE_CAPABILITIES_VERSION =
  'model-route-capabilities.v1' as const;

export const modelRouteCapabilitiesSchema = z.strictObject({
  version: z.literal(MODEL_ROUTE_CAPABILITIES_VERSION),
  route: z.string().min(1).max(100),
  model: z.string().min(1).max(160),
  provider: z.string().min(1).max(100),
  priceVersion: z.string().min(1).max(100),
  outputProtocol: z.enum([
    'native-json-schema',
    'json-object-local-validation',
    'memory-json-object-native-final',
  ]),
  responseTransport: z.enum(['buffered-json', 'streaming-sse']),
  serviceTier: z.enum(['default', 'flex', 'priority']),
  maxInputTokens: z.number().int().positive(),
  maxOutputTokens: z.number().int().positive(),
  maxReasoningTokens: z.literal(0),
  reasoning: z.strictObject({
    mode: z.literal('disabled'),
    enforcedInAdapter: z.literal(true),
    billableCategorySupported: z.literal(false),
    note: z.string().min(1).max(240),
  }),
  caching: z.strictObject({
    mode: z.literal('provider-reported-only'),
    explicitCacheControl: z.literal(false),
    sessionPinning: z.literal(false),
    reservationUsesWorstCaseWrite: z.literal(true),
    prefixBytesAreNotHits: z.literal(true),
    note: z.string().min(1).max(240),
  }),
  pricing: z.strictObject({
    inputMicrousdPerMillion: z.string(),
    outputMicrousdPerMillion: z.string(),
    cacheReadMicrousdPerMillion: z.string().nullable(),
    cacheWriteMicrousdPerMillion: z.string().nullable(),
    reasoningMicrousdPerMillion: z.null(),
    worstCaseInputMicrousdPerMillion: z.string(),
    priceKnown: z.boolean(),
  }),
  transport: z.strictObject({
    providerFallbacks: z.literal(false),
    webPlugin: z.literal(false),
    contextCompression: z.literal(false),
    requireParameters: z.literal(true),
  }),
  unknowns: z.array(z.string().min(1).max(120)).max(16),
});

export type ModelRouteCapabilities = z.infer<
  typeof modelRouteCapabilitiesSchema
>;

type ProviderPolicy = ProviderExecution['policy'];

/**
 * Derive the truthful capability matrix for a captured route policy.
 * Does not invent tokenizer counts or cache hits.
 */
export function resolveModelRouteCapabilities(
  policy: ProviderPolicy,
): ModelRouteCapabilities {
  const priceKnown =
    /^\d+$/.test(policy.inputMicrousdPerMillion) &&
    /^\d+$/.test(policy.outputMicrousdPerMillion) &&
    policy.priceVersion !== 'not-priced' &&
    policy.priceVersion.trim().length > 0;
  return modelRouteCapabilitiesSchema.parse({
    version: MODEL_ROUTE_CAPABILITIES_VERSION,
    route: policy.route,
    model: policy.model,
    provider: policy.provider,
    priceVersion: policy.priceVersion,
    outputProtocol: policy.outputProtocol ?? 'native-json-schema',
    responseTransport: policy.responseTransport ?? 'buffered-json',
    serviceTier: policy.serviceTier ?? 'default',
    maxInputTokens: policy.maxInputTokens,
    maxOutputTokens: policy.maxOutputTokens,
    maxReasoningTokens: 0,
    reasoning: {
      mode: 'disabled',
      enforcedInAdapter: true,
      billableCategorySupported: false,
      note: 'OpenRouter adapter hard-disables reasoning; policy reasoning budgets do not enable it.',
    },
    caching: {
      mode: 'provider-reported-only',
      explicitCacheControl: false,
      sessionPinning: false,
      reservationUsesWorstCaseWrite: true,
      prefixBytesAreNotHits: true,
      note: 'Shared prefix bytes are structural potential only; cached tokens stay unknown without provider usage.',
    },
    pricing: {
      inputMicrousdPerMillion: policy.inputMicrousdPerMillion,
      outputMicrousdPerMillion: policy.outputMicrousdPerMillion,
      cacheReadMicrousdPerMillion: policy.cacheReadMicrousdPerMillion ?? null,
      cacheWriteMicrousdPerMillion: policy.cacheWriteMicrousdPerMillion ?? null,
      reasoningMicrousdPerMillion: null,
      worstCaseInputMicrousdPerMillion:
        maximumInputMicrousdPerMillion(policy).toString(),
      priceKnown,
    },
    transport: {
      providerFallbacks: false,
      webPlugin: false,
      contextCompression: false,
      requireParameters: true,
    },
    unknowns: [
      'tokenizerInputTokens',
      'providerCacheHitWithoutUsageReport',
      'reasoningBillingUnsupported',
    ],
  });
}

/** Fail closed if a built OpenRouter body violates the capability matrix. */
export function assertOpenRouterRequestMatchesCapabilities(
  body: ReturnType<typeof inspectOpenRouterRequest>['body'],
  capabilities: ModelRouteCapabilities,
) {
  if (body.reasoning?.enabled !== false || body.reasoning?.exclude !== true) {
    throw new Error('Route capabilities require reasoning to stay disabled');
  }
  if (body.provider?.allow_fallbacks !== false) {
    throw new Error('Route capabilities forbid provider fallbacks');
  }
  if (body.provider?.require_parameters !== true) {
    throw new Error('Route capabilities require provider parameter enforcement');
  }
  const plugins = Array.isArray(body.plugins) ? body.plugins : [];
  for (const plugin of plugins) {
    if (
      plugin &&
      typeof plugin === 'object' &&
      'enabled' in plugin &&
      (plugin as { enabled?: unknown }).enabled !== false
    ) {
      throw new Error('Route capabilities forbid enabled OpenRouter plugins');
    }
  }
  if (capabilities.reasoning.mode !== 'disabled') {
    throw new Error('Unsupported reasoning capability declared');
  }
  if (capabilities.caching.explicitCacheControl) {
    throw new Error('Explicit cache control is not authorized on this route');
  }
  if ('cache_control' in body) {
    throw new Error('OpenRouter body must not set cache_control without opt-in');
  }
}

export const modelRoutePacketReportSchema = z.strictObject({
  version: z.literal('model-route-packet-report.v1'),
  capabilities: modelRouteCapabilitiesSchema,
  packet: z.strictObject({
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    serializedBytes: z.number().int().nonnegative(),
    capturedRequestBytes: z.number().int().nonnegative(),
    outputSchemaBytes: z.number().int().nonnegative(),
    outputSchemaSha256: z.string().regex(/^[a-f0-9]{64}$/),
    potentialReusablePrefixBytes: z.number().int().nonnegative().nullable(),
  }),
  usage: z.strictObject({
    estimatedInputTokens: z.null(),
    promptTokens: z.number().int().nonnegative().nullable(),
    completionTokens: z.number().int().nonnegative().nullable(),
    reasoningTokens: z.number().int().nonnegative().nullable(),
    cachedTokens: z.number().int().nonnegative().nullable(),
    cacheWriteTokens: z.number().int().nonnegative().nullable(),
    reportedCostMicrousd: z.string().nullable(),
    calculatedCostMicrousd: z.string().nullable(),
  }),
  requestCeilingMicrousd: z.string().regex(/^(0|[1-9]\d{0,14})$/),
  durationMs: z.number().int().nonnegative().nullable(),
  transportPerformed: z.boolean(),
  unknowns: z.array(z.string().min(1).max(120)).max(24),
});

export type ModelRoutePacketReport = z.infer<
  typeof modelRoutePacketReportSchema
>;

/**
 * Provider-free packet report. Usage/cache fields stay null unless a captured
 * ProviderUsage is supplied; prefix overlap is never treated as a cache hit.
 */
export function createModelRoutePacketReport(input: {
  task: StorytellerTask;
  dispatch?: StorytellerProviderDispatch;
  usage?: ProviderUsage | null;
  durationMs?: number | null;
  compareAgainstTask?: StorytellerTask;
  transportPerformed?: boolean;
}): ModelRoutePacketReport {
  if (input.task.execution.mode !== 'provider') {
    throw new Error('Model route reports require provider execution');
  }
  const capabilities = resolveModelRouteCapabilities(input.task.execution.policy);
  if (!capabilities.pricing.priceKnown) {
    throw new Error('storyteller_route_price_unknown');
  }
  const inspection = inspectOpenRouterRequest(input.task, input.dispatch);
  assertOpenRouterRequestMatchesCapabilities(inspection.body, capabilities);

  let potentialReusablePrefixBytes: number | null = null;
  if (input.compareAgainstTask) {
    if (input.compareAgainstTask.execution.mode !== 'provider') {
      throw new Error('Comparison task must use provider execution');
    }
    const other = inspectOpenRouterRequest(input.compareAgainstTask);
    potentialReusablePrefixBytes = compareOpenRouterRequests(
      inspection,
      other,
    ).potentialReusableMessageContentBytes;
  }

  const usage = input.usage ?? null;
  const calculated =
    usage == null
      ? null
      : calculatedProviderCharge(input.task.execution, usage);
  const unknowns = [
    ...capabilities.unknowns,
    ...(usage?.cachedTokens == null ? ['cachedTokens'] : []),
    ...(usage?.cacheWriteTokens == null ? ['cacheWriteTokens'] : []),
    ...(usage?.reasoningTokens == null ? ['reasoningTokens'] : []),
    ...(usage?.reasoningTokens != null && usage.reasoningTokens > 0
      ? ['unexpectedReasoningTokensWithDisabledReasoning']
      : []),
    ...(potentialReusablePrefixBytes != null
      ? ['prefixBytesAreNotProviderCacheHits']
      : []),
    ...(input.durationMs == null ? ['providerDurationMs'] : []),
  ];

  return modelRoutePacketReportSchema.parse({
    version: 'model-route-packet-report.v1',
    capabilities,
    packet: {
      sha256: inspection.sha256,
      serializedBytes: inspection.serializedBytes,
      capturedRequestBytes: inspection.capturedRequestBytes,
      outputSchemaBytes: inspection.outputSchemaBytes,
      outputSchemaSha256: inspection.outputSchemaSha256,
      potentialReusablePrefixBytes,
    },
    usage: {
      estimatedInputTokens: null,
      promptTokens: usage?.promptTokens ?? null,
      completionTokens: usage?.completionTokens ?? null,
      reasoningTokens: usage?.reasoningTokens ?? null,
      cachedTokens: usage?.cachedTokens ?? null,
      cacheWriteTokens: usage?.cacheWriteTokens ?? null,
      reportedCostMicrousd:
        usage?.reportedCostMicrousd != null
          ? usage.reportedCostMicrousd.toString()
          : null,
      calculatedCostMicrousd:
        calculated == null ? null : calculated.toString(),
    },
    requestCeilingMicrousd: maximumProviderCharge(
      input.task.execution as ProviderExecution,
    ),
    durationMs: input.durationMs ?? null,
    transportPerformed: input.transportPerformed ?? false,
    unknowns: [...new Set(unknowns)],
  });
}

export function formatModelRoutePacketReport(report: ModelRoutePacketReport) {
  const lines = [
    `# Model route packet report ${report.version}`,
    '',
    `- route: ${report.capabilities.route} / ${report.capabilities.provider} / ${report.capabilities.model}`,
    `- protocol: ${report.capabilities.outputProtocol}; transport ${report.capabilities.responseTransport}`,
    `- reasoning: ${report.capabilities.reasoning.mode} (adapter enforced)`,
    `- caching: ${report.capabilities.caching.mode}; prefix≠hit`,
    `- packet: ${report.packet.serializedBytes}B#${report.packet.sha256.slice(0, 12)}`,
    `- prefix potential: ${report.packet.potentialReusablePrefixBytes ?? 'n/a'} bytes`,
    `- usage tokens: prompt ${report.usage.promptTokens ?? 'unknown'}; cached ${report.usage.cachedTokens ?? 'unknown'}; write ${report.usage.cacheWriteTokens ?? 'unknown'}; reasoning ${report.usage.reasoningTokens ?? 'unknown'}`,
    `- cost: reported ${report.usage.reportedCostMicrousd ?? 'null'}; calculated ${report.usage.calculatedCostMicrousd ?? 'null'}`,
    `- request ceiling microusd: ${report.requestCeilingMicrousd}`,
    `- transport: ${report.transportPerformed ? 'performed' : 'not performed'}`,
    `- unknowns: ${report.unknowns.join(', ')}`,
  ];
  return `${lines.join('\n')}\n`;
}
