import { storytellerTopic } from '@offscreen/application/storyteller';
import {
  storytellerWorkflowType,
  storytellerWorkflowId,
  campaignActivityWorkflowType,
  campaignActivityWorkflowId,
} from '@offscreen/workflows/contracts';
import type { Client, Connection } from '@temporalio/client';
import { WorkflowExecutionAlreadyStartedError } from '@temporalio/client';
import {
  controlledIntervalTopic,
  decisionDeadlineTopic,
  intervalWakeTopic,
} from '@offscreen/application/stories';
import { scriptedOpeningTopic } from '@offscreen/application/generations';
import { scriptedContinuationTopic } from '@offscreen/application/generations';
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
  'campaign.activity.v1': {
    kind: 'start', workflowType: campaignActivityWorkflowType, workflowId: campaignActivityWorkflowId,
  },
  [storytellerTopic]: {
    kind: 'start',
    workflowType: storytellerWorkflowType,
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
} as const satisfies Record<string, StartNotice | WakeNotice>;

export const dispatchedNoticeTopics = [
  'campaign.activity.v1',
  storytellerTopic,
  scriptedOpeningTopic,
  scriptedContinuationTopic,
  controlledIntervalTopic,
  intervalWakeTopic,
  decisionDeadlineTopic,
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

export async function deliverOutboxNotice(
  notice: DeliverNotice,
  deps: {
    connection: Connection;
    client: Client;
    taskQueue: string;
    intervalNeedsWake: (intervalId: string) => Promise<boolean>;
  },
) {
  const dispatch = selectNoticeDispatch(notice.topic);
  if (!dispatch) {
    return;
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
  try {
    await deps.connection.withDeadline(Date.now() + startDeadlineMs, () =>
      deps.client.workflow.start(dispatch.workflowType, {
        workflowId: dispatch.workflowId(notice.id ?? notice.operationId),
        taskQueue: deps.taskQueue,
        workflowIdReusePolicy: 'REJECT_DUPLICATE',
        args: [notice.operationId],
      }),
    );
  } catch (error) {
    if (!(error instanceof WorkflowExecutionAlreadyStartedError)) {
      throw error;
    }
  }
}
