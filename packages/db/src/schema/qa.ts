import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  unique,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

export const qaRun = pgTable(
  'qa_run',
  {
    id: uuid('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    caseId: text('case_id').notNull(),
    caseVersion: integer('case_version').notNull(),
    caseDefinition: jsonb('case_definition').notNull().$type<unknown>(),
    variantId: text('variant_id'),
    driver: text('driver').notNull(),
    state: text('state').notNull().default('open'),
    revision: integer('revision').notNull().default(1),
    gitCommit: text('git_commit').notNull(),
    gitDirty: boolean('git_dirty').notNull(),
    environment: jsonb('environment').notNull().$type<unknown>(),
    setup: jsonb('setup').notNull().$type<unknown>(),
    execution: jsonb('execution').notNull().$type<unknown>(),
    accounting: jsonb('accounting').notNull().$type<unknown>(),
    disposition: text('disposition'),
    operatorNotes: text('operator_notes'),
    startedAt: timestamp('started_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    finalizedAt: timestamp('finalized_at', {
      withTimezone: true,
      precision: 3,
    }),
  },
  (t) => [
    check('qa_run_case_version_positive', sql`${t.caseVersion} > 0`),
    check('qa_run_revision_positive', sql`${t.revision} > 0`),
    check(
      'qa_run_state_shape',
      sql`(${t.state} = 'open' AND ${t.disposition} IS NULL AND ${t.operatorNotes} IS NULL AND ${t.finalizedAt} IS NULL) OR (${t.state} = 'finalized' AND ${t.disposition} IS NOT NULL AND ${t.operatorNotes} IS NOT NULL AND ${t.finalizedAt} IS NOT NULL)`,
    ),
  ],
);

export const qaRunStage = pgTable(
  'qa_run_stage',
  {
    runId: uuid('run_id')
      .notNull()
      .references(() => qaRun.id, { onDelete: 'restrict' }),
    stageId: text('stage_id').notNull(),
    ordinal: integer('ordinal').notNull(),
    status: text('status').notNull(),
    observation: text('observation').notNull(),
    evidence: jsonb('evidence').notNull().$type<unknown>(),
    ratings: jsonb('ratings').notNull().$type<unknown>(),
    recordedAt: timestamp('recorded_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.runId, t.stageId] }),
    unique('qa_run_stage_ordinal').on(t.runId, t.ordinal),
    check('qa_run_stage_ordinal_nonnegative', sql`${t.ordinal} >= 0`),
    check(
      'qa_run_stage_status_valid',
      sql`${t.status} IN ('passed', 'failed', 'blocked', 'skipped')`,
    ),
  ],
);
