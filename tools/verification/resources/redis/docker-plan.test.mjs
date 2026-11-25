import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import test from 'node:test';

import {
  REDIS_IMAGE_PIN,
  VERIFY_RUN_LABEL,
  assertOwnedContainerIdentity,
  planRedisDockerResource,
  refuseRedisEnvOverrides,
} from './docker-plan.mjs';

const IMAGE_ID =
  '5f7034383d192613e04aaf5c0f5d317b7f3478d5801c0b6c8d234f8708f1f61';
const RUN_ID = 'abc123run';

/** @returns {import('./docker-plan.mjs').CommandResult} */
function ok(stdout = '') {
  return { ok: true, stdout, stderr: '' };
}

function buildHappyRun() {
  return (command, args) => {
    const key = `${command} ${args.join(' ')}`;
    if (key === 'docker context show') return ok('default\n');
    if (key.startsWith('docker context inspect')) {
      return ok('"unix:///var/run/docker.sock"\n');
    }
    if (key === 'docker info --format {{.DockerRootDir}}') {
      return ok('/var/lib/docker\n');
    }
    if (key.startsWith('docker image inspect')) {
      return ok(JSON.stringify(`sha256:${IMAGE_ID}`));
    }
    if (key.startsWith('docker pull')) {
      return {
        ok: false,
        stdout: '',
        stderr: 'unexpected pull in plan-only test',
      };
    }
    return { ok: false, stdout: '', stderr: `unexpected ${key}` };
  };
}

test('planRedisDockerResource plans single profile with pinned local image', () => {
  const planned = planRedisDockerResource({
    profile: 'single',
    runId: RUN_ID,
    live: false,
    env: {},
    platform: 'linux',
    run: buildHappyRun(),
    readMeminfo: () =>
      `MemAvailable: ${Math.ceil((128 * 1024 ** 2 + 2 * 1024 ** 3) / 1024)} kB\n`,
    readDiskFree: () => 8 * 1024 ** 3,
    random: (() => {
      let n = 0;
      return () => Buffer.alloc(32, n++);
    })(),
  });
  assert.equal(planned.ok, true);
  assert.equal(planned.plan.profile, 'single');
  assert.equal(planned.plan.image, REDIS_IMAGE_PIN);
  assert.equal(planned.plan.imageId, IMAGE_ID);
  assert.equal(planned.plan.labels[VERIFY_RUN_LABEL], RUN_ID);
  assert.equal(planned.plan.limits.memoryMiB, 128);
  assert.equal(planned.plan.limits.maxmemoryPolicy, 'allkeys-lru');
  assert.equal(planned.plan.credentials.adminPassword.length, 64);
  assert.notEqual(
    planned.plan.credentials.adminPassword,
    planned.plan.credentials.runtimePassword,
  );
});

test('planRedisDockerResource refuses non-local docker context', () => {
  const planned = planRedisDockerResource({
    profile: 'single',
    runId: RUN_ID,
    live: false,
    env: {},
    platform: 'linux',
    run: (command, args) => {
      if (command === 'docker' && args[0] === 'context' && args[1] === 'show') {
        return ok('default\n');
      }
      if (command === 'docker' && args[0] === 'context') {
        return ok('"tcp://127.0.0.1:2375"\n');
      }
      if (command === 'docker' && args[0] === 'info') {
        return ok('/var/lib/docker\n');
      }
      return { ok: false, stdout: '', stderr: 'stop' };
    },
    readMeminfo: () => `MemAvailable: ${10 * 1024 * 1024} kB\n`,
    readDiskFree: () => 8 * 1024 ** 3,
  });
  assert.equal(planned.ok, false);
  assert.equal(planned.reason, 'docker-endpoint-not-local');
});

test('planRedisDockerResource refuses low host memory', () => {
  const planned = planRedisDockerResource({
    profile: 'single',
    runId: RUN_ID,
    live: false,
    env: {},
    platform: 'linux',
    run: buildHappyRun(),
    readMeminfo: () => 'MemAvailable: 1048576 kB\n',
    readDiskFree: () => 8 * 1024 ** 3,
  });
  assert.equal(planned.ok, false);
  assert.equal(planned.reason, 'insufficient-memory');
});

test('planRedisDockerResource refuses unsupported profile', () => {
  const planned = planRedisDockerResource({
    profile: 'replicated',
    runId: RUN_ID,
    live: false,
    env: {},
    platform: 'linux',
    run: buildHappyRun(),
    readMeminfo: () => `MemAvailable: ${20 * 1024 * 1024} kB\n`,
    readDiskFree: () => 8 * 1024 ** 3,
  });
  assert.equal(planned.ok, false);
  assert.equal(planned.reason, 'unsupported-profile');
});

test('planRedisDockerResource refuses missing local image without live', () => {
  const planned = planRedisDockerResource({
    profile: 'single',
    runId: RUN_ID,
    live: false,
    env: {},
    platform: 'linux',
    run: (command, args) => {
      const key = `${command} ${args.join(' ')}`;
      if (key === 'docker context show') return ok('default\n');
      if (key.startsWith('docker context inspect')) {
        return ok('"unix:///var/run/docker.sock"\n');
      }
      if (key === 'docker info --format {{.DockerRootDir}}') {
        return ok('/var/lib/docker\n');
      }
      if (key.startsWith('docker image inspect')) {
        return { ok: false, stdout: '', stderr: 'missing' };
      }
      return { ok: false, stdout: '', stderr: `unexpected ${key}` };
    },
    readMeminfo: () => `MemAvailable: ${20 * 1024 * 1024} kB\n`,
    readDiskFree: () => 8 * 1024 ** 3,
  });
  assert.equal(planned.ok, false);
  assert.equal(planned.reason, 'image-not-local');
});

test('assertOwnedContainerIdentity refuses foreign run label and image id', () => {
  const plan = {
    runId: RUN_ID,
    imageId: IMAGE_ID,
    labels: { [VERIFY_RUN_LABEL]: RUN_ID },
  };
  const foreignLabel = assertOwnedContainerIdentity({
    containerId: 'abcabcabcabc',
    plan,
    run: () =>
      ok(
        JSON.stringify([
          {
            Image: `sha256:${IMAGE_ID}`,
            Config: { Labels: { [VERIFY_RUN_LABEL]: 'other-run' } },
          },
        ]),
      ),
  });
  assert.equal(foreignLabel.ok, false);
  assert.equal(foreignLabel.reason, 'foreign-run-label');

  const foreignImage = assertOwnedContainerIdentity({
    containerId: 'abcabcabcabc',
    plan,
    run: () =>
      ok(
        JSON.stringify([
          {
            Image:
              'sha256:deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
            Config: { Labels: { [VERIFY_RUN_LABEL]: RUN_ID } },
          },
        ]),
      ),
  });
  assert.equal(foreignImage.ok, false);
  assert.equal(foreignImage.reason, 'foreign-image-id');
});

test('refuseRedisEnvOverrides rejects docker and redis url overrides', () => {
  assert.equal(
    refuseRedisEnvOverrides({ DOCKER_HOST: 'tcp://evil' }).ok,
    false,
  );
  assert.equal(
    refuseRedisEnvOverrides({ REDIS_URL: 'redis://127.0.0.1:6379' }).ok,
    false,
  );
  assert.equal(refuseRedisEnvOverrides({}).ok, true);
});
