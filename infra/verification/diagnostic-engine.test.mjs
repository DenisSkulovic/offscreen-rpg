import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import process from 'node:process';
import test from 'node:test';

import { commandOutcome, runCommand } from './diagnostic-engine.mjs';

test('pre-abort does not spawn', async () => {
  const controller = new AbortController();
  controller.abort();
  let spawned = false;
  const result = await runCommand(process.execPath, ['-e', 'process.exit(0)'], {
    signal: controller.signal,
    spawnImpl: () => {
      spawned = true;
      throw new Error('spawned');
    },
  });
  assert.equal(spawned, false);
  assert.equal(result.reason, 'aborted');
  assert.equal(commandOutcome(result).status, 'FAIL');
});

test('timeout after start is not a zero exit', async () => {
  const result = await runCommand(
    process.execPath,
    ['-e', 'setInterval(() => {}, 1000)'],
    { timeoutMs: 80 },
  );
  assert.equal(result.reason, 'timeout');
  assert.notEqual(result.code, 0);
  assert.equal(commandOutcome(result).status, 'FAIL');
});

test('output cap stops a noisy child', async () => {
  const result = await runCommand(
    process.execPath,
    ['-e', 'process.stdout.write("x".repeat(200))'],
    { maxCaptureBytes: 40, timeoutMs: 2000 },
  );
  assert.equal(result.reason, 'output-limit');
  assert.equal(commandOutcome(result).status, 'FAIL');
});

test('late zero exit stays failed after abort', async () => {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.pid = 4242;
  child.kill = () => {};
  child.unref = () => {};
  const controller = new AbortController();
  const pending = runCommand('fixture', [], {
    signal: controller.signal,
    timeoutMs: 5000,
    closeGraceMs: 1000,
    spawnImpl: () => child,
  });
  setTimeout(() => controller.abort(), 20);
  setTimeout(() => child.emit('close', 0, null), 40);
  const result = await pending;
  assert.equal(result.code, 0);
  assert.equal(result.reason, 'aborted');
  assert.equal(commandOutcome(result).status, 'FAIL');
});

test('unconfirmed close is not success', async () => {
  let now = 0;
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.pid = 7;
  child.kill = () => {};
  child.unref = () => {};
  child.stdout.destroy = () => {};
  child.stderr.destroy = () => {};
  const result = await runCommand('fixture', [], {
    timeoutMs: 30,
    closeGraceMs: 20,
    now: () => now,
    spawnImpl: () => {
      setTimeout(() => {
        now = 30;
      }, 5);
      return child;
    },
  });
  assert.equal(result.reason, 'close-unconfirmed');
  assert.equal(result.code, null);
  assert.equal(commandOutcome(result).status, 'FAIL');
});

test('ordinary nonzero contract is unchanged', async () => {
  const failed = await runCommand(process.execPath, ['-e', 'process.exit(3)']);
  assert.equal(failed.code, 3);
  assert.equal(failed.reason, null);
  assert.equal(commandOutcome(failed).status, 'FAIL');
});

test('linux group kill reaches a non-detached grandchild', { skip: process.platform === 'win32' }, async () => {
  const script = `
    const { spawn } = require('child_process');
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { detached: false, stdio: 'ignore' });
    console.log(String(child.pid));
    setInterval(() => {}, 1000);
  `;
  const result = await runCommand(process.execPath, ['-e', script], { timeoutMs: 400 });
  assert.equal(result.reason, 'timeout');
  const pid = Number(result.stdout.trim().split('\n')[0]);
  assert.equal(Number.isInteger(pid), true);
  let alive = true;
  try {
    process.kill(pid, 0);
  } catch {
    alive = false;
  }
  assert.equal(alive, false);
});
