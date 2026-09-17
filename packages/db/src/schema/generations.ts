import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  check,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { storyDraft } from './drafts';

export const generation = pgTable(
  'generation',
  {
    id: uuid('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    kind: text('kind').notNull(),
    input: jsonb('input').notNull().$type<unknown>(),
    state: text('state')
      .notNull()
      .default('pending')
      .$type<'pending' | 'running' | 'succeeded' | 'failed' | 'uncertain'>(),
    attemptId: uuid('attempt_id'),
    output: jsonb('output').$type<unknown>(),
    failureCode: text('failure_code'),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      'generation_state_shape',
      sql`
    (${t.state} = 'pending' AND ${t.attemptId} IS NULL AND ${t.output} IS NULL AND ${t.failureCode} IS NULL) OR
    (${t.state} IN ('running', 'uncertain') AND ${t.attemptId} IS NOT NULL AND ${t.output} IS NULL AND ${t.failureCode} IS NULL) OR
    (${t.state} = 'succeeded' AND ${t.attemptId} IS NOT NULL AND ${t.output} IS NOT NULL AND ${t.failureCode} IS NULL) OR
    (${t.state} = 'failed' AND ${t.attemptId} IS NOT NULL AND ${t.output} IS NULL AND ${t.failureCode} IS NOT NULL)`,
    ),
  ],
);

// Only the latest requested opening is eligible for the draft's preview.
export const draftOpening = pgTable('draft_opening', {
  draftId: uuid('draft_id')
    .primaryKey()
    .references(() => storyDraft.id, { onDelete: 'restrict' }),
  generationId: uuid('generation_id')
    .notNull()
    .unique()
    .references(() => generation.id, { onDelete: 'restrict' }),
});
