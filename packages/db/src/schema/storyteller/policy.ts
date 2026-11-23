import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  check,
  uniqueIndex,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { user } from '../auth';
import { storytellerFunding, storytellerRun } from './funding';

export const storytellerCurrentPlatformPolicy = pgTable(
  'storyteller_current_platform_policy',
  {
    id: uuid('id').primaryKey(),
    revision: integer('revision').notNull(),
    profile: jsonb('profile').notNull().$type<unknown>(),
    routeMap: jsonb('route_map').notNull().$type<unknown>(),
    enabled: boolean('enabled').notNull().default(false),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      'storyteller_current_platform_policy_revision',
      sql`${t.revision} > 0`,
    ),
    check(
      'storyteller_current_platform_policy_profile_schema',
      sql`jsonb_typeof(${t.profile}) = 'object'
        AND ${t.profile} ? 'schemaVersion'
        AND ${t.profile}->>'schemaVersion' = '1'
        AND ${t.profile} ? 'revision'
        AND (${t.profile}->>'revision')::integer = ${t.revision}`,
    ),
    check(
      'storyteller_current_platform_policy_route_map_schema',
      sql`jsonb_typeof(${t.routeMap}) = 'object'
        AND ${t.routeMap} ? 'schemaVersion'
        AND ${t.routeMap}->>'schemaVersion' = '1'
        AND ${t.routeMap} ? 'revision'
        AND (${t.routeMap}->>'revision')::integer = ${t.revision}
        AND ${t.routeMap} ? 'routes'
        AND jsonb_typeof(${t.routeMap}->'routes') = 'array'
        AND jsonb_array_length(${t.routeMap}->'routes') > 0`,
    ),
    uniqueIndex('storyteller_current_platform_policy_one_enabled')
      .on(t.enabled)
      .where(sql`${t.enabled} = true`),
  ],
);

/** OBS00-B: scoped owner grant; disabled-by-default with explicit revocation/expiry. */
export const storytellerCurrentOwnerGrant = pgTable(
  'storyteller_current_owner_grant',
  {
    id: uuid('id').primaryKey(),
    revision: integer('revision').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => storytellerFunding.id, { onDelete: 'restrict' }),
    runId: uuid('run_id').notNull(),
    entitlementProfile: jsonb('entitlement_profile').notNull().$type<unknown>(),
    restrictions: jsonb('restrictions').notNull().default([]).$type<unknown>(),
    enabled: boolean('enabled').notNull().default(false),
    revokedAt: timestamp('revoked_at', { withTimezone: true, precision: 3 }),
    noExpiry: boolean('no_expiry').notNull().default(false),
    expiresAt: timestamp('expires_at', { withTimezone: true, precision: 3 }),
    requestedRoute: text('requested_route').notNull(),
    requestedFundingMode: text('requested_funding_mode').notNull(),
    operatorId: text('operator_id').notNull(),
    approvalIdentity: text('approval_identity').notNull(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      name: 'storyteller_current_owner_grant_run_account_fk',
      columns: [t.runId, t.accountId],
      foreignColumns: [storytellerRun.id, storytellerRun.accountId],
    }).onDelete('restrict'),
    check('storyteller_current_owner_grant_revision', sql`${t.revision} > 0`),
    check(
      'storyteller_current_owner_grant_entitlement_schema',
      sql`jsonb_typeof(${t.entitlementProfile}) = 'object'
        AND ${t.entitlementProfile} ? 'schemaVersion'
        AND ${t.entitlementProfile}->>'schemaVersion' = '1'
        AND ${t.entitlementProfile} ? 'revision'
        AND (${t.entitlementProfile}->>'revision')::integer = ${t.revision}`,
    ),
    check(
      'storyteller_current_owner_grant_restrictions_array',
      sql`jsonb_typeof(${t.restrictions}) = 'array'`,
    ),
    check(
      'storyteller_current_owner_grant_revoked',
      sql`(${t.revokedAt} IS NULL) OR (${t.enabled} = false)`,
    ),
    check(
      'storyteller_current_owner_grant_expiry',
      sql`(${t.noExpiry} = true AND ${t.expiresAt} IS NULL)
        OR (${t.noExpiry} = false AND ${t.expiresAt} IS NOT NULL)`,
    ),
    check(
      'storyteller_current_owner_grant_requested_route',
      sql`${t.requestedRoute} ~ '^[a-z0-9][a-z0-9._:-]{0,99}$'`,
    ),
    check(
      'storyteller_current_owner_grant_requested_funding',
      sql`${t.requestedFundingMode} IN ('sponsored','prepaid','on-demand')`,
    ),
  ],
);
