import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

export const storyDraft = pgTable(
  'story_draft',
  {
    id: uuid('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    premise: text('premise').notNull(),
    storytellingDirection: text('storytelling_direction').notNull(),
    revision: integer('revision').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('story_draft_owner_created_idx').on(
      table.ownerId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    check('story_draft_revision_positive', sql`${table.revision} > 0`),
    check(
      'story_draft_content_bounds',
      sql`length(${table.title}) <= 160 AND length(${table.premise}) <= 6000 AND length(${table.storytellingDirection}) <= 2000`,
    ),
  ],
);
