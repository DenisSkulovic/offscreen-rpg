import { pgTable, uuid, integer, jsonb, text, bigint, timestamp, primaryKey, unique } from 'drizzle-orm/pg-core';
import { story } from './stories';
import { user } from './auth';

export const campaign = pgTable('campaign', {
  storyId: uuid('story_id').primaryKey().references(() => story.id, { onDelete: 'cascade' }),
  settingsRevision: integer('settings_revision').notNull(),
  locked: integer('locked').notNull().default(0),
  character: jsonb('character').$type<unknown>(),
  content: jsonb('content').$type<unknown>(),
  location: text('location'),
  tick: bigint('tick', { mode: 'number' }).notNull(),
  offer: jsonb('offer').$type<unknown>(),
  activeActivityId: uuid('active_activity_id'),
});
export const campaignSettings = pgTable('campaign_settings', {
  storyId: uuid('story_id').notNull().references(() => story.id, { onDelete: 'cascade' }),
  revision: integer('revision').notNull(),
  settings: jsonb('settings').notNull().$type<unknown>(),
  profile: jsonb('profile').notNull().$type<unknown>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.storyId, t.revision] })]);
export const campaignCommand = pgTable('campaign_command', {
  storyId: uuid('story_id').notNull().references(() => story.id, { onDelete: 'cascade' }),
  operationId: uuid('operation_id').notNull(),
  request: jsonb('request').notNull().$type<unknown>(),
}, (t) => [primaryKey({ columns: [t.storyId, t.operationId] })]);
export const gameActivity = pgTable('game_activity', {
  id: uuid('id').primaryKey(),
  storyId: uuid('story_id').notNull().references(() => story.id, { onDelete: 'cascade' }),
  plan: jsonb('plan').notNull().$type<unknown>(),
  state: text('state').notNull(),
  completed: integer('completed').notNull().default(0),
  revision: integer('revision').notNull().default(0),
  progress: jsonb('progress').notNull().$type<unknown>(),
  anchorAt: timestamp('anchor_at', { withTimezone: true, precision: 3 }).notNull(),
  pace: jsonb('pace').notNull().$type<unknown>(),
});
export const gameRoll = pgTable('game_roll', {
  id: uuid('id').primaryKey(),
  storyId: uuid('story_id').notNull().references(() => story.id, { onDelete: 'cascade' }),
  operationId: uuid('operation_id').notNull(),
  segment: integer('segment').notNull(),
  checkKey: text('check_key').notNull(),
  tick: bigint('tick', { mode: 'number' }).notNull(),
  plan: jsonb('plan').notNull().$type<unknown>(),
  result: jsonb('result').notNull().$type<unknown>(),
  effects: jsonb('effects').notNull().$type<unknown>(),
}, (t) => [unique('game_roll_once').on(t.operationId, t.segment, t.checkKey)]);
export const storytellerPreset = pgTable('storyteller_preset', {
  id: uuid('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  creative: jsonb('creative').notNull().$type<unknown>(),
  profile: jsonb('profile').notNull().$type<unknown>(),
});
