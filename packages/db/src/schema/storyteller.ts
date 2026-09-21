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
  unique,
} from 'drizzle-orm/pg-core';
import { generation } from './generations';

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
    state: text('state')
      .notNull()
      .default('exploring')
      .$type<'exploring' | 'final-ready' | 'failed'>(),
    snapshot: jsonb('snapshot').notNull().$type<unknown>(),
    pendingRequestSha256: text('pending_request_sha256'),
    pendingRequest: jsonb('pending_request').$type<unknown>(),
    finalOutput: jsonb('final_output').$type<unknown>(),
    failureCode: text('failure_code').$type<
      | 'stale-root'
      | 'invalid-handle'
      | 'read-limit'
      | 'round-limit'
      | 'context-limit'
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
      'storyteller_memory_exploration_state',
      sql`${t.state} IN ('exploring','final-ready','failed')`,
    ),
    check(
      'storyteller_memory_exploration_output',
      sql`(${t.state} = 'exploring' AND ${t.finalOutput} IS NULL AND ${t.failureCode} IS NULL) OR (${t.state} = 'final-ready' AND ${t.finalOutput} IS NOT NULL AND ${t.failureCode} IS NULL AND ${t.pendingRequest} IS NULL AND ${t.pendingRequestSha256} IS NULL) OR (${t.state} = 'failed' AND ${t.finalOutput} IS NULL AND ${t.failureCode} IN ('stale-root','invalid-handle','read-limit','round-limit','context-limit') AND ${t.pendingRequest} IS NULL AND ${t.pendingRequestSha256} IS NULL)`,
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
    generationId: uuid('generation_id')
      .primaryKey()
      .references(() => generation.id, { onDelete: 'restrict' }),
    revision: integer('revision').notNull().default(0),
    mode: text('mode').notNull().$type<'hold' | 'observe' | 'off'>(),
    state: text('state')
      .notNull()
      .$type<
        | 'awaiting-review'
        | 'not-held'
        | 'released'
        | 'rejected'
        | 'superseded'
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
    generationId: uuid('generation_id')
      .notNull()
      .references(() => storytellerDispatchReview.generationId, {
        onDelete: 'restrict',
      }),
    expectedRevision: integer('expected_revision').notNull(),
    kind: text('kind')
      .notNull()
      .$type<'release' | 'reject' | 'supersede'>(),
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
      t.generationId,
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
