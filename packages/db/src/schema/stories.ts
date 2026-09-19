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
import { generation } from './generations';

export const story = pgTable(
  'story',
  {
    id: uuid('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    source: text('source').notNull(),
    premise: jsonb('premise').$type<unknown>(),
    storyteller: jsonb('storyteller').$type<unknown>(),
    execution: jsonb('execution').$type<unknown>(),
    usagePolicy: jsonb('usage_policy').$type<unknown>(),
    continuityNotes: jsonb('continuity_notes').$type<unknown>(),
    activeSceneScope: jsonb('active_scene_scope').$type<unknown>(),
    revision: integer('revision').notNull().default(1),
    viewVersion: integer('view_version').notNull().default(1),
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
    response: jsonb('response').$type<unknown>(),
    initialItems: jsonb('initial_items').$type<unknown>(),
    effects: jsonb('effects').$type<unknown>(),
    responseSource: text('response_source'),
    decisionPlan: jsonb('decision_plan').$type<unknown>(),
    responseDueAt: timestamp('response_due_at', {
      withTimezone: true,
      precision: 3,
    }),
    waitPlan: jsonb('wait_plan').$type<unknown>(),
    dueAt: timestamp('due_at', { withTimezone: true, precision: 3 }),
    controlRevision: integer('control_revision').notNull().default(0),
    remainingMs: integer('remaining_ms'),
    content: jsonb('content').notNull().$type<unknown>(),
    interaction: jsonb('interaction').$type<unknown>(),
    sourceGenerationId: uuid('source_generation_id').references(
      () => generation.id,
      { onDelete: 'restrict' },
    ),
    sourceGenerationPart: text('source_generation_part'),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('story_passage_sequence').on(t.storyId, t.sequence),
    unique('story_passage_transition').on(t.storyId, t.transitionId),
    check(
      'story_passage_decision_valid',
      sql`(${t.decisionPlan} IS NULL) = (${t.responseDueAt} IS NULL) AND (${t.decisionPlan} IS NULL OR (${t.interaction} IS NOT NULL AND ${t.waitPlan} IS NULL))`,
    ),
    check(
      'story_passage_response_source_valid',
      sql`${t.responseSource} IS NULL OR (${t.response} IS NOT NULL AND ${t.responseSource} IN ('player', 'default'))`,
    ),
    check('story_passage_sequence_positive', sql`${t.sequence} > 0`),
    check(
      'story_passage_control_valid',
      sql`${t.controlRevision} >= 0 AND (${t.remainingMs} IS NULL OR (${t.remainingMs} >= 0 AND ${t.waitPlan} IS NOT NULL))`,
    ),
    check(
      'story_passage_wait_pair',
      sql`(${t.waitPlan} IS NULL) = (${t.dueAt} IS NULL)`,
    ),
    check(
      'story_passage_generation_part',
      sql`(${t.sourceGenerationId} IS NULL AND ${t.sourceGenerationPart} IS NULL) OR (${t.sourceGenerationId} IS NOT NULL AND ${t.sourceGenerationPart} IN ('current', 'arrival'))`,
    ),
  ],
);

export const storyControl = pgTable(
  'story_control',
  {
    storyId: uuid('story_id')
      .notNull()
      .references(() => story.id, { onDelete: 'restrict' }),
    operationId: uuid('operation_id').notNull(),
    request: jsonb('request').notNull().$type<unknown>(),
  },
  (t) => [unique('story_control_identity').on(t.storyId, t.operationId)],
);

export const storyResolution = pgTable(
  'story_resolution',
  {
    generationId: uuid('generation_id')
      .primaryKey()
      .references(() => generation.id, { onDelete: 'restrict' }),
    storyId: uuid('story_id')
      .notNull()
      .references(() => story.id, { onDelete: 'restrict' }),
    basePassageId: uuid('base_passage_id')
      .notNull()
      .references(() => storyPassage.id, { onDelete: 'restrict' }),
    baseRevision: integer('base_revision').notNull(),
    operationId: uuid('operation_id').notNull(),
    submission: jsonb('submission').notNull().$type<unknown>(),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('story_resolution_operation').on(t.storyId, t.operationId),
    unique('story_resolution_base').on(
      t.storyId,
      t.basePassageId,
      t.baseRevision,
    ),
    check('story_resolution_revision_positive', sql`${t.baseRevision} > 0`),
  ],
);

export const storyItem = pgTable(
  'story_item',
  {
    storyId: uuid('story_id')
      .notNull()
      .references(() => story.id, { onDelete: 'restrict' }),
    key: text('key').notNull(),
    label: text('label').notNull(),
    holderKey: text('holder_key').notNull(),
  },
  (t) => [unique('story_item_identity').on(t.storyId, t.key)],
);
