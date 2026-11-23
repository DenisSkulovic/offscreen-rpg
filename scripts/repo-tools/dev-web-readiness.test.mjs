import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assessWebDevServerReadiness,
  DEV_RUNTIME_FRESHNESS_ROLES,
  superviseOwnedWebPortForward,
} from './dev-tilt.mjs';

const healthy = {
  namespace: 'dev-5',
  expectedImage: 'offscreen-dev:gen',
  pod: { ready: true, namespace: 'dev-5', image: 'offscreen-dev:gen' },
  httpStatus: 200,
};

test('web is ready only for the selected healthy pod, image and HTTP response', () => {
  const status = assessWebDevServerReadiness(healthy);
  assert.equal(status.ready, true);
  assert.equal(status.reason, 'dev_server_serving');
  assert.equal(DEV_RUNTIME_FRESHNESS_ROLES.some((role) => role.compiledEntryPath?.includes('.next')), false);
});

test('web stays not ready when HTTP, pod or image checks fail', () => {
  assert.equal(assessWebDevServerReadiness({ ...healthy, httpStatus: 500 }).reason, 'http_unsuccessful');
  assert.equal(assessWebDevServerReadiness({ ...healthy, pod: null }).reason, 'web_pod_not_ready');
  assert.equal(assessWebDevServerReadiness({
    ...healthy,
    pod: { ...healthy.pod, image: 'other' },
  }).reason, 'image_mismatch');
  assert.equal(assessWebDevServerReadiness({
    ...healthy,
    pod: { ...healthy.pod, namespace: 'dev-4' },
  }).reason, 'namespace_mismatch');
});

test('forwarder waits for the backend, records a replacement, and refuses a foreign port', async () => {
  let backend = false;
  let occupied = false;
  /** @type {{ pid: number, processStartTicks: string | null }[]} */
  const recorded = [];
  let spawned = 0;
  const first = await superviseOwnedWebPortForward({
    sessionActive: () => true,
    backendReady: () => backend,
    portOccupied: () => occupied,
    spawnForward: () => {
      spawned += 1;
      return { pid: 40 + spawned, onExit: (cb) => cb(spawned === 1 ? 1 : 0) };
    },
    readStartTicks: (pid) => `tick-${pid}`,
    recordForward: (record) => recorded.push(record),
    sleep: async () => {},
    maxAttempts: 4,
  });
  assert.equal(spawned, 0);
  assert.equal(first.reason, 'retries_exhausted');

  backend = true;
  occupied = true;
  const foreign = await superviseOwnedWebPortForward({
    sessionActive: () => true,
    backendReady: () => true,
    portOccupied: () => true,
    spawnForward: () => { throw new Error('must not spawn'); },
    readStartTicks: () => '1',
    recordForward: () => {},
    sleep: async () => {},
  });
  assert.equal(foreign.reason, 'foreign_port');

  occupied = false;
  let exits = 0;
  const recovered = await superviseOwnedWebPortForward({
    sessionActive: () => exits < 2,
    backendReady: () => true,
    portOccupied: () => false,
    spawnForward: () => {
      const pid = 70 + exits;
      return { pid, onExit: (cb) => { exits += 1; cb(1); } };
    },
    readStartTicks: (pid) => (pid === 71 ? null : `tick-${pid}`),
    recordForward: (record) => recorded.push(record),
    sleep: async () => {},
  });
  assert.equal(recorded.at(-1)?.pid, 70);
  assert.equal(recorded.at(-1)?.processStartTicks, 'tick-70');
  assert.equal(recovered.reason, 'start_time_mismatch');
});

test('stopping during startup cancels retries without spawning a forwarder', async () => {
  let spawned = 0;
  const result = await superviseOwnedWebPortForward({
    sessionActive: () => false,
    backendReady: async () => true,
    portOccupied: async () => false,
    spawnForward: () => { spawned += 1; return { pid: 9, onExit: () => {} }; },
    readStartTicks: () => '1',
    recordForward: () => {},
    sleep: async () => {},
  });
  assert.equal(result.reason, 'cancelled');
  assert.equal(spawned, 0);
});
