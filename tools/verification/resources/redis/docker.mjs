import { randomBytes } from 'node:crypto';
import { chmodSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { setTimeout } from 'node:timers';

import { runBounded } from '../postgres/docker.mjs';
import {
  VERIFY_ADMIN_USER,
  VERIFY_RUN_LABEL,
  VERIFY_RUNTIME_USER,
  assertOwnedContainerIdentity,
  planRedisDockerResource,
} from './docker-plan.mjs';

export const STARTUP_TIMEOUT_MS = 60_000;
export const CLEANUP_TIMEOUT_MS = 30_000;
export const REDIS_PING_INTERVAL_MS = 500;
export const RECOVERY_VERIFICATION_PROFILE = 'recovery';
export const CLIENT_PAUSE_MAX_MS = 350;

const DOCKER_CMD_TIMEOUT_MS = CLEANUP_TIMEOUT_MS;
const SECRET_PATTERN = /password|passwd|secret|credential|redis.?url|acl/i;

/**
 * @param {import('./docker-plan.mjs').CommandResult} result
 */
function commandFailed(result) {
  return !result?.ok;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {object} info docker inspect element
 */
export function assertLoopbackPortBinding(info) {
  const status = info.State?.Status;
  if (status === 'running') {
    const ports = info.NetworkSettings?.Ports?.['6379/tcp'];
    if (!Array.isArray(ports) || ports.length !== 1) {
      return { ok: false, reason: 'port-binding-invalid' };
    }
    for (const binding of ports) {
      const hostIp = String(binding.HostIp ?? '');
      if (hostIp === '::' || hostIp.startsWith('::')) {
        return { ok: false, reason: 'port-ipv6-rejected' };
      }
      if (hostIp !== '127.0.0.1') {
        return { ok: false, reason: 'port-not-loopback' };
      }
    }
    const hostPort = Number.parseInt(String(ports[0].HostPort ?? ''), 10);
    if (!Number.isFinite(hostPort) || hostPort <= 0) {
      return { ok: false, reason: 'port-unavailable' };
    }
    return { ok: true, host: '127.0.0.1', port: hostPort };
  }

  const bindings = info.HostConfig?.PortBindings?.['6379/tcp'];
  if (!Array.isArray(bindings) || bindings.length !== 1) {
    return { ok: false, reason: 'port-binding-invalid' };
  }
  const binding = bindings[0];
  const hostIp = String(binding.HostIp ?? '');
  if (hostIp === '0.0.0.0' || hostIp === '' || hostIp === '::') {
    return { ok: false, reason: 'port-not-loopback' };
  }
  if (hostIp !== '127.0.0.1') {
    return { ok: false, reason: 'port-not-loopback' };
  }
  const hostPort = binding.HostPort
    ? Number.parseInt(String(binding.HostPort), 10)
    : null;
  return { ok: true, host: '127.0.0.1', port: hostPort };
}

/**
 * @param {object} info
 */
export function assertNoHostMounts(info) {
  const mounts = info.Mounts ?? [];
  for (const mount of mounts) {
    if (mount.Type === 'volume' || mount.Type === 'bind') {
      return { ok: false, reason: 'external-mount' };
    }
  }
  const tmpfs = info.HostConfig?.Tmpfs ?? {};
  const dataTmpfs = tmpfs['/data'];
  if (!dataTmpfs) {
    return { ok: false, reason: 'tmpfs-data-missing' };
  }
  const runTmpfs = tmpfs['/run/verify'];
  if (!runTmpfs) {
    return { ok: false, reason: 'tmpfs-config-missing' };
  }
  return { ok: true };
}

/**
 * @param {string} path
 * @param {object} plan
 */
export function writeBootstrapEnvFile(path, plan) {
  const maxmemory = `${plan.limits.maxmemoryMiB}mb`;
  const body = [
    `VERIFY_ADMIN_PASSWORD=${plan.credentials.adminPassword}`,
    `VERIFY_RUNTIME_PASSWORD=${plan.credentials.runtimePassword}`,
    `VERIFY_KEY_NAMESPACE=${plan.keyNamespace}`,
    `VERIFY_MAXMEMORY=${maxmemory}`,
    `VERIFY_MAXMEMORY_POLICY=${plan.limits.maxmemoryPolicy}`,
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
 * Build owned entrypoint that stages ACL/config on private tmpfs from container env.
 * @param {object} plan
 */
export function buildRedisContainerBootstrapCommand(plan) {
  const maxmemory = `${plan.limits.maxmemoryMiB}mb`;
  const policy = plan.limits.maxmemoryPolicy;
  const script =
    'set -eu; ' +
    'mkdir -p /run/verify; ' +
    `printf '%s\\n' "port 6379" "bind 127.0.0.1" "protected-mode yes" "save \\"\\"" "appendonly no" "maxmemory ${maxmemory}" "maxmemory-policy ${policy}" "aclfile /run/verify/users.acl" > /run/verify/redis.conf; ` +
    `printf '%s\\n' "user default off" "user ${VERIFY_ADMIN_USER} on >$VERIFY_ADMIN_PASSWORD ~* &* +@all -@dangerous" "user ${VERIFY_RUNTIME_USER} on >$VERIFY_RUNTIME_PASSWORD ~$VERIFY_KEY_NAMESPACE:* +get +set +ping" > /run/verify/users.acl; ` +
    'exec redis-server /run/verify/redis.conf';
  return ['sh', '-c', script];
}

/**
 * @param {object} plan
 * @param {string} envFilePath
 */
export function buildRedisDockerCreateArgs(plan, envFilePath) {
  const { limits, containerName, labels, imageId, image } = plan;
  const imageRef = `${image}@sha256:${imageId}`;
  const bootstrap = buildRedisContainerBootstrapCommand(plan);
  const args = [
    'create',
    '--name',
    containerName,
    '--memory',
    `${limits.memoryMiB}m`,
    '--cpus',
    String(limits.cpus),
    '--tmpfs',
    `/data:rw,size=${limits.tmpfsDataMiB}m`,
    '--tmpfs',
    '/run/verify:rw,size=8m',
    '-p',
    '127.0.0.1::6379',
    '--env-file',
    envFilePath,
    '--read-only',
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges',
  ];
  for (const [key, value] of Object.entries(labels)) {
    args.push('--label', `${key}=${value}`);
  }
  args.push(imageRef, ...bootstrap);
  return args;
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
    DOCKER_CMD_TIMEOUT_MS,
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
  const mounts = assertNoHostMounts(info);
  if (!mounts.ok) return mounts;

  const status = info.State?.Status;
  const allowed = allowRunning
    ? status === 'created' || status === 'exited' || status === 'running'
    : status === 'created' || status === 'exited';
  if (!allowed) {
    return { ok: false, reason: 'container-not-created' };
  }

  let resolvedPort = port.port;
  if (status === 'running' && resolvedPort == null) {
    return { ok: false, reason: 'port-unavailable' };
  }

  return {
    ok: true,
    containerId,
    host: port.host,
    port: resolvedPort,
    runId: plan.runId,
    running: status === 'running',
  };
}

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
 * @param {object} resource
 * @param {{ partial?: boolean }} [options]
 */
export function buildRedisDockerOwnerReceipt(resource, options = {}) {
  const receipt = {
    kind: 'redis-docker-owner',
    schemaVersion: 1,
    partial: Boolean(options.partial ?? resource.partial),
    runId: resource.runId,
    containerId: resource.containerId,
    containerName: resource.containerName,
    profile: resource.profile,
    imageId: resource.imageId,
    host: resource.host ?? null,
    port: resource.port ?? null,
    keyNamespace: resource.keyNamespace,
    runtimeUser: resource.runtimeUser,
    adminUser: resource.adminUser,
    maxmemoryPolicy: resource.maxmemoryPolicy ?? null,
  };
  if (SECRET_PATTERN.test(JSON.stringify(receipt))) {
    throw new Error('owner receipt would expose secrets');
  }
  return receipt;
}

export function sanitizeRedisResourcePublicFacts(resource) {
  const json = JSON.stringify(resource);
  if (SECRET_PATTERN.test(json)) {
    throw new Error('public facts would expose secrets');
  }
  return {
    kind: 'redis-docker',
    runId: resource.runId,
    containerId: resource.containerId,
    containerName: resource.containerName,
    profile: resource.profile,
    imageId: resource.imageId,
    host: resource.host,
    port: resource.port,
    keyNamespace: resource.keyNamespace,
    runtimeUser: resource.runtimeUser,
    adminUser: resource.adminUser,
    maxmemoryPolicy: resource.maxmemoryPolicy,
  };
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
  const listed = await runBounded(
    'docker',
    [
      'ps',
      '-a',
      '--no-trunc',
      '--filter',
      `id=${containerId}`,
      '--format',
      '{{.ID}}',
    ],
    run,
    DOCKER_CMD_TIMEOUT_MS,
  );
  if (commandFailed(listed)) {
    return { ok: false, reason: 'cleanup-verify-failed' };
  }
  const observed = listed.stdout.trim().toLowerCase();
  if (observed.length > 0) {
    return { ok: false, reason: 'container-still-present' };
  }
  return { ok: true, containerId };
}

/**
 * @param {{
 *   containerId: string,
 *   user: string,
 *   run: (command: string, args: string[]) => import('./docker-plan.mjs').CommandResult | Promise<import('./docker-plan.mjs').CommandResult>,
 * }} input
 */
export async function probeRedisPingInContainer({ containerId, user, run }) {
  const script =
    user === VERIFY_ADMIN_USER
      ? `redis-cli -u "redis://verify_admin:\${VERIFY_ADMIN_PASSWORD}@127.0.0.1:6379" PING`
      : `redis-cli -u "redis://verify_runtime:\${VERIFY_RUNTIME_PASSWORD}@127.0.0.1:6379" PING`;
  const probe = await runBounded(
    'docker',
    ['exec', containerId, 'sh', '-c', script],
    run,
    DOCKER_CMD_TIMEOUT_MS,
  );
  if (commandFailed(probe)) {
    return { ok: false, reason: 'redis-exec-failed' };
  }
  if (!/^\+?PONG\b/i.test(probe.stdout.trim())) {
    return { ok: false, reason: 'redis-ping-unexpected' };
  }
  return { ok: true };
}

/**
 * @param {{
 *   containerId: string,
 *   run: (command: string, args: string[]) => import('./docker-plan.mjs').CommandResult | Promise<import('./docker-plan.mjs').CommandResult>,
 *   deadlineMs: number,
 *   now?: () => number,
 *   sleep?: (ms: number) => Promise<void>,
 * }} input
 */
export async function waitForRedisPing(input) {
  const now = input.now ?? (() => Date.now());
  const sleepFn = input.sleep ?? sleep;
  const start = now();
  while (now() - start < input.deadlineMs) {
    const probe = await probeRedisPingInContainer({
      containerId: input.containerId,
      user: VERIFY_ADMIN_USER,
      run: input.run,
    });
    if (probe.ok) {
      return { ok: true };
    }
    await sleepFn(REDIS_PING_INTERVAL_MS);
  }
  return { ok: false, reason: 'readiness-timeout' };
}

/**
 * @param {{
 *   host: string,
 *   port: number,
 *   user: string,
 *   password: string,
 *   Client?: RedisClientLike,
 * }} connect
 */
export function createPrivateRedisHandle(connect) {
  return Object.freeze({
    kind: 'redis-connection',
    host: connect.host,
    port: connect.port,
    user: connect.user,
    keyNamespace: connect.keyNamespace ?? null,
    async connectClient() {
      if (!connect.Client) {
        throw new Error('redis client implementation required');
      }
      const client = new connect.Client({
        host: connect.host,
        port: connect.port,
        username: connect.user,
        password: connect.password,
      });
      await client.connect();
      return client;
    },
  });
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
export async function releaseRedisDockerResource(input) {
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

  const rm = await runBounded(
    'docker',
    ['rm', '-f', containerId],
    input.run,
    DOCKER_CMD_TIMEOUT_MS,
  );
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
    ? buildRedisDockerOwnerReceipt(input.resource)
    : buildRedisDockerOwnerReceipt(
        {
          runId: input.plan.runId,
          containerId,
          containerName: input.plan.containerName,
          profile: input.plan.profile,
          imageId: input.plan.imageId,
          host: input.resource?.host ?? null,
          port: input.resource?.port ?? null,
          keyNamespace: input.plan.keyNamespace,
          runtimeUser: input.plan.runtimeUser,
          adminUser: input.plan.adminUser,
          maxmemoryPolicy: input.plan.limits?.maxmemoryPolicy ?? null,
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
export async function cleanupPartialRedisDockerResource(input) {
  if (!input.containerId) {
    return { ok: true, reason: 'nothing-to-clean' };
  }
  return releaseRedisDockerResource({
    containerId: input.containerId,
    plan: input.plan,
    run: input.run,
    privatePaths: input.privatePaths,
    resource: input.partialResource,
  });
}

/**
 * @param {{
 *   resource: object,
 *   plan: object,
 *   verificationProfile: string,
 *   run: (command: string, args: string[]) => import('./docker-plan.mjs').CommandResult | Promise<import('./docker-plan.mjs').CommandResult>,
 *   Client?: RedisClientLike,
 *   startupTimeoutMs?: number,
 *   now?: () => number,
 *   sleep?: (ms: number) => Promise<void>,
 * }} input
 */
export async function restartOwnedRedisDockerContainer(input) {
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
    DOCKER_CMD_TIMEOUT_MS,
  );
  if (commandFailed(restarted)) {
    return { ok: false, reason: 'docker-restart-failed', containerId };
  }

  const ready = await waitForRedisPing({
    containerId,
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

  const runtimeProbe = await probeRedisPingInContainer({
    containerId,
    user: VERIFY_RUNTIME_USER,
    run: input.run,
  });
  if (!runtimeProbe.ok) {
    return { ok: false, reason: 'runtime-auth-failed', containerId };
  }

  const resource = { ...input.resource, host, port };
  return {
    ok: true,
    containerId,
    host,
    port,
    ownerReceipt: buildRedisDockerOwnerReceipt(resource),
  };
}

/**
 * @param {{
 *   resource: object,
 *   plan: object,
 *   verificationProfile: string,
 *   run: (command: string, args: string[]) => import('./docker-plan.mjs').CommandResult | Promise<import('./docker-plan.mjs').CommandResult>,
 *   startupTimeoutMs?: number,
 *   now?: () => number,
 *   sleep?: (ms: number) => Promise<void>,
 * }} input
 */
export async function stopStartOwnedRedisDockerContainer(input) {
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

  const stopped = await runBounded(
    'docker',
    ['stop', containerId],
    input.run,
    DOCKER_CMD_TIMEOUT_MS,
  );
  if (commandFailed(stopped)) {
    return { ok: false, reason: 'docker-stop-failed', containerId };
  }

  const whileStopped = await assertPreStartContainerState({
    containerId,
    plan: input.plan,
    run: input.run,
    allowRunning: false,
  });
  if (!whileStopped.ok) return whileStopped;

  const started = await runBounded(
    'docker',
    ['start', containerId],
    input.run,
    DOCKER_CMD_TIMEOUT_MS,
  );
  if (commandFailed(started)) {
    return { ok: false, reason: 'docker-start-failed', containerId };
  }

  const ready = await waitForRedisPing({
    containerId,
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
    return { ok: false, reason: 'port-changed-after-stop-start', containerId };
  }

  return {
    ok: true,
    containerId,
    host,
    port,
    ownerReceipt: buildRedisDockerOwnerReceipt({
      ...input.resource,
      host,
      port,
    }),
  };
}

/**
 * @param {{
 *   resource: object,
 *   plan: object,
 *   verificationProfile: string,
 *   run: (command: string, args: string[]) => import('./docker-plan.mjs').CommandResult | Promise<import('./docker-plan.mjs').CommandResult>,
 *   pauseMs?: number,
 * }} input
 */
export async function pauseOwnedRedisClients(input) {
  const profileGate = assertRecoveryFaultProfile(input.verificationProfile);
  if (!profileGate.ok) return profileGate;

  const containerId = input.resource.containerId;
  const owned = assertOwnedContainerIdentity({
    containerId,
    plan: input.plan,
    run: input.run,
  });
  if (!owned.ok) return owned;

  const pauseMs = Math.min(
    CLIENT_PAUSE_MAX_MS,
    Math.max(1, Number(input.pauseMs ?? CLIENT_PAUSE_MAX_MS)),
  );
  const script = `redis-cli -u "redis://verify_admin:\${VERIFY_ADMIN_PASSWORD}@127.0.0.1:6379" CLIENT PAUSE ${pauseMs}`;
  const paused = await runBounded(
    'docker',
    ['exec', containerId, 'sh', '-c', script],
    input.run,
    DOCKER_CMD_TIMEOUT_MS,
  );
  if (commandFailed(paused)) {
    return { ok: false, reason: 'client-pause-failed', containerId };
  }
  return { ok: true, containerId, pauseMs };
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
export async function reconcileInterruptedRedisDocker({
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
    DOCKER_CMD_TIMEOUT_MS,
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
 * @typedef {{
 *   connect: () => Promise<void>,
 *   ping?: () => Promise<string>,
 *   user?: string,
 * }} RedisClientLike
 */

/**
 * @param {{
 *   host: string,
 *   port: number,
 *   user: string,
 *   password: string,
 *   Client: new (config: object) => RedisClientLike,
 * }} config
 */
export async function withRedisClient(config, fn) {
  const client = new config.Client({
    host: config.host,
    port: config.port,
    username: config.user,
    password: config.password,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    if (typeof client.disconnect === 'function') {
      await client.disconnect().catch(() => {});
    }
  }
}

/**
 * @param {{
 *   profile: string,
 *   runId?: string,
 *   live?: boolean,
 *   env?: NodeJS.ProcessEnv,
 *   run?: (command: string, args: string[]) => import('./docker-plan.mjs').CommandResult | Promise<import('./docker-plan.mjs').CommandResult>,
 *   plan?: object,
 *   Client?: new (config: object) => RedisClientLike,
 *   now?: () => number,
 *   sleep?: (ms: number) => Promise<void>,
 *   startupTimeoutMs?: number,
 *   reconcile?: { containerId: string } | null,
 * }} options
 */
export async function createRedisDockerResource(options) {
  const {
    profile,
    runId = randomBytes(8).toString('hex'),
    live = false,
    env = process.env,
    run,
    now = () => Date.now(),
    sleep: delay = sleep,
    startupTimeoutMs = STARTUP_TIMEOUT_MS,
    reconcile = null,
  } = options;

  let plan = options.plan;
  if (!plan) {
    const planned = planRedisDockerResource({
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

  const Client = options.Client;

  let containerId;
  let host;
  let port;

  if (reconcile?.containerId) {
    const reconciled = await reconcileInterruptedRedisDocker({
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
        DOCKER_CMD_TIMEOUT_MS,
      );
      if (commandFailed(started)) {
        return { ok: false, reason: 'docker-start-failed', containerId };
      }
    }
  } else {
    const envPath = join(
      tmpdir(),
      `offscreen-verify-redis-${randomBytes(8).toString('hex')}.env`,
    );
    try {
      writeBootstrapEnvFile(envPath, plan);
      const createArgs = buildRedisDockerCreateArgs(plan, envPath);
      const created = await runBounded(
        'docker',
        createArgs,
        /** @type {any} */ (run),
        DOCKER_CMD_TIMEOUT_MS,
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
      DOCKER_CMD_TIMEOUT_MS,
    );
    if (commandFailed(started)) {
      return { ok: false, reason: 'docker-start-failed', containerId };
    }
  }

  const startupAt = now();
  const ready = await waitForRedisPing({
    containerId,
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
      ownerReceipt: buildRedisDockerOwnerReceipt(
        {
          runId: plan.runId,
          containerId,
          containerName: plan.containerName,
          profile: plan.profile,
          imageId: plan.imageId,
          host,
          port,
          keyNamespace: plan.keyNamespace,
          runtimeUser: plan.runtimeUser,
          adminUser: plan.adminUser,
          maxmemoryPolicy: plan.limits.maxmemoryPolicy,
        },
        { partial: true },
      ),
    };
  }

  const afterStart = await assertPreStartContainerState({
    containerId,
    plan,
    run: /** @type {any} */ (run),
    allowRunning: true,
  });
  if (!afterStart.ok) return afterStart;
  host = afterStart.host;
  port = afterStart.port;

  if (Client) {
    const runtimeConnect = {
      host,
      port,
      user: VERIFY_RUNTIME_USER,
      password: plan.credentials.runtimePassword,
      Client,
      keyNamespace: plan.keyNamespace,
    };
    const adminConnect = {
      host,
      port,
      user: VERIFY_ADMIN_USER,
      password: plan.credentials.adminPassword,
      Client,
      keyNamespace: plan.keyNamespace,
    };
    try {
      await withRedisClient(runtimeConnect, async (client) => {
        if (typeof client.ping === 'function') {
          const pong = await client.ping();
          if (!/^PONG$/i.test(String(pong))) {
            throw Object.assign(new Error('runtime ping failed'), {
              reason: 'runtime-auth-failed',
            });
          }
        }
        if (client.user && client.user !== VERIFY_RUNTIME_USER) {
          throw Object.assign(new Error('unexpected user'), {
            reason: 'unexpected-user',
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
        ownerReceipt: buildRedisDockerOwnerReceipt(
          {
            runId: plan.runId,
            containerId,
            containerName: plan.containerName,
            profile: plan.profile,
            imageId: plan.imageId,
            host,
            port,
            keyNamespace: plan.keyNamespace,
            runtimeUser: plan.runtimeUser,
            adminUser: plan.adminUser,
            maxmemoryPolicy: plan.limits.maxmemoryPolicy,
          },
          { partial: true },
        ),
      };
    }

    const runtimeHandle = createPrivateRedisHandle(runtimeConnect);
    const adminObserverHandle = createPrivateRedisHandle(adminConnect);

    const resource = {
      runId: plan.runId,
      profile: plan.profile,
      containerId,
      containerName: plan.containerName,
      imageId: plan.imageId,
      host,
      port,
      keyNamespace: plan.keyNamespace,
      runtimeUser: VERIFY_RUNTIME_USER,
      adminUser: VERIFY_ADMIN_USER,
      maxmemoryPolicy: plan.limits.maxmemoryPolicy,
      startupMs: Math.max(0, now() - startupAt),
      runtime: runtimeHandle,
      adminObserver: adminObserverHandle,
    };

    return {
      ok: true,
      resource,
      publicFacts: sanitizeRedisResourcePublicFacts(resource),
      ownerReceipt: buildRedisDockerOwnerReceipt(resource),
    };
  }

  const runtimeProbe = await probeRedisPingInContainer({
    containerId,
    user: VERIFY_RUNTIME_USER,
    run: /** @type {any} */ (run),
  });
  if (!runtimeProbe.ok) {
    return {
      ok: false,
      reason: 'runtime-auth-failed',
      containerId,
      ownerReceipt: buildRedisDockerOwnerReceipt(
        {
          runId: plan.runId,
          containerId,
          containerName: plan.containerName,
          profile: plan.profile,
          imageId: plan.imageId,
          host,
          port,
          keyNamespace: plan.keyNamespace,
          runtimeUser: plan.runtimeUser,
          adminUser: plan.adminUser,
          maxmemoryPolicy: plan.limits.maxmemoryPolicy,
        },
        { partial: true },
      ),
    };
  }

  const resource = {
    runId: plan.runId,
    profile: plan.profile,
    containerId,
    containerName: plan.containerName,
    imageId: plan.imageId,
    host,
    port,
    keyNamespace: plan.keyNamespace,
    runtimeUser: VERIFY_RUNTIME_USER,
    adminUser: VERIFY_ADMIN_USER,
    maxmemoryPolicy: plan.limits.maxmemoryPolicy,
    startupMs: Math.max(0, now() - startupAt),
    runtime: null,
    adminObserver: null,
  };

  return {
    ok: true,
    resource,
    publicFacts: sanitizeRedisResourcePublicFacts(resource),
    ownerReceipt: buildRedisDockerOwnerReceipt(resource),
  };
}
