import {
  ApplicationFailure,
  proxyActivities,
  condition,
  defineSignal,
  setHandler,
  sleep,
  uuid4,
} from '@temporalio/workflow';
import { intervalChangedSignal } from './contracts';
import type {
  OpeningActivities,
  IntervalActivities,
  DecisionActivities,
  ContinuationActivities,
  StorytellerActivities,
  StorytellerDistributedControlActivities,
  StorytellerDistributedExecutionActivities,
  CampaignActivities,
  StoryLaunchActivities,
  WriterSceneActivities,
  WriterSceneDistributedControlActivities,
  WriterSceneDistributedExecutionActivities,
  WriterSceneRoundFinalizeResult,
  WriterSceneRoundMissionState,
} from './contracts';
import {
  storytellerControlTaskQueue,
  storytellerExecuteTaskQueue,
} from './contracts';

const { completeScriptedOpening } = proxyActivities<OpeningActivities>({
  startToCloseTimeout: '30 seconds',
  retry: { initialInterval: '1 second', maximumInterval: '30 seconds' },
});

// Only references enter history. This Activity is an idempotent database fixture,
// not a policy for retrying paid or otherwise uncertain external effects.
export async function scriptedOpeningV1(id: string): Promise<void> {
  await completeScriptedOpening(id);
}

const { completeScriptedContinuation } =
  proxyActivities<ContinuationActivities>({
    startToCloseTimeout: '30 seconds',
    retry: { initialInterval: '1 second', maximumInterval: '30 seconds' },
  });

export async function scriptedContinuationV1(id: string): Promise<void> {
  await completeScriptedContinuation(id);
}

const { advanceControlledInterval } = proxyActivities<IntervalActivities>({
  startToCloseTimeout: '30 seconds',
  retry: { initialInterval: '1 second', maximumInterval: '30 seconds' },
});
export async function storyIntervalV1(id: string): Promise<void> {
  let wakeVersion = 0;
  setHandler(defineSignal(intervalChangedSignal), () => {
    wakeVersion++;
  });
  while (true) {
    const observed = wakeVersion;
    const remaining = await advanceControlledInterval(id);
    if (remaining === null) {
      return;
    }
    if (observed !== wakeVersion) {
      continue;
    }
    if (remaining < 0) {
      await condition(() => observed !== wakeVersion);
    } else {
      await condition(() => observed !== wakeVersion, remaining);
    }
  }
}

const { resolveStoryDecision } = proxyActivities<DecisionActivities>({
  startToCloseTimeout: '30 seconds',
  retry: { initialInterval: '1 second', maximumInterval: '30 seconds' },
});
export async function storyDecisionV1(id: string): Promise<void> {
  while (true) {
    const remaining = await resolveStoryDecision(id);
    if (remaining === null) {
      return;
    }
    await sleep(remaining);
  }
}

const { advanceDelegatedWithdrawal } = proxyActivities<CampaignActivities>({
  startToCloseTimeout: '30 seconds',
  retry: { initialInterval: '1 second', maximumInterval: '30 seconds' },
});
export async function campaignDelegatedDecisionV1(
  wakeOperationId: string,
): Promise<void> {
  while (true) {
    const remaining = await advanceDelegatedWithdrawal(wakeOperationId);
    if (remaining === null) {
      return;
    }
    await sleep(remaining);
  }
}

const { completeStoryteller } = proxyActivities<
  import('./contracts').StorytellerActivities
>({
  startToCloseTimeout: '3 minutes',
  retry: {
    initialInterval: '2 seconds',
    maximumInterval: '30 seconds',
    maximumAttempts: 5,
  },
});
// Redelivery retries execution bookkeeping/publication, never an uncertain paid dispatch.
export async function storytellerV1(id: string): Promise<void> {
  await completeStoryteller(id);
}

const { runScriptedLaunchWriter } = proxyActivities<StoryLaunchActivities>({
  startToCloseTimeout: '30 seconds',
  retry: { maximumAttempts: 1 },
});

/** One scripted launch writer round; no provider or storyteller distributed path. */
export async function storyLaunchV1(
  reservedStoryId: string,
): Promise<'composing' | 'failed' | 'uncertain' | 'replayed'> {
  return await runScriptedLaunchWriter(reservedStoryId);
}

const { runScriptedWriterScene } = proxyActivities<WriterSceneActivities>({
  startToCloseTimeout: '3 minutes',
  retry: { maximumAttempts: 1 },
});

/** One scripted writer-scene continuation; no live provider dispatch. */
export async function writerSceneV1(missionId: string): Promise<void> {
  await runScriptedWriterScene(missionId);
}

const writerSceneDistributedControlRetry = {
  initialInterval: '2 seconds',
  maximumInterval: '30 seconds',
  maximumAttempts: 5,
} as const;

const {
  planWriterSceneRound,
  readWriterSceneRoundMissionState,
  finalizeWriterSceneRound,
} = proxyActivities<WriterSceneDistributedControlActivities>({
  taskQueue: storytellerControlTaskQueue,
  startToCloseTimeout: '3 minutes',
  retry: writerSceneDistributedControlRetry,
});

const { executePreparedWriterRound } =
  proxyActivities<WriterSceneDistributedExecutionActivities>({
    taskQueue: storytellerExecuteTaskQueue,
    startToCloseTimeout: '3 minutes',
    // A retry must not re-invoke a possibly-sent provider/fake transport round.
    retry: { maximumAttempts: 1 },
  });

function holdWriterSceneRound(message: string): never {
  throw ApplicationFailure.nonRetryable(message, 'WriterSceneHeld');
}

function uncertainWriterSceneRound(message: string): never {
  throw ApplicationFailure.nonRetryable(message, 'WriterSceneUncertain');
}

function requirePublishedOrReplayed(
  state: WriterSceneRoundMissionState | WriterSceneRoundFinalizeResult,
): void {
  if (state.status === 'published' || state.status === 'replayed') {
    return;
  }
  if (state.status === 'held') {
    holdWriterSceneRound(state.reason ?? 'writer-scene-round-held');
  }
  uncertainWriterSceneRound(state.reason ?? 'writer-scene-round-uncertain');
}

/** Distributed writer scene: control plans/finalizes; executor runs one WR10 round. */
export async function writerSceneDistributedV2(missionId: string): Promise<void> {
  const plan = await planWriterSceneRound(missionId);
  const attemptId = uuid4();
  const executorResult = await executePreparedWriterRound({
    missionId: plan.missionId,
    contextId: plan.contextId,
    ordinal: plan.ordinal,
    expectedRevision: plan.expectedRevision,
    attemptId,
  });

  if (executorResult.status === 'replayed') {
    const missionState = await readWriterSceneRoundMissionState(missionId);
    requirePublishedOrReplayed(missionState);
    return;
  }

  if (executorResult.status === 'held') {
    holdWriterSceneRound(executorResult.reason ?? 'writer-scene-executor-held');
  }

  if (executorResult.status === 'uncertain') {
    uncertainWriterSceneRound(
      executorResult.reason ?? 'writer-scene-executor-uncertain',
    );
  }

  if (executorResult.status === 'failed') {
    throw ApplicationFailure.nonRetryable(
      executorResult.reason ?? 'writer-scene-executor-failed',
      'WriterSceneExecutorFailed',
    );
  }

  const finalized = await finalizeWriterSceneRound(missionId);
  requirePublishedOrReplayed(finalized);
}

type WriterResearchActivities = import('./contracts').WriterResearchActivities;

const { runScriptedWriterResearchChild, runWriterResearchParentJoin } =
  proxyActivities<WriterResearchActivities>({
    startToCloseTimeout: '3 minutes',
    retry: { maximumAttempts: 1 },
  });

/** One bounded read-only research child; no live provider dispatch. */
export async function writerResearchV1(childId: string): Promise<void> {
  await runScriptedWriterResearchChild(childId);
}

/** Join completed research children and resume the parent writer mission. */
export async function writerResearchJoinV1(
  joinOperationId: string,
): Promise<void> {
  await runWriterResearchParentJoin(joinOperationId);
}

const distributedExecuteRetry = {
  initialInterval: '2 seconds',
  maximumInterval: '30 seconds',
  maximumAttempts: 5,
} as const;

const { executeFrozenStoryteller } =
  proxyActivities<StorytellerDistributedExecutionActivities>({
    taskQueue: storytellerExecuteTaskQueue,
    startToCloseTimeout: '3 minutes',
    retry: distributedExecuteRetry,
  });

const { publishSavedStoryteller } =
  proxyActivities<StorytellerDistributedControlActivities>({
    taskQueue: storytellerControlTaskQueue,
    startToCloseTimeout: '3 minutes',
    retry: distributedExecuteRetry,
  });

// Two-stage scripted path: executor proposes, control publishes. No provider dispatch here.
export async function storytellerDistributedV1(
  generationId: string,
): Promise<void> {
  await executeFrozenStoryteller(generationId);
  await publishSavedStoryteller(generationId);
}

const { advanceCampaignActivity } = proxyActivities<CampaignActivities>({
  startToCloseTimeout: '30 seconds',
  retry: { initialInterval: '1 second', maximumInterval: '30 seconds' },
});
const { advanceCampaignAction } = proxyActivities<CampaignActivities>({
  startToCloseTimeout: '30 seconds',
  retry: { initialInterval: '1 second', maximumInterval: '30 seconds' },
});
const { prepareCampaignConsequence } = proxyActivities<CampaignActivities>({
  startToCloseTimeout: '30 seconds',
  retry: { initialInterval: '1 second', maximumInterval: '30 seconds' },
});
export async function campaignActivityV1(id: string): Promise<void> {
  while (true) {
    const remaining = await advanceCampaignActivity(id);
    if (remaining === null) return;
    await sleep(Math.max(1, remaining));
  }
}
export async function campaignActionV1(id: string): Promise<void> {
  while (true) {
    const remaining = await advanceCampaignAction(id);
    if (remaining === null) return;
    await sleep(Math.max(1, remaining));
  }
}

// This retry can only prepare narration from saved receipts; it cannot reroll.
export async function campaignConsequenceV1(id: string): Promise<void> {
  await prepareCampaignConsequence(id);
}
