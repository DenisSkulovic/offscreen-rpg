/**
 * GM06: truthful per-viewer “since last opened” checkpoint.
 * Visit open is read-only; ACK is a separate idempotent mutation.
 */
import { randomUUID } from 'node:crypto';
import { and, desc, eq, gt, lte, max, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '@offscreen/db';
import { storyPublicEvent } from '@offscreen/story-persistence/campaign';
import {
  story,
  storyViewerVisit,
  storyViewerVisitAck,
  storyViewerVisitOpen,
} from '@offscreen/story-persistence/stories';
import { StoryError, parseStoryIdentifier } from './errors';
import { publicStoryEventSchema } from './public-events';

export const VISIT_TOKEN_TTL_MS = 10 * 60 * 1000;
export const VISIT_WINDOW_LIMIT = 20;

export const storyVisitOpeningSchema = z.strictObject({
  previous: z
    .strictObject({
      eventSequence: z.number().int().nonnegative(),
    })
    .nullable(),
  frontier: z.number().int().nonnegative(),
  coverage: z.enum(['since-enabled', 'complete']),
  window: z.strictObject({
    items: z.array(publicStoryEventSchema).max(VISIT_WINDOW_LIMIT),
    hasMore: z.boolean(),
    count: z.number().int().nonnegative().optional(),
  }),
  visitToken: z.uuid(),
});

export const storyVisitAckResultSchema = z.strictObject({
  acknowledgedSequence: z.number().int().nonnegative(),
  status: z.enum(['applied', 'already-current']),
});

export type StoryVisitOpening = z.infer<typeof storyVisitOpeningSchema>;
export type StoryVisitAckResult = z.infer<typeof storyVisitAckResultSchema>;

async function requireOwnedStory(
  database: Database,
  ownerId: string,
  storyId: string,
) {
  parseStoryIdentifier(storyId);
  const [owned] = await database.db
    .select({ id: story.id })
    .from(story)
    .where(and(eq(story.id, storyId), eq(story.ownerId, ownerId)));
  if (!owned) throw new StoryError('not_found');
}

export async function readStoryVisitOpening(
  database: Database,
  args: { ownerId: string; storyId: string },
): Promise<StoryVisitOpening> {
  await requireOwnedStory(database, args.ownerId, args.storyId);

  const [checkpoint] = await database.db
    .select()
    .from(storyViewerVisit)
    .where(
      and(
        eq(storyViewerVisit.storyId, args.storyId),
        eq(storyViewerVisit.viewerId, args.ownerId),
      ),
    );
  const previousSequence =
    checkpoint && checkpoint.acknowledgedEventSequence > 0
      ? checkpoint.acknowledgedEventSequence
      : null;

  const [frontierRow] = await database.db
    .select({
      frontier: sql<number>`coalesce(${max(storyPublicEvent.eventSequence)}, 0)`,
    })
    .from(storyPublicEvent)
    .where(eq(storyPublicEvent.storyId, args.storyId));
  const frontier = Number(frontierRow?.frontier ?? 0);

  const lower = previousSequence ?? 0;
  const rows = await database.db
    .select()
    .from(storyPublicEvent)
    .where(
      and(
        eq(storyPublicEvent.storyId, args.storyId),
        gt(storyPublicEvent.eventSequence, lower),
        lte(storyPublicEvent.eventSequence, frontier),
      ),
    )
    .orderBy(desc(storyPublicEvent.eventSequence))
    .limit(VISIT_WINDOW_LIMIT + 1);

  const page = rows.slice(0, VISIT_WINDOW_LIMIT);
  const hasMore = rows.length > VISIT_WINDOW_LIMIT;
  const window = z.array(publicStoryEventSchema).max(VISIT_WINDOW_LIMIT).parse(
    page.map((row) => ({
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
  );

  const visitToken = randomUUID();
  const now = new Date();
  await database.db.insert(storyViewerVisitOpen).values({
    visitToken,
    storyId: args.storyId,
    viewerId: args.ownerId,
    previousSequence,
    frontier,
    expiresAt: new Date(now.getTime() + VISIT_TOKEN_TTL_MS),
    createdAt: now,
  });

  return storyVisitOpeningSchema.parse({
    previous:
      previousSequence === null ? null : { eventSequence: previousSequence },
    frontier,
    coverage: 'since-enabled',
    window: {
      items: window,
      hasMore,
      ...(hasMore ? {} : { count: window.length }),
    },
    visitToken,
  });
}

export async function acknowledgeStoryVisit(
  database: Database,
  args: {
    ownerId: string;
    storyId: string;
    ackId: string;
    visitToken: string;
    frontier: number;
  },
): Promise<StoryVisitAckResult> {
  await requireOwnedStory(database, args.ownerId, args.storyId);
  parseStoryIdentifier(args.ackId);
  parseStoryIdentifier(args.visitToken);
  const frontier = z.number().int().nonnegative().parse(args.frontier);

  return database.db.transaction(async (tx) => {
    const [existingAck] = await tx
      .select()
      .from(storyViewerVisitAck)
      .where(eq(storyViewerVisitAck.ackId, args.ackId));
    if (existingAck) {
      if (
        existingAck.storyId !== args.storyId ||
        existingAck.viewerId !== args.ownerId ||
        existingAck.visitToken !== args.visitToken ||
        existingAck.frontier !== frontier
      ) {
        throw new StoryError('conflict', 'ack_idempotency_mismatch');
      }
      const [current] = await tx
        .select()
        .from(storyViewerVisit)
        .where(
          and(
            eq(storyViewerVisit.storyId, args.storyId),
            eq(storyViewerVisit.viewerId, args.ownerId),
          ),
        );
      return storyVisitAckResultSchema.parse({
        acknowledgedSequence: current?.acknowledgedEventSequence ?? frontier,
        status: 'already-current',
      });
    }

    const [open] = await tx
      .select()
      .from(storyViewerVisitOpen)
      .where(eq(storyViewerVisitOpen.visitToken, args.visitToken))
      .for('update');
    if (
      !open ||
      open.storyId !== args.storyId ||
      open.viewerId !== args.ownerId
    ) {
      throw new StoryError('not_found', 'visit_token');
    }
    if (open.expiresAt.getTime() < Date.now()) {
      throw new StoryError('conflict', 'visit_token_expired');
    }
    if (open.frontier !== frontier) {
      throw new StoryError('conflict', 'visit_frontier_mismatch');
    }

    const [frontierRow] = await tx
      .select({
        frontier: sql<number>`coalesce(${max(storyPublicEvent.eventSequence)}, 0)`,
      })
      .from(storyPublicEvent)
      .where(eq(storyPublicEvent.storyId, args.storyId));
    const committedFrontier = Number(frontierRow?.frontier ?? 0);
    if (frontier > committedFrontier) {
      throw new StoryError('conflict', 'frontier_ahead_of_committed');
    }

    const [checkpoint] = await tx
      .select()
      .from(storyViewerVisit)
      .where(
        and(
          eq(storyViewerVisit.storyId, args.storyId),
          eq(storyViewerVisit.viewerId, args.ownerId),
        ),
      )
      .for('update');
    const previous = checkpoint?.acknowledgedEventSequence ?? 0;
    const next = Math.max(previous, frontier);
    const now = new Date();
    if (!checkpoint) {
      await tx.insert(storyViewerVisit).values({
        storyId: args.storyId,
        viewerId: args.ownerId,
        acknowledgedEventSequence: next,
        acknowledgedAt: now,
        updatedAt: now,
      });
    } else if (next > previous) {
      await tx
        .update(storyViewerVisit)
        .set({
          acknowledgedEventSequence: next,
          acknowledgedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(storyViewerVisit.storyId, args.storyId),
            eq(storyViewerVisit.viewerId, args.ownerId),
          ),
        );
    }

    await tx.insert(storyViewerVisitAck).values({
      ackId: args.ackId,
      storyId: args.storyId,
      viewerId: args.ownerId,
      visitToken: args.visitToken,
      frontier,
    });

    return storyVisitAckResultSchema.parse({
      acknowledgedSequence: next,
      status: next > previous ? 'applied' : 'already-current',
    });
  });
}
