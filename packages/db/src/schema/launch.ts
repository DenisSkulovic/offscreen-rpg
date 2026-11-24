import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  check,
  unique,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { user } from '@offscreen/identity-persistence/auth';
import { generation } from './generations';

export const storyLaunch = pgTable(
  'story_launch',
  {
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    operationId: uuid('operation_id').notNull(),
    requestHash: text('request_hash').notNull(),
    request: jsonb('request').notNull().$type<unknown>(),
    reservedStoryId: uuid('reserved_story_id').notNull(),
    reservedFirstPassageId: uuid('reserved_first_passage_id').notNull(),
    generationId: uuid('generation_id').references(() => generation.id, {
      onDelete: 'restrict',
    }),
    state: text('state')
      .notNull()
      .default('pending')
      .$type<
        | 'pending'
        | 'preparing'
        | 'composing'
        | 'held'
        | 'failed'
        | 'uncertain'
        | 'ready'
      >(),
    sceneSequence: integer('scene_sequence'),
    publicReason: text('public_reason'),
    uncertainExplanation: text('uncertain_explanation'),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'story_launch_pkey',
      columns: [t.ownerId, t.operationId],
    }),
    unique('story_launch_reserved_story_id_key').on(t.reservedStoryId),
    unique('story_launch_reserved_first_passage_id_key').on(
      t.reservedFirstPassageId,
    ),
    unique('story_launch_generation_id_key').on(t.generationId),
    check(
      'story_launch_request_hash',
      sql`${t.requestHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'story_launch_state',
      sql`${t.state} IN ('pending','preparing','composing','held','failed','uncertain','ready')`,
    ),
    check(
      'story_launch_ready_shape',
      sql`(${t.state} = 'ready' AND ${t.sceneSequence} = 1 AND ${t.generationId} IS NOT NULL) OR (${t.state} <> 'ready' AND ${t.sceneSequence} IS NULL)`,
    ),
    check(
      'story_launch_public_reason',
      sql`(${t.state} = 'held' AND ${t.publicReason} IN ('policy','authorization','capacity')) OR (${t.state} = 'failed' AND ${t.publicReason} IN ('rejected','not-admitted','unavailable')) OR (${t.state} NOT IN ('held','failed') AND ${t.publicReason} IS NULL)`,
    ),
    check(
      'story_launch_uncertain_explanation',
      sql`(${t.state} = 'uncertain' AND ${t.uncertainExplanation} IS NOT NULL AND char_length(${t.uncertainExplanation}) BETWEEN 1 AND 500) OR (${t.state} <> 'uncertain' AND ${t.uncertainExplanation} IS NULL)`,
    ),
  ],
);
