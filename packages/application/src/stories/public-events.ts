/**
 * GM05: append-only public story event projection under the story write lock.
 * Derived evidence only — never a new game authority.
 */
import { randomUUID } from 'node:crypto';
import { and, desc, eq, lt, max, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '@offscreen/db';
import { storyPublicEvent } from '@offscreen/db/campaign-schema';
import { story } from '@offscreen/db/story-schema';
import type { Transaction } from '../outbox/index';
import { StoryError, parseStoryIdentifier } from './errors';

export const publicStoryEventKindSchema = z.enum([
  'passage-published',
  'action-settled',
  'action-interrupted',
  'activity-development',
  'world-development',
]);

export const publicStoryEventSourceKindSchema = z.enum([
  'passage',
  'action-execution',
  'activity-event',
  'world-obligation',
]);

export const publicStoryEventSchema = z.strictObject({
  id: z.uuid(),
  sequence: z.number().int().positive(),
  kind: publicStoryEventKindSchema,
  gameSecond: z.number().int().nonnegative().nullable(),
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500).nullable(),
  source: z.strictObject({
    kind: publicStoryEventSourceKindSchema,
    id: z.uuid(),
    passageId: z.uuid().optional(),
  }),
});

export const storyEventPageSchema = z.strictObject({
  items: z.array(publicStoryEventSchema).max(50),
  nextBefore: z.number().int().positive().nullable(),
  coverage: z.enum(['since-enabled', 'complete']),
});

export type PublicStoryEvent = z.infer<typeof publicStoryEventSchema>;
export type StoryEventPage = z.infer<typeof storyEventPageSchema>;

export async function appendPublicStoryEvent(
  tx: Transaction,
  args: {
    storyId: string;
    kind: z.infer<typeof publicStoryEventKindSchema>;
    gameSecond?: number | null;
    title: string;
    summary?: string | null;
    sourceKind: z.infer<typeof publicStoryEventSourceKindSchema>;
    sourceId: string;
    passageId?: string | null;
  },
) {
  const title = args.title.slice(0, 200);
  const summary =
    args.summary === undefined || args.summary === null
      ? null
      : args.summary.slice(0, 500);
  const [existing] = await tx
    .select({ id: storyPublicEvent.id })
    .from(storyPublicEvent)
    .where(
      and(
        eq(storyPublicEvent.storyId, args.storyId),
        eq(storyPublicEvent.sourceKind, args.sourceKind),
        eq(storyPublicEvent.sourceId, args.sourceId),
      ),
    );
  if (existing) return existing.id;

  const [frontier] = await tx
    .select({
      next: sql<number>`coalesce(${max(storyPublicEvent.eventSequence)}, 0) + 1`,
    })
    .from(storyPublicEvent)
    .where(eq(storyPublicEvent.storyId, args.storyId));
  const eventSequence = Number(frontier?.next ?? 1);
  const id = randomUUID();
  await tx.insert(storyPublicEvent).values({
    id,
    storyId: args.storyId,
    eventSequence,
    kind: args.kind,
    gameSecond: args.gameSecond ?? null,
    title,
    summary,
    sourceKind: args.sourceKind,
    sourceId: args.sourceId,
    passageId: args.passageId ?? null,
  });
  return id;
}

export async function readPublicStoryEvents(
  database: Database,
  args: {
    ownerId: string;
    storyId: string;
    before?: unknown;
    limit?: unknown;
  },
): Promise<StoryEventPage> {
  parseStoryIdentifier(args.storyId);
  const before =
    args.before === undefined
      ? undefined
      : z.coerce.number().int().positive().parse(args.before);
  const limit = z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20)
    .parse(args.limit ?? 20);

  const [owned] = await database.db
    .select({ id: story.id })
    .from(story)
    .where(and(eq(story.id, args.storyId), eq(story.ownerId, args.ownerId)));
  if (!owned) throw new StoryError('not_found');

  const rows = await database.db
    .select()
    .from(storyPublicEvent)
    .where(
      before === undefined
        ? eq(storyPublicEvent.storyId, args.storyId)
        : and(
            eq(storyPublicEvent.storyId, args.storyId),
            lt(storyPublicEvent.eventSequence, before),
          ),
    )
    .orderBy(desc(storyPublicEvent.eventSequence))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const overflow = rows.length > limit;
  return storyEventPageSchema.parse({
    items: page.map((row) => ({
      id: row.id,
      sequence: row.eventSequence,
      kind: row.kind,
      gameSecond: row.gameSecond,
      title: row.title,
      summary: row.summary,
      source: {
        kind: row.sourceKind,
        id: row.sourceId,
        ...(row.passageId ? { passageId: row.passageId } : {}),
      },
    })),
    nextBefore: overflow ? page[page.length - 1]!.eventSequence : null,
    coverage: 'since-enabled',
  });
}
