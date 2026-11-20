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
import {
  captureCommittedActionNarration,
  captureInterruptedActionNarration,
  capturePendingActionNarration,
} from '../storyteller/context-capture';
import { materializePendingActionCapture } from '../storyteller/capture-materialization';
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
    startGameSecond: number;
    targetGameSecond: number;
    offer: unknown;
    plan: unknown;
    label: string;
    intention: string;
    pending: PendingImmediateActionResolution;
  },
) {
  // ENG03-narrow Stage 1: freeze ContextCaptureV1 under lock; no DocumentStore.
  const generationId = await capturePendingActionNarration(tx, current, {
    executionId: input.executionId,
    startGameSecond: input.startGameSecond,
    targetGameSecond: input.targetGameSecond,
    offer: input.offer,
    plan: input.plan,
    label: input.label,
    intention: input.intention,
    pending: input.pending,
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
  z.strictObject({
    kind: z.literal('action-interrupted'),
    passageId: z.uuid(),
    operationId: z.uuid(),
    executionId: z.uuid(),
    executionRevision: z.number().int().nonnegative(),
    gameSecond: z.number().int().nonnegative(),
    cause: z.literal('required-item-holder-changed'),
    offerId: z.uuid(),
    actionKey: z.string().min(1).max(200),
    itemKeys: z.array(z.string().min(1).max(80)).min(1).max(50),
    eventId: z.uuid(),
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
    const captureResult = await materializePendingActionCapture(
      database,
      operationId,
      documentStore,
    );
    if (captureResult.handled) return;
    let committedCaptureInserted = false;
    await database.db.transaction(async (tx) => {
      // ENG03-C1 lock order: unlocked receipt preflight → story lock → receipt FOR UPDATE.
      const [receiptPeek] = await tx
        .select({
          storyId: gameActionReceipt.storyId,
          generationId: gameActionReceipt.generationId,
        })
        .from(gameActionReceipt)
        .where(eq(gameActionReceipt.operationId, operationId));
      if (receiptPeek) {
        if (receiptPeek.generationId) return;
        const current = await lockStoryById(tx, receiptPeek.storyId);
        const [actionReceipt] = await tx
          .select()
          .from(gameActionReceipt)
          .where(eq(gameActionReceipt.operationId, operationId))
          .for('update');
        if (!actionReceipt || actionReceipt.generationId) return;
        if (current.revision !== actionReceipt.baseRevision) {
          throw new Error('Action narration lost its story revision fence');
        }
        const [execution] = await tx
          .select()
          .from(gameActionExecution)
          .where(eq(gameActionExecution.operationId, operationId));
        if (
          !execution ||
          execution.storyId !== current.id ||
          execution.state !== 'settled' ||
          execution.preparationGenerationId !== null
        ) {
          throw new Error(
            'Committed capture requires a settled execution without preparation G',
          );
        }
        // ENG03-C1: SQL-only Stage 1 capture; CAS/materialization runs off-lock.
        const generationId = await captureCommittedActionNarration(
          tx,
          current,
          actionReceipt,
        );
        await tx
          .update(gameActionReceipt)
          .set({ generationId })
          .where(eq(gameActionReceipt.operationId, operationId));
        await incrementStoryViewVersion(tx, {
          storyId: current.id,
          viewVersion: current.viewVersion + 1,
        });
        committedCaptureInserted = true;
        return;
      }
      const [intentPeek] = await tx
        .select({
          storyId: campaignConsequence.storyId,
          generationId: campaignConsequence.generationId,
        })
        .from(campaignConsequence)
        .where(eq(campaignConsequence.operationId, operationId));
      if (!intentPeek || intentPeek.generationId) return;
      const current = await lockStoryById(tx, intentPeek.storyId);
      const [intent] = await tx
        .select()
        .from(campaignConsequence)
        .where(eq(campaignConsequence.operationId, operationId))
        .for('update');
      if (!intent || intent.generationId) return;
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
          : receipt.kind === 'action-interrupted'
            ? await captureInterruptedActionNarration(tx, current, receipt)
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
    if (committedCaptureInserted) {
      await materializePendingActionCapture(
        database,
        operationId,
        documentStore,
      );
    }
  };
}
