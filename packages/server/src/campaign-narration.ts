import { randomUUID } from 'node:crypto';
import { and, eq, gt, lte } from 'drizzle-orm';
import { campaign, gameRoll } from '@offscreen/db/campaign-schema';
import { storyResolution } from '@offscreen/db/story-schema';
import { characterSchema, offerSchema } from '@offscreen/contracts/campaign';
import { prepareStorytellerTask } from '@offscreen/ai/storyteller-tasks';
import { storytellerProfileSchema } from '@offscreen/ai/storytellers';
import { executionPolicySchema } from '@offscreen/ai/storyteller-policy';
import { contextInputSchema } from '@offscreen/ai/storyteller-context';
import type { Transaction } from './outbox';
import type { StoryRecord } from './story-persistence';
import { loadStorytellerContext } from './storyteller-context';
import { insertStorytellerTask } from './storyteller-records';

/** Admits narration of immutable receipts, never another attempt at the action. */
export async function admitConsequenceNarration(tx: Transaction, current: StoryRecord, receipt: {
  passageId: string; operationId: string; afterSegment: number; throughSegment: number; label: string; intention: string;
}) {
  const [state] = await tx.select().from(campaign).where(eq(campaign.storyId, current.id));
  if (!state) {
    throw new Error('Missing consequence state');
  }
  const rolls = await tx.select().from(gameRoll).where(and(
    eq(gameRoll.storyId, current.id), eq(gameRoll.operationId, receipt.operationId),
    gt(gameRoll.segment, receipt.afterSegment), lte(gameRoll.segment, receipt.throughSegment),
  )).orderBy(gameRoll.segment, gameRoll.checkKey);
  const context = await loadStorytellerContext(tx, {
    storyId: current.id, revision: current.revision, premise: current.premise,
    notes: current.continuityNotes,
    selected: { id: receipt.operationId, label: receipt.label, intention: receipt.intention },
  });
  const task = prepareStorytellerTask({
    task: 'consequence',
    source: { storyId: current.id, narrativeRevision: current.revision, passageId: receipt.passageId },
    profile: storytellerProfileSchema.parse(current.storyteller),
    execution: executionPolicySchema.parse(current.execution),
    context: contextInputSchema.parse({ ...context, resolution: {
      character: characterSchema.parse(state.character), tick: state.tick,
      offer: offerSchema.parse(state.offer),
      receipts: rolls.map((roll) => ({ id: roll.id, roll: roll.result, effects: roll.effects })),
    } }),
  });
  const id = randomUUID();
  await insertStorytellerTask(tx, { id, ownerId: current.ownerId, task });
  await tx.insert(storyResolution).values({
    generationId: id, storyId: current.id, basePassageId: receipt.passageId,
    baseRevision: current.revision, operationId: id,
    submission: { kind: 'committed-consequence', operationId: receipt.operationId },
  });
}
