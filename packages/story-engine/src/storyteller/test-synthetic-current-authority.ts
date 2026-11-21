import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import type { EffectiveUsagePolicy } from '@offscreen/contracts/usage-policy';
import {
  storytellerCurrentOwnerGrant,
  storytellerCurrentPlatformPolicy,
} from '@offscreen/db/storyteller-schema';
import type { ExecutionPolicy } from '@offscreen/storyteller/tasks';
import { retainsIndependentCurrentAuthority } from './dispatch-authority';
import { resolveIndependentAuthorityFromStore } from './current-authority';

const ROUTE_DIGEST = 'ef'.repeat(32);

type ProviderExecutionPolicy = Extract<
  ExecutionPolicy,
  { mode: 'provider' }
>['policy'];

function entitlementProfileFromCaptured(
  reference: EffectiveUsagePolicy['platform'],
  captured: EffectiveUsagePolicy,
) {
  return {
    schemaVersion: 1 as const,
    id: reference.id,
    revision: reference.revision,
    enabled: true,
    allowedRoutes: [captured.route],
    defaultRoute: captured.route,
    fundingModes: [captured.fundingMode],
    recovery: captured.recovery,
    limits: { ...captured.limits },
    windows: [],
  };
}

function restrictionPayload(captured: EffectiveUsagePolicy) {
  if (captured.windows.length === 0) {
    return [] as const;
  }
  const restrictionRef = captured.restrictions[0];
  if (!restrictionRef) {
    throw new Error(
      'Captured policy has usage windows but no restriction reference for synthetic authority',
    );
  }
  return [
    {
      schemaVersion: 1 as const,
      id: restrictionRef.id,
      revision: restrictionRef.revision,
      limits: {},
      windows: captured.windows.map(
        ({ source: _source, ...window }) => window,
      ),
    },
  ] as const;
}

function routeMap(
  revision: number,
  executionPolicy: ProviderExecutionPolicy,
) {
  return {
    schemaVersion: 1 as const,
    revision,
    routes: [
      {
        route: executionPolicy.route,
        provider: executionPolicy.provider,
        model: executionPolicy.model,
        priceVersion: executionPolicy.priceVersion,
        fundingModes: ['prepaid' as const],
        executionPolicyDigest: ROUTE_DIGEST,
        sourceDigest: ROUTE_DIGEST,
      },
    ],
  };
}

/** Inserts disabled-by-default test authority rows that match a captured task policy. */
export async function insertSyntheticCurrentAuthorityForTest(
  database: Database,
  input: {
    capturedPolicy: EffectiveUsagePolicy;
    executionPolicy: ProviderExecutionPolicy;
    ownerId: string;
    accountId: string;
    runId: string;
  },
): Promise<{ grantId: string; platformId: string }> {
  const revision = input.capturedPolicy.platform.revision;
  const platformProfile = entitlementProfileFromCaptured(
    input.capturedPolicy.platform,
    input.capturedPolicy,
  );
  const entitlementProfile = entitlementProfileFromCaptured(
    input.capturedPolicy.profile,
    input.capturedPolicy,
  );
  const restrictions = restrictionPayload(input.capturedPolicy);
  const platform = {
    revision,
    profile: platformProfile,
    routeMap: routeMap(revision, input.executionPolicy),
    enabled: true as const,
  };
  const grantId = randomUUID();
  const grant = {
    id: grantId,
    revision: input.capturedPolicy.profile.revision,
    userId: input.ownerId,
    accountId: input.accountId,
    runId: input.runId,
    entitlementProfile,
    restrictions,
    enabled: true as const,
    revokedAt: null,
    noExpiry: true,
    expiresAt: null,
    requestedRoute: input.capturedPolicy.route,
    requestedFundingMode: input.capturedPolicy.fundingMode,
    operatorId: 'synthetic-test-operator',
    approvalIdentity: 'synthetic-test-approval',
  };
  const store = resolveIndependentAuthorityFromStore({ platform, grant });
  if (
    store.kind !== 'allowed' ||
    !retainsIndependentCurrentAuthority(input.capturedPolicy, store)
  ) {
    throw new Error(
      'Synthetic authority store does not match the captured task policy',
    );
  }

  const platformId = randomUUID();
  await database.db
    .update(storytellerCurrentPlatformPolicy)
    .set({ enabled: false })
    .where(eq(storytellerCurrentPlatformPolicy.enabled, true));
  await database.db.insert(storytellerCurrentPlatformPolicy).values({
    id: platformId,
    revision,
    profile: platformProfile,
    routeMap: platform.routeMap,
    enabled: true,
    updatedAt: sql`clock_timestamp()`,
  });
  await database.db.insert(storytellerCurrentOwnerGrant).values({
    id: grantId,
    revision: grant.revision,
    userId: grant.userId,
    accountId: grant.accountId,
    runId: grant.runId,
    entitlementProfile: grant.entitlementProfile,
    restrictions: grant.restrictions,
    enabled: true,
    revokedAt: null,
    noExpiry: true,
    expiresAt: null,
    requestedRoute: grant.requestedRoute,
    requestedFundingMode: grant.requestedFundingMode,
    operatorId: grant.operatorId,
    approvalIdentity: grant.approvalIdentity,
    updatedAt: sql`clock_timestamp()`,
  });
  return { grantId, platformId };
}