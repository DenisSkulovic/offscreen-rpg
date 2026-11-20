import { ApplicationFailure } from '@temporalio/client';
import { and, eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { storytellerTaskSchema } from '@offscreen/storyteller/tasks';
import type { DocumentStore } from '@offscreen/documents';
import { StoryError } from '@offscreen/application/stories';
import type { StorytellerDistributedControlActivities } from '@offscreen/workflows/contracts';
import {
  createStorytellerGenerationAdoption,
  publishStorytellerResult,
  storytellerKind,
  type AdoptSavedStorytellerOutcome,
} from './storyteller-application-bridge';

function mapAdoptionFailure(outcome: AdoptSavedStorytellerOutcome): never {
  const reason = outcome.reason ?? outcome.status;
  if (outcome.status === 'held') {
    throw ApplicationFailure.nonRetryable(reason, 'PublicationHeld');
  }
  throw ApplicationFailure.nonRetryable(reason, 'PublicationRefused');
}

export function createStorytellerDistributedControlActivities(collaborators: {
  database: Database;
  documentStore?: DocumentStore;
  realDurationMs?: () => number;
}): StorytellerDistributedControlActivities {
  const adoption = createStorytellerGenerationAdoption(collaborators.database);
  return {
    async publishSavedStoryteller(generationId: string): Promise<void> {
      const [record] = await collaborators.database.db
        .select({ input: generation.input })
        .from(generation)
        .where(
          and(eq(generation.id, generationId), eq(generation.kind, storytellerKind)),
        );
      if (!record) {
        throw ApplicationFailure.nonRetryable(
          'unknown-generation',
          'PublicationRefused',
        );
      }
      const task = storytellerTaskSchema.safeParse(record.input);
      if (!task.success) {
        throw ApplicationFailure.nonRetryable(
          'unreadable-task',
          'PublicationRefused',
        );
      }
      const pinnedRoot = task.data.context.canonicalKnowledge?.rootHash ?? null;
      const outcome = await adoption.adoptSavedStorytellerGeneration({
        generationId,
        pinnedRoot,
      });
      if (outcome.status !== 'adopted' && outcome.status !== 'idempotent') {
        mapAdoptionFailure(outcome);
      }
      try {
        await publishStorytellerResult(
          collaborators.database,
          generationId,
          collaborators.realDurationMs ?? (() => 20_000),
          collaborators.documentStore,
        );
      } catch (error) {
        if (error instanceof StoryError) {
          throw ApplicationFailure.nonRetryable(error.code, 'PublicationStoryError');
        }
        throw error;
      }
    },
  };
}