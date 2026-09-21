import { readFile } from 'node:fs/promises';
import {
  evaluationPacketConfigSchema,
  evaluationPacketInspectionSchema,
  memoryEvaluationPacketConfigSchema,
  type EvaluationPacketConfig,
  type MemoryEvaluationPacketConfig,
} from '@offscreen/contracts/live-evaluation';
import type { UsageEntitlementProfile } from '@offscreen/contracts/usage-policy';
import type { ExecutionPolicy } from '@offscreen/storyteller/tasks';

export { evaluationPacketInspectionSchema };

export async function readEvaluationPacketConfig(path: string) {
  return evaluationPacketConfigSchema.parse(
    JSON.parse(await readFile(path, 'utf8')),
  );
}

export async function readMemoryEvaluationPacketConfig(path: string) {
  return memoryEvaluationPacketConfigSchema.parse(
    JSON.parse(await readFile(path, 'utf8')),
  );
}

export function evaluationPacketAuthority(config: EvaluationPacketConfig): {
  execution: Extract<ExecutionPolicy, { mode: 'provider' }>;
  profile: UsageEntitlementProfile;
} {
  const { recipe, route } = config;
  const execution: ExecutionPolicy = {
    mode: 'provider',
    accountId: config.accountId,
    runId: config.runId,
    dispatchReview: { mode: 'hold' },
    policy: {
      version: config.version,
      route: route.route,
      model: route.model,
      provider: route.endpointProvider,
      priceVersion: route.priceVersion,
      outputProtocol: route.outputProtocol,
      inputMicrousdPerMillion: route.inputMicrousdPerMillion,
      outputMicrousdPerMillion: route.outputMicrousdPerMillion,
      maxInputTokens: Math.min(recipe.maxInputTokens, route.maxContextTokens),
      maxOutputTokens: recipe.maxGeneratedTokens,
      timeoutMs: 30_000,
    },
  };
  return {
    execution,
    profile: {
      schemaVersion: 1,
      id: 'evaluation-gate-one.v1',
      revision: 1,
      enabled: true,
      allowedRoutes: [route.route],
      defaultRoute: route.route,
      fundingModes: ['prepaid'],
      recovery: 'explicit-resume',
      limits: {
        maxInputTokensPerRequest: recipe.maxInputTokens,
        maxSerializedBytesPerRequest: recipe.maxInputTokens,
        maxGeneratedTokensPerRequest: recipe.maxGeneratedTokens,
        maxReasoningTokensPerRequest: recipe.maxReasoningTokens,
        maxInputTokensPerOperation: recipe.maxInputTokens,
        maxGeneratedTokensPerOperation: recipe.maxGeneratedTokens,
        // Total calls belong to the run allowance; each task is still one round.
        maxModelRoundsPerOperation: 1,
        maxReadsPerOperation: recipe.retrievalReads,
        maxRetainedReadBytes: 0,
        maxMicrousdPerOperation: recipe.maxMicrousd,
        maxInFlightDispatches: recipe.maxInFlightCalls,
        maxBackgroundJobsPerWindow: recipe.backgroundCalls,
      },
      windows: [],
    },
  };
}

export function memoryEvaluationPacketAuthority(
  config: MemoryEvaluationPacketConfig,
): {
  execution: Extract<ExecutionPolicy, { mode: 'provider' }>;
  profile: UsageEntitlementProfile;
} {
  const { recipe, route } = config;
  return {
    execution: {
      mode: 'provider',
      accountId: config.accountId,
      runId: config.runId,
      dispatchReview: { mode: 'hold' },
      policy: {
        version: config.version,
        route: route.route,
        model: route.model,
        provider: route.endpointProvider,
        priceVersion: route.priceVersion,
        outputProtocol: route.outputProtocol,
        inputMicrousdPerMillion: '0',
        outputMicrousdPerMillion: '0',
        maxInputTokens: recipe.maxInputTokensPerRound,
        maxOutputTokens: recipe.maxGeneratedTokensPerOperation,
        timeoutMs: 30_000,
      },
    },
    profile: {
      schemaVersion: 1,
      id: 'memory-evaluation-free.v1',
      revision: 1,
      enabled: true,
      allowedRoutes: [route.route],
      defaultRoute: route.route,
      fundingModes: ['prepaid'],
      recovery: 'explicit-resume',
      limits: {
        maxInputTokensPerRequest: recipe.maxInputTokensPerRound,
        maxSerializedBytesPerRequest: recipe.maxSerializedBytesPerRequest,
        maxGeneratedTokensPerRequest: recipe.maxGeneratedTokensPerOperation,
        maxReasoningTokensPerRequest: 0,
        maxInputTokensPerOperation: recipe.maxInputTokensPerOperation,
        maxGeneratedTokensPerOperation: recipe.maxGeneratedTokensPerOperation,
        maxModelRoundsPerOperation: recipe.modelRounds,
        maxReadsPerOperation: recipe.retrievalReads,
        maxRetainedReadBytes: recipe.maxRetainedReadBytes,
        maxMicrousdPerOperation: '0',
        maxInFlightDispatches: 1,
        maxBackgroundJobsPerWindow: 0,
      },
      windows: [],
    },
  };
}
