import { NativeConnection, Worker } from '@temporalio/worker';
import {
  storytellerExecuteTaskQueue,
} from '@offscreen/workflows/contracts';
import { createStorytellerDistributedExecutionActivities } from '../activities/storyteller-distributed-execution';
import { createStorytellerTaskCustodyClient } from '../custody/storyteller-task-custody-client';
import { closeWorkerConnections } from './connections';
import type { ExecutionWorkerConfig } from '../bootstrap/config';

/** Activity-only worker for distributed Storyteller execution; no workflows or SQL. */
export async function startExecutionRuntime(config: ExecutionWorkerConfig) {
  const native = await NativeConnection.connect({ address: config.address });
  const custody = createStorytellerTaskCustodyClient(config.custody);
  const activities = createStorytellerDistributedExecutionActivities(custody);
  const worker = await Worker.create({
    connection: native,
    namespace: config.namespace,
    taskQueue: storytellerExecuteTaskQueue,
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
}