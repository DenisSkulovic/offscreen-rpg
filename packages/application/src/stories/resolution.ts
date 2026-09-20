import { admitStorytellerResolution } from '../storyteller/admission';
import { isDeepStrictEqual } from 'node:util';
import {
  generatedStorytellerOutputSchema,
  generationSourcePartSchema,
  playableContinuationArtifactSchema,
  premiseContentSchema,
  preparePlayableContinuation,
  publishedPlayableFromGeneration,
} from '@offscreen/storyteller/tasks';
import {
  InteractionInputError,
  interactionSchema,
  interactionSubmissionSchema,
} from '@offscreen/contracts/interactions';
import { storyItemsSchema } from '@offscreen/contracts/stories';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { storyItem, storyResolution } from '@offscreen/db/story-schema';
import { and, eq } from 'drizzle-orm';
import { createGenerations, GenerationError } from '../generations/index';
import { enqueue } from '../outbox/index';
import {
  scriptedContinuationKind,
  scriptedContinuationTopic,
} from '../generations/scripted-continuations';
import { StoryError, parseStoryIdentifier } from './errors';
import {
  incrementStoryViewVersion,
  lockOwnedStory,
  requireCurrentPassage,
} from './persistence';
import type { DocumentStore } from '@offscreen/documents';
import { readPassageDocument } from './passage-documents';

type AdmitResolution = Readonly<{
  ownerId: string;
  storyId: string;
  operationId: string;
  expectedRevision: number;
  submission: unknown;
}>;

function mapPrepareFailure(error: unknown): never {
  if (error instanceof InteractionInputError) {
    throw new StoryError(
      error.code === 'stale_interaction' ? 'conflict' : 'invalid',
    );
  }
  if (error instanceof StoryError) {
    throw error;
  }
  throw new StoryError('conflict');
}

function mapGenerationFailure(error: unknown): never {
  if (error instanceof GenerationError) {
    throw new StoryError(error.code === 'invalid' ? 'invalid' : 'conflict');
  }
  throw error;
}

export function createStoryResolution(
  database: Database,
  documentStore?: DocumentStore,
) {
  const operations = createGenerations(database, {
    kind: scriptedContinuationKind,
    input: playableContinuationArtifactSchema,
    output: generatedStorytellerOutputSchema,
  });

  return {
    async admit({
      ownerId,
      storyId,
      operationId,
      expectedRevision,
      submission,
    }: AdmitResolution) {
      const id = parseStoryIdentifier(storyId);
      const admittedOperationId = parseStoryIdentifier(operationId);
      if (
        !Number.isSafeInteger(expectedRevision) ||
        expectedRevision < 1 ||
        expectedRevision > 2147483646
      ) {
        throw new StoryError('invalid');
      }
      const parsedSubmission =
        interactionSubmissionSchema.safeParse(submission);
      if (!parsedSubmission.success) {
        throw new StoryError('invalid');
      }
      await database.db.transaction(async (tx) => {
        const current = await lockOwnedStory(tx, {
          ownerId,
          storyId: id,
        });
        if (current.storyteller != null) {
          await admitStorytellerResolution(tx, {
            current,
            operationId: admittedOperationId,
            expectedRevision,
            submission: parsedSubmission.data,
            ...(documentStore ? { documentStore } : {}),
          });
          return;
        }
        const [existingOperation] = await tx
          .select()
          .from(storyResolution)
          .where(
            and(
              eq(storyResolution.storyId, id),
              eq(storyResolution.operationId, admittedOperationId),
            ),
          );
        if (existingOperation) {
          if (
            existingOperation.baseRevision !== expectedRevision ||
            !isDeepStrictEqual(
              existingOperation.submission,
              parsedSubmission.data,
            )
          ) {
            throw new StoryError('conflict');
          }
          await enqueue(tx, {
            id: admittedOperationId,
            operationId: admittedOperationId,
            topic: scriptedContinuationTopic,
          });
          return;
        }
        if (current.revision !== expectedRevision) {
          throw new StoryError('conflict');
        }
        const active = await requireCurrentPassage(tx, {
          storyId: id,
          sequence: current.revision,
        });
        if (!active.sourceGenerationId || !active.interaction) {
          throw new StoryError('invalid');
        }
        const [existingBase] = await tx
          .select({ generationId: storyResolution.generationId })
          .from(storyResolution)
          .where(
            and(
              eq(storyResolution.storyId, id),
              eq(storyResolution.basePassageId, active.id),
              eq(storyResolution.baseRevision, current.revision),
            ),
          );
        if (existingBase) {
          throw new StoryError('conflict');
        }
        const premise = premiseContentSchema.safeParse(current.premise);
        if (!premise.success) {
          throw new StoryError('invalid');
        }
        const [source] = await tx
          .select()
          .from(generation)
          .where(eq(generation.id, active.sourceGenerationId));
        if (!source || source.ownerId !== ownerId) {
          throw new StoryError('invalid');
        }
        const sourcePartResult = generationSourcePartSchema.safeParse(
          active.sourceGenerationPart,
        );
        if (!sourcePartResult.success) {
          throw new StoryError('invalid');
        }
        try {
          publishedPlayableFromGeneration({
            output: source.output,
            sourcePart: sourcePartResult.data,
          });
        } catch {
          throw new StoryError('invalid');
        }
        const items = storyItemsSchema.parse(
          await tx
            .select({
              key: storyItem.key,
              label: storyItem.label,
              holderKey: storyItem.holderKey,
            })
            .from(storyItem)
            .where(eq(storyItem.storyId, id)),
        );
        if (active.contentDocumentHash !== null && !documentStore) {
          throw new StoryError('unavailable', 'document_store');
        }
        const activeContent = active.contentDocumentHash
          ? await readPassageDocument(
              documentStore!,
              active.contentDocumentHash,
            )
          : active.content;
        let artifact;
        try {
          artifact = playableContinuationArtifactSchema.parse(
            preparePlayableContinuation({
              premise: premise.data,
              snapshot: {
                id: current.id,
                revision: current.revision,
                viewVersion: current.viewVersion,
                items,
                current: {
                  id: active.id,
                  content: activeContent,
                  interaction: interactionSchema.parse(active.interaction),
                },
              },
              publishedProposal: source.output,
              sourcePart: sourcePartResult.data,
              submission: parsedSubmission.data,
            }),
          );
        } catch (error) {
          mapPrepareFailure(error);
        }
        try {
          await operations.insert(tx, ownerId, admittedOperationId, artifact);
        } catch (error) {
          mapGenerationFailure(error);
        }
        await enqueue(tx, {
          id: admittedOperationId,
          operationId: admittedOperationId,
          topic: scriptedContinuationTopic,
        });
        await tx.insert(storyResolution).values({
          generationId: admittedOperationId,
          storyId: id,
          basePassageId: active.id,
          baseRevision: current.revision,
          operationId: admittedOperationId,
          submission: parsedSubmission.data,
        });
        await incrementStoryViewVersion(tx, {
          storyId: id,
          viewVersion: current.viewVersion + 1,
        });
      });
    },
  };
}
