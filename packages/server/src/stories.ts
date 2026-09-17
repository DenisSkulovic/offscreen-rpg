import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { enqueue, type Transaction } from './outbox';
import { StoryError, parseStoryIdentifier } from './story-errors';
import { decisionPlanSchema, waitPlanSchema } from './story-plans';
import { createStoryReads } from './story-reads';
export const decisionDeadlineTopic = 'story.decision.v1';
export const storyIntervalTopic = 'story.interval.v1';
export const controlledIntervalTopic = 'story.interval.v2';
export const intervalWakeTopic = 'story.interval.wake.v2';
import type { Database } from '@offscreen/db';
import {
  story,
  storyPassage,
  storyControl,
  storyItem,
} from '@offscreen/db/story-schema';
import {
  passageContentSchema,
  controlIntervalSchema,
  storyItemsSchema,
  itemTransferSchema,
} from '@offscreen/contracts/stories';
import {
  interactionSpecificationSchema,
  interactionSchema,
  interactionSubmissionSchema,
  validateInteractionSubmission,
  InteractionInputError,
} from '@offscreen/contracts/interactions';

const initialSchema = z.strictObject({
  source: z.string().min(1).max(100),
  items: storyItemsSchema.default([]),
  content: passageContentSchema,
  interaction: interactionSpecificationSchema.nullable(),
});
const continuationSchema = z.strictObject({
  expectedRevision: z.number().int().positive().max(2147483646),
  effects: z.array(itemTransferSchema).max(20).default([]),
  content: passageContentSchema,
  interaction: interactionSpecificationSchema.nullable(),
  response: interactionSubmissionSchema.nullable().default(null),
  wait: waitPlanSchema.nullable().default(null),
  decision: decisionPlanSchema.nullable().default(null),
});
function matchesPassage(
  passage: typeof storyPassage.$inferSelect,
  input: z.infer<typeof continuationSchema> | z.infer<typeof initialSchema>,
) {
  return (
    isDeepStrictEqual(passage.content, input.content) &&
    isDeepStrictEqual(
      passage.interaction
        ? interactionSchema.parse(passage.interaction).specification
        : null,
      input.interaction,
    )
  );
}
function identifier(value: unknown) {
  return parseStoryIdentifier(value);
}

export function createStories(database: Database) {
  const reads = createStoryReads(database);
  async function read(owner: string, id: string) {
    return reads.readSnapshot({ ownerId: owner, storyId: id });
  }
  async function commit(
    tx: Transaction,
    owner: string,
    id: string,
    transitionId: string,
    input: z.infer<typeof continuationSchema>,
    completingInterval?: string,
    completingDecision?: string,
  ) {
    const [current] = await tx
      .select()
      .from(story)
      .where(and(eq(story.id, id), eq(story.ownerId, owner)))
      .for('update');
    if (!current) throw new StoryError('not_found');
    const [prior] = await tx
      .select()
      .from(storyPassage)
      .where(
        and(
          eq(storyPassage.storyId, id),
          eq(storyPassage.transitionId, transitionId),
        ),
      );
    // Check retries before the current revision: the story may have moved on.
    if (prior) {
      if (
        prior.sequence !== input.expectedRevision + 1 ||
        !matchesPassage(prior, input) ||
        !isDeepStrictEqual(prior.effects ?? [], input.effects) ||
        !isDeepStrictEqual(
          prior.decisionPlan === null
            ? null
            : decisionPlanSchema.parse(prior.decisionPlan),
          input.decision,
        ) ||
        !isDeepStrictEqual(
          prior.waitPlan === null ? null : waitPlanSchema.parse(prior.waitPlan),
          input.wait,
        ) ||
        !isDeepStrictEqual(
          prior.response === null
            ? null
            : interactionSubmissionSchema.parse(prior.response),
          input.response,
        )
      )
        throw new StoryError('conflict');
      return;
    }
    if (current.revision !== input.expectedRevision)
      throw new StoryError('conflict');
    const [active] = await tx
      .select()
      .from(storyPassage)
      .where(
        and(
          eq(storyPassage.storyId, id),
          eq(storyPassage.sequence, current.revision),
        ),
      );
    if (!active) throw new Error('Current passage missing');
    if (active.waitPlan !== null && completingInterval !== active.id)
      throw new StoryError('conflict');
    if (active.responseDueAt !== null) {
      const [clock] = await tx
        .select({ now: sql<Date>`clock_timestamp()` })
        .from(story)
        .where(eq(story.id, id));
      const expired =
        new Date(clock!.now).getTime() >= active.responseDueAt.getTime();
      if (completingDecision === active.id ? !expired : expired)
        throw new StoryError('conflict');
    }
    if (
      input.decision &&
      (!input.interaction ||
        input.wait ||
        !input.interaction.options.some(
          (option) => option.id === input.decision!.defaultOptionId,
        ))
    )
      throw new StoryError('invalid');
    if (active.interaction !== null) {
      if (input.response === null) throw new StoryError('conflict');
      try {
        validateInteractionSubmission(active.interaction, input.response);
      } catch (error) {
        if (error instanceof InteractionInputError)
          throw new StoryError(
            error.code === 'stale_interaction' ? 'conflict' : 'invalid',
          );
        throw error;
      }
    } else if (input.response !== null) {
      throw new StoryError('conflict');
    }
    // The story lock serializes this bounded effect list with its narrative commit.
    // A failed precondition rolls back every preceding transfer in the transaction.
    for (const effect of input.effects) {
      const updated = await tx
        .update(storyItem)
        .set({ holderKey: effect.toHolder })
        .where(
          and(
            eq(storyItem.storyId, id),
            eq(storyItem.key, effect.itemKey),
            eq(storyItem.holderKey, effect.fromHolder),
          ),
        )
        .returning({ key: storyItem.key });
      if (!updated.length) throw new StoryError('conflict');
    }
    const next = current.revision + 1;
    const passageId = randomUUID();
    await tx.insert(storyPassage).values({
      id: passageId,
      storyId: id,
      sequence: next,
      transitionId,
      effects: input.effects,
      response: input.response,
      responseSource:
        input.response === null
          ? null
          : completingDecision
            ? 'default'
            : 'player',
      decisionPlan: input.decision,
      responseDueAt: input.decision
        ? sql`clock_timestamp() + ${input.decision.responseDurationMs} * interval '1 millisecond'`
        : null,
      waitPlan: input.wait,
      intervalVersion: input.wait ? 1 : 0,
      dueAt: input.wait
        ? sql`clock_timestamp() + ${input.wait.realDurationMs} * interval '1 millisecond'`
        : null,
      content: input.content,
      interaction: input.interaction
        ? interactionSchema.parse({
            id: randomUUID(),
            specification: input.interaction,
          })
        : null,
    });
    await tx
      .update(story)
      .set({ revision: next, viewVersion: current.viewVersion + 1 })
      .where(eq(story.id, id));
    if (input.decision)
      await enqueue(tx, {
        id: passageId,
        operationId: passageId,
        topic: decisionDeadlineTopic,
      });
    if (input.wait)
      await enqueue(tx, {
        id: passageId,
        operationId: passageId,
        topic: controlledIntervalTopic,
      });
  }
  return {
    read,
    /** Worker-only timeout. The lock and database clock arbitrate with player writes. */
    async resolveDecision(passageId: string): Promise<number | null> {
      identifier(passageId);
      return database.db.transaction(async (tx) => {
        const [reference] = await tx
          .select()
          .from(storyPassage)
          .where(eq(storyPassage.id, passageId));
        if (!reference) throw new StoryError('not_found');
        const [current] = await tx
          .select()
          .from(story)
          .where(eq(story.id, reference.storyId))
          .for('update');
        if (!current) throw new StoryError('not_found');
        if (current.revision !== reference.sequence) return null;
        if (reference.decisionPlan === null || !reference.responseDueAt)
          throw new StoryError('invalid');
        const plan = decisionPlanSchema.parse(reference.decisionPlan);
        const [clock] = await tx
          .select({ now: sql<Date>`clock_timestamp()` })
          .from(story)
          .where(eq(story.id, current.id));
        const remaining =
          reference.responseDueAt.getTime() - new Date(clock!.now).getTime();
        if (remaining > 0) return remaining;
        await commit(
          tx,
          current.ownerId,
          current.id,
          passageId,
          continuationSchema.parse({
            expectedRevision: reference.sequence,
            ...plan.outcome,
            response: {
              interactionId: interactionSchema.parse(reference.interaction).id,
              answer: { kind: 'choice.v1', optionId: plan.defaultOptionId },
            },
          }),
          undefined,
          passageId,
        );
        return null;
      });
    },
    async intervalNeedsWake(id: string) {
      const [row] = await database.db
        .select({ id: story.id })
        .from(story)
        .innerJoin(
          storyPassage,
          and(
            eq(storyPassage.storyId, story.id),
            eq(storyPassage.sequence, story.revision),
          ),
        )
        .where(eq(storyPassage.id, identifier(id)));
      return row !== undefined;
    },
    async controlInterval(
      owner: string,
      id: string,
      operationId: string,
      body: unknown,
    ) {
      identifier(id);
      identifier(operationId);
      const parsed = controlIntervalSchema.safeParse(body);
      if (!parsed.success) throw new StoryError('invalid');
      const input = parsed.data;
      await database.db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(story)
          .where(and(eq(story.id, id), eq(story.ownerId, owner)))
          .for('update');
        if (!current) throw new StoryError('not_found');
        const [receipt] = await tx
          .select()
          .from(storyControl)
          .where(
            and(
              eq(storyControl.storyId, id),
              eq(storyControl.operationId, operationId),
            ),
          );
        if (receipt) {
          if (
            !isDeepStrictEqual(
              controlIntervalSchema.parse(receipt.request),
              input,
            )
          )
            throw new StoryError('conflict');
          return;
        }
        const [interval] = await tx
          .select()
          .from(storyPassage)
          .where(
            and(
              eq(storyPassage.storyId, id),
              eq(storyPassage.id, input.intervalId),
              eq(storyPassage.sequence, current.revision),
            ),
          );
        if (
          !interval ||
          interval.intervalVersion !== 1 ||
          interval.waitPlan === null ||
          interval.controlRevision !== input.expectedControlRevision
        )
          throw new StoryError('conflict');
        const [clock] = await tx
          .select({ now: sql<Date>`clock_timestamp()` })
          .from(story)
          .where(eq(story.id, id));
        const now = new Date(clock!.now).getTime();
        if (input.action === 'pause') {
          if (interval.remainingMs !== null || interval.dueAt!.getTime() <= now)
            throw new StoryError('conflict');
          await tx
            .update(storyPassage)
            .set({
              remainingMs: interval.dueAt!.getTime() - now,
              controlRevision: interval.controlRevision + 1,
            })
            .where(eq(storyPassage.id, interval.id));
        } else {
          if (interval.remainingMs === null) throw new StoryError('conflict');
          await tx
            .update(storyPassage)
            .set({
              dueAt: new Date(now + interval.remainingMs),
              remainingMs: null,
              controlRevision: interval.controlRevision + 1,
            })
            .where(eq(storyPassage.id, interval.id));
        }
        await tx
          .update(story)
          .set({ viewVersion: current.viewVersion + 1 })
          .where(eq(story.id, id));
        await tx
          .insert(storyControl)
          .values({ storyId: id, operationId, request: input });
        await enqueue(tx, {
          id: randomUUID(),
          operationId: interval.id,
          topic: intervalWakeTopic,
        });
      });
      return read(owner, id);
    },
    /** Worker-only operation. PostgreSQL rechecks eligibility before publication. */
    async advanceInterval(intervalId: string): Promise<number | null> {
      identifier(intervalId);
      return database.db.transaction(async (tx) => {
        const [reference] = await tx
          .select()
          .from(storyPassage)
          .where(eq(storyPassage.id, intervalId));
        if (!reference) throw new StoryError('not_found');
        const [current] = await tx
          .select()
          .from(story)
          .where(eq(story.id, reference.storyId))
          .for('update');
        if (!current) throw new StoryError('not_found');
        // Timing state is mutable: read it only after acquiring the story lock.
        const [interval] = await tx
          .select()
          .from(storyPassage)
          .where(eq(storyPassage.id, intervalId));
        if (!interval || interval.waitPlan === null)
          throw new StoryError('not_found');
        const plan = waitPlanSchema.parse(interval.waitPlan);
        if (current.revision !== interval.sequence) return null;
        if (interval.remainingMs !== null) return -1;
        const [clock] = await tx
          .select({ now: sql<Date>`clock_timestamp()` })
          .from(story)
          .where(eq(story.id, current.id));
        const remaining =
          interval.dueAt!.getTime() - new Date(clock!.now).getTime();
        if (remaining > 0) return remaining;
        await commit(
          tx,
          current.ownerId,
          current.id,
          intervalId,
          continuationSchema.parse({
            expectedRevision: interval.sequence,
            ...plan.arrival,
          }),
          intervalId,
        );
        return null;
      });
    },
    /** Internal commit for an already resolved narrative continuation.
     * Not command admission, a rule resolver or an HTTP content-writing endpoint.
     * No inference or other external work belongs inside this transaction.
     */
    async append(
      owner: string,
      id: string,
      transitionId: string,
      proposed: unknown,
    ) {
      identifier(id);
      identifier(transitionId);
      const parsed = continuationSchema.safeParse(proposed);
      if (!parsed.success) throw new StoryError('invalid');
      const input = parsed.data;
      if (input.wait && input.interaction !== null)
        throw new StoryError('invalid');
      await database.db.transaction((tx) =>
        commit(tx, owner, id, transitionId, input),
      );
      // A retry returns today's snapshot, never an old scene to roll the UI back.
      return read(owner, id);
    },
    async history(owner: string, id: string, before?: unknown) {
      return reads.readHistory({ ownerId: owner, storyId: id, before });
    },
    /** Server-selected immutable source only. Never pass HTTP bodies here. */
    async initialize(owner: string, id: string, initial: unknown) {
      identifier(id);
      const input = initialSchema.parse(initial);
      await database.db.transaction(async (tx) => {
        const inserted = await tx
          .insert(story)
          .values({ id, ownerId: owner, source: input.source })
          .onConflictDoNothing()
          .returning({ id: story.id });
        if (!inserted.length) {
          const [prior] = await tx.select().from(story).where(eq(story.id, id));
          if (!prior || prior.ownerId !== owner)
            throw new StoryError('not_found');
          if (prior.source !== input.source) throw new StoryError('conflict');
          const [first] = await tx
            .select()
            .from(storyPassage)
            .where(
              and(eq(storyPassage.storyId, id), eq(storyPassage.sequence, 1)),
            );
          if (
            !first ||
            !matchesPassage(first, input) ||
            !isDeepStrictEqual(first.initialItems ?? [], input.items)
          )
            throw new StoryError('conflict');
          return;
        }
        if (input.items.length)
          await tx
            .insert(storyItem)
            .values(input.items.map((item) => ({ storyId: id, ...item })));
        await tx.insert(storyPassage).values({
          id: randomUUID(),
          storyId: id,
          sequence: 1,
          initialItems: input.items,
          content: input.content,
          interaction: input.interaction
            ? interactionSchema.parse({
                id: randomUUID(),
                specification: input.interaction,
              })
            : null,
        });
      });
      return read(owner, id);
    },
  };
}

export { StoryError } from './story-errors';
