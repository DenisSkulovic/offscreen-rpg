import type { Database } from '@offscreen/db';
import {
  NativeConnection,
  Worker,
} from '@temporalio/worker';
import { storytellerControlTaskQueue } from '@offscreen/workflows/contracts';
import type { DocumentStore } from '@offscreen/documents';
import { createStorytellerDistributedControlActivities } from '../activities/storyteller-distributed-control';
import { closeWorkerConnections } from './connections';
import type { ControlWorkerConfig } from '../bootstrap/config';

/** Registers only the distributed publish activity on the control queue. */
export async function startControlRuntime(
  database: Database,
  config: ControlWorkerConfig,
  storytellerOptions: {
    documentStore?: DocumentStore;
    realDurationMs?: () => number;
  } = {},
) {
  const native = await NativeConnection.connect({ address: config.address });
  try {
    const activities = createStorytellerDistributedControlActivities({
      database,
      ...(storytellerOptions.documentStore
        ? { documentStore: storytellerOptions.documentStore }
        : {}),
      ...(storytellerOptions.realDurationMs
        ? { realDurationMs: storytellerOptions.realDurationMs }
        : {}),
    });
    const worker = await Worker.create({
      connection: native,
      namespace: config.namespace,
      taskQueue: storytellerControlTaskQueue,
      workflowsPath: require.resolve('@offscreen/workflows'),
      activities,
      shutdownGraceTime: '10 seconds',
      maxConcurrentActivityTaskExecutions: 2,
    });
    const work = worker.run();
    let stopping: Promise<void> | undefined;
    return {
      done: work,
      stop() {
        return (stopping ??= (async () => {
          if (worker.getState() === 'RUNNING') {
            worker.shutdown();
          }
          await work.finally(async () => {
            await closeWorkerConnections({ native });
          });
        })());
      },
    };
  } catch (error) {
    await closeWorkerConnections({ native });
    throw error;
  }
}