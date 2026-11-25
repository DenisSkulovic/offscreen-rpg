import assert from 'node:assert/strict';
import test from 'node:test';

import {
  REDIS_IMAGE_PIN,
  VERIFY_RUN_LABEL,
  VERIFY_RUNTIME_USER,
} from './docker-plan.mjs';
import {
  assertLoopbackPortBinding,
  assertPreStartContainerState,
  buildRedisDockerCreateArgs,
  createRedisDockerResource,
  sanitizeRedisResourcePublicFacts,
  waitForRedisPing,
} from './docker.mjs';

const RUN_ID = 'run-abc123';
const IMAGE_ID =
  '5f7034383d192613e04aaf5c0f5d317b7f3478d5801c0b6c8d234f8708f1f61';
const CONTAINER_ID = 'abcabcabcabc123456789abc';
const CONTAINER_NAME = 'offscreen-verify-redis-deadbeef';
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

function containerInspectJson({
  runId = RUN_ID,
  imageId = IMAGE_ID,
  hostPort = HOST_PORT,
  status = 'created',
  hostIp = '127.0.0.1',
} = {}) {
  return {
    Id: CONTAINER_ID,
    Image: `sha256:${imageId}`,
    State: { Status: status },
    Config: { Labels: { [VERIFY_RUN_LABEL]: runId } },
    NetworkSettings: {
      Ports:
        status === 'running'
          ? { '6379/tcp': [{ HostIp: hostIp, HostPort: String(hostPort) }] }
          : {},
    },
    HostConfig: {
      PortBindings: {
        '6379/tcp': [{ HostIp: hostIp, HostPort: String(hostPort) }],
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
    this.ended = false;
  }

  async connect() {}

  async ping() {
    if (this.config.username === VERIFY_RUNTIME_USER) {
      return 'PONG';
    }
    if (this.config.username === 'verify_admin') {
      return 'PONG';
    }
    return 'NOAUTH';
  }

  async disconnect() {
    this.ended = true;
  }
}

function buildFakeDocker({
  inspect = containerInspectJson(),
  readyAfterStart = 1,
  wrongLabel = false,
  readinessStall = false,
  createFails = false,
} = {}) {
  const state = {
    status: 'created',
    execAttempts: 0,
    started: false,
  };

  function inspectPayload() {
    const payload = {
      ...inspect,
      State: { Status: state.status },
      Config: {
        Labels: {
          [VERIFY_RUN_LABEL]: wrongLabel ? 'foreign-run' : RUN_ID,
        },
      },
    };
    if (state.status === 'running') {
      payload.NetworkSettings = {
        Ports: {
          '6379/tcp': [{ HostIp: '127.0.0.1', HostPort: String(HOST_PORT) }],
        },
      };
    } else {
      payload.NetworkSettings = { Ports: {} };
      payload.HostConfig = {
        ...payload.HostConfig,
        PortBindings: {
          '6379/tcp': [{ HostIp: '127.0.0.1', HostPort: String(HOST_PORT) }],
        },
      };
    }
    return payload;
  }

  return (command, args) => {
    const key = `${command} ${args.join(' ')}`;
    if (command === 'docker' && args[0] === 'create') {
      if (createFails) {
        return { ok: false, stdout: '', stderr: 'create refused' };
      }
      state.status = 'created';
      return ok(`${CONTAINER_ID}\n`);
    }
    if (command === 'docker' && args[0] === 'start') {
      state.status = 'running';
      state.started = true;
      return ok(CONTAINER_ID);
    }
    if (command === 'docker' && args[0] === 'inspect') {
      if (args[2] === '--format' && args[3] === '{{.Id}}') {
        return ok(`${CONTAINER_ID}\n`);
      }
      if (args[2] === '--format' && args[3] === '{{json .}}') {
        const asArray = args[1] === CONTAINER_ID;
        const body = asArray ? [inspectPayload()] : inspectPayload();
        return ok(JSON.stringify(body));
      }
    }
    if (command === 'docker' && args[0] === 'exec') {
      state.execAttempts += 1;
      if (readinessStall) {
        return ok('LOADING Redis is loading the dataset in memory\n');
      }
      if (state.started && state.execAttempts >= readyAfterStart) {
        const script = args[args.length - 1] ?? '';
        if (script.includes('verify_runtime')) {
          return ok('PONG\n');
        }
        return ok('PONG\n');
      }
      return ok('NOAUTH Authentication required\n');
    }
    return { ok: false, stdout: '', stderr: `unexpected ${key}` };
  };
}

test('buildRedisDockerCreateArgs closes env file path and profile limits', () => {
  const plan = basePlan();
  const args = buildRedisDockerCreateArgs(plan, '/tmp/verify.env');
  assert.match(args.join(' '), /--env-file \/tmp\/verify\.env/);
  assert.match(args.join(' '), /--label offscreen\.verify\.run=run-abc123/);
  assert.ok(args.includes('127.0.0.1::6379'));
  assert.ok(args.includes('--memory'));
  assert.ok(args.includes('128m'));
  assert.ok(args.includes('--read-only'));
  assert.doesNotMatch(args.join(' '), /a{64}/);
  assert.ok(
    args.includes(`${REDIS_IMAGE_PIN}@sha256:${IMAGE_ID}`) ||
      args.some((part) => part.includes(`@sha256:${IMAGE_ID}`)),
  );
});

test('assertLoopbackPortBinding refuses non-loopback hosts', () => {
  const bad = assertLoopbackPortBinding(
    containerInspectJson({ hostIp: '0.0.0.0', status: 'running' }),
  );
  assert.equal(bad.ok, false);
  assert.equal(bad.reason, 'port-not-loopback');
});

test('createRedisDockerResource completes fake create/start/auth', async () => {
  const plan = basePlan();
  const run = buildFakeDocker();
  const result = await createRedisDockerResource({
    profile: 'single',
    run,
    plan,
    Client: FakeRedisClient,
    sleep: async () => {},
    now: (() => {
      let t = 1_000;
      return () => {
        t += 100;
        return t;
      };
    })(),
  });
  assert.equal(result.ok, true, result.reason ?? 'no reason');
  assert.equal(result.publicFacts.runtimeUser, VERIFY_RUNTIME_USER);
  assert.equal(result.publicFacts.port, HOST_PORT);
  assert.doesNotMatch(JSON.stringify(result.publicFacts), /a{64}/);
  assert.equal(result.resource.adminObserver.user, 'verify_admin');
  assert.equal(result.resource.runtime.user, VERIFY_RUNTIME_USER);
  const facts = sanitizeRedisResourcePublicFacts(result.resource);
  assert.equal(facts.keyNamespace, `offscreen:verify:${RUN_ID}`);
});

test('createRedisDockerResource refuses foreign run label at inspect', async () => {
  const plan = basePlan();
  const result = await createRedisDockerResource({
    profile: 'single',
    run: buildFakeDocker({ wrongLabel: true }),
    plan,
    Client: FakeRedisClient,
    sleep: async () => {},
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'foreign-run-label');
});

test('createRedisDockerResource surfaces docker create failure', async () => {
  const plan = basePlan();
  const result = await createRedisDockerResource({
    profile: 'single',
    run: buildFakeDocker({ createFails: true }),
    plan,
    Client: FakeRedisClient,
    sleep: async () => {},
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'docker-create-failed');
});

test('waitForRedisPing surfaces readiness timeout', async () => {
  const nowValues = [0, 100, 200, 100_000];
  let i = 0;
  const result = await waitForRedisPing({
    containerId: CONTAINER_ID,
    run: buildFakeDocker({ readinessStall: true }),
    deadlineMs: 50,
    now: () => nowValues[Math.min(i++, nowValues.length - 1)],
    sleep: async () => {},
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'readiness-timeout');
});

test('assertPreStartContainerState refuses wildcard port binding', async () => {
  const plan = basePlan();
  const inspectPayload = containerInspectJson({
    hostIp: '0.0.0.0',
    status: 'running',
  });
  const run = (command, args) => {
    if (command === 'docker' && args[0] === 'inspect') {
      return ok(JSON.stringify([inspectPayload]));
    }
    return ok(
      JSON.stringify([
        {
          Image: `sha256:${IMAGE_ID}`,
          Config: { Labels: { [VERIFY_RUN_LABEL]: RUN_ID } },
        },
      ]),
    );
  };
  const pre = await assertPreStartContainerState({
    containerId: CONTAINER_ID,
    plan,
    run,
    allowRunning: true,
  });
  assert.equal(pre.ok, false);
  assert.equal(pre.reason, 'port-not-loopback');
});

test('public facts omit credential material from runtime report', async () => {
  const plan = basePlan({
    credentials: {
      adminPassword: 'c0ffee'.repeat(10),
      runtimePassword: 'beef'.repeat(10),
    },
  });
  const result = await createRedisDockerResource({
    profile: 'single',
    run: buildFakeDocker(),
    plan,
    Client: FakeRedisClient,
    sleep: async () => {},
  });
  assert.equal(result.ok, true);
  const serialized = JSON.stringify(result.publicFacts);
  assert.doesNotMatch(serialized, /c0ffee/);
  assert.doesNotMatch(serialized, /beefbeef/);
  assert.doesNotMatch(serialized, /password/i);
});
