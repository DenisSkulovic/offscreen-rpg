import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  storytellerControlTaskQueue,
  storytellerExecuteTaskQueue,
} from '@offscreen/workflows/contracts';
import type { Database } from '@offscreen/db';
import type { ControlWorkerConfig, ExecutionWorkerConfig } from '../src/bootstrap/config';
import { startControlRuntime } from '../src/runtime/control';
import { startExecutionRuntime } from '../src/runtime/execution';
import { startStorytellerDistributedLiveStack } from '../src/runtime/storyteller-distributed-live';

const executionRuntimeSource = readFileSync(
  join(__dirname, '../../src/runtime/execution.ts'),
  'utf8',
);
const controlRuntimeSource = readFileSync(
  join(__dirname, '../../src/runtime/control.ts'),
  'utf8',
);

function executionConfig(): ExecutionWorkerConfig {
  return {
    address: 'test:7233',
    namespace: 'default',
    custody: {
      origin: 'http://127.0.0.1:9911',
      executorToken: '0123456789abcdef',
      timeoutMs: 1_000,
    },
  };
}

function trackNativeClose() {
  let closeCount = 0;
  const native = {
    async close() {
      closeCount += 1;
    },
  };
  return { native, closeCount: () => closeCount };
}

test('execution runtime source keeps workflows and database out of scope', () => {
  assert.doesNotMatch(executionRuntimeSource, /workflowsPath/);
  assert.doesNotMatch(executionRuntimeSource, /createDatabase/);
  assert.doesNotMatch(executionRuntimeSource, /DATABASE_URL/);
});

test('successful execution stop closes the native connection once', async () => {
  const tracked = trackNativeClose();
  let shutdownCalls = 0;
  const runtime = await startExecutionRuntime(executionConfig(), {
    connectNative: async () => tracked.native,
    createWorker: async (options) => {
      assert.equal(options.taskQueue, storytellerExecuteTaskQueue);
      assert.equal(
        Object.prototype.hasOwnProperty.call(options, 'workflowsPath'),
        false,
      );
      let settleRun!: () => void;
      const work = new Promise<void>((resolve) => {
        settleRun = resolve;
      });
      return {
        getState: () => 'RUNNING',
        shutdown: () => {
          shutdownCalls += 1;
          settleRun();
        },
        run: () => work,
      };
    },
  });

  await runtime.stop();
  await runtime.stop();
  assert.equal(tracked.closeCount(), 1);
  assert.equal(shutdownCalls, 1);
});

test('Worker.create rejection closes the native connection', async () => {
  const tracked = trackNativeClose();
  await assert.rejects(
    startExecutionRuntime(executionConfig(), {
      connectNative: async () => tracked.native,
      createWorker: async () => {
        throw new Error('worker create failed');
      },
    }),
    { message: 'worker create failed' },
  );
  assert.equal(tracked.closeCount(), 1);
});

test('Worker.run rejection plus stop closes the native connection once', async () => {
  const tracked = trackNativeClose();
  let rejectWork!: (error: Error) => void;
  const work = new Promise<void>((_, reject) => {
    rejectWork = reject;
  });
  const runtime = await startExecutionRuntime(executionConfig(), {
    connectNative: async () => tracked.native,
    createWorker: async () => ({
      getState: () => 'RUNNING',
      shutdown: () => {
        rejectWork(new Error('worker run failed'));
      },
      run: () => work,
    }),
  });

  await assert.rejects(
    async () => {
      await runtime.stop();
    },
    { message: 'worker run failed' },
  );
  await assert.rejects(Promise.resolve(runtime.done), {
    message: 'worker run failed',
  });
  await assert.rejects(Promise.resolve(runtime.stop()), {
    message: 'worker run failed',
  });
  assert.equal(tracked.closeCount(), 1);
});

function controlConfig(): ControlWorkerConfig {
  return {
    address: 'test:7233',
    namespace: 'default',
    publication: {
      origin: 'http://127.0.0.1:9911',
      controlToken: '0123456789abcdef',
      timeoutMs: 1_000,
    },
  };
}

test('control runtime source keeps workflows path and drops database access', () => {
  assert.match(controlRuntimeSource, /workflowsPath/);
  assert.doesNotMatch(controlRuntimeSource, /createDatabase/);
  assert.doesNotMatch(controlRuntimeSource, /DATABASE_URL/);
});

test('successful control stop closes the native connection once', async () => {
  const tracked = trackNativeClose();
  let shutdownCalls = 0;
  const runtime = await startControlRuntime(controlConfig(), {
    connectNative: async () => tracked.native,
    createWorker: async (options) => {
      assert.equal(options.taskQueue, storytellerControlTaskQueue);
      assert.equal(
        Object.prototype.hasOwnProperty.call(options, 'workflowsPath'),
        true,
      );
      let settleRun!: () => void;
      const work = new Promise<void>((resolve) => {
        settleRun = resolve;
      });
      return {
        getState: () => 'RUNNING',
        shutdown: () => {
          shutdownCalls += 1;
          settleRun();
        },
        run: () => work,
      };
    },
  });

  await runtime.stop();
  await runtime.stop();
  assert.equal(tracked.closeCount(), 1);
  assert.equal(shutdownCalls, 1);
});

const stackLiveEnv = {
  relay: {
    address: 'test:7233',
    namespace: 'default',
    taskQueue: 'offscreen-local',
  },
  controlEnv: {
    TEMPORAL_ADDRESS: 'test:7233',
    TEMPORAL_NAMESPACE: 'default',
    GAME_AUTHORITY_ORIGIN: 'http://127.0.0.1:9911',
    GAME_AUTHORITY_CONTROL_TOKEN: '0123456789abcdef',
  },
  executorEnv: {
    TEMPORAL_ADDRESS: 'test:7233',
    TEMPORAL_NAMESPACE: 'default',
    GAME_AUTHORITY_ORIGIN: 'http://127.0.0.1:9911',
    GAME_AUTHORITY_EXECUTOR_TOKEN: '0123456789abcdef',
  },
};

const stackDatabase = null as unknown as Database;

function fakeRole(
  role: 'relay' | 'control' | 'executor',
  events: string[],
  stopError?: Error,
) {
  events.push(`start:${role}`);
  const done = new Promise<void>(() => {});
  return {
    done,
    async stop() {
      events.push(`stop:${role}`);
      if (stopError) {
        throw stopError;
      }
    },
  };
}

test('distributed live stack stops roles in reverse sequential order', async () => {
  const events: string[] = [];
  const stack = await startStorytellerDistributedLiveStack(
    stackDatabase,
    stackLiveEnv,
    () => {},
    {
      startRelay: async () => fakeRole('relay', events),
      startControl: async () => fakeRole('control', events),
      startExecutor: async () => fakeRole('executor', events),
    },
  );

  await stack.stop();
  await stack.stop();
  assert.deepEqual(events, [
    'start:relay',
    'start:control',
    'start:executor',
    'stop:executor',
    'stop:control',
    'stop:relay',
  ]);
});

test('control start failure cleans relay and preserves the startup error', async () => {
  const events: string[] = [];
  const controlStartError = new Error('control start failed');
  await assert.rejects(
    startStorytellerDistributedLiveStack(
      stackDatabase,
      stackLiveEnv,
      () => {},
      {
        startRelay: async () => fakeRole('relay', events),
        startControl: async () => {
          throw controlStartError;
        },
        startExecutor: async () => fakeRole('executor', events),
      },
    ),
    (error: unknown) => {
      assert.equal(error, controlStartError);
      return true;
    },
  );
  assert.deepEqual(events, ['start:relay', 'stop:relay']);
});

test('executor start failure cleans relay and control and preserves the startup error', async () => {
  const events: string[] = [];
  const executorStartError = new Error('executor start failed');
  await assert.rejects(
    startStorytellerDistributedLiveStack(
      stackDatabase,
      stackLiveEnv,
      () => {},
      {
        startRelay: async () => fakeRole('relay', events),
        startControl: async () => fakeRole('control', events),
        startExecutor: async () => {
          throw executorStartError;
        },
      },
    ),
    (error: unknown) => {
      assert.equal(error, executorStartError);
      return true;
    },
  );
  assert.deepEqual(events, [
    'start:relay',
    'start:control',
    'stop:control',
    'stop:relay',
  ]);
});

test('stack stop continues after one stop failure', async () => {
  const events: string[] = [];
  const stopFailure = new Error('executor stop failed');
  const stack = await startStorytellerDistributedLiveStack(
    stackDatabase,
    stackLiveEnv,
    () => {},
    {
      startRelay: async () => fakeRole('relay', events),
      startControl: async () => fakeRole('control', events),
      startExecutor: async () => fakeRole('executor', events, stopFailure),
    },
  );

  await assert.rejects(stack.stop(), stopFailure);
  assert.deepEqual(events, [
    'start:relay',
    'start:control',
    'start:executor',
    'stop:executor',
    'stop:control',
    'stop:relay',
  ]);
});

test('stack stop aggregates when two roles fail to stop', async () => {
  const events: string[] = [];
  const executorFailure = new Error('executor stop failed');
  const controlFailure = new Error('control stop failed');
  const stack = await startStorytellerDistributedLiveStack(
    stackDatabase,
    stackLiveEnv,
    () => {},
    {
      startRelay: async () => fakeRole('relay', events),
      startControl: async () => fakeRole('control', events, controlFailure),
      startExecutor: async () => fakeRole('executor', events, executorFailure),
    },
  );

  await assert.rejects(stack.stop(), (error: unknown) => {
    assert.ok(error instanceof AggregateError);
    assert.deepEqual((error as AggregateError).errors, [
      executorFailure,
      controlFailure,
    ]);
    return true;
  });
  assert.deepEqual(events, [
    'start:relay',
    'start:control',
    'start:executor',
    'stop:executor',
    'stop:control',
    'stop:relay',
  ]);
});