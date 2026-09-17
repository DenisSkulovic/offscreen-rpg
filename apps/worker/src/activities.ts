import { ApplicationFailure } from '@temporalio/client';
import { GenerationError } from '@offscreen/server/generations';
import type { createScriptedOpenings } from '@offscreen/server/scripted-openings';
import { StoryError } from '@offscreen/server/stories';
import type { createStories } from '@offscreen/server/stories';
import type {
  DecisionActivities,
  IntervalActivities,
  OpeningActivities,
} from '@offscreen/workflows/contracts';

function mapOpeningActivityError(error: unknown): never {
  if (error instanceof GenerationError) {
    throw ApplicationFailure.nonRetryable(error.code, 'OpeningStateError');
  }
  // Avoid putting driver errors, SQL or request content in workflow history.
  throw ApplicationFailure.retryable(
    'Opening storage unavailable',
    'StorageUnavailable',
  );
}

function mapStoryActivityError(
  error: unknown,
  stateType: 'DecisionStateError' | 'IntervalStateError',
): never {
  if (error instanceof StoryError) {
    throw ApplicationFailure.nonRetryable(error.code, stateType);
  }
  throw ApplicationFailure.retryable(
    'Story storage unavailable',
    'StorageUnavailable',
  );
}

export function createWorkerActivities(collaborators: {
  stories: ReturnType<typeof createStories>;
  openings: ReturnType<typeof createScriptedOpenings>;
}): OpeningActivities & IntervalActivities & DecisionActivities {
  const { stories, openings } = collaborators;
  return {
    async resolveStoryDecision(id) {
      try {
        return await stories.resolveDecision({ passageId: id });
      } catch (error) {
        mapStoryActivityError(error, 'DecisionStateError');
      }
    },
    async advanceControlledInterval(id) {
      try {
        return await stories.advanceInterval({ intervalId: id });
      } catch (error) {
        mapStoryActivityError(error, 'IntervalStateError');
      }
    },
    async advanceStoryInterval(id) {
      try {
        return await stories.advanceInterval({ intervalId: id });
      } catch (error) {
        mapStoryActivityError(error, 'IntervalStateError');
      }
    },
    async completeScriptedOpening(id) {
      try {
        await openings.complete(id);
      } catch (error) {
        mapOpeningActivityError(error);
      }
    },
  };
}
