import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  bigint,
  integer,
  boolean,
  timestamp,
  jsonb,
  check,
  index,
  primaryKey,
  unique,
  uniqueIndex,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { generation } from './generations';
import { user } from './auth';

export const storytellerPublication = pgTable(
  'storyteller_publication',
  {
    generationId: uuid('generation_id')
      .primaryKey()
      .references(() => generation.id, { onDelete: 'restrict' }),
    state: text('state')
      .notNull()
      .default('pending')
      .$type<'pending' | 'published' | 'stale' | 'blocked'>(),
    failureCode: text('failure_code'),
  },
  (t) => [
    check(
      'storyteller_publication_state',
      sql`${t.state} IN ('pending','published','stale','blocked')`,
    ),
  ],
);

/**
 * ENG03-narrow: per-generation pending-consequence materialization record.
 * Capture JSON is ContextCaptureV1 (purpose pending-consequence) or
 * consequence captures (purpose consequence with sourceKind action-receipt,
 * action-interrupted, campaign-activity, or campaign-world-obligation).
 * Provisional generation.kind is storyteller.context-capture.v1 until
 * Stage-2 promotion.
 */
export const storytellerContextCapture = pgTable(
  'storyteller_context_capture',
  {
    captureId: uuid('capture_id')
      .primaryKey()
      .references(() => generation.id, { onDelete: 'restrict' }),
    storyId: uuid('story_id').notNull(),
    operationId: uuid('operation_id').notNull(),
    capture: jsonb('capture').notNull().$type<unknown>(),
    captureSha256: text('capture_sha256').notNull(),
    state: text('state')
      .notNull()
      .default('captured')
      .$type<
        | 'captured'
        | 'materializing'
        | 'ready'
        | 'held'
        | 'stale'
        | 'blocked'
      >(),
    materializationAttempts: integer('materialization_attempts')
      .notNull()
      .default(0),
    rearmEpoch: integer('rearm_epoch').notNull().default(0),
    leaseId: uuid('lease_id'),
    leaseExpiresAt: timestamp('lease_expires_at', {
      withTimezone: true,
      precision: 3,
    }),
    materializedRequestSha256: text('materialized_request_sha256'),
    failureCode: text('failure_code'),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('storyteller_context_capture_operation').on(t.operationId),
    index('storyteller_context_capture_story').on(t.storyId),
    check(
      'storyteller_context_capture_state',
      sql`${t.state} IN ('captured','materializing','ready','held','stale','blocked')`,
    ),
    check(
      'storyteller_context_capture_sha',
      sql`${t.captureSha256} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'storyteller_context_capture_attempts',
      sql`${t.materializationAttempts} >= 0 AND ${t.materializationAttempts} <= 3`,
    ),
    check(
      'storyteller_context_capture_rearm_epoch',
      sql`${t.rearmEpoch} >= 0 AND ${t.rearmEpoch} <= 1`,
    ),
    check(
      'storyteller_context_capture_request_sha',
      sql`${t.materializedRequestSha256} IS NULL OR ${t.materializedRequestSha256} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'storyteller_context_capture_lease',
      sql`(${t.leaseId} IS NULL) = (${t.leaseExpiresAt} IS NULL)`,
    ),
  ],
);

/**
 * ENG03-C1-R: durable same-G operator rearm audit. One epoch per capture in V1.
 * Not a player endpoint and not an Admin UI grant surface.
 */
export const storytellerContextCaptureRearm = pgTable(
  'storyteller_context_capture_rearm',
  {
    rearmId: uuid('rearm_id').primaryKey(),
    captureId: uuid('capture_id')
      .notNull()
      .references(() => storytellerContextCapture.captureId, {
        onDelete: 'restrict',
      }),
    storyId: uuid('story_id').notNull(),
    operatorId: text('operator_id').notNull(),
    reasonCode: text('reason_code')
      .notNull()
      .$type<'storage-restored' | 'transient-infra-recovered'>(),
    incidentRef: text('incident_ref'),
    previousState: text('previous_state').notNull(),
    previousAttempts: integer('previous_attempts').notNull(),
    previousFailureCode: text('previous_failure_code'),
    epoch: integer('epoch').notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('storyteller_context_capture_rearm_one_epoch').on(t.captureId),
    index('storyteller_context_capture_rearm_story').on(t.storyId),
    check(
      'storyteller_context_capture_rearm_reason',
      sql`${t.reasonCode} IN ('storage-restored','transient-infra-recovered')`,
    ),
    check('storyteller_context_capture_rearm_epoch', sql`${t.epoch} = 1`),
  ],
);

/**
 * Private, restart-safe working state for one bounded memory-exploration
 * operation. A final candidate is only input to eventual generation
 * completion; this row never grants story authority or replaces
 * storytellerPublication.
 */
export const storytellerMemoryExploration = pgTable(
  'storyteller_memory_exploration',
  {
    generationId: uuid('generation_id')
      .primaryKey()
      .references(() => generation.id, { onDelete: 'restrict' }),
    revision: integer('revision').notNull().default(0),
    modelRoundsUsed: integer('model_rounds_used').notNull().default(0),
    state: text('state')
      .notNull()
      .default('exploring')
      .$type<'exploring' | 'held' | 'final-ready' | 'failed' | 'uncertain'>(),
    snapshot: jsonb('snapshot').notNull().$type<unknown>(),
    pendingModelAttemptId: uuid('pending_model_attempt_id'),
    pendingModelRequestSha256: text('pending_model_request_sha256'),
    pendingModelRequest: jsonb('pending_model_request').$type<unknown>(),
    pendingModelOutput: jsonb('pending_model_output').$type<unknown>(),
    pendingRequestSha256: text('pending_request_sha256'),
    pendingRequest: jsonb('pending_request').$type<unknown>(),
    finalOutput: jsonb('final_output').$type<unknown>(),
    failureCode: text('failure_code').$type<
      | 'stale-root'
      | 'invalid-handle'
      | 'read-limit'
      | 'round-limit'
      | 'creative-limit'
      | 'context-limit'
      | 'review-held'
      | 'review-stopped'
      | 'authority-unavailable'
      | 'budget-unavailable'
      | 'usage-uncertain'
      | 'provider-refusal'
      | 'invalid-output'
      | 'provider-uncertain'
    >(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check('storyteller_memory_exploration_revision', sql`${t.revision} >= 0`),
    check(
      'storyteller_memory_exploration_model_rounds',
      sql`${t.modelRoundsUsed} >= 0`,
    ),
    check(
      'storyteller_memory_exploration_state',
      sql`${t.state} IN ('exploring','held','final-ready','failed','uncertain')`,
    ),
    check(
      'storyteller_memory_exploration_output',
      sql`(${t.state} = 'exploring' AND ${t.finalOutput} IS NULL AND ${t.failureCode} IS NULL) OR (${t.state} = 'held' AND ${t.finalOutput} IS NULL AND ${t.failureCode} = 'review-held' AND ${t.pendingModelAttemptId} IS NOT NULL AND ${t.pendingModelOutput} IS NULL AND ${t.pendingRequest} IS NULL) OR (${t.state} = 'final-ready' AND ${t.finalOutput} IS NOT NULL AND ${t.failureCode} IS NULL AND ${t.pendingModelAttemptId} IS NULL AND ${t.pendingModelRequest} IS NULL AND ${t.pendingModelRequestSha256} IS NULL AND ${t.pendingModelOutput} IS NULL AND ${t.pendingRequest} IS NULL AND ${t.pendingRequestSha256} IS NULL) OR (${t.state} = 'failed' AND ${t.finalOutput} IS NULL AND ${t.failureCode} IN ('stale-root','invalid-handle','read-limit','round-limit','creative-limit','context-limit','review-stopped','authority-unavailable','budget-unavailable','provider-refusal','invalid-output')) OR (${t.state} = 'uncertain' AND ${t.finalOutput} IS NULL AND ${t.failureCode} IN ('usage-uncertain','provider-uncertain') AND ${t.pendingModelAttemptId} IS NOT NULL AND ${t.pendingRequest} IS NULL)`,
    ),
    check(
      'storyteller_memory_exploration_pending_model',
      sql`(${t.pendingModelAttemptId} IS NULL AND ${t.pendingModelRequest} IS NULL AND ${t.pendingModelRequestSha256} IS NULL AND ${t.pendingModelOutput} IS NULL) OR (${t.pendingModelAttemptId} IS NOT NULL AND ${t.pendingModelRequest} IS NOT NULL AND ${t.pendingModelRequestSha256} ~ '^[0-9a-f]{64}$')`,
    ),
    check(
      'storyteller_memory_exploration_pending_request',
      sql`(${t.pendingRequest} IS NULL AND ${t.pendingRequestSha256} IS NULL) OR (${t.pendingRequest} IS NOT NULL AND ${t.pendingRequestSha256} ~ '^[0-9a-f]{64}$')`,
    ),
  ],
);

export const storytellerDispatchReview = pgTable(
  'storyteller_dispatch_review',
  {
    attemptId: uuid('attempt_id').primaryKey(),
    generationId: uuid('generation_id')
      .notNull()
      .references(() => generation.id, { onDelete: 'restrict' }),
    revision: integer('revision').notNull().default(0),
    mode: text('mode').notNull().$type<'hold' | 'observe' | 'off'>(),
    state: text('state')
      .notNull()
      .$type<
        'awaiting-review' | 'not-held' | 'released' | 'rejected' | 'superseded'
      >(),
    packetSha256: text('packet_sha256').notNull(),
    packet: jsonb('packet').notNull().$type<unknown>(),
    inspection: jsonb('inspection').notNull().$type<unknown>(),
    preparedAt: timestamp('prepared_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
    reviewedAt: timestamp('reviewed_at', {
      withTimezone: true,
      precision: 3,
    }),
  },
  (t) => [
    index('storyteller_dispatch_review_generation').on(
      t.generationId,
      t.preparedAt,
    ),
    check('storyteller_dispatch_review_revision', sql`${t.revision} >= 0`),
    check(
      'storyteller_dispatch_review_mode',
      sql`${t.mode} IN ('hold','observe','off')`,
    ),
    check(
      'storyteller_dispatch_review_state',
      sql`${t.state} IN ('awaiting-review','not-held','released','rejected','superseded')`,
    ),
    check(
      'storyteller_dispatch_review_hash',
      sql`${t.packetSha256} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'storyteller_dispatch_review_reviewed',
      sql`(${t.state} IN ('awaiting-review','not-held')) = (${t.reviewedAt} IS NULL)`,
    ),
  ],
);

export const storytellerDispatchReviewDecision = pgTable(
  'storyteller_dispatch_review_decision',
  {
    id: uuid('id').primaryKey(),
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => storytellerDispatchReview.attemptId, {
        onDelete: 'restrict',
      }),
    expectedRevision: integer('expected_revision').notNull(),
    kind: text('kind').notNull().$type<'release' | 'reject' | 'supersede'>(),
    packetSha256: text('packet_sha256').notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('storyteller_dispatch_review_decision_revision').on(
      t.attemptId,
      t.expectedRevision,
    ),
    check(
      'storyteller_dispatch_review_decision_revision_value',
      sql`${t.expectedRevision} >= 0`,
    ),
    check(
      'storyteller_dispatch_review_decision_kind',
      sql`${t.kind} IN ('release','reject','supersede')`,
    ),
    check(
      'storyteller_dispatch_review_decision_hash',
      sql`${t.packetSha256} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
);

export const storytellerFunding = pgTable(
  'storyteller_funding',
  {
    id: uuid('id').primaryKey(),
    limitMicrousd: bigint('limit_microusd', { mode: 'bigint' }).notNull(),
    settledMicrousd: bigint('settled_microusd', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    reservedMicrousd: bigint('reserved_microusd', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    stopped: boolean('stopped').notNull().default(true),
    verifiedAt: timestamp('verified_at', {
      withTimezone: true,
      precision: 3,
    }).notNull(),
  },
  (t) => [
    check(
      'storyteller_funding_nonnegative',
      sql`${t.limitMicrousd} >= 0 AND ${t.settledMicrousd} >= 0 AND ${t.reservedMicrousd} >= 0`,
    ),
  ],
);

export const storytellerRun = pgTable(
  'storyteller_run',
  {
    id: uuid('id').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => storytellerFunding.id, { onDelete: 'restrict' }),
    limitMicrousd: bigint('limit_microusd', { mode: 'bigint' }).notNull(),
    settledMicrousd: bigint('settled_microusd', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    reservedMicrousd: bigint('reserved_microusd', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    maxAttempts: integer('max_attempts').notNull(),
    admittedAttempts: integer('admitted_attempts').notNull().default(0),
    enabled: boolean('enabled').notNull().default(false),
  },
  (t) => [
    uniqueIndex('storyteller_run_id_account').on(t.id, t.accountId),
    check(
      'storyteller_run_bounds',
      sql`${t.limitMicrousd} >= 0 AND ${t.settledMicrousd} >= 0 AND ${t.reservedMicrousd} >= 0 AND ${t.maxAttempts} > 0 AND ${t.admittedAttempts} BETWEEN 0 AND ${t.maxAttempts}`,
    ),
  ],
);

/**
 * One immutable allowance for the complete Storyteller operation. Attempts are
 * delivery/audit records beneath this boundary; creating a fresh attempt must
 * never replenish the generation's model rounds, tokens, or money.
 */
export const storytellerOperation = pgTable(
  'storyteller_operation',
  {
    generationId: uuid('generation_id')
      .primaryKey()
      .references(() => generation.id, { onDelete: 'restrict' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => storytellerFunding.id, { onDelete: 'restrict' }),
    runId: uuid('run_id')
      .notNull()
      .references(() => storytellerRun.id, { onDelete: 'restrict' }),
    ownerId: text('owner_id').notNull(),
    purpose: text('purpose').notNull(),
    resources: jsonb('resources').notNull().$type<unknown>(),
    state: text('state')
      .notNull()
      .default('open')
      .$type<'open' | 'complete' | 'uncertain' | 'exhausted'>(),
    maxModelRounds: integer('max_model_rounds').notNull(),
    reservedRounds: integer('reserved_rounds').notNull().default(0),
    dispatchedRounds: integer('dispatched_rounds').notNull().default(0),
    maxInputTokens: integer('max_input_tokens').notNull(),
    reservedInputTokens: integer('reserved_input_tokens').notNull().default(0),
    consumedInputTokens: integer('consumed_input_tokens').notNull().default(0),
    maxGeneratedTokens: integer('max_generated_tokens').notNull(),
    reservedGeneratedTokens: integer('reserved_generated_tokens')
      .notNull()
      .default(0),
    consumedGeneratedTokens: integer('consumed_generated_tokens')
      .notNull()
      .default(0),
    maxReasoningTokens: integer('max_reasoning_tokens').notNull(),
    reservedReasoningTokens: integer('reserved_reasoning_tokens')
      .notNull()
      .default(0),
    consumedReasoningTokens: integer('consumed_reasoning_tokens')
      .notNull()
      .default(0),
    maxMicrousd: bigint('max_microusd', { mode: 'bigint' }).notNull(),
    reservedMicrousd: bigint('reserved_microusd', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    consumedMicrousd: bigint('consumed_microusd', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('storyteller_operation_account_created').on(t.accountId, t.createdAt),
    check(
      'storyteller_operation_state',
      sql`${t.state} IN ('open','complete','uncertain','exhausted')`,
    ),
    check(
      'storyteller_operation_rounds',
      sql`${t.maxModelRounds} > 0 AND ${t.reservedRounds} >= 0 AND ${t.dispatchedRounds} >= 0 AND ${t.reservedRounds} + ${t.dispatchedRounds} <= ${t.maxModelRounds}`,
    ),
    check(
      'storyteller_operation_amounts',
      sql`${t.maxInputTokens} >= 0 AND ${t.reservedInputTokens} >= 0 AND ${t.consumedInputTokens} >= 0 AND ${t.maxGeneratedTokens} >= 0 AND ${t.reservedGeneratedTokens} >= 0 AND ${t.consumedGeneratedTokens} >= 0 AND ${t.maxReasoningTokens} >= 0 AND ${t.reservedReasoningTokens} >= 0 AND ${t.consumedReasoningTokens} >= 0 AND ${t.maxMicrousd} >= 0 AND ${t.reservedMicrousd} >= 0 AND ${t.consumedMicrousd} >= 0`,
    ),
  ],
);

export const storytellerAttempt = pgTable(
  'storyteller_attempt',
  {
    id: uuid('id').primaryKey(),
    generationId: uuid('generation_id')
      .notNull()
      .references(() => generation.id, { onDelete: 'restrict' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => storytellerFunding.id, { onDelete: 'restrict' }),
    runId: uuid('run_id')
      .notNull()
      .references(() => storytellerRun.id, { onDelete: 'restrict' }),
    ownerId: text('owner_id').notNull(),
    storyId: uuid('story_id'),
    draftId: uuid('draft_id'),
    purpose: text('purpose').notNull(),
    storytellerProfileId: text('storyteller_profile_id').notNull(),
    storytellerProfileRevision: integer(
      'storyteller_profile_revision',
    ).notNull(),
    taskInputVersion: integer('task_input_version').notNull(),
    promptVersion: text('prompt_version').notNull(),
    recipeVersion: text('recipe_version').notNull(),
    resourcePolicyVersion: text('resource_policy_version').notNull(),
    requestedModel: text('requested_model').notNull(),
    requestedProvider: text('requested_provider').notNull(),
    priceVersion: text('price_version').notNull(),
    attribution: jsonb('attribution').notNull().$type<unknown>(),
    state: text('state')
      .notNull()
      .$type<'reserved' | 'dispatched' | 'settled' | 'uncertain' | 'unsent'>(),
    reservedMicrousd: bigint('reserved_microusd', { mode: 'bigint' }).notNull(),
    reservedInputTokens: integer('reserved_input_tokens').notNull(),
    reservedGeneratedTokens: integer('reserved_generated_tokens').notNull(),
    reservedReasoningTokens: integer('reserved_reasoning_tokens').notNull(),
    estimatedMicrousd: bigint('estimated_microusd', {
      mode: 'bigint',
    }).notNull(),
    estimatedInputTokens: integer('estimated_input_tokens').notNull(),
    estimationMethod: text('estimation_method').notNull(),
    chargedMicrousd: bigint('charged_microusd', { mode: 'bigint' }),
    calculatedMicrousd: bigint('calculated_microusd', { mode: 'bigint' }),
    reconciliation: text('reconciliation')
      .notNull()
      .$type<'pending' | 'matched' | 'different' | 'unavailable' | 'unknown'>(),
    requestBytes: integer('request_bytes').notNull(),
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),
    reasoningTokens: integer('reasoning_tokens'),
    cachedTokens: integer('cached_tokens'),
    cacheWriteTokens: integer('cache_write_tokens'),
    totalTokens: integer('total_tokens'),
    policy: jsonb('policy').notNull().$type<unknown>(),
    providerId: text('provider_id'),
    reportedModel: text('reported_model'),
    finishReason: text('finish_reason'),
    httpStatus: integer('http_status'),
    durationMs: integer('duration_ms'),
    dispatchedAt: timestamp('dispatched_at', {
      withTimezone: true,
      precision: 3,
    }),
    dispatchAuthorityGrantId: uuid('dispatch_authority_grant_id'),
    dispatchPlatformRevision: integer('dispatch_platform_revision'),
    dispatchGrantRevision: integer('dispatch_grant_revision'),
    settledAt: timestamp('settled_at', { withTimezone: true, precision: 3 }),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('storyteller_attempt_account_created').on(t.accountId, t.createdAt),
    index('storyteller_attempt_story_created').on(t.storyId, t.createdAt),
    index('storyteller_attempt_purpose_created').on(t.purpose, t.createdAt),
    check(
      'storyteller_attempt_state',
      sql`${t.state} IN ('reserved','dispatched','settled','uncertain','unsent')`,
    ),
    check(
      'storyteller_attempt_settlement',
      sql`(${t.state} IN ('settled','unsent')) = (${t.chargedMicrousd} IS NOT NULL)`,
    ),
    check(
      'storyteller_attempt_amounts',
      sql`${t.reservedMicrousd} >= 0 AND ${t.reservedInputTokens} >= 0 AND ${t.reservedGeneratedTokens} >= 0 AND ${t.reservedReasoningTokens} >= 0 AND ${t.estimatedMicrousd} >= 0 AND ${t.estimatedInputTokens} >= 0 AND (${t.chargedMicrousd} IS NULL OR ${t.chargedMicrousd} >= 0) AND (${t.calculatedMicrousd} IS NULL OR ${t.calculatedMicrousd} >= 0)`,
    ),
    check(
      'storyteller_attempt_reconciliation',
      sql`
        (${t.state} IN ('reserved','dispatched') AND ${t.reconciliation} = 'pending' AND ${t.calculatedMicrousd} IS NULL AND ${t.settledAt} IS NULL) OR
        (${t.state} = 'uncertain' AND ${t.reconciliation} = 'unknown' AND ${t.calculatedMicrousd} IS NULL AND ${t.dispatchedAt} IS NOT NULL AND ${t.settledAt} IS NULL) OR
        (${t.state} = 'unsent' AND ${t.reconciliation} = 'unavailable' AND ${t.calculatedMicrousd} IS NULL AND ${t.dispatchedAt} IS NULL AND ${t.settledAt} IS NOT NULL) OR
        (${t.state} = 'settled' AND ${t.reconciliation} IN ('matched','different') AND ${t.calculatedMicrousd} IS NOT NULL AND ${t.dispatchedAt} IS NOT NULL AND ${t.settledAt} IS NOT NULL) OR
        (${t.state} = 'settled' AND ${t.reconciliation} = 'unavailable' AND ${t.calculatedMicrousd} IS NULL AND ${t.dispatchedAt} IS NOT NULL AND ${t.settledAt} IS NOT NULL)
      `,
    ),
    check(
      'storyteller_attempt_metrics',
      sql`${t.requestBytes} >= 0 AND (${t.promptTokens} IS NULL OR ${t.promptTokens} >= 0) AND (${t.completionTokens} IS NULL OR ${t.completionTokens} >= 0) AND (${t.reasoningTokens} IS NULL OR ${t.reasoningTokens} >= 0) AND (${t.cachedTokens} IS NULL OR ${t.cachedTokens} >= 0) AND (${t.cacheWriteTokens} IS NULL OR ${t.cacheWriteTokens} >= 0) AND (${t.totalTokens} IS NULL OR ${t.totalTokens} >= 0) AND (${t.durationMs} IS NULL OR ${t.durationMs} >= 0)`,
    ),
    check(
      'storyteller_attempt_dispatch_authority_audit',
      sql`
        (
          ${t.dispatchAuthorityGrantId} IS NULL
          AND ${t.dispatchPlatformRevision} IS NULL
          AND ${t.dispatchGrantRevision} IS NULL
        )
        OR (
          ${t.dispatchAuthorityGrantId} IS NOT NULL
          AND ${t.dispatchPlatformRevision} IS NOT NULL
          AND ${t.dispatchGrantRevision} IS NOT NULL
          AND ${t.dispatchPlatformRevision} > 0
          AND ${t.dispatchGrantRevision} > 0
        )
      `,
    ),
  ],
);

export const storytellerUsageAllocation = pgTable(
  'storyteller_usage_allocation',
  {
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => storytellerAttempt.id, { onDelete: 'restrict' }),
    windowId: text('window_id').notNull(),
    windowVersion: integer('window_version').notNull(),
    scope: text('scope').notNull().$type<'platform' | 'account' | 'story'>(),
    scopeKey: text('scope_key').notNull(),
    metric: text('metric')
      .notNull()
      .$type<
        | 'requests'
        | 'input_tokens'
        | 'generated_tokens'
        | 'microusd'
        | 'background_jobs'
      >(),
    definition: jsonb('definition').notNull().$type<unknown>(),
    state: text('state')
      .notNull()
      .$type<
        'reserved' | 'dispatched' | 'settled' | 'uncertain' | 'released'
      >(),
    reserved: bigint('reserved', { mode: 'bigint' }).notNull(),
    consumed: bigint('consumed', { mode: 'bigint' }),
    periodStartsAt: timestamp('period_starts_at', {
      withTimezone: true,
      precision: 3,
    }),
    periodEndsAt: timestamp('period_ends_at', {
      withTimezone: true,
      precision: 3,
    }),
    attributedAt: timestamp('attributed_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
    settledAt: timestamp('settled_at', { withTimezone: true, precision: 3 }),
  },
  (t) => [
    unique('storyteller_usage_allocation_identity').on(
      t.attemptId,
      t.scope,
      t.windowId,
      t.windowVersion,
    ),
    index('storyteller_usage_allocation_window').on(
      t.scope,
      t.scopeKey,
      t.windowId,
      t.windowVersion,
      t.attributedAt,
    ),
    check(
      'storyteller_usage_allocation_state',
      sql`${t.state} IN ('reserved','dispatched','settled','uncertain','released')`,
    ),
    check(
      'storyteller_usage_allocation_amounts',
      sql`${t.reserved} >= 0 AND (${t.consumed} IS NULL OR ${t.consumed} >= 0)`,
    ),
    check(
      'storyteller_usage_allocation_settlement',
      sql`(${t.state} IN ('settled','released')) = (${t.consumed} IS NOT NULL) AND (${t.state} IN ('settled','released')) = (${t.settledAt} IS NOT NULL)`,
    ),
  ],
);

export const storytellerRetry = pgTable(
  'storyteller_retry',
  {
    generationId: uuid('generation_id')
      .notNull()
      .references(() => generation.id, { onDelete: 'restrict' }),
    retryId: uuid('retry_id').notNull(),
    attemptId: uuid('attempt_id').notNull(),
  },
  (t) => [unique('storyteller_retry_identity').on(t.generationId, t.retryId)],
);

/**
 * OBS03: redacted prompt/component/source provenance for one generation.
 * Metadata and hashes only; never stores prompt bodies or source prose.
 */
export const storytellerPromptProvenance = pgTable(
  'storyteller_prompt_provenance',
  {
    generationId: uuid('generation_id')
      .primaryKey()
      .references(() => generation.id, { onDelete: 'restrict' }),
    taskInputSha256: text('task_input_sha256').notNull(),
    compiledRequestSha256: text('compiled_request_sha256').notNull(),
    manifest: jsonb('manifest').notNull().$type<unknown>(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      'storyteller_prompt_provenance_task_sha',
      sql`${t.taskInputSha256} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'storyteller_prompt_provenance_request_sha',
      sql`${t.compiledRequestSha256} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
);

/**
 * OBS02: compact typed stage receipts at real Storyteller boundaries.
 * No narrative text; links only to existing generation/attempt/source IDs.
 */
export const storytellerExecutionStage = pgTable(
  'storyteller_execution_stage',
  {
    id: uuid('id').primaryKey(),
    generationId: uuid('generation_id')
      .notNull()
      .references(() => generation.id, { onDelete: 'restrict' }),
    operationId: uuid('operation_id'),
    attemptId: uuid('attempt_id'),
    stage: text('stage')
      .notNull()
      .$type<
        | 'cause-captured'
        | 'context-materialization-started'
        | 'context-materialization-completed'
        | 'task-prepared'
        | 'dispatch-review-prepared'
        | 'provider-dispatch-possible'
        | 'model-response-recorded'
        | 'validation-settled'
        | 'publication-decided'
        | 'stage-held'
        | 'stage-skipped'
        | 'stage-failed'
      >(),
    outcome: text('outcome')
      .notNull()
      .$type<
        | 'completed'
        | 'failed'
        | 'held'
        | 'stale'
        | 'uncertain'
        | 'not-run'
      >(),
    sourceKind: text('source_kind')
      .notNull()
      .$type<
        | 'generation'
        | 'context-capture'
        | 'dispatch-review'
        | 'publication'
        | 'attempt'
        | 'none'
      >(),
    sourceId: text('source_id'),
    sourceSha256: text('source_sha256'),
    failureClass: text('failure_class'),
    idempotencyKey: text('idempotency_key').notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
    producerBuildId: text('producer_build_id').notNull(),
  },
  (t) => [
    unique('storyteller_execution_stage_identity').on(
      t.generationId,
      t.stage,
      t.idempotencyKey,
    ),
    index('storyteller_execution_stage_generation').on(
      t.generationId,
      t.createdAt,
    ),
    check(
      'storyteller_execution_stage_stage',
      sql`${t.stage} IN ('cause-captured','context-materialization-started','context-materialization-completed','task-prepared','dispatch-review-prepared','provider-dispatch-possible','model-response-recorded','validation-settled','publication-decided','stage-held','stage-skipped','stage-failed')`,
    ),
    check(
      'storyteller_execution_stage_outcome',
      sql`${t.outcome} IN ('completed','failed','held','stale','uncertain','not-run')`,
    ),
    check(
      'storyteller_execution_stage_source_kind',
      sql`${t.sourceKind} IN ('generation','context-capture','dispatch-review','publication','attempt','none')`,
    ),
    check(
      'storyteller_execution_stage_sha',
      sql`${t.sourceSha256} IS NULL OR ${t.sourceSha256} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
);

/** HK01: immutable operator audit for one guarded saved-response settlement. */
export const storytellerSavedRepairAudit = pgTable(
  'storyteller_saved_repair_audit',
  {
    attemptId: uuid('attempt_id')
      .primaryKey()
      .references(() => storytellerAttempt.id, { onDelete: 'restrict' }),
    operatorId: text('operator_id').notNull(),
    reason: text('reason').notNull(),
    planFingerprint: text('plan_fingerprint').notNull(),
    reviewPacketSha256: text('review_packet_sha256').notNull(),
    evidenceSha256: text('evidence_sha256').notNull(),
    priorGenerationState: text('prior_generation_state').notNull(),
    priorStatusRevision: integer('prior_status_revision').notNull(),
    settlementResult: text('settlement_result').notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      'storyteller_saved_repair_audit_plan_fingerprint',
      sql`${t.planFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'storyteller_saved_repair_audit_review_packet_sha256',
      sql`${t.reviewPacketSha256} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'storyteller_saved_repair_audit_evidence_sha256',
      sql`${t.evidenceSha256} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
);

/** OBS00-B: disabled-by-default platform authority; money rows are not entitlements. */
export const storytellerCurrentPlatformPolicy = pgTable(
  'storyteller_current_platform_policy',
  {
    id: uuid('id').primaryKey(),
    revision: integer('revision').notNull(),
    profile: jsonb('profile').notNull().$type<unknown>(),
    routeMap: jsonb('route_map').notNull().$type<unknown>(),
    enabled: boolean('enabled').notNull().default(false),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      'storyteller_current_platform_policy_revision',
      sql`${t.revision} > 0`,
    ),
    check(
      'storyteller_current_platform_policy_profile_schema',
      sql`jsonb_typeof(${t.profile}) = 'object'
        AND ${t.profile} ? 'schemaVersion'
        AND ${t.profile}->>'schemaVersion' = '1'
        AND ${t.profile} ? 'revision'
        AND (${t.profile}->>'revision')::integer = ${t.revision}`,
    ),
    check(
      'storyteller_current_platform_policy_route_map_schema',
      sql`jsonb_typeof(${t.routeMap}) = 'object'
        AND ${t.routeMap} ? 'schemaVersion'
        AND ${t.routeMap}->>'schemaVersion' = '1'
        AND ${t.routeMap} ? 'revision'
        AND (${t.routeMap}->>'revision')::integer = ${t.revision}
        AND ${t.routeMap} ? 'routes'
        AND jsonb_typeof(${t.routeMap}->'routes') = 'array'
        AND jsonb_array_length(${t.routeMap}->'routes') > 0`,
    ),
    uniqueIndex('storyteller_current_platform_policy_one_enabled')
      .on(t.enabled)
      .where(sql`${t.enabled} = true`),
  ],
);

/** OBS00-B: scoped owner grant; disabled-by-default with explicit revocation/expiry. */
export const storytellerCurrentOwnerGrant = pgTable(
  'storyteller_current_owner_grant',
  {
    id: uuid('id').primaryKey(),
    revision: integer('revision').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => storytellerFunding.id, { onDelete: 'restrict' }),
    runId: uuid('run_id').notNull(),
    entitlementProfile: jsonb('entitlement_profile').notNull().$type<unknown>(),
    restrictions: jsonb('restrictions').notNull().default([]).$type<unknown>(),
    enabled: boolean('enabled').notNull().default(false),
    revokedAt: timestamp('revoked_at', { withTimezone: true, precision: 3 }),
    noExpiry: boolean('no_expiry').notNull().default(false),
    expiresAt: timestamp('expires_at', { withTimezone: true, precision: 3 }),
    requestedRoute: text('requested_route').notNull(),
    requestedFundingMode: text('requested_funding_mode').notNull(),
    operatorId: text('operator_id').notNull(),
    approvalIdentity: text('approval_identity').notNull(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      name: 'storyteller_current_owner_grant_run_account_fk',
      columns: [t.runId, t.accountId],
      foreignColumns: [storytellerRun.id, storytellerRun.accountId],
    }).onDelete('restrict'),
    check(
      'storyteller_current_owner_grant_revision',
      sql`${t.revision} > 0`,
    ),
    check(
      'storyteller_current_owner_grant_entitlement_schema',
      sql`jsonb_typeof(${t.entitlementProfile}) = 'object'
        AND ${t.entitlementProfile} ? 'schemaVersion'
        AND ${t.entitlementProfile}->>'schemaVersion' = '1'
        AND ${t.entitlementProfile} ? 'revision'
        AND (${t.entitlementProfile}->>'revision')::integer = ${t.revision}`,
    ),
    check(
      'storyteller_current_owner_grant_restrictions_array',
      sql`jsonb_typeof(${t.restrictions}) = 'array'`,
    ),
    check(
      'storyteller_current_owner_grant_revoked',
      sql`(${t.revokedAt} IS NULL) OR (${t.enabled} = false)`,
    ),
    check(
      'storyteller_current_owner_grant_expiry',
      sql`(${t.noExpiry} = true AND ${t.expiresAt} IS NULL)
        OR (${t.noExpiry} = false AND ${t.expiresAt} IS NOT NULL)`,
    ),
    check(
      'storyteller_current_owner_grant_requested_route',
      sql`${t.requestedRoute} ~ '^[a-z0-9][a-z0-9._:-]{0,99}$'`,
    ),
    check(
      'storyteller_current_owner_grant_requested_funding',
      sql`${t.requestedFundingMode} IN ('sponsored','prepaid','on-demand')`,
    ),
  ],
);

/**
 * WR03: durable writer mission identity and pinned scope. Charging remains on
 * storyteller_operation; this row coordinates capture pins and step revision.
 */
export const storytellerWriterMission = pgTable(
  'storyteller_writer_mission',
  {
    id: uuid('id').primaryKey(),
    generationId: uuid('generation_id')
      .notNull()
      .references(() => generation.id, { onDelete: 'restrict' }),
    operationId: uuid('operation_id')
      .notNull()
      .references(() => storytellerOperation.generationId, {
        onDelete: 'restrict',
      }),
    ownerId: uuid('owner_id').notNull(),
    storyId: uuid('story_id').notNull(),
    captureSha256: text('capture_sha256').notNull(),
    libraryRootHash: text('library_root_hash').notNull(),
    libraryRootRevision: integer('library_root_revision').notNull(),
    stageRootHash: text('stage_root_hash'),
    stageRootRevision: integer('stage_root_revision'),
    nextRevision: integer('next_revision').notNull().default(1),
    state: text('state')
      .notNull()
      .default('captured')
      .$type<
        | 'captured'
        | 'active'
        | 'proposal-ready'
        | 'held'
        | 'failed'
        | 'uncertain'
      >(),
    budgetSnapshot: jsonb('budget_snapshot').notNull().$type<{
      maxModelRounds: number;
      maxInputTokens: number;
      maxGeneratedTokens: number;
      maxMicrousd: string;
      deadlineMs: number;
    }>(),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('storyteller_writer_mission_generation').on(t.generationId),
    index('storyteller_writer_mission_story').on(t.storyId),
    check(
      'storyteller_writer_mission_state',
      sql`${t.state} IN ('captured','active','proposal-ready','held','failed','uncertain')`,
    ),
    check(
      'storyteller_writer_mission_capture_sha',
      sql`${t.captureSha256} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'storyteller_writer_mission_library_root_hash',
      sql`${t.libraryRootHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'storyteller_writer_mission_library_root_revision',
      sql`${t.libraryRootRevision} > 0`,
    ),
    check(
      'storyteller_writer_mission_stage_root_pair',
      sql`(${t.stageRootHash} IS NULL) = (${t.stageRootRevision} IS NULL)`,
    ),
    check(
      'storyteller_writer_mission_stage_root_hash',
      sql`${t.stageRootHash} IS NULL OR ${t.stageRootHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'storyteller_writer_mission_stage_root_revision',
      sql`${t.stageRootRevision} IS NULL OR ${t.stageRootRevision} > 0`,
    ),
    check(
      'storyteller_writer_mission_next_revision',
      sql`${t.nextRevision} > 0`,
    ),
    check(
      'storyteller_writer_mission_budget_snapshot_schema',
      sql`jsonb_typeof(${t.budgetSnapshot}) = 'object'
        AND ${t.budgetSnapshot} ? 'maxModelRounds'
        AND ${t.budgetSnapshot} ? 'maxInputTokens'
        AND ${t.budgetSnapshot} ? 'maxGeneratedTokens'
        AND ${t.budgetSnapshot} ? 'maxMicrousd'
        AND ${t.budgetSnapshot} ? 'deadlineMs'`,
    ),
  ],
);

/**
 * WR03: revisioned step journal keyed by mission, context and ordinal. Parent
 * writer uses contextId = missionId; WR04 children receive separate context IDs.
 */
export const storytellerWriterStep = pgTable(
  'storyteller_writer_step',
  {
    missionId: uuid('mission_id')
      .notNull()
      .references(() => storytellerWriterMission.id, { onDelete: 'restrict' }),
    contextId: uuid('context_id').notNull(),
    ordinal: integer('ordinal').notNull(),
    attemptId: uuid('attempt_id').references(() => storytellerAttempt.id, {
      onDelete: 'restrict',
    }),
    toolCallId: text('tool_call_id'),
    requestCasHash: text('request_cas_hash').notNull(),
    resultCasHash: text('result_cas_hash'),
    revision: integer('revision').notNull(),
    state: text('state')
      .notNull()
      .$type<
        | 'captured'
        | 'model-request-prepared'
        | 'attempt-reserved'
        | 'dispatched'
        | 'result-settled'
        | 'tools-applied'
        | 'proposal-ready'
        | 'held'
        | 'failed'
        | 'uncertain'
      >(),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.missionId, t.contextId, t.ordinal] }),
    uniqueIndex('storyteller_writer_step_attempt')
      .on(t.attemptId)
      .where(sql`${t.attemptId} IS NOT NULL`),
    uniqueIndex('storyteller_writer_step_tool_call')
      .on(t.missionId, t.contextId, t.toolCallId)
      .where(sql`${t.toolCallId} IS NOT NULL`),
    check(
      'storyteller_writer_step_ordinal',
      sql`${t.ordinal} > 0`,
    ),
    check(
      'storyteller_writer_step_revision',
      sql`${t.revision} > 0`,
    ),
    check(
      'storyteller_writer_step_request_hash',
      sql`${t.requestCasHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'storyteller_writer_step_result_hash',
      sql`${t.resultCasHash} IS NULL OR ${t.resultCasHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'storyteller_writer_step_tool_call_id',
      sql`${t.toolCallId} IS NULL OR ${t.toolCallId} ~ '^t[1-9][0-9]*$'`,
    ),
    check(
      'storyteller_writer_step_state',
      sql`${t.state} IN (
        'captured',
        'model-request-prepared',
        'attempt-reserved',
        'dispatched',
        'result-settled',
        'tools-applied',
        'proposal-ready',
        'held',
        'failed',
        'uncertain'
      )`,
    ),
  ],
);
