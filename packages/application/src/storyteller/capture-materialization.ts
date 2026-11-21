/**
 * ENG03-narrow Stage 2: off-lock CAS materialization and same-G promotion.
 */
import { createHash, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { and, eq, gt, lte } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import {
  campaignConsequence,
  campaignReport,
  gameActionExecution,
  gameActionExecutionEvent,
  gameActionReceipt,
  gameActivity,
  gameRoll,
  worldObligation,
} from '@offscreen/db/campaign-schema';
import { storyPassage, storyResolution } from '@offscreen/db/story-schema';
import { storytellerContextCapture } from '@offscreen/db/storyteller-schema';
import type { DocumentStore } from '@offscreen/documents';
import { passageContentSchema } from '@offscreen/contracts/stories';
import { projectWorldTime } from '@offscreen/game/calendar';
import { contextInputSchema } from '@offscreen/storyteller/context';
import { storytellerTaskSchema } from '@offscreen/storyteller/tasks';
import type { Transaction } from '@offscreen/db/outbox';
import { enqueue } from '@offscreen/db/outbox';
import { lockOwnedStory } from '../stories/persistence';
import { prepareAdmittedStorytellerTask } from './task-admission';
import { loadCanonicalKnowledge } from './canonical-knowledge';
import {
  CONTEXT_CAPTURE_LEASE_MS,
  CONTEXT_CAPTURE_MAX_MATERIALIZATION_ATTEMPTS,
  hashContextCapture,
  parseContextCapture,
  storytellerContextCaptureKind,
  type AnyContextCaptureV1,
  type ActivityConsequenceContextCaptureV1,
  type ActivityHistoricalReportContextCaptureV1,
  type CommittedActionContextCaptureV1,
  type ContextCaptureV1,
  type InterruptedActionContextCaptureV1,
  type WorldObligationConsequenceContextCaptureV1,
  type WorldObligationHistoricalReportContextCaptureV1,
} from './context-capture';
import {
  campaignReportSourceSchema,
  campaignReportSourcesMatch,
} from '../campaign/report-source';
import { activeSceneAnchorSchema } from './context';
import {
  readFrozenStorytellerNoticeTopic,
  selectStorytellerNoticeTopicAtAdmission,
  storytellerKind,
} from './records';
import { actionProjectedStateDigest } from '../campaign/action-overlap';
import { campaign } from '@offscreen/db/campaign-schema';
import { campaignHoldsSchema } from '../campaign/holds';
import { outcomeEffectsSchema } from '@offscreen/game/effects';
import { rollSchema } from '@offscreen/game/checks';
import {
  captureMaterializationStartedKey,
  captureTerminalStageKey,
  recordExecutionStage,
} from './execution-stages';
import { persistPromptProvenance } from './prompt-provenance';

function normalizeActiveSceneScope(scope: unknown) {
  if (scope === null || scope === undefined) return null;
  return activeSceneAnchorSchema.parse(scope);
}

export type MaterializeCaptureResult =
  | { handled: false }
  | { handled: true; outcome: 'promoted' | 'skipped' | 'held' | 'blocked' };

function requestIdentitySha(task: unknown) {
  return createHash('sha256').update(JSON.stringify(task)).digest('hex');
}

async function loadFrozenPassages(
  capture: AnyContextCaptureV1,
  documentStore: DocumentStore,
) {
  const evidence = [];
  for (const source of capture.sourcePassages) {
    if (source.storage === 'inline') {
      evidence.push({
        id: source.passageId,
        sequence: source.sequence,
        content: source.inlineContent,
        response: source.response,
      });
      continue;
    }
    const passage = await documentStore.readSourcePassage(source.contentHash);
    if (passage.envelope.documentId !== source.passageId) {
      throw new Error('corrupt_source');
    }
    if (passage.envelope.kind !== 'source-passage') {
      throw new Error('corrupt_source');
    }
    const coverage = passage.envelope.coverage;
    if (
      !coverage ||
      coverage.fromSequence !== source.sequence ||
      coverage.throughSequence !== source.sequence
    ) {
      throw new Error('source_mismatch');
    }
    evidence.push({
      id: source.passageId,
      sequence: source.sequence,
      content: passageContentSchema.parse(passage.content),
      response: source.response,
    });
  }
  return evidence;
}

async function assemblePendingTaskFromCapture(
  capture: ContextCaptureV1,
  documentStore: DocumentStore,
) {
  const evidence = await loadFrozenPassages(capture, documentStore);
  const current = evidence.find(
    (passage) => passage.sequence === capture.narrativeRevision,
  );
  if (!current || current.id !== capture.passageId) {
    throw new Error('source_mismatch');
  }

  const canonicalKnowledge =
    capture.root.hash === null
      ? undefined
      : await loadCanonicalKnowledge(documentStore, {
          storyId: capture.storyId,
          rootHash: capture.root.hash,
          rootRevision: capture.root.revision,
          librarySectionSelection: capture.canonicalSelection.ruleSections,
          campaignDocumentIds: capture.canonicalSelection.campaignDocumentIds,
          recallCues: capture.activeSceneScope?.recallCues ?? [],
        });

  const compactSettings = (({ time: _time, ...settings }) => settings)(
    capture.settings.capturedSettings,
  );
  const auth = capture.actorAndWorld.offerAndAuthorization;
  const activitySituation = {
    activityAccess: auth.authorization.activityAccess,
    activeActivityId: auth.activeActivityId,
    ...(auth.acceptedPlan ? { acceptedPlan: auth.acceptedPlan } : {}),
    commitments: capture.actorAndWorld.commitments,
  };

  const context = contextInputSchema.parse({
    ...(canonicalKnowledge ? { canonicalKnowledge } : {}),
    ...(capture.activeSceneScope
      ? {
          activeSceneScope: {
            version: 'active-scene.v1' as const,
            fromSequence: capture.activeSceneScope.fromSequence,
            throughSequence: capture.narrativeRevision,
            requiredPassageIds: capture.activeSceneScope.requiredPassageIds,
          },
        }
      : {}),
    activitySituation,
    campaignSettings: compactSettings,
    campaignTime: projectWorldTime(
      capture.settings.capturedSettings.time,
      capture.actorAndWorld.clock.targetGameSecond,
    ),
    worldConditions: capture.actorAndWorld.worldConditions,
    premise: capture.narrative.premise,
    current,
    items: capture.actorAndWorld.itemHolders,
    selected: capture.selected,
    notes: capture.narrative.notes,
    evidence,
    resolution: {
      character: capture.acceptedPendingResult.resolution.character,
      storyFacts: capture.acceptedPendingResult.resolution.storyFacts,
      gameSecond: capture.actorAndWorld.clock.targetGameSecond,
      offer: auth.offer,
      receipts: [
        {
          id: capture.operationId,
          outcome: capture.acceptedPendingResult.resolution.outcome,
          text: capture.acceptedPendingResult.resolution.text,
          roll: capture.acceptedPendingResult.resolution.roll,
          effects: capture.acceptedPendingResult.resolution.effects,
          declarations: capture.acceptedPendingResult.resolution.declarations,
        },
      ],
    },
  });

  return prepareAdmittedStorytellerTask(
    {
      task: 'pending-consequence',
      source: {
        storyId: capture.storyId,
        narrativeRevision: capture.narrativeRevision,
        passageId: capture.passageId,
        executionId: capture.operationId,
        targetGameSecond: capture.actorAndWorld.clock.targetGameSecond,
        projectedStateDigest:
          capture.acceptedPendingResult.projectedStateDigest,
      },
      profile: capture.settings.profile,
      execution: capture.settings.execution,
      context,
    },
    capture.settings.effectiveUsagePolicy,
  );
}

async function assembleCommittedTaskFromCapture(
  capture: CommittedActionContextCaptureV1,
  documentStore: DocumentStore,
) {
  const evidence = await loadFrozenPassages(capture, documentStore);
  const current = evidence.find(
    (passage) => passage.sequence === capture.narrativeRevision,
  );
  if (!current || current.id !== capture.passageId) {
    throw new Error('source_mismatch');
  }

  const canonicalKnowledge =
    capture.root.hash === null
      ? undefined
      : await loadCanonicalKnowledge(documentStore, {
          storyId: capture.storyId,
          rootHash: capture.root.hash,
          rootRevision: capture.root.revision,
          librarySectionSelection: capture.canonicalSelection.ruleSections,
          campaignDocumentIds: capture.canonicalSelection.campaignDocumentIds,
          recallCues: capture.activeSceneScope?.recallCues ?? [],
        });

  const compactSettings = (({ time: _time, ...settings }) => settings)(
    capture.settings.capturedSettings,
  );
  const receipt = capture.acceptedReceipt;

  const context = contextInputSchema.parse({
    ...(canonicalKnowledge ? { canonicalKnowledge } : {}),
    ...(capture.activeSceneScope
      ? {
          activeSceneScope: {
            version: 'active-scene.v1' as const,
            fromSequence: capture.activeSceneScope.fromSequence,
            throughSequence: capture.narrativeRevision,
            requiredPassageIds: capture.activeSceneScope.requiredPassageIds,
          },
        }
      : {}),
    activitySituation: capture.actorAndWorld.activitySituation,
    campaignSettings: compactSettings,
    campaignTime: projectWorldTime(
      capture.settings.capturedSettings.time,
      capture.actorAndWorld.gameSecond,
    ),
    worldConditions: capture.actorAndWorld.worldConditions,
    premise: capture.narrative.premise,
    current,
    items: capture.actorAndWorld.itemHolders,
    selected: capture.selected,
    notes: capture.narrative.notes,
    evidence,
    resolution: {
      character: capture.actorAndWorld.character,
      storyFacts: capture.actorAndWorld.storyFacts,
      gameSecond: capture.actorAndWorld.gameSecond,
      offer: receipt.offer,
      receipts: [
        {
          id: receipt.operationId,
          outcome: receipt.outcome,
          text: receipt.outcomeText,
          roll: receipt.roll,
          effects: receipt.effects,
          declarations: receipt.declarations,
        },
      ],
    },
  });

  return prepareAdmittedStorytellerTask(
    {
      task: 'consequence',
      source: {
        storyId: capture.storyId,
        narrativeRevision: capture.narrativeRevision,
        passageId: capture.passageId,
      },
      profile: capture.settings.profile,
      execution: capture.settings.execution,
      context,
    },
    capture.settings.effectiveUsagePolicy,
  );
}

async function assembleInterruptedTaskFromCapture(
  capture: InterruptedActionContextCaptureV1,
  documentStore: DocumentStore,
) {
  const evidence = await loadFrozenPassages(capture, documentStore);
  const current = evidence.find(
    (passage) => passage.sequence === capture.narrativeRevision,
  );
  if (!current || current.id !== capture.passageId) {
    throw new Error('source_mismatch');
  }

  const canonicalKnowledge =
    capture.root.hash === null
      ? undefined
      : await loadCanonicalKnowledge(documentStore, {
          storyId: capture.storyId,
          rootHash: capture.root.hash,
          rootRevision: capture.root.revision,
          librarySectionSelection: capture.canonicalSelection.ruleSections,
          campaignDocumentIds: capture.canonicalSelection.campaignDocumentIds,
          recallCues: capture.activeSceneScope?.recallCues ?? [],
        });

  const compactSettings = (({ time: _time, ...settings }) => settings)(
    capture.settings.capturedSettings,
  );
  const interruption = capture.interruption;

  const context = contextInputSchema.parse({
    ...(canonicalKnowledge ? { canonicalKnowledge } : {}),
    ...(capture.activeSceneScope
      ? {
          activeSceneScope: {
            version: 'active-scene.v1' as const,
            fromSequence: capture.activeSceneScope.fromSequence,
            throughSequence: capture.narrativeRevision,
            requiredPassageIds: capture.activeSceneScope.requiredPassageIds,
          },
        }
      : {}),
    activitySituation: capture.actorAndWorld.activitySituation,
    campaignSettings: compactSettings,
    campaignTime: projectWorldTime(
      capture.settings.capturedSettings.time,
      capture.actorAndWorld.gameSecond,
    ),
    worldConditions: capture.actorAndWorld.worldConditions,
    premise: capture.narrative.premise,
    current,
    items: capture.actorAndWorld.itemHolders,
    selected: capture.selected,
    notes: capture.narrative.notes,
    evidence,
    resolution: {
      character: capture.actorAndWorld.character,
      storyFacts: capture.actorAndWorld.storyFacts,
      gameSecond: capture.actorAndWorld.gameSecond,
      offer: null,
      receipts: [
        {
          id: interruption.executionId,
          text: interruption.factualText,
          roll: null,
          effects: [],
          declarations: [],
        },
      ],
    },
  });

  return prepareAdmittedStorytellerTask(
    {
      task: 'consequence',
      source: {
        storyId: capture.storyId,
        narrativeRevision: capture.narrativeRevision,
        passageId: capture.passageId,
      },
      profile: capture.settings.profile,
      execution: capture.settings.execution,
      context,
    },
    capture.settings.effectiveUsagePolicy,
  );
}

async function assembleActivityConsequenceTaskFromCapture(
  capture: ActivityConsequenceContextCaptureV1,
  documentStore: DocumentStore,
) {
  const evidence = await loadFrozenPassages(capture, documentStore);
  const current = evidence.find(
    (passage) => passage.sequence === capture.narrativeRevision,
  );
  if (!current || current.id !== capture.passageId) {
    throw new Error('source_mismatch');
  }

  const canonicalKnowledge =
    capture.root.hash === null
      ? undefined
      : await loadCanonicalKnowledge(documentStore, {
          storyId: capture.storyId,
          rootHash: capture.root.hash,
          rootRevision: capture.root.revision,
          librarySectionSelection: capture.canonicalSelection.ruleSections,
          campaignDocumentIds: capture.canonicalSelection.campaignDocumentIds,
          recallCues: capture.activeSceneScope?.recallCues ?? [],
        });

  const compactSettings = (({ time: _time, ...settings }) => settings)(
    capture.settings.capturedSettings,
  );
  const receipt = capture.acceptedReceipt;

  const context = contextInputSchema.parse({
    ...(canonicalKnowledge ? { canonicalKnowledge } : {}),
    ...(capture.activeSceneScope
      ? {
          activeSceneScope: {
            version: 'active-scene.v1' as const,
            fromSequence: capture.activeSceneScope.fromSequence,
            throughSequence: capture.narrativeRevision,
            requiredPassageIds: capture.activeSceneScope.requiredPassageIds,
          },
        }
      : {}),
    activitySituation: capture.actorAndWorld.activitySituation,
    campaignSettings: compactSettings,
    campaignTime: projectWorldTime(
      capture.settings.capturedSettings.time,
      capture.actorAndWorld.gameSecond,
    ),
    worldConditions: capture.actorAndWorld.worldConditions,
    premise: capture.narrative.premise,
    current,
    items: capture.actorAndWorld.itemHolders,
    selected: capture.selected,
    notes: capture.narrative.notes,
    evidence,
    resolution: {
      character: capture.actorAndWorld.character,
      storyFacts: capture.actorAndWorld.storyFacts,
      gameSecond: capture.actorAndWorld.gameSecond,
      offer: capture.actorAndWorld.offer,
      receipts: receipt.rolls.map((roll) => ({
        id: roll.id,
        roll: roll.result,
        effects: roll.effects,
        declarations: [],
      })),
    },
  });

  return prepareAdmittedStorytellerTask(
    {
      task: 'consequence',
      source: {
        storyId: capture.storyId,
        narrativeRevision: capture.narrativeRevision,
        passageId: capture.passageId,
      },
      profile: capture.settings.profile,
      execution: capture.settings.execution,
      context,
    },
    capture.settings.effectiveUsagePolicy,
  );
}

async function assembleWorldObligationTaskFromCapture(
  capture: WorldObligationConsequenceContextCaptureV1,
  documentStore: DocumentStore,
) {
  const evidence = await loadFrozenPassages(capture, documentStore);
  const current = evidence.find(
    (passage) => passage.sequence === capture.narrativeRevision,
  );
  if (!current || current.id !== capture.passageId) {
    throw new Error('source_mismatch');
  }

  const canonicalKnowledge =
    capture.root.hash === null
      ? undefined
      : await loadCanonicalKnowledge(documentStore, {
          storyId: capture.storyId,
          rootHash: capture.root.hash,
          rootRevision: capture.root.revision,
          librarySectionSelection: capture.canonicalSelection.ruleSections,
          campaignDocumentIds: capture.canonicalSelection.campaignDocumentIds,
          recallCues: capture.activeSceneScope?.recallCues ?? [],
        });

  const compactSettings = (({ time: _time, ...settings }) => settings)(
    capture.settings.capturedSettings,
  );
  const receipt = capture.acceptedReceipt;

  const context = contextInputSchema.parse({
    ...(canonicalKnowledge ? { canonicalKnowledge } : {}),
    ...(capture.activeSceneScope
      ? {
          activeSceneScope: {
            version: 'active-scene.v1' as const,
            fromSequence: capture.activeSceneScope.fromSequence,
            throughSequence: capture.narrativeRevision,
            requiredPassageIds: capture.activeSceneScope.requiredPassageIds,
          },
        }
      : {}),
    activitySituation: capture.actorAndWorld.activitySituation,
    campaignSettings: compactSettings,
    campaignTime: projectWorldTime(
      capture.settings.capturedSettings.time,
      capture.actorAndWorld.gameSecond,
    ),
    worldConditions: capture.actorAndWorld.worldConditions,
    premise: capture.narrative.premise,
    current,
    items: capture.actorAndWorld.itemHolders,
    selected: capture.selected,
    notes: capture.narrative.notes,
    evidence,
    resolution: {
      character: capture.actorAndWorld.character,
      storyFacts: capture.actorAndWorld.storyFacts,
      gameSecond: capture.actorAndWorld.gameSecond,
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
  });

  return prepareAdmittedStorytellerTask(
    {
      task: 'consequence',
      source: {
        storyId: capture.storyId,
        narrativeRevision: capture.narrativeRevision,
        passageId: capture.passageId,
      },
      profile: capture.settings.profile,
      execution: capture.settings.execution,
      context,
    },
    capture.settings.effectiveUsagePolicy,
  );
}

async function assembleActivityHistoricalReportTaskFromCapture(
  capture: ActivityHistoricalReportContextCaptureV1,
  documentStore: DocumentStore,
) {
  if (
    capture.root.hash === null &&
    capture.sourcePassages.some((passage) => passage.storage === 'cas')
  ) {
    throw new Error('missing_historical_root');
  }
  const evidence = await loadFrozenPassages(capture, documentStore);
  const current = evidence.find(
    (passage) => passage.sequence === capture.narrativeRevision,
  );
  if (!current || current.id !== capture.passageId) {
    throw new Error('source_mismatch');
  }

  const canonicalKnowledge =
    capture.root.hash === null
      ? undefined
      : await loadCanonicalKnowledge(documentStore, {
          storyId: capture.storyId,
          rootHash: capture.root.hash,
          rootRevision: capture.root.revision,
          librarySectionSelection: capture.canonicalSelection.ruleSections,
          campaignDocumentIds: capture.canonicalSelection.campaignDocumentIds,
          recallCues: capture.activeSceneScope?.recallCues ?? [],
        });

  const compactSettings = (({ time: _time, ...settings }) => settings)(
    capture.settings.capturedSettings,
  );
  const event = capture.acceptedEvent;

  const context = contextInputSchema.parse({
    ...(canonicalKnowledge ? { canonicalKnowledge } : {}),
    ...(capture.activeSceneScope
      ? {
          activeSceneScope: {
            version: 'active-scene.v1' as const,
            fromSequence: capture.activeSceneScope.fromSequence,
            throughSequence: capture.narrativeRevision,
            requiredPassageIds: capture.activeSceneScope.requiredPassageIds,
          },
        }
      : {}),
    activitySituation: capture.actorAndWorld.activitySituation,
    campaignSettings: compactSettings,
    campaignTime: projectWorldTime(
      capture.settings.capturedSettings.time,
      event.sourceGameSecond,
    ),
    worldConditions: capture.actorAndWorld.worldConditions,
    premise: capture.narrative.premise,
    current,
    items: capture.actorAndWorld.itemHolders,
    selected: capture.selected,
    notes: capture.narrative.notes,
    evidence,
    resolution: {
      character: capture.actorAndWorld.character,
      storyFacts: capture.actorAndWorld.storyFacts,
      gameSecond: event.sourceGameSecond,
      offer: capture.actorAndWorld.offer,
      receipts: [
        {
          id: capture.reportHookId,
          text: event.factualSummary,
          roll: null,
          effects: event.effects,
          declarations: [],
        },
        ...event.rolls.map((roll) => ({
          id: roll.id,
          roll: roll.roll,
          effects: roll.effects,
          declarations: [],
        })),
      ],
    },
  });

  return prepareAdmittedStorytellerTask(
    {
      task: 'report',
      source: {
        storyId: capture.storyId,
        narrativeRevision: capture.narrativeRevision,
        passageId: capture.passageId,
        hookId: capture.reportHookId,
      },
      profile: capture.settings.profile,
      execution: capture.settings.execution,
      context,
    },
    capture.settings.effectiveUsagePolicy,
  );
}

async function assembleWorldObligationHistoricalReportTaskFromCapture(
  capture: WorldObligationHistoricalReportContextCaptureV1,
  documentStore: DocumentStore,
) {
  if (
    capture.root.hash === null &&
    capture.sourcePassages.some((passage) => passage.storage === 'cas')
  ) {
    throw new Error('missing_historical_root');
  }
  const evidence = await loadFrozenPassages(capture, documentStore);
  const current = evidence.find(
    (passage) => passage.sequence === capture.narrativeRevision,
  );
  if (!current || current.id !== capture.passageId) {
    throw new Error('source_mismatch');
  }

  const canonicalKnowledge =
    capture.root.hash === null
      ? undefined
      : await loadCanonicalKnowledge(documentStore, {
          storyId: capture.storyId,
          rootHash: capture.root.hash,
          rootRevision: capture.root.revision,
          librarySectionSelection: capture.canonicalSelection.ruleSections,
          campaignDocumentIds: capture.canonicalSelection.campaignDocumentIds,
          recallCues: capture.activeSceneScope?.recallCues ?? [],
        });

  const compactSettings = (({ time: _time, ...settings }) => settings)(
    capture.settings.capturedSettings,
  );
  const event = capture.acceptedEvent;

  const context = contextInputSchema.parse({
    ...(canonicalKnowledge ? { canonicalKnowledge } : {}),
    ...(capture.activeSceneScope
      ? {
          activeSceneScope: {
            version: 'active-scene.v1' as const,
            fromSequence: capture.activeSceneScope.fromSequence,
            throughSequence: capture.narrativeRevision,
            requiredPassageIds: capture.activeSceneScope.requiredPassageIds,
          },
        }
      : {}),
    activitySituation: capture.actorAndWorld.activitySituation,
    campaignSettings: compactSettings,
    campaignTime: projectWorldTime(
      capture.settings.capturedSettings.time,
      event.sourceGameSecond,
    ),
    worldConditions: capture.actorAndWorld.worldConditions,
    premise: capture.narrative.premise,
    current,
    items: capture.actorAndWorld.itemHolders,
    selected: capture.selected,
    notes: capture.narrative.notes,
    evidence,
    resolution: {
      character: capture.actorAndWorld.character,
      storyFacts: capture.actorAndWorld.storyFacts,
      gameSecond: event.sourceGameSecond,
      offer: null,
      receipts: [
        {
          id: capture.reportHookId,
          text: event.factualSummary,
          roll: null,
          effects: [],
          declarations: [],
        },
      ],
    },
  });

  return prepareAdmittedStorytellerTask(
    {
      task: 'report',
      source: {
        storyId: capture.storyId,
        narrativeRevision: capture.narrativeRevision,
        passageId: capture.passageId,
        hookId: capture.reportHookId,
      },
      profile: capture.settings.profile,
      execution: capture.settings.execution,
      context,
    },
    capture.settings.effectiveUsagePolicy,
  );
}

async function assembleTaskFromCapture(
  capture: AnyContextCaptureV1,
  documentStore: DocumentStore,
) {
  if (capture.purpose === 'pending-consequence') {
    return assemblePendingTaskFromCapture(capture, documentStore);
  }
  if (capture.purpose === 'historical-report') {
    if (capture.sourceKind === 'campaign-activity-report') {
      return assembleActivityHistoricalReportTaskFromCapture(
        capture,
        documentStore,
      );
    }
    if (capture.sourceKind === 'campaign-world-obligation-report') {
      return assembleWorldObligationHistoricalReportTaskFromCapture(
        capture,
        documentStore,
      );
    }
    throw new Error('capture_purpose_mismatch');
  }
  if (capture.sourceKind === 'action-interrupted') {
    return assembleInterruptedTaskFromCapture(capture, documentStore);
  }
  if (capture.sourceKind === 'campaign-activity') {
    return assembleActivityConsequenceTaskFromCapture(capture, documentStore);
  }
  if (capture.sourceKind === 'campaign-world-obligation') {
    return assembleWorldObligationTaskFromCapture(capture, documentStore);
  }
  return assembleCommittedTaskFromCapture(capture, documentStore);
}

async function claimCaptureLease(
  database: Database,
  operationId: string,
): Promise<
  | { claimed: false; reason: 'missing' | 'terminal' | 'busy' | 'exhausted' }
  | {
      claimed: true;
      captureId: string;
      leaseId: string;
      capture: AnyContextCaptureV1;
      attempts: number;
      rearmEpoch: number;
    }
> {
  const leaseId = randomUUID();
  const expiresAt = new Date(Date.now() + CONTEXT_CAPTURE_LEASE_MS);
  return database.db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.operationId, operationId))
      .for('update');
    if (!row) return { claimed: false as const, reason: 'missing' as const };
    if (
      row.state === 'ready' ||
      row.state === 'held' ||
      row.state === 'stale' ||
      row.state === 'blocked'
    ) {
      return { claimed: false as const, reason: 'terminal' as const };
    }
    if (
      row.materializationAttempts >=
      CONTEXT_CAPTURE_MAX_MATERIALIZATION_ATTEMPTS
    ) {
      return { claimed: false as const, reason: 'exhausted' as const };
    }
    const leaseLive =
      row.state === 'materializing' &&
      row.leaseExpiresAt !== null &&
      row.leaseExpiresAt.getTime() > Date.now();
    if (leaseLive) {
      return { claimed: false as const, reason: 'busy' as const };
    }
    const capture = parseContextCapture(row.capture);
    if (hashContextCapture(capture) !== row.captureSha256) {
      await tx
        .update(storytellerContextCapture)
        .set({
          state: 'blocked',
          failureCode: 'corrupt_capture',
          leaseId: null,
          leaseExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(storytellerContextCapture.captureId, row.captureId));
      return { claimed: false as const, reason: 'terminal' as const };
    }
    const nextAttempts = row.materializationAttempts + 1;
    const rearmEpoch = row.rearmEpoch;
    await tx
      .update(storytellerContextCapture)
      .set({
        state: 'materializing',
        materializationAttempts: nextAttempts,
        leaseId,
        leaseExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(storytellerContextCapture.captureId, row.captureId));
    await recordExecutionStage(tx, {
      generationId: row.captureId,
      stage: 'context-materialization-started',
      outcome: 'completed',
      idempotencyKey: captureMaterializationStartedKey(
        rearmEpoch,
        nextAttempts,
      ),
      operationId: row.operationId,
      sourceKind: 'context-capture',
      sourceId: row.captureId,
    });
    return {
      claimed: true as const,
      captureId: row.captureId,
      leaseId,
      capture,
      attempts: nextAttempts,
      rearmEpoch,
    };
  });
}

/** OBS02-H: lease-fenced terminal release; losers return lease-lost with no stage. */
export async function releaseCaptureFailure(
  database: Database,
  input: {
    captureId: string;
    leaseId: string;
    attempts: number;
    rearmEpoch: number;
    code: string;
  },
): Promise<
  | { applied: false; reason: 'lease-lost' }
  | {
      applied: true;
      state: 'captured' | 'held' | 'blocked' | 'stale';
    }
> {
  const terminalBlocked =
    input.code === 'corrupt_source' ||
    input.code === 'source_mismatch' ||
    input.code === 'context_too_large' ||
    input.code === 'receipt_mismatch' ||
    input.code === 'capture_interrupted';
  const terminalStale = input.code.startsWith('stale_source');
  const exhausted =
    input.attempts >= CONTEXT_CAPTURE_MAX_MATERIALIZATION_ATTEMPTS;
  const state = terminalStale
    ? ('stale' as const)
    : terminalBlocked || exhausted
      ? terminalBlocked
        ? ('blocked' as const)
        : ('held' as const)
      : ('captured' as const);
  return database.db.transaction(async (tx) => {
    const updated = await tx
      .update(storytellerContextCapture)
      .set({
        state,
        failureCode: input.code,
        leaseId: null,
        leaseExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(storytellerContextCapture.captureId, input.captureId),
          eq(storytellerContextCapture.leaseId, input.leaseId),
        ),
      )
      .returning({
        captureId: storytellerContextCapture.captureId,
        rearmEpoch: storytellerContextCapture.rearmEpoch,
      });
    if (!updated.length) {
      return { applied: false as const, reason: 'lease-lost' as const };
    }
    if (state === 'held' || state === 'blocked' || state === 'stale') {
      await recordExecutionStage(tx, {
        generationId: input.captureId,
        stage: state === 'held' ? 'stage-held' : 'stage-failed',
        outcome:
          state === 'held' ? 'held' : state === 'stale' ? 'stale' : 'failed',
        idempotencyKey: captureTerminalStageKey(
          input.rearmEpoch,
          input.attempts,
          state,
        ),
        sourceKind: 'context-capture',
        sourceId: input.captureId,
        failureClass: input.code,
      });
    }
    return { applied: true as const, state };
  });
}

async function promoteCapture(
  tx: Transaction,
  input: {
    capture: AnyContextCaptureV1;
    leaseId: string;
    task: ReturnType<typeof prepareAdmittedStorytellerTask>;
    requestSha: string;
  },
) {
  const capture = input.capture;
  const current = await lockOwnedStory(tx, {
    storyId: capture.storyId,
    ownerId: capture.ownerId,
  });
  const historicalReport = capture.purpose === 'historical-report';
  if (!historicalReport) {
    if (current.revision !== capture.narrativeRevision) {
      throw new Error('stale_source:revision');
    }
    if (
      (capture.root.hash === null && current.documentRootHash !== null) ||
      (capture.root.hash !== null &&
        (current.documentRootHash !== capture.root.hash ||
          current.documentRootRevision !== capture.root.revision))
    ) {
      throw new Error('stale_source:root');
    }
    if (
      !isDeepStrictEqual(
        normalizeActiveSceneScope(current.activeSceneScope),
        normalizeActiveSceneScope(capture.activeSceneScope),
      )
    ) {
      throw new Error('stale_source:scene');
    }
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
  if (!basePassage) throw new Error('stale_source:passage');

  const [generationRow] = await tx
    .select()
    .from(generation)
    .where(
      and(
        eq(generation.id, capture.captureId),
        eq(generation.kind, storytellerContextCaptureKind),
        eq(generation.state, 'pending'),
      ),
    )
    .for('update');
  if (!generationRow) throw new Error('capture_generation_missing');

  const [resolution] = await tx
    .select()
    .from(storyResolution)
    .where(eq(storyResolution.generationId, capture.captureId));
  if (
    !resolution ||
    resolution.storyId !== capture.storyId ||
    resolution.basePassageId !== capture.passageId ||
    resolution.baseRevision !== capture.narrativeRevision
  ) {
    throw new Error('capture_resolution_mismatch');
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
      throw new Error('capture_execution_mismatch');
    }
    if (execution.state === 'interrupted') {
      throw new Error('capture_interrupted');
    }
    const [receipt] = await tx
      .select()
      .from(gameActionReceipt)
      .where(eq(gameActionReceipt.operationId, capture.operationId));
    if (receipt && receipt.generationId !== capture.captureId) {
      throw new Error('receipt_mismatch');
    }
  } else if (capture.sourceKind === 'action-interrupted') {
    const [execution] = await tx
      .select()
      .from(gameActionExecution)
      .where(eq(gameActionExecution.operationId, capture.operationId))
      .for('update');
    if (
      !execution ||
      execution.state !== 'interrupted' ||
      execution.revision !== capture.interruption.executionRevision ||
      execution.storyId !== capture.storyId ||
      execution.preparationGenerationId !== null
    ) {
      throw new Error('capture_execution_mismatch');
    }
    const [successReceipt] = await tx
      .select({ operationId: gameActionReceipt.operationId })
      .from(gameActionReceipt)
      .where(eq(gameActionReceipt.operationId, capture.operationId));
    if (successReceipt) {
      throw new Error('receipt_mismatch');
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
      throw new Error('capture_event_mismatch');
    }
    const [consequence] = await tx
      .select()
      .from(campaignConsequence)
      .where(eq(campaignConsequence.operationId, capture.operationId));
    if (!consequence || consequence.generationId !== capture.captureId) {
      throw new Error('consequence_mismatch');
    }
    const [campaignState] = await tx
      .select()
      .from(campaign)
      .where(eq(campaign.storyId, capture.storyId));
    if (
      !campaignState ||
      actionProjectedStateDigest({
        character: campaignState.character,
        storyFacts: campaignState.storyFacts,
        gameSecond: campaignState.gameSecond,
      }) !== capture.actorAndWorld.postInterruptStateDigest
    ) {
      throw new Error('stale_source:actor');
    }
  } else if (capture.sourceKind === 'campaign-activity') {
    const [consequence] = await tx
      .select()
      .from(campaignConsequence)
      .where(eq(campaignConsequence.operationId, capture.operationId))
      .for('update');
    const expected = capture.acceptedReceipt;
    const stored =
      consequence?.receipt &&
      typeof consequence.receipt === 'object' &&
      'kind' in consequence.receipt &&
      (consequence.receipt as { kind?: string }).kind === 'activity'
        ? (consequence.receipt as typeof expected)
        : null;
    if (
      !consequence ||
      consequence.generationId !== capture.captureId ||
      consequence.storyId !== capture.storyId ||
      consequence.baseRevision !== capture.narrativeRevision ||
      !stored ||
      stored.passageId !== expected.passageId ||
      stored.operationId !== expected.operationId ||
      stored.afterSegment !== expected.afterSegment ||
      stored.throughSegment !== expected.throughSegment ||
      stored.label !== expected.label ||
      stored.intention !== expected.intention
    ) {
      throw new Error('consequence_mismatch');
    }
    const rolls = await tx
      .select()
      .from(gameRoll)
      .where(
        and(
          eq(gameRoll.storyId, capture.storyId),
          eq(gameRoll.operationId, capture.operationId),
          gt(gameRoll.segment, expected.afterSegment),
          lte(gameRoll.segment, expected.throughSegment),
        ),
      )
      .orderBy(gameRoll.segment, gameRoll.checkKey);
    if (
      rolls.length !== expected.rolls.length ||
      rolls.some((roll, index) => {
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
      })
    ) {
      throw new Error('receipt_mismatch');
    }
    const [campaignState] = await tx
      .select()
      .from(campaign)
      .where(eq(campaign.storyId, capture.storyId));
    const holds = campaignState
      ? campaignHoldsSchema.parse(campaignState.holds)
      : [];
    if (
      !campaignState ||
      !holds.some(
        (hold) =>
          hold.kind === 'storyteller' &&
          hold.generationId === capture.captureId,
      ) ||
      actionProjectedStateDigest({
        character: campaignState.character,
        storyFacts: campaignState.storyFacts,
        gameSecond: campaignState.gameSecond,
      }) !== capture.actorAndWorld.postSettlementStateDigest
    ) {
      throw new Error('stale_source:actor');
    }
  } else if (capture.sourceKind === 'campaign-world-obligation') {
    const [consequence] = await tx
      .select()
      .from(campaignConsequence)
      .where(eq(campaignConsequence.operationId, capture.operationId))
      .for('update');
    const expected = capture.acceptedReceipt;
    const stored =
      consequence?.receipt &&
      typeof consequence.receipt === 'object' &&
      'kind' in consequence.receipt &&
      (consequence.receipt as { kind?: string }).kind === 'world-obligation'
        ? (consequence.receipt as typeof expected)
        : null;
    if (
      !consequence ||
      consequence.generationId !== capture.captureId ||
      consequence.storyId !== capture.storyId ||
      consequence.baseRevision !== capture.narrativeRevision ||
      !stored ||
      stored.passageId !== expected.passageId ||
      stored.operationId !== expected.operationId ||
      stored.label !== expected.label ||
      stored.intention !== expected.intention ||
      !isDeepStrictEqual(stored.obligationIds, expected.obligationIds)
    ) {
      throw new Error('consequence_mismatch');
    }
    const [campaignState] = await tx
      .select()
      .from(campaign)
      .where(eq(campaign.storyId, capture.storyId));
    const holds = campaignState
      ? campaignHoldsSchema.parse(campaignState.holds)
      : [];
    if (
      !campaignState ||
      !holds.some(
        (hold) =>
          hold.kind === 'storyteller' &&
          hold.generationId === capture.captureId,
      ) ||
      holds.some(
        (hold) =>
          hold.kind === 'world-obligation' &&
          hold.obligationId === capture.operationId,
      ) ||
      actionProjectedStateDigest({
        character: campaignState.character,
        storyFacts: campaignState.storyFacts,
        gameSecond: campaignState.gameSecond,
      }) !== capture.actorAndWorld.postSettlementStateDigest
    ) {
      throw new Error('stale_source:actor');
    }
  } else if (capture.sourceKind === 'campaign-activity-report') {
    const reportCapture = capture as ActivityHistoricalReportContextCaptureV1;
    const [hook] = await tx
      .select()
      .from(campaignReport)
      .where(eq(campaignReport.id, reportCapture.reportHookId))
      .for('update');
    const hookSource = hook?.source
      ? campaignReportSourceSchema.parse(hook.source)
      : null;
    if (
      !hook ||
      hook.storyId !== capture.storyId ||
      hook.generationId !== capture.captureId ||
      hook.sourceKey !== reportCapture.sourceKey ||
      !hookSource ||
      !campaignReportSourcesMatch(hookSource, reportCapture.reportSource) ||
      hook.sourcePassageId !== capture.passageId ||
      hook.sourceRevision !== capture.narrativeRevision ||
      hook.sourceGameSecond !== reportCapture.acceptedEvent.sourceGameSecond ||
      hook.label !== reportCapture.acceptedEvent.label ||
      hook.factualSummary !== reportCapture.acceptedEvent.factualSummary
    ) {
      throw new Error('report_mismatch');
    }
    if (reportCapture.reportSource.kind !== 'activity') {
      throw new Error('report_mismatch');
    }
    const reportActivitySource = reportCapture.reportSource;
    const [activity] = await tx
      .select({ revision: gameActivity.revision })
      .from(gameActivity)
      .where(
        and(
          eq(gameActivity.id, reportActivitySource.activityId),
          eq(gameActivity.storyId, capture.storyId),
        ),
      );
    if (
      !activity ||
      activity.revision !== reportActivitySource.activityRevision
    ) {
      throw new Error('activity_source_mismatch');
    }
    const rolls = await tx
      .select()
      .from(gameRoll)
      .where(eq(gameRoll.operationId, reportActivitySource.activityId))
      .orderBy(gameRoll.segment, gameRoll.checkKey);
    const expected = reportCapture.acceptedEvent.rolls;
    if (
      rolls.length !== expected.length ||
      rolls.some((roll, index) => {
        const frozen = expected[index];
        return (
          !frozen ||
          roll.id !== frozen.id ||
          !isDeepStrictEqual(rollSchema.parse(roll.result), frozen.roll) ||
          !isDeepStrictEqual(
            outcomeEffectsSchema.parse(roll.effects),
            frozen.effects,
          )
        );
      })
    ) {
      throw new Error('receipt_mismatch');
    }
  } else if (capture.sourceKind === 'campaign-world-obligation-report') {
    const reportCapture =
      capture as WorldObligationHistoricalReportContextCaptureV1;
    const [hook] = await tx
      .select()
      .from(campaignReport)
      .where(eq(campaignReport.id, reportCapture.reportHookId))
      .for('update');
    const hookSource = hook?.source
      ? campaignReportSourceSchema.parse(hook.source)
      : null;
    if (
      !hook ||
      hook.storyId !== capture.storyId ||
      hook.generationId !== capture.captureId ||
      hook.sourceKey !== reportCapture.sourceKey ||
      !hookSource ||
      !campaignReportSourcesMatch(hookSource, reportCapture.reportSource) ||
      hook.sourcePassageId !== capture.passageId ||
      hook.sourceRevision !== capture.narrativeRevision ||
      hook.sourceGameSecond !== reportCapture.acceptedEvent.sourceGameSecond ||
      hook.label !== reportCapture.acceptedEvent.label ||
      hook.factualSummary !== reportCapture.acceptedEvent.factualSummary
    ) {
      throw new Error('report_mismatch');
    }
    if (reportCapture.reportSource.kind !== 'world-obligation') {
      throw new Error('report_mismatch');
    }
    const reportObligationSource = reportCapture.reportSource;
    const [obligation] = await tx
      .select({ revision: worldObligation.revision })
      .from(worldObligation)
      .where(
        and(
          eq(worldObligation.id, reportObligationSource.obligationId),
          eq(worldObligation.storyId, capture.storyId),
        ),
      );
    if (
      !obligation ||
      obligation.revision !== reportObligationSource.obligationRevision
    ) {
      throw new Error('obligation_source_mismatch');
    }
  } else if (capture.sourceKind === 'action-receipt') {
    const [receipt] = await tx
      .select()
      .from(gameActionReceipt)
      .where(eq(gameActionReceipt.operationId, capture.operationId))
      .for('update');
    if (
      !receipt ||
      receipt.generationId !== capture.captureId ||
      receipt.storyId !== capture.storyId ||
      receipt.baseRevision !== capture.narrativeRevision ||
      receipt.operationId !== capture.acceptedReceipt.operationId ||
      receipt.outcome !== capture.acceptedReceipt.outcome ||
      receipt.outcomeText !== capture.acceptedReceipt.outcomeText
    ) {
      throw new Error('receipt_mismatch');
    }
    if (
      !isDeepStrictEqual(receipt.offer, capture.acceptedReceipt.offer) ||
      !isDeepStrictEqual(receipt.plan, capture.acceptedReceipt.plan) ||
      !isDeepStrictEqual(receipt.effects, capture.acceptedReceipt.effects) ||
      !isDeepStrictEqual(
        receipt.declarations,
        capture.acceptedReceipt.declarations,
      ) ||
      !isDeepStrictEqual(receipt.roll, capture.acceptedReceipt.roll)
    ) {
      throw new Error('receipt_mismatch');
    }
    const [campaignState] = await tx
      .select()
      .from(campaign)
      .where(eq(campaign.storyId, capture.storyId));
    if (
      !campaignState ||
      actionProjectedStateDigest({
        character: campaignState.character,
        storyFacts: campaignState.storyFacts,
        gameSecond: campaignState.gameSecond,
      }) !== capture.actorAndWorld.postSettlementStateDigest
    ) {
      throw new Error('stale_source:actor');
    }
  } else {
    throw new Error('capture_purpose_mismatch');
  }

  const task = storytellerTaskSchema.parse(input.task);
  await tx
    .update(generation)
    .set({
      kind: storytellerKind,
      input: task,
      updatedAt: new Date(),
    })
    .where(eq(generation.id, capture.captureId));
  await tx
    .update(storytellerContextCapture)
    .set({
      state: 'ready',
      leaseId: null,
      leaseExpiresAt: null,
      materializedRequestSha256: input.requestSha,
      failureCode: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(storytellerContextCapture.captureId, capture.captureId),
        eq(storytellerContextCapture.leaseId, input.leaseId),
      ),
    );
  await recordExecutionStage(tx, {
    generationId: capture.captureId,
    stage: 'context-materialization-completed',
    outcome: 'completed',
    idempotencyKey: 'context-materialization-completed',
    operationId: capture.operationId,
    sourceKind: 'context-capture',
    sourceId: capture.captureId,
    sourceSha256: input.requestSha,
  });
  await persistPromptProvenance(tx, {
    generationId: capture.captureId,
    task,
    captureStatus: 'promoted',
  });
  const storytellerTopic =
    (await readFrozenStorytellerNoticeTopic(tx, capture.captureId)) ??
    selectStorytellerNoticeTopicAtAdmission();
  await enqueue(tx, {
    id: randomUUID(),
    operationId: capture.captureId,
    topic: storytellerTopic,
  });
}

/** Terminal skip on ready+promoted pending G: wake completeStoryteller. */
async function enqueueStorytellerIfReadyPromoted(
  database: Database,
  operationId: string,
): Promise<void> {
  await database.db.transaction(async (tx) => {
    const [capture] = await tx
      .select({
        captureId: storytellerContextCapture.captureId,
        state: storytellerContextCapture.state,
      })
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.operationId, operationId));
    if (!capture || capture.state !== 'ready') return;
    const [gen] = await tx
      .select({ kind: generation.kind, state: generation.state })
      .from(generation)
      .where(eq(generation.id, capture.captureId));
    if (!gen || gen.kind !== storytellerKind || gen.state !== 'pending') {
      return;
    }
    const storytellerTopic =
      (await readFrozenStorytellerNoticeTopic(tx, capture.captureId)) ??
      selectStorytellerNoticeTopicAtAdmission();
    await enqueue(tx, {
      id: randomUUID(),
      operationId: capture.captureId,
      topic: storytellerTopic,
    });
  });
}

/**
 * Capture-first Stage-2 branch for campaign.consequence.v1 wakes.
 * Returns handled:false when no capture row exists for the operation.
 */
export async function materializePendingActionCapture(
  database: Database,
  operationId: string,
  documentStore?: DocumentStore,
): Promise<MaterializeCaptureResult> {
  const claim = await claimCaptureLease(database, operationId);
  if (!claim.claimed) {
    if (claim.reason === 'missing') return { handled: false };
    if (claim.reason === 'terminal') {
      await enqueueStorytellerIfReadyPromoted(database, operationId);
    }
    return { handled: true, outcome: 'skipped' };
  }
  if (!documentStore) {
    const released = await releaseCaptureFailure(database, {
      captureId: claim.captureId,
      leaseId: claim.leaseId,
      attempts: claim.attempts,
      rearmEpoch: claim.rearmEpoch,
      code: 'document_store',
    });
    if (!released.applied) {
      return { handled: true, outcome: 'skipped' };
    }
    return { handled: true, outcome: 'held' };
  }

  let task: ReturnType<typeof prepareAdmittedStorytellerTask>;
  try {
    task = await assembleTaskFromCapture(claim.capture, documentStore);
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message === 'context_too_large'
          ? 'context_too_large'
          : error.message === 'corrupt_source' ||
              error.message === 'source_mismatch' ||
              error.message === 'missing_historical_root'
            ? error.message
            : 'missing_source'
        : 'materialization_failed';
    const released = await releaseCaptureFailure(database, {
      captureId: claim.captureId,
      leaseId: claim.leaseId,
      attempts: claim.attempts,
      rearmEpoch: claim.rearmEpoch,
      code,
    });
    if (!released.applied) {
      return { handled: true, outcome: 'skipped' };
    }
    return {
      handled: true,
      outcome:
        released.state === 'blocked' || released.state === 'stale'
          ? 'blocked'
          : 'held',
    };
  }

  const requestSha = requestIdentitySha(task);
  try {
    await database.db.transaction(async (tx) => {
      await promoteCapture(tx, {
        capture: claim.capture,
        leaseId: claim.leaseId,
        task,
        requestSha,
      });
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'promotion_failed';
    const released = await releaseCaptureFailure(database, {
      captureId: claim.captureId,
      leaseId: claim.leaseId,
      attempts: claim.attempts,
      rearmEpoch: claim.rearmEpoch,
      code,
    });
    if (!released.applied) {
      return { handled: true, outcome: 'skipped' };
    }
    return {
      handled: true,
      outcome:
        released.state === 'blocked' || released.state === 'stale'
          ? 'blocked'
          : 'held',
    };
  }
  return { handled: true, outcome: 'promoted' };
}

export { isProvisionalContextCapture } from '../campaign/storyteller-wake';
