import { isDeepStrictEqual } from 'node:util';
import { and, eq, gt, inArray, lte } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  campaign,
  campaignConsequence,
  campaignReport,
  gameActionExecution,
  gameActionExecutionEvent,
  gameActionReceipt,
  gameActivity,
  gameRoll,
} from '@offscreen/db/campaign-schema';
import { generation } from '@offscreen/db/generation-schema';
import {
  story,
  storyPassage,
  storyResolution,
} from '@offscreen/db/story-schema';
import {
  storytellerContextCapture,
  storytellerPublication,
} from '@offscreen/db/storyteller-schema';
import {
  hashContextCapture,
  parseContextCapture,
} from './context-capture';
import { activeSceneAnchorSchema } from './context';

function normalizeActiveSceneScope(scope: unknown) {
  if (scope === null || scope === undefined) return null;
  return activeSceneAnchorSchema.parse(scope);
}
import {
  storytellerTaskSchema,
  validateStorytellerResult,
} from '@offscreen/storyteller/tasks';
import { interactionSubmissionSchema } from '@offscreen/contracts/interactions';
import { setPublication, storytellerKind } from './records';
import { translateGeneratedContinuation } from '../generations/generated-continuation';
import {
  commitStagedStoryPublication,
  commitStoryContinuation,
  stageSupportedContinuationCheckpoint,
  type StagedContinuationCheckpoint,
} from '../stories/continuation';
import {
  checkpointWriterStore,
  insertStagedSceneCheckpointSelector,
} from '../stories/scene-checkpoint';
import {
  lockOwnedStory,
  insertContinuationPassage,
  advanceStoryView,
  incrementStoryViewVersion,
  readDatabaseClockMs,
  restartActiveSceneAtPassage,
  findPassageByTransition,
} from '../stories/persistence';
import {
  publicationAppearanceWrite,
  publicationSceneCandidate,
} from '../stories/scene-appearance';
import { publishStorytellerNotes } from './memory';
import { StoryError } from '../stories/errors';
import { continuationSchema } from '../stories/command-policy';
import { saveOfferPlans } from '../campaign/persistence';
import {
  campaignHoldsSchema,
  transitionStorytellerHoldToDecision,
} from '../campaign/holds';
import { captureDelegatedOfferOnPublication } from '../campaign/delegated-offer';
import { rollSchema } from '@offscreen/game/checks';
import { outcomeEffectsSchema } from '@offscreen/game/effects';
import {
  actionProjectedStateDigest,
  pendingImmediateActionResolutionSchema,
} from '../campaign/action-overlap';
import type { DocumentStore } from '@offscreen/documents';
import {
  publicationChangedDocumentId,
  publicationPassageId,
  stageStoryPublicationDocuments,
  type StagedStoryPublication,
} from '../stories/passage-documents';
import type { ProposedDocumentChange } from '@offscreen/storyteller/tasks';
import {
  admitConsequenceSelectedPlans,
  stageConsequencePublicationCheckpoint,
  type StagedConsequencePublication,
} from './publication-candidate';
import {
  assertV2PostStateMatches,
  toV2FictionalState,
} from '../stories/scene-checkpoint-v2';
import {
  readSceneAfterState,
  SceneAfterStateError,
} from '../stories/scene-after-state';

function activeSceneRecallCues(
  changes: readonly ProposedDocumentChange[],
  operationId: string,
  existing: readonly {
    handle: string;
    documentId: string;
    kind: string;
  }[],
  requested: readonly {
    handle: string;
    reason: 'identity' | 'place' | 'thread';
  }[],
) {
  const changed = changes.flatMap((change, index) =>
    change.recallAs
      ? [
          {
            documentId: publicationChangedDocumentId(
              operationId,
              index,
              change,
            ),
            reason: change.recallAs,
          },
        ]
      : [],
  );
  const existingByHandle = new Map(
    existing.map((entry) => [entry.handle, entry]),
  );
  const selected = requested.map((recall) => {
    const entry = existingByHandle.get(recall.handle);
    if (!entry) throw new StoryError('invalid');
    return { documentId: entry.documentId, reason: recall.reason };
  });
  return [
    ...new Map(
      [...selected, ...changed].map((cue) => [cue.documentId, cue]),
    ).values(),
  ];
}

/** Callers may omit `internalAppearance`. A valid result suggestion supplies the candidate. */
export async function publishStorytellerResult(
  database: Database,
  id: string,
  realDurationMs: (gameDurationMs: number) => number,
  documentStore?: DocumentStore,
  internalAppearance?: { candidate?: unknown },
) {
  let stagedDocuments: StagedStoryPublication | undefined;
  let stagedContinuation: StagedContinuationCheckpoint | undefined;
  let stagedConsequence: StagedConsequencePublication | undefined;
  const [candidate] = await database.db
    .select()
    .from(generation)
    .where(and(eq(generation.id, id), eq(generation.kind, storytellerKind)));
  if (candidate?.state === 'succeeded') {
    const task = storytellerTaskSchema.parse(candidate.input);
    const result = validateStorytellerResult(task, candidate.output);
    if (
      (task.task === 'continuation' ||
        task.task === 'consequence' ||
        task.task === 'pending-consequence') &&
      !('report' in result)
    ) {
      const [preparedResolution] = await database.db
        .select({
          operationId: storyResolution.operationId,
          submission: storyResolution.submission,
        })
        .from(storyResolution)
        .where(eq(storyResolution.generationId, id));
      if (!preparedResolution) throw new StoryError('invalid');
      const [current] = await database.db
        .select({
          rootHash: story.documentRootHash,
          rootRevision: story.documentRootRevision,
          revision: story.revision,
        })
        .from(story)
        .where(eq(story.id, task.source.storyId));
      if (
        current?.rootHash &&
        current.revision === task.source.narrativeRevision &&
        documentStore
      ) {
        stagedDocuments = await stageStoryPublicationDocuments({
          storage: documentStore,
          storyId: task.source.storyId,
          passageId: publicationPassageId(id),
          sequence: task.source.narrativeRevision + 1,
          operationId: preparedResolution.operationId,
          rootHash: current.rootHash,
          rootRevision: current.rootRevision,
          content: result.scene.content,
          changes: result.documentChanges,
        });
      } else if (result.documentChanges.length) {
        throw new StoryError('unavailable', 'document_store');
      }
      const writer = documentStore
        ? checkpointWriterStore(documentStore)
        : undefined;
      if (
        writer &&
        task.task === 'continuation' &&
        current &&
        current.revision === task.source.narrativeRevision
      ) {
        const proposed = translateGeneratedContinuation({
          output: result.scene,
          generationId: id,
          response: interactionSubmissionSchema.parse(
            preparedResolution.submission,
          ),
          realDurationMs,
        });
        const parsed = continuationSchema.safeParse({
          ...proposed,
          expectedRevision: task.source.narrativeRevision,
        });
        if (parsed.success) {
          stagedContinuation = await stageSupportedContinuationCheckpoint(
            database,
            writer,
            {
              ownerId: candidate.ownerId,
              storyId: task.source.storyId,
              transitionId: preparedResolution.operationId,
              input: parsed.data,
              ...(stagedDocuments
                ? {
                    passageId: stagedDocuments.passageId,
                    contentDocumentHash: stagedDocuments.passageObjectHash,
                    nextRootHash: stagedDocuments.rootHash,
                    nextRootRevision: stagedDocuments.rootRevision,
                    baseRootHash: stagedDocuments.baseRootHash,
                    baseRootRevision: stagedDocuments.baseRootRevision,
                  }
                : {
                    baseRootHash: current.rootHash,
                    baseRootRevision: current.rootRevision,
                  }),
              restartActiveScene:
                result.activeScene?.kind === 'restart-at-current',
              ...(result.activeScene?.kind === 'restart-at-current'
                ? {
                    activeSceneRecallCues: activeSceneRecallCues(
                      result.documentChanges,
                      preparedResolution.operationId,
                      task.context.canonicalKnowledge?.catalogue ?? [],
                      result.activeScene.recallDocuments,
                    ),
                  }
                : {}),
            },
          );
        }
      }
      if (
        writer &&
        (task.task === 'consequence' || task.task === 'pending-consequence') &&
        current &&
        current.revision === task.source.narrativeRevision
      ) {
        const sceneCandidate = publicationSceneCandidate({
          internalCandidate: internalAppearance?.candidate,
          suggestion: result.appearanceSuggestion,
        });
        const written = publicationAppearanceWrite({
          generationId: id,
          storyId: task.source.storyId,
          ...(stagedDocuments
            ? { stagedPassageId: stagedDocuments.passageId }
            : {}),
          ...(sceneCandidate !== undefined ? { candidate: sceneCandidate } : {}),
        });
        stagedConsequence = await stageConsequencePublicationCheckpoint(
          database,
          writer,
          {
            ownerId: candidate.ownerId,
            storyId: task.source.storyId,
            generationId: id,
            transitionId: preparedResolution.operationId,
            task,
            result,
            passageId: written.passageId,
            contentDocumentHash: stagedDocuments?.passageObjectHash ?? null,
            nextRootHash: stagedDocuments?.rootHash ?? current.rootHash,
            nextRootRevision:
              stagedDocuments?.rootRevision ?? current.rootRevision,
            baseRootHash: stagedDocuments?.baseRootHash ?? current.rootHash,
            baseRootRevision:
              stagedDocuments?.baseRootRevision ?? current.rootRevision,
            restartActiveScene:
              result.activeScene?.kind === 'restart-at-current',
            ...(result.activeScene?.kind === 'restart-at-current'
              ? {
                  activeSceneRecallCues: activeSceneRecallCues(
                    result.documentChanges,
                    preparedResolution.operationId,
                    task.context.canonicalKnowledge?.catalogue ?? [],
                    result.activeScene.recallDocuments,
                  ),
                }
              : {}),
            ...(stagedDocuments ? { stagedDocuments } : {}),
          },
        );
      }
    }
  }
  await database.db.transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(generation)
      .where(and(eq(generation.id, id), eq(generation.kind, storytellerKind)));
    if (!record) {
      return;
    }
    const task = storytellerTaskSchema.parse(record.input);
    if (record.state !== 'succeeded') {
      if (task.task === 'report' && record.state === 'failed') {
        const current = await lockOwnedStory(tx, {
          storyId: task.source.storyId,
          ownerId: record.ownerId,
        });
        const changed = await tx
          .update(campaignReport)
          .set({ state: 'blocked' })
          .where(
            and(
              eq(campaignReport.id, task.source.hookId),
              eq(campaignReport.generationId, id),
              eq(campaignReport.state, 'generating'),
            ),
          )
          .returning({ id: campaignReport.id });
        if (changed.length) {
          await incrementStoryViewVersion(tx, {
            storyId: current.id,
            viewVersion: current.viewVersion + 1,
          });
        }
        await setPublication(
          tx,
          id,
          'blocked',
          record.failureCode ?? 'generation_failed',
        );
      }
      return;
    }
    const result = validateStorytellerResult(task, record.output);
    if (task.task === 'opening') {
      await setPublication(tx, id, 'published');
      return;
    }
    const current = await lockOwnedStory(tx, {
      storyId: task.source.storyId,
      ownerId: record.ownerId,
    });
    const [publication] = await tx
      .select()
      .from(storytellerPublication)
      .where(eq(storytellerPublication.generationId, id));
    if (publication?.state === 'published' || publication?.state === 'stale') {
      return;
    }
    if (task.task === 'report') {
      if (!('report' in result)) {
        throw new StoryError('invalid');
      }
      const [hook] = await tx
        .select()
        .from(campaignReport)
        .where(eq(campaignReport.id, task.source.hookId))
        .for('update');
      if (
        !hook ||
        hook.storyId !== current.id ||
        hook.generationId !== id ||
        hook.sourcePassageId !== task.source.passageId ||
        hook.sourceRevision !== task.source.narrativeRevision
      ) {
        throw new StoryError('invalid');
      }
      if (hook.state === 'published') {
        await setPublication(tx, id, 'published');
        return;
      }
      await tx
        .update(campaignReport)
        .set({
          state: 'published',
          report: result.report,
          publishedAt: new Date(),
        })
        .where(eq(campaignReport.id, hook.id));
      await incrementStoryViewVersion(tx, {
        storyId: current.id,
        viewVersion: current.viewVersion + 1,
      });
      await setPublication(tx, id, 'published');
      return;
    }
    if ('report' in result) {
      throw new StoryError('invalid');
    }
    if (current.revision !== task.source.narrativeRevision) {
      await setPublication(tx, id, 'stale');
      return;
    }
    const [resolution] = await tx
      .select()
      .from(storyResolution)
      .where(eq(storyResolution.generationId, id));
    if (!resolution || resolution.basePassageId !== task.source.passageId) {
      throw new StoryError('invalid');
    }
    if (task.task === 'pending-consequence') {
      const [execution] = await tx
        .select()
        .from(gameActionExecution)
        .where(eq(gameActionExecution.operationId, task.source.executionId));
      const [receipt] = await tx
        .select()
        .from(gameActionReceipt)
        .where(eq(gameActionReceipt.operationId, task.source.executionId));
      // Early preparation is valid but remains private until the exact
      // execution has settled and promoted this generation to its receipt.
      if (!receipt || execution?.state !== 'settled') {
        throw new StoryError('unavailable', 'pending-consequence-not-settled');
      }
      const pending = pendingImmediateActionResolutionSchema.parse(
        execution.pendingResolution,
      );
      const [campaignState] = await tx
        .select()
        .from(campaign)
        .where(eq(campaign.storyId, current.id));
      if (
        !campaignState ||
        execution.preparationGenerationId !== id ||
        receipt.generationId !== id ||
        execution.storyId !== current.id ||
        execution.targetGameSecond !== task.source.targetGameSecond ||
        pending.projectedStateDigest !== task.source.projectedStateDigest ||
        actionProjectedStateDigest({
          character: campaignState.character,
          storyFacts: campaignState.storyFacts,
          gameSecond: campaignState.gameSecond,
        }) !== task.source.projectedStateDigest
      ) {
        throw new StoryError('invalid');
      }
      const [captureRow] = await tx
        .select()
        .from(storytellerContextCapture)
        .where(eq(storytellerContextCapture.captureId, id));
      if (captureRow) {
        const capture = parseContextCapture(captureRow.capture);
        if (capture.purpose !== 'pending-consequence') {
          throw new StoryError('invalid');
        }
        const sourceStillMatches =
          hashContextCapture(capture) === captureRow.captureSha256 &&
          capture.operationId === task.source.executionId &&
          capture.passageId === task.source.passageId &&
          capture.narrativeRevision === task.source.narrativeRevision &&
          capture.acceptedPendingResult.projectedStateDigest ===
            task.source.projectedStateDigest &&
          captureRow.state === 'ready' &&
          current.ownerId === capture.ownerId &&
          (capture.root.hash === null
            ? current.documentRootHash === null
            : current.documentRootHash === capture.root.hash &&
              current.documentRootRevision === capture.root.revision) &&
          isDeepStrictEqual(
            normalizeActiveSceneScope(current.activeSceneScope),
            normalizeActiveSceneScope(capture.activeSceneScope),
          ) &&
          isDeepStrictEqual(current.premise, capture.narrative.premise) &&
          isDeepStrictEqual(
            current.continuityNotes ?? [],
            capture.narrative.notes,
          ) &&
          isDeepStrictEqual(current.storyteller, capture.settings.profile) &&
          isDeepStrictEqual(current.execution, capture.settings.execution);
        if (!sourceStillMatches) {
          await setPublication(tx, id, 'stale');
          return;
        }
        for (const source of capture.sourcePassages) {
          const [row] = await tx
            .select({
              id: storyPassage.id,
              sequence: storyPassage.sequence,
              contentDocumentHash: storyPassage.contentDocumentHash,
              content: storyPassage.content,
              response: storyPassage.response,
            })
            .from(storyPassage)
            .where(
              and(
                eq(storyPassage.storyId, current.id),
                eq(storyPassage.id, source.passageId),
              ),
            );
          if (
            !row ||
            row.sequence !== source.sequence ||
            (source.storage === 'cas'
              ? row.contentDocumentHash !== source.contentHash
              : row.contentDocumentHash !== null ||
                !isDeepStrictEqual(row.content, source.inlineContent))
          ) {
            await setPublication(tx, id, 'stale');
            return;
          }
        }
        if (
          receipt.outcome !== capture.acceptedPendingResult.resolution.outcome ||
          receipt.outcomeText !==
            capture.acceptedPendingResult.resolution.text ||
          !isDeepStrictEqual(
            receipt.effects,
            capture.acceptedPendingResult.resolution.effects,
          ) ||
          !isDeepStrictEqual(
            receipt.declarations,
            capture.acceptedPendingResult.resolution.declarations,
          ) ||
          !isDeepStrictEqual(
            receipt.roll,
            capture.acceptedPendingResult.resolution.roll,
          )
        ) {
          await setPublication(tx, id, 'blocked', 'receipt_mismatch');
          return;
        }
      }
    }
    if (task.task === 'consequence') {
      const [captureRow] = await tx
        .select()
        .from(storytellerContextCapture)
        .where(eq(storytellerContextCapture.captureId, id));
      if (captureRow) {
        const capture = parseContextCapture(captureRow.capture);
        if (capture.purpose !== 'consequence') {
          throw new StoryError('invalid');
        }
        const [campaignState] = await tx
          .select()
          .from(campaign)
          .where(eq(campaign.storyId, current.id));
        const commonStillMatches =
          hashContextCapture(capture) === captureRow.captureSha256 &&
          captureRow.state === 'ready' &&
          current.ownerId === capture.ownerId &&
          capture.passageId === task.source.passageId &&
          capture.narrativeRevision === task.source.narrativeRevision &&
          !!campaignState &&
          (capture.root.hash === null
            ? current.documentRootHash === null
            : current.documentRootHash === capture.root.hash &&
              current.documentRootRevision === capture.root.revision) &&
          isDeepStrictEqual(
            normalizeActiveSceneScope(current.activeSceneScope),
            normalizeActiveSceneScope(capture.activeSceneScope),
          ) &&
          isDeepStrictEqual(current.premise, capture.narrative.premise) &&
          isDeepStrictEqual(
            current.continuityNotes ?? [],
            capture.narrative.notes,
          ) &&
          isDeepStrictEqual(current.storyteller, capture.settings.profile) &&
          isDeepStrictEqual(current.execution, capture.settings.execution);
        if (capture.sourceKind === 'action-interrupted') {
          const [execution] = await tx
            .select()
            .from(gameActionExecution)
            .where(eq(gameActionExecution.operationId, capture.operationId));
          const [successReceipt] = await tx
            .select({ operationId: gameActionReceipt.operationId })
            .from(gameActionReceipt)
            .where(eq(gameActionReceipt.operationId, capture.operationId));
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
                eq(gameActionExecutionEvent.storyId, current.id),
              ),
            );
          const [consequence] = await tx
            .select()
            .from(campaignConsequence)
            .where(eq(campaignConsequence.operationId, capture.operationId));
          const sourceStillMatches =
            commonStillMatches &&
            !successReceipt &&
            consequence?.generationId === id &&
            !!event &&
            execution?.state === 'interrupted' &&
            execution.revision === capture.interruption.executionRevision &&
            execution.preparationGenerationId === null &&
            actionProjectedStateDigest({
              character: campaignState!.character,
              storyFacts: campaignState!.storyFacts,
              gameSecond: campaignState!.gameSecond,
            }) === capture.actorAndWorld.postInterruptStateDigest;
          if (!sourceStillMatches) {
            await setPublication(tx, id, 'stale');
            return;
          }
        } else if (capture.sourceKind === 'action-receipt') {
          const [receipt] = await tx
            .select()
            .from(gameActionReceipt)
            .where(eq(gameActionReceipt.operationId, capture.operationId));
          const sourceStillMatches =
            commonStillMatches &&
            receipt?.generationId === id &&
            receipt.operationId === capture.acceptedReceipt.operationId &&
            receipt.outcome === capture.acceptedReceipt.outcome &&
            receipt.outcomeText === capture.acceptedReceipt.outcomeText &&
            isDeepStrictEqual(receipt.offer, capture.acceptedReceipt.offer) &&
            isDeepStrictEqual(
              receipt.effects,
              capture.acceptedReceipt.effects,
            ) &&
            isDeepStrictEqual(
              receipt.declarations,
              capture.acceptedReceipt.declarations,
            ) &&
            isDeepStrictEqual(receipt.roll, capture.acceptedReceipt.roll) &&
            actionProjectedStateDigest({
              character: campaignState!.character,
              storyFacts: campaignState!.storyFacts,
              gameSecond: campaignState!.gameSecond,
            }) === capture.actorAndWorld.postSettlementStateDigest;
          if (!sourceStillMatches) {
            await setPublication(tx, id, 'stale');
            return;
          }
        } else if (capture.sourceKind === 'campaign-activity') {
          const [consequence] = await tx
            .select()
            .from(campaignConsequence)
            .where(eq(campaignConsequence.operationId, capture.operationId));
          const expected = capture.acceptedReceipt;
          const stored =
            consequence?.receipt &&
            typeof consequence.receipt === 'object' &&
            'kind' in consequence.receipt &&
            (consequence.receipt as { kind?: string }).kind === 'activity'
              ? (consequence.receipt as typeof expected)
              : null;
          const rolls = await tx
            .select()
            .from(gameRoll)
            .where(
              and(
                eq(gameRoll.storyId, current.id),
                eq(gameRoll.operationId, capture.operationId),
                gt(gameRoll.segment, expected.afterSegment),
                lte(gameRoll.segment, expected.throughSegment),
              ),
            )
            .orderBy(gameRoll.segment, gameRoll.checkKey);
          const holds = campaignState
            ? campaignHoldsSchema.parse(campaignState.holds)
            : [];
          const sourceStillMatches =
            commonStillMatches &&
            !!consequence &&
            consequence.generationId === id &&
            consequence.storyId === current.id &&
            consequence.baseRevision === task.source.narrativeRevision &&
            !!stored &&
            stored.passageId === expected.passageId &&
            stored.operationId === expected.operationId &&
            stored.afterSegment === expected.afterSegment &&
            stored.throughSegment === expected.throughSegment &&
            stored.label === expected.label &&
            stored.intention === expected.intention &&
            rolls.length === expected.rolls.length &&
            !rolls.some((roll, index) => {
              const frozen = expected.rolls[index];
              return (
                !frozen ||
                roll.id !== frozen.id ||
                roll.segment !== frozen.segment ||
                roll.checkKey !== frozen.checkKey ||
                !isDeepStrictEqual(rollSchema.parse(roll.result), frozen.result) ||
                !isDeepStrictEqual(
                  outcomeEffectsSchema.parse(roll.effects),
                  frozen.effects,
                )
              );
            }) &&
            holds.some(
              (hold) =>
                hold.kind === 'storyteller' && hold.generationId === id,
            ) &&
            actionProjectedStateDigest({
              character: campaignState!.character,
              storyFacts: campaignState!.storyFacts,
              gameSecond: campaignState!.gameSecond,
            }) === capture.actorAndWorld.postSettlementStateDigest;
          if (!sourceStillMatches) {
            await setPublication(tx, id, 'stale');
            return;
          }
        } else if (capture.sourceKind === 'campaign-world-obligation') {
          const [consequence] = await tx
            .select()
            .from(campaignConsequence)
            .where(eq(campaignConsequence.operationId, capture.operationId));
          const expected = capture.acceptedReceipt;
          const stored =
            consequence?.receipt &&
            typeof consequence.receipt === 'object' &&
            'kind' in consequence.receipt &&
            (consequence.receipt as { kind?: string }).kind ===
              'world-obligation'
              ? (consequence.receipt as typeof expected)
              : null;
          const holds = campaignState
            ? campaignHoldsSchema.parse(campaignState.holds)
            : [];
          const sourceStillMatches =
            commonStillMatches &&
            !!consequence &&
            consequence.generationId === id &&
            consequence.storyId === current.id &&
            consequence.baseRevision === task.source.narrativeRevision &&
            !!stored &&
            stored.passageId === expected.passageId &&
            stored.operationId === expected.operationId &&
            stored.label === expected.label &&
            stored.intention === expected.intention &&
            isDeepStrictEqual(stored.obligationIds, expected.obligationIds) &&
            holds.some(
              (hold) =>
                hold.kind === 'storyteller' && hold.generationId === id,
            ) &&
            !holds.some(
              (hold) =>
                hold.kind === 'world-obligation' &&
                hold.obligationId === capture.operationId,
            ) &&
            actionProjectedStateDigest({
              character: campaignState!.character,
              storyFacts: campaignState!.storyFacts,
              gameSecond: campaignState!.gameSecond,
            }) === capture.actorAndWorld.postSettlementStateDigest;
          if (!sourceStillMatches) {
            await setPublication(tx, id, 'stale');
            return;
          }
        } else {
          throw new StoryError('invalid');
        }
      }
    }
    if (task.task === 'consequence' || task.task === 'pending-consequence') {
      if (
        stagedDocuments &&
        (current.documentRootHash !== stagedDocuments.baseRootHash ||
          current.documentRootRevision !== stagedDocuments.baseRootRevision)
      ) {
        throw new StoryError('conflict', 'document_root');
      }
      if (!stagedConsequence) {
        if (documentStore && checkpointWriterStore(documentStore)) {
          throw new StoryError('conflict', 'state_not_representable');
        }
        throw new StoryError('unavailable', 'checkpoint_store_unavailable');
      }
      const priorPassage = await findPassageByTransition(tx, {
        storyId: current.id,
        transitionId: resolution.operationId,
      });
      if (priorPassage) {
        if (priorPassage.sourceGenerationId !== id) {
          throw new StoryError('conflict');
        }
        await setPublication(tx, id, 'published');
        return;
      }
      const nextRootHash =
        stagedDocuments?.rootHash ?? current.documentRootHash;
      const nextRootRevision =
        stagedDocuments?.rootRevision ?? current.documentRootRevision;
      if (
        current.documentRootHash !== stagedConsequence.baseRootHash ||
        current.documentRootRevision !== stagedConsequence.baseRootRevision ||
        stagedConsequence.checkpoint.canon.rootHash !== nextRootHash ||
        stagedConsequence.checkpoint.canon.rootRevision !== nextRootRevision ||
        stagedConsequence.checkpoint.sceneSequence !== current.revision + 1 ||
        (stagedDocuments &&
          stagedConsequence.passageId !== stagedDocuments.passageId)
      ) {
        throw new StoryError('conflict', 'stale_canon_root');
      }
      const [campaignState] = await tx
        .select()
        .from(campaign)
        .where(eq(campaign.storyId, current.id));
      if (!campaignState) {
        throw new StoryError('invalid');
      }
      if (
        result.scene.version !== 3 ||
        result.scene.next.kind !== 'action-plans'
      ) {
        throw new StoryError('invalid');
      }
      const selectedPlans = await admitConsequenceSelectedPlans(tx, {
        storyId: current.id,
        generationId: id,
        task,
        result,
      });
      if (!isDeepStrictEqual(selectedPlans, stagedConsequence.selectedPlans)) {
        throw new StoryError('conflict', 'stale_story_revision');
      }
      const sceneCandidate = publicationSceneCandidate({
        internalCandidate: internalAppearance?.candidate,
        suggestion: result.appearanceSuggestion,
      });
      const written = publicationAppearanceWrite({
        generationId: id,
        storyId: current.id,
        stagedPassageId: stagedConsequence.passageId,
        ...(sceneCandidate !== undefined ? { candidate: sceneCandidate } : {}),
      });
      if (written.passageId !== stagedConsequence.passageId) {
        throw new StoryError('conflict', 'stale_story_revision');
      }
      const passageId = await insertContinuationPassage(tx, {
        storyId: current.id,
        sequence: current.revision + 1,
        transitionId: resolution.operationId,
        sourceGenerationId: id,
        responseSource: null,
        passageId: stagedConsequence.passageId,
        ...(written.appearance ? { appearance: written.appearance } : {}),
        input: {
          expectedRevision: current.revision,
          content: result.scene.content,
          effects: [],
          response: null,
          interaction: null,
          wait: null,
          decision: null,
          sourceGenerationPart: 'current',
        },
        ...(stagedDocuments
          ? {
              contentDocumentHash: stagedDocuments.passageObjectHash,
            }
          : {}),
      });
      if (stagedDocuments) {
        await commitStagedStoryPublication(tx, {
          storyId: current.id,
          operationId: resolution.operationId,
          staged: stagedDocuments,
        });
      }
      if (result.activeScene?.kind === 'restart-at-current') {
        await restartActiveSceneAtPassage(tx, {
          storyId: current.id,
          sequence: current.revision + 1,
          passageId,
          recallCues: activeSceneRecallCues(
            result.documentChanges,
            resolution.operationId,
            task.context.canonicalKnowledge?.catalogue ?? [],
            result.activeScene.recallDocuments,
          ),
        });
      }
      await saveOfferPlans(
        tx,
        current.id,
        current.revision + 1,
        stagedConsequence.offerId,
        stagedConsequence.selectedPlans,
      );
      await tx
        .update(campaign)
        .set({
          offer: stagedConsequence.publicationOffer,
          situationAuthorization: stagedConsequence.situationAuthorization,
        })
        .where(eq(campaign.storyId, current.id));
      const publicationClockMs = await readDatabaseClockMs(tx, current.id);
      await transitionStorytellerHoldToDecision(
        tx,
        campaignState,
        id,
        stagedConsequence.offerId,
        publicationClockMs,
      );
      await captureDelegatedOfferOnPublication(tx, {
        storyId: current.id,
        ownerId: current.ownerId,
        narrativeRevision: current.revision + 1,
        offerId: stagedConsequence.offerId,
        plans: stagedConsequence.selectedPlans,
        clockMs: publicationClockMs,
      });
      await advanceStoryView(tx, {
        storyId: current.id,
        revision: current.revision + 1,
        viewVersion: current.viewVersion + 1,
      });
      await publishStorytellerNotes(tx, {
        storyId: current.id,
        generationId: id,
        passageId,
        revision: current.revision + 1,
        sourcePart: 'current',
        notes: current.continuityNotes,
      });
      let actualAfter;
      try {
        actualAfter = await readSceneAfterState(tx, current.id);
      } catch (error) {
        if (error instanceof SceneAfterStateError) {
          throw new StoryError('conflict', 'stale_story_revision');
        }
        throw error;
      }
      const stagedCheckpoint = stagedConsequence.checkpoint;
      if (stagedCheckpoint.format !== 'offscreen.scene-checkpoint.v2') {
        throw new StoryError('conflict', 'state_not_representable');
      }
      try {
        assertV2PostStateMatches(
          stagedCheckpoint.fictionalState,
          toV2FictionalState(actualAfter),
        );
      } catch {
        throw new StoryError('conflict', 'stale_story_revision');
      }
      await insertStagedSceneCheckpointSelector(tx, {
        ownerId: record.ownerId,
        operationId: resolution.operationId,
        staged: stagedConsequence,
      });
      await setPublication(tx, id, 'published');
      return;
    }
    const proposed = translateGeneratedContinuation({
      output: result.scene,
      generationId: id,
      response: interactionSubmissionSchema.parse(resolution.submission),
      realDurationMs,
    });
    const continuation = continuationSchema.safeParse({
      ...proposed,
      expectedRevision: task.source.narrativeRevision,
    });
    if (!continuation.success) {
      throw new StoryError('invalid');
    }
    await commitStoryContinuation(tx, {
      ownerId: record.ownerId,
      storyId: task.source.storyId,
      transitionId: resolution.operationId,
      input: continuation.data,
      completingIntervalPassageId: undefined,
      completingDecisionPassageId: undefined,
      sourceGenerationId: id,
      restartActiveScene: result.activeScene?.kind === 'restart-at-current',
      ...(result.activeScene?.kind === 'restart-at-current'
        ? {
            activeSceneRecallCues: activeSceneRecallCues(
              result.documentChanges,
              resolution.operationId,
              task.context.canonicalKnowledge?.catalogue ?? [],
              result.activeScene.recallDocuments,
            ),
          }
        : {}),
      ...(stagedDocuments ? { stagedDocuments } : {}),
      ...(stagedContinuation ? { stagedCheckpoint: stagedContinuation } : {}),
    });
    await setPublication(tx, id, 'published');
  });
}
