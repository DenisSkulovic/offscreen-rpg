import { initialCreative } from './campaign-settings';
import { readCampaign } from './campaign-reads';
import {
  storytellerProfileSchema,
  storytellerSummary,
} from '@offscreen/ai/storytellers';
import { executionPolicySchema } from '@offscreen/ai/storyteller-policy';
import { storytellerPublication } from '@offscreen/db/storyteller-schema';
import { storyListSchema } from '@offscreen/contracts/stories';
import {
  storyHistorySchema,
  passageContentSchema,
  storySnapshotSchema,
} from '@offscreen/contracts/stories';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import {
  story,
  storyPassage,
  storyResolution,
} from '@offscreen/db/story-schema';
import { and, desc, eq, lt, lte, or, sql } from 'drizzle-orm';
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

function listStoryStatus(row: {
  wait: unknown;
  remaining: number | null;
  interaction: unknown;
}) {
  if (row.wait) {
    return row.remaining === null ? 'Waiting' : 'Paused';
  }
  return row.interaction ? 'A choice awaits' : 'Concluded';
}

export function createStoryReads(database: Database) {
  return {
    async listStories({
      ownerId,
      before,
    }: {
      ownerId: string;
      before?: string;
    }) {
      let boundary;
      if (before) {
        const [row] = await database.db
          .select()
          .from(story)
          .where(
            and(
              eq(story.id, parseStoryIdentifier(before)),
              eq(story.ownerId, ownerId),
            ),
          );
        if (!row) {
          throw new StoryError('not_found');
        }
        boundary = or(
          lt(story.createdAt, row.createdAt),
          and(eq(story.createdAt, row.createdAt), lt(story.id, row.id)),
        );
      }
      const rows = await database.db
        .select({
          id: story.id,
          profile: story.storyteller,
          content: storyPassage.content,
          interaction: storyPassage.interaction,
          activityState: sql<string | null>`(SELECT a.state FROM campaign c JOIN game_activity a ON a.id = c.active_activity_id WHERE c.story_id = ${story.id} AND c.tick IS NOT NULL)`,
          wait: storyPassage.waitPlan,
          remaining: storyPassage.remainingMs,
        })
        .from(story)
        .innerJoin(
          storyPassage,
          and(
            eq(storyPassage.storyId, story.id),
            eq(storyPassage.sequence, story.revision),
          ),
        )
        .where(and(eq(story.ownerId, ownerId), boundary))
        .orderBy(desc(story.createdAt), desc(story.id))
        .limit(21);
      return storyListSchema.parse({
        items: rows.slice(0, 20).map((row) => ({
          id: row.id,
          title: passageContentSchema.parse(row.content).title,
          storyteller:
            row.profile == null
              ? null
              : storytellerSummary(storytellerProfileSchema.parse(row.profile)),
          status: row.activityState === 'running' ? 'Activity in progress' : row.activityState === 'paused' ? 'Activity paused' : row.activityState === 'encounter' ? 'An encounter awaits' : listStoryStatus(row),
        })),
        nextBefore: rows.length > 20 ? rows[19]?.id : null,
      });
    },
    async readSnapshot({ ownerId, storyId }: OwnedStory) {
      return database.db.transaction(async (tx) => {
      const [row] = await tx
        .select({
          id: story.id,
          storyteller: story.storyteller,
          execution: story.execution,
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
          controlRevision: storyPassage.controlRevision,
          remainingMs: storyPassage.remainingMs,
          usage: sql<unknown>`(SELECT jsonb_build_object('settledMicrousd', COALESCE(sum(a.charged_microusd), 0)::text, 'reservedMicrousd', COALESCE(sum(CASE WHEN a.state IN ('reserved','dispatched','uncertain') THEN a.reserved_microusd ELSE 0 END), 0)::text) FROM storyteller_attempt a WHERE a.generation_id IN (SELECT p.source_generation_id FROM story_passage p WHERE p.story_id = ${story.id} UNION SELECT r.generation_id FROM story_resolution r WHERE r.story_id = ${story.id}))`,
          resolutionState: generation.state,
          resolutionVersion: generation.statusRevision,
          failureCode: generation.failureCode,
          publicationState: storytellerPublication.state,
          publicationFailure: storytellerPublication.failureCode,
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
        .leftJoin(
          storytellerPublication,
          eq(storytellerPublication.generationId, generation.id),
        )
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
        campaign: (await readCampaign(tx, ownerId, storyId)) ?? (row.storyteller ? { settings: { revision: 1, creative: initialCreative(storytellerProfileSchema.parse(row.storyteller)), pace: { kind: 'rate', ticks: 1, realMs: 1000 }, locked: false, rules: 'srd-5.2.1-subset.v1', risk: 'nonlethal' }, character: null, location: null, tick: 0, offer: null, activity: null, rolls: [] } : null),
        id: row.id,
        storyteller:
          row.storyteller == null
            ? null
            : storytellerSummary(
                storytellerProfileSchema.parse(row.storyteller),
              ),
        sourceMode:
          row.execution == null
            ? 'scripted'
            : executionPolicySchema.parse(row.execution).mode,
        revision: row.revision,
        viewVersion: row.viewVersion,
        items: row.items,
        usage: row.usage,
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
                canControl: true,
                controlRevision: row.controlRevision,
                gameDurationMs: waitPlanSchema.parse(row.waitPlan)
                  .gameDurationMs,
              },
        current: {
          id: row.passageId,
          content: row.content,
          interaction: row.interaction,
        },
        resolution:
          row.resolutionState === null
            ? null
            : {
                ...publicResolutionState(row.resolutionState),
                state:
                  row.publicationState === 'blocked' ||
                  row.publicationState === 'stale'
                    ? 'blocked'
                    : publicResolutionState(row.resolutionState)?.state,
                version: row.resolutionVersion ?? 0,
                reason: row.publicationFailure ?? row.failureCode,
                canRetry:
                  row.publicationState === 'blocked' ||
                  row.resolutionState === 'failed',
              },
      });
      }, { isolationLevel: 'repeatable read', accessMode: 'read only' });
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
