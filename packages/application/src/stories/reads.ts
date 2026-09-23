/**
 * Public story snapshot and history projection under repeatable-read isolation.
 * Must not admit commands or mutate authority; see ./index.ts and
 * ../campaign/actions.ts for mechanical selection.
 */
import { initialCreative } from '../campaign/settings';
import { readCampaign } from '../campaign/reads';
import {
  storytellerProfileSchema,
  storytellerSummary,
} from '@offscreen/storyteller/profiles';
import { executionPolicySchema } from '@offscreen/storyteller/tasks';
import {
  storytellerAttempt,
  storytellerPublication,
} from '@offscreen/db/storyteller-schema';
import { storyListSchema } from '@offscreen/contracts/stories';
import {
  storyHistorySchema,
  passageContentSchema,
  storySnapshotSchema,
} from '@offscreen/contracts/stories';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { campaign } from '@offscreen/db/campaign-schema';
import {
  story,
  storyPassage,
  storyResolution,
} from '@offscreen/db/story-schema';
import { and, desc, eq, lt, lte, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { StoryError, parseStoryIdentifier } from './errors';
import { decisionPlanSchema, waitPlanSchema } from './plans';
import { disabledReadCache, type ReadCacheOptions } from '../cache/read-cache';
import type { DocumentStore } from '@offscreen/documents';
import { readPassageDocument } from './passage-documents';

type StoryReadOptions = ReadCacheOptions &
  Readonly<{
    documentStore?: DocumentStore;
  }>;

async function resolvePassageContent(
  row: Readonly<{
    content: unknown;
    contentDocumentHash: string | null;
  }>,
  storage?: DocumentStore,
) {
  if (row.contentDocumentHash === null) {
    return passageContentSchema.parse(row.content);
  }
  if (!storage) {
    throw new StoryError('unavailable', 'document_store');
  }
  return readPassageDocument(storage, row.contentDocumentHash);
}

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

function publicResolutionEvidence(submission: unknown) {
  const parsed = z.object({ kind: z.string() }).safeParse(submission);
  return parsed.success && parsed.data.kind === 'pending-action-consequence'
    ? ('pending-action' as const)
    : ('committed' as const);
}

function publicResolutionBlocker(
  state: 'pending' | 'running' | 'succeeded' | 'failed' | 'uncertain' | null,
  publication: 'pending' | 'published' | 'stale' | 'blocked' | null,
  failureCode: string | null,
  sourceMode: 'scripted' | 'provider',
  attemptState: string | null,
) {
  // Public categories are deliberately stable and coarse. Provider/account
  // identifiers and internal policy sources remain in the accounting audit.
  if (publication === 'blocked' || publication === 'stale') {
    return { kind: 'publication' as const, recovery: 'retry' as const };
  }
  if (state === 'uncertain' || failureCode === 'usage_uncertain') {
    return { kind: 'usage-uncertain' as const, recovery: 'operator' as const };
  }
  if (state !== 'failed') return null;
  if (failureCode === 'budget_unavailable')
    return { kind: 'funding' as const, recovery: 'retry' as const };
  if (failureCode === 'window_exhausted')
    return { kind: 'usage-window' as const, recovery: 'retry' as const };
  if (failureCode === 'authority_unavailable')
    return { kind: 'authority' as const, recovery: 'retry' as const };
  if (failureCode === 'context_too_large')
    return { kind: 'task-input' as const, recovery: 'none' as const };
  if (failureCode === 'provider_disabled')
    return { kind: 'provider-disabled' as const, recovery: 'retry' as const };
  return {
    kind: 'generation' as const,
    recovery:
      sourceMode === 'scripted' || attemptState === 'unsent'
        ? ('retry' as const)
        : ('none' as const),
  };
}

function listStoryStatus(row: {
  wait: unknown;
  remaining: number | null;
  interaction: unknown;
  campaignOffer: unknown;
  hasCurrentResolution: boolean;
}) {
  if (row.wait) {
    return row.remaining === null ? 'Waiting' : 'Paused';
  }
  if (row.hasCurrentResolution) {
    return 'Storyteller needs attention';
  }
  return row.interaction || row.campaignOffer ? 'A choice awaits' : 'Concluded';
}

const snapshotCacheContract = 'story-snapshot.v1';
const snapshotCacheTtlSeconds = 30;
const snapshotCacheMaximumBytes = 512 * 1024;

function snapshotCacheKey(ownerId: string, storyId: string, identity: unknown) {
  const digest = createHash('sha256')
    .update(JSON.stringify({ ownerId, storyId, identity }))
    .digest('hex');
  return `${snapshotCacheContract}:${digest}`;
}

function cacheErrorKind(error: unknown) {
  return error instanceof Error && error.name ? error.name : 'UnknownError';
}

export function createStoryReads(
  database: Database,
  options: StoryReadOptions = {},
) {
  const cache = options.cache ?? disabledReadCache;

  async function snapshotIdentity({ ownerId, storyId }: OwnedStory) {
    const [row] = await database.db
      .select({
        viewVersion: story.viewVersion,
        resolutionState: generation.state,
        resolutionVersion: generation.statusRevision,
        failureCode: generation.failureCode,
        publicationState: storytellerPublication.state,
        publicationFailure: storytellerPublication.failureCode,
        attemptState: storytellerAttempt.state,
        usage: sql<unknown>`(SELECT jsonb_build_object('settledMicrousd', COALESCE(sum(a.charged_microusd), 0)::text, 'reservedMicrousd', COALESCE(sum(CASE WHEN a.state IN ('reserved','dispatched','uncertain') THEN a.reserved_microusd ELSE 0 END), 0)::text) FROM storyteller_attempt a WHERE a.generation_id IN (SELECT p.source_generation_id FROM story_passage p WHERE p.story_id = ${story.id} UNION SELECT r.generation_id FROM story_resolution r WHERE r.story_id = ${story.id}))`,
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
        storytellerAttempt,
        eq(storytellerAttempt.id, generation.attemptId),
      )
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
    if (!row) throw new StoryError('not_found');
    return row;
  }

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
          contentDocumentHash: storyPassage.contentDocumentHash,
          interaction: storyPassage.interaction,
          campaignOffer: campaign.offer,
          hasCurrentResolution: sql<boolean>`EXISTS (
            SELECT 1 FROM story_resolution r
            WHERE r.story_id = ${story.id}
              AND r.base_revision = ${story.revision}
          )`,
          activityState: sql<
            string | null
          >`(SELECT a.state FROM campaign c JOIN game_activity a ON a.id = c.active_activity_id WHERE c.story_id = ${story.id} AND c.tick IS NOT NULL)`,
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
        .leftJoin(campaign, eq(campaign.storyId, story.id))
        .where(and(eq(story.ownerId, ownerId), boundary))
        .orderBy(desc(story.createdAt), desc(story.id))
        .limit(21);
      const visibleRows = await Promise.all(
        rows.slice(0, 20).map(async (row) => ({
          row,
          content: await resolvePassageContent(row, options.documentStore),
        })),
      );
      return storyListSchema.parse({
        items: visibleRows.map(({ row, content }) => ({
          id: row.id,
          title: content.title,
          storyteller:
            row.profile == null
              ? null
              : storytellerSummary(storytellerProfileSchema.parse(row.profile)),
          status:
            row.activityState === 'running'
              ? 'Activity in progress'
              : row.activityState === 'paused'
                ? 'Activity paused'
                : row.activityState === 'encounter'
                  ? 'An encounter awaits'
                  : listStoryStatus(row),
        })),
        nextBefore: rows.length > 20 ? rows[19]?.id : null,
      });
    },
    async readSnapshot({ ownerId, storyId }: OwnedStory) {
      const identity = await snapshotIdentity({ ownerId, storyId });
      const key = snapshotCacheKey(ownerId, storyId, identity);
      try {
        const cached = await cache.get(key);
        if (cached !== null) return storySnapshotSchema.parse(cached);
      } catch (error) {
        options.onCacheIncident?.({
          operation: 'get',
          projection: 'story-snapshot',
          errorKind: cacheErrorKind(error),
        });
      }
      let builtIdentity: unknown;
      const snapshot = await database.db.transaction(
        async (tx) => {
          const [row] = await tx
            .select({
              id: story.id,
              forkedFromStoryId: story.forkedFromStoryId,
              forkedFromPassageId: story.forkedFromPassageId,
              forkedFromSequence: story.forkedFromSequence,
              storyteller: story.storyteller,
              execution: story.execution,
              revision: story.revision,
              viewVersion: story.viewVersion,
              items: sql<unknown>`COALESCE((SELECT jsonb_agg(jsonb_build_object('key', i.key, 'label', i.label, 'holderKey', i.holder_key) ORDER BY i.key) FROM story_item i WHERE i.story_id = ${story.id}), '[]'::jsonb)`,
              passageId: storyPassage.id,
              content: storyPassage.content,
              contentDocumentHash: storyPassage.contentDocumentHash,
              interaction: storyPassage.interaction,
              waitPlan: storyPassage.waitPlan,
              decisionPlan: storyPassage.decisionPlan,
              responseDueAt: storyPassage.responseDueAt,
              dueAt: storyPassage.dueAt,
              controlRevision: storyPassage.controlRevision,
              remainingMs: storyPassage.remainingMs,
              usage: sql<unknown>`(SELECT jsonb_build_object('settledMicrousd', COALESCE(sum(a.charged_microusd), 0)::text, 'reservedMicrousd', COALESCE(sum(CASE WHEN a.state IN ('reserved','dispatched','uncertain') THEN a.reserved_microusd ELSE 0 END), 0)::text) FROM storyteller_attempt a WHERE a.generation_id IN (SELECT p.source_generation_id FROM story_passage p WHERE p.story_id = ${story.id} UNION SELECT r.generation_id FROM story_resolution r WHERE r.story_id = ${story.id}))`,
              resolutionState: generation.state,
              resolutionSubmission: storyResolution.submission,
              resolutionVersion: generation.statusRevision,
              failureCode: generation.failureCode,
              publicationState: storytellerPublication.state,
              publicationFailure: storytellerPublication.failureCode,
              attemptState: storytellerAttempt.state,
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
            .leftJoin(
              generation,
              eq(generation.id, storyResolution.generationId),
            )
            .leftJoin(
              storytellerAttempt,
              eq(storytellerAttempt.id, generation.attemptId),
            )
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
          builtIdentity = {
            viewVersion: row.viewVersion,
            resolutionState: row.resolutionState,
            resolutionVersion: row.resolutionVersion,
            failureCode: row.failureCode,
            publicationState: row.publicationState,
            publicationFailure: row.publicationFailure,
            attemptState: row.attemptState,
            usage: row.usage,
          };
          const content = await resolvePassageContent(
            row,
            options.documentStore,
          );
          return storySnapshotSchema.parse({
            campaign:
              (await readCampaign(tx, ownerId, storyId)) ??
              (row.storyteller
                ? {
                    settings: {
                      revision: 1,
                      creative: initialCreative(
                        storytellerProfileSchema.parse(row.storyteller),
                      ),
                      pace: {
                        kind: 'rate',
                        fictionalSeconds: 1,
                        realSeconds: 1,
                      },
                      locked: false,
                      rules: 'srd-5.2.1-subset.v1',
                      risk: 'nonlethal',
                    },
                    character: null,
                    storyFacts: [],
                    location: null,
                    tick: 0,
                    offer: null,
                    activityAccess: { kind: 'none' },
                    activity: null,
                    commitments: [],
                    activityEvents: [],
                    rolls: [],
                    actionReceipts: [],
                  }
                : null),
            id: row.id,
            lineage:
              row.forkedFromStoryId === null ||
              row.forkedFromPassageId === null ||
              row.forkedFromSequence === null
                ? null
                : {
                    sourceStoryId: row.forkedFromStoryId,
                    sourcePassageId: row.forkedFromPassageId,
                    sourceSequence: row.forkedFromSequence,
                  },
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
              content,
              interaction: row.interaction,
            },
            resolution:
              row.resolutionState === null
                ? null
                : (() => {
                    const blocker = publicResolutionBlocker(
                      row.resolutionState,
                      row.publicationState,
                      row.failureCode,
                      row.execution == null
                        ? 'scripted'
                        : executionPolicySchema.parse(row.execution).mode,
                      row.attemptState,
                    );
                    return {
                      ...publicResolutionState(row.resolutionState),
                      evidence: publicResolutionEvidence(
                        row.resolutionSubmission,
                      ),
                      state:
                        row.publicationState === 'blocked' ||
                        row.publicationState === 'stale'
                          ? 'blocked'
                          : publicResolutionState(row.resolutionState)?.state,
                      version: row.resolutionVersion ?? 0,
                      reason: row.publicationFailure ?? row.failureCode,
                      blocker,
                      canRetry: blocker?.recovery === 'retry',
                    };
                  })(),
          });
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
      // Store under the identity represented by the built snapshot, not the
      // preflight identity. A concurrent commit can therefore create a miss,
      // never make an old projection addressable as the new one.
      const builtKey = snapshotCacheKey(ownerId, storyId, builtIdentity);
      try {
        await cache.set(builtKey, snapshot, {
          ttlSeconds: snapshotCacheTtlSeconds,
          maxBytes: snapshotCacheMaximumBytes,
        });
      } catch (error) {
        options.onCacheIncident?.({
          operation: 'set',
          projection: 'story-snapshot',
          errorKind: cacheErrorKind(error),
        });
      }
      return snapshot;
    },

    async readHistory({ ownerId, storyId, before }: ReadStoryHistory) {
      const cursor = parseHistoryCursor(before);
      const rows = await database.db
        .select({
          id: storyPassage.id,
          sequence: storyPassage.sequence,
          content: storyPassage.content,
          contentDocumentHash: storyPassage.contentDocumentHash,
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
      const items = await Promise.all(
        entries.slice(0, 20).map(async (entry) => ({
          id: entry.id,
          sequence: entry.sequence,
          content: await resolvePassageContent(entry, options.documentStore),
        })),
      );
      return storyHistorySchema.parse({
        items,
        nextBefore:
          entries.length > 20 && nextPageStart ? nextPageStart.sequence : null,
      });
    },
  };
}
