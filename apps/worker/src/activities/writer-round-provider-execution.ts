import { ApplicationFailure } from '@temporalio/client';
import type { WriterRoundPrivateSubmitOutcomeResponse } from '@offscreen/contracts/writer-round-private-custody';
import {
  writerRoundModelPolicyFromWire,
  writerRoundProviderUsageToWire,
  writerRoundPrivateOutcomeSchema,
} from '@offscreen/contracts/writer-round-private-custody';
import type { z } from 'zod';

type WriterRoundPrivateOutcome = z.infer<typeof writerRoundPrivateOutcomeSchema>;
import {
  prepareWriterRoundTransport,
  type PreparedWriterRoundTransport,
  type WriterRoundTransportResult,
} from '@offscreen/storyteller/providers/writer-round-transport';
import type { ProviderTelemetry } from '@offscreen/storyteller/providers/openrouter';
import {
  assertPreparedWirePins,
  createWriterRoundPrivateClient,
  WriterRoundPrivateTransportError,
  type WriterRoundPrivateClient,
  type WriterRoundPrivateClientConfig,
} from '../custody/writer-round-private-client';

export type ExecutePreparedWriterRoundInput = {
  missionId: string;
  ordinal: number;
  contextId: string;
  attemptId: string;
  expectedRevision: number;
};

export type ExecutePreparedWriterRoundDeps = {
  custody: WriterRoundPrivateClient;
  apiKey: string | undefined;
  outputSchema: unknown;
  fetchImpl: typeof fetch;
  /** Test hook: count or replace transport construction. */
  prepareTransport?: typeof prepareWriterRoundTransport;
};

export type WriterRoundProviderExecutionActivities = {
  executePreparedWriterRound(
    input: ExecutePreparedWriterRoundInput,
  ): Promise<WriterRoundPrivateSubmitOutcomeResponse | { status: 'replayed' }>;
};

function telemetryToWire(telemetry: ProviderTelemetry) {
  return {
    durationMs: telemetry.durationMs,
    httpStatus: telemetry.httpStatus,
    providerId: telemetry.providerId,
    reportedModel: telemetry.reportedModel,
    finishReason: telemetry.finishReason,
  };
}

function transportResultToOutcome(
  result: WriterRoundTransportResult,
): WriterRoundPrivateOutcome {
  if (result.kind === 'delivered') {
    return {
      kind: 'delivered',
      serializedResponse: result.serializedResponse,
      usage: writerRoundProviderUsageToWire(result.usage),
      telemetry: telemetryToWire(result.telemetry),
      exactWireSha256: result.exactWireSha256,
    };
  }
  if (result.kind === 'failed') {
    return {
      kind: 'failed',
      sent: result.sent,
      failureCode: result.failureCode,
      ...(result.usage.totalTokens > 0 || result.sent
        ? {
            usage: writerRoundProviderUsageToWire(result.usage),
            telemetry: telemetryToWire(result.telemetry),
          }
        : {}),
    };
  }
  return {
    kind: 'unknown',
    telemetry: telemetryToWire(result.telemetry),
  };
}

function possiblySentAfterInvoke(result: WriterRoundTransportResult): boolean {
  if (result.kind === 'delivered') return true;
  if (result.kind === 'unknown') return true;
  if (result.kind === 'failed' && result.sent) return true;
  return false;
}

function holdRound(message: string): never {
  throw ApplicationFailure.nonRetryable(message, 'WriterRoundHeld');
}

function custodyUnavailable(message: string): never {
  throw ApplicationFailure.retryable(message, 'WriterRoundCustodyUnavailable');
}

async function submitOutcomeOnce(
  custody: WriterRoundPrivateClient,
  input: ExecutePreparedWriterRoundInput,
  attemptId: string,
  requestSha256: string,
  outcome: WriterRoundPrivateOutcome,
): Promise<WriterRoundPrivateSubmitOutcomeResponse> {
  try {
    return await custody.submitOutcome(
      input.missionId,
      input.ordinal,
      attemptId,
      { requestSha256, outcome },
    );
  } catch (error) {
    if (
      error instanceof WriterRoundPrivateTransportError &&
      error.code === 'unavailable'
    ) {
      throw error;
    }
    throw error;
  }
}

async function reconcileAfterAmbiguousSubmit(
  custody: WriterRoundPrivateClient,
  input: ExecutePreparedWriterRoundInput,
): Promise<WriterRoundPrivateSubmitOutcomeResponse> {
  try {
    const status = await custody.getStatus(input.missionId, input.ordinal);
    if (status.status === 'settled') {
      return { status: 'delivered', resultCasHash: status.responseSha256 ?? '0'.repeat(64) };
    }
    if (status.status === 'failed') {
      return { status: 'failed', reason: 'reconciled-failed' };
    }
    return { status: 'uncertain' };
  } catch {
    return { status: 'uncertain' };
  }
}

export async function executePreparedWriterRound(
  input: ExecutePreparedWriterRoundInput,
  deps: ExecutePreparedWriterRoundDeps,
): Promise<WriterRoundPrivateSubmitOutcomeResponse | { status: 'replayed' }> {
  const { custody, apiKey, outputSchema, fetchImpl } = deps;
  const prepareTransport = deps.prepareTransport ?? prepareWriterRoundTransport;

  let prepared;
  try {
    prepared = await custody.prepare(input.missionId, input.ordinal, {
      contextId: input.contextId,
      attemptId: input.attemptId,
      expectedRevision: input.expectedRevision,
    });
  } catch (error) {
    if (error instanceof WriterRoundPrivateTransportError) {
      if (error.code === 'unauthorized') {
        throw ApplicationFailure.nonRetryable(
          'writer-round-custody-unauthorized',
          'WriterRoundCustodyRefused',
        );
      }
      if (error.code === 'conflict' || error.code === 'invalid') {
        throw ApplicationFailure.nonRetryable(
          error.message,
          'WriterRoundCustodyRefused',
        );
      }
      custodyUnavailable('writer-round-prepare-unavailable');
    }
    throw error;
  }

  if (prepared.status === 'replayed') {
    return { status: 'replayed' };
  }
  if (prepared.status === 'held') {
    holdRound(prepared.reason);
  }
  if (prepared.status === 'uncertain') {
    return { status: 'uncertain' };
  }

  try {
    assertPreparedWirePins(prepared);
  } catch (error) {
    if (error instanceof WriterRoundPrivateTransportError) {
      throw ApplicationFailure.nonRetryable(
        error.message,
        'WriterRoundWireRejected',
      );
    }
    throw error;
  }

  const pinnedPolicy = writerRoundModelPolicyFromWire(prepared.modelPolicy);
  const transport: PreparedWriterRoundTransport = prepareTransport({
    capturedWire: prepared.wire,
    pinnedModelPolicy: {
      model: pinnedPolicy.model,
      provider: pinnedPolicy.provider,
      priceVersion: pinnedPolicy.priceVersion,
      inputMicrousdPerMillion: pinnedPolicy.inputMicrousdPerMillion,
      outputMicrousdPerMillion: pinnedPolicy.outputMicrousdPerMillion,
      maxInputTokens: pinnedPolicy.maxInputTokens,
      maxOutputTokens: pinnedPolicy.maxOutputTokens,
      maxModelRounds: pinnedPolicy.maxModelRounds,
      maxMicrousd: pinnedPolicy.maxMicrousd,
      timeoutMs: pinnedPolicy.timeoutMs,
    },
    outputSchema,
    apiKey,
    fetchImpl,
  });

  const preflight = transport.preflight();
  let transportResult: WriterRoundTransportResult;
  if (preflight.kind !== 'ready') {
    transportResult = {
      kind: 'failed',
      failureCode: 'wire_rejected',
      sent: false,
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
        durationMs: null,
        httpStatus: null,
        providerId: null,
        reportedModel: null,
        finishReason:
          preflight.reason === 'credential_missing'
            ? 'credential-missing'
            : 'wire-rejected',
      },
      exactWireSha256: null,
    };
  } else {
    transportResult = await transport.invoke();
  }

  const outcome = transportResultToOutcome(transportResult);
  const attemptId = prepared.attemptId;
  const requestSha256 = prepared.requestSha256;

  try {
    return await submitOutcomeOnce(
      custody,
      input,
      attemptId,
      requestSha256,
      outcome,
    );
  } catch (error) {
    if (
      error instanceof WriterRoundPrivateTransportError &&
      error.code === 'unavailable' &&
      possiblySentAfterInvoke(transportResult)
    ) {
      return reconcileAfterAmbiguousSubmit(custody, input);
    }
    if (error instanceof WriterRoundPrivateTransportError) {
      custodyUnavailable('writer-round-submit-unavailable');
    }
    throw error;
  }
}

export function createWriterRoundProviderExecutionActivities(
  config: WriterRoundPrivateClientConfig,
  deps: Omit<ExecutePreparedWriterRoundDeps, 'custody'>,
): WriterRoundProviderExecutionActivities {
  const custody = createWriterRoundPrivateClient(config, deps.fetchImpl);
  return {
    executePreparedWriterRound(input) {
      return executePreparedWriterRound(input, { ...deps, custody });
    },
  };
}