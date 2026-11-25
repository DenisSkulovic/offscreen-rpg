import { createConnection } from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import {
  allocateDevWorktreeOwner,
  isAllocatorRefusal,
} from '../domain/dev-worktree-allocator.mjs';
import { acquireSlotOperationLock } from '../domain/dev-worktree-registry.mjs';
import {
  collectDefaultProbes,
  runStackPreflight,
} from '../../../../scripts/repo-tools/stack-preflight.mjs';
import {
  applySelectedSlotHostReadiness,
  assessWebDevServerReadiness,
  buildReadyUrls,
  collectSelectedSlotReadiness,
  collectWebDevServerReadiness,
  LAB_RESOURCES,
  resolveDevImageConfigIds,
} from '../application/dev-status.mjs';
import {
  assessOwnedProcess,
  readProcessStartTicks,
} from '../domain/dev-process-identity.mjs';
import {
  environmentSessionRoot,
  isAllocatorRefusal as isSelectionRefusal,
  readEnvironmentSession,
  parkSelectedEnvironment,
  withSlotEnvironmentOperationLock,
  writeEnvironmentSession,
} from '../domain/dev-environment-session.mjs';
import { writeDevSessionJsonAtomically } from '../domain/dev-session-json.mjs';
import { reconcileOwnedDevSlot } from '../application/dev-slot-startup.mjs';
import {
  fingerprintDevImageContext,
  UNION_ROLE_FILTER,
} from '../../../../infra/images/development/image-plan.mjs';
import {
  beginMonitorOperation,
  beginRollbackMonitorSpan,
  beginStartupTiming,
  announceDevStartup,
  bindStartupTimingCallback,
  startupTimingChildEnv,
  withStartupTimingScope,
  emitStartupOutcomeBeforeCleanup,
  endRollbackMonitorSpan,
  finishStartupTiming,
  getStartupOperationId,
  recordPhase,
  timePhase,
} from '../application/dev-startup-timing.mjs';

export { parkSelectedEnvironment as parkSelectedDevEnvironment } from '../domain/dev-environment-session.mjs';

const REPO_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../',
);
const LOOPBACK = '127.0.0.1';
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
  writeDevSessionJsonAtomically(devSessionPath(worktree), session);
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
    return {
      hadSession: false,
      signalled: false,
      reason: 'unreadable_session',
    };
  }

  const signal = deps.signal ?? ((pid, sig) => process.kill(pid, sig));
  const ownership = assessOwnedProcess(session, {
    pidAlive: deps.pidAlive ?? pidAlive,
    readStartTicks:
      deps.readStartTicks ?? ((pid) => readProcessStartTicks(pid)),
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
  const forwardOwnership = assessOwnedProcess(
    {
      pid: session.forwardPid,
      processStartTicks: session.forwardStartTicks,
    },
    {
      pidAlive: deps.pidAlive ?? pidAlive,
      readStartTicks:
        deps.readStartTicks ?? ((pid) => readProcessStartTicks(pid)),
    },
  );
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
export function scaleDevSlotWorkloads(
  namespace,
  spawnFn = spawnSync,
  roles = SLOT_WORKLOADS,
) {
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
      '--context',
      'kind-offscreen-dev',
      '-n',
      namespace,
      'scale',
      'deploy',
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

const DEV_LAUNCH_HOST_REFUSAL_IDS = Object.freeze(
  new Set([
    'missing-docker',
    'missing-kind',
    'missing-kubectl',
    'docker-daemon',
    'memory-low',
    'memory-unknown',
  ]),
);

/**
 * @param {{ ok: boolean, refusals?: DevRefusal[] }} preflight
 * @returns {DevRefusal[]}
 */
export function collectDevLaunchHostRefusals(preflight) {
  if (preflight.ok) return [];
  return (preflight.refusals ?? []).filter((refusal) =>
    DEV_LAUNCH_HOST_REFUSAL_IDS.has(refusal.id),
  );
}

/**
 * @param {DevSessionRecord | null} session
 * @param {{ pidAlive: (pid: number) => boolean, readStartTicks: (pid: number) => string | null }} processDeps
 * @param {'game' | 'tilt'} kind
 */
function verifiedOwnedPortHolder(session, processDeps, kind) {
  if (!session) return false;
  if (kind === 'tilt') {
    return assessOwnedProcess(session, processDeps).owned;
  }
  return assessOwnedProcess(
    {
      pid: session.forwardPid,
      processStartTicks: session.forwardStartTicks,
    },
    processDeps,
  ).owned;
}

/**
 * @param {{
 *   gamePort: number,
 *   tiltPort: number,
 *   session: DevSessionRecord | null,
 *   probeOccupied: typeof probeLoopbackPortOccupied,
 *   processDeps: { pidAlive: (pid: number) => boolean, readStartTicks: (pid: number) => string | null },
 * }} input
 * @returns {Promise<DevRefusal[]>}
 */
export async function collectDevLaunchPortRefusals(input) {
  /** @type {DevRefusal[]} */
  const refusals = [];
  const gameOccupied = await input.probeOccupied(LOOPBACK, input.gamePort);
  const tiltOccupied = await input.probeOccupied(LOOPBACK, input.tiltPort);
  if (
    gameOccupied &&
    !verifiedOwnedPortHolder(input.session, input.processDeps, 'game')
  ) {
    refusals.push({
      id: 'foreign-game-port',
      message: `${LOOPBACK}:${input.gamePort} is in use by a non-owned listener.`,
    });
  }
  if (
    tiltOccupied &&
    !verifiedOwnedPortHolder(input.session, input.processDeps, 'tilt')
  ) {
    refusals.push({
      id: 'foreign-tilt-port',
      message: `${LOOPBACK}:${input.tiltPort} is in use by a non-owned listener.`,
    });
  }
  return refusals;
}

/** Same 50ms poll explicit `pnpm dev:stop` uses while an owned process exits. */
function waitOwnedProcessExitPoll() {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
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
 *   ownedProcessPoll?: () => void,
 *   log?: (line: string) => void,
 *   workloadsTouched?: boolean,
 *   ephemeralChildren?: ReadonlyArray<{
 *     pid: number,
 *     processStartTicks?: string | null,
 *   }>,
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
  const environmentSession = readEnvironmentSession(
    sessionRoot,
    input.owner.slotId,
  );
  const signal =
    input.signal ?? ((childPid, sig) => process.kill(childPid, sig));
  const workloadsTouched = input.workloadsTouched !== false;
  if (!environmentSession) {
    try {
      for (const child of input.ephemeralChildren ?? []) {
        if (Number.isInteger(child?.pid) && child.pid > 0) {
          try {
            signal(child.pid, 'SIGTERM');
          } catch {
            // ignore
          }
        }
      }
      stopDevSession(input.worktree, {
        signal: input.signal,
        pidAlive: input.pidAlive,
        readStartTicks: input.readStartTicks,
      });
      if (!workloadsTouched) {
        log(`startup-aborted: ${input.reason}; ${namespace}`);
        return {
          ok: true,
          id: 'startup-aborted',
          parked: false,
          ownedResources,
        };
      }
      const scaleAll = input.scaleRole
        ? SLOT_WORKLOADS.forEach((role) => input.scaleRole(namespace, role))
        : scaleDevSlotWorkloads(namespace);
      void scaleAll;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(
        `rollback-incomplete: ${input.reason}; ${message}; ${JSON.stringify(ownedResources)}`,
      );
      return {
        ok: false,
        id: 'rollback-incomplete',
        parked: false,
        ownedResources,
      };
    }
    const desired = (
      input.readDesiredReplicas ?? ((ns) => readDevSlotDesiredReplicas(ns))
    )(namespace);
    const leftover = SLOT_WORKLOADS.filter((role) => desired?.[role] !== 0);
    if (leftover.length > 0) {
      log(
        `rollback-incomplete: ${input.reason}; replicas still desired; ${JSON.stringify({ ...ownedResources, leftover })}`,
      );
      return {
        ok: false,
        id: 'rollback-incomplete',
        parked: false,
        ownedResources: { ...ownedResources, leftover },
      };
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
        readStartTicks:
          input.readStartTicks ?? ((pid) => readProcessStartTicks(pid)),
        sleep: input.ownedProcessPoll ?? waitOwnedProcessExitPoll,
      },
      scaleRole:
        input.scaleRole ??
        ((ns, role) => scaleDevSlotWorkloads(ns, spawnSync, [role])),
      readDesiredReplicas:
        input.readDesiredReplicas ?? ((ns) => readDevSlotDesiredReplicas(ns)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(
      `rollback-incomplete: ${input.reason}; ${message}; ${JSON.stringify(ownedResources)}`,
    );
    return {
      ok: false,
      id: 'rollback-incomplete',
      parked: false,
      ownedResources,
    };
  }
  if (!park?.ok || park.released !== true) {
    log(
      `rollback-incomplete: ${input.reason}; ${park?.reason ?? 'park failed'}; ${JSON.stringify({ ...ownedResources, scaledRoles: park?.scaledRoles ?? [] })}`,
    );
    return {
      ok: false,
      id: 'rollback-incomplete',
      parked: false,
      reason: park?.reason,
      ownedResources,
    };
  }
  const desired = (
    input.readDesiredReplicas ?? ((ns) => readDevSlotDesiredReplicas(ns))
  )(namespace);
  const leftover = SLOT_WORKLOADS.filter((role) => desired?.[role] !== 0);
  if (leftover.length > 0) {
    log(
      `rollback-incomplete: ${input.reason}; replicas still desired; ${JSON.stringify({ ...ownedResources, leftover })}`,
    );
    return {
      ok: false,
      id: 'rollback-incomplete',
      parked: false,
      ownedResources: { ...ownedResources, leftover },
    };
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
    const result = spawnFn(
      'kubectl',
      [
        '--context',
        'kind-offscreen-dev',
        '-n',
        namespace,
        'get',
        'deploy',
        role,
        '-o',
        'jsonpath={.spec.replicas}',
      ],
      { encoding: 'utf8' },
    );
    if (result.status !== 0) {
      throw new Error(
        result.stderr || `replica read failed for ${namespace}/${role}`,
      );
    }
    desired[role] = Number(String(result.stdout).trim());
  }
  return desired;
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
  const sleep =
    input.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
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
      return {
        ok: false,
        reason: 'start_time_mismatch',
        attempts: attempt,
        pid: child.pid,
      };
    }
    input.recordForward({ pid: child.pid, processStartTicks });
    const code = await new Promise((resolve) => child.onExit(resolve));
    if (!input.sessionActive()) {
      return {
        ok: true,
        reason: 'session_stopped',
        attempts: attempt + 1,
        pid: child.pid,
        code,
      };
    }
    await sleep(Math.min(1_000, 50 * (attempt + 1)));
  }
  if (!input.sessionActive()) {
    return { ok: true, reason: 'cancelled', attempts: maxAttempts };
  }
  return { ok: false, reason: 'retries_exhausted', attempts: maxAttempts };
}

/** @typedef {'busy-retry' | 'stop' | 'missing-platform'} DevOperatorNextAction */

const DEV_OPERATOR_BUSY_RETRY_IDS = Object.freeze(
  new Set(['slot-operation-busy']),
);
const DEV_OPERATOR_STOP_IDS = Object.freeze(
  new Set(['session-active', 'foreign-game-port', 'foreign-tilt-port']),
);
const DEV_OPERATOR_MISSING_PLATFORM_IDS = Object.freeze(
  new Set([...DEV_LAUNCH_HOST_REFUSAL_IDS, 'missing-tilt', 'helm-missing']),
);

/**
 * @param {string | null | undefined} refusalId
 * @returns {DevOperatorNextAction}
 */
export function resolveDevOperatorNextAction(refusalId) {
  if (refusalId && DEV_OPERATOR_BUSY_RETRY_IDS.has(refusalId)) {
    return 'busy-retry';
  }
  if (refusalId && DEV_OPERATOR_STOP_IDS.has(refusalId)) {
    return 'stop';
  }
  if (refusalId && DEV_OPERATOR_MISSING_PLATFORM_IDS.has(refusalId)) {
    return 'missing-platform';
  }
  if (refusalId?.startsWith('slot-')) {
    return 'missing-platform';
  }
  if (refusalId?.startsWith('resource-')) {
    return 'stop';
  }
  return 'missing-platform';
}

/**
 * One bounded operator line: selected slot, failing phase, and next action.
 *
 * @param {{
 *   slotId: string,
 *   phase: string,
 *   nextAction?: DevOperatorNextAction | null,
 * }} input
 */
export function formatDevOperatorSummaryLine(input) {
  const parts = [`slot ${input.slotId}`, `phase=${input.phase}`];
  if (input.nextAction) {
    parts.push(`next=${input.nextAction}`);
  }
  return parts.join(' ');
}

/** @typedef {{ id: string, message: string }} DevRefusal */
/** @typedef {{ game: 'free'|'owned'|'foreign', tilt: 'free'|'owned'|'foreign' }} DevPorts */
/** @typedef {Record<string, boolean | undefined>} ReadinessMap */

/**
 * @returns {string}
 */
export function devWorktreeRegistryRoot() {
  const fromEnv = process.env.OFFSCREEN_DEV_WORKTREE_REGISTRY?.trim();
  if (fromEnv) return resolve(fromEnv);
  return join(
    homedir(),
    '.local',
    'state',
    'offscreen-rpg',
    'dev-worktree-registry',
  );
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
    refusals.push({
      id: 'missing-tilt',
      message: 'Required command not found: tilt.',
    });
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
      const id =
        ready === undefined
          ? `resource-missing-${name}`
          : `resource-not-ready-${name}`;
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

  const allReady = LAB_RESOURCES.every(
    (name) => input.readiness[name] === true,
  );

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
 * @param {string | null} [slotId]
 * @returns {string[]}
 */
export function maybeAnnounce(assessment, slotId = null) {
  if (
    !assessment ||
    typeof assessment !== 'object' ||
    Array.isArray(assessment)
  ) {
    return [];
  }
  if (!('urls' in assessment) || assessment.urls == null) {
    return [];
  }
  const urlLines = formatReadyLines(assessment.urls);
  if (!slotId) {
    return urlLines;
  }
  return [
    formatDevOperatorSummaryLine({
      slotId,
      phase: 'ready',
      nextAction: null,
    }),
    ...urlLines,
  ];
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
  const probe = spawnSync(
    process.execPath,
    [
      '-e',
      `
    const net = require('node:net');
    const socket = net.connect({ host: '127.0.0.1', port: ${Number(port)}, timeout: 200 });
    socket.on('connect', () => { socket.destroy(); process.exit(0); });
    socket.on('timeout', () => { socket.destroy(); process.exit(1); });
    socket.on('error', () => process.exit(1));
  `,
    ],
    { stdio: 'ignore' },
  );
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
 * @param {DevRefusal[]} refusals
 * @param {(code: number) => never | void} [exitFn]
 * @param {{ slotId?: string | null, phase?: string | null }} [operator]
 */
function refuseAndExit(
  refusals,
  exitFn = (code) => process.exit(code),
  operator = null,
) {
  if (operator?.slotId) {
    const primary = refusals[0];
    console.error(
      formatDevOperatorSummaryLine({
        slotId: operator.slotId,
        phase: operator.phase ?? primary?.id ?? 'refused',
        nextAction: resolveDevOperatorNextAction(primary?.id),
      }),
    );
  }
  for (const refusal of refusals) {
    console.error(refusal.message);
  }
  finishStartupTiming(
    `refused:${refusals.map((refusal) => refusal.id).join(',')}`,
  );
  exitFn(1);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** @typedef {import('../domain/dev-worktree-registry.mjs').DevWorktreeOwnerRecord} DevWorktreeOwnerRecord */

/** @type {Map<string, Promise<ReturnType<typeof rollbackFailedOwnedStartup>>>} */
const slotOwnedCleanupInFlight = new Map();

/**
 * One idempotent park/rollback per slot while stop and launcher races.
 *
 * @template T
 * @param {string} slotId
 * @param {() => T | Promise<T>} run
 * @returns {Promise<T>}
 */
function ensureSerializedSlotOwnedCleanup(slotId, run) {
  const existing = slotOwnedCleanupInFlight.get(slotId);
  if (existing) return /** @type {Promise<T>} */ (existing);
  const promise = Promise.resolve()
    .then(run)
    .finally(() => {
      if (slotOwnedCleanupInFlight.get(slotId) === promise) {
        slotOwnedCleanupInFlight.delete(slotId);
      }
    });
  slotOwnedCleanupInFlight.set(slotId, promise);
  return promise;
}

/**
 * @param {{
 *   worktree: string,
 *   owner: DevWorktreeOwnerRecord,
 *   registryRoot: string,
 *   reason: string,
 *   workloadsTouched: boolean,
 *   sessionRecord?: Record<string, unknown> | null,
 *   ephemeralChildren?: ReadonlyArray<{
 *     pid: number,
 *     processStartTicks?: string | null,
 *   }>,
 *   deps?: RunDevTiltLaunchDeps,
 * }} input
 */
function runOwnedEnvironmentParkOperation(input) {
  const deps = input.deps ?? {};
  const readStart =
    deps.readStartTicks ?? ((pid) => readProcessStartTicks(pid));
  const sessionRoot = environmentSessionRoot(input.registryRoot);
  const environmentSession = deps.owner
    ? (input.sessionRecord ??
      readEnvironmentSession(sessionRoot, input.owner.slotId))
    : null;
  if (
    deps.owner &&
    environmentSession &&
    environmentSession.slotId === input.owner.slotId
  ) {
    const park = parkSelectedEnvironment({
      owner: { ...input.owner, worktreePath: input.worktree },
      sessionRoot,
      session: environmentSession,
      signal: deps.signal,
      processDeps: {
        pidAlive: deps.pidAlive ?? pidAlive,
        readStartTicks: readStart,
        sleep: deps.ownedProcessPoll ?? waitOwnedProcessExitPoll,
      },
      scaleRole:
        deps.scaleRole ??
        ((namespace, role) =>
          scaleDevSlotWorkloads(namespace, spawnSync, [role])),
      readDesiredReplicas:
        deps.readDesiredReplicas ?? ((ns) => readDevSlotDesiredReplicas(ns)),
      portOccupied: deps.portOccupied,
    });
    const log = deps.log ?? ((line) => console.error(line));
    if (!park?.ok || park.released !== true) {
      log(
        `rollback-incomplete: ${input.reason}; ${park?.reason ?? 'park failed'}; ${JSON.stringify(
          {
            slotId: input.owner.slotId,
            namespace: input.owner.namespace,
            scaledRoles: park?.scaledRoles ?? [],
          },
        )}`,
      );
      return {
        ok: false,
        id: 'rollback-incomplete',
        parked: false,
        reason: park?.reason,
      };
    }
    const desired = (
      deps.readDesiredReplicas ?? ((ns) => readDevSlotDesiredReplicas(ns))
    )(input.owner.namespace);
    const leftover = SLOT_WORKLOADS.filter((role) => desired?.[role] !== 0);
    if (leftover.length > 0) {
      log(
        `rollback-incomplete: ${input.reason}; replicas still desired; ${JSON.stringify({ leftover })}`,
      );
      return {
        ok: false,
        id: 'rollback-incomplete',
        parked: false,
      };
    }
    log(`startup-parked: ${input.reason}; ${input.owner.namespace}`);
    return { ok: true, id: 'startup-parked', parked: true };
  }
  return rollbackFailedOwnedStartup({
    worktree: input.worktree,
    owner: { ...input.owner, worktreePath: input.worktree },
    registryRoot: input.registryRoot,
    reason: input.reason,
    workloadsTouched: input.workloadsTouched,
    ephemeralChildren: input.ephemeralChildren,
    signal: deps.signal,
    pidAlive: deps.pidAlive ?? pidAlive,
    readStartTicks: readStart,
    scaleRole: deps.scaleRole,
    readDesiredReplicas: deps.readDesiredReplicas,
    log: deps.log,
  });
}

/**
 * @param {Parameters<typeof runOwnedEnvironmentParkOperation>[0]} input
 * @param {{ launcherHoldsOperationLock?: boolean }} [options]
 */
async function settleOwnedEnvironmentPark(input, options = {}) {
  if (!input.workloadsTouched) {
    return { ok: true, id: 'startup-aborted', parked: false };
  }
  return ensureSerializedSlotOwnedCleanup(input.owner.slotId, async () => {
    const runPark = () => runOwnedEnvironmentParkOperation(input);
    if (options.launcherHoldsOperationLock === true) {
      return runPark();
    }
    try {
      return withSlotEnvironmentOperationLock(
        input.registryRoot,
        input.owner.slotId,
        runPark,
        {
          tryOnly: true,
          lockTimeoutMs: input.deps?.slotOperationLockTimeoutMs ?? 0,
        },
      );
    } catch (error) {
      if (isAllocatorRefusal(error) && error.id === 'slot-operation-busy') {
        const inflight = slotOwnedCleanupInFlight.get(input.owner.slotId);
        if (inflight) return inflight;
      }
      throw error;
    }
  });
}

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
 *   collectStartupReadiness?: (namespace: string) => Promise<ReadinessMap>,
 *   exit?: (code: number) => never | void,
 *   exitAfterSession?: boolean,
 *   fingerprintDevImageContext?: typeof fingerprintDevImageContext,
 *   acquireSlotOperationLock?: typeof acquireSlotOperationLock,
 *   slotOperationLockTimeoutMs?: number,
 *   slotOperationLockTryOnly?: boolean,
 *   exposeLaunchCancellation?: (handler: (signal: 'SIGINT' | 'SIGTERM') => void) => void,
 * }} RunDevTiltLaunchDeps */

/**
 * @param {RunDevTiltLaunchDeps} [deps]
 * @returns {Promise<void>}
 */
export async function runDevTiltLaunch(deps = {}) {
  return withStartupTimingScope(() => runScopedDevTiltLaunch(deps));
}

/** @param {RunDevTiltLaunchDeps} deps */
async function runScopedDevTiltLaunch(deps) {
  const worktree = deps.worktree ?? REPO_ROOT;
  const registryRoot = deps.registryRoot ?? devWorktreeRegistryRoot();
  const allocate = deps.allocateDevWorktreeOwner ?? allocateDevWorktreeOwner;
  const collectProbes = deps.collectDefaultProbes ?? collectDefaultProbes;
  const runPreflight = deps.runStackPreflight ?? runStackPreflight;
  const onPath = deps.commandOnPath ?? commandOnPath;
  const probeOccupied =
    deps.probeLoopbackPortOccupied ?? probeLoopbackPortOccupied;
  const spawnFn = deps.spawnFn ?? spawn;
  const runKubectl =
    deps.execKubectl ??
    ((args) => spawnSync('kubectl', args, { encoding: 'utf8' }));
  const observeSlotReadiness =
    deps.collectSelectedSlotReadiness ?? collectSelectedSlotReadiness;
  const exitFn = deps.exit ?? ((code) => process.exit(code));
  const reconcile = deps.reconcileDevSlot ?? reconcileOwnedDevSlot;

  // Read-only launch admission: host facts, owner, ports, then reconcile.
  beginStartupTiming(join(worktree, '.offscreen', 'dev-startup-timing.json'));
  const probes = await timePhase('preflight', null, () => collectProbes());
  const preflight = runPreflight(probes);
  const processDeps = {
    pidAlive: deps.pidAlive ?? pidAlive,
    readStartTicks:
      deps.readStartTicks ?? ((pid) => readProcessStartTicks(pid)),
  };

  /** @type {DevRefusal[]} */
  const admissionRefusals = [...collectDevLaunchHostRefusals(preflight)];

  const helmProbe =
    deps.assertHelmAvailable ??
    (async () => {
      const { spawnSync } = await import('node:child_process');
      const { assertHelmAvailable } =
        await import('../../../../infra/workloads/render.mjs');
      const run = deps.helmRun ?? deps.runCommand ?? spawnSync;
      return assertHelmAvailable({ run });
    });
  try {
    await helmProbe();
  } catch (error) {
    admissionRefusals.push({
      id: 'helm-missing',
      message: error instanceof Error ? error.message : 'helm is not available',
    });
  }

  if (!onPath('tilt')) {
    admissionRefusals.push({
      id: 'missing-tilt',
      message: 'Required command not found: tilt.',
    });
  }

  /** @type {DevWorktreeOwnerRecord | undefined} */
  let ownerRecord = deps.owner;
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

  if (admissionRefusals.length > 0) {
    refuseAndExit(admissionRefusals, exitFn, {
      slotId: ownerRecord.slotId,
      phase: 'admission',
    });
    return;
  }

  const acquireSlotLock =
    deps.acquireSlotOperationLock ?? acquireSlotOperationLock;
  /** @type {{ release: () => void } | null} */
  let slotOperationLock = null;
  const releaseSlotOperationLock = () => {
    if (slotOperationLock) {
      slotOperationLock.release();
      slotOperationLock = null;
    }
  };
  try {
    slotOperationLock = acquireSlotLock({
      registryRoot,
      slotId: ownerRecord.slotId,
      lockTimeoutMs: deps.slotOperationLockTimeoutMs ?? 0,
      tryOnly: deps.slotOperationLockTryOnly ?? true,
    });
  } catch (error) {
    if (isAllocatorRefusal(error)) {
      refuseAndExit([{ id: error.id, message: error.message }], exitFn, {
        slotId: ownerRecord.slotId,
        phase: 'lock',
      });
      return;
    }
    throw error;
  }

  try {
    const session = deps.owner
      ? readEnvironmentSession(
          environmentSessionRoot(registryRoot),
          ownerRecord.slotId,
        )
      : readDevSession(worktree);

    const activeOwnership = session
      ? assessOwnedProcess(session, processDeps)
      : { owned: false };
    if (activeOwnership.owned) {
      refuseAndExit(
        [
          {
            id: 'session-active',
            message:
              'An owned dev session is already running. Stop it with pnpm dev:stop, then run pnpm dev again.',
          },
        ],
        exitFn,
        { slotId: ownerRecord.slotId, phase: 'session' },
      );
      return;
    }

    const portRefusals = await collectDevLaunchPortRefusals({
      gamePort: ownerRecord.ports.game,
      tiltPort: ownerRecord.ports.tilt,
      session,
      probeOccupied,
      processDeps,
    });
    if (portRefusals.length > 0) {
      refuseAndExit(portRefusals, exitFn, {
        slotId: ownerRecord.slotId,
        phase: 'ports',
      });
      return;
    }

    const gamePort = ownerRecord.ports.game;
    const tiltPort = ownerRecord.ports.tilt;
    let workloadsTouched = false;
    let launchCancelled = false;
    /** @type {string | null} */
    let cancelReason = null;
    /** @type {import('node:child_process').ChildProcess | null} */
    let tiltChild = null;
    /** @type {Record<string, unknown> | null} */
    let activeSessionRecord = null;
    let launchCleanupSettled = false;
    let tiltExitHandled = false;
    let announced = false;
    /** @type {ReturnType<typeof setInterval> | undefined} */
    let pollTimer;

    const stopPolling = () => {
      if (pollTimer) clearInterval(pollTimer);
    };

    const readStart =
      deps.readStartTicks ?? ((pid) => readProcessStartTicks(pid));

    const ephemeralLaunchChildren = () => {
      if (!tiltChild?.pid) return [];
      return [
        {
          pid: tiltChild.pid,
          processStartTicks: readStart(tiltChild.pid),
        },
      ];
    };

    const parkInput = (reason) => ({
      worktree,
      owner: ownerRecord,
      registryRoot,
      reason,
      workloadsTouched,
      sessionRecord: activeSessionRecord,
      ephemeralChildren: ephemeralLaunchChildren(),
      deps,
    });

    /** @type {(() => void) | undefined} */
    let onSigint;
    /** @type {(() => void) | undefined} */
    let onSigterm;
    let launchSignalsInstalled = false;
    const removeLaunchSignalHandlers = () => {
      if (!launchSignalsInstalled) return;
      launchSignalsInstalled = false;
      if (onSigint) process.removeListener('SIGINT', onSigint);
      if (onSigterm) process.removeListener('SIGTERM', onSigterm);
    };

    const settleLaunchCleanup = async (reason, exitCode) => {
      if (launchCleanupSettled) return;
      launchCleanupSettled = true;
      removeLaunchSignalHandlers();
      emitStartupOutcomeBeforeCleanup(reason);
      beginRollbackMonitorSpan(getStartupOperationId());
      const parkResult = await settleOwnedEnvironmentPark(parkInput(reason), {
        launcherHoldsOperationLock: Boolean(slotOperationLock),
      });
      endRollbackMonitorSpan(parkResult?.ok === true);
      releaseSlotOperationLock();
      finishStartupTiming(reason);
      exitFn(exitCode);
    };

    const cancelLaunch = (reason) => {
      if (launchCancelled) return;
      launchCancelled = true;
      cancelReason = reason;
      stopPolling();
    };

    const onSignal = bindStartupTimingCallback((signal) => {
      cancelLaunch(`signal:${signal}`);
      void settleLaunchCleanup(
        `signal:${signal}`,
        signal === 'SIGTERM' ? 143 : 130,
      );
    });
    const installLaunchSignalHandlers = () => {
      if (deps.exitAfterSession || launchSignalsInstalled) return;
      onSigint = () => {
        onSignal('SIGINT');
      };
      onSigterm = () => {
        onSignal('SIGTERM');
      };
      launchSignalsInstalled = true;
      process.on('SIGINT', onSigint);
      process.on('SIGTERM', onSigterm);
    };
    deps.exposeLaunchCancellation?.(onSignal);
    installLaunchSignalHandlers();

    const slot = await timePhase('reconcile', null, () =>
      reconcile({
        worktree,
        registryRoot,
        owner: ownerRecord,
        launchAdmissionProved: true,
      }),
    );
    workloadsTouched = Boolean(slot?.workloadsTouched);
    if (launchCancelled) {
      await settleLaunchCleanup(
        cancelReason ?? 'cancelled',
        cancelReason?.startsWith('signal:') ? 130 : 1,
      );
      return;
    }
    if (!slot?.ok || slot.readyForWorkloads !== true) {
      if (workloadsTouched) {
        await settleOwnedEnvironmentPark(
          parkInput(
            `Dev slot reconciliation stopped at ${slot?.phase ?? 'startup'}: ${slot?.detail ?? 'not ready'}`,
          ),
          { launcherHoldsOperationLock: Boolean(slotOperationLock) },
        );
      }
      releaseSlotOperationLock();
      removeLaunchSignalHandlers();
      refuseAndExit(
        [
          {
            id: `slot-${slot?.phase ?? 'startup'}`,
            message: `Dev slot reconciliation stopped at ${slot?.phase ?? 'startup'}: ${slot?.detail ?? 'not ready'}`,
          },
        ],
        exitFn,
        {
          slotId: ownerRecord.slotId,
          phase: slot?.phase ?? 'startup',
        },
      );
      return;
    }

    ownerRecord = deps.owner ?? slot.record ?? ownerRecord;
    if (slot?.workloadsTouched === false) {
      workloadsTouched = false;
    } else if (slot?.workloadsTouched === true) {
      workloadsTouched = true;
    } else if (slot?.ok && slot?.readyForWorkloads === true) {
      workloadsTouched = true;
    }

    const fingerprint =
      deps.fingerprintDevImageContext ?? fingerprintDevImageContext;
    announceDevStartup('▶ ' + ownerRecord.slotId + ' / image fingerprint');
    const fingerprintStarted = performance.now();
    const imageDistribution =
      beginMonitorOperation('dev.images.distribute', {
        parentOperationId: getStartupOperationId(),
      }) ?? null;
    const imageIdentity = fingerprint(worktree, {
      roleFilter: UNION_ROLE_FILTER,
    });
    recordPhase('fingerprint', null, performance.now() - fingerprintStarted, {
      cache: imageIdentity.ok ? 'miss' : 'fail',
    });
    if (imageIdentity.ok) {
      imageDistribution?.finish('success');
    } else {
      imageDistribution?.fail('failure');
    }
    if (launchCancelled) {
      await settleLaunchCleanup(cancelReason ?? 'cancelled', 130);
      return;
    }
    if (!imageIdentity.ok) {
      console.error(`image fingerprint failed: ${imageIdentity.reason}`);
      await settleLaunchCleanup(
        `image fingerprint failed: ${imageIdentity.reason}`,
        1,
      );
      return;
    }
    const tiltEnv = {
      ...process.env,
      ...startupTimingChildEnv(),
      OFFSCREEN_DEV_SLOT: ownerRecord.slotId,
      OFFSCREEN_DEV_NAMESPACE: ownerRecord.namespace,
      OFFSCREEN_DEV_GAME_PORT: String(gamePort),
      OFFSCREEN_DEV_TILT_PORT: String(tiltPort),
      OFFSCREEN_IMAGE_FINGERPRINT: imageIdentity.fingerprint,
      // Tilt image checks run while readiness is the open parent phase.
      OFFSCREEN_STARTUP_PHASE_PARENT: 'readiness',
    };

    if (launchCancelled) {
      await settleLaunchCleanup(cancelReason ?? 'cancelled', 130);
      return;
    }
    announceDevStartup('▶ ' + ownerRecord.slotId + ' / starting Tilt');
    const child = spawnFn(
      'tilt',
      [
        'up',
        '--context',
        'kind-offscreen-dev',
        '--host',
        LOOPBACK,
        '--port',
        String(tiltPort),
      ],
      { cwd: worktree, stdio: 'inherit', env: tiltEnv },
    );
    tiltChild = child;

    if (!child.pid) {
      console.error('Failed to start tilt.');
      await settleLaunchCleanup('Failed to start tilt.', 1);
      return;
    }

    const processStartTicks = readStart(child.pid);
    if (!processStartTicks) {
      console.error('Failed to read owned tilt process identity.');
      await settleLaunchCleanup('missing tilt process start ticks', 1);
      return;
    }
    const sessionRecord = {
      pid: child.pid,
      processStartTicks,
      forwardPid: null,
      forwardStartTicks: null,
      slotId: ownerRecord.slotId,
      namespace: ownerRecord.namespace,
      gamePort,
      tiltPort,
      startedAt: new Date().toISOString(),
    };
    if (deps.owner) {
      activeSessionRecord = {
        ...sessionRecord,
        checkoutPath: worktree,
        parked: false,
        released: false,
      };
      writeEnvironmentSession(
        environmentSessionRoot(registryRoot),
        activeSessionRecord,
      );
    } else {
      activeSessionRecord = sessionRecord;
      writeDevSession(worktree, sessionRecord);
    }

    if (deps.exitAfterSession) {
      removeLaunchSignalHandlers();
      releaseSlotOperationLock();
      return;
    }

    const startupWindowMs = deps.startupWindowMs ?? OWNED_STARTUP_WINDOW_MS;
    const startupPollMs = deps.startupPollMs ?? 5_000;
    const pause = deps.sleep ?? sleep;
    const readStartup =
      deps.collectStartupReadiness ??
      ((namespace) =>
        Promise.resolve(
          observeSlotReadiness({
            namespace,
            environmentId: ownerRecord.slotId,
            useRemoteObservations: true,
            observeDeployments: true,
            run: runKubectl,
            spawnFn: deps.spawnFn ?? spawnSync,
            resolveImageIds:
              deps.resolveDevImageConfigIds ?? resolveDevImageConfigIds,
          }).readiness,
        ));
    announceDevStartup('▶ ' + ownerRecord.slotId + ' / waiting for six workloads');
    const readinessStarted = performance.now();
    /** @type {string | null} */
    let startupFailure = null;
    for (
      let elapsed = 0;
      elapsed <= startupWindowMs;
      elapsed += startupPollMs
    ) {
      const during = runPreflight(await collectProbes());
      if (launchCancelled) {
        startupFailure = cancelReason;
        break;
      }
      const exhausted = (during.refusals ?? []).filter(
        (refusal) =>
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
      if (launchCancelled) {
        startupFailure = cancelReason;
        break;
      }
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
        recordPhase('readiness', null, performance.now() - readinessStarted);
        finishStartupTiming('six-roles-ready');
        break;
      }
      announceDevStartup('… ' + ownerRecord.slotId + ' / waiting: ' + assessment.refusals.map(refusal => refusal.id).join(', '));
      if (elapsed === startupWindowMs) {
        const missing = assessment.refusals
          .map((refusal) => refusal.id)
          .join(',');
        startupFailure = `startup window elapsed before six workloads were ready (${missing})`;
        break;
      }
      await pause(startupPollMs);
    }
    if (startupFailure) {
      recordPhase('readiness', null, performance.now() - readinessStarted);
      if (launchCancelled) {
        await settleLaunchCleanup(startupFailure, 130);
        return;
      }
      await settleLaunchCleanup(startupFailure, 1);
      return;
    }

    releaseSlotOperationLock();

    if (deps.exitAfterReady) {
      removeLaunchSignalHandlers();
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
    const onUnexpectedTiltExit = async (code) => {
      if (tiltExitHandled) return;
      tiltExitHandled = true;
      sessionActive = false;
      stopPolling();
      if (slotOwnedCleanupInFlight.has(ownerRecord.slotId)) {
        await slotOwnedCleanupInFlight.get(ownerRecord.slotId);
        exitFn(code ?? 0);
        return;
      }
      await settleLaunchCleanup(`tilt exited ${code ?? 0}`, code ?? 0);
    };
    const supervise = deps.supervisePortForward ?? superviseOwnedWebPortForward;
    void supervise({
      sessionActive: () => sessionActive,
      backendReady:
        deps.webBackendReady ??
        (async () => {
          const web = collectWebDevServerReadiness({
            namespace: ownerRecord.namespace,
            run: runKubectl,
            resolveImageIds:
              deps.resolveDevImageConfigIds ?? resolveDevImageConfigIds,
          });
          return assessWebDevServerReadiness(web).ready;
        }),
      portOccupied: () => probeOccupied(LOOPBACK, gamePort),
      spawnForward:
        deps.spawnPortForward ??
        (() => {
          const forward = spawn(
            'kubectl',
            [
              '--context',
              'kind-offscreen-dev',
              '-n',
              ownerRecord.namespace,
              'port-forward',
              'svc/game-web',
              `${gamePort}:3000`,
            ],
            { stdio: 'ignore' },
          );
          return {
            pid: forward.pid ?? null,
            onExit: (cb) => forward.on('exit', (code) => cb(code)),
          };
        }),
      readStartTicks: readStart,
      recordForward: persistForward,
    }).catch(() => {});

    pollTimer = setInterval(async () => {
      if (announced) return;
      const resolved = await applySelectedSlotHostReadiness(
        observeSlotReadiness({
          namespace: ownerRecord.namespace,
          environmentId: ownerRecord.slotId,
          useRemoteObservations: true,
          observeDeployments: true,
          run: runKubectl,
          spawnFn: deps.spawnFn ?? spawnSync,
          resolveImageIds:
            deps.resolveDevImageConfigIds ?? resolveDevImageConfigIds,
        }),
        { gamePort, fetch: deps.fetch },
      );
      const gameOcc = await probeOccupied(LOOPBACK, gamePort);
      const tiltOcc = await probeOccupied(LOOPBACK, tiltPort);
      const gameOwned = verifiedOwnedPortHolder(
        sessionRecord,
        processDeps,
        'game',
      );
      const tiltOwned = verifiedOwnedPortHolder(
        sessionRecord,
        processDeps,
        'tilt',
      );
      const assessment = assessDevLaunch({
        preflightOk: true,
        preflightRefusals: [],
        tiltOnPath: true,
        ports: {
          game: gameOcc ? (gameOwned ? 'owned' : 'foreign') : 'free',
          tilt: tiltOcc ? (tiltOwned ? 'owned' : 'free') : 'free',
        },
        readiness: resolved.readiness,
        gamePort,
        tiltPort,
      });
      const lines = maybeAnnounce(assessment, ownerRecord.slotId);
      if (lines.length > 0) {
        announced = true;
        for (const line of lines) {
          console.log(line);
        }
      }
    }, 5_000);

    child.on('exit', bindStartupTimingCallback((code) => {
      sessionActive = false;
      if (launchCleanupSettled) {
        stopPolling();
        exitFn(code ?? 0);
        return;
      }
      void onUnexpectedTiltExit(code);
    }));
  } finally {
    releaseSlotOperationLock();
  }
}

export async function runDevEnvironmentStop(selection, deps = {}) {
  const stopOperation = beginMonitorOperation('dev.stop');
  const registryRoot = deps.registryRoot ?? devWorktreeRegistryRoot();
  const sessionRoot = environmentSessionRoot(registryRoot);
  const stopRefusal = (error) => {
    if (isSelectionRefusal(error)) {
      (deps.logError ?? console.error)(`${error.id}: ${error.message}`);
      (deps.exit ?? ((code) => process.exit(code)))(1);
      return;
    }
    throw error;
  };
  if (!selection?.record) {
    const legacy = readDevSession(deps.worktree ?? REPO_ROOT);
    const slotId = legacy?.slotId;
    const parkLegacy = () => {
      const stopped = stopDevSession(deps.worktree ?? REPO_ROOT);
      if (
        stopped.signalled &&
        stopped.reason === 'pid_and_start_time' &&
        legacy?.namespace
      ) {
        scaleDevSlotWorkloads(legacy.namespace);
      }
      const quiet =
        stopped.signalled ||
        stopped.reason === 'no_session' ||
        stopped.reason === 'not_running';
      if (quiet) stopOperation?.finish('success');
      else stopOperation?.fail('failure');
      (deps.exit ?? ((code) => process.exit(code)))(quiet ? 0 : 1);
    };
    if (slotId) {
      try {
        await ensureSerializedSlotOwnedCleanup(slotId, async () =>
          withSlotEnvironmentOperationLock(registryRoot, slotId, parkLegacy),
        );
      } catch (error) {
        stopOperation?.fail('failure');
        stopRefusal(error);
      }
      return;
    }
    parkLegacy();
    return;
  }
  try {
    const result = await ensureSerializedSlotOwnedCleanup(
      selection.record.slotId,
      async () =>
        withSlotEnvironmentOperationLock(
          registryRoot,
          selection.record.slotId,
          () =>
            parkSelectedEnvironment({
              owner: selection.record,
              sessionRoot,
              signal: (pid, sig) => process.kill(pid, sig),
              processDeps: {
                pidAlive,
                readStartTicks: (pid) => readProcessStartTicks(pid),
                sleep: waitOwnedProcessExitPoll,
              },
              scaleRole: (namespace, role) =>
                scaleDevSlotWorkloads(namespace, spawnSync, [role]),
              readDesiredReplicas: (namespace) =>
                readDevSlotDesiredReplicas(namespace),
              portOccupied: (ports) =>
                [ports.game, ports.tilt].some((port) =>
                  probeLoopbackPortOccupiedSync(port),
                ),
            }),
        ),
    );
    if (!result.ok || !result.released) {
      stopOperation?.fail('failure');
      (deps.logError ?? console.error)(
        `Refusing to release ${selection.record.slotId}: ${result.reason}`,
      );
      (deps.exit ?? ((code) => process.exit(code)))(1);
    }
    stopOperation?.finish('success');
    (deps.exit ?? ((code) => process.exit(code)))(0);
  } catch (error) {
    stopOperation?.fail('failure');
    stopRefusal(error);
  }
}
