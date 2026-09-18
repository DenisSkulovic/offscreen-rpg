import { controlIntervalSchema } from '@offscreen/contracts/stories';
import { interactionSchema } from '@offscreen/contracts/interactions';
import type { Database } from '@offscreen/db';
import type { Transaction } from '../outbox/index';
import { commitStoryContinuation } from './continuation';
import {
  continuationSchema,
  heldRemainderMs,
  intervalControlReceiptMatches,
  isControllableInterval,
  pauseIsRejectedAfterCutoff,
  type IntervalControl,
} from './command-policy';
import { StoryError, parseStoryIdentifier } from './errors';
import { decisionPlanSchema, waitPlanSchema } from './plans';
import {
  enqueueIntervalWake,
  findControlReceipt,
  findCurrentIntervalPassage,
  findOwnedIntervalPassage,
  incrementStoryViewVersion,
  insertControlReceipt,
  lockOwnedStory,
  lockStoryById,
  pauseInterval,
  readDatabaseClockMs,
  requirePassageById,
  requiredIntervalDueAtMs,
  resumeInterval,
} from './persistence';

type ResolveDecision = Readonly<{
  passageId: string;
}>;

type ControlInterval = Readonly<{
  ownerId: string;
  storyId: string;
  operationId: string;
  body: unknown;
}>;

type AdvanceInterval = Readonly<{
  intervalId: string;
}>;

async function applyIntervalControl(args: {
  tx: Transaction;
  storyId: string;
  viewVersion: number;
  interval: NonNullable<Awaited<ReturnType<typeof findOwnedIntervalPassage>>>;
  input: IntervalControl;
  nowMs: number;
}) {
  if (args.input.action === 'pause') {
    const dueAtMs = requiredIntervalDueAtMs(args.interval);
    if (
      pauseIsRejectedAfterCutoff({
        remainingMs: args.interval.remainingMs,
        dueAtMs,
        nowMs: args.nowMs,
      })
    ) {
      throw new StoryError('conflict');
    }
    await pauseInterval(args.tx, {
      passageId: args.interval.id,
      remainingMs: dueAtMs - args.nowMs,
      controlRevision: args.interval.controlRevision + 1,
    });
  } else {
    const remainingMs = args.interval.remainingMs;
    if (!heldRemainderMs(remainingMs)) {
      throw new StoryError('conflict');
    }
    await resumeInterval(args.tx, {
      passageId: args.interval.id,
      dueAt: new Date(args.nowMs + remainingMs),
      controlRevision: args.interval.controlRevision + 1,
    });
  }
  await incrementStoryViewVersion(args.tx, {
    storyId: args.storyId,
    viewVersion: args.viewVersion + 1,
  });
}

export function createStoryTiming(database: Database) {
  return {
    /** Worker-only timeout. The lock and database clock arbitrate with player writes. */
    async resolveDecision({
      passageId,
    }: ResolveDecision): Promise<number | null> {
      parseStoryIdentifier(passageId);
      return database.db.transaction(async (tx) => {
        const reference = await requirePassageById(tx, passageId);
        const current = await lockStoryById(tx, reference.storyId);
        if (current.revision !== reference.sequence) {
          return null;
        }
        if (reference.decisionPlan === null || !reference.responseDueAt) {
          throw new StoryError('invalid');
        }
        const plan = decisionPlanSchema.parse(reference.decisionPlan);
        const nowMs = await readDatabaseClockMs(tx, current.id);
        const remaining = reference.responseDueAt.getTime() - nowMs;
        if (remaining > 0) {
          return remaining;
        }
        await commitStoryContinuation(tx, {
          ownerId: current.ownerId,
          storyId: current.id,
          transitionId: passageId,
          input: continuationSchema.parse({
            expectedRevision: reference.sequence,
            ...plan.outcome,
            response: {
              interactionId: interactionSchema.parse(reference.interaction).id,
              answer: { kind: 'choice.v1', optionId: plan.defaultOptionId },
            },
          }),
          completingIntervalPassageId: undefined,
          completingDecisionPassageId: passageId,
        });
        return null;
      });
    },

    async intervalNeedsWake(intervalId: string) {
      const row = await findCurrentIntervalPassage(
        database.db,
        parseStoryIdentifier(intervalId),
      );
      return row !== undefined;
    },

    async controlInterval({
      ownerId,
      storyId,
      operationId,
      body,
    }: ControlInterval) {
      parseStoryIdentifier(storyId);
      parseStoryIdentifier(operationId);
      const parsed = controlIntervalSchema.safeParse(body);
      if (!parsed.success) {
        throw new StoryError('invalid');
      }
      const input = parsed.data;
      await database.db.transaction(async (tx) => {
        const current = await lockOwnedStory(tx, { ownerId, storyId });
        const receipt = await findControlReceipt(tx, {
          storyId,
          operationId,
        });
        if (receipt) {
          if (!intervalControlReceiptMatches(receipt.request, input)) {
            throw new StoryError('conflict');
          }
          return;
        }
        const interval = await findOwnedIntervalPassage(tx, {
          storyId,
          intervalId: input.intervalId,
          revision: current.revision,
        });
        if (!isControllableInterval(interval, input.expectedControlRevision)) {
          throw new StoryError('conflict');
        }
        const nowMs = await readDatabaseClockMs(tx, storyId);
        await applyIntervalControl({
          tx,
          storyId,
          viewVersion: current.viewVersion,
          interval,
          input,
          nowMs,
        });
        await insertControlReceipt(tx, {
          storyId,
          operationId,
          request: input,
        });
        await enqueueIntervalWake(tx, interval.id);
      });
    },

    /** Worker-only operation. PostgreSQL rechecks eligibility before publication. */
    async advanceInterval({
      intervalId,
    }: AdvanceInterval): Promise<number | null> {
      parseStoryIdentifier(intervalId);
      return database.db.transaction(async (tx) => {
        const reference = await requirePassageById(tx, intervalId);
        const current = await lockStoryById(tx, reference.storyId);
        // Timing state is mutable: read it only after acquiring the story lock.
        const interval = await requirePassageById(tx, intervalId);
        if (interval.waitPlan === null) {
          throw new StoryError('not_found');
        }
        const plan = waitPlanSchema.parse(interval.waitPlan);
        if (current.revision !== interval.sequence) {
          return null;
        }
        if (interval.remainingMs !== null) {
          return -1;
        }
        const nowMs = await readDatabaseClockMs(tx, current.id);
        const remaining = requiredIntervalDueAtMs(interval) - nowMs;
        if (remaining > 0) {
          return remaining;
        }
        await commitStoryContinuation(tx, {
          ownerId: current.ownerId,
          storyId: current.id,
          transitionId: intervalId,
          input: continuationSchema.parse({
            expectedRevision: interval.sequence,
            ...plan.arrival,
            sourceGenerationId: interval.sourceGenerationId,
            sourceGenerationPart: interval.sourceGenerationId
              ? 'arrival'
              : null,
          }),
          completingIntervalPassageId: intervalId,
          completingDecisionPassageId: undefined,
          sourceGenerationId: interval.sourceGenerationId,
        });
        return null;
      });
    },
  };
}
