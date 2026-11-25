import assert from 'node:assert/strict';
import test from 'node:test';

import { VERIFY_RUN_LABEL, VERIFY_RUNTIME_ROLE } from './docker-plan.mjs';
import {
  assertLoopbackPortBinding,
  assertPreStartContainerState,
  buildPostgresDockerCreateArgs,
  createPostgresDockerResource,
  sanitizePostgresResourcePublicFacts,
  waitForPgIsReady,
} from './docker.mjs';

const RUN_ID = 'run-abc123';
const IMAGE_ID =
  '665dc7b37ac52a17e298511414c21d23ffa4e6a6ef6225b3e5d59c7afb35e994';
const CONTAINER_ID = 'abcabcabcabc123456789abc';
const CONTAINER_NAME = 'offscreen-verify-pg-deadbeef';
const HOST_PORT = 55432;

/** @returns {import('./docker-plan.mjs').CommandResult} */
function ok(stdout = '') {
  return { ok: true, stdout, stderr: '' };
}

function basePlan(overrides = {}) {
  return {
    schemaVersion: 1,
    kind: 'postgres',
    profile: 'single',
    live: false,
    runId: RUN_ID,
    dockerContext: 'default',
    image: 'docker.io/library/postgres:17.11-bookworm',
    imageId: IMAGE_ID,
    imagePulled: false,
    containerName: CONTAINER_NAME,
    labels: { [VERIFY_RUN_LABEL]: RUN_ID },
    database: 'offscreen_db_test',
    adminRole: 'verify_admin',
    runtimeRole: VERIFY_RUNTIME_ROLE,
    limits: {
      memoryMiB: 768,
      cpus: 1,
      maxConnections: 100,
      tmpfsDataMiB: 256,
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
      Ports: {
        '5432/tcp': [{ HostIp: hostIp, HostPort: String(hostPort) }],
      },
    },
    HostConfig: {
      Tmpfs: { '/var/lib/postgresql/data': 'rw,size=268435456' },
    },
    Mounts: [],
  };
}

class FakePgClient {
  constructor(config) {
    this.config = config;
    this.ended = false;
    this.runtimeReady = false;
  }

  async connect() {}

  async query(sql) {
    if (/CREATE ROLE/i.test(sql)) {
      this.runtimeReady = true;
      return { rows: [] };
    }
    if (/BEGIN|COMMIT|ROLLBACK|ALTER|GRANT/i.test(sql)) {
      return { rows: [] };
    }
    if (/current_database/i.test(sql)) {
      const role = this.config.user;
      return {
        rows: [
          {
            database: 'offscreen_db_test',
            role,
            version: 'PostgreSQL 17.11 on x86_64-pc-linux-gnu',
          },
        ],
      };
    }
    if (/rolsuper/i.test(sql)) {
      const superuser = this.config.user === VERIFY_RUNTIME_ROLE ? false : true;
      return { rows: [{ rolsuper: superuser }] };
    }
    throw new Error(`unexpected sql in fake client: ${sql.slice(0, 40)}`);
  }

  async end() {
    this.ended = true;
  }
}

function buildFakeDocker({
  inspect = containerInspectJson(),
  readyAfterStart = 1,
  wrongLabel = false,
  readinessStall = false,
} = {}) {
  const state = {
    status: 'created',
    execAttempts: 0,
    started: false,
  };

  function inspectPayload() {
    return {
      ...inspect,
      State: { Status: state.status },
      Config: {
        Labels: {
          [VERIFY_RUN_LABEL]: wrongLabel ? 'foreign-run' : RUN_ID,
        },
      },
    };
  }

  return (command, args) => {
    const key = `${command} ${args.join(' ')}`;
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
        return ok('/var/run/postgresql:5432 - no response\n');
      }
      if (state.started && state.execAttempts >= readyAfterStart) {
        return ok('/var/run/postgresql:5432 - accepting connections\n');
      }
      return ok('/var/run/postgresql:5432 - no response\n');
    }
    return { ok: false, stdout: '', stderr: `unexpected ${key}` };
  };
}

class WrongRoleFakePgClient extends FakePgClient {
  async query(sql) {
    if (/current_database/i.test(sql)) {
      return {
        rows: [
          {
            database: 'offscreen_db_test',
            role: 'postgres',
            version: 'PostgreSQL 17.11 on x86_64-pc-linux-gnu',
          },
        ],
      };
    }
    return super.query(sql);
  }
}

test('buildPostgresDockerCreateArgs closes env file path and profile limits', () => {
  const plan = basePlan();
  const args = buildPostgresDockerCreateArgs(plan, '/tmp/verify.env');
  assert.match(args.join(' '), /--env-file \/tmp\/verify\.env/);
  assert.match(args.join(' '), /--label offscreen\.verify\.run=run-abc123/);
  assert.match(args.join(' '), /max_connections=100/);
  assert.ok(args.includes('127.0.0.1::5432'));
  assert.ok(args.includes(`--memory`));
  assert.ok(args.includes('768m'));
  assert.ok(
    args.includes(
      `docker.io/library/postgres:17.11-bookworm@sha256:${IMAGE_ID}`,
    ),
  );
});

test('assertLoopbackPortBinding refuses non-loopback hosts', () => {
  const bad = assertLoopbackPortBinding(
    containerInspectJson({ hostIp: '0.0.0.0' }),
  );
  assert.equal(bad.ok, false);
  assert.equal(bad.reason, 'port-not-loopback');
});

test('createPostgresDockerResource completes fake create/start/auth', async () => {
  const plan = basePlan();
  const run = buildFakeDocker();
  const result = await createPostgresDockerResource({
    profile: 'single',
    run,
    plan,
    Client: FakePgClient,
    sleep: async () => {},
    now: (() => {
      let t = 1_000;
      return () => {
        t += 100;
        return t;
      };
    })(),
  });
  assert.equal(result.ok, true);
  assert.equal(result.publicFacts.runtimeRole, VERIFY_RUNTIME_ROLE);
  assert.equal(result.publicFacts.port, HOST_PORT);
  assert.doesNotMatch(JSON.stringify(result.publicFacts), /a{64}/);
  assert.equal(result.resource.adminObserver.role, 'verify_admin');
  assert.equal(result.resource.runtime.role, VERIFY_RUNTIME_ROLE);
  const facts = sanitizePostgresResourcePublicFacts(result.resource);
  assert.equal(facts.database, 'offscreen_db_test');
});

test('createPostgresDockerResource refuses foreign run label at inspect', async () => {
  const plan = basePlan();
  const result = await createPostgresDockerResource({
    profile: 'single',
    run: buildFakeDocker({ wrongLabel: true }),
    plan,
    Client: FakePgClient,
    sleep: async () => {},
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'foreign-run-label');
});

test('createPostgresDockerResource refuses wrong session role', async () => {
  const plan = basePlan();
  const result = await createPostgresDockerResource({
    profile: 'single',
    run: buildFakeDocker(),
    plan,
    Client: WrongRoleFakePgClient,
    sleep: async () => {},
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'unexpected-role');
});

test('waitForPgIsReady surfaces readiness timeout', async () => {
  const nowValues = [0, 100, 200, 100_000];
  let i = 0;
  const result = await waitForPgIsReady({
    containerId: CONTAINER_ID,
    adminRole: 'verify_admin',
    database: 'offscreen_db_test',
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
  const inspectPayload = containerInspectJson({ hostIp: '0.0.0.0' });
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
  const result = await createPostgresDockerResource({
    profile: 'single',
    run: buildFakeDocker(),
    plan,
    Client: FakePgClient,
    sleep: async () => {},
  });
  assert.equal(result.ok, true);
  const serialized = JSON.stringify(result.publicFacts);
  assert.doesNotMatch(serialized, /c0ffee/);
  assert.doesNotMatch(serialized, /beefbeef/);
  assert.doesNotMatch(serialized, /password/i);
});
