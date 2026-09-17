import { and, desc, eq, lt, or, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { storyDraft } from '@offscreen/db/draft-schema';
import { draftIdSchema, saveDraftSchema } from '@offscreen/contracts/drafts';
import type { Draft, DraftContent } from '@offscreen/contracts/drafts';

export class DraftError extends Error {
  constructor(public readonly code: 'not_found' | 'conflict' | 'invalid') {
    super(code);
  }
}

function present(row: typeof storyDraft.$inferSelect): Draft {
  return {
    id: row.id,
    title: row.title,
    premise: row.premise,
    storytellingDirection: row.storytellingDirection,
    revision: row.revision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function createDrafts(database: Database) {
  const owned = (ownerId: string, id: string) =>
    and(eq(storyDraft.ownerId, ownerId), eq(storyDraft.id, id));
  function id(value: unknown) {
    const parsed = draftIdSchema.safeParse(value);
    if (!parsed.success) throw new DraftError('invalid');
    return parsed.data;
  }
  return {
    async read(ownerId: string, draftId: string) {
      const [row] = await database.db
        .select()
        .from(storyDraft)
        .where(owned(ownerId, id(draftId)));
      if (!row) throw new DraftError('not_found');
      return present(row);
    },
    async list(ownerId: string, cursor?: string) {
      let boundary;
      if (cursor) {
        const [row] = await database.db
          .select()
          .from(storyDraft)
          .where(owned(ownerId, id(cursor)));
        if (!row) throw new DraftError('not_found');
        boundary = or(
          lt(storyDraft.createdAt, row.createdAt),
          and(
            eq(storyDraft.createdAt, row.createdAt),
            lt(storyDraft.id, row.id),
          ),
        );
      }
      const rows = await database.db
        .select()
        .from(storyDraft)
        .where(and(eq(storyDraft.ownerId, ownerId), boundary))
        .orderBy(desc(storyDraft.createdAt), desc(storyDraft.id))
        .limit(21);
      return {
        items: rows.slice(0, 20).map(present),
        nextCursor: rows.length > 20 ? rows[19]!.id : null,
      };
    },
    async save(ownerId: string, draftId: string, input: unknown) {
      const key = id(draftId);
      const parsed = saveDraftSchema.safeParse(input);
      if (!parsed.success) throw new DraftError('invalid');
      const { expectedRevision, ...content } = parsed.data;
      return database.db.transaction(async (tx) => {
        if (expectedRevision === 0) {
          const [created] = await tx
            .insert(storyDraft)
            .values({ id: key, ownerId, ...content })
            .onConflictDoNothing()
            .returning();
          if (created) return present(created);
        }
        const [current] = await tx
          .select()
          .from(storyDraft)
          .where(owned(ownerId, key))
          .for('update');
        if (!current) throw new DraftError('not_found');
        const identical = (
          Object.keys(content) as (keyof DraftContent)[]
        ).every((field) => current[field] === content[field]);
        // A lost response can be retried without creating another draft or revision.
        if (
          identical &&
          (current.revision === expectedRevision ||
            current.revision === expectedRevision + 1)
        )
          return present(current);
        if (current.revision !== expectedRevision)
          throw new DraftError('conflict');
        const [saved] = await tx
          .update(storyDraft)
          .set({
            ...content,
            revision: current.revision + 1,
            updatedAt: sql`clock_timestamp()`,
          })
          .where(owned(ownerId, key))
          .returning();
        return present(saved!);
      });
    },
  };
}
export type Drafts = ReturnType<typeof createDrafts>;
