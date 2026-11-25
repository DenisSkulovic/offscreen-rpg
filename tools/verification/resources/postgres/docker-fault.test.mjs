import assert from 'node:assert/strict';
import { mkdtempSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { VERIFY_RUN_LABEL, VERIFY_RUNTIME_ROLE } from './docker-plan.mjs';
import {
  RECOVERY_VERIFICATION_PROFILE,
  buildPostgresDockerOwnerReceipt,
  cleanupPartialPostgresDockerResource,
  createPostgresDockerResource,
  releasePostgresDockerResource,
  restartOwnedPostgresDockerContainer,
  terminateOwnedPostgresBackend,
} from './docker.mjs';

const RUN_ID = 'run-fault123';
const IMAGE_ID =
  '665dc7b37ac52a17e298511414c21d23ffa4e6a6ef6225b3e5d59c7afb35e994';
const CONTAINER_ID = 'abcabcabcabc123456789abc';
const CONTAINER_NAME = 'offscreen-verify-pg-faultbeef';
const HOST_PORT = 55432;
const BACKEND_START = '2026-11-25 10:00:00+00';
const TARGET_PID = 4242;

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
  status = 'running',
  hostPort = HOST_PORT,
} = {}) {
  return {
    Id: CONTAINER_ID,
    Image: `sha256:${IMAGE_ID}`,
    State: { Status: status },
    Config: { Labels: { [VERIFY_RUN_LABEL]: runId } },
    NetworkSettings: {
      Ports: {
        '5432/tcp': [{ HostIp: '127.0.0.1', HostPort: String(hostPort) }],
      },
    },
    HostConfig: {
      Tmpfs: { '/var/lib/postgresql/data': 'rw,size=268435456' },
    },
    Mounts: [],
  };
}

class FaultFakePgClient {
  constructor(config) {
    this.config = config;
    this.terminateCalls = [];
    this.statActivity = {
      pid: TARGET_PID,
      datname: 'offscreen_db_test',
      usename: VERIFY_RUNTIME_ROLE,
      backend_start: BACKEND_START,
      pid_rows: 1,
    };
  }

  async connect() {}

  async query(sql, params = []) {
    if (/pg_stat_activity/i.test(sql) && /count/i.test(sql)) {
      return {
        rows: [
          {
            pid: TARGET_PID,
            datname: this.statActivity.datname,
            usename: this.statActivity.usename,
            backend_start: this.statActivity.backend_start,
            pid_rows: this.statActivity.pid_rows,
          },
        ],
      };
    }
    if (/pg_terminate_backend/i.test(sql)) {
      this.terminateCalls.push(params[0]);
      return { rows: [{ pg_terminate_backend: true }] };
    }
    if (/current_database/i.test(sql)) {
      return {
        rows: [
          {
            database: 'offscreen_db_test',
            role: this.config.user,
            version: 'PostgreSQL 17.11 on x86_64-pc-linux-gnu',
          },
        ],
      };
    }
    if (/rolsuper/i.test(sql)) {
      return { rows: [{ rolsuper: false }] };
    }
    throw new Error(`unexpected sql: ${sql.slice(0, 48)}`);
  }

  async end() {}
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
  };

  function inspectBody() {
    if (state.removed) {
      return { ok: false, stdout: '', stderr: 'No such object' };
    }
    const body = containerInspectJson({
      runId: wrongLabel ? 'foreign-run' : RUN_ID,
      status: state.status,
    });
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
      state.execAttempts = 0;
      return ok(CONTAINER_ID);
    }
    if (args[0] === 'exec') {
      state.execAttempts += 1;
      return ok('/var/run/postgresql:5432 - accepting connections\n');
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
      body.State.Status = state.status;
      return ok(JSON.stringify([body]));
    }
    if (command === 'docker' && args[0] === 'exec') {
      state.execAttempts += 1;
      if (state.started) {
        return ok('/var/run/postgresql:5432 - accepting connections\n');
      }
      return ok('/var/run/postgresql:5432 - no response\n');
    }
    return { ok: false, stdout: '', stderr: `unexpected ${args.join(' ')}` };
  };
}

class CreateBootstrapFakePgClient extends FaultFakePgClient {
  async query(sql) {
    if (/CREATE ROLE|BEGIN|COMMIT|ROLLBACK|ALTER|GRANT/i.test(sql)) {
      return { rows: [] };
    }
    return super.query(sql);
  }
}

async function createFixtureResource() {
  const plan = basePlan();
  const created = await createPostgresDockerResource({
    profile: 'single',
    run: buildCreateFakeDocker(),
    plan,
    Client: CreateBootstrapFakePgClient,
    sleep: async () => {},
  });
  assert.equal(created.ok, true);
  return {
    plan,
    resource: created.resource,
    ownerReceipt: created.ownerReceipt,
  };
}

test('restartOwnedPostgresDockerContainer refuses non-recovery profile', async () => {
  const { plan, resource } = await createFixtureResource();
  const result = await restartOwnedPostgresDockerContainer({
    resource,
    plan,
    verificationProfile: 'standard',
    run: buildLifecycleFakeDocker(),
    Client: FaultFakePgClient,
    sleep: async () => {},
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'fault-profile-refused');
});

test('restartOwnedPostgresDockerContainer verifies label then preserves port', async () => {
  const { plan, resource } = await createFixtureResource();
  const run = buildLifecycleFakeDocker();
  const result = await restartOwnedPostgresDockerContainer({
    resource,
    plan,
    verificationProfile: RECOVERY_VERIFICATION_PROFILE,
    run,
    Client: FaultFakePgClient,
    sleep: async () => {},
  });
  assert.equal(result.ok, true);
  assert.equal(result.port, HOST_PORT);
  assert.equal(result.containerId, CONTAINER_ID);
  assert.equal(result.ownerReceipt.partial, false);
});

test('restartOwnedPostgresDockerContainer refuses foreign run label', async () => {
  const { plan, resource } = await createFixtureResource();
  const result = await restartOwnedPostgresDockerContainer({
    resource,
    plan,
    verificationProfile: RECOVERY_VERIFICATION_PROFILE,
    run: buildLifecycleFakeDocker({ wrongLabel: true }),
    Client: FaultFakePgClient,
    sleep: async () => {},
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'foreign-run-label');
});

test('terminateOwnedPostgresBackend requires admin observer and matching backend', async () => {
  const { plan, resource } = await createFixtureResource();
  const client = new FaultFakePgClient({});
  const adminObserver = {
    ...resource.adminObserver,
    async connectClient() {
      return client;
    },
  };
  const refusedRuntime = await terminateOwnedPostgresBackend({
    resource,
    plan,
    observer: resource.runtime,
    pid: TARGET_PID,
    backendStart: BACKEND_START,
  });
  assert.equal(refusedRuntime.ok, false);
  assert.equal(refusedRuntime.reason, 'observer-not-admin');

  const terminated = await terminateOwnedPostgresBackend({
    resource,
    plan,
    observer: adminObserver,
    pid: TARGET_PID,
    backendStart: BACKEND_START,
  });
  assert.equal(terminated.ok, true);
  assert.deepEqual(client.terminateCalls, [TARGET_PID]);
});

test('terminateOwnedPostgresBackend refuses wrong role and backend_start mismatch', async () => {
  const { plan, resource } = await createFixtureResource();
  const wrongRoleClient = new FaultFakePgClient({});
  wrongRoleClient.statActivity.usename = 'postgres';
  const wrongRole = await terminateOwnedPostgresBackend({
    resource,
    plan,
    observer: {
      ...resource.adminObserver,
      async connectClient() {
        return wrongRoleClient;
      },
    },
    pid: TARGET_PID,
    backendStart: BACKEND_START,
  });
  assert.equal(wrongRole.ok, false);
  assert.equal(wrongRole.reason, 'backend-wrong-role');

  const sharedClient = new FaultFakePgClient({});
  sharedClient.statActivity.pid_rows = 2;
  const shared = await terminateOwnedPostgresBackend({
    resource,
    plan,
    observer: {
      ...resource.adminObserver,
      async connectClient() {
        return sharedClient;
      },
    },
    pid: TARGET_PID,
    backendStart: BACKEND_START,
  });
  assert.equal(shared.ok, false);
  assert.equal(shared.reason, 'shared-backend-refused');

  const mismatchClient = new FaultFakePgClient({});
  const mismatch = await terminateOwnedPostgresBackend({
    resource,
    plan,
    observer: {
      ...resource.adminObserver,
      async connectClient() {
        return mismatchClient;
      },
    },
    pid: TARGET_PID,
    backendStart: '2026-11-25 11:00:00+00',
  });
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.reason, 'backend-start-mismatch');
});

test('releasePostgresDockerResource removes by exact ID and cleans private files', async () => {
  const { plan, resource, ownerReceipt } = await createFixtureResource();
  const privateDir = mkdtempSync(join(tmpdir(), 'offscreen-verify-pg-'));
  const privateFile = join(privateDir, 'secret.env');
  writeFileSync(privateFile, 'POSTGRES_PASSWORD=hidden\n', { mode: 0o600 });
  const run = buildLifecycleFakeDocker();

  const released = await releasePostgresDockerResource({
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

  const absentInspect = run('docker', ['inspect', CONTAINER_ID]);
  assert.equal(absentInspect.ok, false);
});

test('releasePostgresDockerResource surfaces cleanup failure', async () => {
  const { plan, resource } = await createFixtureResource();
  const result = await releasePostgresDockerResource({
    resource,
    plan,
    run: buildLifecycleFakeDocker({ rmFails: true }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'cleanup-failed');
});

test('cleanupPartialPostgresDockerResource releases partially created resource', async () => {
  const plan = basePlan();
  const partial = buildPostgresDockerOwnerReceipt(
    {
      runId: plan.runId,
      containerId: CONTAINER_ID,
      containerName: plan.containerName,
      profile: plan.profile,
      imageId: plan.imageId,
      host: '127.0.0.1',
      port: HOST_PORT,
      database: plan.database,
      runtimeRole: plan.runtimeRole,
      adminRole: plan.adminRole,
      serverVersion: null,
      maxConnections: plan.limits.maxConnections,
    },
    { partial: true },
  );
  const run = buildLifecycleFakeDocker();
  const cleaned = await cleanupPartialPostgresDockerResource({
    containerId: CONTAINER_ID,
    plan,
    run,
    partialResource: partial,
  });
  assert.equal(cleaned.ok, true, cleaned.reason ?? 'no reason');
  assert.equal(cleaned.ownerReceipt.partial, true);
});
