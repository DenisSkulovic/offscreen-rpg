import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '@offscreen/db';
import { story, storyPassage } from '@offscreen/db/story-schema';
import {
  passageContentSchema,
  storySnapshotSchema,
} from '@offscreen/contracts/stories';
import {
  interactionSpecificationSchema,
  interactionSchema,
} from '@offscreen/contracts/interactions';

const initialSchema = z.strictObject({
  source: z.string().min(1).max(100),
  content: passageContentSchema,
  interaction: interactionSpecificationSchema.nullable(),
});
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
            !isDeepStrictEqual(first.content, input.content) ||
            !isDeepStrictEqual(
              first.interaction
                ? interactionSchema.parse(first.interaction).specification
                : null,
              input.interaction,
            )
          )
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
