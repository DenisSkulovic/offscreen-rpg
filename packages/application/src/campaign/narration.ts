/**
 * Committed consequence admission, receipt-gated preparation and hold transfer
 * after mechanical settlement. Must not own generic Storyteller runtime; see
 * ../storyteller/runtime.ts and ./action-executions.ts for boundary timing.
 */
import { randomUUID } from 'node:crypto';
import { and, eq, gt, lte } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '@offscreen/db';
import {
  campaign,
  campaignConsequence,
  gameActionExecution,
  gameActionReceipt,
  gameRoll,
} from '@offscreen/db/campaign-schema';
import { storyPassage, storyResolution } from '@offscreen/db/story-schema';
import { offerSchema } from '@offscreen/game/offers';
import { characterSchema, storyFactsSchema } from '@offscreen/game/state';
import { storytellerProfileSchema } from '@offscreen/storyteller/profiles';
import { executionPolicySchema } from '@offscreen/storyteller/tasks';
import { contextInputSchema } from '@offscreen/storyteller/context';
import type { Transaction } from '../outbox/index';
import type { StoryRecord } from '../stories/persistence';
import {
  incrementStoryViewVersion,
  lockStoryById,
  readDatabaseClockMs,
} from '../stories/persistence';
import {
  canonicalContextDependencies,
  canonicalRuleEvidence,
  loadStorytellerContext,
} from '../storyteller/context';
import { insertStorytellerTask } from '../storyteller/records';
import { enqueue } from '../outbox/index';
import { outcomeEffectsSchema } from '@offscreen/game/effects';
import { rollSchema } from '@offscreen/game/checks';
import { storyFactDeclarationsSchema } from '@offscreen/game/immediate-actions';
import type { PendingImmediateActionResolution } from './action-overlap';
import { effectiveUsagePolicySchema } from '@offscreen/contracts/usage-policy';
import { prepareAdmittedStorytellerTask } from '../storyteller/task-admission';
import {
  transitionStorytellerIntentToGeneration,
  transitionWorldObligationHoldToGeneration,
} from './holds';

import { campaignConsequenceTopic } from './topics';
import type { DocumentStore } from '@offscreen/documents';

export { campaignConsequenceTopic } from './topics';

/**
 * Admits private narration from a frozen result. It deliberately acquires no
 * campaign hold: the finite execution still owns time until settlement.
 */
export async function preparePendingActionNarration(
  tx: Transaction,
  current: StoryRecord,
  input: {
    executionId: string;
    targetGameSecond: number;
    offer: unknown;
    label: string;
    intention: string;
    pending: PendingImmediateActionResolution;
  },
  documentStore?: DocumentStore,
) {
  const [passage] = await tx
    .select({ id: storyPassage.id })
    .from(storyPassage)
    .where(
      and(
        eq(storyPassage.storyId, current.id),
        eq(storyPassage.sequence, current.revision),
      ),
    );
  if (!passage) throw new Error('Missing pending action passage');
  const context = await loadStorytellerContext(tx, {
    storyId: current.id,
    revision: current.revision,
    premise: current.premise,
    notes: current.continuityNotes,
    activeSceneScope: current.activeSceneScope,
    selected: {
      id: input.executionId,
      label: input.label,
      intention: input.intention,
    },
    projectGameSecond: input.targetGameSecond,
    ...canonicalContextDependencies(
      current,
      documentStore,
      canonicalRuleEvidence(
        input.pending.resolution.roll ? ['time', 'ability-check'] : ['time'],
      ),
    ),
  });
  const task = prepareAdmittedStorytellerTask(
    {
      task: 'pending-consequence',
      source: {
        storyId: current.id,
        narrativeRevision: current.revision,
        passageId: passage.id,
        executionId: input.executionId,
        targetGameSecond: input.targetGameSecond,
        projectedStateDigest: input.pending.projectedStateDigest,
      },
      profile: storytellerProfileSchema.parse(current.storyteller),
      execution: executionPolicySchema.parse(current.execution),
      context: contextInputSchema.parse({
        ...context,
        resolution: {
          character: input.pending.resolution.character,
          storyFacts: input.pending.resolution.storyFacts,
          gameSecond: input.targetGameSecond,
          offer: offerSchema.parse(input.offer),
          receipts: [
            {
              id: input.executionId,
              outcome: input.pending.resolution.outcome,
              text: input.pending.resolution.text,
              roll: input.pending.resolution.roll,
              effects: input.pending.resolution.effects,
              declarations: input.pending.resolution.declarations,
            },
          ],
        },
      }),
    },
    current.usagePolicy === null
      ? null
      : effectiveUsagePolicySchema.parse(current.usagePolicy),
  );
  const generationId = randomUUID();
  await insertStorytellerTask(tx, {
    id: generationId,
    ownerId: current.ownerId,
    task,
  });
  await tx.insert(storyResolution).values({
    generationId,
    storyId: current.id,
    basePassageId: passage.id,
    baseRevision: current.revision,
    operationId: generationId,
    submission: {
      kind: 'pending-action-consequence',
      executionId: input.executionId,
      projectedStateDigest: input.pending.projectedStateDigest,
    },
  });
  await tx
    .update(gameActionExecution)
    .set({ preparationGenerationId: generationId })
    .where(eq(gameActionExecution.operationId, input.executionId));
  return generationId;
}

const consequenceReceiptSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('activity'),
    passageId: z.uuid(),
    operationId: z.uuid(),
    afterSegment: z.number().int().nonnegative(),
    throughSegment: z.number().int().nonnegative(),
    label: z.string().min(1).max(200),
    intention: z.string().min(1).max(500),
  }),
  z.strictObject({
    kind: z.literal('world-obligation'),
    passageId: z.uuid(),
    operationId: z.uuid(),
    obligationIds: z.array(z.uuid()).min(1).max(50),
    label: z.string().min(1).max(200),
    intention: z.string().min(1).max(500),
  }),
]);

/**
 * Persists only the durable request to narrate an already committed consequence.
 * Context assembly belongs to the later worker operation because a missing note or
 * oversized context must never undo dice, effects, or the player's command receipt.
 */
export async function requestConsequenceNarration(
  tx: Transaction,
  current: StoryRecord,
  receipt: z.infer<typeof consequenceReceiptSchema>,
) {
  const parsed = consequenceReceiptSchema.parse(receipt);
  await tx.insert(campaignConsequence).values({
    operationId: parsed.operationId,
    storyId: current.id,
    passageId: parsed.passageId,
    baseRevision: current.revision,
    receipt: parsed,
  });
  await enqueue(tx, {
    id: randomUUID(),
    operationId: parsed.operationId,
    topic: campaignConsequenceTopic,
  });
}

/** Enqueues preparation for a receipt already saved by the caller's transaction. */
export async function requestActionNarration(
  tx: Transaction,
  operationId: string,
) {
  await enqueue(tx, {
    id: randomUUID(),
    operationId,
    topic: campaignConsequenceTopic,
  });
}

async function admitActionNarration(
  tx: Transaction,
  current: StoryRecord,
  receipt: typeof gameActionReceipt.$inferSelect,
  documentStore?: DocumentStore,
) {
  const [state] = await tx
    .select()
    .from(campaign)
    .where(eq(campaign.storyId, current.id));
  const [passage] = await tx
    .select({ id: storyPassage.id })
    .from(storyPassage)
    .where(
      and(
        eq(storyPassage.storyId, current.id),
        eq(storyPassage.sequence, current.revision),
      ),
    );
  if (!state || !passage) {
    throw new Error('Missing committed action context');
  }
  const context = await loadStorytellerContext(tx, {
    storyId: current.id,
    revision: current.revision,
    premise: current.premise,
    notes: current.continuityNotes,
    activeSceneScope: current.activeSceneScope,
    selected: {
      id: receipt.operationId,
      label: receipt.label,
      intention: receipt.intention,
    },
    ...canonicalContextDependencies(
      current,
      documentStore,
      canonicalRuleEvidence(
        receipt.roll ? ['time', 'ability-check'] : ['time'],
      ),
    ),
  });
  const task = prepareAdmittedStorytellerTask(
    {
      task: 'consequence',
      source: {
        storyId: current.id,
        narrativeRevision: current.revision,
        passageId: passage.id,
      },
      profile: storytellerProfileSchema.parse(current.storyteller),
      execution: executionPolicySchema.parse(current.execution),
      context: contextInputSchema.parse({
        ...context,
        resolution: {
          character: characterSchema.parse(state.character),
          storyFacts: storyFactsSchema.parse(state.storyFacts),
          gameSecond: state.gameSecond,
          offer: offerSchema.parse(receipt.offer),
          receipts: [
            {
              id: receipt.operationId,
              outcome: receipt.outcome,
              text: receipt.outcomeText,
              roll:
                receipt.roll === null ? null : rollSchema.parse(receipt.roll),
              effects: outcomeEffectsSchema.parse(receipt.effects),
              declarations: storyFactDeclarationsSchema.parse(
                receipt.declarations,
              ),
            },
          ],
        },
      }),
    },
    current.usagePolicy === null
      ? null
      : effectiveUsagePolicySchema.parse(current.usagePolicy),
  );
  const generationId = randomUUID();
  await insertStorytellerTask(tx, {
    id: generationId,
    ownerId: current.ownerId,
    task,
  });
  await tx.insert(storyResolution).values({
    generationId,
    storyId: current.id,
    basePassageId: passage.id,
    baseRevision: current.revision,
    operationId: generationId,
    submission: {
      kind: 'committed-consequence',
      operationId: receipt.operationId,
    },
  });
  await transitionStorytellerIntentToGeneration(
    tx,
    state,
    receipt.operationId,
    generationId,
    await readDatabaseClockMs(tx, current.id),
  );
  return generationId;
}

/**
 * Admits narration of receipts, never another attempt at the action.
 * This runs only from a saved consequence intent after mechanical settlement.
 */
async function admitConsequenceNarration(
  tx: Transaction,
  current: StoryRecord,
  receipt: {
    kind: 'activity';
    passageId: string;
    operationId: string;
    afterSegment: number;
    throughSegment: number;
    label: string;
    intention: string;
  },
  documentStore?: DocumentStore,
) {
  const [state] = await tx
    .select()
    .from(campaign)
    .where(eq(campaign.storyId, current.id));
  if (!state) {
    throw new Error('Missing consequence state');
  }
  const rolls = await tx
    .select()
    .from(gameRoll)
    .where(
      and(
        eq(gameRoll.storyId, current.id),
        eq(gameRoll.operationId, receipt.operationId),
        gt(gameRoll.segment, receipt.afterSegment),
        lte(gameRoll.segment, receipt.throughSegment),
      ),
    )
    .orderBy(gameRoll.segment, gameRoll.checkKey);
  const context = await loadStorytellerContext(tx, {
    storyId: current.id,
    revision: current.revision,
    premise: current.premise,
    notes: current.continuityNotes,
    activeSceneScope: current.activeSceneScope,
    selected: {
      id: receipt.operationId,
      label: receipt.label,
      intention: receipt.intention,
    },
    ...canonicalContextDependencies(
      current,
      documentStore,
      canonicalRuleEvidence(
        rolls.length ? ['time', 'contribution', 'ability-check'] : ['time'],
      ),
    ),
  });
  const task = prepareAdmittedStorytellerTask(
    {
      task: 'consequence',
      source: {
        storyId: current.id,
        narrativeRevision: current.revision,
        passageId: receipt.passageId,
      },
      profile: storytellerProfileSchema.parse(current.storyteller),
      execution: executionPolicySchema.parse(current.execution),
      context: contextInputSchema.parse({
        ...context,
        resolution: {
          character: characterSchema.parse(state.character),
          storyFacts: storyFactsSchema.parse(state.storyFacts),
          gameSecond: state.gameSecond,
          offer: state.offer === null ? null : offerSchema.parse(state.offer),
          receipts: rolls.map((roll) => ({
            id: roll.id,
            roll: roll.result,
            effects: roll.effects,
            declarations: [],
          })),
        },
      }),
    },
    current.usagePolicy === null
      ? null
      : effectiveUsagePolicySchema.parse(current.usagePolicy),
  );
  const id = randomUUID();
  await insertStorytellerTask(tx, { id, ownerId: current.ownerId, task });
  await tx.insert(storyResolution).values({
    generationId: id,
    storyId: current.id,
    basePassageId: receipt.passageId,
    baseRevision: current.revision,
    operationId: id,
    submission: {
      kind: 'committed-consequence',
      operationId: receipt.operationId,
    },
  });
  await transitionStorytellerIntentToGeneration(
    tx,
    state,
    receipt.operationId,
    id,
    await readDatabaseClockMs(tx, current.id),
  );
  return id;
}

async function admitWorldObligationNarration(
  tx: Transaction,
  current: StoryRecord,
  receipt: Extract<
    z.infer<typeof consequenceReceiptSchema>,
    { kind: 'world-obligation' }
  >,
  documentStore?: DocumentStore,
) {
  const [state] = await tx
    .select()
    .from(campaign)
    .where(eq(campaign.storyId, current.id));
  if (!state) {
    throw new Error('Missing world obligation consequence state');
  }
  const context = await loadStorytellerContext(tx, {
    storyId: current.id,
    revision: current.revision,
    premise: current.premise,
    notes: current.continuityNotes,
    activeSceneScope: current.activeSceneScope,
    selected: {
      id: receipt.operationId,
      label: receipt.label,
      intention: receipt.intention,
    },
    ...canonicalContextDependencies(current, documentStore),
  });
  const task = prepareAdmittedStorytellerTask(
    {
      task: 'consequence',
      source: {
        storyId: current.id,
        narrativeRevision: current.revision,
        passageId: receipt.passageId,
      },
      profile: storytellerProfileSchema.parse(current.storyteller),
      execution: executionPolicySchema.parse(current.execution),
      context: contextInputSchema.parse({
        ...context,
        resolution: {
          character: characterSchema.parse(state.character),
          storyFacts: storyFactsSchema.parse(state.storyFacts),
          gameSecond: state.gameSecond,
          offer: null,
          receipts: [
            {
              id: receipt.operationId,
              text: receipt.intention,
              roll: null,
              effects: [],
              declarations: [],
            },
          ],
        },
      }),
    },
    current.usagePolicy === null
      ? null
      : effectiveUsagePolicySchema.parse(current.usagePolicy),
  );
  const generationId = randomUUID();
  await insertStorytellerTask(tx, {
    id: generationId,
    ownerId: current.ownerId,
    task,
  });
  await tx.insert(storyResolution).values({
    generationId,
    storyId: current.id,
    basePassageId: receipt.passageId,
    baseRevision: current.revision,
    operationId: generationId,
    submission: {
      kind: 'committed-consequence',
      operationId: receipt.operationId,
    },
  });
  await transitionWorldObligationHoldToGeneration(
    tx,
    state,
    receipt.operationId,
    generationId,
    await readDatabaseClockMs(tx, current.id),
  );
  return generationId;
}

/** Idempotently prepares narration after mechanical settlement has committed. */
export function createConsequenceNarration(
  database: Database,
  documentStore?: DocumentStore,
) {
  return async function prepare(operationId: string) {
    await database.db.transaction(async (tx) => {
      const [actionReceipt] = await tx
        .select()
        .from(gameActionReceipt)
        .where(eq(gameActionReceipt.operationId, operationId))
        .for('update');
      if (actionReceipt) {
        if (actionReceipt.generationId) return;
        const current = await lockStoryById(tx, actionReceipt.storyId);
        if (current.revision !== actionReceipt.baseRevision) {
          throw new Error('Action narration lost its story revision fence');
        }
        const generationId = await admitActionNarration(
          tx,
          current,
          actionReceipt,
          documentStore,
        );
        await tx
          .update(gameActionReceipt)
          .set({ generationId })
          .where(eq(gameActionReceipt.operationId, operationId));
        await incrementStoryViewVersion(tx, {
          storyId: current.id,
          viewVersion: current.viewVersion + 1,
        });
        return;
      }
      const [intent] = await tx
        .select()
        .from(campaignConsequence)
        .where(eq(campaignConsequence.operationId, operationId))
        .for('update');
      if (!intent || intent.generationId) return;
      const current = await lockStoryById(tx, intent.storyId);
      if (current.revision !== intent.baseRevision) {
        throw new Error('Consequence narration lost its story revision fence');
      }
      const receipt = consequenceReceiptSchema.parse(intent.receipt);
      const generationId =
        receipt.kind === 'world-obligation'
          ? await admitWorldObligationNarration(
              tx,
              current,
              receipt,
              documentStore,
            )
          : await admitConsequenceNarration(
              tx,
              current,
              receipt,
              documentStore,
            );
      await tx
        .update(campaignConsequence)
        .set({ generationId })
        .where(eq(campaignConsequence.operationId, operationId));
      await incrementStoryViewVersion(tx, {
        storyId: current.id,
        viewVersion: current.viewVersion + 1,
      });
    });
  };
}
