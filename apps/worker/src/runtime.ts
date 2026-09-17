import {
  Client,
  Connection,
  WorkflowExecutionAlreadyStartedError,
} from '@temporalio/client';
import { Worker, NativeConnection } from '@temporalio/worker';
import type { Database } from '@offscreen/db';
import { createOutbox } from '@offscreen/server/outbox';
import {
  createScriptedOpenings,
  scriptedOpeningTopic,
} from '@offscreen/server/scripted-openings';
import { GenerationError } from '@offscreen/server/generations';
import {
  createStories,
  StoryError,
  storyIntervalTopic,
} from '@offscreen/server/stories';
import { ApplicationFailure } from '@temporalio/client';
import {
  openingWorkflowId,
  openingWorkflowType,
  intervalWorkflowType,
  intervalWorkflowId,
} from '@offscreen/workflows/contracts';
import type {
  OpeningActivities,
  IntervalActivities,
} from '@offscreen/workflows/contracts';
import type { WorkerConfig } from './config';
import { relayOne, runRelay } from './relay';

/** Explicit lifecycle: importing this module never connects or starts processing. */
export async function startRuntime(
  database: Database,
  config: WorkerConfig,
  report: () => void,
) {
  const connection = await Connection.connect({ address: config.address });
  let native: NativeConnection | undefined;
  try {
    native = await NativeConnection.connect({ address: config.address });
    const client = new Client({ connection, namespace: config.namespace });
    const openings = createScriptedOpenings(database);
    const stories = createStories(database);
    const activities: OpeningActivities & IntervalActivities = {
      async advanceStoryInterval(id) {
        try {
          return await stories.advanceInterval(id);
        } catch (error) {
          if (error instanceof StoryError)
            throw ApplicationFailure.nonRetryable(
              error.code,
              'IntervalStateError',
            );
          throw ApplicationFailure.retryable(
            'Story storage unavailable',
            'StorageUnavailable',
          );
        }
      },
      async completeScriptedOpening(id) {
        try {
          await openings.complete(id);
        } catch (error) {
          if (error instanceof GenerationError)
            throw ApplicationFailure.nonRetryable(
              error.code,
              'OpeningStateError',
            );
          // Avoid putting driver errors, SQL or request content in workflow history.
          throw ApplicationFailure.retryable(
            'Opening storage unavailable',
            'StorageUnavailable',
          );
        }
      },
    };
    const worker = await Worker.create({
      connection: native,
      namespace: config.namespace,
      taskQueue: config.taskQueue,
      workflowsPath: require.resolve('@offscreen/workflows'),
      activities,
      shutdownGraceTime: '10 seconds',
      maxConcurrentActivityTaskExecutions: 4,
    });
    const outbox = createOutbox(database);
    const controller = new AbortController();
    const work = worker.run();
    const relay = runRelay(
      () =>
        relayOne(
          outbox,
          [scriptedOpeningTopic, storyIntervalTopic],
          async (notice) => {
            try {
              await connection.withDeadline(Date.now() + 10000, () =>
                client.workflow.start(
                  notice.topic === storyIntervalTopic
                    ? intervalWorkflowType
                    : openingWorkflowType,
                  {
                    workflowId:
                      notice.topic === storyIntervalTopic
                        ? intervalWorkflowId(notice.operationId)
                        : openingWorkflowId(notice.operationId),
                    taskQueue: config.taskQueue,
                    workflowIdReusePolicy: 'REJECT_DUPLICATE',
                    args: [notice.operationId],
                  },
                ),
              );
            } catch (error) {
              if (!(error instanceof WorkflowExecutionAlreadyStartedError))
                throw error;
            }
          },
        ),
      controller.signal,
      report,
    );
    // Attach the rejection handler immediately; main also observes completion.
    const done = work.finally(() => controller.abort());
    void done.catch(() => {});
    let stopping: Promise<void> | undefined;
    return {
      done,
      stop() {
        return (stopping ??= (async () => {
          controller.abort();
          await relay;
          if (worker.getState() === 'RUNNING') worker.shutdown();
          await work.finally(async () => {
            await native!.close();
            await connection.close();
          });
        })());
      },
    };
  } catch (error) {
    await native?.close();
    await connection.close();
    throw error;
  }
}
