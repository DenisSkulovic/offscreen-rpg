import type { UsageLimits } from '@offscreen/contracts/usage-policy';
import { resolveEffectiveUsagePolicy } from '@offscreen/application/storyteller';

type TestUsageWindow = Readonly<{
  id: string;
  version: number;
  scope: 'platform' | 'account' | 'story';
  metric:
    | 'requests'
    | 'input_tokens'
    | 'generated_tokens'
    | 'microusd'
    | 'background_jobs';
  limit: string;
  window: { kind: 'rolling'; durationSeconds: number };
}>;

/** Provider-free effective policy fixture shared by accounting integrations. */
export function createTestUsagePolicy(
  route: string,
  windows: readonly TestUsageWindow[] = [],
  limitOverrides: Partial<UsageLimits> = {},
) {
  const profile = {
    schemaVersion: 1 as const,
    id: 'test-provider',
    revision: 1,
    enabled: true,
    allowedRoutes: [route],
    defaultRoute: route,
    fundingModes: ['prepaid' as const],
    recovery: 'explicit-resume' as const,
    limits: {
      maxInputTokensPerRequest: 100000,
      maxSerializedBytesPerRequest: 400000,
      maxGeneratedTokensPerRequest: 2000,
      maxReasoningTokensPerRequest: 0,
      maxInputTokensPerOperation: 100000,
      maxGeneratedTokensPerOperation: 2000,
      maxModelRoundsPerOperation: 1,
      maxReadsPerOperation: 0,
      maxRetainedReadBytes: 0,
      maxMicrousdPerOperation: '1000000',
      maxInFlightDispatches: 1,
      maxBackgroundJobsPerWindow: 0,
      ...limitOverrides,
    },
    windows: [],
  };
  const result = resolveEffectiveUsagePolicy({
    platform: profile,
    entitlement: profile,
    restrictions: windows.length
      ? [
          {
            schemaVersion: 1 as const,
            id: 'test-window',
            revision: 1,
            limits: {},
            windows: [...windows],
          },
        ]
      : [],
    requestedRoute: route,
    requestedFundingMode: 'prepaid',
  });
  if (result.kind !== 'allowed') throw new Error('Test usage policy denied');
  return result.policy;
}
