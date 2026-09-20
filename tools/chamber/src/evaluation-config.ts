import { readFile } from 'node:fs/promises';
import {
  evaluationPacketConfigSchema,
  evaluationPacketInspectionSchema,
  type EvaluationPacketConfig,
} from '@offscreen/contracts/live-evaluation';
import type { UsageEntitlementProfile } from '@offscreen/contracts/usage-policy';
import type { ExecutionPolicy } from '@offscreen/storyteller/tasks';

export { evaluationPacketInspectionSchema };

export async function readEvaluationPacketConfig(path: string) {
  return evaluationPacketConfigSchema.parse(
    JSON.parse(await readFile(path, 'utf8')),
  );
}

export function evaluationPacketAuthority(config: EvaluationPacketConfig): {
  execution: ExecutionPolicy;
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
