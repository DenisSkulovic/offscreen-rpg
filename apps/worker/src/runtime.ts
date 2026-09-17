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
import { ApplicationFailure } from '@temporalio/client';
import {
  openingWorkflowId,
  openingWorkflowType,
} from '@offscreen/workflows/contracts';
import type { OpeningActivities } from '@offscreen/workflows/contracts';
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
    const activities: OpeningActivities = {
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
        relayOne(outbox, [scriptedOpeningTopic], async (notice) => {
          try {
            await connection.withDeadline(Date.now() + 10000, () =>
              client.workflow.start(openingWorkflowType, {
                workflowId: openingWorkflowId(notice.operationId),
                taskQueue: config.taskQueue,
                workflowIdReusePolicy: 'REJECT_DUPLICATE',
                args: [notice.operationId],
              }),
            );
          } catch (error) {
            if (!(error instanceof WorkflowExecutionAlreadyStartedError))
              throw error;
          }
        }),
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
