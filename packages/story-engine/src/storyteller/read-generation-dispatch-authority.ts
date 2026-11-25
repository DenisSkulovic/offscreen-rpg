import { and, desc, eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import type { EffectiveUsagePolicy } from '@offscreen/usage-policy/usage-policy';
import {
  storytellerAttempt,
  storytellerOperation,
} from '@offscreen/story-persistence/storyteller';
import type { StorytellerTask } from '@offscreen/storyteller/tasks';
import { loadCurrentDispatchAuthority } from './load-current-dispatch-authority';

/**
 * Re-reads independently current dispatch authority for a generation.
 * Caller-supplied task snapshots and owner ids are never entitlement inputs.
 */
export async function readGenerationDispatchAuthority(
  database: Database,
  generationId: string,
  now: Date = new Date(),
): Promise<EffectiveUsagePolicy | null> {
  try {
    return await database.db.transaction(async (tx) => {
      const [operation] = await tx
        .select()
        .from(storytellerOperation)
        .where(eq(storytellerOperation.generationId, generationId))
        .limit(1);
      if (!operation) return null;

      const [attempt] = await tx
        .select()
        .from(storytellerAttempt)
        .where(
          and(
            eq(storytellerAttempt.generationId, generationId),
            eq(storytellerAttempt.runId, operation.runId),
          ),
        )
        .orderBy(desc(storytellerAttempt.createdAt))
        .limit(1);
      if (!attempt) return null;

      const resolution = await loadCurrentDispatchAuthority(
        tx,
        { attempt, operation },
        now,
      );
      if (resolution.kind !== 'allowed') return null;
      return resolution.currentPolicy;
    });
  } catch {
    return null;
  }
}

/** SQL-owning worker runtime hook when no dispatchAuthority callback was supplied. */
export function createGenerationDispatchAuthorityReader(database: Database) {
  return async (input: {
    generationId: string;
    ownerId: string;
    task: StorytellerTask;
  }): Promise<EffectiveUsagePolicy | null> =>
    readGenerationDispatchAuthority(database, input.generationId);
}