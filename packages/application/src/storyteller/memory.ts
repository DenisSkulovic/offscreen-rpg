import { and, eq } from 'drizzle-orm';
import { isDeepStrictEqual } from 'node:util';
import { generation } from '@offscreen/db/generation-schema';
import { story, storyPassage } from '@offscreen/db/story-schema';
import { applyContinuityPatch } from '@offscreen/storyteller/context';
import {
  storytellerTaskSchema,
  taskEvidence,
  validateStorytellerResult,
} from '@offscreen/storyteller/tasks';
import type { Transaction } from '../outbox/index';
import { storytellerKind } from './records';

/** Participates in the caller's story-lock transaction; never publishes future notes early. */
export async function publishStorytellerNotes(
  tx: Transaction,
  input: {
    storyId: string;
    generationId: string;
    passageId: string;
    revision: number;
    sourcePart: 'current' | 'arrival';
    notes: unknown;
  },
) {
  const [record] = await tx
    .select()
    .from(generation)
    .where(eq(generation.id, input.generationId));
  if (
    !record ||
    record.kind !== storytellerKind ||
    record.state !== 'succeeded'
  ) {
    throw new Error('Missing storyteller result');
  }
  const task = storytellerTaskSchema.parse(record.input);
  if (task.task === 'report') {
    // Reports are historical display artifacts and can never mutate continuity.
    throw new Error('Historical reports do not publish continuity notes');
  }
  const result = validateStorytellerResult(task, record.output);
  const evidence = taskEvidence(task);
  if (input.sourcePart === 'current') {
    if (!isDeepStrictEqual(input.notes ?? [], task.context.notes)) {
      throw new Error('Stale continuity base');
    }
    evidence.current = input.passageId;
  } else {
    const [departure] = await tx
      .select({ id: storyPassage.id })
      .from(storyPassage)
      .where(
        and(
          eq(storyPassage.storyId, input.storyId),
          eq(storyPassage.sequence, input.revision - 1),
          eq(storyPassage.sourceGenerationId, input.generationId),
        ),
      );
    if (!departure || result.scene.next.kind !== 'interval') {
      throw new Error('Missing continuity departure');
    }
    evidence.current = departure.id;
    evidence.arrival = input.passageId;
  }
  const notes = applyContinuityPatch({
    notes: input.notes ?? [],
    patch:
      input.sourcePart === 'current'
        ? result.currentNotes
        : result.arrivalNotes,
    evidence,
    revision: input.revision,
  });
  await tx
    .update(story)
    .set({ continuityNotes: notes })
    .where(eq(story.id, input.storyId));
}
