import {
  NativeConnection,
  Worker,
} from '@temporalio/worker';
import { storytellerControlTaskQueue } from '@offscreen/workflows/contracts';
import { createStorytellerPublicationClient } from '../custody/storyteller-publication-client';
import { createStorytellerDistributedControlActivities } from '../activities/storyteller-distributed-control';
import { closeWorkerConnections } from './connections';
import type { ControlWorkerConfig } from '../bootstrap/config';

/** Registers only the distributed publish activity on the control queue. */
export async function startControlRuntime(config: ControlWorkerConfig) {
  const publication = createStorytellerPublicationClient(config.publication);
  const native = await NativeConnection.connect({ address: config.address });
  try {
    const activities = createStorytellerDistributedControlActivities(publication);
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