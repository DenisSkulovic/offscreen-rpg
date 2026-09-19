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
      sql`${t.reservedMicrousd} >= 0 AND ${t.estimatedMicrousd} >= 0 AND ${t.estimatedInputTokens} >= 0 AND (${t.chargedMicrousd} IS NULL OR ${t.chargedMicrousd} >= 0) AND (${t.calculatedMicrousd} IS NULL OR ${t.calculatedMicrousd} >= 0)`,
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
