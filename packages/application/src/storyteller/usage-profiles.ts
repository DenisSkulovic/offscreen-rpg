import { z } from 'zod';
import {
  fundingModeSchema,
  usageEntitlementProfileSchema,
  type UsageEntitlementProfile,
  type UsageLimits,
} from './usage-policy-schema';

const baseLimits: UsageLimits = {
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

function syntheticProfile(input: {
  id: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  routes: string[];
  fundingModes: Array<z.infer<typeof fundingModeSchema>>;
}): UsageEntitlementProfile {
  return usageEntitlementProfileSchema.parse({
    schemaVersion: 1,
    id: input.id,
    revision: 1,
    enabled: true,
    allowedRoutes: input.routes,
    defaultRoute: input.routes[0] ?? null,
    fundingModes: input.fundingModes,
    recovery: 'explicit-resume',
    limits: {
      ...baseLimits,
      maxInputTokensPerRequest: input.maxInputTokens,
      maxInputTokensPerOperation: input.maxInputTokens * 3,
      maxGeneratedTokensPerRequest: input.maxOutputTokens,
      maxGeneratedTokensPerOperation: input.maxOutputTokens * 2,
      maxReasoningTokensPerRequest: Math.min(1_024, input.maxOutputTokens),
    },
    windows: [],
  });
}

/** Offline fixtures exercise policy composition; names and limits are not offers. */
export const syntheticUsageProfiles = {
  free: syntheticProfile({
    id: 'synthetic-free.v1',
    maxInputTokens: 20_000,
    maxOutputTokens: 2_048,
    routes: ['fake:economy'],
    fundingModes: ['sponsored'],
  }),
  standard: syntheticProfile({
    id: 'synthetic-standard.v1',
    maxInputTokens: 50_000,
    maxOutputTokens: 4_096,
    routes: ['fake:economy', 'fake:standard'],
    fundingModes: ['prepaid'],
  }),
  advanced: syntheticProfile({
    id: 'synthetic-advanced.v1',
    maxInputTokens: 80_000,
    maxOutputTokens: 8_000,
    routes: ['fake:economy', 'fake:standard', 'fake:advanced'],
    fundingModes: ['prepaid'],
  }),
  onDemand: syntheticProfile({
    id: 'synthetic-on-demand.v1',
    maxInputTokens: 80_000,
    maxOutputTokens: 8_000,
    routes: ['fake:economy', 'fake:standard', 'fake:advanced'],
    fundingModes: ['on-demand'],
  }),
} as const;

export const syntheticPlatformUsagePolicy = syntheticProfile({
  id: 'synthetic-platform.v1',
  maxInputTokens: 100_000,
  maxOutputTokens: 8_000,
  routes: ['fake:economy', 'fake:standard', 'fake:advanced'],
  fundingModes: ['sponsored', 'prepaid', 'on-demand'],
});

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
      ...baseLimits,
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
