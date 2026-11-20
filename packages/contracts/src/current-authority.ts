import { z } from 'zod';
import {
  fundingModeSchema,
  policyIdSchema,
  usageEntitlementProfileSchema,
  usagePolicyRestrictionSchema,
} from './usage-policy';

const positiveRevision = z.number().int().positive().max(1_000_000);
const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);

export const storytellerDispatchRouteEntrySchema = z
  .strictObject({
    route: policyIdSchema,
    provider: z.string().min(1).max(100),
    model: z.string().min(1).max(160),
    priceVersion: z.string().min(1).max(100),
    fundingModes: z.array(fundingModeSchema).min(1).max(3),
    executionPolicyDigest: sha256Schema,
    sourceDigest: sha256Schema,
  })
  .superRefine((entry, context) => {
    if (new Set(entry.fundingModes).size !== entry.fundingModes.length) {
      context.addIssue({
        code: 'custom',
        path: ['fundingModes'],
        message: 'Funding modes must be unique',
      });
    }
  });
export type StorytellerDispatchRouteEntry = z.infer<
  typeof storytellerDispatchRouteEntrySchema
>;

export const storytellerDispatchRouteMapSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    revision: positiveRevision,
    routes: z.array(storytellerDispatchRouteEntrySchema).min(1).max(20),
  })
  .superRefine((routeMap, context) => {
    const keys = routeMap.routes.map((route) => route.route);
    if (new Set(keys).size !== keys.length) {
      context.addIssue({
        code: 'custom',
        path: ['routes'],
        message: 'Route keys must be unique',
      });
    }
  });
export type StorytellerDispatchRouteMap = z.infer<
  typeof storytellerDispatchRouteMapSchema
>;

export const storytellerCurrentPlatformPolicyRowSchema = z
  .strictObject({
    revision: positiveRevision,
    profile: usageEntitlementProfileSchema,
    routeMap: storytellerDispatchRouteMapSchema,
    enabled: z.boolean(),
  })
  .superRefine((row, context) => {
    if (row.profile.revision !== row.revision) {
      context.addIssue({
        code: 'custom',
        path: ['profile', 'revision'],
        message: 'Profile revision must match row revision',
      });
    }
    if (row.routeMap.revision !== row.revision) {
      context.addIssue({
        code: 'custom',
        path: ['routeMap', 'revision'],
        message: 'Route map revision must match row revision',
      });
    }
    const routes = new Set(row.routeMap.routes.map((entry) => entry.route));
    for (const allowedRoute of row.profile.allowedRoutes) {
      if (!routes.has(allowedRoute)) {
        context.addIssue({
          code: 'custom',
          path: ['profile', 'allowedRoutes'],
          message: `Missing route map entry for ${allowedRoute}`,
        });
      }
    }
  });
export type StorytellerCurrentPlatformPolicyRow = z.infer<
  typeof storytellerCurrentPlatformPolicyRowSchema
>;

export const storytellerCurrentOwnerGrantRowSchema = z
  .strictObject({
    id: z.uuid(),
    revision: positiveRevision,
    userId: z.string().min(1).max(200),
    accountId: z.uuid(),
    runId: z.uuid(),
    entitlementProfile: usageEntitlementProfileSchema,
    restrictions: z.array(usagePolicyRestrictionSchema).max(20).default([]),
    enabled: z.boolean(),
    revokedAt: z.iso.datetime({ offset: true }).nullable(),
    noExpiry: z.boolean(),
    expiresAt: z.iso.datetime({ offset: true }).nullable(),
    requestedRoute: policyIdSchema,
    requestedFundingMode: fundingModeSchema,
    operatorId: z.string().min(1).max(200),
    approvalIdentity: z.string().min(1).max(200),
  })
  .superRefine((row, context) => {
    if (row.entitlementProfile.revision !== row.revision) {
      context.addIssue({
        code: 'custom',
        path: ['entitlementProfile', 'revision'],
        message: 'Entitlement revision must match grant revision',
      });
    }
    if (row.noExpiry) {
      if (row.expiresAt !== null) {
        context.addIssue({
          code: 'custom',
          path: ['expiresAt'],
          message: 'No-expiry grants must not set expiresAt',
        });
      }
    } else if (row.expiresAt === null) {
      context.addIssue({
        code: 'custom',
        path: ['expiresAt'],
        message: 'Expiring grants must set expiresAt',
      });
    }
    if (row.revokedAt !== null && row.enabled) {
      context.addIssue({
        code: 'custom',
        path: ['enabled'],
        message: 'Revoked grants must remain disabled',
      });
    }
  });
export type StorytellerCurrentOwnerGrantRow = z.infer<
  typeof storytellerCurrentOwnerGrantRowSchema
>;

export type IndependentAuthorityDenialReason =
  | 'invalid_store'
  | 'platform_missing'
  | 'platform_disabled'
  | 'grant_missing'
  | 'grant_disabled'
  | 'grant_revoked'
  | 'grant_expired';

export function parseStorytellerCurrentPlatformPolicyRow(
  input: unknown,
): StorytellerCurrentPlatformPolicyRow {
  return storytellerCurrentPlatformPolicyRowSchema.parse(input);
}

export function parseStorytellerCurrentOwnerGrantRow(
  input: unknown,
): StorytellerCurrentOwnerGrantRow {
  return storytellerCurrentOwnerGrantRowSchema.parse(input);
}

/** Money on a funding account is bookkeeping, not dispatch entitlement. */
export function fundingBalanceIsNotDispatchEntitlement(): false {
  return false;
}

/** A captured usage-policy snapshot is historical input, not live authority. */
export function capturedUsagePolicySnapshotIsNotDispatchEntitlement(): false {
  return false;
}

export function assessPlatformPolicyAvailability(
  platform: StorytellerCurrentPlatformPolicyRow | null,
): IndependentAuthorityDenialReason | 'available' {
  if (!platform) return 'platform_missing';
  if (!platform.enabled) return 'platform_disabled';
  return 'available';
}

export function assessOwnerGrantAvailability(
  grant: StorytellerCurrentOwnerGrantRow | null,
  now: Date = new Date(),
): IndependentAuthorityDenialReason | 'available' {
  if (!grant) return 'grant_missing';
  if (!grant.enabled) return 'grant_disabled';
  if (grant.revokedAt !== null) return 'grant_revoked';
  if (!grant.noExpiry && grant.expiresAt !== null) {
    if (new Date(grant.expiresAt).getTime() <= now.getTime()) {
      return 'grant_expired';
    }
  }
  return 'available';
}