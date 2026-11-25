import {
  createGenerationDispatchAuthorityReader,
  createStorytellerRuntime,
  type StorytellerRuntimeOptions,
} from '@offscreen/story-engine/storyteller';
import { Client, Connection } from '@temporalio/client';
import { NativeConnection, Worker } from '@temporalio/worker';
import type { Database } from '@offscreen/db';
import { createOutbox } from '@offscreen/outbox/relay';
import { createScriptedOpenings } from '@offscreen/story-engine/generations';
import { createScriptedContinuations } from '@offscreen/story-engine/generations';
import { createStories } from '@offscreen/story-engine/stories';
// Keep the directory entrypoint explicit. A removed legacy `activities.ts` can
// leave `dist/src/activities.js` behind and otherwise shadow `activities/index.js`
// in incremental/local builds, silently dropping newly registered activities.
import { createWorkerActivities } from '../activities/index';
import { closeWorkerConnections } from './connections';
import {
  WRITER_CONTINUATION_ADMISSION_SCRIPTED,
  type WorkerConfig,
} from '../bootstrap/config';
import {
  deliverOutboxNotice,
  dispatchedNoticeTopics,
} from '../outbox/dispatch';
import { relayOne, runRelay } from '../outbox/relay';

/**
 * Legacy all-in-one worker: workflow tasks and engine SQL activities on
 * `offscreen-local` only. Distributed Storyteller execution and GA publish
 * activities live on dedicated workers (`startExecutionRuntime`,
 * `startControlRuntime`) so this process never polls `storyteller-execute-v1`.
 */
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
      writerContinuationAdmission:
        config.writerContinuationAdmission ??
        WRITER_CONTINUATION_ADMISSION_SCRIPTED,
    });
    const resolvedStorytellerOptions: StorytellerRuntimeOptions =
      storytellerOptions.dispatchAuthority || !storytellerOptions.provider
        ? storytellerOptions
        : {
            ...storytellerOptions,
            dispatchAuthority:
              createGenerationDispatchAuthorityReader(database),
          };
    const activities = createWorkerActivities({
      database,
      ...(storytellerOptions.documentStore
        ? { documentStore: storytellerOptions.documentStore }
        : {}),
      stories,
      storyteller: createStorytellerRuntime(database, resolvedStorytellerOptions),
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
      // Node 24.19 rejects the worker-thread patch-activation buffer
      // (`RangeError: Invalid atomic access index`). The dev watcher runs
      // workflow tasks on the main thread so the relay can start. Production
      // does not set this variable.
      ...(process.env.OFFSCREEN_DEV_WATCHED_COMPILATION === '1' ? { debugMode: true } : {}),
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
