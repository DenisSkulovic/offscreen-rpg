import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import test from 'node:test';

import {
  createDockerExecutor,
  liveExitCode,
  monotonicNow,
  operationTimeoutMs,
  parseScenarioSelection,
  requireOperationTimeout,
  withScenarioIsolation,
} from './harness.mjs';

test('nested operation timeout cannot exceed the enclosing deadline', () => {
  const deadline = monotonicNow() + 80;
  const timeout = operationTimeoutMs(deadline, 5_000);
  assert.ok(timeout <= 80);
  assert.ok(timeout > 0);
  assert.throws(
    () => requireOperationTimeout(monotonicNow() - 5, 1_000),
    /ScenarioDeadlineExpired/,
  );
});

test('docker executor uses the remaining deadline and does not start a late command', async () => {
  /** @type {number[]} */
  const seen = [];
  const executor = createDockerExecutor(async (_file, _args, opts) => {
    seen.push(opts.timeout);
    return { stdout: 'ok', stderr: '' };
  });
  const deadline = monotonicNow() + 40;
  await executor('docker', ['inspect'], { deadlineMs: deadline, timeout: 10_000 });
  assert.equal(seen.length, 1);
  assert.ok(seen[0] <= 40);
  await assert.rejects(
    executor('docker', ['inspect'], {
      deadlineMs: monotonicNow() - 1,
      timeout: 10_000,
    }),
    /ScenarioDeadlineExpired/,
  );
  assert.equal(seen.length, 1);
});

test('scenario selection runs only the named scenario', () => {
  assert.deepEqual(parseScenarioSelection(['--scenario', 'restart']), {
    scenario: 'restart',
    wave: 't02',
  });
  assert.equal(parseScenarioSelection(['--live']).scenario, null);
  assert.equal(parseScenarioSelection(['--scenario']).error, 'Missing scenario name');
});

test('a thrown scenario still closes its worker', async () => {
  const child = fork(new URL('./echo-worker.mjs', import.meta.url), {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  });
  const ctx = { workers: [] };
  await assert.rejects(
    withScenarioIsolation(ctx, async (isolated) => {
      isolated.workers.push(child);
      throw new Error('ScenarioBoom');
    }),
    /ScenarioBoom/,
  );
  assert.equal(ctx.workers.length, 0);
  assert.ok(child.exitCode !== null || child.killed);
});

test('live exit status follows proof and cleanup', () => {
  const clean = {
    workers: { errors: [] },
    admin: { closed: true },
    container: { removed: true },
  };
  assert.equal(liveExitCode('PASS', clean), 0);
  assert.equal(liveExitCode('FAIL', clean), 1);
  assert.equal(liveExitCode('NOT-RUN', clean), 2);
  assert.equal(
    liveExitCode('PASS', {
      ...clean,
      container: { removed: false },
    }),
    1,
  );
});
