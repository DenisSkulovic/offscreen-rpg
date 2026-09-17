import {
  storyHistorySchema,
  storySnapshotSchema,
} from '@offscreen/contracts/stories';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import {
  story,
  storyPassage,
  storyResolution,
} from '@offscreen/db/story-schema';
import { and, desc, eq, lt, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { StoryError, parseStoryIdentifier } from './story-errors';
import { decisionPlanSchema, waitPlanSchema } from './story-plans';

type OwnedStory = Readonly<{
  ownerId: string;
  storyId: string;
}>;

type ReadStoryHistory = OwnedStory &
  Readonly<{
    before?: unknown;
  }>;

function parseHistoryCursor(before: unknown) {
  const cursor = z
    .string()
    .regex(/^[1-9]\d{0,9}$/)
    .transform(Number)
    .pipe(z.number().int().max(2147483647))
    .optional()
    .safeParse(before);
  if (!cursor.success) {
    throw new StoryError('invalid');
  }
  return cursor.data;
}

function timestampIso(value: Date | null, field: string) {
  if (value === null) {
    throw new Error(`Stored story is missing ${field}`);
  }
  return value.toISOString();
}

function publicResolutionState(
  state: 'pending' | 'running' | 'succeeded' | 'failed' | 'uncertain' | null,
) {
  if (state === null) {
    return null;
  }
  if (state === 'succeeded') {
    return { state: 'running' as const };
  }
  return { state };
}

export function createStoryReads(database: Database) {
  return {
    async readSnapshot({ ownerId, storyId }: OwnedStory) {
      const [row] = await database.db
        .select({
          id: story.id,
          revision: story.revision,
          viewVersion: story.viewVersion,
          items: sql<unknown>`COALESCE((SELECT jsonb_agg(jsonb_build_object('key', i.key, 'label', i.label, 'holderKey', i.holder_key) ORDER BY i.key) FROM story_item i WHERE i.story_id = ${story.id}), '[]'::jsonb)`,
          passageId: storyPassage.id,
          content: storyPassage.content,
          interaction: storyPassage.interaction,
          waitPlan: storyPassage.waitPlan,
          decisionPlan: storyPassage.decisionPlan,
          responseDueAt: storyPassage.responseDueAt,
          dueAt: storyPassage.dueAt,
          intervalVersion: storyPassage.intervalVersion,
          controlRevision: storyPassage.controlRevision,
          remainingMs: storyPassage.remainingMs,
          resolutionState: generation.state,
        })
        .from(story)
        .innerJoin(
          storyPassage,
          and(
            eq(storyPassage.storyId, story.id),
            eq(storyPassage.sequence, story.revision),
          ),
        )
        .leftJoin(
          storyResolution,
          and(
            eq(storyResolution.storyId, story.id),
            eq(storyResolution.basePassageId, storyPassage.id),
            eq(storyResolution.baseRevision, story.revision),
          ),
        )
        .leftJoin(generation, eq(generation.id, storyResolution.generationId))
        .where(
          and(
            eq(story.id, parseStoryIdentifier(storyId)),
            eq(story.ownerId, ownerId),
          ),
        );
      if (!row) {
        throw new StoryError('not_found');
      }
      return storySnapshotSchema.parse({
        id: row.id,
        revision: row.revision,
        viewVersion: row.viewVersion,
        items: row.items,
        decision:
          row.decisionPlan === null
            ? null
            : {
                dueAt: timestampIso(row.responseDueAt, 'response due time'),
                defaultOptionId: decisionPlanSchema.parse(row.decisionPlan)
                  .defaultOptionId,
              },
        waiting:
          row.waitPlan === null
            ? null
            : {
                dueAt:
                  row.remainingMs === null
                    ? timestampIso(row.dueAt, 'interval due time')
                    : null,
                remainingMs: row.remainingMs,
                canControl: row.intervalVersion === 1,
                controlRevision: row.controlRevision,
                gameDurationMs: waitPlanSchema.parse(row.waitPlan)
                  .gameDurationMs,
              },
        current: {
          id: row.passageId,
          content: row.content,
          interaction: row.interaction,
        },
        resolution: publicResolutionState(row.resolutionState ?? null),
      });
    },

    async readHistory({ ownerId, storyId, before }: ReadStoryHistory) {
      const cursor = parseHistoryCursor(before);
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
            cursor === undefined
              ? undefined
              : lt(storyPassage.sequence, cursor),
          ),
        )
        .where(
          and(
            eq(story.id, parseStoryIdentifier(storyId)),
            eq(story.ownerId, ownerId),
          ),
        )
        .orderBy(desc(storyPassage.sequence))
        .limit(21);

      // The left join distinguishes exhausted history from an inaccessible story
      // in one database snapshot, including when the cursor range is empty.
      if (!rows.length) {
        throw new StoryError('not_found');
      }
      const entries = rows.filter((row) => row.id !== null);
      const nextPageStart = entries.at(19);
      return storyHistorySchema.parse({
        items: entries.slice(0, 20),
        nextBefore:
          entries.length > 20 && nextPageStart ? nextPageStart.sequence : null,
      });
    },
  };
}
