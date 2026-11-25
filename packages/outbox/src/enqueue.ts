import { eq } from 'drizzle-orm';
import type { Transaction } from '@offscreen/db';
import { outbox } from './schema';

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