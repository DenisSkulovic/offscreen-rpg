import { and, eq } from 'drizzle-orm';
import type { generation } from '@offscreen/db/generation-schema';
import { draftOpening } from '@offscreen/db/generation-schema';
import { storyDraft } from '@offscreen/db/draft-schema';
import { storyPassage } from '@offscreen/db/story-schema';
import {
  storytellerTaskSchema,
  validateStorytellerResult,
} from '@offscreen/ai/storyteller-tasks';
import { playablePresentation } from '@offscreen/ai/playable';
import type { Transaction } from './outbox';
import { initializeStoryInTransaction } from './story-initialization';
import { publishStorytellerNotes } from './storyteller-memory';
import { StoryError } from './story-errors';

export async function startStorytellerCandidate(
  tx: Transaction,
  input: {
    ownerId: string;
    storyId: string;
    expectedDraftRevision: number;
    candidate: typeof generation.$inferSelect;
  },
) {
  const task = storytellerTaskSchema.parse(input.candidate.input);
  if (task.task !== 'opening') {
    throw new StoryError('invalid');
  }
  const [draft] = await tx
    .select()
    .from(storyDraft)
    .where(
      and(
        eq(storyDraft.id, task.source.draftId),
        eq(storyDraft.ownerId, input.ownerId),
      ),
    )
    .for('update');
  const [latest] = await tx
    .select()
    .from(draftOpening)
    .where(eq(draftOpening.draftId, task.source.draftId));
  if (!draft) {
    throw new StoryError('not_found');
  }
  if (
    draft.revision !== input.expectedDraftRevision ||
    task.source.draftRevision !== draft.revision ||
    latest?.generationId !== input.candidate.id ||
    input.candidate.state !== 'succeeded'
  ) {
    throw new StoryError('conflict');
  }
  const result = validateStorytellerResult(task, input.candidate.output);
  const presentation = playablePresentation(result.scene);
  const created = await initializeStoryInTransaction(tx, {
    ownerId: input.ownerId,
    storyId: input.storyId,
    input: {
      source: 'playable.opening.v1',
      sourceGenerationId: input.candidate.id,
      sourceGenerationPart: 'current',
      premise: task.context.premise,
      storyteller: task.profile,
      execution: task.execution,
      items: [],
      ...presentation,
    },
  });
  if (!created) {
    return;
  }
  const [passage] = await tx
    .select({ id: storyPassage.id })
    .from(storyPassage)
    .where(
      and(
        eq(storyPassage.storyId, input.storyId),
        eq(storyPassage.sequence, 1),
      ),
    );
  if (!passage) {
    throw new Error('Missing initialized passage');
  }
  await publishStorytellerNotes(tx, {
    storyId: input.storyId,
    generationId: input.candidate.id,
    passageId: passage.id,
    revision: 1,
    sourcePart: 'current',
    notes: [],
  });
}
