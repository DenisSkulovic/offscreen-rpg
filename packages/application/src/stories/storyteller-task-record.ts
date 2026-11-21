import { z } from 'zod';
import { generation } from '@offscreen/db/generation-schema';
import { storytellerPublication } from '@offscreen/db/storyteller-schema';
import type { Transaction } from '@offscreen/db/outbox';
import { enqueue } from '@offscreen/db/outbox';
import {
  storytellerTaskSchema,
  type StorytellerTask,
} from '@offscreen/storyteller/tasks';
import { storytellerKind } from '@offscreen/contracts/storyteller-kinds';
import {
  storytellerTopic,
  storytellerDistributedTopic,
} from '@offscreen/contracts/storyteller-notices';

/** Runtime flag at task admission only. Relay must read the persisted notice topic. */
export function selectStorytellerNoticeTopicAtAdmission(
  env: NodeJS.ProcessEnv = process.env,
): typeof storytellerTopic | typeof storytellerDistributedTopic {
  return env['STORYTELLER_DISTRIBUTED_V1'] === 'true'
    ? storytellerDistributedTopic
    : storytellerTopic;
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
