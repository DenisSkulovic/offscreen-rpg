import { count, eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { user } from '@offscreen/identity-persistence/auth';
import { story } from '@offscreen/db/story-schema';
import type {
  AdminReadEnvelopeV1,
  PlayerSearchPageV1,
  PlayerSummaryV1,
} from '@offscreen/admin-interface/admin';
import type { AdminEnvironment } from './registry.js';
import { AdminSessionError } from './session.js';

const MAX_SEARCH_LIMIT = 20;

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/**
 * Build a PlayerSummaryV1 from authorized source rows only.
 * Never includes email, OAuth tokens, passages or payment fields.
 */
export function projectPlayerSummary(input: {
  id: string;
  createdAt: Date | string;
  legacyOwnedCampaignCount: number;
}): PlayerSummaryV1 {
  return {
    id: input.id,
    createdAt: toIso(input.createdAt),
    // No staff-facing restriction model exists yet.
    status: 'unknown',
    relationshipSummary: {
      legacyOwnedCampaignCount: input.legacyOwnedCampaignCount,
      coverage: 'complete',
    },
    commercial: {
      status: 'unsupported',
      explanationCode: 'no-commercial-source',
    },
  };
}

export function wrapPlayerSummaryEnvelope(input: {
  summary: PlayerSummaryV1;
  environment: AdminEnvironment;
  observedAt?: Date;
}): AdminReadEnvelopeV1<PlayerSummaryV1> {
  const observedAt = (input.observedAt ?? new Date()).toISOString();
  return {
    version: 1,
    subject: {
      kind: 'player',
      id: input.summary.id,
      environment: input.environment,
    },
    data: input.summary,
    observedAt,
    consistency: 'verified',
    sources: [
      { kind: 'auth.user', coverage: 'complete', observedAt },
      { kind: 'story.legacy-owner', coverage: 'complete', observedAt },
    ],
    limitations: ['unsupported'],
  };
}

export function createAdminPlayerReads(database: Database) {
  return {
    async readSummary(input: {
      playerId: string;
      environment: AdminEnvironment;
    }): Promise<AdminReadEnvelopeV1<PlayerSummaryV1>> {
      const [row] = await database.db
        .select({
          id: user.id,
          createdAt: user.createdAt,
        })
        .from(user)
        .where(eq(user.id, input.playerId))
        .limit(1);

      if (!row) {
        throw new AdminSessionError('not_authorized');
      }

      const [owned] = await database.db
        .select({ value: count() })
        .from(story)
        .where(eq(story.ownerId, row.id));

      const summary = projectPlayerSummary({
        id: row.id,
        createdAt: row.createdAt,
        legacyOwnedCampaignCount: Number(owned?.value ?? 0),
      });
      return wrapPlayerSummaryEnvelope({
        summary,
        environment: input.environment,
      });
    },

    /**
     * Exact-ref finder only. Unauthorized or missing refs return an empty page
     * (no totals that could leak existence).
     */
    async searchByExactRef(input: {
      ref: string;
      limit?: number;
      environment: AdminEnvironment;
      /** Caller already decided this ref is in grant scope. */
      authorized: boolean;
    }): Promise<PlayerSearchPageV1> {
      const limit = Math.min(
        Math.max(input.limit ?? 1, 1),
        MAX_SEARCH_LIMIT,
      );
      if (!input.authorized || !input.ref) {
        return { version: 1, items: [], limit, nextCursor: null };
      }

      const [row] = await database.db
        .select({
          id: user.id,
          createdAt: user.createdAt,
        })
        .from(user)
        .where(eq(user.id, input.ref))
        .limit(1);

      if (!row) {
        return { version: 1, items: [], limit, nextCursor: null };
      }

      return {
        version: 1,
        items: [
          {
            id: row.id,
            createdAt: toIso(row.createdAt),
            status: 'unknown',
          },
        ],
        limit,
        nextCursor: null,
      };
    },
  };
}

export type AdminPlayerReads = ReturnType<typeof createAdminPlayerReads>;
