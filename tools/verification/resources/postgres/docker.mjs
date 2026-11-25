import { randomBytes } from 'node:crypto';
import { chmodSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { setTimeout } from 'node:timers';

import { runCommand } from '../../../../infra/verification/diagnostic-engine.mjs';
import {
  VERIFY_ADMIN_ROLE,
  VERIFY_DATABASE_NAME,
  VERIFY_RUN_LABEL,
  VERIFY_RUNTIME_ROLE,
  assertOwnedContainerIdentity,
  planPostgresDockerResource,
} from './docker-plan.mjs';

export const STARTUP_TIMEOUT_MS = 90_000;
export const PG_ISREADY_INTERVAL_MS = 500;
export const RECOVERY_VERIFICATION_PROFILE = 'recovery';
const DOCKER_CMD_TIMEOUT_MS = 60_000;
const SECRET_PATTERN =
  /password|passwd|secret|credential|connection.?string|database.?url/i;

/**
 * @param {string} name
 */
export function quotePgIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

/**
 * Hex-only generated passwords are quoted safely for PostgreSQL literals.
 * @param {string} value
 */
export function quotePgLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * @param {import('./docker-plan.mjs').CommandResult} result
 */
function commandFailed(result) {
  return !result?.ok;
}

/**
 * @param {(command: string, args: string[]) => import('./docker-plan.mjs').CommandResult | Promise<import('./docker-plan.mjs').CommandResult>} run
 */
export async function runBounded(
  command,
  args,
  run,
  timeoutMs = DOCKER_CMD_TIMEOUT_MS,
) {
  const maybe = run(command, args);
  if (maybe && typeof maybe.then === 'function') {
    return maybe;
  }
  const sync = /** @type {import('./docker-plan.mjs').CommandResult} */ (maybe);
  if (sync) return sync;
  const asyncResult = await runCommand(command, args, { timeoutMs });
  return {
    ok: asyncResult.code === 0 && !asyncResult.reason,
    stdout: asyncResult.stdout ?? '',
    stderr: asyncResult.stderr ?? '',
  };
}

/**
 * @param {object} plan
 * @param {string} envFilePath
 */
export function buildPostgresDockerCreateArgs(plan, envFilePath) {
  const { limits, containerName, labels, imageId, image } = plan;
  const imageRef = `${image}@sha256:${imageId}`;
  const args = [
    'create',
    '--name',
    containerName,
    '--memory',
    `${limits.memoryMiB}m`,
    '--cpus',
    String(limits.cpus),
    '--tmpfs',
    `/var/lib/postgresql/data:rw,size=${limits.tmpfsDataMiB}m`,
    '-p',
    '127.0.0.1::5432',
    '--env-file',
    envFilePath,
  ];
  for (const [key, value] of Object.entries(labels)) {
    args.push('--label', `${key}=${value}`);
  }
  args.push(
    imageRef,
    'postgres',
    '-c',
    `max_connections=${limits.maxConnections}`,
  );
  return args;
}

/**
 * @param {object} info docker inspect element
 */
export function assertLoopbackPortBinding(info) {
  const ports = info.NetworkSettings?.Ports?.['5432/tcp'];
  if (!Array.isArray(ports) || ports.length !== 1) {
    return { ok: false, reason: 'port-binding-invalid' };
  }
  const binding = ports[0];
  if (binding.HostIp !== '127.0.0.1') {
    return { ok: false, reason: 'port-not-loopback' };
  }
  const hostPort = Number.parseInt(String(binding.HostPort ?? ''), 10);
  if (!Number.isFinite(hostPort) || hostPort <= 0) {
    return { ok: false, reason: 'port-unavailable' };
  }
  return { ok: true, host: '127.0.0.1', port: hostPort };
}

/**
 * @param {object} info
 */
export function assertTmpfsOnlyDataMount(info) {
  const mounts = info.Mounts ?? [];
  for (const mount of mounts) {
    if (mount.Type === 'volume') {
      return { ok: false, reason: 'external-volume-mount' };
    }
    if (
      mount.Type === 'bind' &&
      String(mount.Destination ?? '').startsWith('/var/lib/postgresql')
    ) {
      return { ok: false, reason: 'bind-data-mount' };
    }
  }
  const tmpfs = info.HostConfig?.Tmpfs ?? {};
  const dataTmpfs = tmpfs['/var/lib/postgresql/data'];
  if (!dataTmpfs) {
    return { ok: false, reason: 'tmpfs-data-missing' };
  }
  return { ok: true };
}

/**
 * @param {{
 *   containerId: string,
 *   plan: object,
 *   run: (command: string, args: string[]) => import('./docker-plan.mjs').CommandResult | Promise<import('./docker-plan.mjs').CommandResult>,
 * }} input
 */
export async function assertPreStartContainerState({
  containerId,
  plan,
  run,
  allowRunning = false,
}) {
  const owned = assertOwnedContainerIdentity({ containerId, plan, run });
  if (!owned.ok) return owned;

  const inspect = await runBounded(
    'docker',
    ['inspect', containerId, '--format', '{{json .}}'],
    run,
  );
  if (commandFailed(inspect)) {
    return { ok: false, reason: 'container-unreadable' };
  }
  let info;
  try {
    const rows = JSON.parse(inspect.stdout);
    info = Array.isArray(rows) ? rows[0] : rows;
  } catch {
    return { ok: false, reason: 'container-unreadable' };
  }
  if (!info) return { ok: false, reason: 'container-unreadable' };

  const port = assertLoopbackPortBinding(info);
  if (!port.ok) return port;
  const mounts = assertTmpfsOnlyDataMount(info);
  if (!mounts.ok) return mounts;

  const status = info.State?.Status;
  const allowed = allowRunning
    ? status === 'created' || status === 'exited' || status === 'running'
    : status === 'created' || status === 'exited';
  if (!allowed) {
    return { ok: false, reason: 'container-not-created' };
  }

  return {
    ok: true,
    containerId,
    host: port.host,
    port: port.port,
    runId: plan.runId,
    running: status === 'running',
  };
}

/**
 * @param {string} path
 * @param {object} plan
 */
export function writeBootstrapEnvFile(path, plan) {
  const body = [
    `POSTGRES_USER=${VERIFY_ADMIN_ROLE}`,
    `POSTGRES_PASSWORD=${plan.credentials.adminPassword}`,
    `POSTGRES_DB=${VERIFY_DATABASE_NAME}`,
    '',
  ].join('\n');
  writeFileSync(path, body, { encoding: 'utf8', mode: 0o600 });
  try {
    chmodSync(path, 0o600);
  } catch {
    /* best effort */
  }
}

/**
 * @param {import('pg').Client} client
 * @param {object} plan
 */
export async function bootstrapVerifyRuntimeRole(client, plan) {
  const runtimeIdent = quotePgIdent(VERIFY_RUNTIME_ROLE);
  const dbIdent = quotePgIdent(VERIFY_DATABASE_NAME);
  const runtimePassword = quotePgLiteral(plan.credentials.runtimePassword);

  await client.query('BEGIN');
  try {
    await client.query(
      `CREATE ROLE ${runtimeIdent} WITH LOGIN PASSWORD ${runtimePassword} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`,
    );
    await client.query(`ALTER DATABASE ${dbIdent} OWNER TO ${runtimeIdent}`);
    await client.query(`ALTER SCHEMA public OWNER TO ${runtimeIdent}`);
    await client.query(
      `GRANT ALL PRIVILEGES ON SCHEMA public TO ${runtimeIdent}`,
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

/**
 * @param {import('pg').Client} client
 */
export async function readSessionIdentity(client) {
  const result = await client.query(
    'SELECT current_database() AS database, current_user AS role, version() AS version',
  );
  const row = result.rows[0];
  return {
    database: String(row.database),
    role: String(row.role),
    version: String(row.version),
  };
}

/**
 * @param {import('pg').Client} client
 */
export async function assertRuntimeNotSuperuser(client) {
  const result = await client.query(
    'SELECT rolsuper FROM pg_roles WHERE rolname = current_user',
  );
  const rolsuper = result.rows[0]?.rolsuper;
  if (rolsuper === true || rolsuper === 't') {
    return { ok: false, reason: 'runtime-is-superuser' };
  }
  return { ok: true };
}

/**
 * @param {{
 *   host: string,
 *   port: number,
 *   database: string,
 *   user: string,
 *   password: string,
 *   Client: typeof import('pg').Client,
 * }} config
 */
export async function withPgClient(config, fn) {
  const client = new config.Client({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    connectionTimeoutMillis: 5_000,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}

/**
 * @param {{
 *   host: string,
 *   port: number,
 *   database: string,
 *   user: string,
 *   password: string,
 *   Client: typeof import('pg').Client,
 * }} connect
 */
export function createPrivatePgHandle(connect) {
  return Object.freeze({
    kind: 'postgres-connection',
    host: connect.host,
    port: connect.port,
    database: connect.database,
    role: connect.user,
    async connectClient() {
      const client = new connect.Client({
        host: connect.host,
        port: connect.port,
        database: connect.database,
        user: connect.user,
        password: connect.password,
        connectionTimeoutMillis: 5_000,
      });
      await client.connect();
      return client;
    },
  });
}

/**
 * @param {object} resource
 */
/**
 * @param {string} verificationProfile
 */
export function assertRecoveryFaultProfile(verificationProfile) {
  if (verificationProfile !== RECOVERY_VERIFICATION_PROFILE) {
    return { ok: false, reason: 'fault-profile-refused' };
  }
  return { ok: true };
}

/**
 * Owner receipt for manual recovery; never includes credentials.
 * @param {object} resource
 * @param {{ partial?: boolean }} [options]
 */
export function buildPostgresDockerOwnerReceipt(resource, options = {}) {
  const receipt = {
    kind: 'postgres-docker-owner',
    schemaVersion: 1,
    partial: Boolean(options.partial ?? resource.partial),
    runId: resource.runId,
    containerId: resource.containerId,
    containerName: resource.containerName,
    profile: resource.profile,
    imageId: resource.imageId,
    host: resource.host ?? null,
    port: resource.port ?? null,
    database: resource.database,
    runtimeRole: resource.runtimeRole,
    adminRole: resource.adminRole,
    serverVersion: resource.serverVersion ?? null,
    maxConnections: resource.maxConnections ?? null,
  };
  if (SECRET_PATTERN.test(JSON.stringify(receipt))) {
    throw new Error('owner receipt would expose secrets');
  }
  return receipt;
}

/**
 * @param {string} value
 */
export function normalizeBackendStart(value) {
  return String(value ?? '')
    .trim()
    .replace(/\.\d+(?:[+-]\d+)?$/, '');
}

/**
 * @param {{
 *   containerId: string,
 *   run: (command: string, args: string[]) => import('./docker-plan.mjs').CommandResult | Promise<import('./docker-plan.mjs').CommandResult>,
 * }} input
 */
export async function verifyContainerAbsent({ containerId, run }) {
  if (!containerId || !/^[a-f0-9]{12,64}$/i.test(containerId)) {
    return { ok: false, reason: 'foreign-container-id' };
  }
  const inspect = await runBounded('docker', ['inspect', containerId], run);
  if (!commandFailed(inspect)) {
    return { ok: false, reason: 'container-still-present' };
  }
  return { ok: true, containerId };
}

/**
 * @param {{
 *   resource: object,
 *   plan: object,
 *   verificationProfile: string,
 *   run: (command: string, args: string[]) => import('./docker-plan.mjs').CommandResult | Promise<import('./docker-plan.mjs').CommandResult>,
 *   Client?: typeof import('pg').Client,
 *   startupTimeoutMs?: number,
 *   now?: () => number,
 *   sleep?: (ms: number) => Promise<void>,
 * }} input
 */
export async function restartOwnedPostgresDockerContainer(input) {
  const profileGate = assertRecoveryFaultProfile(input.verificationProfile);
  if (!profileGate.ok) return profileGate;

  const containerId = input.resource.containerId;
  const owned = await assertPreStartContainerState({
    containerId,
    plan: input.plan,
    run: input.run,
    allowRunning: true,
  });
  if (!owned.ok) return owned;

  const host = owned.host;
  const port = owned.port;

  const restarted = await runBounded(
    'docker',
    ['restart', containerId],
    input.run,
  );
  if (commandFailed(restarted)) {
    return { ok: false, reason: 'docker-restart-failed', containerId };
  }

  const ready = await waitForPgIsReady({
    containerId,
    adminRole: VERIFY_ADMIN_ROLE,
    database: VERIFY_DATABASE_NAME,
    run: input.run,
    deadlineMs: input.startupTimeoutMs ?? STARTUP_TIMEOUT_MS,
    now: input.now,
    sleep: input.sleep,
  });
  if (!ready.ok) {
    return { ok: false, reason: ready.reason, containerId };
  }

  const after = await assertPreStartContainerState({
    containerId,
    plan: input.plan,
    run: input.run,
    allowRunning: true,
  });
  if (!after.ok) return after;
  if (after.host !== host || after.port !== port) {
    return { ok: false, reason: 'port-changed-after-restart', containerId };
  }

  const pgClient = input.Client ?? (await import('pg')).Client;
  const runtimeConnect = {
    host,
    port,
    database: VERIFY_DATABASE_NAME,
    user: VERIFY_RUNTIME_ROLE,
    password: input.plan.credentials.runtimePassword,
    Client: pgClient,
  };

  try {
    await withPgClient(runtimeConnect, async (client) => {
      const identity = await readSessionIdentity(client);
      if (identity.database !== VERIFY_DATABASE_NAME) {
        throw Object.assign(new Error('unexpected database'), {
          reason: 'unexpected-database',
        });
      }
      if (identity.role !== VERIFY_RUNTIME_ROLE) {
        throw Object.assign(new Error('unexpected role'), {
          reason: 'unexpected-role',
        });
      }
      const superuser = await assertRuntimeNotSuperuser(client);
      if (!superuser.ok) {
        throw Object.assign(new Error(superuser.reason ?? 'superuser'), {
          reason: superuser.reason,
        });
      }
    });
  } catch (error) {
    const reason =
      /** @type {{ reason?: string }} */ (error).reason ??
      'runtime-auth-failed';
    return { ok: false, reason, containerId };
  }

  const resource = { ...input.resource, host, port };
  return {
    ok: true,
    containerId,
    host,
    port,
    ownerReceipt: buildPostgresDockerOwnerReceipt(resource),
  };
}

/**
 * @param {import('pg').Client} client
 * @param {number} pid
 */
export async function readOwnedBackendActivity(client, pid) {
  const result = await client.query(
    `SELECT pid,
            datname,
            usename,
            backend_start::text AS backend_start,
            (SELECT count(*)::int FROM pg_stat_activity WHERE pid = $1) AS pid_rows
     FROM pg_stat_activity
     WHERE pid = $1`,
    [pid],
  );
  return result.rows[0] ?? null;
}

/**
 * @param {{
 *   resource: object,
 *   plan: object,
 *   observer: object,
 *   pid: number,
 *   backendStart?: string | null,
 *   Client?: typeof import('pg').Client,
 * }} input
 */
export async function terminateOwnedPostgresBackend(input) {
  if (!input.observer || input.observer.kind !== 'postgres-connection') {
    return { ok: false, reason: 'observer-required' };
  }
  if (
    input.observer === input.resource.runtime ||
    input.observer.role === input.resource.runtimeRole
  ) {
    return { ok: false, reason: 'observer-not-admin' };
  }
  if (input.observer.role !== VERIFY_ADMIN_ROLE) {
    return { ok: false, reason: 'observer-not-admin' };
  }
  const pid = Number(input.pid);
  if (!Number.isInteger(pid) || pid <= 0) {
    return { ok: false, reason: 'backend-pid-required' };
  }

  const client = await input.observer.connectClient();
  try {
    const row = await readOwnedBackendActivity(client, pid);
    if (!row) {
      return { ok: false, reason: 'backend-not-found' };
    }
    if (Number(row.pid_rows) !== 1) {
      return { ok: false, reason: 'shared-backend-refused' };
    }
    if (String(row.datname) !== VERIFY_DATABASE_NAME) {
      return { ok: false, reason: 'backend-wrong-database' };
    }
    if (String(row.usename) !== VERIFY_RUNTIME_ROLE) {
      return { ok: false, reason: 'backend-wrong-role' };
    }
    if (
      input.backendStart &&
      normalizeBackendStart(row.backend_start) !==
        normalizeBackendStart(input.backendStart)
    ) {
      return { ok: false, reason: 'backend-start-mismatch' };
    }
    await client.query('SELECT pg_terminate_backend($1)', [pid]);
    return { ok: true, pid };
  } finally {
    await client.end().catch(() => {});
  }
}

/**
 * @param {{
 *   resource?: object,
 *   plan?: object,
 *   containerId?: string,
 *   run: (command: string, args: string[]) => import('./docker-plan.mjs').CommandResult | Promise<import('./docker-plan.mjs').CommandResult>,
 *   privatePaths?: string[],
 * }} input
 */
export async function releasePostgresDockerResource(input) {
  const containerId = input.containerId ?? input.resource?.containerId;
  if (!containerId || !/^[a-f0-9]{12,64}$/i.test(containerId)) {
    return { ok: false, reason: 'release-id-required' };
  }
  if (!input.plan) {
    return { ok: false, reason: 'release-plan-required' };
  }

  const owned = assertOwnedContainerIdentity({
    containerId,
    plan: input.plan,
    run: input.run,
  });
  if (!owned.ok) return owned;

  const rm = await runBounded('docker', ['rm', '-f', containerId], input.run);
  if (commandFailed(rm)) {
    return { ok: false, reason: 'cleanup-failed', containerId };
  }

  const absent = await verifyContainerAbsent({ containerId, run: input.run });
  if (!absent.ok) return absent;

  const paths = [
    ...(input.privatePaths ?? []),
    ...(input.resource?.privatePaths ?? []),
  ];
  for (const path of paths) {
    try {
      unlinkSync(path);
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') {
        return { ok: false, reason: 'private-cleanup-failed', containerId };
      }
    }
  }

  const receipt = input.resource
    ? buildPostgresDockerOwnerReceipt(input.resource)
    : buildPostgresDockerOwnerReceipt(
        {
          runId: input.plan.runId,
          containerId,
          containerName: input.plan.containerName,
          profile: input.plan.profile,
          imageId: input.plan.imageId,
          host: input.resource?.host ?? null,
          port: input.resource?.port ?? null,
          database: input.plan.database,
          runtimeRole: input.plan.runtimeRole,
          adminRole: input.plan.adminRole,
          serverVersion: input.resource?.serverVersion ?? null,
          maxConnections: input.plan.limits?.maxConnections ?? null,
        },
        { partial: !input.resource?.runtime },
      );

  return { ok: true, containerId, ownerReceipt: receipt };
}

/**
 * @param {{
 *   containerId: string | null | undefined,
 *   plan: object,
 *   run: (command: string, args: string[]) => import('./docker-plan.mjs').CommandResult | Promise<import('./docker-plan.mjs').CommandResult>,
 *   privatePaths?: string[],
 *   partialResource?: object,
 * }} input
 */
export async function cleanupPartialPostgresDockerResource(input) {
  if (!input.containerId) {
    return { ok: true, reason: 'nothing-to-clean' };
  }
  return releasePostgresDockerResource({
    containerId: input.containerId,
    plan: input.plan,
    run: input.run,
    privatePaths: input.privatePaths,
    resource: input.partialResource,
  });
}

export function sanitizePostgresResourcePublicFacts(resource) {
  const json = JSON.stringify(resource);
  if (SECRET_PATTERN.test(json)) {
    throw new Error('public facts would expose secrets');
  }
  return {
    kind: 'postgres-docker',
    runId: resource.runId,
    containerId: resource.containerId,
    containerName: resource.containerName,
    profile: resource.profile,
    imageId: resource.imageId,
    host: resource.host,
    port: resource.port,
    database: resource.database,
    runtimeRole: resource.runtimeRole,
    adminRole: resource.adminRole,
    serverVersion: resource.serverVersion,
    maxConnections: resource.maxConnections,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {{
 *   containerId: string,
 *   adminRole: string,
 *   database: string,
 *   run: (command: string, args: string[]) => import('./docker-plan.mjs').CommandResult | Promise<import('./docker-plan.mjs').CommandResult>,
 *   deadlineMs: number,
 *   now?: () => number,
 *   sleep?: (ms: number) => Promise<void>,
 * }} input
 */
export async function waitForPgIsReady(input) {
  const now = input.now ?? (() => Date.now());
  const sleepFn = input.sleep ?? sleep;
  const start = now();
  while (now() - start < input.deadlineMs) {
    const probe = await runBounded(
      'docker',
      [
        'exec',
        input.containerId,
        'pg_isready',
        '-U',
        input.adminRole,
        '-d',
        input.database,
      ],
      input.run,
    );
    if (!commandFailed(probe) && /accepting connections/i.test(probe.stdout)) {
      return { ok: true };
    }
    await sleepFn(PG_ISREADY_INTERVAL_MS);
  }
  return { ok: false, reason: 'readiness-timeout' };
}

/**
 * @param {{
 *   runId: string,
 *   containerName: string,
 *   containerId: string,
 *   plan: object,
 *   run: (command: string, args: string[]) => import('./docker-plan.mjs').CommandResult | Promise<import('./docker-plan.mjs').CommandResult>,
 * }} input
 */
export async function reconcileInterruptedPostgresDocker({
  runId,
  containerName,
  containerId,
  plan,
  run,
}) {
  if (!containerId || !/^[a-f0-9]{12,64}$/i.test(containerId)) {
    return { ok: false, reason: 'reconcile-id-required' };
  }
  if (containerName !== plan.containerName) {
    return { ok: false, reason: 'reconcile-name-mismatch' };
  }
  if (plan.runId !== runId || plan.labels[VERIFY_RUN_LABEL] !== runId) {
    return { ok: false, reason: 'reconcile-run-mismatch' };
  }
  const owned = assertOwnedContainerIdentity({ containerId, plan, run });
  if (!owned.ok) return owned;
  const byName = await runBounded(
    'docker',
    ['inspect', containerName, '--format', '{{.Id}}'],
    run,
  );
  if (commandFailed(byName)) {
    return { ok: false, reason: 'reconcile-ambiguous' };
  }
  const observed = byName.stdout.trim().replace(/^"|"$/g, '').toLowerCase();
  const expected = containerId.toLowerCase();
  if (
    !observed ||
    !(observed === expected || observed.startsWith(expected.slice(0, 12)))
  ) {
    return { ok: false, reason: 'reconcile-ambiguous' };
  }
  return { ok: true, containerId, runId };
}

/**
 * @param {{
 *   profile: string,
 *   runId?: string,
 *   live?: boolean,
 *   env?: NodeJS.ProcessEnv,
 *   run?: (command: string, args: string[]) => import('./docker-plan.mjs').CommandResult | Promise<import('./docker-plan.mjs').CommandResult>,
 *   plan?: object,
 *   Client?: typeof import('pg').Client,
 *   now?: () => number,
 *   sleep?: (ms: number) => Promise<void>,
 *   startupTimeoutMs?: number,
 *   reconcile?: { containerId: string } | null,
 * }} options
 */
export async function createPostgresDockerResource(options) {
  const {
    profile,
    runId = randomBytes(8).toString('hex'),
    live = false,
    env = process.env,
    run,
    Client,
    now = () => Date.now(),
    sleep: delay = sleep,
    startupTimeoutMs = STARTUP_TIMEOUT_MS,
    reconcile = null,
  } = options;

  let plan = options.plan;
  if (!plan) {
    const planned = planPostgresDockerResource({
      profile,
      runId,
      live,
      env,
      run:
        run ??
        (() => ({ ok: false, stdout: '', stderr: 'run adapter missing' })),
    });
    if (!planned.ok) return planned;
    plan = planned.plan;
  }

  const pgClient = Client ?? (await import('pg')).Client;

  let containerId;
  let host;
  let port;

  if (reconcile?.containerId) {
    const reconciled = await reconcileInterruptedPostgresDocker({
      runId: plan.runId,
      containerName: plan.containerName,
      containerId: reconcile.containerId,
      plan,
      run: /** @type {any} */ (run),
    });
    if (!reconciled.ok) return reconciled;
    containerId = reconciled.containerId;
    const pre = await assertPreStartContainerState({
      containerId,
      plan,
      run: /** @type {any} */ (run),
      allowRunning: true,
    });
    if (!pre.ok) return pre;
    host = pre.host;
    port = pre.port;
    if (!pre.running) {
      const started = await runBounded(
        'docker',
        ['start', containerId],
        /** @type {any} */ (run),
      );
      if (commandFailed(started)) {
        return { ok: false, reason: 'docker-start-failed', containerId };
      }
    }
  } else {
    const envPath = join(
      tmpdir(),
      `offscreen-verify-pg-${randomBytes(8).toString('hex')}.env`,
    );
    try {
      writeBootstrapEnvFile(envPath, plan);
      const createArgs = buildPostgresDockerCreateArgs(plan, envPath);
      const created = await runBounded(
        'docker',
        createArgs,
        /** @type {any} */ (run),
      );
      if (commandFailed(created)) {
        return { ok: false, reason: 'docker-create-failed' };
      }
      containerId = created.stdout.trim();
      if (!containerId) {
        return { ok: false, reason: 'docker-create-no-id' };
      }
    } finally {
      try {
        unlinkSync(envPath);
      } catch {
        /* ignore */
      }
    }

    const pre = await assertPreStartContainerState({
      containerId,
      plan,
      run: /** @type {any} */ (run),
    });
    if (!pre.ok) return pre;
    host = pre.host;
    port = pre.port;

    const started = await runBounded(
      'docker',
      ['start', containerId],
      /** @type {any} */ (run),
    );
    if (commandFailed(started)) {
      return { ok: false, reason: 'docker-start-failed', containerId };
    }
  }

  const startupAt = now();
  const ready = await waitForPgIsReady({
    containerId,
    adminRole: VERIFY_ADMIN_ROLE,
    database: VERIFY_DATABASE_NAME,
    run: /** @type {any} */ (run),
    deadlineMs: startupTimeoutMs,
    now,
    sleep: delay,
  });
  if (!ready.ok) {
    return {
      ok: false,
      reason: ready.reason,
      containerId,
      ownerReceipt: buildPostgresDockerOwnerReceipt(
        {
          runId: plan.runId,
          containerId,
          containerName: plan.containerName,
          profile: plan.profile,
          imageId: plan.imageId,
          host,
          port,
          database: VERIFY_DATABASE_NAME,
          runtimeRole: VERIFY_RUNTIME_ROLE,
          adminRole: VERIFY_ADMIN_ROLE,
          serverVersion: null,
          maxConnections: plan.limits.maxConnections,
        },
        { partial: true },
      ),
    };
  }

  const adminConnect = {
    host,
    port,
    database: VERIFY_DATABASE_NAME,
    user: VERIFY_ADMIN_ROLE,
    password: plan.credentials.adminPassword,
    Client: pgClient,
  };

  let serverVersion = null;
  try {
    await withPgClient(adminConnect, async (client) => {
      const identity = await readSessionIdentity(client);
      if (identity.database !== VERIFY_DATABASE_NAME) {
        throw Object.assign(new Error('unexpected database'), {
          reason: 'unexpected-database',
        });
      }
      if (identity.role !== VERIFY_ADMIN_ROLE) {
        throw Object.assign(new Error('unexpected admin role'), {
          reason: 'unexpected-role',
        });
      }
      if (!/PostgreSQL\s+17\./i.test(identity.version)) {
        throw Object.assign(new Error('unexpected server version'), {
          reason: 'unexpected-server-version',
        });
      }
      serverVersion = identity.version;
      await bootstrapVerifyRuntimeRole(client, plan);
    });
  } catch (error) {
    const reason =
      /** @type {{ reason?: string }} */ (error).reason ??
      'admin-bootstrap-failed';
    return {
      ok: false,
      reason,
      containerId,
      ownerReceipt: buildPostgresDockerOwnerReceipt(
        {
          runId: plan.runId,
          containerId,
          containerName: plan.containerName,
          profile: plan.profile,
          imageId: plan.imageId,
          host,
          port,
          database: VERIFY_DATABASE_NAME,
          runtimeRole: VERIFY_RUNTIME_ROLE,
          adminRole: VERIFY_ADMIN_ROLE,
          serverVersion,
          maxConnections: plan.limits.maxConnections,
        },
        { partial: true },
      ),
    };
  }

  const runtimeConnect = {
    host,
    port,
    database: VERIFY_DATABASE_NAME,
    user: VERIFY_RUNTIME_ROLE,
    password: plan.credentials.runtimePassword,
    Client: pgClient,
  };

  try {
    await withPgClient(runtimeConnect, async (client) => {
      const identity = await readSessionIdentity(client);
      if (identity.database !== VERIFY_DATABASE_NAME) {
        throw Object.assign(new Error('unexpected database'), {
          reason: 'unexpected-database',
        });
      }
      if (identity.role !== VERIFY_RUNTIME_ROLE) {
        throw Object.assign(new Error('unexpected role'), {
          reason: 'unexpected-role',
        });
      }
      const superuser = await assertRuntimeNotSuperuser(client);
      if (!superuser.ok) {
        throw Object.assign(new Error(superuser.reason ?? 'superuser'), {
          reason: superuser.reason,
        });
      }
    });
  } catch (error) {
    const reason =
      /** @type {{ reason?: string }} */ (error).reason ??
      'runtime-auth-failed';
    return {
      ok: false,
      reason,
      containerId,
      ownerReceipt: buildPostgresDockerOwnerReceipt(
        {
          runId: plan.runId,
          containerId,
          containerName: plan.containerName,
          profile: plan.profile,
          imageId: plan.imageId,
          host,
          port,
          database: VERIFY_DATABASE_NAME,
          runtimeRole: VERIFY_RUNTIME_ROLE,
          adminRole: VERIFY_ADMIN_ROLE,
          serverVersion,
          maxConnections: plan.limits.maxConnections,
        },
        { partial: true },
      ),
    };
  }

  const runtimeHandle = createPrivatePgHandle(runtimeConnect);
  const adminObserverHandle = createPrivatePgHandle(adminConnect);

  const resource = {
    runId: plan.runId,
    profile: plan.profile,
    containerId,
    containerName: plan.containerName,
    imageId: plan.imageId,
    host,
    port,
    database: VERIFY_DATABASE_NAME,
    runtimeRole: VERIFY_RUNTIME_ROLE,
    adminRole: VERIFY_ADMIN_ROLE,
    serverVersion,
    maxConnections: plan.limits.maxConnections,
    startupMs: Math.max(0, now() - startupAt),
    runtime: runtimeHandle,
    adminObserver: adminObserverHandle,
  };

  const publicFacts = sanitizePostgresResourcePublicFacts(resource);
  Object.defineProperty(resource, 'runtimeConnect', {
    value: Object.freeze({
      host,
      port,
      database: VERIFY_DATABASE_NAME,
      user: VERIFY_RUNTIME_ROLE,
      password: plan.credentials.runtimePassword,
    }),
    enumerable: false,
    writable: false,
    configurable: false,
  });

  return {
    ok: true,
    resource,
    publicFacts,
    ownerReceipt: buildPostgresDockerOwnerReceipt(resource),
  };
}
