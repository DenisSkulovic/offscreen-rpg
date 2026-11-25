/**
 * ENG03-C1-R: same-G operator rearm after exhausted transient capture materialization.
 * Application-private; not a player API and not an Admin UI route.
 */
import { isDeepStrictEqual } from 'node:util';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/story-persistence/generations';
import {
  campaign,
  campaignConsequence,
  gameActionExecution,
  gameActionExecutionEvent,
  gameActionReceipt,
} from '@offscreen/story-persistence/campaign';
import { storyPassage, storyResolution } from '@offscreen/story-persistence/stories';
import {
  storytellerAttempt,
  storytellerContextCapture,
  storytellerContextCaptureRearm,
  storytellerOperation,
} from '@offscreen/story-persistence/storyteller';
import { enqueue } from '@offscreen/outbox/enqueue';
import { campaignConsequenceTopic } from '../campaign/topics';
import { campaignHoldsSchema } from '../campaign/holds';
import { actionProjectedStateDigest } from '../campaign/action-overlap';
import {
  lockOwnedStory,
  incrementStoryViewVersion,
} from '../stories/persistence';
import { StoryError, parseStoryIdentifier } from '../stories/errors';
import {
  CONTEXT_CAPTURE_MAX_MATERIALIZATION_ATTEMPTS,
  hashContextCapture,
  parseContextCapture,
  storytellerContextCaptureKind,
  type AnyContextCaptureV1,
} from './context-capture';
import { activeSceneAnchorSchema } from './context';

const rearmReasonSchema = z.enum([
  'storage-restored',
  'transient-infra-recovered',
]);

const rearmInputSchema = z.strictObject({
  operatorId: z.string().min(1).max(200),
  storyId: z.uuid(),
  captureId: z.uuid(),
  rearmId: z.uuid(),
  reasonCode: rearmReasonSchema,
  incidentRef: z.string().max(200).optional(),
});

export type RearmContextCaptureInput = z.infer<typeof rearmInputSchema>;

export type RearmContextCaptureResult =
  | { outcome: 'rearmed'; epoch: 1; operationId: string }
  | { outcome: 'idempotent'; epoch: 1; operationId: string };

function normalizeActiveSceneScope(scope: unknown) {
  if (scope === null || scope === undefined) return null;
  return activeSceneAnchorSchema.parse(scope);
}

function assertCaptureStillEligible(
  capture: AnyContextCaptureV1,
  current: Awaited<ReturnType<typeof lockOwnedStory>>,
) {
  if (current.revision !== capture.narrativeRevision) {
    throw new StoryError('conflict', 'stale_source:revision');
  }
  if (
    (capture.root.hash === null && current.documentRootHash !== null) ||
    (capture.root.hash !== null &&
      (current.documentRootHash !== capture.root.hash ||
        current.documentRootRevision !== capture.root.revision))
  ) {
    throw new StoryError('conflict', 'stale_source:root');
  }
  if (
    !isDeepStrictEqual(
      normalizeActiveSceneScope(current.activeSceneScope),
      normalizeActiveSceneScope(capture.activeSceneScope),
    )
  ) {
    throw new StoryError('conflict', 'stale_source:scene');
  }
}

/**
 * Explicit operator-only recovery for exhausted provisional capture G.
 * Preserves frozen capture SHA/G/resolution; enqueues one original-topic wake.
 */
export async function rearmContextCapture(
  database: Database,
  rawInput: RearmContextCaptureInput,
): Promise<RearmContextCaptureResult> {
  const input = rearmInputSchema.parse(rawInput);
  parseStoryIdentifier(input.storyId);
  parseStoryIdentifier(input.captureId);
  parseStoryIdentifier(input.rearmId);

  return database.db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(storytellerContextCaptureRearm)
      .where(eq(storytellerContextCaptureRearm.rearmId, input.rearmId));
    if (existing) {
      if (
        existing.captureId !== input.captureId ||
        existing.storyId !== input.storyId ||
        existing.operatorId !== input.operatorId ||
        existing.reasonCode !== input.reasonCode ||
        (existing.incidentRef ?? undefined) !== input.incidentRef
      ) {
        throw new StoryError('conflict', 'rearm_idempotency_mismatch');
      }
      const [capture] = await tx
        .select({ operationId: storytellerContextCapture.operationId })
        .from(storytellerContextCapture)
        .where(eq(storytellerContextCapture.captureId, input.captureId));
      if (!capture) throw new StoryError('not_found');
      return {
        outcome: 'idempotent' as const,
        epoch: 1 as const,
        operationId: capture.operationId,
      };
    }

    const [capturePreview] = await tx
      .select({
        storyId: storytellerContextCapture.storyId,
        capture: storytellerContextCapture.capture,
        captureSha256: storytellerContextCapture.captureSha256,
      })
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, input.captureId));
    if (!capturePreview || capturePreview.storyId !== input.storyId) {
      throw new StoryError('not_found');
    }
    const previewCapture = parseContextCapture(capturePreview.capture);
    if (hashContextCapture(previewCapture) !== capturePreview.captureSha256) {
      throw new StoryError('conflict', 'corrupt_capture');
    }

    // Story lock first (same order as promotion), then capture row.
    const current = await lockOwnedStory(tx, {
      storyId: input.storyId,
      ownerId: previewCapture.ownerId,
    });
    assertCaptureStillEligible(previewCapture, current);

    const [captureRow] = await tx
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, input.captureId))
      .for('update');
    if (!captureRow || captureRow.storyId !== input.storyId) {
      throw new StoryError('not_found');
    }

    const capture = parseContextCapture(captureRow.capture);
    if (hashContextCapture(capture) !== captureRow.captureSha256) {
      throw new StoryError('conflict', 'corrupt_capture');
    }
    if (
      capture.captureId !== input.captureId ||
      capture.storyId !== input.storyId ||
      capture.ownerId !== previewCapture.ownerId
    ) {
      throw new StoryError('conflict', 'capture_identity_mismatch');
    }

    const [generationRow] = await tx
      .select()
      .from(generation)
      .where(eq(generation.id, input.captureId))
      .for('update');
    if (
      !generationRow ||
      generationRow.kind !== storytellerContextCaptureKind ||
      generationRow.state !== 'pending' ||
      generationRow.attemptId !== null ||
      generationRow.output !== null
    ) {
      throw new StoryError('conflict', 'generation_not_provisional');
    }

    const [operation] = await tx
      .select({ generationId: storytellerOperation.generationId })
      .from(storytellerOperation)
      .where(eq(storytellerOperation.generationId, input.captureId));
    if (operation) {
      throw new StoryError('conflict', 'provider_operation_exists');
    }
    const [attempt] = await tx
      .select({ id: storytellerAttempt.id })
      .from(storytellerAttempt)
      .where(eq(storytellerAttempt.generationId, input.captureId))
      .limit(1);
    if (attempt) {
      throw new StoryError('conflict', 'provider_attempt_exists');
    }

    const [resolution] = await tx
      .select()
      .from(storyResolution)
      .where(eq(storyResolution.generationId, input.captureId));
    if (
      !resolution ||
      resolution.storyId !== input.storyId ||
      resolution.basePassageId !== capture.passageId ||
      resolution.baseRevision !== capture.narrativeRevision
    ) {
      throw new StoryError('conflict', 'capture_resolution_mismatch');
    }

    const [basePassage] = await tx
      .select({ id: storyPassage.id })
      .from(storyPassage)
      .where(
        and(
          eq(storyPassage.storyId, capture.storyId),
          eq(storyPassage.id, capture.passageId),
          eq(storyPassage.sequence, capture.narrativeRevision),
        ),
      );
    if (!basePassage) {
      throw new StoryError('conflict', 'stale_source:passage');
    }

    const [campaignState] = await tx
      .select()
      .from(campaign)
      .where(eq(campaign.storyId, input.storyId))
      .for('update');
    if (!campaignState) throw new StoryError('conflict', 'campaign_missing');
    const holds = campaignHoldsSchema.parse(campaignState.holds);
    const generationHold = holds.find(
      (hold) =>
        hold.kind === 'storyteller' && hold.generationId === input.captureId,
    );
    const intentHold = holds.find(
      (hold) =>
        hold.kind === 'storyteller-intent' &&
        hold.operationId === capture.operationId,
    );
    const foreignStorytellerHold = holds.find(
      (hold) =>
        (hold.kind === 'storyteller' &&
          hold.generationId !== input.captureId) ||
        (hold.kind === 'storyteller-intent' &&
          hold.operationId !== capture.operationId),
    );
    // Pending Stage-1 may have no campaign hold yet (execution owns the clock).
    // Committed C1 always transfers a generation hold; require that when purpose
    // is consequence. Never rearm under a foreign Storyteller freeze.
    if (foreignStorytellerHold) {
      throw new StoryError('conflict', 'controlling_hold_mismatch');
    }
    if (capture.purpose === 'consequence' && !generationHold && !intentHold) {
      throw new StoryError('conflict', 'controlling_hold_missing');
    }

    if (capture.purpose === 'pending-consequence') {
      const [execution] = await tx
        .select()
        .from(gameActionExecution)
        .where(eq(gameActionExecution.operationId, capture.operationId));
      if (
        !execution ||
        execution.preparationGenerationId !== capture.captureId ||
        execution.storyId !== capture.storyId
      ) {
        throw new StoryError('conflict', 'capture_execution_mismatch');
      }
      if (execution.state === 'interrupted') {
        throw new StoryError('conflict', 'capture_interrupted');
      }
    } else if (capture.sourceKind === 'action-interrupted') {
      const [execution] = await tx
        .select()
        .from(gameActionExecution)
        .where(eq(gameActionExecution.operationId, capture.operationId));
      if (
        !execution ||
        execution.state !== 'interrupted' ||
        execution.revision !== capture.interruption.executionRevision ||
        execution.storyId !== capture.storyId ||
        execution.preparationGenerationId !== null
      ) {
        throw new StoryError('conflict', 'capture_execution_mismatch');
      }
      const [successReceipt] = await tx
        .select({ operationId: gameActionReceipt.operationId })
        .from(gameActionReceipt)
        .where(eq(gameActionReceipt.operationId, capture.operationId));
      if (successReceipt) {
        throw new StoryError('conflict', 'receipt_mismatch');
      }
      const [event] = await tx
        .select({ id: gameActionExecutionEvent.id })
        .from(gameActionExecutionEvent)
        .where(
          and(
            eq(gameActionExecutionEvent.id, capture.interruption.eventId),
            eq(
              gameActionExecutionEvent.executionId,
              capture.interruption.executionId,
            ),
            eq(
              gameActionExecutionEvent.executionRevision,
              capture.interruption.executionRevision,
            ),
            eq(gameActionExecutionEvent.kind, 'interrupted'),
            eq(gameActionExecutionEvent.storyId, capture.storyId),
          ),
        );
      if (!event) {
        throw new StoryError('conflict', 'capture_event_mismatch');
      }
      const [consequence] = await tx
        .select()
        .from(campaignConsequence)
        .where(eq(campaignConsequence.operationId, capture.operationId));
      if (!consequence || consequence.generationId !== capture.captureId) {
        throw new StoryError('conflict', 'consequence_mismatch');
      }
      if (
        actionProjectedStateDigest({
          character: campaignState.character,
          storyFacts: campaignState.storyFacts,
          gameSecond: campaignState.gameSecond,
        }) !== capture.actorAndWorld.postInterruptStateDigest
      ) {
        throw new StoryError('conflict', 'stale_source:actor');
      }
    } else {
      const [receipt] = await tx
        .select()
        .from(gameActionReceipt)
        .where(eq(gameActionReceipt.operationId, capture.operationId));
      if (
        !receipt ||
        receipt.generationId !== capture.captureId ||
        receipt.storyId !== capture.storyId
      ) {
        throw new StoryError('conflict', 'receipt_mismatch');
      }
      if (
        actionProjectedStateDigest({
          character: campaignState.character,
          storyFacts: campaignState.storyFacts,
          gameSecond: campaignState.gameSecond,
        }) !== capture.actorAndWorld.postSettlementStateDigest
      ) {
        throw new StoryError('conflict', 'stale_source:actor');
      }
    }

    const leaseLive =
      captureRow.state === 'materializing' &&
      captureRow.leaseExpiresAt !== null &&
      captureRow.leaseExpiresAt.getTime() > Date.now();
    if (leaseLive) {
      throw new StoryError('conflict', 'lease_live');
    }
    const exhaustedAttempts =
      captureRow.materializationAttempts >=
      CONTEXT_CAPTURE_MAX_MATERIALIZATION_ATTEMPTS;
    const heldExhausted = captureRow.state === 'held' && exhaustedAttempts;
    const expiredLeaseExhausted =
      captureRow.state === 'materializing' && exhaustedAttempts;
    if (!heldExhausted && !expiredLeaseExhausted) {
      throw new StoryError('conflict', 'rearm_ineligible_state');
    }
    if (
      captureRow.state === 'ready' ||
      captureRow.state === 'blocked' ||
      captureRow.state === 'stale'
    ) {
      throw new StoryError('conflict', 'rearm_terminal_state');
    }
    if (captureRow.rearmEpoch !== 0) {
      throw new StoryError('conflict', 'rearm_epoch_exhausted');
    }
    const previousFailure = captureRow.failureCode;
    if (
      previousFailure === 'corrupt_source' ||
      previousFailure === 'source_mismatch' ||
      previousFailure === 'context_too_large' ||
      previousFailure === 'receipt_mismatch' ||
      previousFailure === 'capture_interrupted' ||
      (previousFailure?.startsWith('stale_source') ?? false)
    ) {
      throw new StoryError('conflict', 'rearm_permanent_failure');
    }

    await tx.insert(storytellerContextCaptureRearm).values({
      rearmId: input.rearmId,
      captureId: input.captureId,
      storyId: input.storyId,
      operatorId: input.operatorId,
      reasonCode: input.reasonCode,
      incidentRef: input.incidentRef ?? null,
      previousState: captureRow.state,
      previousAttempts: captureRow.materializationAttempts,
      previousFailureCode: captureRow.failureCode,
      epoch: 1,
    });

    await tx
      .update(storytellerContextCapture)
      .set({
        state: 'captured',
        materializationAttempts: 0,
        rearmEpoch: 1,
        leaseId: null,
        leaseExpiresAt: null,
        failureCode: null,
        updatedAt: new Date(),
      })
      .where(eq(storytellerContextCapture.captureId, input.captureId));

    await enqueue(tx, {
      id: randomUUID(),
      operationId: captureRow.operationId,
      topic: campaignConsequenceTopic,
    });
    await incrementStoryViewVersion(tx, {
      storyId: input.storyId,
      viewVersion: current.viewVersion + 1,
    });

    return {
      outcome: 'rearmed' as const,
      epoch: 1 as const,
      operationId: captureRow.operationId,
    };
  });
}
