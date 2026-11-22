import {
  preparedWireIsSelfConsistent,
  type PreparedProviderWire,
} from '@offscreen/storyteller/providers/openrouter';
import type {
  PreparedWriterRoundTransport,
  WriterRoundModelPolicy,
  WriterRoundPreflight,
  WriterRoundTransportResult,
} from '@offscreen/storyteller/providers/writer-round-transport';
import {
  writerMissionSceneScopeContinuationSchema,
  writerRoundDecisionSchema,
  writerSceneProposalV3Schema,
} from '@offscreen/storyteller/tasks';
import { z } from 'zod';

export const SCRIPTED_OFFLINE_LAB_MODEL = 'scripted-offline' as const;

const zeroUsage = {
  reportedCostMicrousd: 0n,
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  reasoningTokens: null,
  cachedTokens: null,
  cacheWriteTokens: null,
} as const;

const zeroTelemetry = {
  durationMs: 0,
  httpStatus: null,
  providerId: 'scripted-offline-lab',
  reportedModel: SCRIPTED_OFFLINE_LAB_MODEL,
  finishReason: 'stop',
} as const;

const writerRoundUserPayloadSchema = z.object({
  version: z.literal('writer-round.v1'),
  pins: z
    .object({
      sceneScope: writerMissionSceneScopeContinuationSchema,
    })
    .passthrough(),
  priorToolResults: z.array(z.unknown()).optional(),
});

function wireRejectedTelemetry() {
  return {
    durationMs: null,
    httpStatus: null,
    providerId: null,
    reportedModel: null,
    finishReason: 'wire-rejected',
  } as const;
}

function wireRejectedResult(): WriterRoundTransportResult {
  return {
    kind: 'failed',
    failureCode: 'wire_rejected',
    usage: { ...zeroUsage },
    telemetry: wireRejectedTelemetry(),
    exactWireSha256: null,
    sent: false,
  };
}

function requireScriptedOfflineModel(
  policy: WriterRoundModelPolicy,
): WriterRoundTransportResult | null {
  if (policy.model !== SCRIPTED_OFFLINE_LAB_MODEL) {
    return wireRejectedResult();
  }
  return null;
}

function isPositiveIntegerString(value: string): boolean {
  return /^[1-9]\d*$/.test(value);
}

function policyPrecheck(policy: WriterRoundModelPolicy): boolean {
  if (!isPositiveIntegerString(policy.inputMicrousdPerMillion)) return false;
  if (!isPositiveIntegerString(policy.outputMicrousdPerMillion)) return false;
  if (policy.maxMicrousd <= 0n) return false;
  if (
    !Number.isFinite(policy.timeoutMs) ||
    policy.timeoutMs < 1 ||
    policy.timeoutMs > 120_000
  ) {
    return false;
  }
  if (!Number.isFinite(policy.maxModelRounds) || policy.maxModelRounds <= 0) {
    return false;
  }
  return true;
}

function validateWireBodyMatchesPolicy(
  wire: PreparedProviderWire,
  policy: WriterRoundModelPolicy,
): WriterRoundTransportResult | null {
  if (!policyPrecheck(policy) || !preparedWireIsSelfConsistent(wire)) {
    return wireRejectedResult();
  }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(wire.serialized) as Record<string, unknown>;
  } catch {
    return wireRejectedResult();
  }
  if (body['model'] !== policy.model) {
    return wireRejectedResult();
  }
  const provider = body['provider'];
  if (!provider || typeof provider !== 'object' || Array.isArray(provider)) {
    return wireRejectedResult();
  }
  const providerRecord = provider as Record<string, unknown>;
  const only = providerRecord['only'];
  if (
    !Array.isArray(only) ||
    only.length !== 1 ||
    only[0] !== policy.provider
  ) {
    return wireRejectedResult();
  }
  if (providerRecord['allow_fallbacks'] !== false) {
    return wireRejectedResult();
  }
  const maxTokens = body['max_tokens'];
  if (
    typeof maxTokens !== 'number' ||
    !Number.isFinite(maxTokens) ||
    maxTokens <= 0 ||
    maxTokens !== policy.maxOutputTokens
  ) {
    return wireRejectedResult();
  }
  return null;
}

function parseV3ContinuationPins(
  wire: PreparedProviderWire,
): z.infer<typeof writerMissionSceneScopeContinuationSchema> | null {
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(wire.serialized) as Record<string, unknown>;
  } catch {
    return null;
  }
  const messages = body['messages'];
  if (!Array.isArray(messages)) {
    return null;
  }
  const userMessage = messages.find(
    (message) =>
      message &&
      typeof message === 'object' &&
      (message as { role?: string }).role === 'user',
  ) as { content?: string } | undefined;
  if (!userMessage || typeof userMessage.content !== 'string') {
    return null;
  }
  let payload: unknown;
  try {
    payload = JSON.parse(userMessage.content);
  } catch {
    return null;
  }
  const parsed = writerRoundUserPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return null;
  }
  return parsed.data.pins.sceneScope;
}

function narrativeIntent(key: string, label: string, intention: string) {
  return {
    kind: 'narrative-intent.v1' as const,
    key,
    label,
    intention,
    risk: 'The path may draw unwanted attention.',
    fictionalDurationSeconds: 1,
    effects: [] as [],
  };
}

/** Deterministic v3 final proposal from pinned wire context only; no SQL or DocumentStore. */
export function buildScriptedOfflineLabFinalDecisionBody(input: {
  baseSceneSequence: number;
}) {
  const nextSequence = input.baseSceneSequence + 1;
  const optionA = `scripted-${nextSequence}-a`;
  const optionB = `scripted-${nextSequence}-b`;
  const intentA = narrativeIntent(
    optionA,
    'Press onward',
    `Continue into scene ${nextSequence}.`,
  );
  const intentB = narrativeIntent(
    optionB,
    'Wait and watch',
    `Hold still before scene ${nextSequence} shifts.`,
  );
  const proposal = writerSceneProposalV3Schema.parse({
    version: 3,
    summary: `Scripted lab scene ${nextSequence}.`,
    stagedObjectHashes: [],
    sourceEvidence: [],
    scene: {
      content: {
        version: 1,
        title: `Scene ${nextSequence}`,
        paragraphs: [
          `The continuation advances into scene ${nextSequence} under scripted-offline lab transport.`,
        ],
      },
      interaction: {
        kind: 'choice.v1',
        prompt: 'What next?',
        options: [
          { id: optionA, label: intentA.label },
          { id: optionB, label: intentB.label },
        ],
      },
      authoredIntents: [intentA, intentB],
    },
    documentChanges: [],
  });
  return JSON.stringify(
    writerRoundDecisionSchema.parse({
      kind: 'final',
      proposal,
    }),
  );
}

function labPreflight(
  capturedWire: PreparedProviderWire,
  pinnedModelPolicy: WriterRoundModelPolicy,
): WriterRoundPreflight {
  const policyReject = requireScriptedOfflineModel(pinnedModelPolicy);
  if (policyReject) {
    return { kind: 'rejected', reason: 'wire_rejected' };
  }
  const wireReject = validateWireBodyMatchesPolicy(capturedWire, pinnedModelPolicy);
  if (wireReject) {
    return { kind: 'rejected', reason: 'wire_rejected' };
  }
  const sceneScope = parseV3ContinuationPins(capturedWire);
  if (!sceneScope) {
    return { kind: 'rejected', reason: 'wire_rejected' };
  }
  return { kind: 'ready', wireSha256: capturedWire.sha256 };
}

function labInvoke(
  capturedWire: PreparedProviderWire,
  pinnedModelPolicy: WriterRoundModelPolicy,
): WriterRoundTransportResult {
  const preflight = labPreflight(capturedWire, pinnedModelPolicy);
  if (preflight.kind !== 'ready') {
    return wireRejectedResult();
  }
  const sceneScope = parseV3ContinuationPins(capturedWire);
  if (!sceneScope) {
    return wireRejectedResult();
  }
  const serializedResponse = buildScriptedOfflineLabFinalDecisionBody({
    baseSceneSequence: sceneScope.baseSceneSequence,
  });
  return {
    kind: 'delivered',
    serializedResponse,
    usage: { ...zeroUsage },
    telemetry: { ...zeroTelemetry },
    exactWireSha256: capturedWire.sha256,
  };
}

/** In-memory Writer round transport for disposable lab mode; never performs fetch. */
export function prepareScriptedOfflineLabWriterRoundTransport(input: {
  capturedWire: PreparedProviderWire;
  pinnedModelPolicy: WriterRoundModelPolicy;
  outputSchema: unknown;
  apiKey: string | undefined;
  fetchImpl: typeof fetch;
}): PreparedWriterRoundTransport {
  void input.outputSchema;
  void input.apiKey;
  void input.fetchImpl;
  const { capturedWire, pinnedModelPolicy } = input;
  return {
    preflight: () => labPreflight(capturedWire, pinnedModelPolicy),
    invoke: async () => labInvoke(capturedWire, pinnedModelPolicy),
  };
}