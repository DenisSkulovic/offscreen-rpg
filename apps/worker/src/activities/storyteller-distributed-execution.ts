import { ApplicationFailure } from '@temporalio/client';
import {
  hashStorytellerTaskCustodyResult,
  storytellerTaskCustodyFetchResponseSchema,
} from '@offscreen/game-authority-protocol/storyteller-task-custody';
import {
  storytellerTaskSchema,
  type StorytellerTask,
} from '@offscreen/storyteller/tasks';
import { scriptedStorytellerResult } from '@offscreen/storyteller/fixtures';
import type { StorytellerDistributedExecutionActivities } from '@offscreen/workflows/contracts';
import type { StorytellerTaskCustodyClient } from '../custody/storyteller-task-custody-client';

function refuseProviderMode(task: StorytellerTask): never {
  throw ApplicationFailure.nonRetryable(
    'Provider execution is not enabled on the distributed executor',
    'ProviderModeRefused',
  );
}

function holdExecution(message: string): never {
  throw ApplicationFailure.nonRetryable(message, 'ExecutionHeld');
}

export function createStorytellerDistributedExecutionActivities(
  custody: StorytellerTaskCustodyClient,
): StorytellerDistributedExecutionActivities {
  return {
    async executeFrozenStoryteller(generationId: string): Promise<void> {
      const fetched = await custody.fetchTask(generationId);
      const parsedFetch =
        storytellerTaskCustodyFetchResponseSchema.safeParse(fetched);
      if (!parsedFetch.success) {
        throw ApplicationFailure.retryable(
          'Task custody fetch returned an invalid shape',
          'CustodyUnavailable',
        );
      }
      if (parsedFetch.data.status === 'refused') {
        throw ApplicationFailure.nonRetryable(
          parsedFetch.data.reason,
          'TaskCustodyRefused',
        );
      }
      const taskResult = storytellerTaskSchema.safeParse(parsedFetch.data.task);
      if (!taskResult.success) {
        throw ApplicationFailure.nonRetryable(
          'unreadable-task',
          'TaskCustodyRefused',
        );
      }
      const task = taskResult.data;
      if (task.execution.mode !== 'scripted') {
        refuseProviderMode(task);
      }

      const pinnedRoot = parsedFetch.data.pinnedRoot;
      const saved = await custody.readSaved(generationId);
      if (saved.status === 'saved') {
        return;
      }

      const claim = await custody.claim(generationId, pinnedRoot);
      if (claim.status === 'refused') {
        throw ApplicationFailure.nonRetryable(
          claim.reason,
          'TaskCustodyRefused',
        );
      }

      if (!claim.created) {
        const afterClaim = await custody.readSaved(generationId);
        if (afterClaim.status === 'saved') {
          return;
        }
        holdExecution('claim exists without a saved scripted result');
      }

      const result = scriptedStorytellerResult(task);
      const resultHash = hashStorytellerTaskCustodyResult(result);
      const save = await custody.save(
        generationId,
        pinnedRoot,
        resultHash,
        result,
      );
      if (save.status === 'refused') {
        throw ApplicationFailure.nonRetryable(save.reason, 'TaskCustodyRefused');
      }
      if (save.status === 'conflict') {
        const existing = await custody.readSaved(generationId);
        if (
          existing.status === 'saved' &&
          existing.resultHash === save.resultHash
        ) {
          return;
        }
        throw ApplicationFailure.nonRetryable(
          'result-hash',
          'TaskCustodyConflict',
        );
      }
    },
  };
}