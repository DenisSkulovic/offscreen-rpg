import { and, eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { storyResolution } from '@offscreen/db/story-schema';
import { storytellerPublication } from '@offscreen/db/storyteller-schema';
import {
  storytellerTaskSchema,
  validateStorytellerResult,
} from '@offscreen/ai/storyteller-tasks';
import { interactionSubmissionSchema } from '@offscreen/contracts/interactions';
import { setPublication, storytellerKind } from './storyteller-records';
import { translateGeneratedContinuation } from './generated-continuation';
import { commitStoryContinuation } from './story-continuation';
import { lockOwnedStory } from './story-persistence';
import { StoryError } from './story-errors';
import { continuationSchema } from './story-command-policy';

export async function publishStorytellerResult(
  database: Database,
  id: string,
  realDurationMs: (gameDurationMs: number) => number,
) {
  await database.db.transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(generation)
      .where(and(eq(generation.id, id), eq(generation.kind, storytellerKind)));
    if (!record || record.state !== 'succeeded') {
      return;
    }
    const task = storytellerTaskSchema.parse(record.input);
    const result = validateStorytellerResult(task, record.output);
    if (task.task === 'opening') {
      await setPublication(tx, id, 'published');
      return;
    }
    const current = await lockOwnedStory(tx, {
      storyId: task.source.storyId,
      ownerId: record.ownerId,
    });
    const [publication] = await tx
      .select()
      .from(storytellerPublication)
      .where(eq(storytellerPublication.generationId, id));
    if (publication?.state === 'published' || publication?.state === 'stale') {
      return;
    }
    if (current.revision !== task.source.narrativeRevision) {
      await setPublication(tx, id, 'stale');
      return;
    }
    const [resolution] = await tx
      .select()
      .from(storyResolution)
      .where(eq(storyResolution.generationId, id));
    if (!resolution || resolution.basePassageId !== task.source.passageId) {
      throw new StoryError('invalid');
    }
    const proposed = translateGeneratedContinuation({
      output: result.scene,
      generationId: id,
      response: interactionSubmissionSchema.parse(resolution.submission),
      realDurationMs,
    });
    const continuation = continuationSchema.safeParse({
      ...proposed,
      expectedRevision: task.source.narrativeRevision,
    });
    if (!continuation.success) {
      throw new StoryError('invalid');
    }
    await commitStoryContinuation(tx, {
      ownerId: record.ownerId,
      storyId: task.source.storyId,
      transitionId: resolution.operationId,
      input: continuation.data,
      completingIntervalPassageId: undefined,
      completingDecisionPassageId: undefined,
      sourceGenerationId: id,
    });
    await setPublication(tx, id, 'published');
  });
}
