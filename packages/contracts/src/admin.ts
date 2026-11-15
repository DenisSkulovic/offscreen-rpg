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

export const adminGrantScopeSummaryV1Schema = z.strictObject({
  environments: z.array(z.enum(['production', 'staging', 'local'])).max(8),
  playerScope: z.enum(['any', 'named']),
  campaignScope: z.enum(['any', 'named']),
  accountScope: z.enum(['any', 'named']),
});
export type AdminGrantScopeSummaryV1 = z.infer<
  typeof adminGrantScopeSummaryV1Schema
>;

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
        scope: adminGrantScopeSummaryV1Schema,
        provenanceKind: z.string().min(1).max(64),
      }),
    )
    .max(32),
});
export type AdminStaffAccessV1 = z.infer<typeof adminStaffAccessV1Schema>;

export const adminAuditEventV1Schema = z.strictObject({
  id: z.string().uuid(),
  kind: z.string().min(1).max(64),
  createdAt: z.string().datetime(),
  staffPrincipalId: z.string().uuid().nullable(),
  /** Safe discriminator only — never private narrative or raw grant dumps. */
  reasonCode: z.string().min(1).max(64).optional(),
});
export type AdminAuditEventV1 = z.infer<typeof adminAuditEventV1Schema>;

export const adminAuditPageV1Schema = z.strictObject({
  version: z.literal(1),
  items: z.array(adminAuditEventV1Schema).max(50),
  nextCursor: z.string().min(1).max(256).nullable(),
  coverage: z.enum(['complete', 'since-enabled', 'partial', 'unknown']),
});
export type AdminAuditPageV1 = z.infer<typeof adminAuditPageV1Schema>;

export const caseSubjectLinkV1Schema = z.strictObject({
  kind: z.enum(['player', 'campaign', 'operation', 'account']),
  id: z.string().min(1).max(128),
});
export type CaseSubjectLinkV1 = z.infer<typeof caseSubjectLinkV1Schema>;

export const caseSummaryV1Schema = z.strictObject({
  id: z.string().uuid(),
  status: z.enum(['open', 'assigned', 'closed']),
  category: z.enum(['account', 'campaign', 'operation', 'other']),
  title: z.string().min(1).max(120),
  createdByStaffId: z.string().uuid(),
  assignedStaffId: z.string().uuid().nullable(),
  links: z.array(caseSubjectLinkV1Schema).max(8),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CaseSummaryV1 = z.infer<typeof caseSummaryV1Schema>;

export const caseSummaryPageV1Schema = z.strictObject({
  version: z.literal(1),
  items: z.array(caseSummaryV1Schema).max(50),
  nextCursor: z.string().min(1).max(256).nullable(),
});
export type CaseSummaryPageV1 = z.infer<typeof caseSummaryPageV1Schema>;

export const caseCreateRequestV1Schema = z.strictObject({
  idempotencyKey: z.string().uuid(),
  category: z.enum(['account', 'campaign', 'operation', 'other']),
  title: z.string().min(1).max(120),
  link: caseSubjectLinkV1Schema.optional(),
});
export type CaseCreateRequestV1 = z.infer<typeof caseCreateRequestV1Schema>;

export const caseAssignRequestV1Schema = z.strictObject({
  assignedStaffId: z.string().uuid(),
});
export type CaseAssignRequestV1 = z.infer<typeof caseAssignRequestV1Schema>;

export const caseStatusUpdateRequestV1Schema = z.strictObject({
  status: z.enum(['open', 'assigned', 'closed']),
});
export type CaseStatusUpdateRequestV1 = z.infer<
  typeof caseStatusUpdateRequestV1Schema
>;

export const ADMIN_BOOTSTRAP_PACKAGE_ID = 'admin-reader' as const;
export const ADMIN_BOOTSTRAP_PACKAGE_VERSION = 1 as const;

export const adminSubjectRefV1Schema = z.strictObject({
  kind: z.enum([
    'player',
    'campaign',
    'operation',
    'staff',
    'case',
    'incident',
    'account',
  ]),
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

export const campaignMetadataV1Schema = z.strictObject({
  id: z.string().uuid(),
  relation: z.literal('legacy-owner'),
  createdAt: z.string().datetime(),
  currentRevision: z.number().int().positive().nullable(),
  viewVersion: z.number().int().positive().nullable(),
  operationHealth: z.enum(['normal', 'pending', 'uncertain', 'unavailable']),
});
export type CampaignMetadataV1 = z.infer<typeof campaignMetadataV1Schema>;

export const campaignMetadataPageV1Schema = z.strictObject({
  version: z.literal(1),
  playerId: z.string().min(1).max(128),
  items: z.array(campaignMetadataV1Schema).max(50),
  nextCursor: z.string().min(1).max(256).nullable(),
});
export type CampaignMetadataPageV1 = z.infer<
  typeof campaignMetadataPageV1Schema
>;

export const redactedOperationV1Schema = z.strictObject({
  id: z.string().uuid(),
  kind: z.string().min(1).max(64),
  state: z.enum(['pending', 'running', 'succeeded', 'failed', 'uncertain']),
  publication: z.enum(['pending', 'published', 'stale', 'blocked', 'unknown']),
  sourceCoverage: z.enum([
    'complete',
    'since-enabled',
    'partial',
    'unknown',
  ]),
  /**
   * OBS01: whether any storyteller_attempt row was found for this G.
   * `none-recorded` is not proof an LLM was never configured.
   */
  attemptCoverage: z.enum(['recorded', 'none-recorded']).optional(),
  lastObservedAt: z.string().datetime(),
  safeFailureCode: z.string().min(1).max(64).optional(),
});
export type RedactedOperationV1 = z.infer<typeof redactedOperationV1Schema>;

export const redactedOperationPageV1Schema = z.strictObject({
  version: z.literal(1),
  campaignId: z.string().uuid(),
  items: z.array(redactedOperationV1Schema).max(50),
  nextCursor: z.string().min(1).max(256).nullable(),
});
export type RedactedOperationPageV1 = z.infer<
  typeof redactedOperationPageV1Schema
>;

export const redactedOperationEnvelopeV1Schema = adminReadEnvelopeV1Schema(
  redactedOperationV1Schema,
);
export type RedactedOperationEnvelopeV1 = z.infer<
  typeof redactedOperationEnvelopeV1Schema
>;

/** Technical funding/allocation status — not a commercial subscription ledger. */
export const usageStatusV1Schema = z.strictObject({
  accountRef: z.string().uuid(),
  usageUnit: z.literal('microusd'),
  sourceCoverage: z.enum([
    'complete',
    'since-enabled',
    'partial',
    'unknown',
  ]),
  measuredAt: z.string().datetime(),
  fundingVerifiedAt: z.string().datetime().nullable(),
  reserved: z.string().regex(/^\d+$/),
  dispatched: z.string().regex(/^\d+$/),
  settled: z.string().regex(/^\d+$/),
  uncertain: z.string().regex(/^\d+$/),
  /** recorded = consumed amounts present; unknown ≠ zero cost. */
  costAuthority: z.enum(['recorded', 'estimate', 'unknown']),
  commercialIntegration: z.enum(['unsupported', 'unknown', 'verified']),
  commercialExplanationCode: z.string().min(1).max(64).optional(),
  windows: z
    .array(
      z.strictObject({
        windowId: z.string().min(1).max(128),
        windowVersion: z.number().int().nonnegative(),
        scope: z.enum(['platform', 'account', 'story']),
        metric: z.enum([
          'requests',
          'input_tokens',
          'generated_tokens',
          'microusd',
          'background_jobs',
        ]),
      }),
    )
    .max(32),
});
export type UsageStatusV1 = z.infer<typeof usageStatusV1Schema>;

export const usageStatusEnvelopeV1Schema =
  adminReadEnvelopeV1Schema(usageStatusV1Schema);
export type UsageStatusEnvelopeV1 = z.infer<typeof usageStatusEnvelopeV1Schema>;
