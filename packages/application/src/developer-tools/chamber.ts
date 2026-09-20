import type { CampaignStart } from '@offscreen/contracts/campaign';
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
import {
  createStories,
  playableOpeningStorySource,
  StoryError,
} from '../stories/index';
import type { ReadCacheOptions } from '../cache/read-cache';

export { listChamberScenarios };

// API composition currently uses this wrapper for normal story routes too.
// Do not infer developer-only authorization from this directory's name.
// See ../../README.md, Other entrances and misleading names.
export function createChamber(
  database: Database,
  options: ReadCacheOptions = {},
) {
  const stories = createStories(database, options);
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
        !snapshot.campaign?.character &&
        snapshot.current.interaction !== null &&
        snapshot.resolution === null &&
        (chamberAllowsResponse(source) ||
          source === playableOpeningStorySource),
    };
  }

  return {
    campaignSettings: stories.campaignSettings,
    campaignAction: stories.campaignAction,
    campaignControl: stories.campaignControl,
    actionExecutionControl: stories.actionExecutionControl,
    acceptedPlanControl: stories.acceptedPlanControl,
    worldObligationControl: stories.worldObligationControl,
    list(args: { ownerId: string; before?: string }) {
      return stories.list(args);
    },
    async retryResolution(args: {
      ownerId: string;
      storyId: string;
      retryId: string;
    }) {
      await stories.retryResolution(args);
      return read(args);
    },
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
    async startFromCandidate(args: {
      ownerId: string;
      storyId: string;
      candidateId: string;
      expectedDraftRevision: number;
      campaign?: CampaignStart;
    }) {
      await stories.startFromCandidate(args);
      return read({ ownerId: args.ownerId, storyId: args.storyId });
    },
    async admitResolution(args: {
      ownerId: string;
      storyId: string;
      operationId: string;
      body: unknown;
    }) {
      const parsed = respondToStorySchema.safeParse(args.body);
      if (!parsed.success) {
        throw new StoryError('invalid');
      }
      await stories.admitResolution({
        ownerId: args.ownerId,
        storyId: args.storyId,
        operationId: args.operationId,
        expectedRevision: parsed.data.expectedRevision,
        submission: parsed.data.submission,
      });
      return read({ ownerId: args.ownerId, storyId: args.storyId });
    },
  };
}
