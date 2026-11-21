import { and, desc, eq, gt, inArray, lt, or, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { campaignReport } from '@offscreen/db/campaign-schema';
import {
  story,
  storyPassage,
  storyResolution,
} from '@offscreen/db/story-schema';
import { generation } from '@offscreen/db/generation-schema';
import {
  storytellerAttempt,
  storytellerContextCapture,
  storytellerPublication,
} from '@offscreen/db/storyteller-schema';
import type {
  CampaignMetadataPageV1,
  CampaignMetadataV1,
  RedactedOperationEnvelopeV1,
  RedactedOperationPageV1,
  RedactedOperationV1,
} from '@offscreen/contracts/admin';
import type { AdminEnvironment } from './registry.js';
import { AdminSessionError } from './session.js';

const PAGE_SIZE = 20;

/** Explicit allowlist — never echo raw generation.kind strings outside this set. */
const SAFE_KIND_PREFIXES = [
  'storyteller.',
  'opening.',
  'scripted.',
  'resolution.',
] as const;

const SAFE_FAILURE_CODES = new Set([
  'invalid_output',
  'invalid-shape',
  'provider_error',
  'timeout',
  'budget_exhausted',
  'cancelled',
  'blocked',
  'missing_source',
  'document_store',
  'corrupt_source',
  'source_mismatch',
]);

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function sanitizeOperationKind(kind: string): string {
  if (SAFE_KIND_PREFIXES.some((prefix) => kind.startsWith(prefix))) {
    const token = kind.slice(0, 64);
    if (/^[a-z0-9._-]+$/i.test(token)) return token;
  }
  return 'other';
}

export function sanitizeFailureCode(
  code: string | null | undefined,
): string | undefined {
  if (!code) return undefined;
  if (SAFE_FAILURE_CODES.has(code)) return code;
  return 'failed';
}

export function encodeOperationCursor(updatedAt: Date | string, id: string) {
  return `${toIso(updatedAt)}~${id}`;
}

export function decodeOperationCursor(cursor: string): {
  updatedAt: Date;
  id: string;
} | null {
  const sep = cursor.lastIndexOf('~');
  if (sep <= 0) return null;
  const iso = cursor.slice(0, sep);
  const id = cursor.slice(sep + 1);
  const updatedAt = new Date(iso);
  if (Number.isNaN(updatedAt.getTime())) return null;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  ) {
    return null;
  }
  return { updatedAt, id };
}

export function projectCampaignMetadata(input: {
  id: string;
  createdAt: Date | string;
  revision: number;
  viewVersion: number;
  pendingOrRunning: boolean;
  uncertain: boolean;
}): CampaignMetadataV1 {
  let operationHealth: CampaignMetadataV1['operationHealth'] = 'normal';
  if (input.uncertain) operationHealth = 'uncertain';
  else if (input.pendingOrRunning) operationHealth = 'pending';
  return {
    id: input.id,
    relation: 'legacy-owner',
    createdAt: toIso(input.createdAt),
    currentRevision: input.revision,
    viewVersion: input.viewVersion,
    operationHealth,
  };
}

export function projectRedactedOperation(input: {
  id: string;
  kind: string;
  state: RedactedOperationV1['state'];
  publicationState: string | null;
  failureCode: string | null;
  updatedAt: Date | string;
  attemptCoverage?: RedactedOperationV1['attemptCoverage'];
}): RedactedOperationV1 {
  const publication: RedactedOperationV1['publication'] =
    input.publicationState === 'pending' ||
    input.publicationState === 'published' ||
    input.publicationState === 'stale' ||
    input.publicationState === 'blocked'
      ? input.publicationState
      : 'unknown';
  const effectivePublication =
    input.state === 'succeeded' && publication === 'unknown'
      ? 'pending'
      : publication;
  return {
    id: input.id,
    kind: sanitizeOperationKind(input.kind),
    state: input.state,
    publication: effectivePublication,
    sourceCoverage: 'since-enabled',
    lastObservedAt: toIso(input.updatedAt),
    ...(input.attemptCoverage
      ? { attemptCoverage: input.attemptCoverage }
      : {}),
    ...(sanitizeFailureCode(input.failureCode)
      ? { safeFailureCode: sanitizeFailureCode(input.failureCode) }
      : {}),
  };
}

function asGenerationState(state: string): RedactedOperationV1['state'] {
  if (
    state === 'pending' ||
    state === 'running' ||
    state === 'succeeded' ||
    state === 'failed' ||
    state === 'uncertain'
  ) {
    return state;
  }
  return 'failed';
}

/**
 * OBS01: campaign-linked generation IDs from every durable story authority,
 * never inferred from generation.ownerId alone.
 */
async function loadCampaignLinkedGenerationIds(
  database: Database,
  campaignId: string,
): Promise<Set<string>> {
  const [fromResolution, fromPassage, fromReport, fromCapture, fromAttempt] =
    await Promise.all([
      database.db
        .select({ id: storyResolution.generationId })
        .from(storyResolution)
        .where(eq(storyResolution.storyId, campaignId)),
      database.db
        .select({ id: storyPassage.sourceGenerationId })
        .from(storyPassage)
        .where(
          and(
            eq(storyPassage.storyId, campaignId),
            sql`${storyPassage.sourceGenerationId} is not null`,
          ),
        ),
      database.db
        .select({ id: campaignReport.generationId })
        .from(campaignReport)
        .where(
          and(
            eq(campaignReport.storyId, campaignId),
            sql`${campaignReport.generationId} is not null`,
          ),
        ),
      database.db
        .select({ id: storytellerContextCapture.captureId })
        .from(storytellerContextCapture)
        .where(eq(storytellerContextCapture.storyId, campaignId)),
      database.db
        .select({ id: storytellerAttempt.generationId })
        .from(storytellerAttempt)
        .where(eq(storytellerAttempt.storyId, campaignId)),
    ]);

  const ids = new Set<string>();
  for (const row of [
    ...fromResolution,
    ...fromPassage,
    ...fromReport,
    ...fromCapture,
    ...fromAttempt,
  ]) {
    if (row.id) ids.add(row.id);
  }
  return ids;
}

export function createAdminDiagnosticsReads(database: Database) {
  return {
    async listPlayerCampaigns(input: {
      playerId: string;
      cursor?: string | null;
      allowedCampaignIds?: readonly string[] | null;
    }): Promise<CampaignMetadataPageV1> {
      const filters = [eq(story.ownerId, input.playerId)];
      if (input.cursor) {
        filters.push(gt(story.createdAt, new Date(input.cursor)));
      }
      if (input.allowedCampaignIds && input.allowedCampaignIds.length > 0) {
        filters.push(inArray(story.id, [...input.allowedCampaignIds]));
      }

      const rows = await database.db
        .select({
          id: story.id,
          createdAt: story.createdAt,
          revision: story.revision,
          viewVersion: story.viewVersion,
        })
        .from(story)
        .where(and(...filters))
        .orderBy(story.createdAt)
        .limit(PAGE_SIZE + 1);

      const page = rows.slice(0, PAGE_SIZE);
      const items: CampaignMetadataV1[] = [];
      for (const row of page) {
        const linked = await loadCampaignLinkedGenerationIds(database, row.id);
        let pendingOrRunning = false;
        let uncertain = false;
        if (linked.size > 0) {
          const health = await database.db
            .select({
              pendingOrRunning: sql<number>`coalesce(sum(case when ${generation.state} in ('pending','running') then 1 else 0 end), 0)`,
              uncertain: sql<number>`coalesce(sum(case when ${generation.state} = 'uncertain' then 1 else 0 end), 0)`,
            })
            .from(generation)
            .where(inArray(generation.id, [...linked]));
          pendingOrRunning = Number(health[0]?.pendingOrRunning ?? 0) > 0;
          uncertain = Number(health[0]?.uncertain ?? 0) > 0;
        }

        items.push(
          projectCampaignMetadata({
            id: row.id,
            createdAt: row.createdAt,
            revision: row.revision,
            viewVersion: row.viewVersion,
            pendingOrRunning,
            uncertain,
          }),
        );
      }

      const next =
        rows.length > PAGE_SIZE
          ? toIso(page[page.length - 1]!.createdAt)
          : null;
      return {
        version: 1,
        playerId: input.playerId,
        items,
        nextCursor: next,
      };
    },

    async listCampaignOperations(input: {
      campaignId: string;
      cursor?: string | null;
    }): Promise<RedactedOperationPageV1> {
      const [owned] = await database.db
        .select({ id: story.id, ownerId: story.ownerId })
        .from(story)
        .where(eq(story.id, input.campaignId))
        .limit(1);
      if (!owned) throw new AdminSessionError('not_authorized');

      const linked = await loadCampaignLinkedGenerationIds(
        database,
        input.campaignId,
      );
      if (linked.size === 0) {
        return {
          version: 1,
          campaignId: input.campaignId,
          items: [],
          nextCursor: null,
        };
      }

      const cursor = input.cursor
        ? decodeOperationCursor(input.cursor)
        : null;
      if (input.cursor && !cursor) {
        throw new AdminSessionError('conflict');
      }

      const filters = [inArray(generation.id, [...linked])];
      if (cursor) {
        filters.push(
          or(
            lt(generation.updatedAt, cursor.updatedAt),
            and(
              eq(generation.updatedAt, cursor.updatedAt),
              lt(generation.id, cursor.id),
            ),
          )!,
        );
      }

      const rows = await database.db
        .select({
          id: generation.id,
          kind: generation.kind,
          state: generation.state,
          failureCode: generation.failureCode,
          updatedAt: generation.updatedAt,
          publicationState: storytellerPublication.state,
          captureState: storytellerContextCapture.state,
          captureFailure: storytellerContextCapture.failureCode,
          attemptId: storytellerAttempt.id,
        })
        .from(generation)
        .leftJoin(
          storytellerPublication,
          eq(storytellerPublication.generationId, generation.id),
        )
        .leftJoin(
          storytellerContextCapture,
          eq(storytellerContextCapture.captureId, generation.id),
        )
        .leftJoin(
          storytellerAttempt,
          eq(storytellerAttempt.generationId, generation.id),
        )
        .where(and(...filters))
        .orderBy(desc(generation.updatedAt), desc(generation.id))
        .limit(PAGE_SIZE * 4);

      const seen = new Set<string>();
      const items: RedactedOperationV1[] = [];
      for (const row of rows) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        if (items.length >= PAGE_SIZE) break;

        const attemptCoverage = row.attemptId
          ? ('recorded' as const)
          : ('none-recorded' as const);
        let failureCode = row.failureCode;
        if (
          !failureCode &&
          (row.captureState === 'held' || row.captureState === 'blocked')
        ) {
          failureCode = row.captureFailure ?? 'blocked';
        }

        items.push(
          projectRedactedOperation({
            id: row.id,
            kind: row.kind,
            state: asGenerationState(row.state),
            publicationState: row.publicationState,
            failureCode,
            updatedAt: row.updatedAt,
            attemptCoverage,
          }),
        );
      }

      const next =
        items.length >= PAGE_SIZE
          ? encodeOperationCursor(
              items[items.length - 1]!.lastObservedAt,
              items[items.length - 1]!.id,
            )
          : null;

      return {
        version: 1,
        campaignId: input.campaignId,
        items,
        nextCursor: next,
      };
    },

    async readOperation(input: {
      operationId: string;
      environment: AdminEnvironment;
    }): Promise<{
      envelope: RedactedOperationEnvelopeV1;
      ownerId: string;
      campaignId: string | null;
    }> {
      const [row] = await database.db
        .select({
          id: generation.id,
          kind: generation.kind,
          state: generation.state,
          failureCode: generation.failureCode,
          updatedAt: generation.updatedAt,
          ownerId: generation.ownerId,
          publicationState: storytellerPublication.state,
          attemptStoryId: storytellerAttempt.storyId,
          resolutionStoryId: storyResolution.storyId,
          captureStoryId: storytellerContextCapture.storyId,
          reportStoryId: campaignReport.storyId,
          passageStoryId: storyPassage.storyId,
          attemptId: storytellerAttempt.id,
          captureState: storytellerContextCapture.state,
          captureFailure: storytellerContextCapture.failureCode,
        })
        .from(generation)
        .leftJoin(
          storytellerPublication,
          eq(storytellerPublication.generationId, generation.id),
        )
        .leftJoin(
          storytellerAttempt,
          eq(storytellerAttempt.generationId, generation.id),
        )
        .leftJoin(
          storyResolution,
          eq(storyResolution.generationId, generation.id),
        )
        .leftJoin(
          storytellerContextCapture,
          eq(storytellerContextCapture.captureId, generation.id),
        )
        .leftJoin(
          campaignReport,
          eq(campaignReport.generationId, generation.id),
        )
        .leftJoin(
          storyPassage,
          eq(storyPassage.sourceGenerationId, generation.id),
        )
        .where(eq(generation.id, input.operationId))
        .limit(1);

      if (!row) throw new AdminSessionError('not_authorized');

      const campaignId =
        row.attemptStoryId ??
        row.resolutionStoryId ??
        row.captureStoryId ??
        row.reportStoryId ??
        row.passageStoryId ??
        null;

      let failureCode = row.failureCode;
      if (
        !failureCode &&
        (row.captureState === 'held' || row.captureState === 'blocked')
      ) {
        failureCode = row.captureFailure ?? 'blocked';
      }

      const data = projectRedactedOperation({
        id: row.id,
        kind: row.kind,
        state: asGenerationState(row.state),
        publicationState: row.publicationState,
        failureCode,
        updatedAt: row.updatedAt,
        attemptCoverage: row.attemptId ? 'recorded' : 'none-recorded',
      });
      const observedAt = new Date().toISOString();
      return {
        ownerId: row.ownerId,
        campaignId,
        envelope: {
          version: 1,
          subject: {
            kind: 'operation',
            id: row.id,
            environment: input.environment,
          },
          data,
          observedAt,
          consistency: 'verified',
          sources: [
            {
              kind: 'generation',
              coverage: 'since-enabled',
              observedAt,
            },
            {
              kind: 'storyteller.publication',
              coverage: row.publicationState ? 'complete' : 'partial',
              observedAt,
            },
          ],
          limitations: ['incomplete-evidence'],
        },
      };
    },

    async loadCampaignOwner(campaignId: string): Promise<string | null> {
      const [row] = await database.db
        .select({ ownerId: story.ownerId })
        .from(story)
        .where(eq(story.id, campaignId))
        .limit(1);
      return row?.ownerId ?? null;
    },
  };
}

export type AdminDiagnosticsReads = ReturnType<
  typeof createAdminDiagnosticsReads
>;
