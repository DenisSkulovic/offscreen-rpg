import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

export type TerminalPairingState =
  'pending' | 'approved' | 'consumed' | 'denied';

export const terminalDevicePairing = pgTable(
  'terminal_device_pairing',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    codeHash: text('code_hash').notNull(),
    challengeSha256: text('challenge_sha256').notNull(),
    sourceIpHash: text('source_ip_hash').notNull(),
    clientLabel: text('client_label').notNull(),
    state: text('state')
      .notNull()
      .default('pending')
      .$type<TerminalPairingState>(),
    ownerId: text('owner_id').references(() => user.id, {
      onDelete: 'cascade',
    }),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      precision: 3,
    }).notNull(),
    approvedAt: timestamp('approved_at', { withTimezone: true, precision: 3 }),
    consumedAt: timestamp('consumed_at', { withTimezone: true, precision: 3 }),
  },
  (t) => [
    uniqueIndex('terminal_device_pairing_code_hash_key').on(t.codeHash),
    index('terminal_device_pairing_source_ip_created_idx').on(
      t.sourceIpHash,
      t.createdAt,
    ),
    index('terminal_device_pairing_challenge_sha256_idx').on(t.challengeSha256),
    check(
      'terminal_device_pairing_code_hash',
      sql`${t.codeHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'terminal_device_pairing_challenge_sha256',
      sql`${t.challengeSha256} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'terminal_device_pairing_source_ip_hash',
      sql`${t.sourceIpHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'terminal_device_pairing_client_label',
      sql`char_length(${t.clientLabel}) BETWEEN 1 AND 64`,
    ),
    check(
      'terminal_device_pairing_state',
      sql`${t.state} IN ('pending','approved','consumed','denied')`,
    ),
    check(
      'terminal_device_pairing_approved_owner',
      sql`(${t.state} IN ('approved','consumed') AND ${t.ownerId} IS NOT NULL AND ${t.approvedAt} IS NOT NULL) OR (${t.state} NOT IN ('approved','consumed'))`,
    ),
    check(
      'terminal_device_pairing_consumed_at',
      sql`(${t.state} = 'consumed' AND ${t.consumedAt} IS NOT NULL) OR (${t.state} <> 'consumed' AND ${t.consumedAt} IS NULL)`,
    ),
  ],
);

export const terminalAccessToken = pgTable(
  'terminal_access_token',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenHash: text('token_hash').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    scope: text('scope').notNull().$type<'player-story'>(),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      precision: 3,
    }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true, precision: 3 }),
  },
  (t) => [
    uniqueIndex('terminal_access_token_token_hash_key').on(t.tokenHash),
    check(
      'terminal_access_token_token_hash',
      sql`${t.tokenHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check('terminal_access_token_scope', sql`${t.scope} = 'player-story'`),
  ],
);
