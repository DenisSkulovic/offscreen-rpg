import {
  InteractionInputError,
  validateInteractionSubmission,
} from '@offscreen/contracts/interactions';
import type { Database } from '@offscreen/db';
import type { Transaction } from './outbox';
import {
  activeWaitBlocksContinuation,
  continuationIncludesWaitWithOffer,
  continuationMissesResponseDeadline,
  continuationResponseProvenance,
  continuationRetryMatches,
  continuationSchema,
  hasValidDecisionDefault,
  type StoryContinuation,
} from './story-command-policy';
import { StoryError, parseStoryIdentifier } from './story-errors';
import {
  advanceStoryView,
  applyItemTransfers,
  enqueueContinuationNotices,
  findPassageByTransition,
  insertContinuationPassage,
  lockOwnedStory,
  readDatabaseClockMs,
  requireCurrentPassage,
} from './story-persistence';

type CommitContinuation = Readonly<{
  ownerId: string;
  storyId: string;
  transitionId: string;
  input: StoryContinuation;
  completingIntervalPassageId: string | undefined;
  completingDecisionPassageId: string | undefined;
}>;

type AppendContinuation = Readonly<{
  ownerId: string;
  storyId: string;
  transitionId: string;
  proposed: unknown;
}>;

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
  await admitCurrentContinuation(tx, {
    ...args,
    expectedRevision: current.revision,
  });
  // The story lock serializes this bounded effect list with its narrative commit.
  // A failed precondition rolls back every preceding transfer in the transaction.
  await applyItemTransfers(tx, {
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
  });
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
