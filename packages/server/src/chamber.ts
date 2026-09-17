import { respondToStorySchema } from '@offscreen/contracts/stories';
import type { Database } from '@offscreen/db';
import { story } from '@offscreen/db/story-schema';
import { and, eq } from 'drizzle-orm';
import {
  chamberAllowsResponse,
  chamberOpeningFor,
  selectChamberFixture,
  type ChamberScenario,
} from './chamber-fixtures';
import { createStories, StoryError } from './stories';

export function createChamber(database: Database) {
  const stories = createStories(database);

  async function ownedSource(identity: { ownerId: string; storyId: string }) {
    const [row] = await database.db
      .select({ source: story.source })
      .from(story)
      .where(
        and(
          eq(story.id, identity.storyId),
          eq(story.ownerId, identity.ownerId),
        ),
      );
    if (!row) {
      throw new StoryError('not_found');
    }
    return row.source;
  }

  async function read(ownerId: string, storyId: string) {
    const snapshot = await stories.read(ownerId, storyId);
    const source = await ownedSource({ ownerId, storyId });
    return {
      ...snapshot,
      canRespond:
        chamberAllowsResponse(source) && snapshot.current.interaction !== null,
    };
  }

  return {
    async start(
      ownerId: string,
      storyId: string,
      scenario: ChamberScenario = 'chamber.v1',
    ) {
      await stories.initialize(ownerId, storyId, chamberOpeningFor(scenario));
      return read(ownerId, storyId);
    },
    async respond(
      ownerId: string,
      storyId: string,
      operationId: string,
      body: unknown,
    ) {
      const parsed = respondToStorySchema.safeParse(body);
      if (!parsed.success) {
        throw new StoryError('invalid');
      }
      await stories.read(ownerId, storyId);
      const source = await ownedSource({ ownerId, storyId });
      const fixture = selectChamberFixture(source);
      if (!fixture?.respond) {
        throw new StoryError('conflict');
      }
      const { expectedRevision, submission } = parsed.data;
      // Pure, versioned fixture policy. Resolve from the submitted base revision
      // so an acknowledged-late retry proposes the same outcome after progression.
      const outcome = fixture.respond(
        expectedRevision,
        submission.answer.optionId,
      );
      await stories.append(ownerId, storyId, operationId, {
        expectedRevision,
        response: submission,
        ...outcome,
      });
      return read(ownerId, storyId);
    },
    read,
    async control(
      ownerId: string,
      storyId: string,
      operationId: string,
      body: unknown,
    ) {
      await stories.controlInterval(ownerId, storyId, operationId, body);
      return read(ownerId, storyId);
    },
    history: stories.history,
  };
}
