import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  conservativeDevelopmentUsagePolicy,
  effectiveUsagePolicySchema,
  resolveEffectiveUsagePolicy,
  resourcesForEffectiveUsagePolicy,
  usageEntitlementProfileSchema,
} from '@offscreen/application/storyteller';
import {
  syntheticPlatformUsagePolicy,
  syntheticUsageProfiles,
} from '@offscreen/application/developer-tools';
import type { ExecutionPolicy } from '@offscreen/storyteller/tasks';

test('task admission intersects entitlement, provider and price ceilings', () => {
  const resolved = resolveEffectiveUsagePolicy({
    platform: syntheticPlatformUsagePolicy,
    entitlement: syntheticUsageProfiles.standard,
    requestedRoute: 'fake:economy',
    requestedFundingMode: 'prepaid',
  });
  assert.equal(resolved.kind, 'allowed');
  if (resolved.kind !== 'allowed')
    throw new Error('policy unexpectedly denied');
  const execution: Extract<ExecutionPolicy, { mode: 'provider' }> = {
    mode: 'provider',
    accountId: '00000000-0000-4000-8000-000000000001',
    runId: '00000000-0000-4000-8000-000000000002',
    dispatchReview: { mode: 'hold' },
    policy: {
      version: 'test',
      route: 'fake:economy',
      model: 'fake/model',
      provider: 'fake',
      priceVersion: 'test',
      inputMicrousdPerMillion: '1000',
      cacheReadMicrousdPerMillion: '100',
      cacheWriteMicrousdPerMillion: '1500',
      outputMicrousdPerMillion: '2000',
      maxInputTokens: 10_000,
      maxOutputTokens: 700,
      timeoutMs: 5_000,
    },
  };
  const resources = resourcesForEffectiveUsagePolicy(
    execution,
    resolved.policy,
  );
  assert.equal(resources.envelope.maxInputTokens, 10_000);
  assert.equal(resources.envelope.maxGeneratedTokens, 700);
  assert.equal(resources.envelope.maxReasoningTokens, 700);
  assert.equal(resources.envelope.maxMicrousd, '17');
  assert.deepEqual(resources.authority, {
    kind: 'effective-usage-policy',
    policy: resolved.policy,
  });
  assert.equal(resources.creativeExploration.enabled, false);
  const repairableResources = resourcesForEffectiveUsagePolicy(
    execution,
    resolved.policy,
    { posture: 'off', maxRepairRounds: 1 },
  );
  assert.equal(repairableResources.recipe.version, 'repairable-turn.v1');
  assert.equal(repairableResources.recipe.maxModelRounds, 2);
  assert.equal(
    repairableResources.envelope.maxGeneratedTokens,
    Math.min(resolved.policy.limits.maxGeneratedTokensPerOperation, 1_400),
  );
  assert.equal(
    repairableResources.envelope.maxInputTokens,
    Math.min(
      200_000,
      resolved.policy.limits.maxInputTokensPerOperation,
      resolved.policy.limits.maxInputTokensPerRequest * 2,
      execution.policy.maxInputTokens * 2,
    ),
  );
  const creativeResources = resourcesForEffectiveUsagePolicy(
    execution,
    resolved.policy,
    { posture: 'balanced' },
  );
  assert.equal(creativeResources.creativeExploration.enabled, true);
  assert.equal(creativeResources.creativeExploration.posture, 'balanced');
  assert.equal(creativeResources.recipe.version, 'memory-exploration.v1');
  assert.equal(creativeResources.recipe.maxModelRounds, 3);
  assert.equal(creativeResources.recipe.maxReads, 3);
  assert.equal(
    creativeResources.envelope.maxInputTokens,
    Math.min(
      200_000,
      resolved.policy.limits.maxInputTokensPerOperation,
      resolved.policy.limits.maxInputTokensPerRequest * 3,
      execution.policy.maxInputTokens * 3,
    ),
  );
  assert.equal(
    creativeResources.creativeExploration.limits.maxGeneratedTokens,
    700,
  );
  assert.equal(
    creativeResources.creativeExploration.limits.maxCostMicrousd,
    17,
  );
  const noReadCreativeResources = resourcesForEffectiveUsagePolicy(
    execution,
    resolved.policy,
    { posture: 'balanced', requested: { maxReads: 0 } },
  );
  assert.equal(noReadCreativeResources.creativeExploration.enabled, false);
  assert.equal(noReadCreativeResources.recipe.version, 'single-turn.v1');
  assert.throws(
    () =>
      resourcesForEffectiveUsagePolicy(
        {
          ...execution,
          policy: { ...execution.policy, route: 'fake:premium' },
        },
        resolved.policy,
      ),
    /storyteller_route_not_authorized/,
  );
});

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
