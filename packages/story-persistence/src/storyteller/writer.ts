import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  bigint,
  integer,
  timestamp,
  jsonb,
  check,
  index,
  primaryKey,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { generation } from '../generations';
import { storytellerAttempt, storytellerOperation } from './funding';

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
    ownerId: text('owner_id').notNull(),
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
    responseObjectHash: text('response_object_hash'),
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
    check('storyteller_writer_step_ordinal', sql`${t.ordinal} > 0`),
    check('storyteller_writer_step_revision', sql`${t.revision} > 0`),
    check(
      'storyteller_writer_step_request_hash',
      sql`${t.requestCasHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'storyteller_writer_step_result_hash',
      sql`${t.resultCasHash} IS NULL OR ${t.resultCasHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'storyteller_writer_step_response_object_hash',
      sql`${t.responseObjectHash} IS NULL OR ${t.responseObjectHash} ~ '^[0-9a-f]{64}$'`,
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

/**
 * WR04: immutable child research registry for parent research.delegate calls.
 */
export const storytellerWriterChild = pgTable(
  'storyteller_writer_child',
  {
    childId: uuid('child_id').primaryKey(),
    missionId: uuid('mission_id')
      .notNull()
      .references(() => storytellerWriterMission.id, { onDelete: 'restrict' }),
    parentToolCallId: text('parent_tool_call_id').notNull(),
    childOrdinal: integer('child_ordinal').notNull(),
    question: text('question').notNull(),
    requestSha256: text('request_sha256').notNull(),
    rootHash: text('root_hash').notNull(),
    rootRevision: integer('root_revision').notNull(),
    toolAllowlist: jsonb('tool_allowlist').notNull().$type<string[]>(),
    skillHashes: jsonb('skill_hashes').notNull().$type<string[]>(),
    policy: jsonb('policy').notNull().$type<{
      modelSelection: { provider: 'openrouter'; model: string };
      funding: {
        maxModelRounds: number;
        maxInputTokens: number;
        maxGeneratedTokens: number;
        maxMicrousd: number;
      };
    }>(),
    maxMicrousd: bigint('max_microusd', { mode: 'number' }).notNull(),
    state: text('state')
      .notNull()
      .default('pending')
      .$type<
        'pending' | 'running' | 'ready' | 'held' | 'failed' | 'uncertain'
      >(),
    resultCasHash: text('result_cas_hash'),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('storyteller_writer_child_identity').on(
      t.missionId,
      t.parentToolCallId,
      t.childOrdinal,
    ),
    index('storyteller_writer_child_mission').on(t.missionId),
    check(
      'storyteller_writer_child_ordinal',
      sql`${t.childOrdinal} >= 1 AND ${t.childOrdinal} <= 2`,
    ),
    check(
      'storyteller_writer_child_parent_tool_call_id',
      sql`${t.parentToolCallId} ~ '^t[1-9][0-9]*$'`,
    ),
    check(
      'storyteller_writer_child_request_sha',
      sql`${t.requestSha256} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'storyteller_writer_child_root_hash',
      sql`${t.rootHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check('storyteller_writer_child_root_revision', sql`${t.rootRevision} > 0`),
    check('storyteller_writer_child_max_microusd', sql`${t.maxMicrousd} > 0`),
    check(
      'storyteller_writer_child_result_hash',
      sql`${t.resultCasHash} IS NULL OR ${t.resultCasHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'storyteller_writer_child_state',
      sql`${t.state} IN ('pending','running','ready','held','failed','uncertain')`,
    ),
    check(
      'storyteller_writer_child_tool_allowlist_array',
      sql`jsonb_typeof(${t.toolAllowlist}) = 'array'`,
    ),
    check(
      'storyteller_writer_child_skill_hashes_array',
      sql`jsonb_typeof(${t.skillHashes}) = 'array'`,
    ),
    check(
      'storyteller_writer_child_policy_object',
      sql`jsonb_typeof(${t.policy}) = 'object'`,
    ),
    check(
      'storyteller_writer_child_question_length',
      sql`char_length(${t.question}) >= 1 AND char_length(${t.question}) <= 1200`,
    ),
  ],
);
