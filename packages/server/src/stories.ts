import type { Database } from '@offscreen/db';
import { createStoryContinuation } from './story-continuation';
import { StoryError } from './story-errors';
import { createStoryInitialization } from './story-initialization';
import { createStoryReads } from './story-reads';
import { createStoryStart } from './story-start';
import { createStoryTiming } from './story-timing';

export {
  controlledIntervalTopic,
  decisionDeadlineTopic,
  intervalWakeTopic,
  storyIntervalTopic,
} from './story-topics';

export function createStories(database: Database) {
  const reads = createStoryReads(database);
  const initializeStory = createStoryInitialization(database);
  const startPlayableCandidate = createStoryStart(database);
  const continuation = createStoryContinuation(database);
  const timing = createStoryTiming(database);
  return {
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
    }) {
      await startPlayableCandidate(args);
      return reads.readSnapshot({
        ownerId: args.ownerId,
        storyId: args.storyId,
      });
    },
  };
}

export { StoryError };
export { playableOpeningStorySource } from './story-start';
