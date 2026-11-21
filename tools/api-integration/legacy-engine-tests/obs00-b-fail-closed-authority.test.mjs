import assert from 'node:assert/strict';
import test from 'node:test';
import { readStorytellerWorkerOptions } from '../../../packages/story-engine/dist/storyteller/config.js';
import {
  retainsCapturedAuthority,
  retainsIndependentCurrentAuthority,
} from '../../../packages/story-engine/dist/storyteller/dispatch-authority.js';
import { resolveEffectiveUsagePolicy } from '../../../packages/story-engine/dist/storyteller/usage-policy-resolution.js';
import {
  syntheticPlatformUsagePolicy,
  syntheticUsageProfiles,
} from '../../../packages/lab-support/dist/usage-profiles.js';

const requested = {
  requestedRoute: 'fake:economy',
  requestedFundingMode: 'prepaid',
};

function resolveCurrent(entitlement, restrictions) {
  return resolveEffectiveUsagePolicy({
    platform: syntheticPlatformUsagePolicy,
    entitlement,
    restrictions,
    ...requested,
  });
}

test('OBS00-B: a revoked policy is denied and only an equal current policy is allowed', () => {
  const current = resolveCurrent(syntheticUsageProfiles.standard);
  assert.equal(current.kind, 'allowed');
  if (current.kind !== 'allowed') return;
  const captured = current.policy;
  const taskSnapshot = {
    resources: {
      authority: { kind: 'effective-usage-policy', policy: captured },
    },
  };

  const revoked = resolveCurrent({
    ...syntheticUsageProfiles.standard,
    enabled: false,
  });
  assert.equal(revoked.kind, 'denied');
  assert.equal(revoked.reason, 'policy_disabled');

  const changedLimits = resolveCurrent(syntheticUsageProfiles.standard, [
    {
      schemaVersion: 1,
      id: 'obs00-b-tighten.v1',
      revision: 2,
      limits: { maxGeneratedTokensPerRequest: 32 },
      windows: [],
    },
  ]);
  assert.equal(changedLimits.kind, 'allowed');
  if (changedLimits.kind !== 'allowed') return;
  const changedRevision = structuredClone(captured);
  changedRevision.profile = {
    ...changedRevision.profile,
    revision: captured.profile.revision + 1,
  };

  assert.equal(retainsIndependentCurrentAuthority(captured, current), true);
  assert.equal(retainsIndependentCurrentAuthority(captured, revoked), false);
  assert.equal(retainsIndependentCurrentAuthority(captured, null), false);
  assert.equal(
    retainsIndependentCurrentAuthority(captured, changedLimits),
    false,
  );
  assert.equal(
    retainsIndependentCurrentAuthority(captured, {
      kind: 'allowed',
      policy: changedRevision,
    }),
    false,
  );

  assert.equal(retainsCapturedAuthority(taskSnapshot, null), false);
  assert.equal(retainsCapturedAuthority(taskSnapshot, captured), true);
  assert.equal(
    retainsCapturedAuthority(taskSnapshot, changedLimits.policy),
    false,
  );
  assert.equal(
    retainsCapturedAuthority(taskSnapshot, changedRevision),
    false,
  );
  assert.equal(
    retainsCapturedAuthority(
      {
        resources: {
          authority: { kind: 'offline', version: 'offline-rehearsal.v1' },
        },
      },
      captured,
    ),
    false,
  );

  const decisions = [
    retainsIndependentCurrentAuthority(captured, revoked),
    retainsIndependentCurrentAuthority(captured, null),
    retainsIndependentCurrentAuthority(captured, changedLimits),
    retainsIndependentCurrentAuthority(captured, {
      kind: 'allowed',
      policy: changedRevision,
    }),
    retainsCapturedAuthority(taskSnapshot, null),
    retainsCapturedAuthority(taskSnapshot, changedLimits.policy),
  ];
  assert.deepEqual(decisions, [false, false, false, false, false, false]);
  assert.equal(
    [
      retainsIndependentCurrentAuthority(captured, current),
      retainsCapturedAuthority(taskSnapshot, captured),
    ].every(Boolean),
    true,
  );
});

test('OBS00-B: the default worker still omits dispatch authority', () => {
  const options = readStorytellerWorkerOptions({
    STORYTELLER_LIVE_ENABLED: 'true',
    STORYTELLER_EXECUTION_JSON: JSON.stringify({
      mode: 'provider',
      accountId: '00000000-0000-4000-8000-000000000001',
      runId: '00000000-0000-4000-8000-000000000002',
      dispatchReview: { mode: 'hold' },
      policy: {
        version: 'obs00-b.v1',
        route: 'audit:offline',
        model: 'audit/model-not-selected',
        provider: 'Audit',
        priceVersion: 'not-priced',
        inputMicrousdPerMillion: '0',
        outputMicrousdPerMillion: '0',
        maxInputTokens: 1000,
        maxOutputTokens: 32,
        timeoutMs: 1000,
      },
    }),
    OPENROUTER_API_KEY: 'test-key-not-for-network',
  });
  assert.equal(typeof options.provider, 'function');
  assert.equal('dispatchAuthority' in options, false);
  assert.equal(options.provider.length, 2);
});
