import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { generation } from '@offscreen/db/generation-schema';
import { storytellerPublication } from '@offscreen/db/storyteller-schema';
import type { Transaction } from './outbox';
import { enqueue } from './outbox';
import {
  storytellerTaskSchema,
  storytellerResultSchema,
  type StorytellerTask,
} from '@offscreen/storyteller/tasks';
import { createGenerations } from './generations';
import type { Database } from '@offscreen/db';

export const storytellerKind = 'storyteller.profiled.v1';
export const storytellerTopic = 'storyteller.profiled.v1';

export function storytellerGenerations(database: Database) {
  return createGenerations(database, {
    kind: storytellerKind,
    input: storytellerTaskSchema,
    output: storytellerResultSchema,
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
    topic: storytellerTopic,
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
}
