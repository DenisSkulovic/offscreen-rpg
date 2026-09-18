import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  bigint,
  integer,
  boolean,
  timestamp,
  jsonb,
  check,
  unique,
} from 'drizzle-orm/pg-core';
import { generation } from './generations';

export const storytellerPublication = pgTable(
  'storyteller_publication',
  {
    generationId: uuid('generation_id')
      .primaryKey()
      .references(() => generation.id, { onDelete: 'restrict' }),
    state: text('state')
      .notNull()
      .default('pending')
      .$type<'pending' | 'published' | 'stale' | 'blocked'>(),
    failureCode: text('failure_code'),
  },
  (t) => [
    check(
      'storyteller_publication_state',
      sql`${t.state} IN ('pending','published','stale','blocked')`,
    ),
  ],
);

export const storytellerFunding = pgTable(
  'storyteller_funding',
  {
    id: uuid('id').primaryKey(),
    limitMicrousd: bigint('limit_microusd', { mode: 'bigint' }).notNull(),
    settledMicrousd: bigint('settled_microusd', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    reservedMicrousd: bigint('reserved_microusd', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    stopped: boolean('stopped').notNull().default(true),
    verifiedAt: timestamp('verified_at', {
      withTimezone: true,
      precision: 3,
    }).notNull(),
  },
  (t) => [
    check(
      'storyteller_funding_nonnegative',
      sql`${t.limitMicrousd} >= 0 AND ${t.settledMicrousd} >= 0 AND ${t.reservedMicrousd} >= 0`,
    ),
  ],
);

export const storytellerRun = pgTable(
  'storyteller_run',
  {
    id: uuid('id').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => storytellerFunding.id, { onDelete: 'restrict' }),
    limitMicrousd: bigint('limit_microusd', { mode: 'bigint' }).notNull(),
    settledMicrousd: bigint('settled_microusd', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    reservedMicrousd: bigint('reserved_microusd', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    maxAttempts: integer('max_attempts').notNull(),
    admittedAttempts: integer('admitted_attempts').notNull().default(0),
    enabled: boolean('enabled').notNull().default(false),
  },
  (t) => [
    check(
      'storyteller_run_bounds',
      sql`${t.limitMicrousd} >= 0 AND ${t.settledMicrousd} >= 0 AND ${t.reservedMicrousd} >= 0 AND ${t.maxAttempts} > 0 AND ${t.admittedAttempts} BETWEEN 0 AND ${t.maxAttempts}`,
    ),
  ],
);

export const storytellerAttempt = pgTable(
  'storyteller_attempt',
  {
    id: uuid('id').primaryKey(),
    generationId: uuid('generation_id')
      .notNull()
      .references(() => generation.id, { onDelete: 'restrict' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => storytellerFunding.id, { onDelete: 'restrict' }),
    runId: uuid('run_id')
      .notNull()
      .references(() => storytellerRun.id, { onDelete: 'restrict' }),
    state: text('state')
      .notNull()
      .$type<'reserved' | 'dispatched' | 'settled' | 'uncertain' | 'unsent'>(),
    reservedMicrousd: bigint('reserved_microusd', { mode: 'bigint' }).notNull(),
    chargedMicrousd: bigint('charged_microusd', { mode: 'bigint' }),
    policy: jsonb('policy').notNull().$type<unknown>(),
    providerId: text('provider_id'),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      'storyteller_attempt_state',
      sql`${t.state} IN ('reserved','dispatched','settled','uncertain','unsent')`,
    ),
    check(
      'storyteller_attempt_settlement',
      sql`(${t.state} IN ('settled','unsent')) = (${t.chargedMicrousd} IS NOT NULL)`,
    ),
    check(
      'storyteller_attempt_amounts',
      sql`${t.reservedMicrousd} >= 0 AND (${t.chargedMicrousd} IS NULL OR ${t.chargedMicrousd} >= 0)`,
    ),
  ],
);

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
