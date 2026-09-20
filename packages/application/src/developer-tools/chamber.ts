import type { CampaignStart } from '@offscreen/contracts/campaign';
import { chamberStorytellerControlRequestSchema } from '@offscreen/contracts/chamber';
import { respondToStorySchema } from '@offscreen/contracts/stories';
import type { Database } from '@offscreen/db';
import { randomUUID } from 'node:crypto';
import {
  chamberAllowsResponse,
  chamberOpeningFor,
  listChamberScenarios,
  selectChamberFixture,
  type ChamberScenario,
} from './chamber-fixtures';
import { createChamberInspector } from './chamber-inspector';
import {
  createStoryApplication,
  playableOpeningStorySource,
  readOwnedStorySource,
  StoryError,
} from '../stories/index';
import type { StoryApplicationOptions } from '../stories/index';
import { enqueue } from '../outbox/index';
import { storytellerTopic } from '../storyteller/records';
import type { ChamberStorytellerControl } from './storyteller-control';

export { listChamberScenarios };

// API composition currently uses this wrapper for normal story routes too.
// Do not infer developer-only authorization from this directory's name.
// See ../../README.md, Other entrances and misleading names.
export function createChamber(
  database: Database,
  options: StoryApplicationOptions & {
    storytellerControl?: ChamberStorytellerControl;
  } = {},
) {
  const stories = createStoryApplication(database, options);
  const inspector = createChamberInspector(database, options.documentStore);

  async function read(args: { ownerId: string; storyId: string }) {
    const snapshot = await stories.read(args);
    const source = await readOwnedStorySource(database, args);
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
    documents: stories.documents,
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
      const source = await readOwnedStorySource(database, {
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
    async fork(args: {
      ownerId: string;
      sourceStoryId: string;
      forkStoryId: string;
      expectedRevision: number;
    }) {
      await stories.fork(args);
      return read({ ownerId: args.ownerId, storyId: args.forkStoryId });
    },
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
    async readStorytellerControl(args: { ownerId: string; storyId: string }) {
      await stories.read(args);
      return options.storytellerControl?.read(args.storyId) ?? null;
    },
    async controlStoryteller(args: {
      ownerId: string;
      storyId: string;
      body: unknown;
    }) {
      await stories.read(args);
      const control = options.storytellerControl;
      if (!control) throw new StoryError('conflict');
      const request = chamberStorytellerControlRequestSchema.safeParse(
        args.body,
      );
      if (!request.success) throw new StoryError('invalid');
      const { expectedRevision } = request.data;
      try {
        switch (request.data.action) {
          case 'arm-hold':
            return control.arm(args.storyId, expectedRevision, 'hold');
          case 'arm-failure':
            return control.arm(args.storyId, expectedRevision, 'fail');
          case 'clear':
            return control.clear(args.storyId, expectedRevision);
          case 'release': {
            const generationId = request.data.generationId;
            const current = control.read(args.storyId);
            if (
              current.revision !== expectedRevision ||
              current.state !== 'held' ||
              current.generationId !== generationId
            ) {
              throw new Error('storyteller_control_conflict');
            }
            await database.db.transaction((tx) =>
              enqueue(tx, {
                id: randomUUID(),
                operationId: generationId,
                topic: storytellerTopic,
              }),
            );
            return control.release(
              args.storyId,
              expectedRevision,
              generationId,
            );
          }
          default:
            request.data satisfies never;
            throw new StoryError('invalid');
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === 'storyteller_control_conflict'
        ) {
          throw new StoryError('conflict');
        }
        throw error;
      }
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
        body: parsed.data,
      });
      return read({ ownerId: args.ownerId, storyId: args.storyId });
    },
  };
}
