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
import type { CampaignStart } from '@offscreen/story-interface/campaign';
import { respondToStorySchema } from '@offscreen/story-interface/stories';
import { retryStoryteller } from './storyteller-retry';
import type { Database } from '@offscreen/db';
import { createStoryContinuation } from './continuation';
import { StoryError } from './errors';
import { createStoryInitialization } from './initialization';
import { createStoryReads } from './reads';
import { createStoryResolution } from './resolution';
import { createResolutionReceiptReader } from './resolution-receipt';
import { createStoryStart, playableOpeningStorySource } from './start';
import { createStoryTiming } from './timing';
import { createStoryForks } from './forks';
import { readPublicStoryEvents } from './public-events';
import {
  acknowledgeStoryVisit,
  readStoryVisitOpening,
} from './visit-checkpoint';
import {
  createCustomIntentAcceptance,
  createCustomIntentInterpretation,
} from '../campaign/custom-intent';
import type { ReadCacheOptions } from './read-cache-options';
import { story } from '@offscreen/db/story-schema';
import { and, eq } from 'drizzle-orm';
import type { DocumentStore, RulePackageReference } from '@offscreen/documents';
import { createCampaignDocuments } from './documents';
import { createStoryDelegationPolicy } from './delegation-policy';
import { createDelegatedOfferControls } from '../campaign/delegated-offer';
import { advanceDelegatedWithdrawal as advanceDelegatedWithdrawalFn } from '../campaign/delegated-expiry';
import type { WriterContinuationAdmission } from '../storyteller/writer-continuation';

export type StoryApplicationOptions = ReadCacheOptions & {
  documentStore?: DocumentStore;
  defaultRules?: RulePackageReference;
  /** Trusted server-side writer continuation admission; never from player payloads. */
  writerContinuationAdmission?: WriterContinuationAdmission;
  /**
   * Optional synthetic-fixture presentation eligibility. Ordinary callers omit
   * this; absence denies every non-playable source. Authorization stays with
   * owner, interaction, and resolution checks.
   */
  fixtureSourceCanRespond?: (source: string) => boolean;
};

export {
  controlledIntervalTopic,
  decisionDeadlineTopic,
  intervalWakeTopic,
} from './topics';
export { campaignActionTopic } from '../campaign/topics';
export {
  admitDelegatedDecision,
  PREAPPROVED_WITHDRAWAL_WINDOW_MS,
} from '../campaign/delegated-decision';
export { DELEGATED_DECISION_NOTICE_TOPIC } from '../campaign/delegated-offer';
export { advanceDelegatedWithdrawal } from '../campaign/delegated-expiry';

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
  const continuation = createStoryContinuation(database, options.documentStore);
  const resolution = createStoryResolution(database, options.documentStore);
  const resolutionReceipts = createResolutionReceiptReader(database);
  const timing = createStoryTiming(database);
  const forks = createStoryForks(database, options.documentStore);
  const documents = options.documentStore
    ? createCampaignDocuments(database, options.documentStore)
    : null;
  const delegationPolicy = createStoryDelegationPolicy(database);
  const delegatedOfferControl = createDelegatedOfferControls(database);
  return {
    documents,
    delegationPolicy,
    delegatedOfferControl,
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
      options.writerContinuationAdmission === undefined
        ? {}
        : { writerContinuationAdmission: options.writerContinuationAdmission },
    ).advance,
    advanceDelegatedWithdrawal(wakeOperationId: string) {
      return advanceDelegatedWithdrawalFn(
        database,
        wakeOperationId,
        options.documentStore,
      );
    },
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
    readHistoricalScene(args: {
      ownerId: string;
      storyId: string;
      sequence: unknown;
    }) {
      return reads.readHistoricalScene(args);
    },
    readResolutionReceipt(args: {
      ownerId: string;
      storyId: string;
      operationId: string;
    }) {
      return resolutionReceipts.read(args);
    },
    async fork(args: {
      ownerId: string;
      sourceStoryId: string;
      forkStoryId: string;
      expectedRevision: number;
      sourcePassageId?: string;
      sourceCheckpointHash?: string;
    }) {
      await forks.fork(args);
      return reads.readSnapshot({
        ownerId: args.ownerId,
        storyId: args.forkStoryId,
      });
    },
    forkCurrent: forks.forkCurrent,
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
    events(args: {
      ownerId: string;
      storyId: string;
      before?: unknown;
      limit?: unknown;
    }) {
      return readPublicStoryEvents(database, args);
    },
    interpretCustomIntent: createCustomIntentInterpretation(database),
    acceptCustomIntent: createCustomIntentAcceptance(database),
    visit(args: { ownerId: string; storyId: string }) {
      return readStoryVisitOpening(database, args);
    },
    acknowledgeVisit(args: {
      ownerId: string;
      storyId: string;
      ackId: string;
      visitToken: string;
      frontier: number;
    }) {
      return acknowledgeStoryVisit(database, args);
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
        (source === playableOpeningStorySource ||
          (options.fixtureSourceCanRespond?.(source) ?? false)) &&
        !snapshot.campaign?.character &&
        snapshot.current.interaction !== null &&
        snapshot.resolution === null,
    };
  }

  return {
    ...stories,
    read,
    readHistoricalScene(args: {
      ownerId: string;
      storyId: string;
      sequence: unknown;
    }) {
      return stories.readHistoricalScene(args);
    },
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
export {
  createCampaignDocuments,
  knowledgeIndexTopic,
  type CampaignDocumentRoot,
  type ResolvedOwnedLibraryDocument,
} from './documents';
export {
  resolutionRequestDigest,
  publicReceiptState,
} from './resolution-receipt';
/** Test/worker seam: transactional viewVersion write also NOTIFYs SSE listeners (W16). */
export { incrementStoryViewVersion } from './persistence';
