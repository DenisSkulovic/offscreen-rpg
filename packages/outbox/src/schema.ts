import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  check,
} from 'drizzle-orm/pg-core';

// A notice carries a compact operation reference, never prompts or user content.
export const outbox = pgTable(
  'outbox',
  {
    id: uuid('id').primaryKey(),
    topic: text('topic').notNull(),
    operationId: uuid('operation_id').notNull(),
    availableAt: timestamp('available_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    leaseId: uuid('lease_id'),
    deliveredAt: timestamp('delivered_at', {
      withTimezone: true,
      precision: 3,
    }),
  },
  (t) => [
    index('outbox_pending')
      .on(t.availableAt, t.id)
      .where(sql`${t.deliveredAt} IS NULL`),
    check(
      'outbox_delivered_shape',
      sql`${t.deliveredAt} IS NULL OR ${t.leaseId} IS NULL`,
    ),
  ],
);
