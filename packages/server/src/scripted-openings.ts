import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import type { OpeningPreview } from '@offscreen/contracts/openings';
import { createOpenings } from './openings';
import { openingOutputSchema } from '@offscreen/ai/opening';
export { OpeningInputError } from '@offscreen/ai/opening';

// Versioned, deterministic sample. Keep v1 stable for recovery of admitted work.
const kind = 'opening.scripted.v1';
const output = openingOutputSchema.parse({
  opening:
    'A bell rings beyond the trees. At the bend in the road, a small figure waits with an apple in one hand and a pear in the other.\n\n“A gift for a traveller,” the figure says. The road continues behind him, disappearing into the evening mist.',
});

/** Only a fixture runner. Never replace this local update with a provider call. */
export function createScriptedOpenings(database: Database) {
  const operations = createOpenings(database, kind);
  const present = (
    record: Awaited<ReturnType<typeof operations.read>>,
  ): OpeningPreview => ({
    id: record.id,
    sourceRevision: record.input.source.draftRevision,
    isCurrent: record.isCurrent,
    mode: 'scripted',
    state: record.state,
    opening: record.output?.opening ?? null,
  });
  return {
    async latest(owner: string, draftId: string) {
      const record = await operations.latest(owner, draftId);
      return record ? present(record) : null;
    },
    async request(
      owner: string,
      draftId: string,
      id: string,
      revision: number,
    ) {
      await operations.request(owner, draftId, id, revision);
      // No external side effect or running state: an interrupted fixture update
      // can safely repeat. The generic provider claim/uncertainty rules stay intact.
      await database.db
        .update(generation)
        .set({
          state: 'succeeded',
          attemptId: id,
          output,
          updatedAt: sql`clock_timestamp()`,
        })
        .where(
          and(
            eq(generation.id, id),
            eq(generation.ownerId, owner),
            eq(generation.kind, kind),
            eq(generation.state, 'pending'),
          ),
        );
      return present(await operations.read(owner, id));
    },
  };
}
