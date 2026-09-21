import { interactionSchema } from '@offscreen/contracts/interactions';
import type { Database } from '@offscreen/db';
import {
  story,
  storyControl,
  storyItem,
  storyPassage,
} from '@offscreen/db/story-schema';
import { and, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { enqueue, type Transaction } from '../outbox/index';
import type { IntervalControl, StoryContinuation } from './command-policy';
import { StoryError } from './errors';
import {
  controlledIntervalTopic,
  decisionDeadlineTopic,
  intervalWakeTopic,
} from './topics';

export type StoryRecord = typeof story.$inferSelect;
export type PassageRecord = typeof storyPassage.$inferSelect;
export type ActiveSceneRecallCue = Readonly<{
  documentId: string;
  reason: 'identity' | 'place' | 'thread';
}>;

export async function lockOwnedStory(
  tx: Transaction,
  identity: { ownerId: string; storyId: string },
): Promise<StoryRecord> {
  const [current] = await tx
    .select()
    .from(story)
    .where(
      and(eq(story.id, identity.storyId), eq(story.ownerId, identity.ownerId)),
    )
    .for('update');
  if (!current) {
    throw new StoryError('not_found');
  }
  return current;
}

export async function lockStoryById(
  tx: Transaction,
  storyId: string,
): Promise<StoryRecord> {
  const [current] = await tx
    .select()
    .from(story)
    .where(eq(story.id, storyId))
    .for('update');
  if (!current) {
    throw new StoryError('not_found');
  }
  return current;
}

export async function readDatabaseClockMs(tx: Transaction, storyId: string) {
  const [clock] = await tx
    .select({ now: sql<Date>`clock_timestamp()` })
    .from(story)
    .where(eq(story.id, storyId));
  if (!clock) {
    throw new Error('Database clock query returned no row');
  }
  return new Date(clock.now).getTime();
}

export async function findPassageByTransition(
  tx: Transaction,
  identity: { storyId: string; transitionId: string },
): Promise<PassageRecord | undefined> {
  const [prior] = await tx
    .select()
    .from(storyPassage)
    .where(
      and(
        eq(storyPassage.storyId, identity.storyId),
        eq(storyPassage.transitionId, identity.transitionId),
      ),
    );
  return prior;
}

export async function findPassageById(
  tx: Transaction,
  passageId: string,
): Promise<PassageRecord | undefined> {
  const [reference] = await tx
    .select()
    .from(storyPassage)
    .where(eq(storyPassage.id, passageId));
  return reference;
}

export async function requirePassageById(tx: Transaction, passageId: string) {
  const passage = await findPassageById(tx, passageId);
  if (!passage) {
    throw new StoryError('not_found');
  }
  return passage;
}

export async function requireCurrentPassage(
  tx: Transaction,
  identity: { storyId: string; sequence: number },
): Promise<PassageRecord> {
  const [active] = await tx
    .select()
    .from(storyPassage)
    .where(
      and(
        eq(storyPassage.storyId, identity.storyId),
        eq(storyPassage.sequence, identity.sequence),
      ),
    );
  if (!active) {
    throw new Error('Current passage missing');
  }
  return active;
}

export async function findCurrentIntervalPassage(
  db: Database['db'],
  intervalId: string,
) {
  const [row] = await db
    .select({ id: story.id })
    .from(story)
    .innerJoin(
      storyPassage,
      and(
        eq(storyPassage.storyId, story.id),
        eq(storyPassage.sequence, story.revision),
      ),
    )
    .where(eq(storyPassage.id, intervalId));
  return row;
}

export async function findOwnedIntervalPassage(
  tx: Transaction,
  identity: { storyId: string; intervalId: string; revision: number },
) {
  const [interval] = await tx
    .select()
    .from(storyPassage)
    .where(
      and(
        eq(storyPassage.storyId, identity.storyId),
        eq(storyPassage.id, identity.intervalId),
        eq(storyPassage.sequence, identity.revision),
      ),
    );
  return interval;
}

export function requiredIntervalDueAtMs(interval: PassageRecord) {
  if (interval.dueAt === null) {
    throw new Error('Stored interval is missing due time');
  }
  return interval.dueAt.getTime();
}

export async function applyItemTransfers(
  tx: Transaction,
  args: { storyId: string; effects: StoryContinuation['effects'] },
) {
  for (const effect of args.effects) {
    const updated = await tx
      .update(storyItem)
      .set({ holderKey: effect.toHolder })
      .where(
        and(
          eq(storyItem.storyId, args.storyId),
          eq(storyItem.key, effect.itemKey),
          eq(storyItem.holderKey, effect.fromHolder),
        ),
      )
      .returning({ key: storyItem.key });
    if (!updated.length) {
      throw new StoryError('conflict');
    }
  }
}

export async function insertContinuationPassage(
  tx: Transaction,
  args: {
    storyId: string;
    sequence: number;
    transitionId: string;
    input: StoryContinuation;
    responseSource: 'player' | 'default' | null;
    sourceGenerationId?: string | null;
    passageId?: string;
    contentDocumentHash?: string;
  },
) {
  const passageId = args.passageId ?? randomUUID();
  await tx.insert(storyPassage).values({
    id: passageId,
    storyId: args.storyId,
    sequence: args.sequence,
    transitionId: args.transitionId,
    effects: args.input.effects,
    response: args.input.response,
    responseSource: args.responseSource,
    decisionPlan: args.input.decision,
    responseDueAt: args.input.decision
      ? sql`clock_timestamp() + ${args.input.decision.responseDurationMs} * interval '1 millisecond'`
      : null,
    waitPlan: args.input.wait,
    dueAt: args.input.wait
      ? sql`clock_timestamp() + ${args.input.wait.realDurationMs} * interval '1 millisecond'`
      : null,
    content: args.contentDocumentHash ? null : args.input.content,
    contentDocumentHash: args.contentDocumentHash ?? null,
    interaction: args.input.interaction
      ? interactionSchema.parse({
          id: randomUUID(),
          specification: args.input.interaction,
        })
      : null,
    sourceGenerationId:
      args.sourceGenerationId ?? args.input.sourceGenerationId ?? null,
    sourceGenerationPart: args.input.sourceGenerationPart ?? null,
  });
  return passageId;
}

export async function advanceStoryView(
  tx: Transaction,
  args: { storyId: string; revision: number; viewVersion: number },
) {
  await tx
    .update(story)
    .set({ revision: args.revision, viewVersion: args.viewVersion })
    .where(eq(story.id, args.storyId));
}

/** Replace only at a committed publication boundary; earlier passages remain history. */
export async function restartActiveSceneAtPassage(
  tx: Transaction,
  args: {
    storyId: string;
    sequence: number;
    passageId: string;
    recallCues?: readonly ActiveSceneRecallCue[];
  },
) {
  await tx
    .update(story)
    .set({
      activeSceneScope: {
        version: 'active-scene-anchor.v1',
        fromSequence: args.sequence,
        requiredPassageIds: [args.passageId],
        recallCues: args.recallCues ?? [],
      },
    })
    .where(eq(story.id, args.storyId));
}

export async function incrementStoryViewVersion(
  tx: Transaction,
  args: { storyId: string; viewVersion: number },
) {
  await tx
    .update(story)
    .set({ viewVersion: args.viewVersion })
    .where(eq(story.id, args.storyId));
}

export async function enqueueContinuationNotices(
  tx: Transaction,
  args: { passageId: string; input: StoryContinuation },
) {
  if (args.input.decision) {
    await enqueue(tx, {
      id: args.passageId,
      operationId: args.passageId,
      topic: decisionDeadlineTopic,
    });
  }
  if (args.input.wait) {
    await enqueue(tx, {
      id: args.passageId,
      operationId: args.passageId,
      topic: controlledIntervalTopic,
    });
  }
}

export async function findControlReceipt(
  tx: Transaction,
  identity: { storyId: string; operationId: string },
) {
  const [receipt] = await tx
    .select()
    .from(storyControl)
    .where(
      and(
        eq(storyControl.storyId, identity.storyId),
        eq(storyControl.operationId, identity.operationId),
      ),
    );
  return receipt;
}

export async function insertControlReceipt(
  tx: Transaction,
  args: {
    storyId: string;
    operationId: string;
    request: IntervalControl;
  },
) {
  await tx.insert(storyControl).values({
    storyId: args.storyId,
    operationId: args.operationId,
    request: args.request,
  });
}

export async function pauseInterval(
  tx: Transaction,
  args: { passageId: string; remainingMs: number; controlRevision: number },
) {
  await tx
    .update(storyPassage)
    .set({
      remainingMs: args.remainingMs,
      controlRevision: args.controlRevision,
    })
    .where(eq(storyPassage.id, args.passageId));
}

export async function resumeInterval(
  tx: Transaction,
  args: { passageId: string; dueAt: Date; controlRevision: number },
) {
  await tx
    .update(storyPassage)
    .set({
      dueAt: args.dueAt,
      remainingMs: null,
      controlRevision: args.controlRevision,
    })
    .where(eq(storyPassage.id, args.passageId));
}

export async function enqueueIntervalWake(tx: Transaction, intervalId: string) {
  await enqueue(tx, {
    id: randomUUID(),
    operationId: intervalId,
    topic: intervalWakeTopic,
  });
}
