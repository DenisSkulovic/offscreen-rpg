import type { Database } from '@offscreen/db';
import type { StorytellerRuntimeOptions } from '@offscreen/story-engine/storyteller';
import { startRuntime } from './index';
import { startControlRuntime } from './control';
import { startExecutionRuntime } from './execution';
import {
  readControlWorkerConfig,
  readExecutionWorkerConfig,
  type WorkerConfig,
} from '../bootstrap/config';

export type StorytellerDistributedLiveStack = {
  relay: Awaited<ReturnType<typeof startRuntime>>;
  control: Awaited<ReturnType<typeof startControlRuntime>>;
  executor: Awaited<ReturnType<typeof startExecutionRuntime>>;
  stop(): Promise<void>;
};

type StoppableRuntime = {
  stop(): Promise<void>;
};

/** Test-only start adapters; production callers omit this argument. */
export type StorytellerDistributedLiveStartAdapters = {
  startRelay: typeof startRuntime;
  startControl: typeof startControlRuntime;
  startExecutor: typeof startExecutionRuntime;
};

const stackStopFailureMessage = 'Distributed live stack stop failed';
const stackStartupFailureMessage = 'Distributed live stack startup failed';

async function stopRolesReverseSequential(
  roles: StoppableRuntime[],
): Promise<void> {
  const failures: unknown[] = [];
  for (const role of [...roles].reverse()) {
    try {
      await role.stop();
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length === 0) {
    return;
  }
  if (failures.length === 1) {
    throw failures[0];
  }
  throw new AggregateError(failures, stackStopFailureMessage);
}

/** STORY03 live harness: relay + control workflows/publish + executor activities only. */
export async function startStorytellerDistributedLiveStack(
  database: Database,
  config: {
    relay: WorkerConfig;
    controlEnv: Record<string, string | undefined>;
    executorEnv: Record<string, string | undefined>;
    storytellerOptions?: StorytellerRuntimeOptions;
  },
  report: (error: unknown) => void,
  startAdapters?: Partial<StorytellerDistributedLiveStartAdapters>,
): Promise<StorytellerDistributedLiveStack> {
  const adapters: StorytellerDistributedLiveStartAdapters = {
    startRelay: startAdapters?.startRelay ?? startRuntime,
    startControl: startAdapters?.startControl ?? startControlRuntime,
    startExecutor: startAdapters?.startExecutor ?? startExecutionRuntime,
  };

  const started: StoppableRuntime[] = [];

  try {
    const relay = await adapters.startRelay(
      database,
      config.relay,
      report,
      config.storytellerOptions,
    );
    started.push(relay);

    const control = await adapters.startControl(
      readControlWorkerConfig(config.controlEnv),
    );
    started.push(control);

    const executor = await adapters.startExecutor(
      readExecutionWorkerConfig(config.executorEnv),
    );
    started.push(executor);

    let stopping: Promise<void> | undefined;
    return {
      relay,
      control,
      executor,
      stop() {
        return (stopping ??= stopRolesReverseSequential(started));
      },
    };
  } catch (startupError) {
    const cleanupFailures: unknown[] = [];
    for (const role of [...started].reverse()) {
      try {
        await role.stop();
      } catch (error) {
        cleanupFailures.push(error);
      }
    }
    if (cleanupFailures.length === 0) {
      throw startupError;
    }
    throw new AggregateError(
      [startupError, ...cleanupFailures],
      stackStartupFailureMessage,
      { cause: startupError },
    );
  }
}