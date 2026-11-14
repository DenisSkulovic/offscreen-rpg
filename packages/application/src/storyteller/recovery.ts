import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { storyResolution } from '@offscreen/db/story-schema';
import {
  gameActionExecution,
  gameActionReceipt,
} from '@offscreen/db/campaign-schema';
import {
  storytellerAttempt,
  storytellerOperation,
  storytellerPublication,
  storytellerRetry,
} from '@offscreen/db/storyteller-schema';
import { storytellerTaskSchema } from '@offscreen/storyteller/tasks';
import {
  lockOwnedStory,
  incrementStoryViewVersion,
} from '../stories/persistence';
import { StoryError, parseStoryIdentifier } from '../stories/errors';
import { enqueue } from '../outbox/index';
import {
  evaluateStorytellerRetryGate,
  type StorytellerAttemptLifecycleState,
  type StorytellerGenerationLifecycleState,
} from './loop-lifecycle';
import { storytellerKind, storytellerTopic } from './records';

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
    let pendingConsequenceSettled: boolean | undefined;
    if (task.task === 'pending-consequence') {
      const [settled] = await tx
        .select({
          state: gameActionExecution.state,
          preparationGenerationId: gameActionExecution.preparationGenerationId,
          receiptGenerationId: gameActionReceipt.generationId,
        })
        .from(gameActionExecution)
        .leftJoin(
          gameActionReceipt,
          eq(gameActionReceipt.operationId, gameActionExecution.operationId),
        )
        .where(
          and(
            eq(gameActionExecution.operationId, task.source.executionId),
            eq(gameActionExecution.storyId, input.storyId),
          ),
        );
      pendingConsequenceSettled = Boolean(
        settled &&
          settled.state === 'settled' &&
          settled.preparationGenerationId === record.id &&
          settled.receiptGenerationId === record.id,
      );
    }
    const [publication] = await tx
      .select()
      .from(storytellerPublication)
      .where(eq(storytellerPublication.generationId, record.id));
    let attemptState: StorytellerAttemptLifecycleState | null = null;
    let operationState: string | null = null;
    let dispatchedRounds: number | null = null;
    let maxModelRounds: number | null = null;
    if (task.execution.mode === 'provider' && record.state === 'failed') {
      const [attempt] = await tx
        .select()
        .from(storytellerAttempt)
        .where(eq(storytellerAttempt.id, record.attemptId));
      const [operation] = await tx
        .select({
          state: storytellerOperation.state,
          dispatchedRounds: storytellerOperation.dispatchedRounds,
          maxModelRounds: storytellerOperation.maxModelRounds,
        })
        .from(storytellerOperation)
        .where(eq(storytellerOperation.generationId, record.id));
      attemptState =
        (attempt?.state as StorytellerAttemptLifecycleState | undefined) ?? null;
      operationState = operation?.state ?? null;
      dispatchedRounds = operation?.dispatchedRounds ?? null;
      maxModelRounds = operation?.maxModelRounds ?? null;
    }
    const gate = evaluateStorytellerRetryGate({
      priorRetryRecorded: false,
      generationState: record.state as StorytellerGenerationLifecycleState,
      publicationState: publication?.state,
      executionMode: task.execution.mode,
      attemptState,
      failureCode: record.failureCode,
      recipeVersion: task.resources.recipe.version,
      hasRepairCandidate: record.repairCandidate !== null,
      hasRepairDiagnostic: record.repairDiagnostic !== null,
      operationState,
      dispatchedRounds,
      maxModelRounds,
      ...(pendingConsequenceSettled === undefined
        ? {}
        : { pendingConsequenceSettled }),
    });
    if (!gate.allowed) {
      throw new StoryError('conflict');
    }
    if (gate.reason === 'publication-blocked') {
      await tx
        .update(storytellerPublication)
        .set({ state: 'pending', failureCode: null })
        .where(eq(storytellerPublication.generationId, record.id));
    } else {
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
