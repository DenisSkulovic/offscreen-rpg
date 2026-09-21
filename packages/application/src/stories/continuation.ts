import { publishStorytellerNotes } from '../storyteller/memory';
import {
  InteractionInputError,
  validateInteractionSubmission,
} from '@offscreen/contracts/interactions';
import type { Database } from '@offscreen/db';
import type { Transaction } from '../outbox/index';
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
} from './persistence';
import type { StagedStoryPublication } from './passage-documents';
import { story, storyDocumentCommit } from '@offscreen/db/story-schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { enqueue } from '../outbox/index';

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
  if (prior) {
    if (!continuationRetryMatches(prior, args.input)) {
      throw new StoryError('conflict');
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
      : {}),
  });
  if (args.stagedDocuments) {
    await commitStagedStoryPublication(tx, {
      storyId: args.storyId,
      operationId: args.transitionId,
      staged: args.stagedDocuments,
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
  await enqueueContinuationNotices(tx, { passageId, input: args.input });
}

export function createStoryContinuation(database: Database) {
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
      await database.db.transaction((tx) =>
        commitStoryContinuation(tx, {
          ownerId,
          storyId,
          transitionId,
          input,
          completingIntervalPassageId: undefined,
          completingDecisionPassageId: undefined,
        }),
      );
    },
  };
}
