/**
 * Pure inspection of saved provider evidence for invalid-output repair.
 * No database, filesystem, provider transport, or budget settlement.
 */
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import type { StorytellerTask } from '@offscreen/storyteller/tasks';
import {
  describeStorytellerRequestPurpose,
  diagnoseStorytellerResult,
  storytellerTaskSchema,
} from '@offscreen/storyteller/tasks';
import {
  normalizeOpenAiStrictOutput,
  usdToMicrousd,
} from '@offscreen/storyteller/providers/openrouter';

const SHA256_HEX = /^[0-9a-f]{64}$/;
const EVIDENCE_BYTES_MAX = 600 * 1024;
const RAW_RESPONSE_MAX = 512 * 1024;

export class SavedRepairInspectionRefusal extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = 'SavedRepairInspectionRefusal';
    this.code = code;
  }
}

type ReviewState =
  | 'awaiting-review'
  | 'not-held'
  | 'released'
  | 'rejected'
  | 'superseded';

export type InspectSavedInvalidRepairResponseInput = {
  generationId: string;
  attemptId: string;
  generationAttemptId: string;
  task: StorytellerTask;
  reviewedPacketSha256: string;
  reviewState: ReviewState;
  evidenceBytes: Buffer | Uint8Array;
  recordedProviderId?: string | null;
};

export type ProposedSavedRepairSettlement = Readonly<{
  evidenceSha256: string;
  requestSha256: string;
  providerId: string;
  reportedModel: string;
  httpStatus: 200;
  usage: Readonly<{
    reportedCostMicrousd: bigint;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    reasoningTokens: number | null;
    cachedTokens: number | null;
    cacheWriteTokens: number | null;
  }>;
  telemetry: Readonly<{
    durationMs: null;
    httpStatus: 200;
    providerId: string;
    reportedModel: string;
    finishReason: string | null;
  }>;
  generationOutcome: Readonly<{
    state: 'failed';
    output: null;
    failureCode: 'invalid_output';
    repairCandidate: unknown;
    repairDiagnostic: NonNullable<
      ReturnType<typeof diagnoseStorytellerResult>
    >;
  }>;
  operationOutcome: 'continue';
}>;

function refuse(code: string): never {
  throw new SavedRepairInspectionRefusal(code);
}

function digestHex(value: string): boolean {
  return SHA256_HEX.test(value);
}

type EvidenceWrapper = {
  raw: string;
  httpStatus: number;
  receivedAt: string;
  providerId: string | null;
  requestSha256: string;
  purpose: unknown;
};

function parseEvidenceWrapper(bytes: Buffer | Uint8Array): EvidenceWrapper {
  let text: string;
  try {
    text =
      bytes instanceof Buffer
        ? bytes.toString('utf8')
        : Buffer.from(bytes).toString('utf8');
  } catch {
    refuse('refused_parse');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    refuse('refused_parse');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    refuse('refused_parse');
  }
  const record = parsed as Record<string, unknown>;
  if (
    typeof record.raw !== 'string' ||
    typeof record.httpStatus !== 'number' ||
    typeof record.receivedAt !== 'string' ||
    typeof record.requestSha256 !== 'string' ||
    record.purpose === undefined
  ) {
    refuse('refused_parse');
  }
  if (
    record.providerId !== null &&
    record.providerId !== undefined &&
    typeof record.providerId !== 'string'
  ) {
    refuse('refused_parse');
  }
  return {
    raw: record.raw,
    httpStatus: record.httpStatus,
    receivedAt: record.receivedAt,
    providerId:
      record.providerId === undefined
        ? null
        : (record.providerId as string | null),
    requestSha256: record.requestSha256,
    purpose: record.purpose,
  };
}

function parseEnvelope(raw: string): Record<string, unknown> {
  try {
    const envelope = JSON.parse(raw);
    if (envelope === null || typeof envelope !== 'object' || Array.isArray(envelope)) {
      refuse('refused_parse');
    }
    return envelope as Record<string, unknown>;
  } catch {
    refuse('refused_parse');
  }
}

function envelopeOtherwisePresent(envelope: Record<string, unknown>): boolean {
  const choices = envelope.choices;
  const choice =
    Array.isArray(choices) && choices.length > 0
      ? (choices[0] as Record<string, unknown>)
      : null;
  const message =
    choice && typeof choice === 'object' && choice.message != null
      ? (choice.message as Record<string, unknown>)
      : null;
  const content = message?.content;
  return (
    typeof envelope.model === 'string' &&
    envelope.model.length > 0 &&
    typeof content === 'string' &&
    content.length > 0 &&
    envelope.usage !== null &&
    envelope.usage !== undefined &&
    typeof envelope.usage === 'object'
  );
}

export function inspectSavedInvalidRepairResponse(
  input: InspectSavedInvalidRepairResponseInput,
): ProposedSavedRepairSettlement {
  if (input.evidenceBytes.byteLength > EVIDENCE_BYTES_MAX) {
    refuse('oversized');
  }

  const evidence = parseEvidenceWrapper(input.evidenceBytes);
  if (Buffer.byteLength(evidence.raw, 'utf8') > RAW_RESPONSE_MAX) {
    refuse('oversized');
  }

  const envelope = parseEnvelope(evidence.raw);

  if (input.generationAttemptId !== input.attemptId) {
    refuse('identity_mismatch');
  }

  const parsedTask = storytellerTaskSchema.safeParse(input.task);
  if (!parsedTask.success) {
    refuse('refused_parse');
  }
  const task = parsedTask.data;

  if (task.resources.recipe.version !== 'repairable-turn.v1') {
    refuse('recipe_not_repairable');
  }

  if (input.reviewState === 'superseded') {
    refuse('review_superseded');
  }
  if (input.reviewState !== 'released' && input.reviewState !== 'not-held') {
    refuse('review_not_dispatched');
  }

  if (
    !digestHex(input.reviewedPacketSha256) ||
    !digestHex(evidence.requestSha256) ||
    evidence.requestSha256 !== input.reviewedPacketSha256
  ) {
    refuse('wrong_request_digest');
  }

  const complete = envelopeOtherwisePresent(envelope);
  if (!complete) {
    refuse('incomplete_envelope');
  }
  if (evidence.httpStatus !== 200) {
    refuse('http_not_ok');
  }

  if (task.execution.mode !== 'provider') {
    refuse('wrong_model');
  }
  const policy = task.execution.policy;
  if (envelope.model !== policy.model) {
    refuse('wrong_model');
  }
  if (envelope.provider !== policy.provider) {
    refuse('wrong_provider');
  }

  const expectedPurpose = describeStorytellerRequestPurpose(task);
  if (!isDeepStrictEqual(evidence.purpose, expectedPurpose)) {
    refuse('wrong_purpose');
  }

  const usage = envelope.usage as Record<string, unknown>;
  const promptTokens = usage.prompt_tokens;
  const completionTokens = usage.completion_tokens;
  const totalTokens = usage.total_tokens;
  if (
    !Number.isSafeInteger(promptTokens) ||
    (promptTokens as number) < 0 ||
    !Number.isSafeInteger(completionTokens) ||
    (completionTokens as number) < 0 ||
    !Number.isSafeInteger(totalTokens) ||
    (totalTokens as number) < 0 ||
    (totalTokens as number) !==
      (promptTokens as number) + (completionTokens as number)
  ) {
    refuse('invalid_token_count');
  }

  let reportedCostMicrousd: bigint;
  try {
    reportedCostMicrousd = usdToMicrousd(usage.cost as string | number);
  } catch {
    refuse('malformed_cost');
  }

  const envelopeId =
    typeof envelope.id === 'string' && envelope.id.length > 0
      ? envelope.id
      : null;
  if (envelopeId === null) {
    refuse('missing_response_id');
  }
  if (
    evidence.providerId !== null &&
    evidence.providerId !== envelopeId
  ) {
    refuse('provider_id_mismatch');
  }
  if (
    input.recordedProviderId != null &&
    input.recordedProviderId !== envelopeId
  ) {
    refuse('provider_id_mismatch');
  }

  const choices = envelope.choices as Array<Record<string, unknown>>;
  const choice = choices[0]!;
  const message = choice.message as Record<string, unknown>;
  let candidate: unknown;
  try {
    candidate = normalizeOpenAiStrictOutput(
      JSON.parse(message.content as string),
      task.request.outputSchema,
    );
  } catch {
    refuse('refused_parse');
  }

  const diagnostic = diagnoseStorytellerResult(task, candidate);
  if (diagnostic === null) {
    refuse('valid_output');
  }

  const evidenceSha256 = createHash('sha256')
    .update(input.evidenceBytes)
    .digest('hex');

  const promptDetails = usage.prompt_tokens_details as
    | Record<string, unknown>
    | undefined;
  const completionDetails = usage.completion_tokens_details as
    | Record<string, unknown>
    | undefined;

  const result: ProposedSavedRepairSettlement = {
    evidenceSha256,
    requestSha256: input.reviewedPacketSha256,
    providerId: envelopeId,
    reportedModel: envelope.model as string,
    httpStatus: 200,
    usage: {
      reportedCostMicrousd,
      promptTokens: promptTokens as number,
      completionTokens: completionTokens as number,
      totalTokens: totalTokens as number,
      reasoningTokens:
        typeof completionDetails?.reasoning_tokens === 'number'
          ? completionDetails.reasoning_tokens
          : null,
      cachedTokens:
        typeof promptDetails?.cached_tokens === 'number'
          ? promptDetails.cached_tokens
          : null,
      cacheWriteTokens:
        typeof promptDetails?.cache_write_tokens === 'number'
          ? promptDetails.cache_write_tokens
          : null,
    },
    telemetry: {
      durationMs: null,
      httpStatus: 200,
      providerId: envelopeId,
      reportedModel: envelope.model as string,
      finishReason:
        choice.finish_reason === null || choice.finish_reason === undefined
          ? null
          : String(choice.finish_reason),
    },
    generationOutcome: {
      state: 'failed',
      output: null,
      failureCode: 'invalid_output',
      repairCandidate: candidate,
      repairDiagnostic: diagnostic,
    },
    operationOutcome: 'continue',
  };

  return Object.freeze(result);
}