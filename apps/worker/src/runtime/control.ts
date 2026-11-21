import {
  NativeConnection,
  Worker,
} from '@temporalio/worker';
import { storytellerControlTaskQueue } from '@offscreen/workflows/contracts';
import { createStorytellerPublicationClient } from '../custody/storyteller-publication-client';
import { createStorytellerDistributedControlActivities } from '../activities/storyteller-distributed-control';
import { closeWorkerConnections, createCloseOnce } from './connections';
import type { ControlWorkerConfig } from '../bootstrap/config';

const startupFailureMessage = 'Control runtime startup failed';
const stopFailureMessage = 'Control runtime stop failed';

type ControlWorkerHandle = {
  run(): Promise<void>;
  getState(): string;
  shutdown(): void;
};

type WorkerCreateOptions = Parameters<typeof Worker.create>[0];

/** Test-only injected seams; production callers use the single-argument form. */
export type ControlRuntimeTestDeps = {
  connectNative?: (address: string) => Promise<{ close(): Promise<void> }>;
  createWorker?: (
    options: Parameters<typeof Worker.create>[0],
  ) => Promise<ControlWorkerHandle>;
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

/** Registers only the distributed publish activity on the control queue. */
export async function startControlRuntime(
  config: ControlWorkerConfig,
  testDeps?: ControlRuntimeTestDeps,
) {
  const connectNative =
    testDeps?.connectNative ??
    ((address: string) => NativeConnection.connect({ address }));
  const createWorker =
    testDeps?.createWorker ??
    ((options) => Worker.create(options) as Promise<ControlWorkerHandle>);

  const native = await connectNative(config.address);
  const closeOnce = createCloseOnce(() => closeWorkerConnections({ native }));

  let worker: ControlWorkerHandle;
  let work: Promise<void>;

  try {
    const publication = createStorytellerPublicationClient(config.publication);
    const activities = createStorytellerDistributedControlActivities(publication);
    worker = await createWorker({
      connection: native as NonNullable<WorkerCreateOptions['connection']>,
      namespace: config.namespace,
      taskQueue: storytellerControlTaskQueue,
      workflowsPath: require.resolve('@offscreen/workflows'),
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