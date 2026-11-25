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
import { storytellerAttempt } from './funding';

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
        'completed' | 'failed' | 'held' | 'stale' | 'uncertain' | 'not-run'
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
