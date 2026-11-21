import {
  effectiveUsagePolicySchema,
  fundingModeSchema,
  usageEntitlementProfileSchema,
  usageLimitKeys,
  usageLimitsSchema,
  usagePolicyRestrictionSchema,
  type UsageLimits,
  type EffectiveUsagePolicy,
} from '@offscreen/contracts/usage-policy';

type LimitSource = {
  source: string;
  value: number | string;
};

export type UsagePolicyResolution =
  | { kind: 'allowed'; policy: EffectiveUsagePolicy }
  | {
      kind: 'denied';
      reason:
        'policy_disabled' | 'route_not_allowed' | 'funding_mode_not_allowed';
      source: string;
    };

function minimumLimit(
  key: keyof UsageLimits,
  values: readonly LimitSource[],
): number | string {
  if (key === 'maxMicrousdPerOperation') {
    return values.reduce((minimum, current) =>
      BigInt(String(current.value)) < BigInt(String(minimum.value))
        ? current
        : minimum,
    ).value;
  }
  return Math.min(...values.map(({ value }) => Number(value)));
}

/**
 * Intersects server-owned authority. Restrictions can only remove capabilities
 * or lower ceilings; they can never turn absent entitlement into permission.
 */
export function resolveEffectiveUsagePolicy(input: {
  platform: unknown;
  entitlement: unknown;
  restrictions?: readonly unknown[];
  requestedRoute?: string;
  requestedFundingMode: unknown;
}): UsagePolicyResolution {
  const platform = usageEntitlementProfileSchema.parse(input.platform);
  const entitlement = usageEntitlementProfileSchema.parse(input.entitlement);
  const restrictions = (input.restrictions ?? []).map((restriction) =>
    usagePolicyRestrictionSchema.parse(restriction),
  );
  const requestedFundingMode = fundingModeSchema.parse(
    input.requestedFundingMode,
  );
  const sources = [
    { source: `platform:${platform.id}`, policy: platform },
    { source: `entitlement:${entitlement.id}`, policy: entitlement },
    ...restrictions.map((policy) => ({
      source: `restriction:${policy.id}`,
      policy,
    })),
  ];

  const disabled = sources.find(({ policy }) => policy.enabled === false);
  if (disabled) {
    return {
      kind: 'denied',
      reason: 'policy_disabled',
      source: disabled.source,
    };
  }

  let allowedRoutes = new Set(platform.allowedRoutes);
  for (const { policy } of sources.slice(1)) {
    if (policy.allowedRoutes) {
      allowedRoutes = new Set(
        [...allowedRoutes].filter((route) =>
          policy.allowedRoutes?.includes(route),
        ),
      );
    }
  }
  const route = input.requestedRoute ?? entitlement.defaultRoute;
  if (!route || !allowedRoutes.has(route)) {
    return {
      kind: 'denied',
      reason: 'route_not_allowed',
      source: input.requestedRoute ? 'requested-route' : entitlement.id,
    };
  }

  let fundingModes = new Set(platform.fundingModes);
  for (const { policy } of sources.slice(1)) {
    if (policy.fundingModes) {
      fundingModes = new Set(
        [...fundingModes].filter((mode) => policy.fundingModes?.includes(mode)),
      );
    }
  }
  if (!fundingModes.has(requestedFundingMode)) {
    return {
      kind: 'denied',
      reason: 'funding_mode_not_allowed',
      source: 'requested-funding-mode',
    };
  }

  const recoveries = sources.flatMap(({ source, policy }) =>
    policy.recovery ? [{ source, recovery: policy.recovery }] : [],
  );
  const recovery = recoveries.some(
    ({ recovery: candidate }) => candidate === 'explicit-resume',
  )
    ? 'explicit-resume'
    : 'auto-resume';
  const limitSources = Object.fromEntries(
    usageLimitKeys.map((key) => [
      key,
      sources.flatMap(({ source, policy }) => {
        const value = policy.limits[key];
        return value === undefined ? [] : [{ source, value }];
      }),
    ]),
  ) as Record<keyof UsageLimits, LimitSource[]>;
  const generatedRequestLimit = Number(
    minimumLimit(
      'maxGeneratedTokensPerRequest',
      limitSources.maxGeneratedTokensPerRequest,
    ),
  );
  if (
    Number(
      minimumLimit(
        'maxReasoningTokensPerRequest',
        limitSources.maxReasoningTokensPerRequest,
      ),
    ) > generatedRequestLimit
  ) {
    limitSources.maxReasoningTokensPerRequest.push({
      source: 'generated-token-ceiling',
      value: generatedRequestLimit,
    });
  }
  const limits = usageLimitsSchema.parse(
    Object.fromEntries(
      usageLimitKeys.map((key) => [key, minimumLimit(key, limitSources[key])]),
    ),
  );
  const windows = sources.flatMap(({ source, policy }) =>
    policy.windows.map((window) => ({ ...window, source })),
  );

  return {
    kind: 'allowed',
    policy: effectiveUsagePolicySchema.parse({
      schemaVersion: 1,
      platform: { id: platform.id, revision: platform.revision },
      profile: { id: entitlement.id, revision: entitlement.revision },
      route,
      fundingMode: requestedFundingMode,
      recovery,
      limits,
      limitSources,
      windows,
      restrictions: restrictions.map(({ id, revision }) => ({ id, revision })),
    }),
  };
}
