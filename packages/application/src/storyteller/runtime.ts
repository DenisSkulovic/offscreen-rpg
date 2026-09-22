import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { storytellerPublication } from '@offscreen/db/storyteller-schema';
import { storytellerTaskSchema } from '@offscreen/storyteller/tasks';
import {
  createStorytellerExecution,
  type StorytellerRuntimeOptions,
} from './execution';
import { publishStorytellerResult } from './publication';
import { storytellerKind } from './records';
import { StoryError } from '../stories/errors';
export { storytellerTopic } from './records';
export type { StorytellerRuntimeOptions } from './execution';

/** Compact durable entry point: execute outside transactions, then publish under the story lock. */
export function createStorytellerRuntime(
  database: Database,
  options: StorytellerRuntimeOptions = {},
) {
  const execution = createStorytellerExecution(database, options);
  // A prepared finite action can enqueue a second publication wake while the
  // original provider activity is still running. Both notices intentionally
  // remain durable, but only one activity in this worker process may classify
  // or dispatch the generation at a time. After a process restart this set is
  // empty, so the existing durable running/attempt recovery path still owns an
  // interrupted transport.
  const activeGenerationIds = new Set<string>();

  return {
    async complete(id: string) {
      if (activeGenerationIds.has(id)) return;
      activeGenerationIds.add(id);
      try {
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
          const executionDisposition = await execution.execute(record, task);
          if (
            executionDisposition === 'held' ||
            executionDisposition === 'stopped'
          ) {
            return;
          }
        }
        try {
          await publishStorytellerResult(
            database,
            id,
            options.realDurationMs ?? (() => 20000),
            options.documentStore,
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
      } finally {
        activeGenerationIds.delete(id);
      }
    },
  };
}
