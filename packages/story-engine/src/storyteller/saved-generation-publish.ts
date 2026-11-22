import { and, eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { storytellerPublication } from '@offscreen/db/storyteller-schema';
import type { DocumentStore } from '@offscreen/documents';
import { storytellerTaskSchema } from '@offscreen/storyteller/tasks';
import { StoryError } from '../stories/errors';
import { publicationPassageId } from '../stories/passage-documents';
import { createStorytellerGenerationAdoption } from './generation-adoption';
import { publishStorytellerResult } from './publication';
import { storytellerKind } from './records';

export type StorytellerSavedGenerationPublishOptions = {
  documentStore?: DocumentStore;
  realDurationMs?: () => number;
};

export type SavedGenerationPublishOutcome =
  | {
      status: 'published';
      generationId: string;
      attemptId: string;
      resultHash: string;
      passageId: string;
    }
  | {
      status: 'already_published';
      generationId: string;
      attemptId: string;
      resultHash: string;
      passageId: string;
    }
  | { status: 'stale'; generationId: string }
  | {
      status: 'blocked';
      generationId: string;
      reason: string;
    }
  | { status: 'refused'; reason: 'unknown-generation' };

export function createStorytellerSavedGenerationPublish(
  database: Database,
  options: StorytellerSavedGenerationPublishOptions = {},
) {
  const adoption = createStorytellerGenerationAdoption(database);
  const duration = options.realDurationMs ?? (() => 20_000);
  return {
    async publishSavedGeneration(
      generationId: string,
    ): Promise<SavedGenerationPublishOutcome> {
      const [record] = await database.db
        .select({ input: generation.input })
        .from(generation)
        .where(
          and(
            eq(generation.id, generationId),
            eq(generation.kind, storytellerKind),
          ),
        );
      if (!record) {
        return { status: 'refused', reason: 'unknown-generation' };
      }
      const task = storytellerTaskSchema.safeParse(record.input);
      if (!task.success) {
        return {
          status: 'blocked',
          generationId,
          reason: 'unreadable-task',
        };
      }
      const pinnedRoot = task.data.context.canonicalKnowledge?.rootHash ?? null;
      const adopt = await adoption.adoptSavedStorytellerGeneration({
        generationId,
        pinnedRoot,
      });
      if (adopt.status === 'refused') {
        if (adopt.reason === 'unknown-generation') {
          return { status: 'refused', reason: 'unknown-generation' };
        }
        return {
          status: 'blocked',
          generationId,
          reason: adopt.reason,
        };
      }
      if (adopt.status === 'held') {
        return {
          status: 'blocked',
          generationId,
          reason: adopt.reason,
        };
      }

      const [beforePublication] = await database.db
        .select({ state: storytellerPublication.state })
        .from(storytellerPublication)
        .where(eq(storytellerPublication.generationId, generationId));
      const alreadyPublished = beforePublication?.state === 'published';

      try {
        await publishStorytellerResult(
          database,
          generationId,
          duration,
          options.documentStore,
        );
      } catch (error) {
        if (error instanceof StoryError) {
          return {
            status: 'blocked',
            generationId,
            reason: error.reason ?? error.code,
          };
        }
        throw error;
      }

      const [afterPublication] = await database.db
        .select({ state: storytellerPublication.state })
        .from(storytellerPublication)
        .where(eq(storytellerPublication.generationId, generationId));
      const passageId = publicationPassageId(generationId);
      if (afterPublication?.state === 'stale') {
        return { status: 'stale', generationId };
      }
      if (afterPublication?.state === 'blocked') {
        return {
          status: 'blocked',
          generationId,
          reason: 'publication-blocked',
        };
      }
      if (afterPublication?.state === 'published') {
        return {
          status: alreadyPublished ? 'already_published' : 'published',
          generationId,
          attemptId: adopt.attemptId,
          resultHash: adopt.resultHash,
          passageId,
        };
      }
      return {
        status: 'blocked',
        generationId,
        reason: 'publication-pending',
      };
    },
  };
}
