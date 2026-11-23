import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  acceptedCriImageIds,
  assessWebDevServerReadiness,
  canonicalDockerImageReference,
  DEV_RUNTIME_FRESHNESS_ROLES,
  superviseOwnedWebPortForward,
} from './dev-tilt.mjs';

const healthy = {
  namespace: 'dev-5',
  expectedImage: 'offscreen-dev:gen',
  pod: { ready: true, namespace: 'dev-5', image: 'offscreen-dev:gen' },
  httpStatus: 200,
};

test('a running pod manifest digest counts only when it is on the current CRI image', () => {
  const current = 'sha256:3288985929cc8d5ca522f8aeaa20d3f086f11013fb8536a0c63598e52c7fc361';
  const config = 'sha256:c2a66f034e4780a00179ed92d8c9ab99488f65c3fe08b9f4455683bfd25a9fc7';
  const stale = 'sha256:052ab7ff652ad53089566a4444fb61c08e2c2e60dabab6c300aa3f7707599dba';
  const inspect = JSON.stringify({
    status: { id: config, repoDigests: [`docker.io/library/import-2026-11-23@${current}`] },
  });
  const accepted = acceptedCriImageIds(inspect);
  assert.deepEqual(accepted, [config, current]);
  const ready = assessWebDevServerReadiness({
    ...healthy,
    expectedConfigIds: accepted,
    pod: { ...healthy.pod, imageId: `docker.io/library/import-2026-11-23@${current}` },
  });
  const old = assessWebDevServerReadiness({
    ...healthy,
    expectedConfigIds: accepted,
    pod: { ...healthy.pod, imageId: `docker.io/library/import-2026-11-23@${stale}` },
  });
  assert.equal(ready.ready, true);
  const retagged = assessWebDevServerReadiness({
    ...healthy,
    expectedImage: 'offscreen-dev-workspace:tilt-build-1',
    expectedConfigIds: accepted,
    pod: {
      ...healthy.pod,
      image: 'offscreen-dev-workspace:dev-8-api',
      imageId: `docker.io/library/import-2026-11-23@${current}`,
    },
  });
  assert.equal(retagged.ready, true);
  assert.equal(old.ready, false);
  assert.equal(old.reason, 'image_mismatch');
});

test('web is ready only for the selected healthy pod, image and HTTP response', () => {
  const status = assessWebDevServerReadiness(healthy);
  assert.equal(status.ready, true);
  assert.equal(status.reason, 'dev_server_serving');
  assert.equal(DEV_RUNTIME_FRESHNESS_ROLES.some((role) => role.compiledEntryPath?.includes('.next')), false);
});

test('docker hub library prefix is the same image; repo tag and digest stay distinct', () => {
  const bare = 'offscreen-dev-workspace:tilt-build-1795443662';
  const prefixed = `docker.io/library/${bare}`;
  assert.equal(canonicalDockerImageReference(bare), canonicalDockerImageReference(prefixed));
  const status = assessWebDevServerReadiness({
    ...healthy,
    expectedImage: bare,
    pod: { ...healthy.pod, image: prefixed },
  });
  assert.equal(status.ready, true);
  assert.equal(status.reason, 'dev_server_serving');
  assert.notEqual(
    canonicalDockerImageReference(bare),
    canonicalDockerImageReference('other-workspace:tilt-build-1795443662'),
  );
  assert.notEqual(
    canonicalDockerImageReference(bare),
    canonicalDockerImageReference('offscreen-dev-workspace:other-tag'),
  );
  assert.notEqual(
    canonicalDockerImageReference(`${bare}@sha256:aaa`),
    canonicalDockerImageReference(`${bare}@sha256:bbb`),
  );
  assert.equal(assessWebDevServerReadiness({
    ...healthy,
    expectedImage: bare,
    pod: { ...healthy.pod, image: 'ghcr.io/offscreen-dev-workspace:tilt-build-1795443662' },
  }).reason, 'image_mismatch');
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
  const expectedConfigId = 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  assert.equal(assessWebDevServerReadiness({
    ...healthy,
    expectedConfigId,
    pod: {
      ...healthy.pod,
      imageId: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    },
  }).reason, 'image_mismatch');
  assert.equal(assessWebDevServerReadiness({
    ...healthy,
    expectedConfigId,
    pod: { ...healthy.pod, imageId: expectedConfigId },
  }).ready, true);
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
