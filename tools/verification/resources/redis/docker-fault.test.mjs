import assert from 'node:assert/strict';
import { mkdtempSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  REDIS_IMAGE_PIN,
  VERIFY_RUN_LABEL,
  VERIFY_RUNTIME_USER,
} from './docker-plan.mjs';
import {
  RECOVERY_VERIFICATION_PROFILE,
  buildRedisDockerOwnerReceipt,
  cleanupPartialRedisDockerResource,
  createRedisDockerResource,
  pauseOwnedRedisClients,
  releaseRedisDockerResource,
  restartOwnedRedisDockerContainer,
  stopStartOwnedRedisDockerContainer,
  verifyContainerAbsent,
} from './docker.mjs';

const RUN_ID = 'run-fault123';
const IMAGE_ID =
  '5f7034383d192613e04aaf5c0f5d317b7f3478d5801c0b6c8d234f8708f1f61';
const CONTAINER_ID = 'abcabcabcabc123456789abc';
const CONTAINER_NAME = 'offscreen-verify-redis-faultbeef';
const HOST_PORT = 56379;

/** @returns {import('./docker-plan.mjs').CommandResult} */
function ok(stdout = '') {
  return { ok: true, stdout, stderr: '' };
}

function basePlan(overrides = {}) {
  return {
    schemaVersion: 1,
    kind: 'redis',
    profile: 'single',
    live: false,
    runId: RUN_ID,
    dockerContext: 'default',
    image: REDIS_IMAGE_PIN,
    imageId: IMAGE_ID,
    imagePulled: false,
    containerName: CONTAINER_NAME,
    labels: { [VERIFY_RUN_LABEL]: RUN_ID },
    keyNamespace: `offscreen:verify:${RUN_ID}`,
    adminUser: 'verify_admin',
    runtimeUser: VERIFY_RUNTIME_USER,
    limits: {
      memoryMiB: 128,
      cpus: 0.5,
      tmpfsDataMiB: 32,
      maxmemoryMiB: 8,
      maxmemoryPolicy: 'allkeys-lru',
    },
    credentials: {
      adminPassword: 'a'.repeat(64),
      runtimePassword: 'b'.repeat(64),
    },
    ...overrides,
  };
}

function containerInspectJson({ runId = RUN_ID, status = 'running' } = {}) {
  return {
    Id: CONTAINER_ID,
    Image: `sha256:${IMAGE_ID}`,
    State: { Status: status },
    Config: { Labels: { [VERIFY_RUN_LABEL]: runId } },
    NetworkSettings: {
      Ports: {
        '6379/tcp': [{ HostIp: '127.0.0.1', HostPort: String(HOST_PORT) }],
      },
    },
    HostConfig: {
      PortBindings: {
        '6379/tcp': [{ HostIp: '127.0.0.1', HostPort: String(HOST_PORT) }],
      },
      Tmpfs: {
        '/data': 'rw,size=33554432',
        '/run/verify': 'rw,size=8388608',
      },
    },
    Mounts: [],
  };
}

class FakeRedisClient {
  constructor(config) {
    this.config = config;
    this.user = config.username;
  }

  async connect() {}

  async ping() {
    return 'PONG';
  }

  async disconnect() {}
}

function buildLifecycleFakeDocker({
  wrongLabel = false,
  rmFails = false,
  removed = false,
} = {}) {
  const state = {
    status: 'running',
    removed,
    restartCount: 0,
    execAttempts: 0,
    rmArgs: null,
    stopped: false,
  };

  function inspectBody() {
    if (state.removed) {
      return { ok: false, stdout: '', stderr: 'No such object' };
    }
    const status = state.stopped ? 'exited' : state.status;
    const body = containerInspectJson({
      runId: wrongLabel ? 'foreign-run' : RUN_ID,
      status,
    });
    if (status !== 'running') {
      body.NetworkSettings = { Ports: {} };
    }
    return ok(JSON.stringify([body]));
  }

  return (command, args) => {
    if (command !== 'docker') {
      return { ok: false, stdout: '', stderr: 'unexpected command' };
    }
    if (args[0] === 'inspect') {
      if (args[2] === '--format' && args[3] === '{{.Id}}') {
        return state.removed
          ? { ok: false, stdout: '', stderr: 'missing' }
          : ok(`${CONTAINER_ID}\n`);
      }
      if (args[2] === '--format' && args[3] === '{{json .}}') {
        return inspectBody();
      }
      return inspectBody();
    }
    if (args[0] === 'restart' && args[1] === CONTAINER_ID) {
      state.restartCount += 1;
      state.status = 'running';
      state.stopped = false;
      state.execAttempts = 0;
      return ok(CONTAINER_ID);
    }
    if (args[0] === 'stop' && args[1] === CONTAINER_ID) {
      state.status = 'exited';
      state.stopped = true;
      return ok(CONTAINER_ID);
    }
    if (args[0] === 'start' && args[1] === CONTAINER_ID) {
      state.status = 'running';
      state.stopped = false;
      return ok(CONTAINER_ID);
    }
    if (args[0] === 'exec') {
      state.execAttempts += 1;
      const script = args[args.length - 1] ?? '';
      if (/CLIENT PAUSE/i.test(script)) {
        return ok('OK\n');
      }
      return ok('PONG\n');
    }
    if (args[0] === 'rm' && args[1] === '-f') {
      state.rmArgs = [...args];
      if (rmFails) {
        return { ok: false, stdout: '', stderr: 'rm failed' };
      }
      assert.equal(args[2], CONTAINER_ID);
      state.removed = true;
      return ok(CONTAINER_ID);
    }
    if (args[0] === 'ps') {
      return state.removed ? ok('') : ok(`${CONTAINER_ID}\n`);
    }
    return { ok: false, stdout: '', stderr: `unexpected docker ${args[0]}` };
  };
}

function buildCreateFakeDocker() {
  const state = { status: 'created', started: false, execAttempts: 0 };
  return (command, args) => {
    if (command === 'docker' && args[0] === 'create') {
      state.status = 'created';
      return ok(`${CONTAINER_ID}\n`);
    }
    if (command === 'docker' && args[0] === 'start') {
      state.status = 'running';
      state.started = true;
      return ok(CONTAINER_ID);
    }
    if (command === 'docker' && args[0] === 'inspect') {
      const body = containerInspectJson({ status: state.status });
      return ok(JSON.stringify([body]));
    }
    if (command === 'docker' && args[0] === 'exec') {
      state.execAttempts += 1;
      if (state.started) {
        return ok('PONG\n');
      }
      return ok('LOADING\n');
    }
    return { ok: false, stdout: '', stderr: `unexpected ${args.join(' ')}` };
  };
}

async function createFixtureResource() {
  const plan = basePlan();
  const created = await createRedisDockerResource({
    profile: 'single',
    run: buildCreateFakeDocker(),
    plan,
    Client: FakeRedisClient,
    sleep: async () => {},
  });
  assert.equal(created.ok, true);
  return {
    plan,
    resource: created.resource,
    ownerReceipt: created.ownerReceipt,
  };
}

test('restartOwnedRedisDockerContainer refuses non-recovery profile', async () => {
  const { plan, resource } = await createFixtureResource();
  const result = await restartOwnedRedisDockerContainer({
    resource,
    plan,
    verificationProfile: 'standard',
    run: buildLifecycleFakeDocker(),
    sleep: async () => {},
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'fault-profile-refused');
});

test('restartOwnedRedisDockerContainer verifies label then preserves port', async () => {
  const { plan, resource } = await createFixtureResource();
  const result = await restartOwnedRedisDockerContainer({
    resource,
    plan,
    verificationProfile: RECOVERY_VERIFICATION_PROFILE,
    run: buildLifecycleFakeDocker(),
    sleep: async () => {},
  });
  assert.equal(result.ok, true);
  assert.equal(result.port, HOST_PORT);
  assert.equal(result.containerId, CONTAINER_ID);
  assert.equal(result.ownerReceipt.partial, false);
});

test('restartOwnedRedisDockerContainer refuses foreign run label', async () => {
  const { plan, resource } = await createFixtureResource();
  const result = await restartOwnedRedisDockerContainer({
    resource,
    plan,
    verificationProfile: RECOVERY_VERIFICATION_PROFILE,
    run: buildLifecycleFakeDocker({ wrongLabel: true }),
    sleep: async () => {},
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'foreign-run-label');
});

test('stopStartOwnedRedisDockerContainer restores ownership and port', async () => {
  const { plan, resource } = await createFixtureResource();
  const result = await stopStartOwnedRedisDockerContainer({
    resource,
    plan,
    verificationProfile: RECOVERY_VERIFICATION_PROFILE,
    run: buildLifecycleFakeDocker(),
    sleep: async () => {},
  });
  assert.equal(result.ok, true);
  assert.equal(result.port, HOST_PORT);
});

test('pauseOwnedRedisClients requires recovery profile and owned identity', async () => {
  const { plan, resource } = await createFixtureResource();
  const refused = await pauseOwnedRedisClients({
    resource,
    plan,
    verificationProfile: 'standard',
    run: buildLifecycleFakeDocker(),
  });
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, 'fault-profile-refused');

  const paused = await pauseOwnedRedisClients({
    resource,
    plan,
    verificationProfile: RECOVERY_VERIFICATION_PROFILE,
    run: buildLifecycleFakeDocker(),
    pauseMs: 350,
  });
  assert.equal(paused.ok, true);
  assert.equal(paused.pauseMs, 350);
});

test('releaseRedisDockerResource removes by exact ID via docker ps absence', async () => {
  const { plan, resource, ownerReceipt } = await createFixtureResource();
  const privateDir = mkdtempSync(join(tmpdir(), 'offscreen-verify-redis-'));
  const privateFile = join(privateDir, 'secret.env');
  writeFileSync(privateFile, 'VERIFY_ADMIN_PASSWORD=hidden\n', { mode: 0o600 });
  const run = buildLifecycleFakeDocker();

  const released = await releaseRedisDockerResource({
    resource: { ...resource, privatePaths: [privateFile] },
    plan,
    run,
  });
  assert.equal(released.ok, true);
  assert.equal(released.containerId, CONTAINER_ID);
  assert.equal(released.ownerReceipt.runId, ownerReceipt.runId);
  assert.doesNotMatch(JSON.stringify(released.ownerReceipt), /hidden/);
  assert.throws(() => {
    unlinkSync(privateFile);
  });

  const absent = await verifyContainerAbsent({
    containerId: CONTAINER_ID,
    run,
  });
  assert.equal(absent.ok, true);
});

test('releaseRedisDockerResource surfaces cleanup failure', async () => {
  const { plan, resource } = await createFixtureResource();
  const result = await releaseRedisDockerResource({
    resource,
    plan,
    run: buildLifecycleFakeDocker({ rmFails: true }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'cleanup-failed');
});

test('cleanupPartialRedisDockerResource releases partially created resource', async () => {
  const plan = basePlan();
  const partial = buildRedisDockerOwnerReceipt(
    {
      runId: plan.runId,
      containerId: CONTAINER_ID,
      containerName: plan.containerName,
      profile: plan.profile,
      imageId: plan.imageId,
      host: '127.0.0.1',
      port: HOST_PORT,
      keyNamespace: plan.keyNamespace,
      runtimeUser: plan.runtimeUser,
      adminUser: plan.adminUser,
      maxmemoryPolicy: plan.limits.maxmemoryPolicy,
    },
    { partial: true },
  );
  const run = buildLifecycleFakeDocker();
  const cleaned = await cleanupPartialRedisDockerResource({
    containerId: CONTAINER_ID,
    plan,
    run,
    partialResource: partial,
  });
  assert.equal(cleaned.ok, true, cleaned.reason ?? 'no reason');
  assert.equal(cleaned.ownerReceipt.partial, true);
});
