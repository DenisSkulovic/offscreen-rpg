import { z } from 'zod';
import { and, eq, inArray } from 'drizzle-orm';
import { outbox } from '@offscreen/db/outbox-schema';
import { generation } from '@offscreen/db/generation-schema';
import { storytellerPublication } from '@offscreen/db/storyteller-schema';
import type { Transaction } from '@offscreen/db/outbox';
import { enqueue } from '@offscreen/db/outbox';
import {
  storytellerTaskSchema,
  storytellerOutputSchema,
  type StorytellerTask,
} from '@offscreen/storyteller/tasks';
import { createGenerations } from '../generations/index';
import type { Database } from '@offscreen/db';
import { recordExecutionStage } from './execution-stages';
import { storytellerKind } from '@offscreen/contracts/storyteller-kinds';

export { storytellerKind } from '@offscreen/contracts/storyteller-kinds';
/** Legacy monolith workflow selector; frozen on each durable notice at admission. */
export const storytellerTopic = 'storyteller.profiled.v1';
/** Versioned distributed workflow selector; frozen on each durable notice at admission. */
export const storytellerDistributedTopic = 'storyteller.distributed.v1';

/** Runtime flag at task admission only. Relay must read the persisted notice topic. */
export function selectStorytellerNoticeTopicAtAdmission(
  env: NodeJS.ProcessEnv = process.env,
): typeof storytellerTopic | typeof storytellerDistributedTopic {
  return env['STORYTELLER_DISTRIBUTED_V1'] === 'true'
    ? storytellerDistributedTopic
    : storytellerTopic;
}

const storytellerNoticeTopics = [
  storytellerTopic,
  storytellerDistributedTopic,
] as const;

export async function readFrozenStorytellerNoticeTopic(
  tx: Transaction,
  operationId: string,
): Promise<typeof storytellerTopic | typeof storytellerDistributedTopic | null> {
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
  if (distinct.length === 0) return null;
  if (distinct.length === 1) {
    const topic = distinct[0]!;
    if (
      topic === storytellerTopic ||
      topic === storytellerDistributedTopic
    ) {
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

export function storytellerGenerations(database: Database) {
  return createGenerations(database, {
    kind: storytellerKind,
    input: storytellerTaskSchema,
    output: storytellerOutputSchema,
  });
}
export async function insertStorytellerTask(
  tx: Transaction,
  input: {
    id: string;
    ownerId: string;
    task: StorytellerTask;
  },
) {
  const task = storytellerTaskSchema.parse(input.task);
  await tx.insert(generation).values({
    id: z.uuid().parse(input.id),
    ownerId: input.ownerId,
    kind: storytellerKind,
    input: task,
  });
  await tx.insert(storytellerPublication).values({ generationId: input.id });
  await enqueue(tx, {
    id: input.id,
    operationId: input.id,
    topic: selectStorytellerNoticeTopicAtAdmission(),
  });
}
export async function setPublication(
  tx: Transaction,
  generationId: string,
  state: 'published' | 'stale' | 'blocked',
  failureCode: string | null = null,
) {
  await tx
    .update(storytellerPublication)
    .set({ state, failureCode })
    .where(eq(storytellerPublication.generationId, generationId));
  await recordExecutionStage(tx, {
    generationId,
    stage: 'publication-decided',
    outcome:
      state === 'published'
        ? 'completed'
        : state === 'stale'
          ? 'stale'
          : 'failed',
    idempotencyKey: `publication:${state}`,
    sourceKind: 'publication',
    sourceId: generationId,
    failureClass: failureCode,
  });
}
