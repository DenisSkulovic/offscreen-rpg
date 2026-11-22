import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  planTestlabGrant,
  buildTestlabEntitlementProfile,
  LAUNCH_MIN_MICROUSD,
  LAUNCH_MIN_MICROUSD_SQL,
  TESTLAB_GRANT_EXPIRY_MS,
  TESTLAB_LAUNCH_ROUTE,
  TESTLAB_FUNDING_MODE,
  TESTLAB_RUN_MAX_ATTEMPTS,
  TESTLAB_ENTITLEMENT_PROFILE_ID,
} from './testlab-grant-contract.mjs';

const BASE_NOW = Date.parse('2026-11-22T12:00:00.000Z');

function validInput(overrides = {}) {
  return {
    ownerId: 'user-owner-1',
    suiteId: 'suite-turn03-smoke',
    operatorId: 'operator-testlab',
    approvalIdentity: 'approval-turn03-local',
    targetIdentity: 'disposable',
    now: BASE_NOW,
    ...overrides,
  };
}

test('positive: canonical SQL-ready plan with finite 24h expiry', () => {
  const result = planTestlabGrant(validInput());
  assert.equal(result.ok, true);
  const { plan } = result;
  assert.equal(plan.ownerId, 'user-owner-1');
  assert.equal(plan.suiteId, 'suite-turn03-smoke');
  assert.equal(plan.targetIdentity, 'disposable');
  assert.equal(plan.funding.limitMicrousd, LAUNCH_MIN_MICROUSD);
  assert.equal(plan.funding.limitMicrousdSql, LAUNCH_MIN_MICROUSD_SQL);
  assert.equal(plan.funding.stopped, false);
  assert.equal(plan.run.maxAttempts, TESTLAB_RUN_MAX_ATTEMPTS);
  assert.equal(plan.run.enabled, true);
  assert.equal(plan.grant.noExpiry, false);
  assert.equal(plan.grant.expiresAtMs, BASE_NOW + TESTLAB_GRANT_EXPIRY_MS);
  assert.equal(
    plan.grant.expiresAt.toISOString(),
    new Date(BASE_NOW + TESTLAB_GRANT_EXPIRY_MS).toISOString(),
  );
  assert.equal(plan.grant.requestedRoute, TESTLAB_LAUNCH_ROUTE);
  assert.equal(plan.grant.requestedFundingMode, TESTLAB_FUNDING_MODE);
  const profile = plan.grant.entitlementProfile;
  assert.equal(profile.schemaVersion, 1);
  assert.equal(profile.id, TESTLAB_ENTITLEMENT_PROFILE_ID);
  assert.equal(profile.revision, 1);
  assert.deepEqual(profile.allowedRoutes, [TESTLAB_LAUNCH_ROUTE]);
  assert.deepEqual(profile.fundingModes, [TESTLAB_FUNDING_MODE]);
  assert.equal(
    profile.limits.maxMicrousdPerOperation,
    String(LAUNCH_MIN_MICROUSD_SQL),
  );
  assert.throws(() => {
    plan.grant.enabled = false;
  });
});

test('negative: noExpiry is refused', () => {
  const result = planTestlabGrant(validInput({ noExpiry: true }));
  assert.equal(result.ok, false);
  assert.ok(result.refusals.some((r) => r.id === 'no-expiry'));
});

test('negative: invalid entitlement profile override is refused', () => {
  const result = planTestlabGrant(
    validInput({
      entitlementProfile: {
        ...buildTestlabEntitlementProfile(1),
        defaultRoute: 'writer:continue',
      },
    }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.refusals.some((r) => r.id === 'invalid-profile'));
});

test('negative: missing authorization fields refuse', () => {
  const result = planTestlabGrant(
    validInput({ operatorId: '  ', approvalIdentity: '' }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.refusals.some((r) => r.id === 'missing-operatorId'));
  assert.ok(result.refusals.some((r) => r.id === 'missing-approvalIdentity'));
  assert.ok(result.refusals.some((r) => r.id === 'unauthorized'));
});

test('negative: expiry beyond 24h is refused', () => {
  const result = planTestlabGrant(
    validInput({
      expiresAt: BASE_NOW + TESTLAB_GRANT_EXPIRY_MS + 1,
    }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.refusals.some((r) => r.id === 'expiry-beyond-max'));
});

test('negative: explicit null expiresAt is refused', () => {
  const result = planTestlabGrant(validInput({ expiresAt: null }));
  assert.equal(result.ok, false);
  assert.ok(result.refusals.some((r) => r.id === 'missing-expiry'));
});
