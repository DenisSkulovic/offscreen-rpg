import {
  pgTable,
  uuid,
  integer,
  jsonb,
  text,
  bigint,
  bigserial,
  timestamp,
  primaryKey,
  unique,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { story, storyPassage } from './stories';
import { user } from './auth';
import { generation } from './generations';

export const campaign = pgTable('campaign', {
  storyId: uuid('story_id')
    .primaryKey()
    .references(() => story.id, { onDelete: 'cascade' }),
  settingsRevision: integer('settings_revision').notNull(),
  locked: integer('locked').notNull().default(0),
  character: jsonb('character').$type<unknown>(),
  storyFacts: jsonb('story_facts').notNull().default([]).$type<unknown>(),
  activityOccurrences: jsonb('activity_occurrences')
    .notNull()
    .default([])
    .$type<unknown>(),
  acceptedActivityPlan: jsonb('accepted_activity_plan').$type<unknown>(),
  content: jsonb('content').$type<unknown>(),
  location: text('location'),
  tick: bigint('tick', { mode: 'number' }).notNull(),
  clock: jsonb('clock').notNull().$type<unknown>(),
  clockAnchorAt: timestamp('clock_anchor_at', {
    withTimezone: true,
    precision: 3,
  }).notNull(),
  clockPace: jsonb('clock_pace').notNull().$type<unknown>(),
  // Independently owned domain reasons freeze the campaign clock. Activity
  // pause/encounter state remains separate and cannot clear these holds.
  holds: jsonb('holds').notNull().default([]).$type<unknown>(),
  offer: jsonb('offer').$type<unknown>(),
  situationAuthorization: jsonb('situation_authorization')
    .notNull()
    .$type<unknown>(),
  activeActivityId: uuid('active_activity_id'),
  activeActionOperationId: uuid('active_action_operation_id'),
});
export const campaignSettings = pgTable(
  'campaign_settings',
  {
    storyId: uuid('story_id')
      .notNull()
      .references(() => story.id, { onDelete: 'cascade' }),
    revision: integer('revision').notNull(),
    settings: jsonb('settings').notNull().$type<unknown>(),
    profile: jsonb('profile').notNull().$type<unknown>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.storyId, t.revision] })],
);
export const campaignCommand = pgTable(
  'campaign_command',
  {
    storyId: uuid('story_id')
      .notNull()
      .references(() => story.id, { onDelete: 'cascade' }),
    operationId: uuid('operation_id').notNull(),
    request: jsonb('request').notNull().$type<unknown>(),
  },
  (t) => [primaryKey({ columns: [t.storyId, t.operationId] })],
);
export const gameOffer = pgTable(
  'game_offer',
  {
    id: uuid('id').primaryKey(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => story.id, { onDelete: 'cascade' }),
    narrativeRevision: integer('narrative_revision').notNull(),
    plans: jsonb('plans').notNull().$type<unknown>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique('game_offer_story_identity').on(t.storyId, t.id)],
);
export const gameActivity = pgTable('game_activity', {
  id: uuid('id').primaryKey(),
  storyId: uuid('story_id')
    .notNull()
    .references(() => story.id, { onDelete: 'cascade' }),
  plan: jsonb('plan').notNull().$type<unknown>(),
  state: text('state').notNull(),
  boundariesSettled: integer('boundaries_settled').notNull().default(0),
  revision: integer('revision').notNull().default(0),
  progress: jsonb('progress').notNull().$type<unknown>(),
});
export const gameActivityEvent = pgTable(
  'game_activity_event',
  {
    id: uuid('id').primaryKey(),
    ordinal: bigserial('ordinal', { mode: 'number' }).notNull(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => story.id, { onDelete: 'cascade' }),
    activityId: uuid('activity_id')
      .notNull()
      .references(() => gameActivity.id),
    activityRevision: integer('activity_revision').notNull(),
    tick: bigint('tick', { mode: 'number' }).notNull(),
    kind: text('kind').notNull(),
    causeKey: text('cause_key').notNull(),
    label: text('label').notNull(),
    summary: text('summary').notNull(),
    details: jsonb('details').notNull().default({}).$type<unknown>(),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('game_activity_event_cause').on(t.activityId, t.causeKey, t.kind),
  ],
);
export const gameActivityReport = pgTable(
  'game_activity_report',
  {
    id: uuid('id').primaryKey(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => story.id, { onDelete: 'cascade' }),
    activityId: uuid('activity_id')
      .notNull()
      .references(() => gameActivity.id),
    activityRevision: integer('activity_revision').notNull(),
    sourcePassageId: uuid('source_passage_id')
      .notNull()
      .references(() => storyPassage.id, { onDelete: 'cascade' }),
    sourceRevision: integer('source_revision').notNull(),
    sourceTick: bigint('source_tick', { mode: 'number' }).notNull(),
    label: text('label').notNull(),
    factualSummary: text('factual_summary').notNull(),
    state: text('state').notNull().default('pending'),
    generationId: uuid('generation_id')
      .unique()
      .references(() => generation.id, { onDelete: 'restrict' }),
    report: jsonb('report').$type<unknown>(),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp('published_at', {
      withTimezone: true,
      precision: 3,
    }),
  },
  (t) => [
    unique('game_activity_report_hook').on(t.activityId, t.activityRevision),
  ],
);
export const gameRoll = pgTable(
  'game_roll',
  {
    id: uuid('id').primaryKey(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => story.id, { onDelete: 'cascade' }),
    operationId: uuid('operation_id').notNull(),
    segment: integer('segment').notNull(),
    checkKey: text('check_key').notNull(),
    tick: bigint('tick', { mode: 'number' }).notNull(),
    plan: jsonb('plan').notNull().$type<unknown>(),
    result: jsonb('result').notNull().$type<unknown>(),
    effects: jsonb('effects').notNull().$type<unknown>(),
  },
  (t) => [unique('game_roll_once').on(t.operationId, t.segment, t.checkKey)],
);
export const campaignConsequence = pgTable(
  'campaign_consequence',
  {
    operationId: uuid('operation_id').primaryKey(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => story.id, { onDelete: 'cascade' }),
    passageId: uuid('passage_id').notNull(),
    baseRevision: integer('base_revision').notNull(),
    receipt: jsonb('receipt').notNull().$type<unknown>(),
    generationId: uuid('generation_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // One follow-up owns a narrative revision even if callers race before locking.
  (t) => [unique('campaign_consequence_base').on(t.storyId, t.baseRevision)],
);
export const gameActionReceipt = pgTable(
  'game_action_receipt',
  {
    operationId: uuid('operation_id').primaryKey(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => story.id, { onDelete: 'cascade' }),
    offerId: uuid('offer_id').notNull(),
    actionKey: text('action_key').notNull(),
    baseRevision: integer('base_revision').notNull(),
    offer: jsonb('offer').notNull().$type<unknown>(),
    plan: jsonb('plan').notNull().$type<unknown>(),
    label: text('label').notNull(),
    intention: text('intention').notNull(),
    outcome: text('outcome').notNull(),
    outcomeText: text('outcome_text').notNull(),
    effects: jsonb('effects').notNull().$type<unknown>(),
    declarations: jsonb('declarations').notNull().$type<unknown>(),
    roll: jsonb('roll').$type<unknown>(),
    generationId: uuid('generation_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // Consuming an offer permits exactly one receipt even across distinct commands.
  (t) => [unique('game_action_receipt_offer').on(t.storyId, t.offerId)],
);
export const gameActionExecution = pgTable(
  'game_action_execution',
  {
    operationId: uuid('operation_id').primaryKey(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => story.id, { onDelete: 'cascade' }),
    offerId: uuid('offer_id').notNull(),
    actionKey: text('action_key').notNull(),
    baseRevision: integer('base_revision').notNull(),
    offer: jsonb('offer').notNull().$type<unknown>(),
    plan: jsonb('plan').notNull().$type<unknown>(),
    startTick: bigint('start_tick', { mode: 'number' }).notNull(),
    targetTick: bigint('target_tick', { mode: 'number' }).notNull(),
    state: text('state').notNull().default('running'),
    revision: integer('revision').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    settledAt: timestamp('settled_at', { withTimezone: true, precision: 3 }),
  },
  (t) => [
    unique('game_action_execution_offer').on(t.storyId, t.offerId),
    check(
      'game_action_execution_state',
      sql`${t.state} in ('running', 'paused', 'settled')`,
    ),
    check(
      'game_action_execution_ticks',
      sql`${t.startTick} >= 0 and ${t.targetTick} > ${t.startTick}`,
    ),
  ],
);
export const gameActionExecutionEvent = pgTable(
  'game_action_execution_event',
  {
    id: uuid('id').primaryKey(),
    ordinal: bigserial('ordinal', { mode: 'number' }).notNull(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => story.id, { onDelete: 'cascade' }),
    executionId: uuid('execution_id')
      .notNull()
      .references(() => gameActionExecution.operationId),
    executionRevision: integer('execution_revision').notNull(),
    tick: bigint('tick', { mode: 'number' }).notNull(),
    kind: text('kind').notNull(),
    label: text('label').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('game_action_execution_event_revision').on(
      t.executionId,
      t.executionRevision,
    ),
    check(
      'game_action_execution_event_kind',
      sql`${t.kind} in ('started', 'paused', 'resumed', 'pace-changed', 'settled')`,
    ),
  ],
);
export const storytellerPreset = pgTable('storyteller_preset', {
  id: uuid('id').primaryKey(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  creative: jsonb('creative').notNull().$type<unknown>(),
  profile: jsonb('profile').notNull().$type<unknown>(),
});
