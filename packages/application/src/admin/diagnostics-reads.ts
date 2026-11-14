import { and, desc, eq, gt, inArray, isNotNull, lt, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { story } from '@offscreen/db/story-schema';
import { generation } from '@offscreen/db/generation-schema';
import {
  storytellerAttempt,
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
]);

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function sanitizeOperationKind(kind: string): string {
  if (SAFE_KIND_PREFIXES.some((prefix) => kind.startsWith(prefix))) {
    // Keep a bounded category token only (no prompt-bearing suffix).
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
}): RedactedOperationV1 {
  const publication: RedactedOperationV1['publication'] =
    input.publicationState === 'pending' ||
    input.publicationState === 'published' ||
    input.publicationState === 'stale' ||
    input.publicationState === 'blocked'
      ? input.publicationState
      : 'unknown';
  // Succeeded model output without publication must not read as published.
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
    ...(sanitizeFailureCode(input.failureCode)
      ? { safeFailureCode: sanitizeFailureCode(input.failureCode) }
      : {}),
  };
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
        const health = await database.db
          .select({
            pendingOrRunning: sql<number>`coalesce(sum(case when ${generation.state} in ('pending','running') then 1 else 0 end), 0)`,
            uncertain: sql<number>`coalesce(sum(case when ${generation.state} = 'uncertain' then 1 else 0 end), 0)`,
          })
          .from(storytellerAttempt)
          .innerJoin(
            generation,
            eq(generation.id, storytellerAttempt.generationId),
          )
          .where(eq(storytellerAttempt.storyId, row.id));

        items.push(
          projectCampaignMetadata({
            id: row.id,
            createdAt: row.createdAt,
            revision: row.revision,
            viewVersion: row.viewVersion,
            pendingOrRunning: Number(health[0]?.pendingOrRunning ?? 0) > 0,
            uncertain: Number(health[0]?.uncertain ?? 0) > 0,
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

      const filters = [
        eq(storytellerAttempt.storyId, input.campaignId),
        isNotNull(storytellerAttempt.storyId),
      ];
      if (input.cursor) {
        filters.push(lt(generation.updatedAt, new Date(input.cursor)));
      }

      const rows = await database.db
        .select({
          id: generation.id,
          kind: generation.kind,
          state: generation.state,
          failureCode: generation.failureCode,
          updatedAt: generation.updatedAt,
          publicationState: storytellerPublication.state,
        })
        .from(storytellerAttempt)
        .innerJoin(
          generation,
          eq(generation.id, storytellerAttempt.generationId),
        )
        .leftJoin(
          storytellerPublication,
          eq(storytellerPublication.generationId, generation.id),
        )
        .where(and(...filters))
        .orderBy(desc(generation.updatedAt))
        .limit(PAGE_SIZE * 3);

      // Deduplicate by generation id (multiple attempts).
      const seen = new Set<string>();
      const items: RedactedOperationV1[] = [];
      for (const row of rows) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        if (items.length >= PAGE_SIZE) break;
        items.push(
          projectRedactedOperation({
            id: row.id,
            kind: row.kind,
            state: row.state,
            publicationState: row.publicationState,
            failureCode: row.failureCode,
            updatedAt: row.updatedAt,
          }),
        );
      }

      const next =
        rows.length > PAGE_SIZE && items.length > 0
          ? items[items.length - 1]!.lastObservedAt
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
          storyId: storytellerAttempt.storyId,
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
        .where(eq(generation.id, input.operationId))
        .limit(1);

      if (!row) throw new AdminSessionError('not_authorized');

      const data = projectRedactedOperation({
        id: row.id,
        kind: row.kind,
        state: row.state,
        publicationState: row.publicationState,
        failureCode: row.failureCode,
        updatedAt: row.updatedAt,
      });
      const observedAt = new Date().toISOString();
      return {
        ownerId: row.ownerId,
        campaignId: row.storyId,
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
