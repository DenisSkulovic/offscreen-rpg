import {
  commitStorytellerResolution,
  prepareStorytellerResolution,
  replayStorytellerResolutionIfMatching,
} from '../storyteller/admission';
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
import { story, storyItem, storyResolution } from '@offscreen/db/story-schema';
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

type ScriptedResolutionFence = Readonly<{
  ownerId: string;
  storyId: string;
  operationId: string;
  expectedRevision: number;
  submission: ReturnType<typeof interactionSubmissionSchema.parse>;
  viewVersion: number;
  premise: unknown;
  activePassageId: string;
  activeContentDocumentHash: string | null;
  activeInlineContent: unknown | null;
  sourceGenerationId: string;
  sourceGenerationPart: unknown;
  activeInteraction: unknown;
  sourceGeneration: {
    id: string;
    ownerId: string;
    output: unknown;
  };
  items: ReturnType<typeof storyItemsSchema.parse>;
}>;

type PreparedScriptedResolution = Readonly<{
  fence: ScriptedResolutionFence;
  artifact: ReturnType<typeof playableContinuationArtifactSchema.parse>;
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

async function replayScriptedResolutionIfMatching(
  database: Database,
  input: {
    storyId: string;
    operationId: string;
    expectedRevision: number;
    submission: unknown;
  },
) {
  const submission = interactionSubmissionSchema.parse(input.submission);
  const [existingOperation] = await database.db
    .select()
    .from(storyResolution)
    .where(
      and(
        eq(storyResolution.storyId, input.storyId),
        eq(storyResolution.operationId, input.operationId),
      ),
    );
  if (!existingOperation) return false;
  if (
    existingOperation.baseRevision !== input.expectedRevision ||
    !isDeepStrictEqual(existingOperation.submission, submission)
  ) {
    throw new StoryError('conflict');
  }
  await database.db.transaction(async (tx) => {
    await enqueue(tx, {
      id: input.operationId,
      operationId: input.operationId,
      topic: scriptedContinuationTopic,
    });
  });
  return true;
}

async function prepareScriptedResolution(
  database: Database,
  input: {
    ownerId: string;
    storyId: string;
    operationId: string;
    expectedRevision: number;
    submission: unknown;
    documentStore?: DocumentStore;
  },
): Promise<PreparedScriptedResolution> {
  const parsedSubmission = interactionSubmissionSchema.parse(input.submission);
  const snapshot = await database.db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(story)
      .where(
        and(eq(story.id, input.storyId), eq(story.ownerId, input.ownerId)),
      );
    if (!current) throw new StoryError('not_found');
    if (current.storyteller != null) {
      throw new StoryError('invalid');
    }
    const [existingOperation] = await tx
      .select()
      .from(storyResolution)
      .where(
        and(
          eq(storyResolution.storyId, input.storyId),
          eq(storyResolution.operationId, input.operationId),
        ),
      );
    if (existingOperation) {
      if (
        existingOperation.baseRevision !== input.expectedRevision ||
        !isDeepStrictEqual(existingOperation.submission, parsedSubmission)
      ) {
        throw new StoryError('conflict');
      }
      throw new StoryError('conflict', 'replay_pending');
    }
    if (current.revision !== input.expectedRevision) {
      throw new StoryError('conflict');
    }
    const active = await requireCurrentPassage(tx, {
      storyId: input.storyId,
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
          eq(storyResolution.storyId, input.storyId),
          eq(storyResolution.basePassageId, active.id),
          eq(storyResolution.baseRevision, current.revision),
        ),
      );
    if (existingBase) throw new StoryError('conflict');
    const premise = premiseContentSchema.safeParse(current.premise);
    if (!premise.success) throw new StoryError('invalid');
    const [source] = await tx
      .select()
      .from(generation)
      .where(eq(generation.id, active.sourceGenerationId));
    if (!source || source.ownerId !== input.ownerId) {
      throw new StoryError('invalid');
    }
    const sourcePartResult = generationSourcePartSchema.safeParse(
      active.sourceGenerationPart,
    );
    if (!sourcePartResult.success) throw new StoryError('invalid');
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
        .where(eq(storyItem.storyId, input.storyId)),
    );
    return { current, active, source, sourcePartResult, premise, items };
  });

  const { current, active, source, sourcePartResult, premise, items } =
    snapshot;
  if (active.contentDocumentHash !== null && !input.documentStore) {
    throw new StoryError('unavailable', 'document_store');
  }
  const activeContent = active.contentDocumentHash
    ? await readPassageDocument(
        input.documentStore!,
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
        submission: parsedSubmission,
      }),
    );
  } catch (error) {
    mapPrepareFailure(error);
  }
  return {
    fence: {
      ownerId: input.ownerId,
      storyId: input.storyId,
      operationId: input.operationId,
      expectedRevision: input.expectedRevision,
      submission: parsedSubmission,
      viewVersion: current.viewVersion,
      premise: current.premise,
      activePassageId: active.id,
      activeContentDocumentHash: active.contentDocumentHash,
      activeInlineContent:
        active.contentDocumentHash === null ? active.content : null,
      sourceGenerationId: active.sourceGenerationId!,
      sourceGenerationPart: active.sourceGenerationPart,
      activeInteraction: active.interaction,
      sourceGeneration: {
        id: source.id,
        ownerId: source.ownerId,
        output: source.output,
      },
      items,
    },
    artifact,
  };
}

async function commitScriptedResolution(
  database: Database,
  prepared: PreparedScriptedResolution,
) {
  const operations = createGenerations(database, {
    kind: scriptedContinuationKind,
    input: playableContinuationArtifactSchema,
    output: generatedStorytellerOutputSchema,
  });
  await database.db.transaction(async (tx) => {
    const { fence } = prepared;
    const current = await lockOwnedStory(tx, {
      ownerId: fence.ownerId,
      storyId: fence.storyId,
    });
    const [existingOperation] = await tx
      .select()
      .from(storyResolution)
      .where(
        and(
          eq(storyResolution.storyId, fence.storyId),
          eq(storyResolution.operationId, fence.operationId),
        ),
      );
    if (existingOperation) {
      if (
        existingOperation.baseRevision !== fence.expectedRevision ||
        !isDeepStrictEqual(existingOperation.submission, fence.submission)
      ) {
        throw new StoryError('conflict');
      }
      await enqueue(tx, {
        id: fence.operationId,
        operationId: fence.operationId,
        topic: scriptedContinuationTopic,
      });
      return;
    }
    if (current.revision !== fence.expectedRevision) {
      throw new StoryError('conflict');
    }
    if (current.viewVersion !== fence.viewVersion) {
      throw new StoryError('conflict');
    }
    if (!isDeepStrictEqual(current.premise, fence.premise)) {
      throw new StoryError('conflict');
    }
    const active = await requireCurrentPassage(tx, {
      storyId: fence.storyId,
      sequence: current.revision,
    });
    if (
      active.id !== fence.activePassageId ||
      active.contentDocumentHash !== fence.activeContentDocumentHash ||
      (fence.activeContentDocumentHash === null &&
        !isDeepStrictEqual(active.content, fence.activeInlineContent)) ||
      active.sourceGenerationId !== fence.sourceGenerationId ||
      !isDeepStrictEqual(
        active.sourceGenerationPart,
        fence.sourceGenerationPart,
      ) ||
      !isDeepStrictEqual(active.interaction, fence.activeInteraction)
    ) {
      throw new StoryError('conflict');
    }
    const [source] = await tx
      .select()
      .from(generation)
      .where(eq(generation.id, fence.sourceGenerationId));
    if (
      !source ||
      source.id !== fence.sourceGeneration.id ||
      source.ownerId !== fence.sourceGeneration.ownerId ||
      !isDeepStrictEqual(source.output, fence.sourceGeneration.output)
    ) {
      throw new StoryError('conflict');
    }
    const items = storyItemsSchema.parse(
      await tx
        .select({
          key: storyItem.key,
          label: storyItem.label,
          holderKey: storyItem.holderKey,
        })
        .from(storyItem)
        .where(eq(storyItem.storyId, fence.storyId)),
    );
    if (!isDeepStrictEqual(items, fence.items)) {
      throw new StoryError('conflict');
    }
    const [existingBase] = await tx
      .select({ generationId: storyResolution.generationId })
      .from(storyResolution)
      .where(
        and(
          eq(storyResolution.storyId, fence.storyId),
          eq(storyResolution.basePassageId, active.id),
          eq(storyResolution.baseRevision, current.revision),
        ),
      );
    if (existingBase) throw new StoryError('conflict');
    try {
      await operations.insert(
        tx,
        fence.ownerId,
        fence.operationId,
        prepared.artifact,
      );
    } catch (error) {
      mapGenerationFailure(error);
    }
    await enqueue(tx, {
      id: fence.operationId,
      operationId: fence.operationId,
      topic: scriptedContinuationTopic,
    });
    await tx.insert(storyResolution).values({
      generationId: fence.operationId,
      storyId: fence.storyId,
      basePassageId: active.id,
      baseRevision: current.revision,
      operationId: fence.operationId,
      submission: fence.submission,
    });
    await incrementStoryViewVersion(tx, {
      storyId: fence.storyId,
      viewVersion: current.viewVersion + 1,
    });
  });
}

export function createStoryResolution(
  database: Database,
  documentStore?: DocumentStore,
) {
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

      const [storyRow] = await database.db
        .select({ storyteller: story.storyteller })
        .from(story)
        .where(and(eq(story.id, id), eq(story.ownerId, ownerId)));
      if (!storyRow) {
        throw new StoryError('not_found');
      }

      if (storyRow.storyteller != null) {
        if (
          await replayStorytellerResolutionIfMatching(database, {
            ownerId,
            storyId: id,
            operationId: admittedOperationId,
            expectedRevision,
            submission: parsedSubmission.data,
          })
        ) {
          return;
        }
        const prepared = await prepareStorytellerResolution(database, {
          ownerId,
          storyId: id,
          operationId: admittedOperationId,
          expectedRevision,
          submission: parsedSubmission.data,
          ...(documentStore ? { documentStore } : {}),
        });
        await database.db.transaction(async (tx) => {
          await commitStorytellerResolution(tx, prepared);
        });
        return;
      }

      if (
        await replayScriptedResolutionIfMatching(database, {
          storyId: id,
          operationId: admittedOperationId,
          expectedRevision,
          submission: parsedSubmission.data,
        })
      ) {
        return;
      }
      const prepared = await prepareScriptedResolution(database, {
        ownerId,
        storyId: id,
        operationId: admittedOperationId,
        expectedRevision,
        submission: parsedSubmission.data,
        ...(documentStore ? { documentStore } : {}),
      });
      await commitScriptedResolution(database, prepared);
    },
  };
}