import { createStorytellerOpenings } from './storyteller-openings';
import {
  offlineExecution,
  type ExecutionPolicy,
} from '@offscreen/storyteller/tasks';
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import type { OpeningPreview } from '@offscreen/contracts/openings';
import { createOpenings } from './openings';
import {
  playablePresentation,
  validatePlayableResult,
} from '@offscreen/storyteller/tasks';
import { enqueue } from './outbox';
import { validId, GenerationError } from './generations';
export { OpeningInputError } from '@offscreen/storyteller/tasks';

// Versioned, deterministic sample. Keep this kind stable for recovery of admitted work.
const kind = 'opening.playable.scripted.v1';
export const scriptedOpeningTopic = 'opening.playable.scripted.v1';
const scriptedPlayableOpening = validatePlayableResult('opening', {
  version: 1,
  content: {
    version: 1,
    title: 'A fork in the path',
    paragraphs: [
      'The path splits beside a weathered post. One way is quieter. The other carries a distant sound of water.',
    ],
  },
  next: {
    kind: 'choice',
    prompt: 'What do you attempt?',
    options: [
      {
        id: 'follow-water',
        label: 'Walk toward the water',
        intention: 'Follow the sound of water and see what is ahead.',
      },
      {
        id: 'take-quiet-path',
        label: 'Take the quieter path',
        intention: 'Leave the water behind and continue along the quieter way.',
      },
    ],
  },
});
const presented = playablePresentation(scriptedPlayableOpening);
if (!presented.interaction) {
  throw new Error('scripted opening fixture must offer a choice');
}
export { scriptedPlayableOpening };
export const scriptedOpeningPresentation = {
  content: presented.content,
  interaction: presented.interaction,
};

/** Only a fixture runner. Never replace this local update with a provider call. */
export function createScriptedOpenings(
  database: Database,
  execution: ExecutionPolicy = offlineExecution,
) {
  const profiled = createStorytellerOpenings(database, execution);
  const operations = createOpenings(database, kind, (tx, id) =>
    enqueue(tx, { id, operationId: id, topic: scriptedOpeningTopic }),
  );
  const present = (
    record: Awaited<ReturnType<typeof operations.read>>,
  ): OpeningPreview => {
    const presentation =
      record.state === 'succeeded' && record.output
        ? playablePresentation(record.output)
        : null;
    return {
      id: record.id,
      sourceRevision: record.input.source.draftRevision,
      isCurrent: record.isCurrent,
      mode: 'scripted',
      state: record.state,
      candidate:
        presentation && presentation.interaction
          ? {
              content: presentation.content,
              interaction: presentation.interaction,
            }
          : null,
    };
  };
  return {
    async latest(owner: string, draftId: string) {
      const selected = await profiled.latest(owner, draftId);
      if (selected) {
        return selected;
      }
      const record = await operations.latest(owner, draftId);
      return record ? present(record) : null;
    },
    async request(
      owner: string,
      draftId: string,
      id: string,
      revision: number,
      contentId?: string,
    ) {
      if (await profiled.handles(owner, draftId, id)) {
        return profiled.request(owner, draftId, id, revision, contentId);
      }
      if (contentId) {
        throw new GenerationError('invalid');
      }
      await operations.request(owner, draftId, id, revision);
      return present(await operations.read(owner, id));
    },
    // Internal Activity: the stored operation identifies its owner and task kind.
    async complete(id: string) {
      validId(id);
      const [record] = await database.db
        .select({ owner: generation.ownerId })
        .from(generation)
        .where(and(eq(generation.id, id), eq(generation.kind, kind)));
      if (!record) {
        throw new GenerationError('not_found');
      }
      // No external side effect or running state: an interrupted fixture update
      // can safely repeat. The generic provider claim/uncertainty rules stay intact.
      await database.db
        .update(generation)
        .set({
          state: 'succeeded',
          attemptId: id,
          output: scriptedPlayableOpening,
          updatedAt: sql`clock_timestamp()`,
        })
        .where(
          and(
            eq(generation.id, id),
            eq(generation.ownerId, record.owner),
            eq(generation.kind, kind),
            eq(generation.state, 'pending'),
          ),
        );
      const result = await operations.read(record.owner, id);
      if (result.state !== 'succeeded') {
        throw new GenerationError('conflict');
      }
    },
  };
}
