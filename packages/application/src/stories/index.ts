import { createCampaignSettings } from '../campaign/settings';
import { createCampaignActions } from '../campaign/actions';
import { createCampaignActionExecutions } from '../campaign/action-executions';
import { createActionExecutionControls } from '../campaign/action-execution-controls';
import { createCampaignControls } from '../campaign/controls';
import { createCampaignActivities } from '../campaign/activities';
import { createAcceptedPlanControls } from '../campaign/accepted-plan-controls';
import {
  campaignConsequenceTopic,
  createConsequenceNarration,
} from '../campaign/narration';
import type { CampaignStart } from '@offscreen/contracts/campaign';
import { retryStoryteller } from '../storyteller/recovery';
import type { Database } from '@offscreen/db';
import { createStoryContinuation } from './continuation';
import { StoryError } from './errors';
import { createStoryInitialization } from './initialization';
import { createStoryReads } from './reads';
import { createStoryResolution } from './resolution';
import { createStoryStart } from './start';
import { createStoryTiming } from './timing';
import type { ReadCacheOptions } from '../cache/read-cache';

export {
  controlledIntervalTopic,
  decisionDeadlineTopic,
  intervalWakeTopic,
} from './topics';
export { campaignActionTopic } from '../campaign/topics';

export function createStories(
  database: Database,
  options: ReadCacheOptions = {},
) {
  const reads = createStoryReads(database, options);
  const initializeStory = createStoryInitialization(database);
  const startPlayableCandidate = createStoryStart(database);
  const continuation = createStoryContinuation(database);
  const resolution = createStoryResolution(database);
  const timing = createStoryTiming(database);
  return {
    campaignSettings: createCampaignSettings(database),
    campaignAction: createCampaignActions(database),
    actionExecutionControl: createActionExecutionControls(database),
    campaignControl: createCampaignControls(database),
    acceptedPlanControl: createAcceptedPlanControls(database),
    advanceCampaignActivity: createCampaignActivities(database).advance,
    advanceCampaignAction: createCampaignActionExecutions(database).advance,
    prepareCampaignConsequence: createConsequenceNarration(database),
    list(args: { ownerId: string; before?: string }) {
      return reads.listStories(args);
    },
    async retryResolution(args: {
      ownerId: string;
      storyId: string;
      retryId: string;
    }) {
      await retryStoryteller(database, args);
      return reads.readSnapshot(args);
    },
    read(args: { ownerId: string; storyId: string }) {
      return reads.readSnapshot(args);
    },
    /** Worker-only timeout. The lock and database clock arbitrate with player writes. */
    resolveDecision(args: { passageId: string }) {
      return timing.resolveDecision(args);
    },
    intervalNeedsWake(args: { intervalId: string }) {
      return timing.intervalNeedsWake(args.intervalId);
    },
    async controlInterval(args: {
      ownerId: string;
      storyId: string;
      operationId: string;
      body: unknown;
    }) {
      await timing.controlInterval(args);
      return reads.readSnapshot({
        ownerId: args.ownerId,
        storyId: args.storyId,
      });
    },
    /** Worker-only operation. PostgreSQL rechecks eligibility before publication. */
    advanceInterval(args: { intervalId: string }) {
      return timing.advanceInterval(args);
    },
    /** Internal commit for an already resolved narrative continuation.
     * Not command admission, a rule resolver or an HTTP content-writing endpoint.
     * No inference or other external work belongs inside this transaction.
     */
    async append(args: {
      ownerId: string;
      storyId: string;
      transitionId: string;
      proposed: unknown;
    }) {
      await continuation.append(args);
      // A retry returns today's snapshot, never an old scene to roll the UI back.
      return reads.readSnapshot({
        ownerId: args.ownerId,
        storyId: args.storyId,
      });
    },
    history(args: { ownerId: string; storyId: string; before?: unknown }) {
      return reads.readHistory(args);
    },
    /** Server-selected immutable source only. Never pass HTTP bodies here. */
    async initialize(args: {
      ownerId: string;
      storyId: string;
      initial: unknown;
    }) {
      await initializeStory(args);
      return reads.readSnapshot({
        ownerId: args.ownerId,
        storyId: args.storyId,
      });
    },
    async startFromCandidate(args: {
      ownerId: string;
      storyId: string;
      candidateId: string;
      expectedDraftRevision: number;
      campaign?: CampaignStart;
    }) {
      await startPlayableCandidate(args);
      return reads.readSnapshot({
        ownerId: args.ownerId,
        storyId: args.storyId,
      });
    },
    async admitResolution(args: {
      ownerId: string;
      storyId: string;
      operationId: string;
      expectedRevision: number;
      submission: unknown;
    }) {
      await resolution.admit(args);
      return reads.readSnapshot({
        ownerId: args.ownerId,
        storyId: args.storyId,
      });
    },
  };
}

export { StoryError };
export { playableOpeningStorySource } from './start';
export { campaignConsequenceTopic };
