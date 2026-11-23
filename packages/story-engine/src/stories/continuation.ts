import { isDeepStrictEqual } from 'node:util';
import { publishStorytellerNotes } from './continuity-notes';
import {
  InteractionInputError,
  validateInteractionSubmission,
} from '@offscreen/story-interface/interactions';
import type { Database } from '@offscreen/db';
import { campaign } from '@offscreen/db/campaign-schema';
import type { Transaction } from '@offscreen/db/outbox';
import { type DocumentStore, type SceneCheckpoint } from '@offscreen/documents';
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
  readDatabaseClockMs,
  requireCurrentPassage,
  restartActiveSceneAtPassage,
  type ActiveSceneRecallCue,
  type StoryItemSnapshot,
} from './persistence';
import { type StagedStoryPublication } from './passage-documents';
import {
  checkpointWriterStore,
  insertStagedSceneCheckpointSelector,
} from './scene-checkpoint';
import {
  assertV2PostStateMatches,
  SceneAfterStateError,
  toV2FictionalState,
} from './scene-checkpoint-v2';
import {
  checkpointAnchor,
  checkpointNotes,
  stageSupportedContinuationCheckpoint,
  type StagedContinuationCheckpoint,
} from './continuation-checkpoint';

import { readSceneAfterState } from './scene-after-state';
import {
  story,
  storyDocumentCommit,
  storyItem,
} from '@offscreen/db/story-schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { enqueue } from '@offscreen/db/outbox';

export {
  stageSupportedContinuationCheckpoint,
  type StagedContinuationCheckpoint,
};

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

function sourceGenerationPart(input: StoryContinuation): 'current' | 'arrival' {
  return input.sourceGenerationPart === 'arrival' ? 'arrival' : 'current';
}

export async function lockedCheckpointMatches(
  tx: Transaction,
  checkpoint: SceneCheckpoint,
) {
  if (checkpoint.format !== 'offscreen.scene-checkpoint.v1') {
    return false;
  }
  const mechanics = checkpoint.mechanics;
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
    mechanics.mechanicsAbsent ? [] : mechanics.items,
  );
  if (!isDeepStrictEqual(items, expected)) return false;
  const [row] = await tx
    .select()
    .from(campaign)
    .where(eq(campaign.storyId, checkpoint.storyId));
  if (mechanics.mechanicsAbsent) return !row;
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
    isDeepStrictEqual(row.character ?? null, mechanics.character) &&
    isDeepStrictEqual(row.storyFacts, mechanics.storyFacts) &&
    isDeepStrictEqual(row.activityOccurrences, mechanics.activityOccurrences) &&
    row.location === mechanics.location &&
    row.gameSecond === mechanics.gameSecond &&
    isDeepStrictEqual(row.clock, mechanics.clock) &&
    isDeepStrictEqual(row.clockPace, mechanics.pace) &&
    Array.isArray(row.holds) &&
    row.holds.length === 0 &&
    row.offer == null &&
    row.acceptedActivityPlan == null &&
    row.activeActivityId == null &&
    row.activeActionOperationId == null &&
    isDeepStrictEqual(
      row.situationAuthorization,
      mechanics.situationAuthorization,
    ) &&
    isDeepStrictEqual(row.worldConditions, mechanics.worldConditions) &&
    row.settingsRevision === mechanics.settingsRevision &&
    isDeepStrictEqual(row.content ?? null, mechanics.content) &&
    checkpointNotes(storyRow?.continuityNotes) !== undefined &&
    isDeepStrictEqual(
      checkpointNotes(storyRow?.continuityNotes),
      mechanics.continuityNotes,
    ) &&
    isDeepStrictEqual(
      checkpointAnchor(storyRow?.scope),
      mechanics.activeSceneScope,
    ) &&
    notes !== undefined
  );
}

/**
 * Compare a staged checkpoint with the rows already locked in this transaction.
 * v2 uses the post-state snapshot. v1 keeps the legacy mechanics comparison.
 * A known mismatch returns false. Any other failure stays fail-closed.
 */
export async function committedCheckpointMatches(
  tx: Transaction,
  checkpoint: SceneCheckpoint,
): Promise<boolean> {
  if (checkpoint.format !== 'offscreen.scene-checkpoint.v2') {
    return lockedCheckpointMatches(tx, checkpoint);
  }
  try {
    const actual = await readSceneAfterState(tx, checkpoint.storyId);
    assertV2PostStateMatches(
      checkpoint.fictionalState,
      toV2FictionalState(actual),
    );
    return true;
  } catch (error) {
    if (error instanceof SceneAfterStateError) {
      return false;
    }
    if (
      error instanceof Error &&
      error.message.startsWith('v2_post_state_mismatch:')
    ) {
      return false;
    }
    throw error;
  }
}

/**
 * Stage a continuation checkpoint before the story lock using the predicted
 * post-commit fictional state, including continuity notes and active work.
 * A failed object write throws and must not open the SQL transaction.
 */

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
  const shouldPublishNotes = Boolean(
    current.storyteller != null && args.input.sourceGenerationId,
  );
  if (shouldPublishNotes) {
    await publishStorytellerNotes(tx, {
      storyId: args.storyId,
      generationId: args.input.sourceGenerationId!,
      passageId,
      revision: nextRevision,
      sourcePart: sourceGenerationPart(args.input),
      notes: current.continuityNotes,
    });
  }
  if (stagedCheckpoint) {
    const checkpoint = stagedCheckpoint.checkpoint;
    if (!(await committedCheckpointMatches(tx, checkpoint))) {
      throw new StoryError('conflict', 'stale_story_revision');
    }
    await insertStagedSceneCheckpointSelector(tx, {
      ownerId: args.ownerId,
      operationId: args.transitionId,
      staged: stagedCheckpoint,
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
