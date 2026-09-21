import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import {
  storytellerDispatchReview,
  storytellerDispatchReviewDecision,
  storytellerPublication,
} from '@offscreen/db/storyteller-schema';
import { inspectOpenRouterRequest } from '@offscreen/storyteller/providers/openrouter';
import type {
  CapturedProviderRequest,
  StorytellerTask,
} from '@offscreen/storyteller/tasks';
import { enqueue } from '../outbox/index';
import { storytellerTopic } from './records';

export type DispatchReviewDisposition = 'proceed' | 'held' | 'stopped';

export class DispatchReviewConflictError extends Error {
  constructor() {
    super('Dispatch review conflict');
    this.name = 'DispatchReviewConflictError';
  }
}

/**
 * Persist the exact packet before any reservation or provider attempt. A code
 * change that rebuilds a different packet supersedes the old evidence rather
 * than silently dispatching something the reviewer never saw.
 */
export async function prepareDispatchReview(
  database: Database,
  generationId: string,
  attemptId: string,
  task: StorytellerTask,
  request: CapturedProviderRequest = task.request,
): Promise<DispatchReviewDisposition> {
  const execution = task.execution;
  if (execution.mode !== 'provider') {
    throw new Error('Dispatch review requires provider execution');
  }
  const inspection = inspectOpenRouterRequest(task, request);
  return database.db.transaction(async (tx) => {
    await tx
      .insert(storytellerDispatchReview)
      .values({
        attemptId,
        generationId,
        mode: execution.dispatchReview.mode,
        state:
          execution.dispatchReview.mode === 'hold'
            ? 'awaiting-review'
            : 'not-held',
        packetSha256: inspection.sha256,
        packet: inspection.body,
        inspection,
      })
      .onConflictDoNothing();
    const [review] = await tx
      .select()
      .from(storytellerDispatchReview)
      .where(eq(storytellerDispatchReview.attemptId, attemptId))
      .for('update');
    if (!review) {
      throw new Error('Missing dispatch review');
    }
    if (review.packetSha256 !== inspection.sha256) {
      if (review.state !== 'superseded') {
        await tx.insert(storytellerDispatchReviewDecision).values({
          id: randomUUID(),
          attemptId,
          expectedRevision: review.revision,
          kind: 'supersede',
          packetSha256: review.packetSha256,
        });
        await tx
          .update(storytellerDispatchReview)
          .set({
            state: 'superseded',
            revision: sql`${storytellerDispatchReview.revision} + 1`,
            reviewedAt: sql`clock_timestamp()`,
          })
          .where(
            and(
              eq(storytellerDispatchReview.attemptId, attemptId),
              eq(storytellerDispatchReview.revision, review.revision),
            ),
          );
      }
      return 'stopped';
    }
    if (review.state === 'awaiting-review') return 'held';
    if (review.state === 'released' || review.state === 'not-held') {
      return 'proceed';
    }
    return 'stopped';
  });
}

const dispatchReviewDecisionSchema = z.strictObject({
  generationId: z.uuid(),
  attemptId: z.uuid(),
  decisionId: z.uuid(),
  expectedRevision: z.number().int().nonnegative(),
  packetSha256: z.string().regex(/^[0-9a-f]{64}$/),
  decision: z.enum(['release', 'reject']),
});

/** Developer-only authority operation; an HTTP adapter must supply ownership. */
export function createDispatchReviewControls(database: Database) {
  return {
    async read(ownerId: string, generationId: string) {
      const [row] = await database.db
        .select({ review: storytellerDispatchReview })
        .from(storytellerDispatchReview)
        .innerJoin(
          generation,
          eq(generation.id, storytellerDispatchReview.generationId),
        )
        .where(
          and(
            eq(storytellerDispatchReview.generationId, generationId),
            eq(storytellerDispatchReview.attemptId, generation.attemptId),
            eq(generation.ownerId, ownerId),
          ),
        );
      return row?.review ?? null;
    },

    async decide(ownerId: string, input: unknown) {
      const decision = dispatchReviewDecisionSchema.parse(input);
      return database.db.transaction(async (tx) => {
        const [row] = await tx
          .select({ review: storytellerDispatchReview })
          .from(storytellerDispatchReview)
          .innerJoin(
            generation,
            eq(generation.id, storytellerDispatchReview.generationId),
          )
          .where(
            and(
              eq(storytellerDispatchReview.generationId, decision.generationId),
              eq(storytellerDispatchReview.attemptId, decision.attemptId),
              eq(generation.attemptId, decision.attemptId),
              eq(generation.ownerId, ownerId),
            ),
          )
          .for('update');
        const review = row?.review;
        if (
          !review ||
          review.state !== 'awaiting-review' ||
          review.revision !== decision.expectedRevision ||
          review.packetSha256 !== decision.packetSha256
        ) {
          throw new DispatchReviewConflictError();
        }
        await tx.insert(storytellerDispatchReviewDecision).values({
          id: decision.decisionId,
          attemptId: decision.attemptId,
          expectedRevision: decision.expectedRevision,
          kind: decision.decision,
          packetSha256: decision.packetSha256,
        });
        const nextState =
          decision.decision === 'release' ? 'released' : 'rejected';
        const [saved] = await tx
          .update(storytellerDispatchReview)
          .set({
            state: nextState,
            revision: sql`${storytellerDispatchReview.revision} + 1`,
            reviewedAt: sql`clock_timestamp()`,
          })
          .where(
            and(
              eq(storytellerDispatchReview.attemptId, decision.attemptId),
              eq(storytellerDispatchReview.revision, decision.expectedRevision),
            ),
          )
          .returning();
        if (!saved) throw new DispatchReviewConflictError();
        if (decision.decision === 'release') {
          await enqueue(tx, {
            id: decision.decisionId,
            operationId: decision.generationId,
            topic: storytellerTopic,
          });
        } else {
          await tx
            .update(generation)
            .set({
              state: 'failed',
              failureCode: 'dispatch_rejected',
              statusRevision: sql`${generation.statusRevision} + 1`,
              updatedAt: sql`clock_timestamp()`,
            })
            .where(eq(generation.id, decision.generationId));
          await tx
            .update(storytellerPublication)
            .set({ state: 'blocked', failureCode: 'dispatch_rejected' })
            .where(
              eq(storytellerPublication.generationId, decision.generationId),
            );
        }
        return saved;
      });
    },
  };
}
