import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import test from 'node:test';

import { pendingRequestCount, rpc } from './worker.mjs';

function echoChild() {
  return fork(new URL('./echo-worker.mjs', import.meta.url), {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  });
}

test('64 concurrent requests route on one listener and clear pending', async () => {
  const child = echoChild();
  const results = await Promise.all(
    Array.from({ length: 64 }, (_unused, index) =>
      rpc(child, { type: 'echo', n: index }, 2_000),
    ),
  );
  assert.equal(results.length, 64);
  assert.deepEqual(
    results.map((result) => result.n),
    Array.from({ length: 64 }, (_unused, index) => index),
  );
  assert.equal(pendingRequestCount(child), 0);
  assert.equal(child.listenerCount('message'), 1);
  assert.equal(child.listenerCount('exit'), 1);
  assert.equal(child.listenerCount('disconnect'), 1);
  child.kill('SIGKILL');
  await new Promise((resolve) => child.once('exit', resolve));
});

test('missing response times out and a late response is ignored', async () => {
  const child = echoChild();
  await assert.rejects(rpc(child, { type: 'silence' }, 40), /WorkerRequestTimeout/);
  assert.equal(pendingRequestCount(child), 0);

  let settled = 0;
  const late = rpc(child, { type: 'echo', delayMs: 150 }, 30).then(
    () => {
      settled += 1;
    },
    (error) => {
      settled += 1;
      assert.match(error.message, /WorkerRequestTimeout/);
    },
  );
  await late;
  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.equal(settled, 1);
  assert.equal(pendingRequestCount(child), 0);
  assert.equal(child.listenerCount('message'), 1);
  child.kill('SIGKILL');
  await new Promise((resolve) => child.once('exit', resolve));
});

test('worker exit rejects outstanding requests and clears pending', async () => {
  const child = echoChild();
  const pending = rpc(child, { type: 'silence' }, 5_000);
  const failed = assert.rejects(pending, /WorkerExited|WorkerDisconnected/);
  child.kill('SIGKILL');
  await failed;
  assert.equal(pendingRequestCount(child), 0);
});
