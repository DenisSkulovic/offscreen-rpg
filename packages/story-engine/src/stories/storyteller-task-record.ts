import { z } from 'zod';
import { generation } from '@offscreen/story-persistence/generations';
import { storytellerPublication } from '@offscreen/story-persistence/storyteller';
import type { Transaction } from '@offscreen/db';
import { enqueue } from '@offscreen/outbox/enqueue';
import {
  storytellerTaskSchema,
  type StorytellerTask,
} from '@offscreen/storyteller/tasks';
import { storytellerKind } from '../generations/storyteller-kinds';
import {
  storytellerTopic,
  storytellerDistributedTopic,
} from '../generations/storyteller-notices';

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
