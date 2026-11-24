import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import {
  capturedUsagePolicySnapshotIsNotDispatchEntitlement,
  fundingBalanceIsNotDispatchEntitlement,
} from '../../../packages/story-engine/dist/storyteller/dispatch-authority-policy.js';
import {
  retainsIndependentCurrentAuthority,
} from '../../../packages/story-engine/dist/storyteller/dispatch-authority.js';
import { resolveIndependentAuthorityFromStore } from '../../../packages/story-engine/dist/storyteller/current-authority.js';
import { resolveEffectiveUsagePolicy } from '../../../packages/story-engine/dist/storyteller/usage-policy-resolution.js';
import {
  syntheticPlatformUsagePolicy,
  syntheticUsageProfiles,
} from '../../../packages/lab-support/dist/usage-profiles.js';

const digest = 'cd'.repeat(32);
const requested = {
  requestedRoute: 'fake:economy',
  requestedFundingMode: 'prepaid',
};

function routeMapFor(profile) {
  return {
    schemaVersion: 1,
    revision: profile.revision,
    routes: profile.allowedRoutes.map((route) => ({
      route,
      provider: 'Fake',
      model: 'fake/test',
      priceVersion: 'obs00-test.v1',
      fundingModes: ['prepaid', 'sponsored', 'on-demand'],
      executionPolicyDigest: digest,
      sourceDigest: digest,
    })),
  };
}

function activePlatform(profile = syntheticPlatformUsagePolicy) {
  return {
    revision: profile.revision,
    profile,
    routeMap: routeMapFor(profile),
    enabled: true,
  };
}

function activeGrant(overrides = {}, entitlement = syntheticUsageProfiles.standard) {
  return {
    id: randomUUID(),
    revision: entitlement.revision,
    userId: 'user_obs00_contract',
    accountId: randomUUID(),
    runId: randomUUID(),
    entitlementProfile: entitlement,
    restrictions: [],
    enabled: true,
    revokedAt: null,
    noExpiry: true,
    expiresAt: null,
    requestedRoute: requested.requestedRoute,
    requestedFundingMode: requested.requestedFundingMode,
    operatorId: 'operator_obs00',
    approvalIdentity: 'approval_obs00',
    ...overrides,
  };
}

test('OBS00-B T02: independent store resolution fail-closes and only deep-equal current allows', () => {
  assert.equal(fundingBalanceIsNotDispatchEntitlement(), false);
  assert.equal(capturedUsagePolicySnapshotIsNotDispatchEntitlement(), false);

  const capturedOnly = resolveEffectiveUsagePolicy({
    platform: syntheticPlatformUsagePolicy,
    entitlement: syntheticUsageProfiles.standard,
    ...requested,
  });
  assert.equal(capturedOnly.kind, 'allowed');
  if (capturedOnly.kind !== 'allowed') return;
  const captured = capturedOnly.policy;

  assert.deepEqual(resolveIndependentAuthorityFromStore({ platform: null, grant: null }), {
    kind: 'denied',
    reason: 'platform_missing',
  });
  assert.deepEqual(
    resolveIndependentAuthorityFromStore({
      platform: { ...activePlatform(), enabled: false },
      grant: activeGrant(),
    }),
    { kind: 'denied', reason: 'platform_disabled' },
  );
  assert.deepEqual(
    resolveIndependentAuthorityFromStore({
      platform: activePlatform(),
      grant: null,
    }),
    { kind: 'denied', reason: 'grant_missing' },
  );
  assert.deepEqual(
    resolveIndependentAuthorityFromStore({
      platform: activePlatform(),
      grant: activeGrant({ enabled: false }),
    }),
    { kind: 'denied', reason: 'grant_disabled' },
  );
  assert.deepEqual(
    resolveIndependentAuthorityFromStore({
      platform: activePlatform(),
      grant: activeGrant({
        enabled: false,
        revokedAt: '2026-01-01T00:00:00.000Z',
      }),
    }),
    { kind: 'denied', reason: 'grant_disabled' },
  );
  assert.deepEqual(
    resolveIndependentAuthorityFromStore(
      {
        platform: activePlatform(),
        grant: activeGrant({
          noExpiry: false,
          expiresAt: '1999-01-01T00:00:00.000Z',
        }),
      },
      new Date('2020-01-01T00:00:00.000Z'),
    ),
    { kind: 'denied', reason: 'grant_expired' },
  );
  assert.equal(
    resolveIndependentAuthorityFromStore({
      platform: activePlatform(),
      grant: { ...activeGrant(), entitlementProfile: { bad: true } },
    }).kind,
    'denied',
  );

  const current = resolveIndependentAuthorityFromStore({
    platform: activePlatform(),
    grant: activeGrant(),
  });
  assert.equal(current.kind, 'allowed');
  assert.equal(retainsIndependentCurrentAuthority(captured, current), true);

  const tightened = resolveIndependentAuthorityFromStore({
    platform: activePlatform(),
    grant: activeGrant({
      restrictions: [
        {
          schemaVersion: 1,
          id: 'obs00-b-tighten.v1',
          revision: 2,
          limits: { maxGeneratedTokensPerRequest: 32 },
          windows: [],
        },
      ],
    }, syntheticUsageProfiles.standard),
  });
  assert.equal(tightened.kind, 'allowed');
  assert.equal(retainsIndependentCurrentAuthority(captured, tightened), false);

  const snapshotTaskPolicy = {
    resources: {
      authority: { kind: 'effective-usage-policy', policy: captured },
    },
  };
  assert.equal(snapshotTaskPolicy.resources.authority.policy.schemaVersion, 1);
  assert.equal(
    retainsIndependentCurrentAuthority(
      captured,
      resolveEffectiveUsagePolicy({
        platform: syntheticPlatformUsagePolicy,
        entitlement: syntheticUsageProfiles.standard,
        ...requested,
      }),
    ),
    true,
  );
});