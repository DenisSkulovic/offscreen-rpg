/**
 * AD01 Admin staff principal / session / inert assignment / audit tables.
 * Better Auth user/session remain player identity only; never role stores.
 */
import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  uuid,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { user, session } from './auth';

export const adminStaffPrincipal = pgTable(
  'admin_staff_principal',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    authUserId: text('auth_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    status: text('status').notNull().default('active').$type<'active' | 'suspended'>(),
    accessEpoch: integer('access_epoch').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('admin_staff_principal_auth_user').on(t.authUserId),
    check(
      'admin_staff_principal_status',
      sql`${t.status} IN ('active','suspended')`,
    ),
    check('admin_staff_principal_epoch', sql`${t.accessEpoch} >= 1`),
  ],
);

export const adminStaffSession = pgTable(
  'admin_staff_session',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    staffPrincipalId: uuid('staff_principal_id')
      .notNull()
      .references(() => adminStaffPrincipal.id, { onDelete: 'restrict' }),
    authSessionId: text('auth_session_id')
      .notNull()
      .references(() => session.id, { onDelete: 'cascade' }),
    tokenDigest: text('token_digest').notNull(),
    purpose: text('purpose').notNull().default('admin').$type<'admin'>(),
    accessEpochAtIssue: integer('access_epoch_at_issue').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, precision: 3 }).notNull(),
    idleExpiresAt: timestamp('idle_expires_at', {
      withTimezone: true,
      precision: 3,
    }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true, precision: 3 }),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('admin_staff_session_token_digest').on(t.tokenDigest),
    index('admin_staff_session_staff').on(t.staffPrincipalId),
    index('admin_staff_session_auth').on(t.authSessionId),
    check('admin_staff_session_purpose', sql`${t.purpose} = 'admin'`),
    check(
      'admin_staff_session_token_digest_sha',
      sql`${t.tokenDigest} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
);

/** Inert until AD02 evaluator/guard; AD01 bootstrap may insert a named package only. */
export const adminCapabilityAssignment = pgTable(
  'admin_capability_assignment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    staffPrincipalId: uuid('staff_principal_id')
      .notNull()
      .references(() => adminStaffPrincipal.id, { onDelete: 'restrict' }),
    packageId: text('package_id').notNull(),
    packageVersion: integer('package_version').notNull(),
    status: text('status')
      .notNull()
      .default('inert')
      .$type<'inert' | 'active' | 'revoked'>(),
    scope: jsonb('scope').notNull().default({}).$type<unknown>(),
    provenance: jsonb('provenance').notNull().$type<unknown>(),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true, precision: 3 }),
  },
  (t) => [
    index('admin_capability_assignment_staff').on(t.staffPrincipalId),
    check(
      'admin_capability_assignment_status',
      sql`${t.status} IN ('inert','active','revoked')`,
    ),
    check(
      'admin_capability_assignment_version',
      sql`${t.packageVersion} >= 1`,
    ),
  ],
);

export const adminAuditEvent = pgTable(
  'admin_audit_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: text('kind').notNull(),
    staffPrincipalId: uuid('staff_principal_id').references(
      () => adminStaffPrincipal.id,
      { onDelete: 'restrict' },
    ),
    authUserId: text('auth_user_id'),
    payload: jsonb('payload').notNull().default({}).$type<unknown>(),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('admin_audit_event_created').on(t.createdAt),
    index('admin_audit_event_staff').on(t.staffPrincipalId),
  ],
);
