/**
 * ENG03-narrow Stage 2: off-lock CAS materialization and same-G promotion.
 */
import { createHash, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { and, eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import {
  gameActionExecution,
  gameActionReceipt,
} from '@offscreen/db/campaign-schema';
import { storyPassage, storyResolution } from '@offscreen/db/story-schema';
import { storytellerContextCapture } from '@offscreen/db/storyteller-schema';
import type { DocumentStore } from '@offscreen/documents';
import { passageContentSchema } from '@offscreen/contracts/stories';
import { projectWorldTime } from '@offscreen/game/calendar';
import { contextInputSchema } from '@offscreen/storyteller/context';
import { storytellerTaskSchema } from '@offscreen/storyteller/tasks';
import type { Transaction } from '../outbox/index';
import { enqueue } from '../outbox/index';
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
  type CommittedActionContextCaptureV1,
  type ContextCaptureV1,
} from './context-capture';
import { activeSceneAnchorSchema } from './context';
import { storytellerKind, storytellerTopic } from './records';
import { actionProjectedStateDigest } from '../campaign/action-overlap';
import { campaign } from '@offscreen/db/campaign-schema';

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

async function assembleTaskFromCapture(
  capture: AnyContextCaptureV1,
  documentStore: DocumentStore,
) {
  if (capture.purpose === 'consequence') {
    return assembleCommittedTaskFromCapture(capture, documentStore);
  }
  return assemblePendingTaskFromCapture(capture, documentStore);
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
      row.materializationAttempts >= CONTEXT_CAPTURE_MAX_MATERIALIZATION_ATTEMPTS
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
    return {
      claimed: true as const,
      captureId: row.captureId,
      leaseId,
      capture,
      attempts: nextAttempts,
    };
  });
}

async function releaseCaptureFailure(
  database: Database,
  input: {
    captureId: string;
    leaseId: string;
    attempts: number;
    code: string;
  },
) {
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
  await database.db
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
    );
  return state;
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
  } else {
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
  await enqueue(tx, {
    id: randomUUID(),
    operationId: capture.captureId,
    topic: storytellerTopic,
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
    return { handled: true, outcome: 'skipped' };
  }
  if (!documentStore) {
    await releaseCaptureFailure(database, {
      captureId: claim.captureId,
      leaseId: claim.leaseId,
      attempts: claim.attempts,
      code: 'document_store',
    });
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
              error.message === 'source_mismatch'
            ? error.message
            : 'missing_source'
        : 'materialization_failed';
    const state = await releaseCaptureFailure(database, {
      captureId: claim.captureId,
      leaseId: claim.leaseId,
      attempts: claim.attempts,
      code,
    });
    return {
      handled: true,
      outcome: state === 'blocked' || state === 'stale' ? 'blocked' : 'held',
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
    const code =
      error instanceof Error ? error.message : 'promotion_failed';
    const state = await releaseCaptureFailure(database, {
      captureId: claim.captureId,
      leaseId: claim.leaseId,
      attempts: claim.attempts,
      code,
    });
    return {
      handled: true,
      outcome: state === 'blocked' || state === 'stale' ? 'blocked' : 'held',
    };
  }
  return { handled: true, outcome: 'promoted' };
}

/** True when generation G is still the provisional capture kind. */
export async function isProvisionalContextCapture(
  tx: Transaction,
  generationId: string,
) {
  const [row] = await tx
    .select({ kind: generation.kind })
    .from(generation)
    .where(eq(generation.id, generationId));
  return row?.kind === storytellerContextCaptureKind;
}
