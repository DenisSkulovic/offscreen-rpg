import type { Database } from '@offscreen/db';
import type { DocumentStore } from '@offscreen/documents';
import type { createStorytellerRuntime } from '@offscreen/story-engine/storyteller';
import type {
  StorytellerActivities,
  CampaignActivities,
} from '@offscreen/workflows/contracts';
import { ApplicationFailure } from '@temporalio/client';
import { GenerationError } from '@offscreen/story-engine/generations';
import type { createScriptedOpenings } from '@offscreen/story-engine/generations';
import type { createScriptedContinuations } from '@offscreen/story-engine/generations';
import { StoryError, type createStories } from '@offscreen/story-engine/stories';
import type {
  ContinuationActivities,
  DecisionActivities,
  IntervalActivities,
  OpeningActivities,
  StoryLaunchActivities,
  WriterSceneActivities,
  WriterResearchActivities,
} from '@offscreen/workflows/contracts';
import { runScriptedLaunchWriter } from '../launch/scripted-launch';
import { runScriptedWriterScene } from './scripted-writer-scene';
import {
  runScriptedWriterResearchChild,
  runWriterResearchParentJoin,
} from './writer-research';

function mapOpeningActivityError(error: unknown): never {
  if (
    error instanceof StoryError &&
    error.reason === 'pending-consequence-not-settled'
  ) {
    throw ApplicationFailure.retryable(
      error.code,
      'PendingConsequenceNotSettled',
    );
  }
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
  database: Database;
  documentStore?: DocumentStore;
  storyteller: ReturnType<typeof createStorytellerRuntime>;
  stories: ReturnType<typeof createStories>;
  openings: ReturnType<typeof createScriptedOpenings>;
  continuations: ReturnType<typeof createScriptedContinuations>;
}): StorytellerActivities &
  CampaignActivities &
  OpeningActivities &
  ContinuationActivities &
  IntervalActivities &
  DecisionActivities &
  StoryLaunchActivities &
  WriterSceneActivities &
  WriterResearchActivities {
  const { stories, openings, continuations } = collaborators;
  return {
    async advanceCampaignActivity(id) {
      try {
        return await stories.advanceCampaignActivity(id);
      } catch (error) {
        mapStoryActivityError(error, 'IntervalStateError');
      }
    },
    async advanceCampaignAction(id) {
      try {
        return await stories.advanceCampaignAction(id);
      } catch (error) {
        mapStoryActivityError(error, 'IntervalStateError');
      }
    },
    async advanceDelegatedWithdrawal(id) {
      try {
        return await stories.advanceDelegatedWithdrawal(id);
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
    async runScriptedLaunchWriter(reservedStoryId) {
      return runScriptedLaunchWriter(collaborators.database, reservedStoryId);
    },
    async runScriptedWriterScene(missionId) {
      await runScriptedWriterScene(
        collaborators.database,
        collaborators.documentStore,
        missionId,
      );
    },
    async runScriptedWriterResearchChild(childId) {
      await runScriptedWriterResearchChild(
        collaborators.database,
        collaborators.documentStore,
        childId,
      );
    },
    async runWriterResearchParentJoin(joinOperationId) {
      const outcome = await runWriterResearchParentJoin(
        collaborators.database,
        collaborators.documentStore,
        joinOperationId,
      );
      if (outcome.status === 'held') {
        throw ApplicationFailure.nonRetryable(
          outcome.reason,
          'WriterResearchJoinHeld',
        );
      }
      if (outcome.status === 'incomplete') {
        throw ApplicationFailure.nonRetryable(
          'join_incomplete',
          'WriterResearchJoinIncomplete',
        );
      }
    },
  };
}
