import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { storytellerPublication } from '@offscreen/db/storyteller-schema';
import { storytellerTaskSchema } from '@offscreen/storyteller/tasks';
import {
  createStorytellerExecution,
  type StorytellerRuntimeOptions,
} from './storyteller-execution';
import { publishStorytellerResult } from './storyteller-publication';
import { storytellerKind } from './storyteller-records';
import { StoryError } from './story-errors';
export { storytellerTopic } from './storyteller-records';
export type { StorytellerRuntimeOptions } from './storyteller-execution';

/** Compact durable entry point: execute outside transactions, then publish under the story lock. */
export function createStorytellerRuntime(
  database: Database,
  options: StorytellerRuntimeOptions = {},
) {
  const execution = createStorytellerExecution(database, options);

  return {
    async complete(id: string) {
      const [record] = await database.db
        .select()
        .from(generation)
        .where(
          and(eq(generation.id, id), eq(generation.kind, storytellerKind)),
        );
      if (!record) {
        throw new StoryError('not_found');
      }
      const task = storytellerTaskSchema.parse(record.input);
      if (record.state === 'pending' || record.state === 'running') {
        await execution.execute(record, task);
      }
      try {
        await publishStorytellerResult(
          database,
          id,
          options.realDurationMs ?? (() => 20000),
        );
      } catch (error) {
        if (!(error instanceof StoryError)) {
          throw error;
        }
        await database.db.transaction(async (tx) => {
          await tx
            .update(storytellerPublication)
            .set({ state: 'blocked', failureCode: 'publication_blocked' })
            .where(eq(storytellerPublication.generationId, id));
          await tx
            .update(generation)
            .set({ statusRevision: sql`${generation.statusRevision} + 1` })
            .where(eq(generation.id, id));
        });
      }
    },
  };
}
