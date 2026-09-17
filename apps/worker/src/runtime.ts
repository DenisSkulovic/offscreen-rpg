import { Client, Connection } from '@temporalio/client';
import { NativeConnection, Worker } from '@temporalio/worker';
import type { Database } from '@offscreen/db';
import { createOutbox } from '@offscreen/server/outbox';
import { createScriptedOpenings } from '@offscreen/server/scripted-openings';
import { createStories } from '@offscreen/server/stories';
import { createWorkerActivities } from './activities';
import type { WorkerConfig } from './config';
import { deliverOutboxNotice, dispatchedNoticeTopics } from './dispatch';
import { relayOne, runRelay } from './relay';

async function closeWorkerConnections(args: {
  native: NativeConnection | undefined;
  connection: Connection;
}) {
  if (args.native) {
    await args.native.close();
  }
  await args.connection.close();
}

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
    const stories = createStories(database);
    const activities = createWorkerActivities({
      stories,
      openings: createScriptedOpenings(database),
    });
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
        relayOne(outbox, dispatchedNoticeTopics, async (notice) => {
          await deliverOutboxNotice(notice, {
            connection,
            client,
            taskQueue: config.taskQueue,
            intervalNeedsWake: (intervalId) =>
              stories.intervalNeedsWake(intervalId),
          });
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
          if (worker.getState() === 'RUNNING') {
            worker.shutdown();
          }
          await work.finally(async () => {
            await closeWorkerConnections({ native, connection });
          });
        })());
      },
    };
  } catch (error) {
    await closeWorkerConnections({ native, connection });
    throw error;
  }
}
