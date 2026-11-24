import { createServer } from 'node:net';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assessDevLaunch,
  buildReadyUrls,
  devSessionPath,
  DEV_RUNTIME_FRESHNESS_ROLES,
  formatDevFreshnessStatusLine,
  formatReadyLines,
  maybeAnnounce,
  LAB_RESOURCES,
  observeSelectedSlotRuntimeRoles,
  printDevStatus,
  readinessFromRemoteObservation,
  readDevSession,
  runDevTiltLaunch,
  runDevAttachCli,
  runDevReserveCli,
  stopDevSession,
  scaleDevSlotWorkloads,
  writeDevSession,
} from '../src/cli/dev-tilt.mjs';
import { observeDevRuntimeRoleInPod } from '../runtime/status.mjs';
import {
  attachUnattachedEnvironment,
  reserveUnattachedEnvironment,
} from '../src/domain/dev-worktree-allocator.mjs';
import {
  readRegistryJson,
  writeRegistry,
} from '../src/domain/dev-worktree-registry.mjs';
import {
  DEV_LOADED_RUNTIME_RECEIPT_SCHEMA,
  evaluateDevLoadedRuntimeReadiness,
  fingerprintCompiledTree,
  markDevWatchedCompilation,
  resolveCompiledDistRoot,
} from '../runtime/generation.mjs';
import { UNION_ROLE_FILTER } from '../../../infra/images/development/image-plan.mjs';

function okLaunchFingerprint() {
  return () => ({
    ok: true,
    fingerprint: 'ab'.repeat(32),
    roleFilter: UNION_ROLE_FILTER,
  });
}
const API_FRESHNESS_ROLE = DEV_RUNTIME_FRESHNESS_ROLES.find(
  (entry) => entry.role === 'api',
);
assert.ok(API_FRESHNESS_ROLE);

/**
 * @param {string} worktree
 * @param {{ staleLoaded?: boolean }} [options]
 */
function seedApiRuntimeFreshness(worktree, options = {}) {
  const entryRel = API_FRESHNESS_ROLE.compiledEntryPath;
  const entryAbs = join(worktree, entryRel);
  mkdirSync(dirname(entryAbs), { recursive: true });
  writeFileSync(entryAbs, 'export async function main() {}\n', 'utf8');
  const receiptRoot = options.slotId
    ? join(worktree, '.offscreen-dev-runtime', options.slotId)
    : join(worktree, '.offscreen-dev-runtime');
  const previousReceiptDir = process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR;
  process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR = receiptRoot;
  try {
    markDevWatchedCompilation({
      phase: 'success',
      role: API_FRESHNESS_ROLE.receiptRole,
      compiledEntryPath: entryRel,
      cwd: worktree,
      environmentId: options.environmentId ?? options.slotId ?? undefined,
    });
    const desired = JSON.parse(
      readFileSync(
        join(receiptRoot, `${API_FRESHNESS_ROLE.receiptRole}.desired.json`),
        'utf8',
      ),
    );
    const distRoot = resolveCompiledDistRoot(worktree, entryRel);
    const identity = options.staleLoaded
      ? 'stale-generation-identity'
      : fingerprintCompiledTree(distRoot);
    writeFileSync(
      join(receiptRoot, `${API_FRESHNESS_ROLE.receiptRole}.loaded.json`),
      `${JSON.stringify({
        schema: DEV_LOADED_RUNTIME_RECEIPT_SCHEMA,
        role: API_FRESHNESS_ROLE.receiptRole,
        pid: 4242,
        startedAt: new Date().toISOString(),
        generationId: options.staleLoaded
          ? '99999999-9999-4999-8999-999999999999'
          : desired.generationId,
        compiledModulePath: entryAbs,
        compiledModuleIdentity: identity,
        ...((options.environmentId ?? options.slotId)
          ? { environmentId: options.environmentId ?? options.slotId }
          : {}),
      })}\n`,
      'utf8',
    );
  } finally {
    if (previousReceiptDir === undefined)
      delete process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR;
    else process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR = previousReceiptDir;
  }
}

/**
 * @param {string} worktree
 * @param {{ staleLoaded?: boolean, slotId?: string, environmentId?: string }} [options]
 */
function observeApiRuntimeInFixture(worktree, options = {}) {
  seedApiRuntimeFreshness(worktree, options);
  const slotId = options.slotId ?? 'dev-3';
  const receiptRoot = join(worktree, '.offscreen-dev-runtime', slotId);
  const loadedPath = join(
    receiptRoot,
    `${API_FRESHNESS_ROLE.receiptRole}.loaded.json`,
  );
  const loaded = JSON.parse(readFileSync(loadedPath, 'utf8'));
  loaded.pid = process.pid;
  writeFileSync(loadedPath, `${JSON.stringify(loaded)}\n`, 'utf8');
  return observeDevRuntimeRoleInPod({
    receiptRole: API_FRESHNESS_ROLE.receiptRole,
    compiledEntryPath: join(worktree, API_FRESHNESS_ROLE.compiledEntryPath),
    receiptDir: receiptRoot,
    environmentId: options.environmentId ?? slotId,
  });
}

const FAKE_OWNER = /** @type {const} */ ({
  slotId: 'dev-2',
  worktreePath: '/tmp/unused',
  cluster: 'kind-offscreen-dev',
  namespace: 'offscreen-dev-2',
  ports: { game: 13_110, control: 13_111, tilt: 13_111, spare: 13_112 },
  processIdentity: null,
  resourceUids: {},
  lease: null,
});

function fakeAllocator() {
  return FAKE_OWNER;
}

function okPreflight() {
  return { ok: true, refusals: [] };
}

function alwaysFreeProbe() {
  return Promise.resolve(false);
}

function fakeSpawn() {
  let called = false;
  /** @type {import('node:child_process').ChildProcess} */
  const child = new EventEmitter();
  // @ts-expect-error test stub
  child.pid = 42_001;
  child.stdout = null;
  child.stderr = null;
  child.stdin = null;
  const fn = () => {
    called = true;
    return child;
  };
  fn.called = () => called;
  fn.child = child;
  return fn;
}

function spawnWithoutPid() {
  let called = false;
  /** @type {import('node:child_process').ChildProcess} */
  const child = new EventEmitter();
  child.stdout = null;
  child.stderr = null;
  child.stdin = null;
  const fn = () => {
    called = true;
    return child;
  };
  fn.called = () => called;
  fn.child = child;
  return fn;
}

function fullReadiness(overrides = {}) {
  /** @type {Record<string, boolean>} */
  const map = Object.fromEntries(LAB_RESOURCES.map((name) => [name, true]));
  return { ...map, ...overrides };
}

test('happy path returns the three loopback URLs', () => {
  const result = assessDevLaunch({
    preflightOk: true,
    preflightRefusals: [],
    tiltOnPath: true,
    ports: { game: 'free', tilt: 'owned' },
    readiness: fullReadiness(),
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.urls, {
    game: 'http://127.0.0.1:3000/',
    control: 'http://127.0.0.1:3000/control',
    tilt: 'http://127.0.0.1:10350/',
  });
  const announced = maybeAnnounce(result);
  assert.equal(announced.length, 3);
  assert.ok(announced.every((line) => line.includes('127.0.0.1')));
});

test('foreign context preflight refusal yields null urls', () => {
  const preflightRefusals = [
    {
      id: 'foreign-context',
      message:
        'Refusing: current kubectl context is "minikube", not kind-offscreen-lab.',
    },
  ];
  const result = assessDevLaunch({
    preflightOk: false,
    preflightRefusals,
    tiltOnPath: true,
    ports: { game: 'free', tilt: 'free' },
    readiness: fullReadiness(),
  });
  assert.equal(result.ok, false);
  assert.equal(result.urls, null);
  assert.ok(result.refusals.some((r) => r.id === 'foreign-context'));
  assert.equal(maybeAnnounce(result).length, 0);
});

test('foreign game port yields null urls', () => {
  const result = assessDevLaunch({
    preflightOk: true,
    preflightRefusals: [],
    tiltOnPath: true,
    ports: { game: 'foreign', tilt: 'free' },
    readiness: fullReadiness(),
  });
  assert.equal(result.ok, false);
  assert.equal(result.urls, null);
  assert.ok(result.refusals.some((r) => r.id === 'foreign-game-port'));
});

test('unready game-executor yields null urls', () => {
  const result = assessDevLaunch({
    preflightOk: true,
    preflightRefusals: [],
    tiltOnPath: true,
    ports: { game: 'owned', tilt: 'owned' },
    readiness: fullReadiness({ 'game-executor': false }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.urls, null);
  assert.ok(
    result.refusals.some((r) => r.id === 'resource-not-ready-game-executor'),
  );
});

test('missing tilt yields null urls', () => {
  const result = assessDevLaunch({
    preflightOk: true,
    preflightRefusals: [],
    tiltOnPath: false,
    ports: { game: 'free', tilt: 'free' },
    readiness: fullReadiness(),
  });
  assert.equal(result.ok, false);
  assert.equal(result.urls, null);
  assert.ok(result.refusals.some((r) => r.id === 'missing-tilt'));
});

test('maybeAnnounce with null urls or empty input prints nothing', () => {
  assert.deepEqual(maybeAnnounce({ urls: null }), []);
  assert.deepEqual(maybeAnnounce({ ok: false, urls: null, refusals: [] }), []);
  assert.deepEqual(maybeAnnounce([]), []);
});

test('two worktree directories keep distinct session files', () => {
  const worktreeA = mkdtempSync(join(tmpdir(), 'offscreen-wt-a-'));
  const worktreeB = mkdtempSync(join(tmpdir(), 'offscreen-wt-b-'));

  writeDevSession(worktreeA, {
    pid: 0,
    slotId: 'dev-1',
    namespace: 'offscreen-dev-1',
    gamePort: 13_100,
    tiltPort: 13_101,
    startedAt: '2026-11-23T00:00:00.000Z',
  });
  writeDevSession(worktreeB, {
    pid: 0,
    slotId: 'dev-2',
    namespace: 'offscreen-dev-2',
    gamePort: 13_104,
    tiltPort: 13_105,
    startedAt: '2026-11-23T00:00:01.000Z',
  });

  assert.notEqual(devSessionPath(worktreeA), devSessionPath(worktreeB));
  assert.equal(readDevSession(worktreeA)?.slotId, 'dev-1');
  assert.equal(readDevSession(worktreeB)?.slotId, 'dev-2');
});

test('stop(A) does not delete or alter B session file', () => {
  const worktreeA = mkdtempSync(join(tmpdir(), 'offscreen-wt-stop-a-'));
  const worktreeB = mkdtempSync(join(tmpdir(), 'offscreen-wt-stop-b-'));
  const sessionB = {
    pid: 0,
    slotId: 'dev-9',
    namespace: 'offscreen-dev-9',
    gamePort: 13_200,
    tiltPort: 13_201,
    startedAt: '2026-11-23T00:00:02.000Z',
  };

  writeDevSession(worktreeA, {
    pid: 0,
    slotId: 'dev-8',
    namespace: 'offscreen-dev-8',
    gamePort: 13_196,
    tiltPort: 13_197,
    startedAt: '2026-11-23T00:00:03.000Z',
  });
  writeDevSession(worktreeB, sessionB);

  const beforeB = readDevSession(worktreeB);
  stopDevSession(worktreeA);
  const afterB = readDevSession(worktreeB);

  assert.equal(readDevSession(worktreeA)?.slotId, 'dev-8');
  assert.deepEqual(afterB, beforeB);
});

test('scale refuses a namespace that is not a dev slot', () => {
  assert.throws(
    () =>
      scaleDevSlotWorkloads('lab-edge', () => {
        throw new Error('kubectl must not run');
      }),
    /refusing to scale/,
  );
});

test('scale names only the six slot deployments', () => {
  /** @type {string[] | undefined} */
  let args;
  scaleDevSlotWorkloads('offscreen-dev-8', (_command, commandArgs) => {
    args = commandArgs;
    return { status: 0, stderr: '' };
  });
  assert.ok(args);
  assert.equal(args.includes('--namespace') || args.includes('-n'), true);
  assert.equal(args.includes('offscreen-dev-8'), true);
  assert.equal(args.includes('--replicas=0'), true);
  for (const name of [
    'game-web',
    'game-api',
    'game-authority',
    'game-control',
    'game-executor',
    'game-relay',
  ]) {
    assert.equal(args.includes(name), true);
  }
});

test('launcher writes allocator game and tilt ports to the worktree session', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-launch-'));
  const spawn = fakeSpawn();
  await runDevTiltLaunch({
    worktree,
    fingerprintDevImageContext: okLaunchFingerprint(),
    allocateDevWorktreeOwner: fakeAllocator,
    collectDefaultProbes: async () => ({}),
    runStackPreflight: () => okPreflight(),
    commandOnPath: () => true,
    probeLoopbackPortOccupied: alwaysFreeProbe,
    spawnFn: spawn,
    readStartTicks: () => '99',
    exitAfterSession: true,
    reconcileDevSlot: async () => ({ ok: true, readyForWorkloads: true }),
  });

  assert.equal(spawn.called(), true);
  const session = readDevSession(worktree);
  assert.ok(session);
  assert.equal(session.slotId, 'dev-2');
  assert.equal(session.namespace, 'offscreen-dev-2');
  assert.equal(session.gamePort, 13_110);
  assert.equal(session.tiltPort, 13_111);
  assert.equal(session.pid, 42_001);
});

test('occupied allocator game port refuses before tilt spawn', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-refuse-'));
  const spawn = fakeSpawn();
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen({ host: '127.0.0.1', port: FAKE_OWNER.ports.game }, resolve);
  });

  try {
    /** @type {number[]} */
    const exitCodes = [];
    let reconciled = false;
    await runDevTiltLaunch({
      worktree,
      fingerprintDevImageContext: okLaunchFingerprint(),
      allocateDevWorktreeOwner: fakeAllocator,
      collectDefaultProbes: async () => ({}),
      runStackPreflight: () => okPreflight(),
      commandOnPath: () => true,
      probeLoopbackPortOccupied: async (_host, port) =>
        port === FAKE_OWNER.ports.game,
      spawnFn: spawn,
      exit: (code) => {
        exitCodes.push(code);
      },
      exitAfterSession: true,
      reconcileDevSlot: async () => {
        reconciled = true;
        return { ok: true, readyForWorkloads: true };
      },
    });

    assert.deepEqual(exitCodes, [1]);
    assert.equal(reconciled, false);
    assert.equal(spawn.called(), false);
    assert.equal(readDevSession(worktree), null);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('missing tilt refuses before reconciliation or spawn', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-missing-tilt-'));
  const spawn = fakeSpawn();
  let reconciled = false;
  /** @type {number[]} */
  const exitCodes = [];
  await runDevTiltLaunch({
    worktree,
    allocateDevWorktreeOwner: fakeAllocator,
    collectDefaultProbes: async () => ({}),
    runStackPreflight: () => okPreflight(),
    commandOnPath: (name) => name !== 'tilt',
    probeLoopbackPortOccupied: alwaysFreeProbe,
    spawnFn: spawn,
    exit: (code) => exitCodes.push(code),
    reconcileDevSlot: async () => {
      reconciled = true;
      return { ok: true, readyForWorkloads: true };
    },
  });
  assert.deepEqual(exitCodes, [1]);
  assert.equal(reconciled, false);
  assert.equal(spawn.called(), false);
});

test('docker daemon refusal stays before reconciliation', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-docker-daemon-'));
  const spawn = fakeSpawn();
  let reconciled = false;
  /** @type {number[]} */
  const exitCodes = [];
  await runDevTiltLaunch({
    worktree,
    allocateDevWorktreeOwner: fakeAllocator,
    collectDefaultProbes: async () => ({}),
    runStackPreflight: () => ({
      ok: false,
      refusals: [
        {
          id: 'docker-daemon',
          message: 'Docker daemon is not responding (docker info failed).',
        },
      ],
    }),
    commandOnPath: () => true,
    probeLoopbackPortOccupied: alwaysFreeProbe,
    spawnFn: spawn,
    exit: (code) => exitCodes.push(code),
    reconcileDevSlot: async () => {
      reconciled = true;
      return { ok: true, readyForWorkloads: true };
    },
  });
  assert.deepEqual(exitCodes, [1]);
  assert.equal(reconciled, false);
  assert.equal(spawn.called(), false);
});

test('stale session pid treats an occupied port as foreign', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-stale-port-'));
  writeDevSession(worktree, {
    pid: 4242,
    processStartTicks: '100',
    forwardPid: 4243,
    forwardStartTicks: '101',
    slotId: 'dev-2',
    namespace: 'offscreen-dev-2',
    gamePort: FAKE_OWNER.ports.game,
    tiltPort: FAKE_OWNER.ports.tilt,
    startedAt: '2026-11-23T00:00:00.000Z',
  });
  const spawn = fakeSpawn();
  let reconciled = false;
  /** @type {number[]} */
  const exitCodes = [];
  await runDevTiltLaunch({
    worktree,
    fingerprintDevImageContext: okLaunchFingerprint(),
    allocateDevWorktreeOwner: fakeAllocator,
    collectDefaultProbes: async () => ({}),
    runStackPreflight: () => okPreflight(),
    commandOnPath: () => true,
    probeLoopbackPortOccupied: async (_host, port) =>
      port === FAKE_OWNER.ports.game,
    pidAlive: () => true,
    readStartTicks: () => '999',
    spawnFn: spawn,
    exit: (code) => exitCodes.push(code),
    reconcileDevSlot: async () => {
      reconciled = true;
      return { ok: true, readyForWorkloads: true };
    },
  });
  assert.deepEqual(exitCodes, [1]);
  assert.equal(reconciled, false);
  assert.equal(spawn.called(), false);
});

test('verified active session refuses duplicate launch without signalling', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-active-session-'));
  writeDevSession(worktree, {
    pid: 4242,
    processStartTicks: '100',
    slotId: 'dev-2',
    namespace: 'offscreen-dev-2',
    gamePort: FAKE_OWNER.ports.game,
    tiltPort: FAKE_OWNER.ports.tilt,
    startedAt: '2026-11-23T00:00:00.000Z',
  });
  const spawn = fakeSpawn();
  let reconciled = false;
  /** @type {number[]} */
  const exitCodes = [];
  /** @type {string[]} */
  const signals = [];
  await runDevTiltLaunch({
    worktree,
    fingerprintDevImageContext: okLaunchFingerprint(),
    allocateDevWorktreeOwner: fakeAllocator,
    collectDefaultProbes: async () => ({}),
    runStackPreflight: () => okPreflight(),
    commandOnPath: () => true,
    probeLoopbackPortOccupied: alwaysFreeProbe,
    pidAlive: () => true,
    readStartTicks: () => '100',
    signal: (pid, sig) => signals.push(`${pid}:${sig}`),
    spawnFn: spawn,
    exit: (code) => exitCodes.push(code),
    reconcileDevSlot: async () => {
      reconciled = true;
      return { ok: true, readyForWorkloads: true };
    },
  });
  assert.deepEqual(exitCodes, [1]);
  assert.equal(reconciled, false);
  assert.equal(spawn.called(), false);
  assert.deepEqual(signals, []);
});

test('low memory refuses before reconciliation, Tilt replacement, or spawn', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-mem-low-'));
  const spawn = fakeSpawn();
  /** @type {number[]} */
  const exitCodes = [];
  let reconciled = false;
  /** @type {string[]} */
  const signals = [];
  await runDevTiltLaunch({
    worktree,
    fingerprintDevImageContext: okLaunchFingerprint(),
    collectDefaultProbes: async () => ({ memAvailableKib: 1 }),
    runStackPreflight: () => ({
      ok: false,
      refusals: [
        {
          id: 'memory-low',
          message: 'MemAvailable is 1 KiB, below 4194304 KiB (4 GiB).',
        },
      ],
    }),
    commandOnPath: () => true,
    probeLoopbackPortOccupied: alwaysFreeProbe,
    spawnFn: spawn,
    exit: (code) => {
      exitCodes.push(code);
    },
    reconcileDevSlot: async () => {
      reconciled = true;
      return { ok: true, readyForWorkloads: true };
    },
    signal: (pid, sig) => {
      signals.push(`${pid}:${sig}`);
    },
  });
  assert.deepEqual(exitCodes, [1]);
  assert.equal(reconciled, false);
  assert.equal(spawn.called(), false);
  assert.deepEqual(signals, []);
});

test('sufficient memory still reconciles and launches', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-mem-ok-'));
  const spawn = fakeSpawn();
  let reconciled = false;
  await runDevTiltLaunch({
    worktree,
    fingerprintDevImageContext: okLaunchFingerprint(),
    allocateDevWorktreeOwner: fakeAllocator,
    collectDefaultProbes: async () => ({ memAvailableKib: 8_000_000 }),
    runStackPreflight: () => okPreflight(),
    commandOnPath: () => true,
    probeLoopbackPortOccupied: alwaysFreeProbe,
    spawnFn: spawn,
    readStartTicks: () => '99',
    exitAfterSession: true,
    reconcileDevSlot: async () => {
      reconciled = true;
      return { ok: true, readyForWorkloads: true };
    },
  });
  assert.equal(reconciled, true);
  assert.equal(spawn.called(), true);
});

test('missing memory reading fails closed before mutation', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-mem-unknown-'));
  const spawn = fakeSpawn();
  /** @type {number[]} */
  const exitCodes = [];
  let reconciled = false;
  await runDevTiltLaunch({
    worktree,
    fingerprintDevImageContext: okLaunchFingerprint(),
    collectDefaultProbes: async () => ({ memAvailableKib: null }),
    runStackPreflight: () => ({
      ok: false,
      refusals: [
        { id: 'memory-unknown', message: 'MemAvailable KiB is unknown.' },
      ],
    }),
    spawnFn: spawn,
    exit: (code) => {
      exitCodes.push(code);
    },
    reconcileDevSlot: async () => {
      reconciled = true;
      return { ok: true, readyForWorkloads: true };
    },
  });
  assert.deepEqual(exitCodes, [1]);
  assert.equal(reconciled, false);
  assert.equal(spawn.called(), false);
});

test('missing helm refuses before reconciliation or spawn', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-helm-missing-'));
  const spawn = fakeSpawn();
  /** @type {number[]} */
  const exitCodes = [];
  let reconciled = false;
  await runDevTiltLaunch({
    worktree,
    fingerprintDevImageContext: okLaunchFingerprint(),
    collectDefaultProbes: async () => ({ memAvailableKib: 9_000_000 }),
    runStackPreflight: () => okPreflight(),
    commandOnPath: () => true,
    probeLoopbackPortOccupied: alwaysFreeProbe,
    spawnFn: spawn,
    exit: (code) => {
      exitCodes.push(code);
    },
    assertHelmAvailable: async () => {
      throw new Error('helm is not available');
    },
    reconcileDevSlot: async () => {
      reconciled = true;
      return { ok: true, readyForWorkloads: true };
    },
  });
  assert.deepEqual(exitCodes, [1]);
  assert.equal(reconciled, false);
  assert.equal(spawn.called(), false);
});

test('memory refusal does not terminate an owned running session', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-mem-owned-'));
  writeDevSession(worktree, {
    pid: 4242,
    processStartTicks: '99',
    slotId: 'dev-5',
    namespace: 'offscreen-dev-5',
    gamePort: 13_116,
    tiltPort: 13_117,
    startedAt: '2026-11-23T00:00:00.000Z',
  });
  /** @type {string[]} */
  const signals = [];
  /** @type {number[]} */
  const exitCodes = [];
  await runDevTiltLaunch({
    worktree,
    fingerprintDevImageContext: okLaunchFingerprint(),
    collectDefaultProbes: async () => ({ memAvailableKib: 1 }),
    runStackPreflight: () => ({
      ok: false,
      refusals: [
        {
          id: 'memory-low',
          message: 'MemAvailable is 1 KiB, below 4194304 KiB (4 GiB).',
        },
      ],
    }),
    pidAlive: () => true,
    readStartTicks: () => '99',
    signal: (pid, sig) => {
      signals.push(`${pid}:${sig}`);
    },
    exit: (code) => {
      exitCodes.push(code);
    },
    reconcileDevSlot: async () => {
      throw new Error('reconcile must not run');
    },
  });
  assert.deepEqual(exitCodes, [1]);
  assert.deepEqual(signals, []);
  assert.equal(readDevSession(worktree)?.pid, 4242);
});

test('fingerprint failure after reconcile parks the owned slot', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-fp-fail-'));
  const harness = ownedLaunch(worktree);
  const spawn = fakeSpawn();
  await harness.launch({
    fingerprintDevImageContext: () => ({
      ok: false,
      reason: 'unreadable-recipe',
    }),
    spawnFn: spawn,
    exitAfterSession: true,
  });
  assert.equal(spawn.called(), false);
  assert.equal(harness.scaled.length, 6);
  assert.equal(
    harness.lines.some((line) => line.startsWith('startup-parked:')),
    true,
  );
  assert.match(
    harness.lines.find((line) => line.startsWith('startup-parked:')) ?? '',
    /unreadable-recipe/,
  );
});

test('dynamic ready URLs follow injected allocator ports', () => {
  assert.deepEqual(buildReadyUrls(13_110, 13_111), {
    game: 'http://127.0.0.1:13110/',
    control: 'http://127.0.0.1:13110/control',
    tilt: 'http://127.0.0.1:13111/',
  });
});

test('formatReadyLines and assertions never use 0.0.0.0 as bind address', () => {
  const urls = {
    game: 'http://127.0.0.1:3000/',
    control: 'http://127.0.0.1:3000/control',
    tilt: 'http://127.0.0.1:10350/',
  };
  const lines = formatReadyLines(urls);
  const blob = JSON.stringify({
    urls,
    lines,
    result: assessDevLaunch({
      preflightOk: true,
      preflightRefusals: [],
      tiltOnPath: true,
      ports: { game: 'free', tilt: 'free' },
      readiness: fullReadiness(),
    }),
  });
  assert.doesNotMatch(blob, /0\.0\.0\.0/);
});

test('formatDevFreshnessStatusLine prints READY only when evaluate is ready', () => {
  assert.equal(
    formatDevFreshnessStatusLine('api', {
      ready: true,
      reason: 'loaded_matches_desired',
      currentGeneration: 'abc123',
    }),
    'api READY loaded_matches_desired abc123',
  );
  assert.equal(
    formatDevFreshnessStatusLine('api', {
      ready: false,
      reason: 'missing_receipt',
      currentGeneration: null,
    }),
    'api NOT READY missing_receipt',
  );
});

test('printDevStatus exits 0 when session and api runtime receipts match', () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-status-pos-'));
  writeDevSession(worktree, {
    pid: 0,
    slotId: 'dev-3',
    namespace: 'offscreen-dev-3',
    gamePort: 13_120,
    tiltPort: 13_121,
    startedAt: '2026-11-23T00:00:10.000Z',
  });
  seedApiRuntimeFreshness(worktree, { slotId: 'dev-3' });

  /** @type {string[]} */
  const lines = [];
  const code = printDevStatus(worktree, {
    roles: [API_FRESHNESS_ROLE],
    webReadiness: {
      namespace: 'offscreen-dev-3',
      expectedImage: 'offscreen-dev:gen',
      pod: {
        ready: true,
        namespace: 'offscreen-dev-3',
        image: 'offscreen-dev:gen',
      },
      httpStatus: 200,
    },
    log: (line) => lines.push(line),
  });

  assert.equal(code, 0);
  assert.ok(
    lines.some((line) => line.startsWith('api READY loaded_matches_desired ')),
  );
  assert.ok(!lines.some((line) => line.includes('NOT READY')));
});

test('printDevStatus exits 2 for session without receipts', () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-status-miss-'));
  writeDevSession(worktree, {
    pid: 0,
    slotId: 'dev-4',
    namespace: 'offscreen-dev-4',
    gamePort: 13_124,
    tiltPort: 13_125,
    startedAt: '2026-11-23T00:00:11.000Z',
  });

  const code = printDevStatus(worktree, { roles: [API_FRESHNESS_ROLE] });
  assert.equal(code, 2);
});

test('printDevStatus reports stale_loaded_runtime and exits 2', () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-status-stale-'));
  writeDevSession(worktree, {
    pid: 0,
    slotId: 'dev-5',
    namespace: 'offscreen-dev-5',
    gamePort: 13_126,
    tiltPort: 13_127,
    startedAt: '2026-11-23T00:00:12.000Z',
  });
  seedApiRuntimeFreshness(worktree, { staleLoaded: true, slotId: 'dev-5' });

  /** @type {string[]} */
  const lines = [];
  const code = printDevStatus(worktree, {
    roles: [API_FRESHNESS_ROLE],
    log: (line) => lines.push(line),
  });

  assert.equal(code, 2);
  assert.ok(
    lines.some((line) => line === 'api NOT READY stale_loaded_runtime'),
  );
});

test('printDevStatus reports compile_error and exits 2', () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-status-compile-'));
  const entryRel = API_FRESHNESS_ROLE.compiledEntryPath;
  const entryAbs = join(worktree, entryRel);
  mkdirSync(dirname(entryAbs), { recursive: true });
  writeFileSync(entryAbs, 'export async function main() {}\n', 'utf8');
  writeDevSession(worktree, {
    pid: 0,
    slotId: 'dev-6',
    namespace: 'offscreen-dev-6',
    gamePort: 13_128,
    tiltPort: 13_129,
    startedAt: '2026-11-23T00:00:13.000Z',
  });

  const distRoot = resolveCompiledDistRoot(worktree, entryRel);
  const staleIdentity = fingerprintCompiledTree(distRoot);
  const receiptRoot = join(worktree, '.offscreen-dev-runtime', 'dev-6');
  mkdirSync(receiptRoot, { recursive: true });
  process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR = receiptRoot;
  writeFileSync(
    join(receiptRoot, `${API_FRESHNESS_ROLE.receiptRole}.loaded.json`),
    `${JSON.stringify({
      schema: DEV_LOADED_RUNTIME_RECEIPT_SCHEMA,
      role: API_FRESHNESS_ROLE.receiptRole,
      pid: 4242,
      startedAt: new Date().toISOString(),
      generationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      compiledModulePath: entryAbs,
      compiledModuleIdentity: staleIdentity,
      environmentId: 'dev-6',
    })}\n`,
    'utf8',
  );

  markDevWatchedCompilation({
    phase: 'failure',
    role: API_FRESHNESS_ROLE.receiptRole,
    compiledEntryPath: entryRel,
    cwd: worktree,
  });

  /** @type {string[]} */
  const lines = [];
  const code = printDevStatus(worktree, {
    roles: [API_FRESHNESS_ROLE],
    log: (line) => lines.push(line),
  });

  assert.equal(code, 2);
  assert.ok(lines.some((line) => line === 'api NOT READY compile_error'));
});

test('printDevStatus parks without reading another slot receipt', () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-status-park-'));
  writeDevSession(worktree, {
    pid: 0,
    slotId: 'dev-6',
    namespace: 'offscreen-dev-6',
    gamePort: 13120,
    tiltPort: 13121,
    startedAt: '2026-11-23T00:00:14.000Z',
    parked: true,
  });
  seedApiRuntimeFreshness(worktree, { slotId: 'dev-6' });
  const lines = [];
  const code = printDevStatus(worktree, {
    roles: [API_FRESHNESS_ROLE],
    log: (line) => lines.push(line),
  });
  assert.equal(code, 2);
  assert.deepEqual(lines, ['slot dev-6 phase=parked']);
});

test('printDevStatus does not accept another environment receipt or a loading image', () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-status-foreign-'));
  writeDevSession(worktree, {
    pid: 0,
    slotId: 'dev-6',
    namespace: 'offscreen-dev-6',
    gamePort: 13120,
    tiltPort: 13121,
    startedAt: '2026-11-23T00:00:15.000Z',
    checkoutPath: worktree,
  });
  seedApiRuntimeFreshness(worktree, {
    slotId: 'dev-5',
    environmentId: 'dev-5',
  });
  const missing = printDevStatus(worktree, {
    roles: [API_FRESHNESS_ROLE],
    log() {},
  });
  assert.equal(missing, 2);
  seedApiRuntimeFreshness(worktree, {
    slotId: 'dev-6',
    environmentId: 'dev-5',
  });
  const lines = [];
  const foreign = printDevStatus(worktree, {
    roles: [API_FRESHNESS_ROLE],
    log: (line) => lines.push(line),
  });
  assert.equal(foreign, 2);
  assert.ok(lines.some((line) => line === 'api NOT READY foreign_environment'));
  const loading = printDevStatus(worktree, {
    roles: [API_FRESHNESS_ROLE],
    imageReadiness: { applicationReady: false },
    log: (line) => lines.push(line),
  });
  assert.equal(loading, 2);
  assert.ok(lines.includes('runtime NOT READY image_loading'));
});

test('stop does not signal a reused pid whose start time differs', () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-pid-'));
  writeDevSession(worktree, {
    pid: 4242,
    processStartTicks: '100',
    slotId: 'dev-3',
    namespace: 'offscreen-dev-3',
    gamePort: 13108,
    tiltPort: 13109,
    startedAt: '2026-11-23T00:00:00.000Z',
  });
  /** @type {number[]} */
  const signalled = [];
  const result = stopDevSession(worktree, {
    pidAlive: () => true,
    readStartTicks: () => '200',
    signal: (pid) => signalled.push(pid),
  });
  assert.equal(result.signalled, false);
  assert.equal(result.reason, 'start_time_mismatch');
  assert.deepEqual(signalled, []);
});

test('stop signals only the process with the recorded start time', () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-pid-ok-'));
  writeDevSession(worktree, {
    pid: 4242,
    processStartTicks: '100',
    slotId: 'dev-3',
    namespace: 'offscreen-dev-3',
    gamePort: 13108,
    tiltPort: 13109,
    startedAt: '2026-11-23T00:00:00.000Z',
  });
  /** @type {number[]} */
  const signalled = [];
  const result = stopDevSession(worktree, {
    pidAlive: () => true,
    readStartTicks: () => '100',
    signal: (pid) => signalled.push(pid),
  });
  assert.equal(result.signalled, true);
  assert.deepEqual(signalled, [4242]);
});

function ownedLaunch(worktree, extra) {
  const sandbox = mkdtempSync(join(tmpdir(), 'offscreen-reg-'));
  const registryRoot = join(sandbox, 'registry');
  mkdirSync(registryRoot, { recursive: true });
  /** @type {string[]} */
  const lines = [];
  /** @type {{ namespace: string, role: string }[]} */
  const scaled = [];
  let alive = true;
  return {
    registryRoot,
    lines,
    scaled,
    launch(overrides = {}) {
      return runDevTiltLaunch({
        worktree,
        fingerprintDevImageContext: okLaunchFingerprint(),
        registryRoot,
        owner: {
          ...FAKE_OWNER,
          worktreePath: worktree,
        },
        allocateDevWorktreeOwner: () => ({
          ...FAKE_OWNER,
          worktreePath: worktree,
        }),
        collectDefaultProbes: async () => ({ memAvailableKib: 8_000_000 }),
        runStackPreflight: () => okPreflight(),
        commandOnPath: () => true,
        probeLoopbackPortOccupied: alwaysFreeProbe,
        spawnFn: fakeSpawn(),
        reconcileDevSlot: async () => ({
          ok: true,
          readyForWorkloads: true,
          record: { ...FAKE_OWNER, worktreePath: worktree },
        }),
        startupWindowMs: 0,
        startupPollMs: 1,
        sleep: async () => {},
        pidAlive: () => alive,
        readStartTicks: () => '11',
        signal: () => {
          alive = false;
        },
        scaleRole: (namespace, role) => {
          if (extra?.scaleError) throw new Error(extra.scaleError);
          scaled.push({ namespace, role });
        },
        readDesiredReplicas: (namespace) =>
          Object.fromEntries(
            LAB_RESOURCES.map((role) => [
              role,
              extra?.replicas?.(namespace, role) ?? 0,
            ]),
          ),
        log: (line) => lines.push(line),
        supervisePortForward: async () => {},
        exitAfterReady: true,
        exit: (code) => {
          lines.push(`exit:${code}`);
        },
        ...overrides,
      });
    },
  };
}

test('injected tilt spawn failure parks without signalling foreign pids', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-spawn-fail-'));
  const harness = ownedLaunch(worktree);
  /** @type {string[]} */
  const signals = [];
  const spawn = spawnWithoutPid();
  await harness.launch({
    spawnFn: spawn,
    signal: (pid, sig) => signals.push(`${pid}:${sig}`),
  });
  assert.equal(spawn.called(), true);
  assert.deepEqual(signals, []);
  assert.equal(harness.scaled.length, 6);
  assert.equal(
    harness.lines.some((line) => line.startsWith('startup-parked:')),
    true,
  );
});

test('missing tilt start ticks parks and signals only the spawned child', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-unknown-ticks-'));
  const harness = ownedLaunch(worktree);
  /** @type {string[]} */
  const signals = [];
  await harness.launch({
    readStartTicks: () => null,
    signal: (pid, sig) => signals.push(`${pid}:${sig}`),
    exitAfterSession: true,
  });
  assert.deepEqual(signals, ['42001:SIGTERM']);
  assert.equal(harness.scaled.length, 6);
  assert.equal(readDevSession(worktree), null);
  assert.equal(
    harness.lines.some((line) => line.startsWith('startup-parked:')),
    true,
  );
});

test('tilt child exit during startup poll parks the slot', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-child-exit-'));
  const harness = ownedLaunch(worktree);
  const spawn = fakeSpawn();
  await harness.launch({
    spawnFn: () => {
      const child = spawn();
      child.exitCode = 17;
      child.emit('exit', 17);
      return child;
    },
    collectStartupReadiness: async () => fullReadiness({ 'game-web': false }),
  });
  assert.equal(harness.scaled.length, 6);
  assert.equal(
    harness.lines.some((line) => line.startsWith('startup-parked:')),
    true,
  );
  assert.match(
    harness.lines.find((line) => line.startsWith('startup-parked:')) ?? '',
    /tilt exited 17/,
  );
});

test('startup timeout parks without scaling a foreign namespace', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-timeout-'));
  const harness = ownedLaunch(worktree, {
    replicas: (namespace) => (namespace === 'offscreen-dev-6' ? 1 : 0),
  });
  await harness.launch({
    collectStartupReadiness: async () => fullReadiness({ 'game-web': false }),
  });
  assert.equal(
    harness.scaled.every((call) => call.namespace === 'offscreen-dev-2'),
    true,
  );
  assert.equal(
    harness.scaled.some((call) => call.namespace === 'offscreen-dev-6'),
    false,
  );
  assert.equal(
    harness.lines.some((line) => line.startsWith('startup-parked:')),
    true,
  );
});

test('reconcile partial failure with workloadsTouched parks the slot', async () => {
  const worktree = mkdtempSync(
    join(tmpdir(), 'offscreen-wt-reconcile-partial-'),
  );
  const harness = ownedLaunch(worktree);
  await harness.launch({
    reconcileDevSlot: async () => ({
      ok: false,
      phase: 'workloads',
      detail: 'partial apply',
      workloadsTouched: true,
    }),
  });
  assert.equal(harness.scaled.length, 6);
  assert.equal(
    harness.lines.some((line) => line.startsWith('startup-parked:')),
    true,
  );
});

test('launch cancellation handler parks once when workloads were touched', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-signal-cancel-'));
  const harness = ownedLaunch(worktree);
  /** @type {((signal: 'SIGINT' | 'SIGTERM') => void) | null} */
  let cancel = null;
  await harness.launch({
    exposeLaunchCancellation: (handler) => {
      cancel = handler;
    },
    reconcileDevSlot: async () => ({
      ok: true,
      readyForWorkloads: true,
      workloadsTouched: true,
      record: { ...FAKE_OWNER, worktreePath: worktree },
    }),
    fingerprintDevImageContext: () => {
      cancel?.('SIGINT');
      return okLaunchFingerprint()();
    },
  });
  assert.equal(harness.scaled.length, 6);
  assert.equal(
    harness.lines.filter((line) => line.startsWith('startup-parked:')).length,
    1,
  );
});

test('launch cancellation without workloads touched aborts without scaling', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-signal-abort-'));
  const harness = ownedLaunch(worktree);
  /** @type {((signal: 'SIGINT' | 'SIGTERM') => void) | null} */
  let cancel = null;
  await harness.launch({
    exposeLaunchCancellation: (handler) => {
      cancel = handler;
    },
    reconcileDevSlot: async () => ({
      ok: true,
      readyForWorkloads: true,
      workloadsTouched: false,
      record: { ...FAKE_OWNER, worktreePath: worktree },
    }),
    fingerprintDevImageContext: () => {
      cancel?.('SIGINT');
      return okLaunchFingerprint()();
    },
  });
  assert.equal(harness.scaled.length, 0);
  assert.match(
    harness.lines.find((line) => line.startsWith('exit:')) ?? '',
    /exit:130/,
  );
});

test('duplicate tilt exit callback does not double-scale during startup', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-dup-exit-'));
  const harness = ownedLaunch(worktree);
  const spawn = fakeSpawn();
  await harness.launch({
    spawnFn: () => {
      const child = spawn();
      child.exitCode = 9;
      queueMicrotask(() => {
        child.emit('exit', 9);
        child.emit('exit', 9);
      });
      return child;
    },
    collectStartupReadiness: async () => fullReadiness({ 'game-web': false }),
  });
  assert.equal(harness.scaled.length, 6);
});

test('partial startup parks all six owned workloads and leaves the other environment', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-partial-'));
  const harness = ownedLaunch(worktree);
  await harness.launch({
    collectStartupReadiness: async () =>
      fullReadiness({
        'game-api': false,
        'game-authority': false,
        'game-control': false,
        'game-executor': false,
        'game-relay': false,
      }),
  });
  assert.equal(harness.scaled.length, 6);
  assert.equal(
    harness.scaled.every((call) => call.namespace === 'offscreen-dev-2'),
    true,
  );
  assert.equal(
    harness.lines.some((line) => line.startsWith('startup-parked:')),
    true,
  );
  assert.equal(
    harness.lines.some((line) => line.startsWith('rollback-incomplete:')),
    false,
  );
});

test('memory exhaustion after admission parks the attempted slot', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-mem-after-'));
  const harness = ownedLaunch(worktree);
  let probes = 0;
  await harness.launch({
    collectDefaultProbes: async () => {
      probes += 1;
      return { memAvailableKib: probes === 1 ? 8_000_000 : 1 };
    },
    runStackPreflight: (probe) =>
      probe.memAvailableKib === 1
        ? {
            ok: false,
            refusals: [
              {
                id: 'memory-low',
                message: 'MemAvailable is 1 KiB, below 4194304 KiB (4 GiB).',
              },
            ],
          }
        : okPreflight(),
    collectStartupReadiness: async () => {
      throw new Error(
        'readiness must not be consulted after memory exhaustion',
      );
    },
  });
  assert.equal(harness.scaled.length, 6);
  assert.match(
    harness.lines.find((line) => line.startsWith('startup-parked:')) ?? '',
    /4 GiB/,
  );
});

test('a fully ready startup stays up and does not scale', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-all-ready-'));
  const harness = ownedLaunch(worktree);
  await harness.launch({
    collectStartupReadiness: async () => fullReadiness(),
  });
  assert.deepEqual(harness.scaled, []);
  assert.equal(
    harness.lines.some((line) => line.startsWith('startup-parked:')),
    false,
  );
});

test('a failed rollback reports rollback-incomplete and does not claim parked', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-rollback-fail-'));
  const harness = ownedLaunch(worktree, { scaleError: 'scale denied' });
  await harness.launch({
    collectStartupReadiness: async () => fullReadiness({ 'game-web': false }),
  });
  assert.equal(
    harness.lines.some((line) => line.startsWith('rollback-incomplete:')),
    true,
  );
  assert.equal(
    harness.lines.some((line) => line.startsWith('startup-parked:')),
    false,
  );
  assert.match(
    harness.lines.find((line) => line.startsWith('rollback-incomplete:')) ?? '',
    /offscreen-dev-2/,
  );
});

test('reserve and attach CLI handlers skip launch-side mutators', () => {
  const checkout = mkdtempSync(join(tmpdir(), 'offscreen-wt-reserve-'));
  const sandbox = mkdtempSync(join(tmpdir(), 'offscreen-reg-reserve-'));
  const registryRoot = join(sandbox, 'registry');
  mkdirSync(registryRoot, { recursive: true });
  writeRegistry(registryRoot, {
    version: 2,
    nextSequence: 1,
    environmentsById: {},
    defaultEnvironmentByCheckout: {},
  });
  const allocatorDeps = {
    canonicalizePath: (path) => path,
    isPortAvailable: () => true,
  };
  /** @type {string[]} */
  const lines = [];
  let spawnCalled = false;
  let reconcileCalled = false;
  let tenantWriteCalled = false;
  runDevReserveCli({
    registryRoot,
    reserve: (root, deps) => {
      const record = reserveUnattachedEnvironment(root, deps);
      assert.equal(spawnCalled, false);
      assert.equal(reconcileCalled, false);
      assert.equal(tenantWriteCalled, false);
      return record;
    },
    reserveDeps: allocatorDeps,
    log: (line) => lines.push(line),
    exit: () => {},
  });
  const reserved = Object.values(
    readRegistryJson(registryRoot).environmentsById,
  )[0];
  runDevAttachCli(reserved.slotId, {
    worktree: checkout,
    registryRoot,
    attach: (path, root, slotId, deps) => {
      assert.equal(spawnCalled, false);
      assert.equal(reconcileCalled, false);
      assert.equal(tenantWriteCalled, false);
      return attachUnattachedEnvironment(path, root, slotId, deps);
    },
    attachDeps: allocatorDeps,
    log: (line) => lines.push(line),
    exit: () => {},
  });
  assert.match(lines[0] ?? '', /RESERVED \/ UNATTACHED \/ UNPROVISIONED/);
  assert.match(lines[1] ?? '', /ATTACHED \/ UNPROVISIONED/);
  assert.equal(spawnCalled, false);
  assert.equal(reconcileCalled, false);
  assert.equal(tenantWriteCalled, false);
});

test('printDevStatus remote mode ignores host receipts when exec fails', () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-remote-fail-'));
  writeDevSession(worktree, {
    pid: 0,
    slotId: 'dev-6',
    namespace: 'offscreen-dev-6',
    gamePort: 13120,
    tiltPort: 13121,
    startedAt: '2026-11-23T00:00:16.000Z',
  });
  seedApiRuntimeFreshness(worktree, { slotId: 'dev-6' });
  const lines = [];
  const code = printDevStatus(worktree, {
    roles: [API_FRESHNESS_ROLE],
    pullSlotReceipts: true,
    execKubectl: () => ({ status: 1, stdout: '' }),
    log: (line) => lines.push(line),
  });
  assert.equal(code, 2);
  assert.ok(lines.some((line) => line === 'api NOT READY remote_unreadable'));
});

test('printDevStatus remote mode accepts a current pod observation', () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-remote-ok-'));
  writeDevSession(worktree, {
    pid: 0,
    slotId: 'dev-3',
    namespace: 'offscreen-dev-3',
    gamePort: 13120,
    tiltPort: 13121,
    startedAt: '2026-11-23T00:00:17.000Z',
  });
  const observation = observeApiRuntimeInFixture(worktree, { slotId: 'dev-3' });
  assert.equal(observation.ok, true);
  const lines = [];
  const code = printDevStatus(worktree, {
    roles: [API_FRESHNESS_ROLE],
    pullSlotReceipts: true,
    roleObservations: { api: observation },
    webReadiness: {
      namespace: 'offscreen-dev-3',
      expectedImage: 'offscreen-dev:gen',
      pod: {
        ready: true,
        namespace: 'offscreen-dev-3',
        image: 'offscreen-dev:gen',
      },
      httpStatus: 200,
    },
    log: (line) => lines.push(line),
  });
  assert.equal(code, 0);
  assert.ok(
    lines.some((line) => line.startsWith('api READY loaded_matches_desired ')),
  );
});

test('printDevStatus remote mode reports foreign slot receipts', () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-remote-foreign-'));
  writeDevSession(worktree, {
    pid: 0,
    slotId: 'dev-6',
    namespace: 'offscreen-dev-6',
    gamePort: 13120,
    tiltPort: 13121,
    startedAt: '2026-11-23T00:00:18.000Z',
  });
  const observation = observeApiRuntimeInFixture(worktree, {
    slotId: 'dev-6',
    environmentId: 'dev-5',
  });
  const lines = [];
  const code = printDevStatus(worktree, {
    roles: [API_FRESHNESS_ROLE],
    pullSlotReceipts: true,
    roleObservations: { api: observation },
    log: (line) => lines.push(line),
  });
  assert.equal(code, 2);
  assert.ok(lines.some((line) => line === 'api NOT READY foreign_environment'));
});

test('printDevStatus remote mode reports stale loaded generation', () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-remote-stale-'));
  writeDevSession(worktree, {
    pid: 0,
    slotId: 'dev-5',
    namespace: 'offscreen-dev-5',
    gamePort: 13120,
    tiltPort: 13121,
    startedAt: '2026-11-23T00:00:19.000Z',
  });
  seedApiRuntimeFreshness(worktree, { slotId: 'dev-5' });
  const receiptRoot = join(worktree, '.offscreen-dev-runtime', 'dev-5');
  const desired = JSON.parse(
    readFileSync(
      join(receiptRoot, `${API_FRESHNESS_ROLE.receiptRole}.desired.json`),
      'utf8',
    ),
  );
  writeFileSync(
    join(receiptRoot, `${API_FRESHNESS_ROLE.receiptRole}.loaded.json`),
    `${JSON.stringify({
      schema: DEV_LOADED_RUNTIME_RECEIPT_SCHEMA,
      role: API_FRESHNESS_ROLE.receiptRole,
      pid: process.pid,
      startedAt: new Date().toISOString(),
      generationId: '99999999-9999-4999-8999-999999999999',
      compiledModulePath: join(worktree, API_FRESHNESS_ROLE.compiledEntryPath),
      compiledModuleIdentity: desired.compiledModuleIdentity,
      environmentId: 'dev-5',
    })}\n`,
    'utf8',
  );
  const observation = observeDevRuntimeRoleInPod({
    receiptRole: API_FRESHNESS_ROLE.receiptRole,
    compiledEntryPath: join(worktree, API_FRESHNESS_ROLE.compiledEntryPath),
    receiptDir: receiptRoot,
    environmentId: 'dev-5',
  });
  const lines = [];
  const code = printDevStatus(worktree, {
    roles: [API_FRESHNESS_ROLE],
    pullSlotReceipts: true,
    roleObservations: { api: observation },
    log: (line) => lines.push(line),
  });
  assert.equal(code, 2);
  assert.ok(
    lines.some((line) => line === 'api NOT READY stale_loaded_generation'),
  );
});

test('printDevStatus remote mode reports dead loaded process', () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-remote-dead-'));
  const observation = observeApiRuntimeInFixture(worktree, { slotId: 'dev-7' });
  observation.pidAlive = false;
  const status = readinessFromRemoteObservation(
    API_FRESHNESS_ROLE,
    observation,
    evaluateDevLoadedRuntimeReadiness,
  );
  assert.equal(status.ready, false);
  assert.equal(status.reason, 'dead_loaded_process');
});

test('printDevStatus remote mode reports legacy v1 receipts as restart_required', () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-remote-v1-'));
  const receiptRoot = join(worktree, '.offscreen-dev-runtime', 'dev-8');
  mkdirSync(receiptRoot, { recursive: true });
  writeFileSync(
    join(receiptRoot, 'api.desired.json'),
    `${JSON.stringify({
      schema: 'offscreen.dev-watched-compilation.v1',
      role: 'api',
      phase: 'compile_success',
      ready: true,
    })}\n`,
  );
  writeFileSync(
    join(receiptRoot, 'api.loaded.json'),
    `${JSON.stringify({
      schema: 'offscreen.dev-loaded-runtime.v1',
      role: 'api',
      pid: 4242,
    })}\n`,
  );
  const observation = observeDevRuntimeRoleInPod({
    receiptRole: 'api',
    compiledEntryPath: join(worktree, API_FRESHNESS_ROLE.compiledEntryPath),
    receiptDir: receiptRoot,
    environmentId: 'dev-8',
  });
  assert.equal(observation.legacyReceipt, true);
  const status = readinessFromRemoteObservation(
    API_FRESHNESS_ROLE,
    observation,
    evaluateDevLoadedRuntimeReadiness,
  );
  assert.equal(status.reason, 'restart_required');
});

test('printDevStatus remote mode reports changed dist tree identity', () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-remote-disk-'));
  const observation = observeApiRuntimeInFixture(worktree, { slotId: 'dev-9' });
  observation.diskIdentity = 'deadbeef';
  const status = readinessFromRemoteObservation(
    API_FRESHNESS_ROLE,
    observation,
    evaluateDevLoadedRuntimeReadiness,
  );
  assert.equal(status.ready, false);
  assert.equal(status.reason, 'desired_disk_mismatch');
});

test('observeSelectedSlotRuntimeRoles execs only the owned namespace', () => {
  /** @type {string[][]} */
  const calls = [];
  observeSelectedSlotRuntimeRoles({
    namespace: 'offscreen-dev-2',
    environmentId: 'dev-2',
    roles: [API_FRESHNESS_ROLE],
    run: (args) => {
      calls.push([...args]);
      return { status: 0, stdout: '{"ok":false,"reason":"remote_unreadable"}' };
    },
  });
  assert.equal(calls.length, 1);
  const args = calls[0];
  assert.ok(args.includes('-n'));
  assert.ok(args.includes('offscreen-dev-2'));
  assert.ok(args.includes('deploy/game-api'));
  assert.equal(args.includes('offscreen-dev-3'), false);
});

test('printDevStatus web readiness stays independent of remote role failures', () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-remote-web-'));
  writeDevSession(worktree, {
    pid: 0,
    slotId: 'dev-3',
    namespace: 'offscreen-dev-3',
    gamePort: 13120,
    tiltPort: 13121,
    startedAt: '2026-11-23T00:00:20.000Z',
  });
  const lines = [];
  const code = printDevStatus(worktree, {
    roles: [API_FRESHNESS_ROLE],
    pullSlotReceipts: true,
    roleObservations: { api: { ok: false, reason: 'remote_unreadable' } },
    webReadiness: {
      namespace: 'offscreen-dev-3',
      expectedImage: 'offscreen-dev:gen',
      pod: {
        ready: true,
        namespace: 'offscreen-dev-3',
        image: 'offscreen-dev:gen',
      },
      httpStatus: 200,
    },
    log: (line) => lines.push(line),
  });
  assert.equal(code, 2);
  assert.ok(
    lines.some((line) => line.startsWith('web READY dev_server_serving')),
  );
  assert.ok(lines.some((line) => line === 'api NOT READY remote_unreadable'));
});

test('replica readback keeps another environment out of the rollback report', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-foreign-'));
  const harness = ownedLaunch(worktree, {
    replicas: (namespace) => (namespace === 'offscreen-dev-6' ? 1 : 0),
  });
  await harness.launch({
    collectStartupReadiness: async () => fullReadiness({ 'game-api': false }),
  });
  assert.equal(
    harness.scaled.some((call) => call.namespace === 'offscreen-dev-6'),
    false,
  );
  assert.equal(
    harness.lines.some((line) => line.startsWith('startup-parked:')),
    true,
  );
});
