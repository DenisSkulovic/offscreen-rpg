import { and, eq } from 'drizzle-orm';
import { isDeepStrictEqual } from 'node:util';
import { generation } from '@offscreen/db/generation-schema';
import { story, storyPassage } from '@offscreen/db/story-schema';
import { applyContinuityPatch } from '@offscreen/storyteller/context';
import type { ContinuityNotes } from '@offscreen/storyteller/context';
import {
  storytellerTaskSchema,
  taskEvidence,
  validateStorytellerResult,
  type StorytellerResult,
  type StorytellerTask,
} from '@offscreen/storyteller/tasks';
import type { Transaction } from '@offscreen/db/outbox';
import { storytellerKind } from '@offscreen/contracts/storyteller-kinds';

export type ProjectStorytellerNotesInput = {
  task: StorytellerTask;
  result: StorytellerResult;
  notes: unknown;
  revision: number;
  sourcePart: 'current' | 'arrival';
  passageId: string;
  /** Loaded by the SQL writer for arrival; must not be invented by the projector. */
  departurePassageId?: string;
};

/** Pure continuity-notes projection; no SQL and no provider I/O. */
export function projectStorytellerNotes(
  input: ProjectStorytellerNotesInput,
): ContinuityNotes {
  if (input.task.task === 'report') {
    // Reports are historical display artifacts and can never mutate continuity.
    throw new Error('Historical reports do not publish continuity notes');
  }
  const evidence = taskEvidence(input.task);
  if (input.sourcePart === 'current') {
    if (!isDeepStrictEqual(input.notes ?? [], input.task.context.notes)) {
      throw new Error('Stale continuity base');
    }
    evidence.current = input.passageId;
  } else {
    if (
      !input.departurePassageId ||
      input.result.scene.next.kind !== 'interval'
    ) {
      throw new Error('Missing continuity departure');
    }
    evidence.current = input.departurePassageId;
    evidence.arrival = input.passageId;
  }
  return applyContinuityPatch({
    notes: input.notes ?? [],
    patch:
      input.sourcePart === 'current'
        ? input.result.currentNotes
        : input.result.arrivalNotes,
    evidence,
    revision: input.revision,
  });
}

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
  let departurePassageId: string | undefined;
  if (input.sourcePart === 'arrival') {
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
    if (!departure) {
      throw new Error('Missing continuity departure');
    }
    departurePassageId = departure.id;
  }
  const projection: ProjectStorytellerNotesInput = {
    task,
    result,
    notes: input.notes,
    revision: input.revision,
    sourcePart: input.sourcePart,
    passageId: input.passageId,
  };
  if (departurePassageId !== undefined) {
    projection.departurePassageId = departurePassageId;
  }
  const notes = projectStorytellerNotes(projection);
  await tx
    .update(story)
    .set({ continuityNotes: notes })
    .where(eq(story.id, input.storyId));
}
