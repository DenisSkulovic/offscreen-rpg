import { NativeConnection, Worker } from '@temporalio/worker';
import {
  storytellerExecuteTaskQueue,
} from '@offscreen/workflows/contracts';
import { createStorytellerDistributedExecutionActivities } from '../activities/storyteller-distributed-execution';
import { createStorytellerTaskCustodyClient } from '../custody/storyteller-task-custody-client';
import { closeWorkerConnections, createCloseOnce } from './connections';
import type { ExecutionWorkerConfig } from '../bootstrap/config';

const startupFailureMessage = 'Execution runtime startup failed';
const stopFailureMessage = 'Execution runtime stop failed';

type ExecutionWorkerHandle = {
  run(): Promise<void>;
  getState(): string;
  shutdown(): void;
};

type WorkerCreateOptions = Parameters<typeof Worker.create>[0];

/** Test-only injected seams; production callers use the single-argument form. */
export type ExecutionRuntimeTestDeps = {
  connectNative?: (address: string) => Promise<{ close(): Promise<void> }>;
  createWorker?: (
    options: Parameters<typeof Worker.create>[0],
  ) => Promise<ExecutionWorkerHandle>;
};

async function throwStartupWithCleanup(
  error: unknown,
  closeOnce: () => Promise<void>,
): Promise<never> {
  let closeFailure: unknown;
  try {
    await closeOnce();
  } catch (cleanupError) {
    closeFailure = cleanupError;
  }
  if (closeFailure !== undefined) {
    throw new AggregateError([error, closeFailure], startupFailureMessage);
  }
  throw error;
}

/** Activity-only worker for distributed Storyteller execution; no workflows or SQL. */
export async function startExecutionRuntime(
  config: ExecutionWorkerConfig,
  testDeps?: ExecutionRuntimeTestDeps,
) {
  const connectNative =
    testDeps?.connectNative ??
    ((address: string) => NativeConnection.connect({ address }));
  const createWorker =
    testDeps?.createWorker ??
    ((options) => Worker.create(options) as Promise<ExecutionWorkerHandle>);

  const native = await connectNative(config.address);
  const closeOnce = createCloseOnce(() => closeWorkerConnections({ native }));

  let worker: ExecutionWorkerHandle;
  let work: Promise<void>;

  try {
    const custody = createStorytellerTaskCustodyClient(config.custody);
    const activities = createStorytellerDistributedExecutionActivities(custody);
    worker = await createWorker({
      connection: native as NonNullable<WorkerCreateOptions['connection']>,
      namespace: config.namespace,
      taskQueue: storytellerExecuteTaskQueue,
      activities,
      shutdownGraceTime: '10 seconds',
      maxConcurrentActivityTaskExecutions: 2,
    });
    work = worker.run();
  } catch (error) {
    return throwStartupWithCleanup(error, closeOnce);
  }

  let stopping: Promise<void> | undefined;
  const stop = () =>
    (stopping ??= (async () => {
      if (worker.getState() === 'RUNNING') {
        worker.shutdown();
      }
      let workFailure: unknown;
      let closeFailure: unknown;
      try {
        await work;
      } catch (error) {
        workFailure = error;
      } finally {
        try {
          await closeOnce();
        } catch (error) {
          closeFailure = error;
        }
      }
      if (workFailure !== undefined && closeFailure !== undefined) {
        throw new AggregateError([workFailure, closeFailure], stopFailureMessage);
      }
      if (closeFailure !== undefined) {
        throw closeFailure;
      }
      if (workFailure !== undefined) {
        throw workFailure;
      }
    })());

  return {
    done: work,
    stop,
  };
}