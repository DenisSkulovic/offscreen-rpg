import {
  usageEntitlementProfileSchema,
  type UsageLimits,
} from '@offscreen/contracts/usage-policy';

export const baselineUsageLimits: UsageLimits = {
  maxInputTokensPerRequest: 100_000,
  maxSerializedBytesPerRequest: 400_000,
  maxGeneratedTokensPerRequest: 8_000,
  maxReasoningTokensPerRequest: 4_000,
  maxInputTokensPerOperation: 300_000,
  maxGeneratedTokensPerOperation: 16_000,
  maxModelRoundsPerOperation: 3,
  maxReadsPerOperation: 6,
  maxRetainedReadBytes: 12_288,
  maxMicrousdPerOperation: '1000000',
  maxInFlightDispatches: 4,
  maxBackgroundJobsPerWindow: 100,
};

/** Importing this preset never enables provider execution. */
export const conservativeDevelopmentUsagePolicy =
  usageEntitlementProfileSchema.parse({
    schemaVersion: 1,
    id: 'development-disabled.v1',
    revision: 1,
    enabled: false,
    allowedRoutes: ['openrouter:unconfigured'],
    defaultRoute: 'openrouter:unconfigured',
    fundingModes: ['prepaid'],
    recovery: 'explicit-resume',
    limits: {
      ...baselineUsageLimits,
      maxInputTokensPerRequest: 8_000,
      maxSerializedBytesPerRequest: 32_000,
      maxGeneratedTokensPerRequest: 1_024,
      maxReasoningTokensPerRequest: 0,
      maxInputTokensPerOperation: 8_000,
      maxGeneratedTokensPerOperation: 1_024,
      maxModelRoundsPerOperation: 1,
      maxReadsPerOperation: 0,
      maxRetainedReadBytes: 0,
      maxMicrousdPerOperation: '10000',
      maxInFlightDispatches: 1,
      maxBackgroundJobsPerWindow: 0,
    },
    windows: [],
  });
