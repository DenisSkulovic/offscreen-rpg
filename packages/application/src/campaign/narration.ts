/**
 * Committed consequence admission, receipt-gated preparation and hold transfer
 * after mechanical settlement. Must not own generic Storyteller runtime; see
 * ../storyteller/runtime.ts and ./action-executions.ts for boundary timing.
 */
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '@offscreen/db';
import {
  campaignConsequence,
  gameActionExecution,
  gameActionReceipt,
} from '@offscreen/db/campaign-schema';
import type { Transaction } from '../outbox/index';
import type { StoryRecord } from '../stories/persistence';
import {
  incrementStoryViewVersion,
  lockStoryById,
} from '../stories/persistence';
import {
  captureActivityConsequenceNarration,
  captureCommittedActionNarration,
  captureInterruptedActionNarration,
  capturePendingActionNarration,
  captureWorldObligationConsequenceNarration,
} from '../storyteller/context-capture';
import { materializePendingActionCapture } from '../storyteller/capture-materialization';
import { enqueue } from '../outbox/index';
import type { PendingImmediateActionResolution } from './action-overlap';

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
          ? await captureWorldObligationConsequenceNarration(tx, current, {
              kind: 'world-obligation',
              passageId: receipt.passageId,
              operationId: receipt.operationId,
              obligationIds: receipt.obligationIds,
              label: receipt.label,
              intention: receipt.intention,
            })
          : receipt.kind === 'action-interrupted'
            ? await captureInterruptedActionNarration(tx, current, receipt)
            : await captureActivityConsequenceNarration(tx, current, {
                kind: 'activity',
                passageId: receipt.passageId,
                operationId: receipt.operationId,
                afterSegment: receipt.afterSegment,
                throughSegment: receipt.throughSegment,
                label: receipt.label,
                intention: receipt.intention,
              });
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
