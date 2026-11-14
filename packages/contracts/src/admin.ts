import { z } from 'zod';

/** Safe staff self projection for AD01 session enter/me. No customer data. */
export const adminSelfV1Schema = z.strictObject({
  version: z.literal(1),
  staffPrincipalId: z.string().uuid(),
  status: z.enum(['active', 'suspended']),
  accessEpoch: z.number().int().positive(),
  sessionExpiresAt: z.string().datetime(),
  idleExpiresAt: z.string().datetime(),
  /** From active package grants only; inert/revoked assignments contribute nothing. */
  workspaceFamilies: z.array(z.string().min(1).max(64)).max(32),
});
export type AdminSelfV1 = z.infer<typeof adminSelfV1Schema>;

export const adminErrorV1Schema = z.strictObject({
  version: z.literal(1),
  code: z.enum([
    'unauthenticated',
    'staff_session_required',
    'not_found',
    'not_authorized',
    'step_up_required',
    'approval_required',
    'invalid_request',
    'conflict',
    'rate_limited',
    'unavailable',
  ]),
  requestId: z.string().min(1).max(128),
});
export type AdminErrorV1 = z.infer<typeof adminErrorV1Schema>;

export const adminAccessDecisionV1Schema = z.strictObject({
  version: z.literal(1),
  decision: z.enum([
    'allow',
    'deny',
    'approval_required',
    'step_up_required',
    'unavailable',
  ]),
  reason: z.string().min(1).max(64),
  decisionId: z.string().min(1).max(128),
  matchedPackageId: z.string().min(1).max(64).optional(),
});
export type AdminAccessDecisionV1 = z.infer<typeof adminAccessDecisionV1Schema>;

export const adminStaffAccessV1Schema = z.strictObject({
  version: z.literal(1),
  staffPrincipalId: z.string().uuid(),
  packages: z
    .array(
      z.strictObject({
        packageId: z.string().min(1).max(64),
        packageVersion: z.number().int().positive(),
        status: z.enum(['inert', 'active', 'revoked']),
        workspaceFamilies: z.array(z.string().min(1).max(64)).max(32),
      }),
    )
    .max(32),
});
export type AdminStaffAccessV1 = z.infer<typeof adminStaffAccessV1Schema>;

export const ADMIN_BOOTSTRAP_PACKAGE_ID = 'admin-reader' as const;
export const ADMIN_BOOTSTRAP_PACKAGE_VERSION = 1 as const;

export const adminSubjectRefV1Schema = z.strictObject({
  kind: z.enum(['player', 'campaign', 'operation', 'staff', 'case', 'incident']),
  id: z.string().min(1).max(128),
  environment: z.enum(['production', 'staging', 'local']),
});
export type AdminSubjectRefV1 = z.infer<typeof adminSubjectRefV1Schema>;

export const playerSummaryV1Schema = z.strictObject({
  id: z.string().min(1).max(128),
  createdAt: z.string().datetime(),
  status: z.enum(['active', 'restricted', 'unknown']),
  relationshipSummary: z.strictObject({
    legacyOwnedCampaignCount: z.number().int().nonnegative().nullable(),
    coverage: z.enum(['complete', 'partial', 'unknown']),
  }),
  commercial: z.strictObject({
    status: z.enum(['unsupported', 'unknown', 'verified']),
    explanationCode: z.string().min(1).max(64).optional(),
  }),
});
export type PlayerSummaryV1 = z.infer<typeof playerSummaryV1Schema>;

export const adminReadEnvelopeV1Schema = <T extends z.ZodType>(dataSchema: T) =>
  z.strictObject({
    version: z.literal(1),
    subject: adminSubjectRefV1Schema,
    data: dataSchema,
    observedAt: z.string().datetime(),
    consistency: z.enum(['verified', 'delayed', 'partial', 'unavailable']),
    sources: z
      .array(
        z.strictObject({
          kind: z.string().min(1).max(64),
          coverage: z.enum(['complete', 'since-enabled', 'partial', 'unknown']),
          observedAt: z.string().datetime().optional(),
        }),
      )
      .max(16),
    limitations: z
      .array(
        z.enum([
          'unsupported',
          'stale',
          'incomplete-evidence',
          'source-unavailable',
        ]),
      )
      .max(16),
  });

export type AdminReadEnvelopeV1<T> = {
  version: 1;
  subject: AdminSubjectRefV1;
  data: T;
  observedAt: string;
  consistency: 'verified' | 'delayed' | 'partial' | 'unavailable';
  sources: Array<{
    kind: string;
    coverage: 'complete' | 'since-enabled' | 'partial' | 'unknown';
    observedAt?: string;
  }>;
  limitations: Array<
    'unsupported' | 'stale' | 'incomplete-evidence' | 'source-unavailable'
  >;
};

export const playerSearchHitV1Schema = z.strictObject({
  id: z.string().min(1).max(128),
  createdAt: z.string().datetime(),
  status: z.enum(['active', 'restricted', 'unknown']),
});
export type PlayerSearchHitV1 = z.infer<typeof playerSearchHitV1Schema>;

export const playerSearchPageV1Schema = z.strictObject({
  version: z.literal(1),
  items: z.array(playerSearchHitV1Schema).max(20),
  limit: z.number().int().min(1).max(20),
  /** Exact-ref search has no cursor page; always null in V1. */
  nextCursor: z.null(),
});
export type PlayerSearchPageV1 = z.infer<typeof playerSearchPageV1Schema>;

export const playerSummaryEnvelopeV1Schema =
  adminReadEnvelopeV1Schema(playerSummaryV1Schema);
export type PlayerSummaryEnvelopeV1 = z.infer<
  typeof playerSummaryEnvelopeV1Schema
>;
