import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import test from 'node:test';

import {
  VERIFY_RUN_LABEL,
  assertOwnedContainerIdentity,
  planPostgresDockerResource,
  refuseDockerEnvOverrides,
} from './docker-plan.mjs';

const PINNED_IMAGE = 'docker.io/library/postgres:17.11-bookworm';
const IMAGE_ID =
  '665dc7b37ac52a17e298511414c21d23ffa4e6a6ef6225b3e5d59c7afb35e994';
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

test('planPostgresDockerResource plans single profile with pinned local image', () => {
  const planned = planPostgresDockerResource({
    profile: 'single',
    runId: RUN_ID,
    live: false,
    env: {},
    platform: 'linux',
    run: buildHappyRun(),
    readMeminfo: () =>
      `MemAvailable: ${Math.ceil((768 * 1024 ** 2 + 2 * 1024 ** 3) / 1024)} kB\n`,
    readDiskFree: () => 8 * 1024 ** 3,
    random: (() => {
      let n = 0;
      return () => Buffer.alloc(32, n++);
    })(),
  });
  assert.equal(planned.ok, true);
  assert.equal(planned.plan.profile, 'single');
  assert.equal(planned.plan.image, PINNED_IMAGE);
  assert.equal(planned.plan.imageId, IMAGE_ID);
  assert.equal(planned.plan.labels[VERIFY_RUN_LABEL], RUN_ID);
  assert.equal(planned.plan.database, 'offscreen_db_test');
  assert.equal(planned.plan.credentials.adminPassword.length, 64);
  assert.notEqual(
    planned.plan.credentials.adminPassword,
    planned.plan.credentials.runtimePassword,
  );
  assert.equal(planned.plan.limits.memoryMiB, 768);
  assert.equal(planned.plan.limits.maxConnections, 100);
});

test('planPostgresDockerResource refuses non-local docker context', () => {
  const planned = planPostgresDockerResource({
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

test('planPostgresDockerResource refuses low host memory', () => {
  const planned = planPostgresDockerResource({
    profile: 'constrained',
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

test('planPostgresDockerResource refuses unsupported profile', () => {
  const planned = planPostgresDockerResource({
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

test('refuseDockerEnvOverrides rejects docker and database url overrides', () => {
  assert.equal(
    refuseDockerEnvOverrides({ DOCKER_HOST: 'tcp://evil' }).ok,
    false,
  );
  assert.equal(
    refuseDockerEnvOverrides({ DATABASE_URL: 'postgres://x' }).ok,
    false,
  );
  assert.equal(refuseDockerEnvOverrides({}).ok, true);
});
