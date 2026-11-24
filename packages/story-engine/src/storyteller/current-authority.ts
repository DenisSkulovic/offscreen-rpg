import {
  assessOwnerGrantAvailability,
  assessPlatformPolicyAvailability,
  parseStorytellerCurrentOwnerGrantRow,
  parseStorytellerCurrentPlatformPolicyRow,
  type IndependentAuthorityDenialReason,
} from './dispatch-authority-policy';
import {
  resolveEffectiveUsagePolicy,
  type UsagePolicyResolution,
} from './usage-policy-resolution';

export type IndependentAuthorityStoreResolution =
  | UsagePolicyResolution
  | {
      kind: 'denied';
      reason: IndependentAuthorityDenialReason;
    };

export function resolveIndependentAuthorityFromStore(input: {
  platform: unknown | null;
  grant: unknown | null;
  now?: Date;
}): IndependentAuthorityStoreResolution {
  let platform;
  let grant;
  try {
    platform =
      input.platform === null
        ? null
        : parseStorytellerCurrentPlatformPolicyRow(input.platform);
    grant =
      input.grant === null
        ? null
        : parseStorytellerCurrentOwnerGrantRow(input.grant);
  } catch {
    return { kind: 'denied', reason: 'invalid_store' };
  }

  const platformState = assessPlatformPolicyAvailability(platform);
  if (platformState !== 'available') {
    return { kind: 'denied', reason: platformState };
  }
  const grantState = assessOwnerGrantAvailability(grant, input.now);
  if (grantState !== 'available') {
    return { kind: 'denied', reason: grantState };
  }
  if (!platform || !grant) {
    return { kind: 'denied', reason: 'invalid_store' };
  }

  return resolveEffectiveUsagePolicy({
    platform: platform.profile,
    entitlement: grant.entitlementProfile,
    restrictions: grant.restrictions,
    requestedRoute: grant.requestedRoute,
    requestedFundingMode: grant.requestedFundingMode,
  });
}