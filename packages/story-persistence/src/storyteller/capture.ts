import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  check,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { generation } from '../generations';

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
        'captured' | 'materializing' | 'ready' | 'held' | 'stale' | 'blocked'
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
