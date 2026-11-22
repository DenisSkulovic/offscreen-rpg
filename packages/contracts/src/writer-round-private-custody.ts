import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { z } from 'zod';
import { gameAuthorityErrorSchema } from './game-authority';

/** Private Game Authority seam for Writer v3 provider rounds. Not a player route. */
export const writerRoundPrivateCustodyContractVersion =
  'writer-round.private.v1' as const;

export const writerRoundPrivateCustodyVersionHeader =
  'x-offscreen-writer-round-private-version' as const;

/** Matches apps/game-authority/src/server.ts BODY_LIMIT for JSON command bodies. */
export const writerRoundPrivateCustodyBodyByteLimit = 64 * 1024;

export const writerRoundPrivateMaxWireBytes = 32_768;

const writerRoundPrivateRequestVersionSchema = z.literal(
  writerRoundPrivateCustodyContractVersion,
);

const writerRoundPrivateSha256Schema = z
  .string()
  .regex(/^[0-9a-f]{64}$/);

const writerRoundPrivateUuidSchema = z.uuid();

const writerRoundPrivatePositiveIntSchema = z.number().int().positive();

/** Canonical nonnegative base-10 decimal string without exponents. */
export const writerRoundCanonicalMicrousdSchema = z
  .string()
  .regex(/^(0|[1-9]\d*)$/)
  .max(40);

export const writerRoundModelPolicyWireSchema = z.strictObject({
  model: z.string().min(1).max(200),
  provider: z.string().min(1).max(200),
  priceVersion: z.string().min(1).max(64),
  inputMicrousdPerMillion: z.string().regex(/^[1-9]\d*$/).max(40),
  outputMicrousdPerMillion: z.string().regex(/^[1-9]\d*$/).max(40),
  maxInputTokens: writerRoundPrivatePositiveIntSchema,
  maxOutputTokens: writerRoundPrivatePositiveIntSchema,
  maxModelRounds: writerRoundPrivatePositiveIntSchema,
  timeoutMs: writerRoundPrivatePositiveIntSchema,
  maxMicrousd: writerRoundCanonicalMicrousdSchema,
});

export type WriterRoundModelPolicyWire = z.infer<
  typeof writerRoundModelPolicyWireSchema
>;

export const writerRoundPreparedProviderWireSchema = z.strictObject({
  version: z.literal('openrouter-wire.v1'),
  serialized: z.string().max(writerRoundPrivateMaxWireBytes),
  sha256: writerRoundPrivateSha256Schema,
  serializedBytes: z.number().int().nonnegative(),
});

export type WriterRoundPreparedProviderWire = z.infer<
  typeof writerRoundPreparedProviderWireSchema
>;

export const writerRoundProviderUsageWireSchema = z.strictObject({
  reportedCostMicrousd: writerRoundCanonicalMicrousdSchema,
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  reasoningTokens: z.number().int().nonnegative().nullable(),
  cachedTokens: z.number().int().nonnegative().nullable(),
  cacheWriteTokens: z.number().int().nonnegative().nullable(),
});

export type WriterRoundProviderUsageWire = z.infer<
  typeof writerRoundProviderUsageWireSchema
>;

export const writerRoundProviderTelemetryWireSchema = z.strictObject({
  durationMs: z.number().int().nonnegative().nullable(),
  httpStatus: z.number().int().nullable(),
  providerId: z.string().max(128).nullable(),
  reportedModel: z.string().max(200).nullable(),
  finishReason: z.string().max(64).nullable(),
});

export type WriterRoundProviderTelemetryWire = z.infer<
  typeof writerRoundProviderTelemetryWireSchema
>;

export const writerRoundPrivatePrepareRequestSchema = z.strictObject({
  schemaVersion: writerRoundPrivateRequestVersionSchema,
  contextId: writerRoundPrivateUuidSchema,
  attemptId: writerRoundPrivateUuidSchema,
  expectedRevision: writerRoundPrivatePositiveIntSchema,
});

export type WriterRoundPrivatePrepareRequest = z.infer<
  typeof writerRoundPrivatePrepareRequestSchema
>;

export const writerRoundPrivatePrepareResponseSchema = z.discriminatedUnion(
  'status',
  [
    z.strictObject({
      status: z.literal('ready'),
      missionId: writerRoundPrivateUuidSchema,
      contextId: writerRoundPrivateUuidSchema,
      ordinal: writerRoundPrivatePositiveIntSchema,
      attemptId: writerRoundPrivateUuidSchema,
      requestSha256: writerRoundPrivateSha256Schema,
      wire: writerRoundPreparedProviderWireSchema,
      modelPolicy: writerRoundModelPolicyWireSchema,
    }),
    z.strictObject({
      status: z.literal('replayed'),
      responseSha256: writerRoundPrivateSha256Schema.nullable().optional(),
    }),
    z.strictObject({
      status: z.literal('held'),
      reason: z.string().min(1).max(128),
    }),
    z.strictObject({ status: z.literal('uncertain') }),
  ],
);

export type WriterRoundPrivatePrepareResponse = z.infer<
  typeof writerRoundPrivatePrepareResponseSchema
>;

const writerRoundPrivateSubmitFailureCodeSchema = z.enum([
  'provider_refusal',
  'provider_unavailable',
  'invalid_output',
  'malformed_output',
  'over_budget',
  'wire_rejected',
]);

const writerRoundPrivateOutcomeDeliveredSchema = z.strictObject({
  kind: z.literal('delivered'),
  serializedResponse: z.string().max(writerRoundPrivateMaxWireBytes),
  usage: writerRoundProviderUsageWireSchema,
  telemetry: writerRoundProviderTelemetryWireSchema,
  exactWireSha256: writerRoundPrivateSha256Schema,
});

const writerRoundPrivateOutcomeFailedSchema = z.strictObject({
  kind: z.literal('failed'),
  sent: z.boolean(),
  failureCode: writerRoundPrivateSubmitFailureCodeSchema,
  usage: writerRoundProviderUsageWireSchema.optional(),
  telemetry: writerRoundProviderTelemetryWireSchema.optional(),
});

const writerRoundPrivateOutcomeUnknownSchema = z.strictObject({
  kind: z.literal('unknown'),
  telemetry: writerRoundProviderTelemetryWireSchema.optional(),
});

export const writerRoundPrivateOutcomeSchema = z.discriminatedUnion('kind', [
  writerRoundPrivateOutcomeDeliveredSchema,
  writerRoundPrivateOutcomeFailedSchema,
  writerRoundPrivateOutcomeUnknownSchema,
]);

export const writerRoundPrivateSubmitOutcomeRequestSchema = z.strictObject({
  schemaVersion: writerRoundPrivateRequestVersionSchema,
  requestSha256: writerRoundPrivateSha256Schema,
  outcome: writerRoundPrivateOutcomeSchema,
});

export type WriterRoundPrivateSubmitOutcomeRequest = z.infer<
  typeof writerRoundPrivateSubmitOutcomeRequestSchema
>;

export const writerRoundPrivateSubmitOutcomeResponseSchema =
  z.discriminatedUnion('status', [
    z.strictObject({
      status: z.literal('delivered'),
      resultCasHash: writerRoundPrivateSha256Schema,
    }),
    z.strictObject({
      status: z.literal('replayed'),
      resultCasHash: writerRoundPrivateSha256Schema,
    }),
    z.strictObject({
      status: z.literal('held'),
      reason: z.string().min(1).max(128),
    }),
    z.strictObject({ status: z.literal('uncertain') }),
    z.strictObject({
      status: z.literal('failed'),
      reason: z.string().min(1).max(128),
    }),
  ]);

export type WriterRoundPrivateSubmitOutcomeResponse = z.infer<
  typeof writerRoundPrivateSubmitOutcomeResponseSchema
>;

export const writerRoundPrivateStatusResponseSchema = z.strictObject({
  status: z.enum([
    'dispatched',
    'settled',
    'uncertain',
    'held',
    'failed',
  ]),
  attemptId: writerRoundPrivateUuidSchema.optional(),
  responseSha256: writerRoundPrivateSha256Schema.optional(),
});

export type WriterRoundPrivateStatusResponse = z.infer<
  typeof writerRoundPrivateStatusResponseSchema
>;

export const writerRoundPrivateHttpErrorSchema = gameAuthorityErrorSchema;

export type WriterRoundPrivateParseFailure =
  | 'oversized-body'
  | 'invalid-json'
  | 'invalid-shape';

export function writerRoundPrivateMissionIdSchema() {
  return writerRoundPrivateUuidSchema;
}

export function writerRoundPrivatePreparePath(
  missionId: string,
  ordinal: number,
): string {
  writerRoundPrivateUuidSchema.parse(missionId);
  writerRoundPrivatePositiveIntSchema.parse(ordinal);
  return `/internal/v1/writer-rounds/${missionId}/${ordinal}/prepare`;
}

export function writerRoundPrivateOutcomePath(
  missionId: string,
  ordinal: number,
  attemptId: string,
): string {
  writerRoundPrivateUuidSchema.parse(missionId);
  writerRoundPrivatePositiveIntSchema.parse(ordinal);
  writerRoundPrivateUuidSchema.parse(attemptId);
  return `/internal/v1/writer-rounds/${missionId}/${ordinal}/outcomes/${attemptId}`;
}

export function writerRoundPrivateStatusPath(
  missionId: string,
  ordinal: number,
): string {
  writerRoundPrivateUuidSchema.parse(missionId);
  writerRoundPrivatePositiveIntSchema.parse(ordinal);
  return `/internal/v1/writer-rounds/${missionId}/${ordinal}/status`;
}

export type WriterRoundPrivateRoute =
  | { kind: 'prepare'; missionId: string; ordinal: number }
  | { kind: 'submit-outcome'; missionId: string; ordinal: number; attemptId: string }
  | { kind: 'status'; missionId: string; ordinal: number }
  | { kind: 'invalid' }
  | { kind: 'absent' };

export function routeWriterRoundPrivateCustody(
  method: string,
  pathname: string,
): WriterRoundPrivateRoute {
  const parts = pathname.split('/').filter((part) => part.length > 0);
  if (parts[0] !== 'internal' || parts[1] !== 'v1' || parts[2] !== 'writer-rounds') {
    return { kind: 'absent' };
  }
  if (parts.length < 4) {
    return { kind: 'invalid' };
  }
  const missionId = writerRoundPrivateUuidSchema.safeParse(parts[3]);
  if (!missionId.success) {
    return { kind: 'invalid' };
  }
  const ordinal = writerRoundPrivatePositiveIntSchema.safeParse(
    Number(parts[4]),
  );
  if (!ordinal.success) {
    return { kind: 'invalid' };
  }
  if (parts.length === 6 && parts[5] === 'prepare' && method === 'POST') {
    return {
      kind: 'prepare',
      missionId: missionId.data,
      ordinal: ordinal.data,
    };
  }
  if (parts.length === 6 && parts[5] === 'status' && method === 'GET') {
    return {
      kind: 'status',
      missionId: missionId.data,
      ordinal: ordinal.data,
    };
  }
  if (
    parts.length === 7 &&
    parts[5] === 'outcomes' &&
    method === 'PUT'
  ) {
    const attemptId = writerRoundPrivateUuidSchema.safeParse(parts[6]);
    if (!attemptId.success) {
      return { kind: 'invalid' };
    }
    return {
      kind: 'submit-outcome',
      missionId: missionId.data,
      ordinal: ordinal.data,
      attemptId: attemptId.data,
    };
  }
  return { kind: 'absent' };
}

export function writerRoundMicrousdWireToBigInt(value: string): bigint {
  const parsed = writerRoundCanonicalMicrousdSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error('invalid_microusd_wire');
  }
  return BigInt(parsed.data);
}

export function writerRoundModelPolicyFromWire(
  wire: WriterRoundModelPolicyWire,
): {
  model: string;
  provider: string;
  priceVersion: string;
  inputMicrousdPerMillion: string;
  outputMicrousdPerMillion: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  maxModelRounds: number;
  timeoutMs: number;
  maxMicrousd: bigint;
} {
  return {
    ...wire,
    maxMicrousd: writerRoundMicrousdWireToBigInt(wire.maxMicrousd),
  };
}

export function writerRoundModelPolicyToWire(policy: {
  model: string;
  provider: string;
  priceVersion: string;
  inputMicrousdPerMillion: string;
  outputMicrousdPerMillion: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  maxModelRounds: number;
  timeoutMs: number;
  maxMicrousd: bigint;
}): WriterRoundModelPolicyWire {
  if (policy.maxMicrousd < 0n) {
    throw new Error('invalid_microusd');
  }
  const maxMicrousd = policy.maxMicrousd.toString();
  writerRoundCanonicalMicrousdSchema.parse(maxMicrousd);
  return writerRoundModelPolicyWireSchema.parse({
    model: policy.model,
    provider: policy.provider,
    priceVersion: policy.priceVersion,
    inputMicrousdPerMillion: policy.inputMicrousdPerMillion,
    outputMicrousdPerMillion: policy.outputMicrousdPerMillion,
    maxInputTokens: policy.maxInputTokens,
    maxOutputTokens: policy.maxOutputTokens,
    maxModelRounds: policy.maxModelRounds,
    timeoutMs: policy.timeoutMs,
    maxMicrousd,
  });
}

export function writerRoundProviderUsageFromWire(
  wire: WriterRoundProviderUsageWire,
): {
  reportedCostMicrousd: bigint;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  reasoningTokens: number | null;
  cachedTokens: number | null;
  cacheWriteTokens: number | null;
} {
  return {
    reportedCostMicrousd: writerRoundMicrousdWireToBigInt(
      wire.reportedCostMicrousd,
    ),
    promptTokens: wire.promptTokens,
    completionTokens: wire.completionTokens,
    totalTokens: wire.totalTokens,
    reasoningTokens: wire.reasoningTokens,
    cachedTokens: wire.cachedTokens,
    cacheWriteTokens: wire.cacheWriteTokens,
  };
}

export function writerRoundProviderUsageToWire(usage: {
  reportedCostMicrousd: bigint;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  reasoningTokens: number | null;
  cachedTokens: number | null;
  cacheWriteTokens: number | null;
}): WriterRoundProviderUsageWire {
  if (usage.reportedCostMicrousd < 0n) {
    throw new Error('invalid_microusd');
  }
  return writerRoundProviderUsageWireSchema.parse({
    reportedCostMicrousd: usage.reportedCostMicrousd.toString(),
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    reasoningTokens: usage.reasoningTokens,
    cachedTokens: usage.cachedTokens,
    cacheWriteTokens: usage.cacheWriteTokens,
  });
}

export function preparedWriterRoundWireIsSelfConsistent(
  wire: WriterRoundPreparedProviderWire,
): boolean {
  if (wire.version !== 'openrouter-wire.v1') {
    return false;
  }
  const byteLength = Buffer.byteLength(wire.serialized, 'utf8');
  if (wire.serializedBytes !== byteLength) {
    return false;
  }
  const digest = createHash('sha256').update(wire.serialized).digest('hex');
  return digest === wire.sha256;
}

export type WriterRoundPrivateParsedBody =
  | { ok: true; value: unknown }
  | { ok: false; reason: WriterRoundPrivateParseFailure };

export function parseWriterRoundPrivateJsonBody(
  raw: string | Uint8Array,
  limit = writerRoundPrivateCustodyBodyByteLimit,
): WriterRoundPrivateParsedBody {
  const bytes =
    typeof raw === 'string'
      ? Buffer.byteLength(raw, 'utf8')
      : raw.byteLength;
  if (bytes > limit) {
    return { ok: false, reason: 'oversized-body' };
  }
  if (bytes === 0) {
    return { ok: false, reason: 'invalid-shape' };
  }
  const text =
    typeof raw === 'string' ? raw : Buffer.from(raw).toString('utf8');
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, reason: 'invalid-json' };
  }
  return { ok: true, value };
}

export function parseWriterRoundPrivatePrepareRequest(
  raw: string | Uint8Array,
  limit = writerRoundPrivateCustodyBodyByteLimit,
) {
  const body = parseWriterRoundPrivateJsonBody(raw, limit);
  if (!body.ok) return body;
  const parsed = writerRoundPrivatePrepareRequestSchema.safeParse(body.value);
  if (!parsed.success) {
    return { ok: false as const, reason: 'invalid-shape' as const };
  }
  return { ok: true as const, value: parsed.data };
}

export function parseWriterRoundPrivateSubmitOutcomeRequest(
  raw: string | Uint8Array,
  limit = writerRoundPrivateCustodyBodyByteLimit,
) {
  const body = parseWriterRoundPrivateJsonBody(raw, limit);
  if (!body.ok) return body;
  const parsed = writerRoundPrivateSubmitOutcomeRequestSchema.safeParse(
    body.value,
  );
  if (!parsed.success) {
    return { ok: false as const, reason: 'invalid-shape' as const };
  }
  return { ok: true as const, value: parsed.data };
}