import { respondToStorySchema } from '@offscreen/contracts/stories';
import type { Database } from '@offscreen/db';
import { story } from '@offscreen/db/story-schema';
import { and, eq } from 'drizzle-orm';
import {
  chamberAllowsResponse,
  chamberOpeningFor,
  listChamberScenarios,
  selectChamberFixture,
  type ChamberScenario,
} from './chamber-fixtures';
import { createChamberInspector } from './chamber-inspector';
import { createStories, StoryError } from './stories';

export { listChamberScenarios };

export function createChamber(database: Database) {
  const stories = createStories(database);
  const inspector = createChamberInspector(database);

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

  async function read(args: { ownerId: string; storyId: string }) {
    const snapshot = await stories.read(args);
    const source = await ownedSource(args);
    return {
      ...snapshot,
      canRespond:
        chamberAllowsResponse(source) && snapshot.current.interaction !== null,
    };
  }

  return {
    async start(args: {
      ownerId: string;
      storyId: string;
      scenario?: ChamberScenario;
    }) {
      const scenario = args.scenario ?? 'chamber.v1';
      await stories.initialize({
        ownerId: args.ownerId,
        storyId: args.storyId,
        initial: chamberOpeningFor(scenario),
      });
      return read({ ownerId: args.ownerId, storyId: args.storyId });
    },
    async respond(args: {
      ownerId: string;
      storyId: string;
      operationId: string;
      body: unknown;
    }) {
      const parsed = respondToStorySchema.safeParse(args.body);
      if (!parsed.success) {
        throw new StoryError('invalid');
      }
      await stories.read({ ownerId: args.ownerId, storyId: args.storyId });
      const source = await ownedSource({
        ownerId: args.ownerId,
        storyId: args.storyId,
      });
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
      await stories.append({
        ownerId: args.ownerId,
        storyId: args.storyId,
        transitionId: args.operationId,
        proposed: {
          expectedRevision,
          response: submission,
          ...outcome,
        },
      });
      return read({ ownerId: args.ownerId, storyId: args.storyId });
    },
    read,
    async control(args: {
      ownerId: string;
      storyId: string;
      operationId: string;
      body: unknown;
    }) {
      await stories.controlInterval(args);
      return read({ ownerId: args.ownerId, storyId: args.storyId });
    },
    history(args: { ownerId: string; storyId: string; before?: unknown }) {
      return stories.history(args);
    },
    inspect(args: { ownerId: string; storyId: string }) {
      return inspector.inspect(args);
    },
    startFromCandidate(args: {
      ownerId: string;
      storyId: string;
      candidateId: string;
      expectedDraftRevision: number;
    }) {
      return stories.startFromCandidate(args);
    },
  };
}
