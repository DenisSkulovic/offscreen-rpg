import { interactionSchema } from '@offscreen/contracts/interactions';
import type { Database } from '@offscreen/db';
import { story, storyItem, storyPassage } from '@offscreen/db/story-schema';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import {
  initializationMatches,
  initialStorySchema,
  type InitialStory,
} from './story-command-policy';
import { StoryError, parseStoryIdentifier } from './story-errors';
import type { Transaction } from './outbox';

type InitializeStory = Readonly<{
  ownerId: string;
  storyId: string;
  initial: unknown;
}>;

type InitializeStoryInTransaction = Readonly<{
  ownerId: string;
  storyId: string;
  input: InitialStory;
}>;

export async function initializeStoryInTransaction(
  tx: Transaction,
  { ownerId, storyId, input }: InitializeStoryInTransaction,
) {
  const inserted = await tx
    .insert(story)
    .values({ id: storyId, ownerId, source: input.source })
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
    if (priorStory.source !== input.source) {
      throw new StoryError('conflict');
    }
    const [firstPassage] = await tx
      .select()
      .from(storyPassage)
      .where(
        and(eq(storyPassage.storyId, storyId), eq(storyPassage.sequence, 1)),
      );
    if (!firstPassage || !initializationMatches(firstPassage, input)) {
      throw new StoryError('conflict');
    }
    return;
  }

  if (input.items.length) {
    await tx
      .insert(storyItem)
      .values(input.items.map((item) => ({ storyId, ...item })));
  }
  await tx.insert(storyPassage).values({
    id: randomUUID(),
    storyId,
    sequence: 1,
    initialItems: input.items,
    content: input.content,
    interaction: input.interaction
      ? interactionSchema.parse({
          id: randomUUID(),
          specification: input.interaction,
        })
      : null,
    sourceGenerationId: input.sourceGenerationId ?? null,
  });
}

export function createStoryInitialization(database: Database) {
  return async function initializeStory({
    ownerId,
    storyId,
    initial,
  }: InitializeStory) {
    parseStoryIdentifier(storyId);
    const input = initialStorySchema.parse(initial);
    await database.db.transaction(async (tx) => {
      await initializeStoryInTransaction(tx, { ownerId, storyId, input });
    });
  };
}
