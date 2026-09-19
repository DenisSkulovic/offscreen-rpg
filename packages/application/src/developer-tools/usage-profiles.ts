import { z } from 'zod';
import {
  baselineUsageLimits,
  fundingModeSchema,
  usageEntitlementProfileSchema,
  type UsageEntitlementProfile,
} from '../storyteller/usage-policy';

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
      ...baselineUsageLimits,
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
