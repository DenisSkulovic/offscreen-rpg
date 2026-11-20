import type { Database } from '@offscreen/db';
import type { StorytellerRuntimeOptions } from '@offscreen/application/storyteller';
import { startRuntime } from './index';
import { startControlRuntime } from './control';
import { startExecutionRuntime } from './execution';
import {
  readExecutionWorkerConfig,
  type WorkerConfig,
  type ControlWorkerConfig,
} from '../bootstrap/config';

export type StorytellerDistributedLiveStack = {
  relay: Awaited<ReturnType<typeof startRuntime>>;
  control: Awaited<ReturnType<typeof startControlRuntime>>;
  executor: Awaited<ReturnType<typeof startExecutionRuntime>>;
  stop(): Promise<void>;
};

/** STORY03 live harness: relay + control workflows/publish + executor activities only. */
export async function startStorytellerDistributedLiveStack(
  database: Database,
  config: {
    relay: WorkerConfig;
    temporal: ControlWorkerConfig;
    executorEnv: Record<string, string | undefined>;
    storytellerOptions?: StorytellerRuntimeOptions;
  },
  report: (error: unknown) => void,
): Promise<StorytellerDistributedLiveStack> {
  const relay = await startRuntime(
    database,
    config.relay,
    report,
    config.storytellerOptions,
  );
  const control = await startControlRuntime(database, config.temporal, {
    ...(config.storytellerOptions?.documentStore
      ? { documentStore: config.storytellerOptions.documentStore }
      : {}),
  });
  const executor = await startExecutionRuntime(
    readExecutionWorkerConfig(config.executorEnv),
  );
  return {
    relay,
    control,
    executor,
    async stop() {
      await relay.stop();
      await executor.stop();
      await control.stop();
    },
  };
}