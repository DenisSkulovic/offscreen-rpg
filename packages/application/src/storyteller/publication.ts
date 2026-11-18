import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { and, eq, inArray } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  campaign,
  campaignConsequence,
  campaignReport,
  gameActionExecution,
  gameActionExecutionEvent,
  gameActionReceipt,
  gameActivity,
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
import { offerSchema } from '@offscreen/game/offers';
import {
  authorizeSituation,
  immediateActionAvailable,
  validateImmediateActionProposal,
  type ImmediateActionPlan,
} from '@offscreen/game/immediate-actions';
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
} from '../stories/continuation';
import {
  lockOwnedStory,
  insertContinuationPassage,
  advanceStoryView,
  incrementStoryViewVersion,
  readDatabaseClockMs,
  restartActiveSceneAtPassage,
} from '../stories/persistence';
import { publicationAppearanceWrite } from '../stories/scene-appearance';
import { publishStorytellerNotes } from './memory';
import { StoryError } from '../stories/errors';
import { continuationSchema } from '../stories/command-policy';
import { saveOfferPlans } from '../campaign/persistence';
import { resolvedActivityPlanSchema } from '@offscreen/game/activities';
import { transitionStorytellerHoldToDecision } from '../campaign/holds';
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

/** Production callers omit `internalAppearance`. An invalid candidate is dropped, not published. */
export async function publishStorytellerResult(
  database: Database,
  id: string,
  realDurationMs: (gameDurationMs: number) => number,
  documentStore?: DocumentStore,
  internalAppearance?: { candidate?: unknown },
) {
  let stagedDocuments: StagedStoryPublication | undefined;
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
        .select({ operationId: storyResolution.operationId })
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
      if (!receipt || execution?.state !== 'settled') return;
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
      const resolutionContext = task.context.resolution;
      if (!resolutionContext) {
        throw new StoryError('invalid');
      }
      const evidenceHandles = new Set(
        task.context.evidence.map((passage) => `p${passage.sequence}`),
      );
      const selectedPlans: ImmediateActionPlan[] = [];
      for (const proposal of result.scene.next.plans) {
        const validation = validateImmediateActionProposal({
          proposal,
          character: resolutionContext.character,
          storyFacts: resolutionContext.storyFacts,
          evidenceHandles,
          requireFactTransitionDeclarations: true,
          allowWorldEffects: false,
        });
        if (validation.kind === 'rejected') {
          throw new StoryError('invalid');
        }
        if (
          !immediateActionAvailable(
            resolutionContext.character,
            resolutionContext.storyFacts,
            validation.plan,
          )
        ) {
          throw new StoryError('invalid');
        }
        let admittedPlan = validation.plan;
        if (admittedPlan.resolution.kind === 'resume') {
          const resume = admittedPlan.resolution;
          const retained = (
            await tx
              .select()
              .from(gameActivity)
              .where(
                and(
                  eq(gameActivity.storyId, current.id),
                  inArray(gameActivity.state, ['encounter', 'suspended']),
                ),
              )
          ).filter((candidate) => {
            if (
              resolvedActivityPlanSchema.parse(candidate.plan).action.id ===
              resume.activityActionId
            ) {
              return (
                resume.activityId === undefined ||
                (candidate.id === resume.activityId &&
                  candidate.revision === resume.activityRevision)
              );
            }
            return false;
          });
          if (retained.length !== 1 || !retained[0]) {
            throw new StoryError('invalid');
          }
          admittedPlan = {
            ...admittedPlan,
            resolution: {
              ...admittedPlan.resolution,
              activityId: retained[0].id,
              activityRevision: retained[0].revision,
            },
          };
        }
        selectedPlans.push(admittedPlan);
      }
      const plannedOffer = offerSchema.parse({
        id: randomUUID(),
        nodes: selectedPlans.map((plan) => {
          return {
            id: plan.key,
            parent: null,
            label: plan.label,
            description: plan.intention,
            risk: plan.risk,
            action: {
              kind: 'attempt',
              timing:
                plan.resolution.kind === 'process' ||
                plan.resolution.kind === 'resume'
                  ? { kind: 'process' }
                  : {
                      kind: 'finite',
                      fictionalSeconds:
                        plan.resolution.fictionalDurationSeconds,
                    },
            },
          };
        }),
      });
      const written = publicationAppearanceWrite({
        generationId: id,
        storyId: current.id,
        ...(stagedDocuments
          ? { stagedPassageId: stagedDocuments.passageId }
          : {}),
        ...(internalAppearance?.candidate !== undefined
          ? { candidate: internalAppearance.candidate }
          : {}),
      });
      const passageId = await insertContinuationPassage(tx, {
        storyId: current.id,
        sequence: current.revision + 1,
        transitionId: resolution.operationId,
        sourceGenerationId: id,
        responseSource: null,
        passageId: written.passageId,
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
      await publishStorytellerNotes(tx, {
        storyId: current.id,
        generationId: id,
        passageId,
        revision: current.revision + 1,
        sourcePart: 'current',
        notes: current.continuityNotes,
      });
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
        plannedOffer.id,
        selectedPlans,
      );
      await tx
        .update(campaign)
        .set({
          offer: plannedOffer,
          situationAuthorization: authorizeSituation(
            selectedPlans,
            plannedOffer.id,
            result.scene.next.activityAccess,
          ),
        })
        .where(eq(campaign.storyId, current.id));
      await transitionStorytellerHoldToDecision(
        tx,
        campaignState,
        id,
        plannedOffer.id,
        await readDatabaseClockMs(tx, current.id),
      );
      await advanceStoryView(tx, {
        storyId: current.id,
        revision: current.revision + 1,
        viewVersion: current.viewVersion + 1,
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
    });
    await setPublication(tx, id, 'published');
  });
}
