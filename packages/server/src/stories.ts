import type { Database } from '@offscreen/db';
import { createStoryContinuation } from './story-continuation';
import { StoryError } from './story-errors';
import { createStoryInitialization } from './story-initialization';
import { createStoryReads } from './story-reads';
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
  const continuation = createStoryContinuation(database);
  const timing = createStoryTiming(database);
  return {
    read(ownerId: string, storyId: string) {
      return reads.readSnapshot({ ownerId, storyId });
    },
    /** Worker-only timeout. The lock and database clock arbitrate with player writes. */
    resolveDecision(passageId: string) {
      return timing.resolveDecision({ passageId });
    },
    intervalNeedsWake(intervalId: string) {
      return timing.intervalNeedsWake(intervalId);
    },
    async controlInterval(
      ownerId: string,
      storyId: string,
      operationId: string,
      body: unknown,
    ) {
      await timing.controlInterval({ ownerId, storyId, operationId, body });
      return reads.readSnapshot({ ownerId, storyId });
    },
    /** Worker-only operation. PostgreSQL rechecks eligibility before publication. */
    advanceInterval(intervalId: string) {
      return timing.advanceInterval({ intervalId });
    },
    /** Internal commit for an already resolved narrative continuation.
     * Not command admission, a rule resolver or an HTTP content-writing endpoint.
     * No inference or other external work belongs inside this transaction.
     */
    async append(
      ownerId: string,
      storyId: string,
      transitionId: string,
      proposed: unknown,
    ) {
      await continuation.append({
        ownerId,
        storyId,
        transitionId,
        proposed,
      });
      // A retry returns today's snapshot, never an old scene to roll the UI back.
      return reads.readSnapshot({ ownerId, storyId });
    },
    history(ownerId: string, storyId: string, before?: unknown) {
      return reads.readHistory({ ownerId, storyId, before });
    },
    /** Server-selected immutable source only. Never pass HTTP bodies here. */
    async initialize(ownerId: string, storyId: string, initial: unknown) {
      await initializeStory({ ownerId, storyId, initial });
      return reads.readSnapshot({ ownerId, storyId });
    },
  };
}

export { StoryError };
