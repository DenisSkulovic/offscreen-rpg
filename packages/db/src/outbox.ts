import { eq } from 'drizzle-orm';
import type { Database } from './database';
import { outbox } from './schema/outbox';

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
  ) {
    throw new Error('Outbox identity conflict');
  }
}
