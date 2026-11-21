import { and, eq, inArray } from 'drizzle-orm';
import { outbox } from '@offscreen/db/outbox-schema';
import { generation } from '@offscreen/db/generation-schema';
import type { Transaction } from '@offscreen/db/outbox';
import {
  storytellerTopic,
  storytellerDistributedTopic,
} from '@offscreen/contracts/storyteller-notices';
import { storytellerContextCaptureKind } from '@offscreen/contracts/storyteller-kinds';

const storytellerNoticeTopics = [
  storytellerTopic,
  storytellerDistributedTopic,
] as const;

export async function readFrozenStorytellerNoticeTopic(
  tx: Transaction,
  operationId: string,
): Promise<
  typeof storytellerTopic | typeof storytellerDistributedTopic | null
> {
  const rows = await tx
    .select({ topic: outbox.topic })
    .from(outbox)
    .where(
      and(
        eq(outbox.operationId, operationId),
        inArray(outbox.topic, [...storytellerNoticeTopics]),
      ),
    );
  const distinct = [...new Set(rows.map((row) => row.topic))];
  if (distinct.length === 0) {
    return null;
  }
  if (distinct.length === 1) {
    const topic = distinct[0];
    if (topic === storytellerTopic || topic === storytellerDistributedTopic) {
      return topic;
    }
  }
  throw new Error(
    `Storyteller notice topic history is inconsistent for operation ${operationId}`,
  );
}

export async function storytellerNoticeTopicForWake(
  tx: Transaction,
  operationId: string,
): Promise<typeof storytellerTopic | typeof storytellerDistributedTopic> {
  const frozen = await readFrozenStorytellerNoticeTopic(tx, operationId);
  if (frozen === null) {
    throw new Error(
      `Missing frozen Storyteller notice topic for operation ${operationId}`,
    );
  }
  return frozen;
}

/** True when generation G is still the provisional capture kind. */
export async function isProvisionalContextCapture(
  tx: Transaction,
  generationId: string,
) {
  const [row] = await tx
    .select({ kind: generation.kind })
    .from(generation)
    .where(eq(generation.id, generationId));
  return row?.kind === storytellerContextCaptureKind;
}
