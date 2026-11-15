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

/**
 * OBS06 Support Situation V1 (body-free S1). Closed enums only: no narrative,
 * prompt, cost, generation input/output, manifest, hash or GM05 title/summary.
 */
export const SUPPORT_REASON_CODES = [
  'action_interrupted',
  'action_settlement_recorded',
  'context_materialization_held',
  'scripted_provider_skipped',
  'validation_failed',
  'publication_stale',
  'published_passage',
  'model_attempt_unverified',
  'source_data_unavailable',
] as const;
export const supportReasonCodeSchema = z.enum(SUPPORT_REASON_CODES);
export type SupportReasonCode = z.infer<typeof supportReasonCodeSchema>;

export const supportEvidenceGapSchema = z.enum([
  'attempt-not-recorded',
  'stage-not-instrumented',
  'mechanical-history-not-instrumented',
  'source-missing',
  'source-conflict',
]);
export type SupportEvidenceGap = z.infer<typeof supportEvidenceGapSchema>;

export const supportSafeRefV1Schema = z.strictObject({
  kind: z.enum([
    'story',
    'story-passage',
    'campaign',
    'generation',
    'storyteller-operation',
    'storyteller-stage',
    'decision-offer',
    'world-obligation',
    'action-execution',
    'action-execution-event',
    'activity',
    'activity-event',
  ]),
  id: z.string().uuid(),
});
export type SupportSafeRefV1 = z.infer<typeof supportSafeRefV1Schema>;

export const supportSafeFailureCodeSchema = z.enum([
  'invalid_output',
  'invalid-shape',
  'provider_error',
  'timeout',
  'budget_exhausted',
  'cancelled',
  'blocked',
  'missing_source',
  'document_store',
  'corrupt_source',
  'source_mismatch',
  'scripted_hold',
  'scripted_execution',
  'chamber_injected_failure',
  'failed',
  'unavailable',
]);

export const supportSituationV1Schema = z.strictObject({
  version: z.literal(1),
  caseId: z.string().uuid(),
  campaignId: z.string().uuid(),
  observedAt: z.string().datetime(),
  sourceFrontier: z.strictObject({
    storyRevision: z.number().int().positive().nullable(),
    viewVersion: z.number().int().positive().nullable(),
    latestPublishedPassageId: z.string().uuid().nullable(),
    latestPublishedPassageSequence: z.number().int().positive().nullable(),
    mechanicalHistoryCoverage: z.enum(['not-instrumented', 'partial', 'unknown']),
  }),
  now: z.strictObject({
    kind: z.enum([
      'decision-hold',
      'narration-intent',
      'storyteller-generation',
      'world-obligation',
      'finite-action',
      'activity',
      'idle',
      'narrative-only',
      'conflicting-sources',
      'unknown',
    ]),
    controllingRef: supportSafeRefV1Schema.nullable(),
    gameSecond: z.number().int().nonnegative().nullable(),
    held: z.boolean().nullable(),
    sourceConfidence: z.enum(['direct-current-source', 'partial', 'unknown']),
    /** Active commitment shown separately from the controlling hold. */
    activeCommitment: z
      .strictObject({
        kind: z.enum(['finite-action', 'activity']),
        ref: supportSafeRefV1Schema,
        status: z.enum([
          'running',
          'paused',
          'interrupted',
          'settled',
          'encounter',
          'complete',
          'blocked',
          'cancelled',
          'horizon-reached',
          'unknown',
        ]),
      })
      .nullable(),
  }),
  activeGeneration: z
    .strictObject({
      generationId: z.string().uuid(),
      state: z.enum([
        'pending',
        'running',
        'succeeded',
        'failed',
        'uncertain',
        'unknown',
      ]),
      capture: z.enum([
        'captured',
        'materializing',
        'ready',
        'held',
        'blocked',
        'stale',
        'not-recorded',
        'unknown',
      ]),
      publication: z.enum([
        'pending',
        'published',
        'stale',
        'blocked',
        'unknown',
      ]),
      attemptCoverage: z.enum(['recorded', 'none-recorded', 'unknown']),
      safeFailureCode: supportSafeFailureCodeSchema.nullable(),
      stageCoverage: z.enum([
        'recorded',
        'not-instrumented',
        'not-applicable',
        'partial',
      ]),
      stages: z
        .array(
          z.strictObject({
            ref: supportSafeRefV1Schema,
            stage: z.enum([
              'cause-captured',
              'context-materialization-started',
              'context-materialization-completed',
              'task-prepared',
              'dispatch-review-prepared',
              'provider-dispatch-possible',
              'model-response-recorded',
              'validation-settled',
              'publication-decided',
              'stage-held',
              'stage-skipped',
              'stage-failed',
            ]),
            outcome: z.enum([
              'completed',
              'failed',
              'held',
              'stale',
              'uncertain',
              'not-run',
            ]),
            safeFailureCode: supportSafeFailureCodeSchema.nullable(),
            observedAt: z.string().datetime(),
          }),
        )
        .max(12),
    })
    .nullable(),
  recentDevelopments: z
    .array(
      z.strictObject({
        sourceRef: supportSafeRefV1Schema,
        eventSequence: z.string().regex(/^\d+$/).nullable(),
        kind: z.enum([
          'passage-published',
          'action-settled',
          'action-interrupted',
          'activity-development',
          'world-development',
        ]),
        gameSecond: z.number().int().nonnegative().nullable(),
        observedAt: z.string().datetime().nullable(),
        observation: z.enum(['recorded', 'derived']),
      }),
    )
    .max(8),
  why: z
    .array(
      z.strictObject({
        statementCode: supportReasonCodeSchema,
        class: z.enum(['recorded', 'derived', 'unknown']),
        sourceRefs: z.array(supportSafeRefV1Schema).max(4),
        missing: z.array(supportEvidenceGapSchema).max(4),
      }),
    )
    .max(6),
  coverage: z.strictObject({
    currentState: z.enum(['verified', 'partial', 'unavailable']),
    gameHistory: z.enum(['since-enabled', 'partial', 'not-instrumented']),
    storytellerStages: z.enum([
      'recorded',
      'partial',
      'not-instrumented',
      'not-applicable',
    ]),
    promptBody: z.literal('not-included'),
  }),
});
export type SupportSituationV1 = z.infer<typeof supportSituationV1Schema>;
