#!/usr/bin/env node
import { createConnection } from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  allocateDevWorktreeOwner,
  isAllocatorRefusal,
} from './dev-worktree-allocator.mjs';
import { readRegistryJson } from './dev-worktree-registry.mjs';
import {
  collectDefaultProbes,
  runStackPreflight,
  CONTEXT_NAME,
} from './stack-preflight.mjs';
import { evaluateDevLoadedRuntimeReadiness } from '../../infra/kubernetes/lab/dev/dev-watched-compilation-receipt.mjs';
import { DEV_POD_RUNTIME_RECEIPT_DIR } from '../../infra/kubernetes/lab/dev/backing/dev-slot-app-graph.mjs';
import { assessOwnedProcess, readProcessStartTicks } from './dev-process-identity.mjs';
import {
  environmentSessionRoot,
  isAllocatorRefusal as isSelectionRefusal,
  ownedEnvironmentSessionPid,
  parseDevCliArgs,
  readEnvironmentSession,
  resolveDevEnvironmentSelection,
  parkSelectedEnvironment,
  writeEnvironmentSession,
} from './dev-environment-session.mjs';
import { reconcileOwnedDevSlot } from './dev-slot-startup.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const LOOPBACK = '127.0.0.1';
const IMAGE_GENERATION_ROLES = ['web', 'api', 'authority', 'worker'];
const IMAGE_GENERATION_ID = /^sha256:[a-f0-9]{64}$/;

/**
 * Host image ids for the slot aliases Tilt will apply. Missing images are
 * omitted so the Pod template is not stamped with an unproven generation.
 * @param {string} slotId
 */
export function readSlotImageGenerations(slotId) {
  /** @type {Record<string, string>} */
  const generations = {};
  for (const role of IMAGE_GENERATION_ROLES) {
    const inspected = spawnSync('docker', [
      'image', 'inspect', '--format', '{{.Id}}', `offscreen-dev-workspace:${slotId}-${role}`,
    ], { encoding: 'utf8' });
    const id = inspected.stdout?.trim() ?? '';
    if (inspected.status === 0 && IMAGE_GENERATION_ID.test(id)) generations[role] = id;
  }
  return generations;
}
const GAME_PORT = 3000;
const TILT_PORT = 10350;

/** @typedef {{
 *   pid: number | null,
 *   processStartTicks?: string | null,
 *   slotId: string,
 *   namespace: string,
 *   gamePort: number,
 *   tiltPort: number,
 *   startedAt: string,
 *   stopped?: boolean,
 *   stoppedAt?: string,
 * }} DevSessionRecord */

/**
 * @param {string} worktree
 * @returns {string}
 */
export function devSessionPath(worktree) {
  return join(resolve(worktree), '.offscreen', 'dev-session.json');
}

/**
 * @param {string} worktree
 * @returns {DevSessionRecord | null}
 */
export function readDevSession(worktree) {
  const file = devSessionPath(worktree);
  if (!existsSync(file)) return null;
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * @param {string} worktree
 * @param {DevSessionRecord} session
 */
export function writeDevSession(worktree, session) {
  const file = devSessionPath(worktree);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(session)}\n`, 'utf8');
}

/**
 * @param {string} worktree
 * @returns {{ hadSession: boolean, signalled: boolean }}
 */
export function stopDevSession(worktree, deps = {}) {
  const file = devSessionPath(worktree);
  if (!existsSync(file)) {
    return { hadSession: false, signalled: false, reason: 'no_session' };
  }

  const session = readDevSession(worktree);
  if (!session) {
    try {
      unlinkSync(file);
    } catch {
      // ignore
    }
    return { hadSession: false, signalled: false, reason: 'unreadable_session' };
  }

  const signal = deps.signal ?? ((pid, sig) => process.kill(pid, sig));
  const ownership = assessOwnedProcess(session, {
    pidAlive: deps.pidAlive ?? pidAlive,
    readStartTicks: deps.readStartTicks ?? ((pid) => readProcessStartTicks(pid)),
  });
  let signalled = false;
  if (ownership.owned) {
    try {
      signal(Number(session.pid), 'SIGTERM');
      signalled = true;
    } catch {
      // ignore
    }
  }
  const forwardOwnership = assessOwnedProcess({
    pid: session.forwardPid,
    processStartTicks: session.forwardStartTicks,
  }, {
    pidAlive: deps.pidAlive ?? pidAlive,
    readStartTicks: deps.readStartTicks ?? ((pid) => readProcessStartTicks(pid)),
  });
  if (forwardOwnership.owned) {
    try {
      signal(Number(session.forwardPid), 'SIGTERM');
    } catch {
      // ignore
    }
  }

  if (ownership.owned) {
    try {
      unlinkSync(file);
    } catch {
      // ignore
    }
  }

  return {
    hadSession: true,
    signalled,
    scaled: false,
    reason: ownership.reason,
    sessionRetained: !ownership.owned,
  };
}

const SLOT_NAMESPACE = /^offscreen-dev-[1-9][0-9]*$/;
const SLOT_WORKLOADS = [
  'game-web',
  'game-api',
  'game-authority',
  'game-control',
  'game-executor',
  'game-relay',
];

/**
 * Scale only this slot's application deployments to zero. Tenants stay.
 *
 * @param {string} namespace
 * @param {typeof spawnSync} [spawnFn]
 */
export function scaleDevSlotWorkloads(namespace, spawnFn = spawnSync, roles = SLOT_WORKLOADS) {
  if (!SLOT_NAMESPACE.test(namespace)) {
    throw new Error(`refusing to scale workloads in ${namespace}`);
  }
  const selected = roles.filter((role) => SLOT_WORKLOADS.includes(role));
  if (selected.length !== roles.length) {
    throw new Error(`refusing to scale unknown workloads in ${namespace}`);
  }
  const result = spawnFn(
    'kubectl',
    [
      '--context', 'kind-offscreen-dev',
      '-n', namespace,
      'scale', 'deploy',
      ...selected,
      '--replicas=0',
    ],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || `scale failed for ${namespace}`);
  }
  return namespace;
}

const OWNED_STARTUP_WINDOW_MS = 900_000;

/**
 * Deployment readyReplicas for the six slot workloads. Missing output is not ready.
 * @param {string} namespace
 * @param {typeof spawnSync} [spawnFn]
 */
export function collectOwnedWorkloadReadiness(namespace, spawnFn = spawnSync) {
  if (!SLOT_NAMESPACE.test(namespace)) {
    throw new Error(`refusing to read readiness in ${namespace}`);
  }
  /** @type {Record<string, boolean>} */
  const readiness = {};
  for (const name of SLOT_WORKLOADS) {
    const result = spawnFn('kubectl', [
      '--context', 'kind-offscreen-dev',
      '-n', namespace,
      'get', 'deploy', name,
      '-o', 'jsonpath={.status.readyReplicas}',
    ], { encoding: 'utf8' });
    readiness[name] = result.status === 0 && String(result.stdout).trim() === '1';
  }
  return readiness;
}

/**
 * Park the attempted slot after a failed fresh start. Reservation and tenants stay.
 * A failed park is rollback-incomplete and is not reported as parked.
 * @param {{
 *   worktree: string,
 *   owner: { slotId: string, worktreePath: string, namespace: string, ports: { game: number, tilt: number }, resourceUids?: Record<string, string> | null },
 *   registryRoot: string,
 *   reason: string,
 *   signal?: (pid: number, signal: string) => void,
 *   pidAlive?: (pid: number) => boolean,
 *   readStartTicks?: (pid: number) => string | null,
 *   scaleRole?: (namespace: string, role: string) => void,
 *   readDesiredReplicas?: (namespace: string) => Record<string, number>,
 *   log?: (line: string) => void,
 * }} input
 */
export function rollbackFailedOwnedStartup(input) {
  const log = input.log ?? ((line) => console.error(line));
  const namespace = input.owner.namespace;
  const ownedResources = {
    slotId: input.owner.slotId,
    namespace,
    workloads: [...SLOT_WORKLOADS],
    resourceUids: input.owner.resourceUids ?? null,
  };
  const sessionRoot = environmentSessionRoot(input.registryRoot);
  const environmentSession = readEnvironmentSession(sessionRoot, input.owner.slotId);
  if (!environmentSession) {
    try {
      stopDevSession(input.worktree, {
        signal: input.signal,
        pidAlive: input.pidAlive,
        readStartTicks: input.readStartTicks,
      });
      const scaleAll = input.scaleRole
        ? SLOT_WORKLOADS.forEach((role) => input.scaleRole(namespace, role))
        : scaleDevSlotWorkloads(namespace);
      void scaleAll;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`rollback-incomplete: ${input.reason}; ${message}; ${JSON.stringify(ownedResources)}`);
      return { ok: false, id: 'rollback-incomplete', parked: false, ownedResources };
    }
    const desired = (input.readDesiredReplicas ?? ((ns) => readDevSlotDesiredReplicas(ns)))(namespace);
    const leftover = SLOT_WORKLOADS.filter((role) => desired?.[role] !== 0);
    if (leftover.length > 0) {
      log(`rollback-incomplete: ${input.reason}; replicas still desired; ${JSON.stringify({ ...ownedResources, leftover })}`);
      return { ok: false, id: 'rollback-incomplete', parked: false, ownedResources: { ...ownedResources, leftover } };
    }
    log(`startup-parked: ${input.reason}; ${namespace}`);
    return { ok: true, id: 'startup-parked', parked: true, ownedResources };
  }
  let park;
  try {
    park = parkSelectedEnvironment({
      owner: input.owner,
      sessionRoot: environmentSessionRoot(input.registryRoot),
      signal: input.signal,
      processDeps: {
        pidAlive: input.pidAlive ?? pidAlive,
        readStartTicks: input.readStartTicks ?? ((pid) => readProcessStartTicks(pid)),
        sleep: () => {},
      },
      scaleRole: input.scaleRole ?? ((ns, role) => scaleDevSlotWorkloads(ns, spawnSync, [role])),
      readDesiredReplicas: input.readDesiredReplicas ?? ((ns) => readDevSlotDesiredReplicas(ns)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`rollback-incomplete: ${input.reason}; ${message}; ${JSON.stringify(ownedResources)}`);
    return { ok: false, id: 'rollback-incomplete', parked: false, ownedResources };
  }
  if (!park?.ok || park.released !== true) {
    log(`rollback-incomplete: ${input.reason}; ${park?.reason ?? 'park failed'}; ${JSON.stringify({ ...ownedResources, scaledRoles: park?.scaledRoles ?? [] })}`);
    return { ok: false, id: 'rollback-incomplete', parked: false, reason: park?.reason, ownedResources };
  }
  const desired = (input.readDesiredReplicas ?? ((ns) => readDevSlotDesiredReplicas(ns)))(namespace);
  const leftover = SLOT_WORKLOADS.filter((role) => desired?.[role] !== 0);
  if (leftover.length > 0) {
    log(`rollback-incomplete: ${input.reason}; replicas still desired; ${JSON.stringify({ ...ownedResources, leftover })}`);
    return { ok: false, id: 'rollback-incomplete', parked: false, ownedResources: { ...ownedResources, leftover } };
  }
  log(`startup-parked: ${input.reason}; ${namespace}`);
  return { ok: true, id: 'startup-parked', parked: true, ownedResources };
}

export function readDevSlotDesiredReplicas(namespace, spawnFn = spawnSync) {
  if (!SLOT_NAMESPACE.test(namespace)) {
    throw new Error(`refusing to read workloads in ${namespace}`);
  }
  const desired = {};
  for (const role of SLOT_WORKLOADS) {
    const result = spawnFn('kubectl', [
      '--context', 'kind-offscreen-dev',
      '-n', namespace,
      'get', 'deploy', role,
      '-o', 'jsonpath={.spec.replicas}',
    ], { encoding: 'utf8' });
    if (result.status !== 0) {
      throw new Error(result.stderr || `replica read failed for ${namespace}/${role}`);
    }
    desired[role] = Number(String(result.stdout).trim());
  }
  return desired;
}

export const LAB_RESOURCES = Object.freeze([
  'game-web',
  'game-api',
  'game-authority',
  'game-control',
  'game-executor',
  'game-relay',
]);

/** @typedef {{ role: string, receiptRole: string, compiledEntryPath: string }} DevRuntimeFreshnessRole */

export const DEV_RUNTIME_FRESHNESS_ROLES = Object.freeze(
  /** @type {const} */ ([
    { role: 'api', receiptRole: 'api', compiledEntryPath: 'apps/api/dist/src/main.js' },
    {
      role: 'authority',
      receiptRole: 'game-authority',
      compiledEntryPath: 'apps/game-authority/dist/src/bootstrap/main.js',
    },
    {
      role: 'control',
      receiptRole: 'worker-control',
      compiledEntryPath: 'apps/worker/dist/src/bootstrap/control-main.js',
    },
    {
      role: 'executor',
      receiptRole: 'worker-executor',
      compiledEntryPath: 'apps/worker/dist/src/bootstrap/executor-main.js',
    },
    {
      role: 'relay',
      receiptRole: 'worker-relay',
      compiledEntryPath: 'apps/worker/dist/src/bootstrap/main.js',
    },
  ]),
);

/**
 * @param {string} displayRole
 * @param {{ ready: boolean, reason: string, currentGeneration: string | null }} status
 * @returns {string}
 */
/**
 * Web READY means the selected slot's game-web pod is ready on the expected
 * image and an HTTP request to that dev server succeeded. A Next.js build
 * artifact is not loaded-generation proof.
 * @param {{
 *   namespace: string,
 *   expectedImage: string | null,
 *   expectedConfigId?: string | null,
 *   pod?: { ready?: boolean, namespace?: string, image?: string | null, imageId?: string | null } | null,
 *   httpStatus?: number | null,
 * }} input
 */
/**
 * Docker Hub's default registry and single-name library namespace are the
 * same image. A different registry, repository, tag or digest stays different.
 * @param {string | null | undefined} reference
 * @returns {string | null}
 */
export function canonicalDockerImageReference(reference) {
  if (!reference || typeof reference !== 'string') return null;
  let digest = null;
  const at = reference.lastIndexOf('@');
  let rest = reference;
  if (at > 0 && reference.slice(at + 1).startsWith('sha256:')) {
    digest = reference.slice(at + 1);
    rest = reference.slice(0, at);
  }
  let registry = 'docker.io';
  let name = rest;
  const firstSlash = rest.indexOf('/');
  const firstSegment = firstSlash > 0 ? rest.slice(0, firstSlash) : '';
  if (
    firstSegment.includes('.')
    || firstSegment.includes(':')
    || firstSegment === 'localhost'
  ) {
    registry = firstSegment;
    name = rest.slice(firstSlash + 1);
  }
  if (registry === 'docker.io' && !name.includes('/')) {
    name = `library/${name}`;
  }
  const colon = name.lastIndexOf(':');
  let tag = 'latest';
  if (colon > 0) {
    tag = name.slice(colon + 1);
    name = name.slice(0, colon);
  }
  return `${registry}/${name}:${tag}${digest ? `@${digest}` : ''}`;
}

export function assessWebDevServerReadiness(input) {
  const pod = input.pod ?? null;
  if (!pod?.ready) {
    return { ready: false, reason: 'web_pod_not_ready', currentGeneration: null };
  }
  if (pod.namespace !== input.namespace) {
    return { ready: false, reason: 'namespace_mismatch', currentGeneration: null };
  }
  const expectedImage = canonicalDockerImageReference(input.expectedImage);
  const runningImage = canonicalDockerImageReference(pod.image);
  if (!expectedImage || expectedImage !== runningImage) {
    return { ready: false, reason: 'image_mismatch', currentGeneration: null };
  }
  const accepted = input.expectedConfigIds
    ?? (input.expectedConfigId ? [input.expectedConfigId] : null);
  if (accepted) {
    const runningConfig = typeof pod.imageId === 'string'
      ? (pod.imageId.match(/sha256:[a-f0-9]{64}/) ?? [])[0] ?? null
      : null;
    if (!runningConfig || !accepted.includes(runningConfig)) {
      return { ready: false, reason: 'image_mismatch', currentGeneration: null };
    }
  }
  if (typeof input.httpStatus !== 'number' || input.httpStatus < 200 || input.httpStatus >= 300) {
    return { ready: false, reason: 'http_unsuccessful', currentGeneration: null };
  }
  return { ready: true, reason: 'dev_server_serving', currentGeneration: expectedImage };
}

/**
 * Start the owned game-web port-forward only after the backend is usable.
 * Restart it while the Tilt session remains active. A foreign listener or a
 * PID whose start time does not match the record stops the supervisor.
 * @param {{
 *   sessionActive: () => boolean,
 *   backendReady: () => Promise<boolean> | boolean,
 *   portOccupied: () => Promise<boolean> | boolean,
 *   spawnForward: () => { pid: number | null, onExit: (cb: (code: number | null) => void) => void },
 *   readStartTicks: (pid: number) => string | null,
 *   recordForward: (record: { pid: number, processStartTicks: string | null }) => void,
 *   sleep?: (ms: number) => Promise<void>,
 *   maxAttempts?: number,
 * }} input
 */
export async function superviseOwnedWebPortForward(input) {
  const sleep = input.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const maxAttempts = input.maxAttempts ?? 8;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (!input.sessionActive()) {
      return { ok: true, reason: 'cancelled', attempts: attempt };
    }
    if (!(await input.backendReady())) {
      await sleep(Math.min(1_000, 50 * (attempt + 1)));
      continue;
    }
    if (await input.portOccupied()) {
      return { ok: false, reason: 'foreign_port', attempts: attempt };
    }
    const child = input.spawnForward();
    if (!child.pid) {
      await sleep(Math.min(1_000, 50 * (attempt + 1)));
      continue;
    }
    const processStartTicks = input.readStartTicks(child.pid);
    if (!processStartTicks) {
      return { ok: false, reason: 'start_time_mismatch', attempts: attempt, pid: child.pid };
    }
    input.recordForward({ pid: child.pid, processStartTicks });
    const code = await new Promise((resolve) => child.onExit(resolve));
    if (!input.sessionActive()) {
      return { ok: true, reason: 'session_stopped', attempts: attempt + 1, pid: child.pid, code };
    }
    await sleep(Math.min(1_000, 50 * (attempt + 1)));
  }
  if (!input.sessionActive()) {
    return { ok: true, reason: 'cancelled', attempts: maxAttempts };
  }
  return { ok: false, reason: 'retries_exhausted', attempts: maxAttempts };
}

export function formatDevFreshnessStatusLine(displayRole, status) {
  if (status.ready) {
    return `${displayRole} READY ${status.reason} ${status.currentGeneration}`;
  }
  return `${displayRole} NOT READY ${status.reason}`;
}

/** @type {Record<string, string>} */
export const DEPLOYMENT_NAMESPACE = Object.freeze({
  'game-web': 'lab-edge',
  'game-api': 'lab-edge',
  'game-authority': 'lab-authority',
  'game-control': 'lab-workers',
  'game-executor': 'lab-workers',
  'game-relay': 'lab-workers',
});

/** @typedef {{ id: string, message: string }} DevRefusal */
/** @typedef {{ game: 'free'|'owned'|'foreign', tilt: 'free'|'owned'|'foreign' }} DevPorts */
/** @typedef {Record<string, boolean | undefined>} ReadinessMap */

/**
 * @param {number} gamePort
 * @param {number} tiltPort
 */
export function buildReadyUrls(gamePort, tiltPort) {
  return {
    game: `http://${LOOPBACK}:${gamePort}/`,
    control: `http://${LOOPBACK}:${gamePort}/control`,
    tilt: `http://${LOOPBACK}:${tiltPort}/`,
  };
}

/**
 * @returns {string}
 */
export function devWorktreeRegistryRoot() {
  const fromEnv = process.env.OFFSCREEN_DEV_WORKTREE_REGISTRY?.trim();
  if (fromEnv) return resolve(fromEnv);
  return join(homedir(), '.local', 'state', 'offscreen-rpg', 'dev-worktree-registry');
}

/**
 * @param {{
 *   preflightOk: boolean,
 *   preflightRefusals: DevRefusal[],
 *   tiltOnPath: boolean,
 *   ports: DevPorts,
 *   readiness: ReadinessMap,
 *   gamePort?: number,
 *   tiltPort?: number,
 * }} input
 * @returns {{ ok: boolean, urls: ReturnType<typeof buildReadyUrls> | null, refusals: DevRefusal[] }}
 */
export function assessDevLaunch(input) {
  const gamePort = input.gamePort ?? GAME_PORT;
  const tiltPort = input.tiltPort ?? TILT_PORT;
  /** @type {DevRefusal[]} */
  const refusals = [];

  if (!input.preflightOk) {
    refusals.push(...input.preflightRefusals);
  }

  if (!input.tiltOnPath) {
    refusals.push({ id: 'missing-tilt', message: 'Required command not found: tilt.' });
  }

  if (input.ports.game === 'foreign') {
    refusals.push({
      id: 'foreign-game-port',
      message: `${LOOPBACK}:${gamePort} is in use by a non-owned listener.`,
    });
  }
  if (input.ports.tilt === 'foreign') {
    refusals.push({
      id: 'foreign-tilt-port',
      message: `${LOOPBACK}:${tiltPort} is in use by a non-owned listener.`,
    });
  }

  for (const name of LAB_RESOURCES) {
    const ready = input.readiness[name];
    if (ready !== true) {
      const id = ready === undefined ? `resource-missing-${name}` : `resource-not-ready-${name}`;
      const verb = ready === undefined ? 'missing' : 'not ready';
      refusals.push({
        id,
        message: `Deployment ${name} is ${verb}.`,
      });
    }
  }

  const portsOk =
    (input.ports.game === 'free' || input.ports.game === 'owned') &&
    (input.ports.tilt === 'free' || input.ports.tilt === 'owned');

  const allReady = LAB_RESOURCES.every((name) => input.readiness[name] === true);

  const launchOk =
    input.preflightOk &&
    input.tiltOnPath &&
    portsOk &&
    input.ports.game !== 'foreign' &&
    input.ports.tilt !== 'foreign' &&
    allReady;

  return {
    ok: launchOk,
    urls: launchOk ? buildReadyUrls(gamePort, tiltPort) : null,
    refusals,
  };
}

/**
 * @param {{ game: string, control: string, tilt: string }} urls
 * @returns {string[]}
 */
export function formatReadyLines(urls) {
  return [
    `Game: ${urls.game}`,
    `Control: ${urls.control}`,
    `Tilt UI: ${urls.tilt}`,
  ];
}

/**
 * URL announcement waits on maybeAnnounce: the live CLI polls deployment readiness
 * and only prints lines when assessDevLaunch returns non-null urls.
 *
 * @param {{ urls?: { game: string, control: string, tilt: string } | null } | unknown} assessment
 * @returns {string[]}
 */
export function maybeAnnounce(assessment) {
  if (!assessment || typeof assessment !== 'object' || Array.isArray(assessment)) {
    return [];
  }
  if (!('urls' in assessment) || assessment.urls == null) {
    return [];
  }
  return formatReadyLines(assessment.urls);
}

function commandOnPath(name) {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  const r = spawnSync(probe, [name], { encoding: 'utf8' });
  return r.status === 0;
}

/**
 * @param {string} host
 * @param {number} port
 * @returns {Promise<boolean>}
 */
function probeLoopbackPortOccupiedSync(port) {
  const probe = spawnSync(process.execPath, ['-e', `
    const net = require('node:net');
    const socket = net.connect({ host: '127.0.0.1', port: ${Number(port)}, timeout: 200 });
    socket.on('connect', () => { socket.destroy(); process.exit(0); });
    socket.on('timeout', () => { socket.destroy(); process.exit(1); });
    socket.on('error', () => process.exit(1));
  `], { stdio: 'ignore' });
  return probe.status === 0;
}

export function probeLoopbackPortOccupied(host, port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port, timeout: 500 }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} worktree
 * @returns {{ previousPid: number | null, killedPrevious: boolean }}
 */
function replaceOwnedEnvironmentTilt(slotId, registryRoot, deps = {}) {
  const session = readEnvironmentSession(environmentSessionRoot(registryRoot), slotId);
  if (!session) return { previousPid: null, killedPrevious: false, reason: 'no_session' };
  const ownership = assessOwnedProcess(session, {
    pidAlive: deps.pidAlive ?? pidAlive,
    readStartTicks: deps.readStartTicks ?? ((pid) => readProcessStartTicks(pid)),
  });
  const signal = deps.signal ?? ((pid, sig) => process.kill(pid, sig));
  if (ownership.owned) {
    try {
      signal(Number(session.pid), 'SIGTERM');
    } catch {
      // ignore
    }
  }
  return {
    previousPid: ownership.owned ? Number(session.pid) : null,
    killedPrevious: ownership.owned,
    reason: ownership.reason,
  };
}

function replaceOwnedDevSessionTilt(worktree, deps = {}) {
  const session = readDevSession(worktree);
  if (!session) {
    return { previousPid: null, killedPrevious: false, reason: 'no_session' };
  }
  const ownership = assessOwnedProcess(session, {
    pidAlive: deps.pidAlive ?? pidAlive,
    readStartTicks: deps.readStartTicks ?? ((pid) => readProcessStartTicks(pid)),
  });
  const signal = deps.signal ?? ((pid, sig) => process.kill(pid, sig));
  if (ownership.owned) {
    try {
      signal(Number(session.pid), 'SIGTERM');
    } catch {
      // ignore
    }
  }
  return {
    previousPid: ownership.owned ? Number(session.pid) : null,
    killedPrevious: ownership.owned,
    reason: ownership.reason,
  };
}

/**
 * @param {string} worktree
 * @returns {number | null}
 */
function readWorktreeSessionPid(worktree) {
  const session = readDevSession(worktree);
  if (!session) return null;
  const pid = Number(session.pid);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

/**
 * @param {string} namespace
 * @param {string} deployment
 * @returns {boolean}
 */
export function deploymentAvailableFromKubectlOutput(stdout) {
  return (stdout ?? '').trim() === 'True';
}

/**
 * @param {string} namespace
 * @param {string} deployment
 * @returns {Promise<boolean>}
 */
export async function queryDeploymentAvailable(namespace, deployment) {
  const r = spawnSync(
    'kubectl',
    [
      'get',
      'deployment',
      deployment,
      '-n',
      namespace,
      '-o',
      'jsonpath={.status.conditions[?(@.type=="Available")].status}',
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  if (r.status !== 0) return false;
  return deploymentAvailableFromKubectlOutput(r.stdout);
}

/** @returns {Promise<ReadinessMap>} */
export async function collectLabReadiness() {
  /** @type {ReadinessMap} */
  const readiness = {};
  for (const name of LAB_RESOURCES) {
    const ns = DEPLOYMENT_NAMESPACE[name];
    readiness[name] = await queryDeploymentAvailable(ns, name);
  }
  return readiness;
}

/**
 * @param {DevRefusal[]} refusals
 * @param {(code: number) => never | void} [exitFn]
 */
function refuseAndExit(refusals, exitFn = (code) => process.exit(code)) {
  for (const refusal of refusals) {
    console.error(refusal.message);
  }
  exitFn(1);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** @typedef {import('./dev-worktree-registry.mjs').DevWorktreeOwnerRecord} DevWorktreeOwnerRecord */

/**
 * @typedef {{
 *   worktree?: string,
 *   registryRoot?: string,
 *   allocateDevWorktreeOwner?: (worktreePath: string, registryRoot: string) => DevWorktreeOwnerRecord,
 *   collectDefaultProbes?: typeof collectDefaultProbes,
 *   runStackPreflight?: typeof runStackPreflight,
 *   commandOnPath?: (name: string) => boolean,
 *   probeLoopbackPortOccupied?: typeof probeLoopbackPortOccupied,
 *   spawnFn?: typeof spawn,
 *   collectLabReadiness?: typeof collectLabReadiness,
 *   exit?: (code: number) => never | void,
 *   exitAfterSession?: boolean,
 * }} RunDevTiltLaunchDeps */

/**
 * @param {RunDevTiltLaunchDeps} [deps]
 * @returns {Promise<void>}
 */
export async function runDevTiltLaunch(deps = {}) {
  const worktree = deps.worktree ?? REPO_ROOT;
  const registryRoot = deps.registryRoot ?? devWorktreeRegistryRoot();
  const allocate = deps.allocateDevWorktreeOwner ?? allocateDevWorktreeOwner;
  const collectProbes = deps.collectDefaultProbes ?? collectDefaultProbes;
  const runPreflight = deps.runStackPreflight ?? runStackPreflight;
  const onPath = deps.commandOnPath ?? commandOnPath;
  const probeOccupied = deps.probeLoopbackPortOccupied ?? probeLoopbackPortOccupied;
  const spawnFn = deps.spawnFn ?? spawn;
  const readinessPoll = deps.collectLabReadiness ?? collectLabReadiness;
  const exitFn = deps.exit ?? ((code) => process.exit(code));
  const reconcile = deps.reconcileDevSlot ?? reconcileOwnedDevSlot;

  // Capacity is a host fact. Refuse before slot reconciliation or owned-Tilt
  // replacement so a low-memory start cannot scale workloads or signal a session.
  const probes = await collectProbes();
  const preflight = runPreflight(probes);
  const capacityRefusals = (preflight.refusals ?? []).filter((refusal) =>
    refusal.id === 'memory-low' || refusal.id === 'memory-unknown',
  );
  if (capacityRefusals.length > 0) {
    refuseAndExit(capacityRefusals, exitFn);
    return;
  }

  const slot = await reconcile({ worktree, registryRoot, owner: deps.owner });
  if (!slot?.ok || slot.readyForWorkloads !== true) {
    refuseAndExit([{
      id: `slot-${slot?.phase ?? 'startup'}`,
      message: `Dev slot reconciliation stopped at ${slot?.phase ?? 'startup'}: ${slot?.detail ?? 'not ready'}`,
    }], exitFn);
    return;
  }

  // Drop a tilt this worktree started before deciding a listener is foreign.
  const { previousPid, killedPrevious } = (deps.owner
    ? replaceOwnedEnvironmentTilt(deps.owner.slotId, registryRoot, {
    pidAlive: deps.pidAlive ?? pidAlive,
    readStartTicks: deps.readStartTicks ?? ((pid) => readProcessStartTicks(pid)),
    signal: deps.signal,
  })
    : replaceOwnedDevSessionTilt(worktree, {
      pidAlive: deps.pidAlive ?? pidAlive,
      readStartTicks: deps.readStartTicks ?? ((pid) => readProcessStartTicks(pid)),
      signal: deps.signal,
    }));
  if (killedPrevious && previousPid !== null) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (!pidAlive(previousPid)) break;
      await sleep(100);
    }
  }

  /** @type {DevWorktreeOwnerRecord} */
  let ownerRecord = deps.owner ?? slot.record;
  if (!ownerRecord) {
    try {
      ownerRecord = allocate(worktree, registryRoot);
    } catch (error) {
      if (isAllocatorRefusal(error)) {
        refuseAndExit([{ id: error.id, message: error.message }], exitFn);
        return;
      }
      throw error;
    }
  }

  const gamePort = ownerRecord.ports.game;
  const tiltPort = ownerRecord.ports.tilt;

  const tiltOnPath = onPath('tilt');

  const gameOccupied = await probeOccupied(LOOPBACK, gamePort);
  const tiltOccupied = await probeOccupied(LOOPBACK, tiltPort);

  /** @type {DevRefusal[]} */
  const launchRefusals = [];
  if (!preflight.ok) {
    const devSlotChecks = new Set([
      'missing-docker', 'missing-kind', 'missing-kubectl', 'docker-daemon', 'memory-low', 'memory-unknown',
    ]);
    launchRefusals.push(...preflight.refusals.filter((refusal) => devSlotChecks.has(refusal.id)));
  }
  if (!tiltOnPath) {
    launchRefusals.push({ id: 'missing-tilt', message: 'Required command not found: tilt.' });
  }
  if (gameOccupied) {
    launchRefusals.push({
      id: 'foreign-game-port',
      message: `${LOOPBACK}:${gamePort} is in use by a non-owned listener.`,
    });
  }
  if (tiltOccupied) {
    launchRefusals.push({
      id: 'foreign-tilt-port',
      message: `${LOOPBACK}:${tiltPort} is in use by a non-owned listener.`,
    });
  }

  if (launchRefusals.length > 0) {
    refuseAndExit(launchRefusals, exitFn);
    return;
  }

  let announced = false;
  let pollTimer;

  const stopPolling = () => {
    if (pollTimer) clearInterval(pollTimer);
  };

  const onSignal = (signal) => {
    stopPolling();
    const processDeps = {
      pidAlive: deps.pidAlive ?? pidAlive,
      readStartTicks: deps.readStartTicks ?? ((pid) => readProcessStartTicks(pid)),
    };
    const pid = deps.owner
      ? ownedEnvironmentSessionPid(registryRoot, deps.owner, processDeps)
      : readWorktreeSessionPid(worktree);
    if (pid !== null && pidAlive(pid)) {
      try {
        process.kill(pid, signal === 'SIGINT' ? 'SIGTERM' : signal);
      } catch {
        // ignore
      }
    }
    exitFn(signal === 'SIGTERM' ? 143 : 130);
  };

  if (!deps.exitAfterSession) {
    process.once('SIGINT', () => onSignal('SIGINT'));
    process.once('SIGTERM', () => onSignal('SIGTERM'));
  }

  const tiltEnv = {
    ...process.env,
    OFFSCREEN_DEV_SLOT: ownerRecord.slotId,
    OFFSCREEN_DEV_NAMESPACE: ownerRecord.namespace,
    OFFSCREEN_DEV_GAME_PORT: String(gamePort),
    OFFSCREEN_DEV_TILT_PORT: String(tiltPort),
    OFFSCREEN_DEV_IMAGE_GENERATIONS: JSON.stringify(
      (deps.readImageGenerations ?? readSlotImageGenerations)(ownerRecord.slotId),
    ),
  };

  const child = spawnFn(
    'tilt',
    ['up', '--context', 'kind-offscreen-dev', '--host', LOOPBACK, '--port', String(tiltPort)],
    { cwd: worktree, stdio: 'inherit', env: tiltEnv },
  );

  if (!child.pid) {
    console.error('Failed to start tilt.');
    exitFn(1);
    return;
  }

  const readStart = deps.readStartTicks ?? ((pid) => readProcessStartTicks(pid));
  const sessionRecord = {
    pid: child.pid,
    processStartTicks: readStart(child.pid),
    forwardPid: null,
    forwardStartTicks: null,
    slotId: ownerRecord.slotId,
    namespace: ownerRecord.namespace,
    gamePort,
    tiltPort,
    startedAt: new Date().toISOString(),
  };
  if (deps.owner) {
    writeEnvironmentSession(environmentSessionRoot(registryRoot), {
      ...sessionRecord,
      checkoutPath: worktree,
      parked: false,
      released: false,
    });
  } else {
    writeDevSession(worktree, sessionRecord);
  }

  if (deps.exitAfterSession) {
    return;
  }

  const startupWindowMs = deps.startupWindowMs ?? OWNED_STARTUP_WINDOW_MS;
  const startupPollMs = deps.startupPollMs ?? 5_000;
  const pause = deps.sleep ?? sleep;
  const readStartup = deps.collectStartupReadiness
    ?? ((namespace) => Promise.resolve(collectOwnedWorkloadReadiness(namespace)));
  let startupFailure = null;
  for (let elapsed = 0; elapsed <= startupWindowMs; elapsed += startupPollMs) {
    const during = runPreflight(await collectProbes());
    const exhausted = (during.refusals ?? []).filter((refusal) =>
      refusal.id === 'memory-low' || refusal.id === 'memory-unknown',
    );
    if (exhausted.length > 0) {
      startupFailure = exhausted[0].message;
      break;
    }
    if (child.exitCode !== null && child.exitCode !== undefined) {
      startupFailure = `tilt exited ${child.exitCode} before the six workloads were ready`;
      break;
    }
    const readiness = await readStartup(ownerRecord.namespace);
    const assessment = assessDevLaunch({
      preflightOk: true,
      preflightRefusals: [],
      tiltOnPath: true,
      ports: { game: 'owned', tilt: 'owned' },
      readiness,
      gamePort,
      tiltPort,
    });
    if (assessment.ok) {
      startupFailure = null;
      break;
    }
    if (elapsed === startupWindowMs) {
      const missing = assessment.refusals.map((refusal) => refusal.id).join(',');
      startupFailure = `startup window elapsed before six workloads were ready (${missing})`;
      break;
    }
    await pause(startupPollMs);
  }
  if (startupFailure) {
    rollbackFailedOwnedStartup({
      worktree,
      owner: { ...ownerRecord, worktreePath: worktree },
      registryRoot,
      reason: startupFailure,
      signal: deps.signal,
      pidAlive: deps.pidAlive ?? pidAlive,
      readStartTicks: readStart,
      scaleRole: deps.scaleRole,
      readDesiredReplicas: deps.readDesiredReplicas,
      log: deps.log,
    });
    exitFn(1);
    return;
  }

  if (deps.exitAfterReady) {
    return;
  }

  const persistForward = (record) => {
    sessionRecord.forwardPid = record.pid;
    sessionRecord.forwardStartTicks = record.processStartTicks;
    if (deps.owner) {
      writeEnvironmentSession(environmentSessionRoot(registryRoot), {
        ...sessionRecord,
        checkoutPath: worktree,
        parked: false,
        released: false,
      });
    } else {
      writeDevSession(worktree, sessionRecord);
    }
  };
  let sessionActive = true;
  child.on('exit', () => {
    sessionActive = false;
  });
  const supervise = deps.supervisePortForward ?? superviseOwnedWebPortForward;
  void supervise({
    sessionActive: () => sessionActive,
    backendReady: deps.webBackendReady ?? (async () => {
      const result = spawnSync('kubectl', [
        '--context', 'kind-offscreen-dev', '-n', ownerRecord.namespace,
        'get', 'pod', '-l', 'app=game-web',
        '-o', 'jsonpath={.items[0].status.containerStatuses[0].ready}',
      ], { encoding: 'utf8' });
      return result.status === 0 && String(result.stdout).trim() === 'true';
    }),
    portOccupied: () => probeOccupied(LOOPBACK, gamePort),
    spawnForward: deps.spawnPortForward ?? (() => {
      const forward = spawn('kubectl', [
        '--context', 'kind-offscreen-dev', '-n', ownerRecord.namespace,
        'port-forward', 'svc/game-web', `${gamePort}:3000`,
      ], { stdio: 'ignore' });
      return { pid: forward.pid ?? null, onExit: (cb) => forward.on('exit', (code) => cb(code)) };
    }),
    readStartTicks: readStart,
    recordForward: persistForward,
  }).catch(() => {});

  pollTimer = setInterval(async () => {
    if (announced) return;
    const readiness = await readinessPoll();
    const gameOcc = await probeOccupied(LOOPBACK, gamePort);
    const tiltOcc = await probeOccupied(LOOPBACK, tiltPort);
    const assessment = assessDevLaunch({
      preflightOk: true,
      preflightRefusals: [],
      tiltOnPath: true,
      ports: {
        game: gameOcc ? 'owned' : 'free',
        tilt: tiltOcc ? 'owned' : 'free',
      },
      readiness,
      gamePort,
      tiltPort,
    });
    const lines = maybeAnnounce(assessment);
    if (lines.length > 0) {
      announced = true;
      for (const line of lines) {
        console.log(line);
      }
    }
  }, 5_000);

  child.on('exit', (code) => {
    stopPolling();
    exitFn(code ?? 0);
  });
}

async function runDevTiltCli() {
  await runDevTiltLaunch();
}

/**
 * @typedef {{
 *   log?: (line: string) => void,
 *   roles?: readonly DevRuntimeFreshnessRole[],
 *   evaluateDevLoadedRuntimeReadiness?: typeof evaluateDevLoadedRuntimeReadiness,
 * }} PrintDevStatusDeps */

/**
 * @param {string} worktree
 * @param {PrintDevStatusDeps} [deps]
 * @returns {number}
 */
const POD_COMPILED_ENTRY = Object.freeze({
  api: '/app/apps/api/dist/src/main.js',
  authority: '/app/apps/game-authority/dist/src/bootstrap/main.js',
  control: '/app/apps/worker/dist/src/bootstrap/control-main.js',
  executor: '/app/apps/worker/dist/src/bootstrap/executor-main.js',
  relay: '/app/apps/worker/dist/src/bootstrap/main.js',
});

/**
 * Copy the selected namespace's real receipt files. A missing exec stays missing.
 * @param {{ namespace: string, roles: readonly {role: string, receiptRole: string}[], receiptRoot: string, run: Function }} input
 */
export function pullSelectedSlotReceipts(input) {
  mkdirSync(input.receiptRoot, { recursive: true });
  const diskIdentities = {};
  for (const roleSpec of input.roles) {
    const deploy = `deploy/game-${roleSpec.role}`;
    for (const kind of ['desired', 'loaded']) {
      const remote = `${DEV_POD_RUNTIME_RECEIPT_DIR}/${roleSpec.receiptRole}.${kind}.json`;
      const result = input.run([
        '--context', 'kind-offscreen-dev', '-n', input.namespace, 'exec', deploy, '--', 'cat', remote,
      ]);
      if (result.status !== 0 || !result.stdout) continue;
      writeFileSync(join(input.receiptRoot, `${roleSpec.receiptRole}.${kind}.json`), result.stdout);
    }
    const entry = POD_COMPILED_ENTRY[roleSpec.role];
    const hashed = input.run([
      '--context', 'kind-offscreen-dev', '-n', input.namespace, 'exec', deploy, '--', 'sha256sum', entry,
    ]);
    if (hashed.status === 0) {
      diskIdentities[roleSpec.role] = String(hashed.stdout).trim().split(/\s+/)[0];
    }
  }
  return diskIdentities;
}

/**
 * Read the selected slot's game-web pod image and one HTTP status from inside
 * the cluster. A missing pod or a failed request stays unsuccessful.
 * @param {{ namespace: string, run?: Function, httpStatus?: number | null }} input
 */
export function collectWebDevServerReadiness(input) {
  const run = input.run ?? ((args) => spawnSync('kubectl', args, { encoding: 'utf8' }));
  const pod = run([
    '--context', 'kind-offscreen-dev', '-n', input.namespace,
    'get', 'pod', '-l', 'app=game-web',
    '-o', 'jsonpath={.items[0].metadata.namespace}{" "}{.items[0].status.containerStatuses[0].ready}{" "}{.items[0].status.containerStatuses[0].image}{" "}{.items[0].status.containerStatuses[0].imageID}',
  ]);
  const [namespace, ready, image, imageId] = String(pod.stdout ?? '').trim().split(/\s+/);
  let httpStatus = input.httpStatus ?? null;
  if (httpStatus === null && pod.status === 0 && ready === 'true') {
    const http = run([
      '--context', 'kind-offscreen-dev', '-n', input.namespace,
      'exec', 'deploy/game-web', '--', 'node', '-e',
      'fetch("http://127.0.0.1:3000/sign-in").then((r)=>process.stdout.write(String(r.status))).catch(()=>process.exit(1))',
    ]);
    httpStatus = http.status === 0 ? Number(String(http.stdout).trim()) : null;
  }
  const expected = run([
    '--context', 'kind-offscreen-dev', '-n', input.namespace,
    'get', 'deploy', 'game-web', '-o', 'jsonpath={.spec.template.spec.containers[0].image}',
  ]);
  const expectedImage = expected.status === 0 ? String(expected.stdout).trim() : null;
  const expectedConfigIds = [...(input.expectedConfigIds ?? [])];
  if (input.expectedConfigId) expectedConfigIds.push(input.expectedConfigId);
  if (expectedConfigIds.length === 0 && expectedImage && input.resolveImageIds) {
    expectedConfigIds.push(...input.resolveImageIds(expectedImage).filter(Boolean));
  }
  return {
    namespace: input.namespace,
    expectedImage,
    expectedConfigIds: expectedConfigIds.length > 0 ? expectedConfigIds : null,
    pod: pod.status === 0 && namespace
      ? { ready: ready === 'true', namespace, image: image || null, imageId: imageId || null }
      : null,
    httpStatus: Number.isFinite(httpStatus) ? httpStatus : null,
  };
}

export function printDevStatus(worktree, deps = {}) {
  const log = deps.log ?? ((line) => console.log(line));
  const roles = deps.roles ?? DEV_RUNTIME_FRESHNESS_ROLES;
  const evaluate = deps.evaluateDevLoadedRuntimeReadiness ?? evaluateDevLoadedRuntimeReadiness;
  const session = deps.session ?? readDevSession(worktree);
  if (!session) {
    return 2;
  }
  if (session.parked === true) {
    log('runtime PARKED');
    return 2;
  }
  if (session.checkoutPath && resolve(String(session.checkoutPath)) !== resolve(worktree)) {
    log('runtime NOT READY checkout_mismatch');
    return 2;
  }
  const rows = [
    ['pid', session.pid ?? 'stopped'],
    ['slot', session.slotId],
    ['namespace', session.namespace],
    ['gameUrl', `http://${LOOPBACK}:${session.gamePort}/`],
    ['tiltPort', session.tiltPort],
    ['startedAt', session.startedAt],
  ];
  for (const [key, value] of rows) {
    log(`${key}: ${value}`);
  }

  const cwd = resolve(worktree);
  if (deps.imageReadiness && deps.imageReadiness.applicationReady !== true) {
    log('runtime NOT READY image_loading');
    return 2;
  }
  const receiptRoot = deps.receiptRoot ?? (
    session.slotId
      ? join(cwd, '.offscreen-dev-runtime', String(session.slotId))
      : join(cwd, '.offscreen-dev-runtime')
  );
  let diskIdentities = deps.diskIdentities ?? {};
  if (deps.pullSlotReceipts && session.namespace) {
    diskIdentities = pullSelectedSlotReceipts({
      namespace: session.namespace,
      roles,
      receiptRoot,
      run: deps.execKubectl ?? ((args) => spawnSync('kubectl', args, { encoding: 'utf8' })),
    });
  }
  let everyRoleReady = true;
  if (session.namespace) {
    const webInput = deps.webReadiness ?? (
      deps.pullSlotReceipts
        ? collectWebDevServerReadiness({
          namespace: session.namespace,
          run: deps.execKubectl ?? ((args) => spawnSync('kubectl', args, { encoding: 'utf8' })),
          resolveImageIds: (image) => {
            const accepted = [];
            const host = spawnSync('docker', ['image', 'inspect', image, '--format', '{{.Id}}'], { encoding: 'utf8' });
            if (host.status === 0) accepted.push(String(host.stdout).trim());
            for (const node of ['offscreen-dev-worker', 'offscreen-dev-control-plane']) {
              const cri = spawnSync('docker', ['exec', node, 'crictl', 'inspecti', `docker.io/library/${image}`], { encoding: 'utf8' });
              const match = String(cri.stdout ?? '').match(/"id":\s*"(sha256:[a-f0-9]{64})"/);
              if (match) accepted.push(match[1]);
            }
            return accepted;
          },
        })
        : { namespace: session.namespace, expectedImage: null, pod: null, httpStatus: null }
    );
    const web = (deps.assessWebDevServerReadiness ?? assessWebDevServerReadiness)(webInput);
    log(formatDevFreshnessStatusLine('web', web));
    if (!web.ready) everyRoleReady = false;
  }
  for (const roleSpec of roles) {
    const status = evaluate({
      role: roleSpec.receiptRole,
      compiledEntryPath: roleSpec.compiledEntryPath,
      cwd,
      receiptRoot,
      environmentId: session.slotId ?? null,
      diskIdentity: diskIdentities[roleSpec.role],
    });
    log(formatDevFreshnessStatusLine(roleSpec.role, status));
    if (!status.ready) {
      everyRoleReady = false;
    }
  }

  return everyRoleReady ? 0 : 2;
}

function runDevStatusCli() {
  const worktree = REPO_ROOT;
  const session = readDevSession(worktree);
  const code = printDevStatus(worktree, { pullSlotReceipts: true });
  if (code !== 0) {
    if (!session) {
      console.error('No dev session for this worktree. Start one with: pnpm dev');
    }
    process.exit(code);
  }
}

function runDevStopCli(selection) {
  const registryRoot = devWorktreeRegistryRoot();
  const sessionRoot = environmentSessionRoot(registryRoot);
  if (!selection?.record) {
    const legacy = readDevSession(REPO_ROOT);
    const stopped = stopDevSession(REPO_ROOT);
    if (stopped.signalled && stopped.reason === 'pid_and_start_time' && legacy?.namespace) {
      scaleDevSlotWorkloads(legacy.namespace);
    }
    const quiet = stopped.signalled || stopped.reason === 'no_session' || stopped.reason === 'not_running';
    process.exit(quiet ? 0 : 1);
  }
  const result = parkSelectedEnvironment({
    owner: selection.record,
    sessionRoot,
    signal: (pid, sig) => process.kill(pid, sig),
    processDeps: {
      pidAlive,
      readStartTicks: (pid) => readProcessStartTicks(pid),
      sleep: () => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50),
    },
    scaleRole: (namespace, role) => scaleDevSlotWorkloads(namespace, spawnSync, [role]),
    readDesiredReplicas: (namespace) => readDevSlotDesiredReplicas(namespace),
    portOccupied: (ports) => [ports.game, ports.tilt].some((port) => probeLoopbackPortOccupiedSync(port)),
  });
  if (!result.ok || !result.released) {
    console.error(`Refusing to release ${selection.record.slotId}: ${result.reason}`);
    process.exit(1);
  }
  process.exit(0);
}

const invokedAsScript = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  let parsed;
  try {
    parsed = parseDevCliArgs(process.argv);
  } catch (error) {
    if (isSelectionRefusal(error)) {
      console.error(`${error.id}: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }
  const registryRoot = devWorktreeRegistryRoot();
  const registry = readRegistryJson(registryRoot);
  const registryV2 = registry?.version === 2;
  if (!registryV2 && parsed.command === 'up' && !parsed.instance) {
    await runDevTiltCli();
  } else if (!registryV2 && parsed.command === 'status' && !parsed.instance) {
    runDevStatusCli();
  } else if (!registryV2 && parsed.command === 'stop' && !parsed.instance) {
    runDevStopCli(null);
  } else {
    let selection;
    try {
      selection = resolveDevEnvironmentSelection({
        command: parsed.command,
        instance: parsed.instance,
        worktree: REPO_ROOT,
        registryRoot,
        processDeps: {
          pidAlive,
          readStartTicks: (pid) => readProcessStartTicks(pid),
        },
      });
    } catch (error) {
      if (isSelectionRefusal(error)) {
        console.error(`${error.id}: ${error.message}`);
        process.exit(1);
      }
      throw error;
    }
    if (selection.action === 'up') {
      await runDevTiltLaunch({
        owner: selection.record,
        worktree: REPO_ROOT,
        registryRoot,
      });
    } else if (selection.action === 'status') {
      const session = readEnvironmentSession(
        environmentSessionRoot(devWorktreeRegistryRoot()),
        selection.record.slotId,
      );
      const code = printDevStatus(selection.record.worktreePath, {
        session,
        pullSlotReceipts: true,
      });
      process.exit(code);
    } else if (selection.action === 'stop') {
      runDevStopCli(selection);
    }
  }
}