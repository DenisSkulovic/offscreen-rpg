import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { storytellerExecuteTaskQueue } from '@offscreen/workflows/contracts';
import { prepareWriterRoundTransport } from '@offscreen/storyteller/providers/writer-round-transport';
import {
  OFFSCREEN_WRITER_EXECUTION_MODE_ENV,
  readExecutionWorkerConfig,
  WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB,
  type ExecutionWorkerConfig,
} from '../src/bootstrap/config';
import { prepareScriptedOfflineLabWriterRoundTransport } from '../src/custody/scripted-offline-lab-writer-round-transport';
import { startExecutionRuntime } from '../src/runtime/execution';

const baseEnv = {
  TEMPORAL_ADDRESS: '127.0.0.1:7233',
  GAME_AUTHORITY_ORIGIN: 'http://127.0.0.1:9911',
  GAME_AUTHORITY_EXECUTOR_TOKEN: '0123456789abcdef',
};

function labExecutionConfig(): ExecutionWorkerConfig {
  return readExecutionWorkerConfig({
    ...baseEnv,
    [OFFSCREEN_WRITER_EXECUTION_MODE_ENV]: WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB,
  });
}

test('default execution config keeps network provider transport', () => {
  const config = readExecutionWorkerConfig(baseEnv);
  assert.equal(config.writerRound.mode, 'provider-default');
  assert.equal(config.writerRound.prepareTransport, prepareWriterRoundTransport);
});

test('scripted lab execution config selects deterministic transport', () => {
  const config = labExecutionConfig();
  assert.equal(config.writerRound.mode, WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB);
  assert.equal(
    config.writerRound.prepareTransport,
    prepareScriptedOfflineLabWriterRoundTransport,
  );
  assert.equal(config.writerRound.apiKey, undefined);
});

test('invalid lab mode refuses startup', () => {
  assert.throws(
    () =>
      readExecutionWorkerConfig({
        ...baseEnv,
        [OFFSCREEN_WRITER_EXECUTION_MODE_ENV]: 'bogus-mode',
      }),
    /unsupported OFFSCREEN_WRITER_EXECUTION_MODE/,
  );
});

test('mixed lab mode and provider key refuses startup', () => {
  assert.throws(
    () =>
      readExecutionWorkerConfig({
        ...baseEnv,
        [OFFSCREEN_WRITER_EXECUTION_MODE_ENV]: WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB,
        OPENROUTER_API_KEY: 'sk-or-should-not-mix',
      }),
    /cannot be combined with OPENROUTER_API_KEY/,
  );
});

test('scripted lab execution runtime mounts WR10 activities', async () => {
  let mountedActivities: Record<string, unknown> | undefined;
  const runtime = await startExecutionRuntime(labExecutionConfig(), {
    connectNative: async () => ({
      async close() {},
    }),
    createWorker: async (options) => {
      mountedActivities = options.activities as Record<string, unknown>;
      let settleRun!: () => void;
      const work = new Promise<void>((resolve) => {
        settleRun = resolve;
      });
      return {
        getState: () => 'RUNNING',
        shutdown: () => settleRun(),
        run: () => work,
      };
    },
  });
  assert.ok(mountedActivities);
  assert.equal(typeof mountedActivities!.executeFrozenStoryteller, 'function');
  assert.equal(typeof mountedActivities!.executePreparedWriterRound, 'function');
  const executionSource = readFileSync(
    join(__dirname, '../../src/runtime/execution.ts'),
    'utf8',
  );
  assert.match(executionSource, /createWriterRoundProviderExecutionActivities/);
  await runtime.stop();
});

test('scripted lab runtime createWorker targets storyteller execute queue', async () => {
  let taskQueue: string | undefined;
  const runtime = await startExecutionRuntime(labExecutionConfig(), {
    connectNative: async () => ({
      async close() {},
    }),
    createWorker: async (options) => {
      taskQueue = options.taskQueue;
      let settleRun!: () => void;
      const work = new Promise<void>((resolve) => {
        settleRun = resolve;
      });
      return {
        getState: () => 'RUNNING',
        shutdown: () => settleRun(),
        run: () => work,
      };
    },
  });
  assert.equal(taskQueue, storytellerExecuteTaskQueue);
  await runtime.stop();
});