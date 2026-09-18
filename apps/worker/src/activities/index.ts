import type { createStorytellerRuntime } from '@offscreen/application/storyteller';
import type {
  StorytellerActivities,
  CampaignActivities,
} from '@offscreen/workflows/contracts';
import { ApplicationFailure } from '@temporalio/client';
import { GenerationError } from '@offscreen/application/generations';
import type { createScriptedOpenings } from '@offscreen/application/generations';
import type { createScriptedContinuations } from '@offscreen/application/generations';
import { StoryError, type createStories } from '@offscreen/application/stories';
import type {
  ContinuationActivities,
  DecisionActivities,
  IntervalActivities,
  OpeningActivities,
} from '@offscreen/workflows/contracts';

function mapOpeningActivityError(error: unknown): never {
  if (error instanceof GenerationError || error instanceof StoryError) {
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
  storyteller: ReturnType<typeof createStorytellerRuntime>;
  stories: ReturnType<typeof createStories>;
  openings: ReturnType<typeof createScriptedOpenings>;
  continuations: ReturnType<typeof createScriptedContinuations>;
}): StorytellerActivities &
  CampaignActivities &
  OpeningActivities &
  ContinuationActivities &
  IntervalActivities &
  DecisionActivities {
  const { stories, openings, continuations } = collaborators;
  return {
    async advanceCampaignActivity(id) {
      try {
        return await stories.advanceCampaignActivity(id);
      } catch (error) {
        mapStoryActivityError(error, 'IntervalStateError');
      }
    },
    async prepareCampaignConsequence(id) {
      try {
        await stories.prepareCampaignConsequence(id);
      } catch (error) {
        mapStoryActivityError(error, 'IntervalStateError');
      }
    },
    async completeStoryteller(id) {
      try {
        await collaborators.storyteller.complete(id);
      } catch (error) {
        mapOpeningActivityError(error);
      }
    },
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
    async completeScriptedOpening(id) {
      try {
        await openings.complete(id);
      } catch (error) {
        mapOpeningActivityError(error);
      }
    },
    async completeScriptedContinuation(id) {
      try {
        await continuations.complete(id);
      } catch (error) {
        mapOpeningActivityError(error);
      }
    },
  };
}
