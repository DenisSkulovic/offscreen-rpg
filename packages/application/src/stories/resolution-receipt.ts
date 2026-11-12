import { createHash } from 'node:crypto';
import {
  canonicalResolutionRequestJson,
  resolutionOperationReceiptSchema,
  type ResolutionOperationReceipt,
} from '@offscreen/contracts/stories';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { story, storyResolution } from '@offscreen/db/story-schema';
import { and, eq } from 'drizzle-orm';
import { StoryError, parseStoryIdentifier } from './errors';

type ReadResolutionReceipt = Readonly<{
  ownerId: string;
  storyId: string;
  operationId: string;
}>;

type GenerationState =
  'pending' | 'running' | 'succeeded' | 'failed' | 'uncertain';

export function resolutionRequestDigest(input: {
  expectedRevision: number;
  submission: unknown;
}): string {
  return createHash('sha256')
    .update(canonicalResolutionRequestJson(input), 'utf8')
    .digest('hex');
}

export function publicReceiptState(
  state: GenerationState,
): ResolutionOperationReceipt['state'] {
  switch (state) {
    case 'pending':
      return 'admitted';
    case 'running':
      return 'processing';
    case 'succeeded':
      return 'settled';
    case 'failed':
      return 'failed';
    case 'uncertain':
      return 'uncertain';
  }
}

function publicReceiptRecovery(
  state: GenerationState,
  failureCode: string | null,
): ResolutionOperationReceipt['recovery'] {
  if (state === 'uncertain' || failureCode === 'usage_uncertain') {
    return 'operator';
  }
  if (state !== 'failed') {
    return null;
  }
  if (
    failureCode === 'budget_unavailable' ||
    failureCode === 'window_exhausted' ||
    failureCode === 'authority_unavailable' ||
    failureCode === 'provider_disabled'
  ) {
    return 'retry';
  }
  if (failureCode === 'context_too_large') {
    return 'none';
  }
  return 'retry';
}

/**
 * Owner-scoped read-only resolution receipt. Never enqueues, retries providers
 * or mutates generation / outbox rows.
 */
export function createResolutionReceiptReader(database: Database) {
  return {
    async read(
      input: ReadResolutionReceipt,
    ): Promise<ResolutionOperationReceipt> {
      const storyId = parseStoryIdentifier(input.storyId);
      const operationId = parseStoryIdentifier(input.operationId);
      const [row] = await database.db
        .select({
          storyId: story.id,
          viewVersion: story.viewVersion,
          operationId: storyResolution.operationId,
          baseRevision: storyResolution.baseRevision,
          submission: storyResolution.submission,
          generationState: generation.state,
          resolutionVersion: generation.statusRevision,
          failureCode: generation.failureCode,
        })
        .from(story)
        .innerJoin(
          storyResolution,
          and(
            eq(storyResolution.storyId, story.id),
            eq(storyResolution.operationId, operationId),
          ),
        )
        .innerJoin(generation, eq(generation.id, storyResolution.generationId))
        .where(and(eq(story.id, storyId), eq(story.ownerId, input.ownerId)));
      if (!row) {
        throw new StoryError('not_found');
      }
      const state = publicReceiptState(row.generationState);
      return resolutionOperationReceiptSchema.parse({
        operationId: row.operationId,
        storyId: row.storyId,
        state,
        viewVersion: row.viewVersion,
        resolutionVersion: row.resolutionVersion,
        reason: row.failureCode,
        recovery: publicReceiptRecovery(row.generationState, row.failureCode),
        requestDigest: resolutionRequestDigest({
          expectedRevision: row.baseRevision,
          submission: row.submission,
        }),
      });
    },
  };
}
