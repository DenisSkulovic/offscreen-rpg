import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { and, desc, eq, lt, lte } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '@offscreen/db';
import { story, storyPassage } from '@offscreen/db/story-schema';
import {
  passageContentSchema,
  storySnapshotSchema,
  storyHistorySchema,
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
  content: passageContentSchema,
  interaction: interactionSpecificationSchema.nullable(),
});
const continuationSchema = z.strictObject({
  expectedRevision: z.number().int().positive().max(2147483646),
  content: passageContentSchema,
  interaction: interactionSpecificationSchema.nullable(),
  response: interactionSubmissionSchema.nullable().default(null),
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
export class StoryError extends Error {
  constructor(readonly code: 'invalid' | 'not_found' | 'conflict') {
    super(code);
  }
}
function identifier(value: unknown) {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) throw new StoryError('invalid');
  return parsed.data;
}

export function createStories(database: Database) {
  async function read(owner: string, id: string) {
    const [row] = await database.db
      .select({
        id: story.id,
        revision: story.revision,
        passageId: storyPassage.id,
        content: storyPassage.content,
        interaction: storyPassage.interaction,
      })
      .from(story)
      .innerJoin(
        storyPassage,
        and(
          eq(storyPassage.storyId, story.id),
          eq(storyPassage.sequence, story.revision),
        ),
      )
      .where(and(eq(story.id, identifier(id)), eq(story.ownerId, owner)));
    if (!row) throw new StoryError('not_found');
    return storySnapshotSchema.parse({
      id: row.id,
      revision: row.revision,
      current: {
        id: row.passageId,
        content: row.content,
        interaction: row.interaction,
      },
    });
  }
  return {
    read,
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
      await database.db.transaction(async (tx) => {
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
        const next = current.revision + 1;
        await tx.insert(storyPassage).values({
          id: randomUUID(),
          storyId: id,
          sequence: next,
          transitionId,
          response: input.response,
          content: input.content,
          interaction: input.interaction
            ? interactionSchema.parse({
                id: randomUUID(),
                specification: input.interaction,
              })
            : null,
        });
        await tx.update(story).set({ revision: next }).where(eq(story.id, id));
      });
      // A retry returns today's snapshot, never an old scene to roll the UI back.
      return read(owner, id);
    },
    async history(owner: string, id: string, before?: unknown) {
      // Parse query text explicitly: no coercion of arrays, blanks or fractions.
      const cursor = z
        .string()
        .regex(/^[1-9]\d{0,9}$/)
        .transform(Number)
        .pipe(z.number().int().max(2147483647))
        .optional()
        .safeParse(before);
      if (!cursor.success) throw new StoryError('invalid');
      const rows = await database.db
        .select({
          id: storyPassage.id,
          sequence: storyPassage.sequence,
          content: storyPassage.content,
        })
        .from(story)
        .leftJoin(
          storyPassage,
          and(
            eq(storyPassage.storyId, story.id),
            lte(storyPassage.sequence, story.revision),
            cursor.data === undefined
              ? undefined
              : lt(storyPassage.sequence, cursor.data),
          ),
        )
        .where(and(eq(story.id, identifier(id)), eq(story.ownerId, owner)))
        .orderBy(desc(storyPassage.sequence))
        .limit(21);
      // The left join distinguishes an exhausted page from an inaccessible story
      // within one database snapshot, including on empty cursor ranges.
      if (!rows.length) throw new StoryError('not_found');
      const entries = rows.filter((row) => row.id !== null);
      return storyHistorySchema.parse({
        items: entries.slice(0, 20),
        nextBefore: entries.length > 20 ? entries[19]!.sequence : null,
      });
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
          if (!first || !matchesPassage(first, input))
            throw new StoryError('conflict');
          return;
        }
        await tx.insert(storyPassage).values({
          id: randomUUID(),
          storyId: id,
          sequence: 1,
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
