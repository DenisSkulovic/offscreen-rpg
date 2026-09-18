import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { storyResolution } from '@offscreen/db/story-schema';
import {
  storytellerAttempt,
  storytellerPublication,
  storytellerRetry,
} from '@offscreen/db/storyteller-schema';
import { storytellerTaskSchema } from '@offscreen/storyteller/tasks';
import { lockOwnedStory, incrementStoryViewVersion } from './story-persistence';
import { StoryError, parseStoryIdentifier } from './story-errors';
import { enqueue } from './outbox';
import { storytellerKind, storytellerTopic } from './storyteller-records';

/** Explicit retry of the same admitted intention. Never creates a second resolution. */
export async function retryStoryteller(
  database: Database,
  input: { ownerId: string; storyId: string; retryId: string },
) {
  parseStoryIdentifier(input.storyId);
  parseStoryIdentifier(input.retryId);
  await database.db.transaction(async (tx) => {
    const current = await lockOwnedStory(tx, input);
    const [prior] = await tx
      .select({ generationId: storytellerRetry.generationId })
      .from(storytellerRetry)
      .innerJoin(
        storyResolution,
        eq(storyResolution.generationId, storytellerRetry.generationId),
      )
      .where(
        and(
          eq(storyResolution.storyId, input.storyId),
          eq(storytellerRetry.retryId, input.retryId),
        ),
      );
    if (prior) {
      return;
    }
    const [resolution] = await tx
      .select()
      .from(storyResolution)
      .where(
        and(
          eq(storyResolution.storyId, input.storyId),
          eq(storyResolution.baseRevision, current.revision),
        ),
      );
    if (!resolution) {
      throw new StoryError('conflict');
    }
    const [record] = await tx
      .select()
      .from(generation)
      .where(
        and(
          eq(generation.id, resolution.generationId),
          eq(generation.kind, storytellerKind),
        ),
      )
      .for('update');
    if (!record || !record.attemptId) {
      throw new StoryError('conflict');
    }
    const task = storytellerTaskSchema.parse(record.input);
    const [publication] = await tx
      .select()
      .from(storytellerPublication)
      .where(eq(storytellerPublication.generationId, record.id));
    if (record.state === 'succeeded' && publication?.state === 'blocked') {
      await tx
        .update(storytellerPublication)
        .set({ state: 'pending', failureCode: null })
        .where(eq(storytellerPublication.generationId, record.id));
    } else if (record.state === 'failed') {
      if (task.execution.mode === 'provider') {
        const [attempt] = await tx
          .select()
          .from(storytellerAttempt)
          .where(eq(storytellerAttempt.id, record.attemptId));
        if (attempt && !['settled', 'unsent'].includes(attempt.state)) {
          throw new StoryError('conflict');
        }
      }
      await tx
        .update(generation)
        .set({
          state: 'pending',
          attemptId: null,
          output: null,
          failureCode: null,
          updatedAt: sql`clock_timestamp()`,
          statusRevision: sql`${generation.statusRevision} + 1`,
        })
        .where(eq(generation.id, record.id));
    } else {
      throw new StoryError('conflict');
    }
    await tx.insert(storytellerRetry).values({
      generationId: record.id,
      retryId: input.retryId,
      attemptId: record.attemptId,
    });
    await enqueue(tx, {
      id: input.retryId,
      operationId: record.id,
      topic: storytellerTopic,
    });
    await incrementStoryViewVersion(tx, {
      storyId: input.storyId,
      viewVersion: current.viewVersion + 1,
    });
  });
}
