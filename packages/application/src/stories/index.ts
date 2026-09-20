import { createCampaignSettings } from '../campaign/settings';
import { createCampaignActions } from '../campaign/actions';
import { createCampaignActionExecutions } from '../campaign/action-executions';
import { createActionExecutionControls } from '../campaign/action-execution-controls';
import { createCampaignControls } from '../campaign/controls';
import { createCampaignActivities } from '../campaign/activities';
import { createAcceptedPlanControls } from '../campaign/accepted-plan-controls';
import { createWorldObligationControls } from '../campaign/world-obligation-controls';
import {
  campaignConsequenceTopic,
  createConsequenceNarration,
} from '../campaign/narration';
import type { CampaignStart } from '@offscreen/contracts/campaign';
import { respondToStorySchema } from '@offscreen/contracts/stories';
import { retryStoryteller } from '../storyteller/recovery';
import type { Database } from '@offscreen/db';
import { createStoryContinuation } from './continuation';
import { StoryError } from './errors';
import { createStoryInitialization } from './initialization';
import { createStoryReads } from './reads';
import { createStoryResolution } from './resolution';
import { createStoryStart, playableOpeningStorySource } from './start';
import { createStoryTiming } from './timing';
import { createStoryForks } from './forks';
import type { ReadCacheOptions } from '../cache/read-cache';
import { story } from '@offscreen/db/story-schema';
import { and, eq } from 'drizzle-orm';
import type { DocumentStore, RulePackageReference } from '@offscreen/documents';
import { createCampaignDocuments } from './documents';

export type StoryApplicationOptions = ReadCacheOptions & {
  documentStore?: DocumentStore;
  defaultRules?: RulePackageReference;
};

export {
  controlledIntervalTopic,
  decisionDeadlineTopic,
  intervalWakeTopic,
} from './topics';
export { campaignActionTopic } from '../campaign/topics';

export function createStories(
  database: Database,
  options: StoryApplicationOptions = {},
) {
  const reads = createStoryReads(database, options);
  const initializeStory = createStoryInitialization(
    database,
    options.documentStore,
    options.defaultRules,
  );
  const startPlayableCandidate = createStoryStart(
    database,
    options.documentStore,
    options.defaultRules,
  );
  const continuation = createStoryContinuation(database);
  const resolution = createStoryResolution(database, options.documentStore);
  const timing = createStoryTiming(database);
  const forkCurrent = createStoryForks(database);
  const documents = options.documentStore
    ? createCampaignDocuments(database, options.documentStore)
    : null;
  return {
    documents,
    campaignSettings: createCampaignSettings(database),
    campaignAction: createCampaignActions(database, options.documentStore),
    actionExecutionControl: createActionExecutionControls(database),
    campaignControl: createCampaignControls(database),
    acceptedPlanControl: createAcceptedPlanControls(database),
    worldObligationControl: createWorldObligationControls(database),
    advanceCampaignActivity: createCampaignActivities(
      database,
      options.documentStore,
    ).advance,
    advanceCampaignAction: createCampaignActionExecutions(
      database,
      options.documentStore,
    ).advance,
    prepareCampaignConsequence: createConsequenceNarration(
      database,
      options.documentStore,
    ),
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
    async fork(args: {
      ownerId: string;
      sourceStoryId: string;
      forkStoryId: string;
      expectedRevision: number;
    }) {
      await forkCurrent(args);
      return reads.readSnapshot({
        ownerId: args.ownerId,
        storyId: args.forkStoryId,
      });
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

export async function readOwnedStorySource(
  database: Database,
  identity: { ownerId: string; storyId: string },
) {
  const [row] = await database.db
    .select({ source: story.source })
    .from(story)
    .where(
      and(eq(story.id, identity.storyId), eq(story.ownerId, identity.ownerId)),
    );
  if (!row) {
    throw new StoryError('not_found');
  }
  return row.source;
}

/** Ordinary story application surface. Fixture mutation and inspection belong to Chamber. */
export function createStoryApplication(
  database: Database,
  options: StoryApplicationOptions = {},
) {
  const stories = createStories(database, options);

  async function read(args: { ownerId: string; storyId: string }) {
    const snapshot = await stories.read(args);
    const source = await readOwnedStorySource(database, args);
    return {
      ...snapshot,
      canRespond:
        source === playableOpeningStorySource &&
        !snapshot.campaign?.character &&
        snapshot.current.interaction !== null &&
        snapshot.resolution === null,
    };
  }

  return {
    ...stories,
    read,
    async fork(args: Parameters<typeof stories.fork>[0]) {
      await stories.fork(args);
      return read({ ownerId: args.ownerId, storyId: args.forkStoryId });
    },
    async retryResolution(args: {
      ownerId: string;
      storyId: string;
      retryId: string;
    }) {
      await stories.retryResolution(args);
      return read(args);
    },
    async control(args: {
      ownerId: string;
      storyId: string;
      operationId: string;
      body: unknown;
    }) {
      await stories.controlInterval(args);
      return read(args);
    },
    async startFromCandidate(
      args: Parameters<typeof stories.startFromCandidate>[0],
    ) {
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

export { StoryError };
export { playableOpeningStorySource } from './start';
export { campaignConsequenceTopic };
export { createCampaignDocuments, knowledgeIndexTopic } from './documents';
