import { randomUUID } from 'node:crypto';
import { and, eq, isNull, lte, sql, inArray } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { outbox } from '@offscreen/db/outbox-schema';

export type Transaction = Parameters<
  Parameters<Database['db']['transaction']>[0]
>[0];
export type Notice = {
  id: string;
  topic: string;
  operationId: string;
  leaseId: string;
};

export async function enqueue(
  tx: Transaction,
  notice: Omit<Notice, 'leaseId'>,
) {
  await tx.insert(outbox).values(notice).onConflictDoNothing();
  const [existing] = await tx
    .select()
    .from(outbox)
    .where(eq(outbox.id, notice.id));
  if (
    existing?.topic !== notice.topic ||
    existing.operationId !== notice.operationId
  )
    throw new Error('Outbox identity conflict');
}

/** Short leases protect delivery attempts, not execution of the referenced work. */
export function createOutbox(database: Database) {
  return {
    async claim(topics: readonly string[]): Promise<Notice | null> {
      if (!topics.length) return null;
      return database.db.transaction(async (tx) => {
        const [row] = await tx
          .select()
          .from(outbox)
          .where(
            and(
              inArray(outbox.topic, [...topics]),
              isNull(outbox.deliveredAt),
              lte(outbox.availableAt, sql`clock_timestamp()`),
            ),
          )
          .orderBy(outbox.availableAt, outbox.id)
          .limit(1)
          .for('update', { skipLocked: true });
        if (!row) return null;
        const leaseId = randomUUID();
        await tx
          .update(outbox)
          .set({
            leaseId,
            availableAt: sql`clock_timestamp() + interval '30 seconds'`,
          })
          .where(eq(outbox.id, row.id));
        return {
          id: row.id,
          topic: row.topic,
          operationId: row.operationId,
          leaseId,
        };
      });
    },
    async acknowledge(notice: Notice) {
      await database.db
        .update(outbox)
        .set({ deliveredAt: sql`clock_timestamp()`, leaseId: null })
        .where(
          and(
            eq(outbox.id, notice.id),
            eq(outbox.leaseId, notice.leaseId),
            isNull(outbox.deliveredAt),
          ),
        );
    },
  };
}
