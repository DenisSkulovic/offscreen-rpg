import {
  createStorytellerRuntime,
  type StorytellerRuntimeOptions,
} from '@offscreen/application/storyteller';
import { Client, Connection } from '@temporalio/client';
import { NativeConnection, Worker } from '@temporalio/worker';
import type { Database } from '@offscreen/db';
import { createOutbox } from '@offscreen/application/outbox';
import { createScriptedOpenings } from '@offscreen/application/generations';
import { createScriptedContinuations } from '@offscreen/application/generations';
import { createStories } from '@offscreen/application/stories';
// Keep the directory entrypoint explicit. A removed legacy `activities.ts` can
// leave `dist/src/activities.js` behind and otherwise shadow `activities/index.js`
// in incremental/local builds, silently dropping newly registered activities.
import { createWorkerActivities } from '../activities/index';
import { closeWorkerConnections } from './connections';
import type { WorkerConfig } from '../bootstrap/config';
import {
  deliverOutboxNotice,
  dispatchedNoticeTopics,
} from '../outbox/dispatch';
import { relayOne, runRelay } from '../outbox/relay';

/** Explicit lifecycle: importing this module never connects or starts processing. */
export async function startRuntime(
  database: Database,
  config: WorkerConfig,
  report: (error: unknown) => void,
  storytellerOptions: StorytellerRuntimeOptions = {},
) {
  const connection = await Connection.connect({ address: config.address });
  let native: NativeConnection | undefined;
  try {
    native = await NativeConnection.connect({ address: config.address });
    const client = new Client({ connection, namespace: config.namespace });
    const stories = createStories(database, {
      ...(storytellerOptions.documentStore
        ? { documentStore: storytellerOptions.documentStore }
        : {}),
    });
    const activities = createWorkerActivities({
      stories,
      storyteller: createStorytellerRuntime(database, storytellerOptions),
      openings: createScriptedOpenings(database),
      continuations: createScriptedContinuations(database),
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
              stories.intervalNeedsWake({ intervalId }),
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
