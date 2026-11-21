import { z } from 'zod';
import { eq } from 'drizzle-orm';
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
import {
  storytellerTopic,
  storytellerDistributedTopic,
} from '@offscreen/contracts/storyteller-notices';

export { storytellerKind } from '@offscreen/contracts/storyteller-kinds';
export { storytellerTopic, storytellerDistributedTopic };
export {
  readFrozenStorytellerNoticeTopic,
  storytellerNoticeTopicForWake,
} from '../campaign/storyteller-wake';

/** Runtime flag at task admission only. Relay must read the persisted notice topic. */
export function selectStorytellerNoticeTopicAtAdmission(
  env: NodeJS.ProcessEnv = process.env,
): typeof storytellerTopic | typeof storytellerDistributedTopic {
  return env['STORYTELLER_DISTRIBUTED_V1'] === 'true'
    ? storytellerDistributedTopic
    : storytellerTopic;
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
