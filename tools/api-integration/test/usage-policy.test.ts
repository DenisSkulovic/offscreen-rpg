import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  conservativeDevelopmentUsagePolicy,
  effectiveUsagePolicySchema,
  resolveEffectiveUsagePolicy,
  usageEntitlementProfileSchema,
} from '@offscreen/application/storyteller';
import {
  syntheticPlatformUsagePolicy,
  syntheticUsageProfiles,
} from '@offscreen/application/developer-tools';

test('effective usage takes strict limits and route intersections', () => {
  const result = resolveEffectiveUsagePolicy({
    platform: syntheticPlatformUsagePolicy,
    entitlement: syntheticUsageProfiles.standard,
    restrictions: [
      {
        schemaVersion: 1,
        id: 'account-conserve.v1',
        revision: 4,
        allowedRoutes: ['fake:economy'],
        fundingModes: ['prepaid'],
        recovery: 'explicit-resume',
        limits: {
          maxInputTokensPerRequest: 12_000,
          maxGeneratedTokensPerRequest: 900,
          maxGeneratedTokensPerOperation: 900,
          maxModelRoundsPerOperation: 1,
          maxReadsPerOperation: 0,
          maxMicrousdPerOperation: '5000',
        },
        windows: [
          {
            id: 'daily-input',
            version: 1,
            scope: 'account',
            metric: 'input_tokens',
            limit: '30000',
            window: { kind: 'rolling', durationSeconds: 86_400 },
          },
        ],
      },
    ],
    requestedRoute: 'fake:economy',
    requestedFundingMode: 'prepaid',
  });

  assert.equal(result.kind, 'allowed');
  if (result.kind !== 'allowed') return;
  assert.equal(result.policy.route, 'fake:economy');
  assert.equal(result.policy.limits.maxInputTokensPerRequest, 12_000);
  assert.equal(result.policy.limits.maxGeneratedTokensPerRequest, 900);
  assert.equal(result.policy.limits.maxMicrousdPerOperation, '5000');
  assert.equal(result.policy.limits.maxReadsPerOperation, 0);
  assert.deepEqual(result.policy.restrictions, [
    { id: 'account-conserve.v1', revision: 4 },
  ]);
  assert.deepEqual(
    result.policy.windows.map(({ id, source }) => ({ id, source })),
    [{ id: 'daily-input', source: 'restriction:account-conserve.v1' }],
  );
  assert.deepEqual(
    result.policy.limitSources.maxInputTokensPerRequest.map(
      ({ source }) => source,
    ),
    [
      'platform:synthetic-platform.v1',
      'entitlement:synthetic-standard.v1',
      'restriction:account-conserve.v1',
    ],
  );
  assert.deepEqual(
    effectiveUsagePolicySchema.parse(result.policy),
    result.policy,
  );
});

test('a lower layer cannot grant a route or on-demand funding', () => {
  const route = resolveEffectiveUsagePolicy({
    platform: syntheticPlatformUsagePolicy,
    entitlement: syntheticUsageProfiles.free,
    restrictions: [
      {
        schemaVersion: 1,
        id: 'malicious-client-claim',
        revision: 1,
        allowedRoutes: ['fake:advanced'],
        fundingModes: ['on-demand'],
        limits: {},
        windows: [],
      },
    ],
    requestedRoute: 'fake:advanced',
    requestedFundingMode: 'on-demand',
  });
  assert.deepEqual(route, {
    kind: 'denied',
    reason: 'route_not_allowed',
    source: 'requested-route',
  });

  const funding = resolveEffectiveUsagePolicy({
    platform: syntheticPlatformUsagePolicy,
    entitlement: syntheticUsageProfiles.free,
    requestedRoute: 'fake:economy',
    requestedFundingMode: 'on-demand',
  });
  assert.deepEqual(funding, {
    kind: 'denied',
    reason: 'funding_mode_not_allowed',
    source: 'requested-funding-mode',
  });
});

test('development policy is disabled and conservative by construction', () => {
  assert.equal(conservativeDevelopmentUsagePolicy.enabled, false);
  assert.equal(
    conservativeDevelopmentUsagePolicy.limits.maxInputTokensPerRequest,
    8_000,
  );
  assert.equal(
    conservativeDevelopmentUsagePolicy.limits.maxGeneratedTokensPerRequest,
    1_024,
  );
  assert.equal(
    conservativeDevelopmentUsagePolicy.limits.maxMicrousdPerOperation,
    '10000',
  );
  const result = resolveEffectiveUsagePolicy({
    platform: conservativeDevelopmentUsagePolicy,
    entitlement: conservativeDevelopmentUsagePolicy,
    requestedFundingMode: 'prepaid',
  });
  assert.deepEqual(result, {
    kind: 'denied',
    reason: 'policy_disabled',
    source: 'platform:development-disabled.v1',
  });
});

test('profiles reject unlimited sentinels and contradictory limits', () => {
  assert.throws(() =>
    usageEntitlementProfileSchema.parse({
      ...syntheticUsageProfiles.free,
      limits: {
        ...syntheticUsageProfiles.free.limits,
        maxInputTokensPerRequest: 0,
      },
    }),
  );
  assert.throws(() =>
    usageEntitlementProfileSchema.parse({
      ...syntheticUsageProfiles.free,
      limits: {
        ...syntheticUsageProfiles.free.limits,
        maxInputTokensPerRequest: 20_000,
        maxInputTokensPerOperation: 19_999,
      },
    }),
  );
  assert.throws(() =>
    usageEntitlementProfileSchema.parse({
      ...syntheticUsageProfiles.free,
      defaultRoute: 'fake:advanced',
    }),
  );
});
