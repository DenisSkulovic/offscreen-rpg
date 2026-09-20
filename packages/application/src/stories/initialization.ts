import { isDeepStrictEqual } from 'node:util';
import { interactionSchema } from '@offscreen/contracts/interactions';
import type { Database } from '@offscreen/db';
import {
  story,
  storyDocumentCommit,
  storyItem,
  storyPassage,
} from '@offscreen/db/story-schema';
import { campaignSettings } from '@offscreen/db/campaign-schema';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import {
  initializationMatches,
  initialStorySchema,
  type InitialStory,
} from './command-policy';
import { StoryError, parseStoryIdentifier } from './errors';
import type { Transaction } from '../outbox/index';
import type { DocumentStore, RulePackageReference } from '@offscreen/documents';
import {
  stageStoryBootstrapDocuments,
  type StagedStoryBootstrap,
} from './passage-documents';

type InitializeStory = Readonly<{
  ownerId: string;
  storyId: string;
  initial: unknown;
}>;

type InitializeStoryInTransaction = Readonly<{
  ownerId: string;
  storyId: string;
  input: InitialStory;
  stagedPassage?: StagedStoryBootstrap;
  existingPassageContent?: unknown;
}>;

export async function initializeStoryInTransaction(
  tx: Transaction,
  {
    ownerId,
    storyId,
    input,
    stagedPassage,
    existingPassageContent,
  }: InitializeStoryInTransaction,
) {
  const firstPassageId = stagedPassage?.documentId ?? randomUUID();
  const inserted = await tx
    .insert(story)
    .values({
      id: storyId,
      ownerId,
      source: input.source,
      premise: input.premise ?? null,
      storyteller: input.storyteller ?? null,
      execution: input.execution ?? null,
      usagePolicy: input.usagePolicy ?? null,
      continuityNotes: input.storyteller ? [] : null,
      activeSceneScope: input.storyteller
        ? {
            version: 'active-scene-anchor.v1',
            fromSequence: 1,
            requiredPassageIds: [firstPassageId],
          }
        : null,
      documentRootHash: stagedPassage?.rootHash ?? null,
      documentRootRevision: stagedPassage?.rootRevision ?? 0,
    })
    .onConflictDoNothing()
    .returning({ id: story.id });

  if (!inserted.length) {
    const [priorStory] = await tx
      .select()
      .from(story)
      .where(eq(story.id, storyId));
    if (!priorStory || priorStory.ownerId !== ownerId) {
      throw new StoryError('not_found');
    }
    const [creationSettings] = await tx
      .select({ profile: campaignSettings.profile })
      .from(campaignSettings)
      .where(
        and(
          eq(campaignSettings.storyId, storyId),
          eq(campaignSettings.revision, 1),
        ),
      );
    if (
      priorStory.source !== input.source ||
      !isDeepStrictEqual(
        creationSettings?.profile ?? priorStory.storyteller ?? null,
        input.storyteller ?? null,
      ) ||
      !isDeepStrictEqual(
        priorStory.execution ?? null,
        input.execution ?? null,
      ) ||
      !isDeepStrictEqual(
        priorStory.usagePolicy ?? null,
        input.usagePolicy ?? null,
      )
    ) {
      throw new StoryError('conflict');
    }
    const [firstPassage] = await tx
      .select()
      .from(storyPassage)
      .where(
        and(eq(storyPassage.storyId, storyId), eq(storyPassage.sequence, 1)),
      );
    if (
      !firstPassage ||
      !initializationMatches(
        existingPassageContent === undefined
          ? firstPassage
          : { ...firstPassage, content: existingPassageContent },
        input,
        priorStory.premise,
      )
    ) {
      throw new StoryError('conflict');
    }
    return false;
  }

  if (input.items.length) {
    await tx
      .insert(storyItem)
      .values(input.items.map((item) => ({ storyId, ...item })));
  }
  await tx.insert(storyPassage).values({
    id: firstPassageId,
    storyId,
    sequence: 1,
    initialItems: input.items,
    content: stagedPassage ? null : input.content,
    contentDocumentHash: stagedPassage?.objectHash ?? null,
    interaction: input.interaction
      ? interactionSchema.parse({
          id: randomUUID(),
          specification: input.interaction,
        })
      : null,
    sourceGenerationId: input.sourceGenerationId ?? null,
    sourceGenerationPart: input.sourceGenerationPart ?? null,
  });
  if (stagedPassage) {
    await tx.insert(storyDocumentCommit).values({
      storyId,
      operationId: storyId,
      requestHash: stagedPassage.objectHash,
      baseRootHash: stagedPassage.baseRootHash,
      rootHash: stagedPassage.rootHash,
      rootRevision: stagedPassage.rootRevision,
    });
  }
  return true;
}

export function createStoryInitialization(
  database: Database,
  storage?: DocumentStore,
  defaultRules?: RulePackageReference,
) {
  return async function initializeStory({
    ownerId,
    storyId,
    initial,
  }: InitializeStory) {
    parseStoryIdentifier(storyId);
    const input = initialStorySchema.parse(initial);
    const [existingPassage] = storage
      ? await database.db
          .select({
            content: storyPassage.content,
            contentDocumentHash: storyPassage.contentDocumentHash,
          })
          .from(storyPassage)
          .where(
            and(
              eq(storyPassage.storyId, storyId),
              eq(storyPassage.sequence, 1),
            ),
          )
      : [];
    const existingPassageContent =
      storage && existingPassage?.contentDocumentHash
        ? (await storage.readSourcePassage(existingPassage.contentDocumentHash))
            .content
        : existingPassage?.content;
    const firstPassageId = randomUUID();
    const stagedPassage =
      storage && !existingPassage
        ? await stageStoryBootstrapDocuments({
            storage,
            storyId,
            passageId: firstPassageId,
            sequence: 1,
            operationId: storyId,
            rootHash: null,
            rootRevision: 0,
            content: input.content,
            premise: input.premise,
            items: input.items,
            ...(defaultRules ? { ruleReference: defaultRules } : {}),
          })
        : undefined;
    await database.db.transaction(async (tx) => {
      await initializeStoryInTransaction(tx, {
        ownerId,
        storyId,
        input,
        ...(stagedPassage ? { stagedPassage } : {}),
        ...(existingPassageContent === undefined
          ? {}
          : { existingPassageContent }),
      });
    });
  };
}
