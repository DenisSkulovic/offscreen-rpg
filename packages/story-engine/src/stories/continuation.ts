import { isDeepStrictEqual } from 'node:util';
import { publishStorytellerNotes } from './continuity-notes';
import {
  InteractionInputError,
  validateInteractionSubmission,
} from '@offscreen/contracts/interactions';
import type { Database } from '@offscreen/db';
import {
  campaign,
  campaignReport,
  gameActivity,
  gameOffer,
  worldObligation,
} from '@offscreen/db/campaign-schema';
import type { Transaction } from '@offscreen/db/outbox';
import {
  DocumentStorageError,
  sceneCheckpointSchema,
  type DocumentStore,
  type SceneCheckpoint,
} from '@offscreen/documents';
import {
  activeWaitBlocksContinuation,
  continuationIncludesWaitWithOffer,
  continuationMissesResponseDeadline,
  continuationResponseProvenance,
  continuationRetryMatches,
  continuationSchema,
  hasValidDecisionDefault,
  type StoryContinuation,
} from './command-policy';
import { StoryError, parseStoryIdentifier } from './errors';
import {
  advanceStoryView,
  applyStoryItemEffects,
  enqueueContinuationNotices,
  findPassageByTransition,
  insertContinuationPassage,
  lockOwnedStory,
  projectStoryItemEffects,
  readDatabaseClockMs,
  requireCurrentPassage,
  restartActiveSceneAtPassage,
  type ActiveSceneRecallCue,
  type StoryItemSnapshot,
} from './persistence';
import {
  checkpointPinsForRoot,
  type StagedStoryPublication,
} from './passage-documents';
import {
  checkpointWriterStore,
  insertStagedSceneCheckpointSelector,
  stageSceneCheckpointObject,
  type SceneCheckpointWriterStore,
  type StagedSceneCheckpoint,
} from './scene-checkpoint';
import { story, storyDocumentCommit, storyItem, storyPassage, storyResolution } from '@offscreen/db/story-schema';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { enqueue } from '@offscreen/db/outbox';

type CommitContinuation = Readonly<{
  ownerId: string;
  storyId: string;
  transitionId: string;
  input: StoryContinuation;
  completingIntervalPassageId: string | undefined;
  completingDecisionPassageId: string | undefined;
  sourceGenerationId?: string | null;
  restartActiveScene?: boolean;
  activeSceneRecallCues?: readonly ActiveSceneRecallCue[];
  stagedDocuments?: StagedStoryPublication;
  stagedCheckpoint?: StagedContinuationCheckpoint;
}>;

export type StagedContinuationCheckpoint = StagedSceneCheckpoint &
  Readonly<{
    passageId: string;
    interactionId: string | null;
    baseRootHash: string | null;
    baseRootRevision: number;
  }>;

type AppendContinuation = Readonly<{
  ownerId: string;
  storyId: string;
  transitionId: string;
  proposed: unknown;
}>;

export async function commitStagedStoryPublication(
  tx: Transaction,
  args: {
    storyId: string;
    operationId: string;
    staged: StagedStoryPublication;
  },
) {
  await tx.insert(storyDocumentCommit).values({
    storyId: args.storyId,
    operationId: args.operationId,
    requestHash: args.staged.requestHash,
    baseRootHash: args.staged.baseRootHash,
    rootHash: args.staged.rootHash,
    rootRevision: args.staged.rootRevision,
  });
  await tx
    .update(story)
    .set({
      documentRootHash: args.staged.rootHash,
      documentRootRevision: args.staged.rootRevision,
    })
    .where(eq(story.id, args.storyId));
  await enqueue(tx, {
    id: randomUUID(),
    operationId: args.operationId,
    topic: 'knowledge.index.v1',
  });
}

async function admitCurrentContinuation(
  tx: Transaction,
  args: CommitContinuation & { expectedRevision: number },
) {
  const active = await requireCurrentPassage(tx, {
    storyId: args.storyId,
    sequence: args.expectedRevision,
  });
  if (
    activeWaitBlocksContinuation({
      waitPlan: active.waitPlan,
      currentPassageId: active.id,
      completingIntervalPassageId: args.completingIntervalPassageId,
    })
  ) {
    throw new StoryError('conflict');
  }
  if (active.responseDueAt !== null) {
    const nowMs = await readDatabaseClockMs(tx, args.storyId);
    const expired = nowMs >= active.responseDueAt.getTime();
    if (
      continuationMissesResponseDeadline({
        currentPassageId: active.id,
        expired,
        completingDecisionPassageId: args.completingDecisionPassageId,
      })
    ) {
      throw new StoryError('conflict');
    }
  }
  if (!hasValidDecisionDefault(args.input)) {
    throw new StoryError('invalid');
  }
  if (active.interaction !== null) {
    if (args.input.response === null) {
      throw new StoryError('conflict');
    }
    try {
      validateInteractionSubmission(active.interaction, args.input.response);
    } catch (error) {
      if (error instanceof InteractionInputError) {
        throw new StoryError(
          error.code === 'stale_interaction' ? 'conflict' : 'invalid',
        );
      }
      throw error;
    }
  } else if (args.input.response !== null) {
    throw new StoryError('conflict');
  }
}

function sortedItems(items: readonly StoryItemSnapshot[]) {
  return [...items].sort((left, right) =>
    left.key < right.key ? -1 : left.key > right.key ? 1 : 0,
  );
}

function checkpointNotes(notes: unknown): [] | null | undefined {
  if (notes == null) return null;
  if (Array.isArray(notes) && notes.length === 0) return [];
  return undefined;
}

function checkpointAnchor(scope: unknown) {
  if (scope == null) return null;
  if (typeof scope !== 'object') return undefined;
  const record = scope as Record<string, unknown>;
  if (record.version !== 'active-scene-anchor.v1') return undefined;
  return {
    version: 'active-scene-anchor.v1' as const,
    fromSequence: record.fromSequence,
    requiredPassageIds: record.requiredPassageIds,
    recallCues: Array.isArray(record.recallCues) ? record.recallCues : [],
  };
}

async function checkpointIsBlocked(
  database: Database,
  storyId: string,
  transitionId: string,
) {
  const resolutions = await database.db
    .select({ operationId: storyResolution.operationId })
    .from(storyResolution)
    .where(eq(storyResolution.storyId, storyId));
  if (resolutions.some((row) => row.operationId !== transitionId)) return true;
  const [obligation] = await database.db
    .select({ id: worldObligation.id })
    .from(worldObligation)
    .where(eq(worldObligation.storyId, storyId))
    .limit(1);
  if (obligation) return true;
  const [offer] = await database.db
    .select({ id: gameOffer.id })
    .from(gameOffer)
    .where(eq(gameOffer.storyId, storyId))
    .limit(1);
  if (offer) return true;
  const [activity] = await database.db
    .select({ id: gameActivity.id })
    .from(gameActivity)
    .where(eq(gameActivity.storyId, storyId))
    .limit(1);
  if (activity) return true;
  const [report] = await database.db
    .select({ id: campaignReport.id })
    .from(campaignReport)
    .where(
      and(
        eq(campaignReport.storyId, storyId),
        eq(campaignReport.state, 'pending'),
      ),
    )
    .limit(1);
  return Boolean(report);
}

function continuationCheckpointCandidate(args: {
  storyId: string;
  passageId: string;
  transitionId: string;
  input: StoryContinuation;
  completingDecisionPassageId: string | undefined;
  interactionId: string | null;
  contentDocumentHash: string | null;
  rootHash: string | null;
  rootRevision: number;
  pins: SceneCheckpoint['pins'];
  source: string;
  premise: unknown;
  storyteller: unknown;
  execution: unknown;
  usagePolicy: unknown;
  items: readonly StoryItemSnapshot[];
  campaign: typeof campaign.$inferSelect | undefined;
  activeSceneScope: unknown;
  continuityNotes: unknown;
}) {
  if (args.input.decision || args.input.wait) return undefined;
  const notes = checkpointNotes(args.continuityNotes);
  if (notes === undefined) return undefined;
  const anchor = checkpointAnchor(args.activeSceneScope);
  if (anchor === undefined) return undefined;
  const passage = {
    response: args.input.response,
    responseSource: continuationResponseProvenance({
      response: args.input.response,
      completingDecisionPassageId: args.completingDecisionPassageId,
    }),
    initialItems: null,
    effects: args.input.effects,
    decisionPlan: null,
    waitPlan: null,
    controlRevision: 0,
    content: args.contentDocumentHash ? null : args.input.content,
    contentDocumentHash: args.contentDocumentHash,
    interaction:
      args.input.interaction && args.interactionId
        ? { id: args.interactionId, specification: args.input.interaction }
        : null,
  };
  const shared = {
    format: 'offscreen.scene-checkpoint.v1' as const,
    stateSchemaVersion: 1 as const,
    storyId: args.storyId,
    passageId: args.passageId,
    sceneSequence: args.input.expectedRevision + 1,
    transitionId: args.transitionId,
    source: args.source,
    premise: args.premise ?? null,
    storyteller: args.storyteller ?? null,
    execution: args.execution ?? null,
    usagePolicy: args.usagePolicy ?? null,
    canon: { rootHash: args.rootHash, rootRevision: args.rootRevision },
    ancestor: { storyId: null, rootHash: null, rootRevision: null },
    pins: args.pins,
    passage,
  };
  if (!args.campaign) {
    if (args.items.length > 0) return undefined;
    return { ...shared, mechanics: { mechanicsAbsent: true as const, items: [] } };
  }
  const row = args.campaign;
  if (
    row.offer != null ||
    row.acceptedActivityPlan != null ||
    row.activeActivityId != null ||
    row.activeActionOperationId != null ||
    !Array.isArray(row.holds) ||
    row.holds.length > 0
  ) {
    return undefined;
  }
  return {
    ...shared,
    mechanics: {
      mechanicsAbsent: false as const,
      character: row.character ?? null,
      items: args.items,
      storyFacts: row.storyFacts,
      activityOccurrences: row.activityOccurrences,
      location: row.location,
      gameSecond: row.gameSecond,
      clock: row.clock,
      pace: row.clockPace,
      holds: [] as [],
      offer: null,
      acceptedActivityPlan: null,
      activeActivityId: null,
      activeActionOperationId: null,
      situationAuthorization: row.situationAuthorization,
      worldConditions: row.worldConditions,
      settingsRevision: row.settingsRevision,
      content: row.content ?? null,
      continuityNotes: notes,
      activeSceneScope: anchor,
    },
  };
}

export async function lockedCheckpointMatches(
  tx: Transaction,
  checkpoint: SceneCheckpoint,
) {
  const items = sortedItems(
    await tx
      .select({
        key: storyItem.key,
        label: storyItem.label,
        holderKey: storyItem.holderKey,
      })
      .from(storyItem)
      .where(eq(storyItem.storyId, checkpoint.storyId)),
  );
  const expected = sortedItems(
    checkpoint.mechanics.mechanicsAbsent ? [] : checkpoint.mechanics.items,
  );
  if (!isDeepStrictEqual(items, expected)) return false;
  const [row] = await tx
    .select()
    .from(campaign)
    .where(eq(campaign.storyId, checkpoint.storyId));
  if (checkpoint.mechanics.mechanicsAbsent) return !row;
  if (!row) return false;
  const [storyRow] = await tx
    .select({
      continuityNotes: story.continuityNotes,
      scope: story.activeSceneScope,
    })
    .from(story)
    .where(eq(story.id, checkpoint.storyId));
  const notes = checkpointNotes(storyRow?.continuityNotes);
  return (
    isDeepStrictEqual(row.character ?? null, checkpoint.mechanics.character) &&
    isDeepStrictEqual(row.storyFacts, checkpoint.mechanics.storyFacts) &&
    isDeepStrictEqual(
      row.activityOccurrences,
      checkpoint.mechanics.activityOccurrences,
    ) &&
    row.location === checkpoint.mechanics.location &&
    row.gameSecond === checkpoint.mechanics.gameSecond &&
    isDeepStrictEqual(row.clock, checkpoint.mechanics.clock) &&
    isDeepStrictEqual(row.clockPace, checkpoint.mechanics.pace) &&
    Array.isArray(row.holds) &&
    row.holds.length === 0 &&
    row.offer == null &&
    row.acceptedActivityPlan == null &&
    row.activeActivityId == null &&
    row.activeActionOperationId == null &&
    isDeepStrictEqual(
      row.situationAuthorization,
      checkpoint.mechanics.situationAuthorization,
    ) &&
    isDeepStrictEqual(row.worldConditions, checkpoint.mechanics.worldConditions) &&
    row.settingsRevision === checkpoint.mechanics.settingsRevision &&
    isDeepStrictEqual(row.content ?? null, checkpoint.mechanics.content) &&
    checkpointNotes(storyRow?.continuityNotes) !== undefined &&
    isDeepStrictEqual(
      checkpointNotes(storyRow?.continuityNotes),
      checkpoint.mechanics.continuityNotes,
    ) &&
    isDeepStrictEqual(
      checkpointAnchor(storyRow?.scope),
      checkpoint.mechanics.activeSceneScope,
    ) &&
    notes !== undefined
  );
}

/**
 * Stage a quiescent continuation checkpoint before the story lock.
 * Unsupported active work returns undefined and the narrative commit still
 * proceeds. A failed object write throws and must not open the SQL transaction.
 */
export async function stageSupportedContinuationCheckpoint(
  database: Database,
  documentStore: SceneCheckpointWriterStore,
  args: Readonly<{
    ownerId: string;
    storyId: string;
    transitionId: string;
    input: StoryContinuation;
    passageId?: string;
    contentDocumentHash?: string | null;
    nextRootHash?: string | null;
    nextRootRevision?: number;
    baseRootHash?: string | null;
    baseRootRevision?: number;
    restartActiveScene?: boolean;
    activeSceneRecallCues?: readonly ActiveSceneRecallCue[];
    completingDecisionPassageId?: string;
  }>,
): Promise<StagedContinuationCheckpoint | undefined> {
  if (args.input.decision || args.input.wait) return undefined;
  const [current] = await database.db
    .select()
    .from(story)
    .where(eq(story.id, args.storyId));
  if (!current || current.ownerId !== args.ownerId) return undefined;
  if (current.revision !== args.input.expectedRevision) return undefined;
  const [prior] = await database.db
    .select({ id: storyPassage.id })
    .from(storyPassage)
    .where(
      and(
        eq(storyPassage.storyId, args.storyId),
        eq(storyPassage.transitionId, args.transitionId),
      ),
    );
  if (prior) return undefined;
  if (await checkpointIsBlocked(database, args.storyId, args.transitionId)) {
    return undefined;
  }
  const baseRootHash = args.baseRootHash ?? current.documentRootHash;
  const baseRootRevision = args.baseRootRevision ?? current.documentRootRevision;
  if (
    current.documentRootHash !== baseRootHash ||
    current.documentRootRevision !== baseRootRevision
  ) {
    return undefined;
  }
  const rootHash = args.nextRootHash ?? current.documentRootHash;
  const rootRevision = args.nextRootRevision ?? current.documentRootRevision;
  const items = projectStoryItemEffects(
    await database.db
      .select({
        key: storyItem.key,
        label: storyItem.label,
        holderKey: storyItem.holderKey,
      })
      .from(storyItem)
      .where(eq(storyItem.storyId, args.storyId)),
    args.input.effects,
  );
  const [campaignRow] = await database.db
    .select()
    .from(campaign)
    .where(eq(campaign.storyId, args.storyId));
  const passageId = args.passageId ?? randomUUID();
  const interactionId = args.input.interaction ? randomUUID() : null;
  const scope = args.restartActiveScene
    ? {
        version: 'active-scene-anchor.v1' as const,
        fromSequence: args.input.expectedRevision + 1,
        requiredPassageIds: [passageId],
        recallCues: args.activeSceneRecallCues ?? [],
      }
    : current.activeSceneScope;
  let pins: SceneCheckpoint['pins'];
  try {
    pins = await checkpointPinsForRoot({
      storage: documentStore,
      rootHash,
      storytellerProfile: current.storyteller ?? null,
    });
  } catch (error) {
    if (error instanceof DocumentStorageError) {
      throw new StoryError(
        error.code === 'unavailable' ? 'unavailable' : 'invalid',
        error.code === 'unavailable'
          ? 'checkpoint_store_unavailable'
          : 'canon_root_mismatch',
      );
    }
    throw error;
  }
  const candidate = continuationCheckpointCandidate({
    storyId: args.storyId,
    passageId,
    transitionId: args.transitionId,
    input: args.input,
    completingDecisionPassageId: args.completingDecisionPassageId,
    interactionId,
    contentDocumentHash: args.contentDocumentHash ?? null,
    rootHash,
    rootRevision,
    pins,
    source: current.source,
    premise: current.premise,
    storyteller: current.storyteller,
    execution: current.execution,
    usagePolicy: current.usagePolicy,
    items,
    campaign: campaignRow,
    activeSceneScope: scope,
    continuityNotes: current.continuityNotes,
  });
  if (!candidate) return undefined;
  const parsed = sceneCheckpointSchema.safeParse(candidate);
  if (!parsed.success) return undefined;
  const staged = await stageSceneCheckpointObject(documentStore, parsed.data);
  return {
    ...staged,
    passageId,
    interactionId,
    baseRootHash,
    baseRootRevision,
  };
}

export async function commitStoryContinuation(
  tx: Transaction,
  args: CommitContinuation,
) {
  const current = await lockOwnedStory(tx, {
    ownerId: args.ownerId,
    storyId: args.storyId,
  });
  const prior = await findPassageByTransition(tx, {
    storyId: args.storyId,
    transitionId: args.transitionId,
  });
  // Check retries before the current revision: the story may have moved on.
  // A document-staged passage stores the content hash and leaves inline
  // content empty. The same staged object is the same scene.
  if (prior) {
    const comparable =
      prior.content === null &&
      prior.contentDocumentHash !== null &&
      args.stagedDocuments?.passageObjectHash === prior.contentDocumentHash
        ? { ...prior, content: args.input.content }
        : prior;
    if (!continuationRetryMatches(comparable, args.input)) {
      throw new StoryError('conflict');
    }
    if (current.revision < prior.sequence) {
      await advanceStoryView(tx, {
        storyId: args.storyId,
        revision: prior.sequence,
        viewVersion: current.viewVersion + 1,
      });
    }
    return;
  }
  if (current.revision !== args.input.expectedRevision) {
    throw new StoryError('conflict');
  }
  if (
    args.stagedDocuments &&
    (current.documentRootHash !== args.stagedDocuments.baseRootHash ||
      current.documentRootRevision !== args.stagedDocuments.baseRootRevision)
  ) {
    throw new StoryError('conflict', 'document_root');
  }
  const stagedCheckpoint = args.stagedCheckpoint;
  if (stagedCheckpoint) {
    const nextRootHash =
      args.stagedDocuments?.rootHash ?? current.documentRootHash;
    const nextRootRevision =
      args.stagedDocuments?.rootRevision ?? current.documentRootRevision;
    if (
      current.documentRootHash !== stagedCheckpoint.baseRootHash ||
      current.documentRootRevision !== stagedCheckpoint.baseRootRevision ||
      stagedCheckpoint.checkpoint.canon.rootHash !== nextRootHash ||
      stagedCheckpoint.checkpoint.canon.rootRevision !== nextRootRevision ||
      stagedCheckpoint.checkpoint.sceneSequence !== current.revision + 1 ||
      (args.stagedDocuments &&
        stagedCheckpoint.passageId !== args.stagedDocuments.passageId)
    ) {
      throw new StoryError('conflict', 'stale_canon_root');
    }
  }
  await admitCurrentContinuation(tx, {
    ...args,
    expectedRevision: current.revision,
  });
  // The story lock serializes this bounded effect list with its narrative commit.
  // A failed precondition rolls back every item change and the prose together.
  await applyStoryItemEffects(tx, {
    storyId: args.storyId,
    effects: args.input.effects,
  });
  const nextRevision = current.revision + 1;
  const passageId = await insertContinuationPassage(tx, {
    storyId: args.storyId,
    sequence: nextRevision,
    transitionId: args.transitionId,
    input: args.input,
    responseSource: continuationResponseProvenance({
      response: args.input.response,
      completingDecisionPassageId: args.completingDecisionPassageId,
    }),
    sourceGenerationId:
      args.sourceGenerationId ?? args.input.sourceGenerationId ?? null,
    ...(args.stagedDocuments
      ? {
          passageId: args.stagedDocuments.passageId,
          contentDocumentHash: args.stagedDocuments.passageObjectHash,
        }
      : stagedCheckpoint
        ? { passageId: stagedCheckpoint.passageId }
        : {}),
    ...(stagedCheckpoint?.interactionId
      ? { interactionId: stagedCheckpoint.interactionId }
      : {}),
  });
  if (args.stagedDocuments) {
    await commitStagedStoryPublication(tx, {
      storyId: args.storyId,
      operationId: args.transitionId,
      staged: args.stagedDocuments,
    });
  }
  if (args.restartActiveScene) {
    await restartActiveSceneAtPassage(tx, {
      storyId: args.storyId,
      sequence: nextRevision,
      passageId,
      ...(args.activeSceneRecallCues
        ? { recallCues: args.activeSceneRecallCues }
        : {}),
    });
  }
  await advanceStoryView(tx, {
    storyId: args.storyId,
    revision: nextRevision,
    viewVersion: current.viewVersion + 1,
  });
  if (stagedCheckpoint) {
    if (!(await lockedCheckpointMatches(tx, stagedCheckpoint.checkpoint))) {
      throw new StoryError('conflict', 'stale_story_revision');
    }
    await insertStagedSceneCheckpointSelector(tx, {
      ownerId: args.ownerId,
      operationId: args.transitionId,
      staged: stagedCheckpoint,
    });
  }
  if (current.storyteller != null && args.input.sourceGenerationId) {
    await publishStorytellerNotes(tx, {
      storyId: args.storyId,
      generationId: args.input.sourceGenerationId,
      passageId,
      revision: nextRevision,
      sourcePart:
        args.input.sourceGenerationPart === 'arrival' ? 'arrival' : 'current',
      notes: current.continuityNotes,
    });
  }
  await enqueueContinuationNotices(tx, { passageId, input: args.input });
}

export function createStoryContinuation(
  database: Database,
  documentStore?: DocumentStore,
) {
  return {
    /** Internal commit for an already resolved narrative continuation.
     * Not command admission, a rule resolver or an HTTP content-writing endpoint.
     * No inference or other external work belongs inside this transaction.
     */
    async append({
      ownerId,
      storyId,
      transitionId,
      proposed,
    }: AppendContinuation) {
      parseStoryIdentifier(storyId);
      parseStoryIdentifier(transitionId);
      const parsed = continuationSchema.safeParse(proposed);
      if (!parsed.success) {
        throw new StoryError('invalid');
      }
      const input = parsed.data;
      if (continuationIncludesWaitWithOffer(input)) {
        throw new StoryError('invalid');
      }
      const writer = documentStore
        ? checkpointWriterStore(documentStore)
        : undefined;
      const stagedCheckpoint = writer
        ? await stageSupportedContinuationCheckpoint(database, writer, {
            ownerId,
            storyId,
            transitionId,
            input,
          })
        : undefined;
      await database.db.transaction((tx) =>
        commitStoryContinuation(tx, {
          ownerId,
          storyId,
          transitionId,
          input,
          completingIntervalPassageId: undefined,
          completingDecisionPassageId: undefined,
          ...(stagedCheckpoint ? { stagedCheckpoint } : {}),
        }),
      );
    },
  };
}
