import { createServer } from 'node:net';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
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
  printDevStatus,
  readDevSession,
  runDevTiltLaunch,
  stopDevSession,
  scaleDevSlotWorkloads,
  writeDevSession,
} from './dev-tilt.mjs';
import {
  fingerprintCompiledEntryFile,
  markDevWatchedCompilation,
} from '../../infra/kubernetes/lab/dev/dev-watched-compilation-receipt.mjs';
import { writeDevLoadedRuntimeReceipt } from '../../packages/runtime-logging/dist/dev-loaded-runtime-receipt.js';

const API_FRESHNESS_ROLE = DEV_RUNTIME_FRESHNESS_ROLES.find((entry) => entry.role === 'api');
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

  markDevWatchedCompilation({
    phase: 'success',
    role: API_FRESHNESS_ROLE.receiptRole,
    compiledEntryPath: entryRel,
    cwd: worktree,
  });

  const receiptRoot = join(worktree, '.offscreen-dev-runtime');
  const identity = fingerprintCompiledEntryFile(entryAbs);
  if (options.staleLoaded) {
    writeFileSync(
      join(receiptRoot, `${API_FRESHNESS_ROLE.receiptRole}.loaded.json`),
      `${JSON.stringify({
        schema: 'offscreen.dev-loaded-runtime.v1',
        role: API_FRESHNESS_ROLE.receiptRole,
        pid: 4242,
        startedAt: new Date().toISOString(),
        compiledModulePath: entryAbs,
        compiledModuleIdentity: 'stale-generation-identity',
      })}\n`,
      'utf8',
    );
    return;
  }

  const previousCwd = process.cwd();
  process.chdir(worktree);
  const previousReceiptDir = process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR;
  delete process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR;
  try {
    writeDevLoadedRuntimeReceipt({
      role: API_FRESHNESS_ROLE.receiptRole,
      compiledModulePath: entryAbs,
    });
  } finally {
    process.chdir(previousCwd);
    if (previousReceiptDir === undefined) {
      delete process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR;
    } else {
      process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR = previousReceiptDir;
    }
  }
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
      message: 'Refusing: current kubectl context is "minikube", not kind-offscreen-lab.',
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
  assert.ok(result.refusals.some((r) => r.id === 'resource-not-ready-game-executor'));
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
    () => scaleDevSlotWorkloads('lab-edge', () => {
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
  for (const name of ['game-web', 'game-api', 'game-authority', 'game-control', 'game-executor', 'game-relay']) {
    assert.equal(args.includes(name), true);
  }
});

test('launcher writes allocator game and tilt ports to the worktree session', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-launch-'));
  const spawn = fakeSpawn();
  await runDevTiltLaunch({
    worktree,
    allocateDevWorktreeOwner: fakeAllocator,
    collectDefaultProbes: async () => ({}),
    runStackPreflight: () => okPreflight(),
    commandOnPath: () => true,
    probeLoopbackPortOccupied: alwaysFreeProbe,
    spawnFn: spawn,
    collectLabReadiness: async () => ({}),
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
    await runDevTiltLaunch({
      worktree,
      allocateDevWorktreeOwner: fakeAllocator,
      collectDefaultProbes: async () => ({}),
      runStackPreflight: () => okPreflight(),
      commandOnPath: () => true,
      probeLoopbackPortOccupied: async (_host, port) => port === FAKE_OWNER.ports.game,
      spawnFn: spawn,
      exit: (code) => {
        exitCodes.push(code);
      },
      exitAfterSession: true,
      reconcileDevSlot: async () => ({ ok: true, readyForWorkloads: true }),
    });

    assert.deepEqual(exitCodes, [1]);
    assert.equal(spawn.called(), false);
    assert.equal(readDevSession(worktree), null);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
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
  const blob = JSON.stringify({ urls, lines, result: assessDevLaunch({
    preflightOk: true,
    preflightRefusals: [],
    tiltOnPath: true,
    ports: { game: 'free', tilt: 'free' },
    readiness: fullReadiness(),
  }) });
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
  seedApiRuntimeFreshness(worktree);

  /** @type {string[]} */
  const lines = [];
  const code = printDevStatus(worktree, {
    roles: [API_FRESHNESS_ROLE],
    log: (line) => lines.push(line),
  });

  assert.equal(code, 0);
  assert.ok(lines.some((line) => line.startsWith('api READY loaded_matches_desired ')));
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
  seedApiRuntimeFreshness(worktree, { staleLoaded: true });

  /** @type {string[]} */
  const lines = [];
  const code = printDevStatus(worktree, {
    roles: [API_FRESHNESS_ROLE],
    log: (line) => lines.push(line),
  });

  assert.equal(code, 2);
  assert.ok(lines.some((line) => line === 'api NOT READY stale_loaded_runtime'));
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

  const staleIdentity = fingerprintCompiledEntryFile(entryAbs);
  const receiptRoot = join(worktree, '.offscreen-dev-runtime');
  mkdirSync(receiptRoot, { recursive: true });
  writeFileSync(
    join(receiptRoot, `${API_FRESHNESS_ROLE.receiptRole}.loaded.json`),
    `${JSON.stringify({
      schema: 'offscreen.dev-loaded-runtime.v1',
      role: API_FRESHNESS_ROLE.receiptRole,
      pid: 4242,
      startedAt: new Date().toISOString(),
      compiledModulePath: entryAbs,
      compiledModuleIdentity: staleIdentity,
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