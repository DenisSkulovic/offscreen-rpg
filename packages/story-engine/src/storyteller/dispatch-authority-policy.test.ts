import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  assessOwnerGrantAvailability,
  assessPlatformPolicyAvailability,
  capturedUsagePolicySnapshotIsNotDispatchEntitlement,
  fundingBalanceIsNotDispatchEntitlement,
  parseStorytellerCurrentOwnerGrantRow,
  parseStorytellerCurrentPlatformPolicyRow,
} from './dispatch-authority-policy';
import { usageEntitlementProfileSchema } from '@offscreen/usage-policy/usage-policy';

const digest = 'ab'.repeat(32);

function entitlementProfile(revision: number) {
  return usageEntitlementProfileSchema.parse({
    schemaVersion: 1,
    id: 'obs00-test-entitlement.v1',
    revision,
    enabled: true,
    allowedRoutes: ['fake:economy'],
    defaultRoute: 'fake:economy',
    fundingModes: ['prepaid'],
    recovery: 'explicit-resume',
    limits: {
      maxInputTokensPerRequest: 1_000,
      maxSerializedBytesPerRequest: 4_096,
      maxGeneratedTokensPerRequest: 128,
      maxReasoningTokensPerRequest: 0,
      maxInputTokensPerOperation: 3_000,
      maxGeneratedTokensPerOperation: 256,
      maxModelRoundsPerOperation: 1,
      maxReadsPerOperation: 0,
      maxRetainedReadBytes: 0,
      maxMicrousdPerOperation: '0',
      maxInFlightDispatches: 1,
      maxBackgroundJobsPerWindow: 0,
    },
    windows: [],
  });
}

function routeMap(revision: number) {
  return {
    schemaVersion: 1 as const,
    revision,
    routes: [
      {
        route: 'fake:economy',
        provider: 'Fake',
        model: 'fake/test',
        priceVersion: 'obs00-test.v1',
        fundingModes: ['prepaid'],
        executionPolicyDigest: digest,
        sourceDigest: digest,
      },
    ],
  };
}

function platformRow(overrides: Record<string, unknown> = {}) {
  const revision = 3;
  return parseStorytellerCurrentPlatformPolicyRow({
    revision,
    profile: entitlementProfile(revision),
    routeMap: routeMap(revision),
    enabled: true,
    ...overrides,
  });
}

function grantRow(overrides: Record<string, unknown> = {}) {
  const revision = 2;
  return parseStorytellerCurrentOwnerGrantRow({
    id: randomUUID(),
    revision,
    userId: 'user_obs00_test',
    accountId: randomUUID(),
    runId: randomUUID(),
    entitlementProfile: entitlementProfile(revision),
    restrictions: [],
    enabled: true,
    revokedAt: null,
    noExpiry: true,
    expiresAt: null,
    requestedRoute: 'fake:economy',
    requestedFundingMode: 'prepaid',
    operatorId: 'operator_obs00',
    approvalIdentity: 'approval_obs00',
    ...overrides,
  });
}

test('OBS00-B T02: funding and captured snapshots are never entitlements', () => {
  assert.equal(fundingBalanceIsNotDispatchEntitlement(), false);
  assert.equal(capturedUsagePolicySnapshotIsNotDispatchEntitlement(), false);
});

test('OBS00-B T02: invalid profile and store states are denied', () => {
  assert.throws(
    () => parseStorytellerCurrentPlatformPolicyRow({ revision: 0 }),
    /revision/,
  );
  assert.throws(
    () =>
      parseStorytellerCurrentPlatformPolicyRow(
        platformRow({
          profile: { ...entitlementProfile(3), revision: 2 },
        }),
      ),
    /Profile revision must match row revision/,
  );
  assert.throws(
    () =>
      parseStorytellerCurrentOwnerGrantRow(
        grantRow({ enabled: true, revokedAt: new Date().toISOString() }),
      ),
    /Revoked grants must remain disabled/,
  );
  assert.equal(assessPlatformPolicyAvailability(null), 'platform_missing');
  assert.equal(
    assessPlatformPolicyAvailability(platformRow({ enabled: false })),
    'platform_disabled',
  );
  assert.equal(assessOwnerGrantAvailability(null), 'grant_missing');
  assert.equal(
    assessOwnerGrantAvailability(grantRow({ enabled: false })),
    'grant_disabled',
  );
  assert.equal(
    assessOwnerGrantAvailability(
      grantRow({ enabled: false, revokedAt: new Date().toISOString() }),
    ),
    'grant_disabled',
  );
  assert.equal(
    assessOwnerGrantAvailability(
      grantRow({
        noExpiry: false,
        expiresAt: '1999-01-01T00:00:00.000Z',
      }),
      new Date('2020-01-01T00:00:00.000Z'),
    ),
    'grant_expired',
  );
});
