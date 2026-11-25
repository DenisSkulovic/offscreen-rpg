import { eq } from 'drizzle-orm';
import { storytellerPublication } from '@offscreen/story-persistence/storyteller';
import type { Transaction } from '@offscreen/db/outbox';
import {
  storytellerTaskSchema,
  storytellerOutputSchema,
} from '@offscreen/storyteller/tasks';
import { createGenerations } from '../generations/index';
import type { Database } from '@offscreen/db';
import { recordExecutionStage } from './execution-stages';
import { storytellerKind } from '../generations/storyteller-kinds';
import {
  storytellerTopic,
  storytellerDistributedTopic,
} from '../generations/storyteller-notices';

export {
  selectStorytellerNoticeTopicAtAdmission,
  insertStorytellerTask,
} from '../stories/storyteller-task-record';

export { storytellerKind } from '../generations/storyteller-kinds';
export { storytellerTopic, storytellerDistributedTopic };
export {
  readFrozenStorytellerNoticeTopic,
  storytellerNoticeTopicForWake,
} from '../campaign/storyteller-wake';

export function storytellerGenerations(database: Database) {
  return createGenerations(database, {
    kind: storytellerKind,
    input: storytellerTaskSchema,
    output: storytellerOutputSchema,
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
