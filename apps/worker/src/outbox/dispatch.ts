import {
  storytellerTopic,
  storytellerDistributedTopic,
  LAUNCH_WAKE_TOPIC,
  WRITER_SCENE_WAKE_TOPIC,
  WRITER_RESEARCH_WAKE_TOPIC,
  WRITER_RESEARCH_JOIN_WAKE_TOPIC,
} from '@offscreen/story-engine/storyteller';
import {
  storytellerWorkflowType,
  storytellerDistributedWorkflowType,
  storytellerControlTaskQueue,
  storytellerWorkflowId,
  campaignActivityWorkflowType,
  campaignActivityWorkflowId,
  campaignActionWorkflowType,
  campaignActionWorkflowId,
  campaignConsequenceWorkflowType,
  campaignConsequenceWorkflowId,
  campaignDelegatedDecisionWorkflowType,
  campaignDelegatedDecisionWorkflowId,
  storyLaunchWorkflowType,
  storyLaunchWorkflowId,
  writerSceneDistributedWorkflowType,
  writerSceneWorkflowId,
  writerResearchWorkflowType,
  writerResearchWorkflowId,
  writerResearchJoinWorkflowType,
  writerResearchJoinWorkflowId,
} from '@offscreen/workflows/contracts';
import type { Client, Connection } from '@temporalio/client';
import { WorkflowExecutionAlreadyStartedError } from '@temporalio/client';
import {
  campaignActionTopic,
  campaignConsequenceTopic,
  controlledIntervalTopic,
  decisionDeadlineTopic,
  DELEGATED_DECISION_NOTICE_TOPIC,
  intervalWakeTopic,
} from '@offscreen/story-engine/stories';
import { scriptedOpeningTopic } from '@offscreen/story-engine/generations';
import { scriptedContinuationTopic } from '@offscreen/story-engine/generations';
import {
  continuationWorkflowId,
  continuationWorkflowType,
  controlledIntervalWorkflowId,
  controlledIntervalWorkflowType,
  decisionWorkflowId,
  decisionWorkflowType,
  intervalChangedSignal,
  openingWorkflowId,
  openingWorkflowType,
} from '@offscreen/workflows/contracts';

const startDeadlineMs = 10000;

type StartNotice = {
  kind: 'start';
  workflowType: string;
  workflowId: (operationId: string) => string;
};

type WakeNotice = {
  kind: 'wake';
  workflowId: (operationId: string) => string;
};

const noticeDispatch = {
  [campaignActionTopic]: {
    kind: 'start',
    workflowType: campaignActionWorkflowType,
    workflowId: campaignActionWorkflowId,
  },
  'campaign.activity.v1': {
    kind: 'start',
    workflowType: campaignActivityWorkflowType,
    workflowId: campaignActivityWorkflowId,
  },
  [campaignConsequenceTopic]: {
    kind: 'start',
    workflowType: campaignConsequenceWorkflowType,
    workflowId: campaignConsequenceWorkflowId,
  },
  [DELEGATED_DECISION_NOTICE_TOPIC]: {
    kind: 'start',
    workflowType: campaignDelegatedDecisionWorkflowType,
    workflowId: campaignDelegatedDecisionWorkflowId,
  },
  [storytellerTopic]: {
    kind: 'start',
    workflowType: storytellerWorkflowType,
    workflowId: storytellerWorkflowId,
  },
  [storytellerDistributedTopic]: {
    kind: 'start',
    workflowType: storytellerDistributedWorkflowType,
    workflowId: storytellerWorkflowId,
  },
  [intervalWakeTopic]: {
    kind: 'wake',
    workflowId: controlledIntervalWorkflowId,
  },
  [decisionDeadlineTopic]: {
    kind: 'start',
    workflowType: decisionWorkflowType,
    workflowId: decisionWorkflowId,
  },
  [controlledIntervalTopic]: {
    kind: 'start',
    workflowType: controlledIntervalWorkflowType,
    workflowId: controlledIntervalWorkflowId,
  },
  [scriptedOpeningTopic]: {
    kind: 'start',
    workflowType: openingWorkflowType,
    workflowId: openingWorkflowId,
  },
  [scriptedContinuationTopic]: {
    kind: 'start',
    workflowType: continuationWorkflowType,
    workflowId: continuationWorkflowId,
  },
  [LAUNCH_WAKE_TOPIC]: {
    kind: 'start',
    workflowType: storyLaunchWorkflowType,
    workflowId: storyLaunchWorkflowId,
  },
  [WRITER_SCENE_WAKE_TOPIC]: {
    kind: 'start',
    workflowType: writerSceneDistributedWorkflowType,
    workflowId: writerSceneWorkflowId,
  },
  [WRITER_RESEARCH_WAKE_TOPIC]: {
    kind: 'start',
    workflowType: writerResearchWorkflowType,
    workflowId: writerResearchWorkflowId,
  },
  [WRITER_RESEARCH_JOIN_WAKE_TOPIC]: {
    kind: 'start',
    workflowType: writerResearchJoinWorkflowType,
    workflowId: writerResearchJoinWorkflowId,
  },
} as const satisfies Record<string, StartNotice | WakeNotice>;

export const dispatchedNoticeTopics = [
  campaignActionTopic,
  'campaign.activity.v1',
  campaignConsequenceTopic,
  DELEGATED_DECISION_NOTICE_TOPIC,
  storytellerTopic,
  storytellerDistributedTopic,
  scriptedOpeningTopic,
  scriptedContinuationTopic,
  controlledIntervalTopic,
  intervalWakeTopic,
  decisionDeadlineTopic,
  LAUNCH_WAKE_TOPIC,
  WRITER_SCENE_WAKE_TOPIC,
  WRITER_RESEARCH_WAKE_TOPIC,
  WRITER_RESEARCH_JOIN_WAKE_TOPIC,
] as const;

export function selectNoticeDispatch(topic: string) {
  if (!Object.hasOwn(noticeDispatch, topic)) {
    return undefined;
  }
  return noticeDispatch[topic as keyof typeof noticeDispatch];
}

type DeliverNotice = {
  id?: string;
  topic: string;
  operationId: string;
};

/** Stable generation workflow identity; distributed recovery must not fork by notice id. */
export function storytellerNoticeWorkflowId(notice: DeliverNotice): string {
  if (notice.topic === storytellerDistributedTopic) {
    return storytellerWorkflowId(notice.operationId);
  }
  if (notice.topic === storytellerTopic) {
    return storytellerWorkflowId(notice.id ?? notice.operationId);
  }
  throw new Error(`Unexpected storyteller notice topic: ${notice.topic}`);
}

function resolveStartWorkflowId(
  notice: DeliverNotice,
  dispatch: StartNotice,
): string {
  if (
    notice.topic === storytellerTopic ||
    notice.topic === storytellerDistributedTopic
  ) {
    return storytellerNoticeWorkflowId(notice);
  }
  return dispatch.workflowId(notice.id ?? notice.operationId);
}

function resolveWorkflowTaskQueue(
  notice: DeliverNotice,
  relayTaskQueue: string,
): string {
  if (notice.topic === storytellerDistributedTopic) {
    return storytellerControlTaskQueue;
  }
  if (notice.topic === WRITER_SCENE_WAKE_TOPIC) {
    return storytellerControlTaskQueue;
  }
  return relayTaskQueue;
}

/** Failed storyteller runs must be restartable from a settlement follow-up notice. */
function resolveWorkflowIdReusePolicy(
  topic: string,
): 'ALLOW_DUPLICATE_FAILED_ONLY' | 'REJECT_DUPLICATE' {
  if (topic === storytellerTopic || topic === storytellerDistributedTopic) {
    return 'ALLOW_DUPLICATE_FAILED_ONLY';
  }
  return 'REJECT_DUPLICATE';
}

export async function deliverOutboxNotice(
  notice: DeliverNotice,
  deps: {
    connection: Connection;
    client: Client;
    taskQueue: string;
    intervalNeedsWake: (intervalId: string) => Promise<boolean>;
    generationExists?: (operationId: string) => Promise<boolean>;
  },
) {
  const dispatch = selectNoticeDispatch(notice.topic);
  if (!dispatch) {
    throw new Error(`Outbox topic is not dispatchable: ${notice.topic}`);
  }
  if (dispatch.kind === 'wake') {
    if (await deps.intervalNeedsWake(notice.operationId)) {
      await deps.connection.withDeadline(Date.now() + startDeadlineMs, () =>
        deps.client.workflow
          .getHandle(dispatch.workflowId(notice.operationId))
          .signal(intervalChangedSignal),
      );
    }
    return;
  }
  // Optional test-only guard: production relay must not pass generationExists —
  // a false negative here makes deliverOutboxNotice return cleanly and relayOne
  // ACKs the notice, permanently dropping Gary's storyteller wake.
  if (
    (notice.topic === storytellerTopic ||
      notice.topic === storytellerDistributedTopic) &&
    deps.generationExists &&
    !(await deps.generationExists(notice.operationId))
  ) {
    return;
  }
  try {
    await deps.connection.withDeadline(Date.now() + startDeadlineMs, () =>
      deps.client.workflow.start(dispatch.workflowType, {
        workflowId: resolveStartWorkflowId(notice, dispatch),
        taskQueue: resolveWorkflowTaskQueue(notice, deps.taskQueue),
        workflowIdReusePolicy: resolveWorkflowIdReusePolicy(notice.topic),
        args: [notice.operationId],
      }),
    );
  } catch (error) {
    if (!(error instanceof WorkflowExecutionAlreadyStartedError)) {
      throw error;
    }
  }
}
