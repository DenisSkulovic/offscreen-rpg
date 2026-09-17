import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  unique,
  check,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

export const story = pgTable(
  'story',
  {
    id: uuid('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    source: text('source').notNull(),
    revision: integer('revision').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [check('story_revision_positive', sql`${t.revision} > 0`)],
);

// Revision selects the current committed passage. Control/timing state is not
// encoded in this narrative sequence and will have its own reviewed contract.
export const storyPassage = pgTable(
  'story_passage',
  {
    id: uuid('id').primaryKey(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => story.id, { onDelete: 'restrict' }),
    sequence: integer('sequence').notNull(),
    transitionId: uuid('transition_id'),
    content: jsonb('content').notNull().$type<unknown>(),
    interaction: jsonb('interaction').$type<unknown>(),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('story_passage_sequence').on(t.storyId, t.sequence),
    unique('story_passage_transition').on(t.storyId, t.transitionId),
    check('story_passage_sequence_positive', sql`${t.sequence} > 0`),
  ],
);
