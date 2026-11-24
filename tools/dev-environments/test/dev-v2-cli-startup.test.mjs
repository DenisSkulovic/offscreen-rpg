import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  environmentSessionRoot,
  ownedEnvironmentSessionPid,
  resolveDevEnvironmentSelection,
  writeEnvironmentSession,
} from '../src/domain/dev-environment-session.mjs';
import {
  formatAttachedEnvironmentLine,
  runDevAttachCli,
  runDevReserveCli,
} from '../src/cli/dev-tilt.mjs';
import {
  formatDevOperatorSummaryLine,
  maybeAnnounce,
  resolveDevOperatorNextAction,
  runDevTiltLaunch,
} from '../src/application/dev-lifecycle.mjs';
import {
  attachUnattachedEnvironment,
  reserveUnattachedEnvironment,
} from '../src/domain/dev-worktree-allocator.mjs';
import {
  readRegistryJson,
  writeRegistry,
} from '../src/domain/dev-worktree-registry.mjs';

const dead = {
  pidAlive: () => false,
  readStartTicks: () => null,
};
const alive = {
  pidAlive: () => true,
  readStartTicks: () => '100',
};

function owner(slot, checkout) {
  const n = Number(slot.slice(4));
  return {
    slotId: slot,
    worktreePath: checkout,
    cluster: 'kind-offscreen-dev',
    namespace: `offscreen-${slot}`,
    ports: {
      game: 23000 + n,
      control: 24000 + n,
      tilt: 25000 + n,
      spare: 26000 + n,
    },
    processIdentity: null,
    resourceUids: { namespace: `uid-${slot}` },
    lease: null,
  };
}

function emptyV2(root) {
  writeRegistry(root, {
    version: 2,
    nextSequence: 1,
    environmentsById: {},
    defaultEnvironmentByCheckout: {},
  });
}

function isolatedRegistryRoot(prefix) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  const registryRoot = join(root, 'registry');
  mkdirSync(registryRoot, { recursive: true });
  return { root, registryRoot };
}

test('default start, status and stop stay on one allocated id', () => {
  const checkout = mkdtempSync(join(tmpdir(), 'offscreen-v2-cli-'));
  const root = mkdtempSync(join(tmpdir(), 'offscreen-v2-reg-'));
  emptyV2(root);
  let calls = 0;
  const allocate = (path, _registry, options) => {
    calls += 1;
    assert.equal(options?.setAsDefault, true);
    const record = owner('dev-1', path);
    const snapshot = readRegistryJson(root);
    snapshot.environmentsById['dev-1'] = record;
    snapshot.defaultEnvironmentByCheckout[path] = 'dev-1';
    snapshot.nextSequence = 2;
    writeRegistry(root, snapshot);
    return record;
  };
  const started = resolveDevEnvironmentSelection({
    command: 'up',
    instance: null,
    worktree: checkout,
    registryRoot: root,
    allocate,
  });
  const again = resolveDevEnvironmentSelection({
    command: 'up',
    instance: null,
    worktree: checkout,
    registryRoot: root,
    allocate,
  });
  const status = resolveDevEnvironmentSelection({
    command: 'status',
    instance: null,
    worktree: checkout,
    registryRoot: root,
    allocate,
  });
  const stop = resolveDevEnvironmentSelection({
    command: 'stop',
    instance: null,
    worktree: checkout,
    registryRoot: root,
    allocate,
  });
  assert.equal(calls, 1);
  assert.equal(started.allocatedDefault, true);
  assert.equal(started.record.slotId, 'dev-1');
  assert.equal(again.record.slotId, 'dev-1');
  assert.equal(again.allocatedDefault, undefined);
  assert.equal(status.record.slotId, 'dev-1');
  assert.equal(stop.record.slotId, 'dev-1');
  assert.equal(
    readRegistryJson(root).defaultEnvironmentByCheckout[checkout],
    'dev-1',
  );
  rmSync(root, { recursive: true, force: true });
  rmSync(checkout, { recursive: true, force: true });
});

test('dev:new launches the new id and keeps the existing default', () => {
  const checkout = mkdtempSync(join(tmpdir(), 'offscreen-v2-new-'));
  const root = mkdtempSync(join(tmpdir(), 'offscreen-v2-reg-'));
  const first = owner('dev-1', checkout);
  writeRegistry(root, {
    version: 2,
    nextSequence: 2,
    environmentsById: { 'dev-1': first },
    defaultEnvironmentByCheckout: { [checkout]: 'dev-1' },
  });
  const created = resolveDevEnvironmentSelection({
    command: 'new',
    instance: null,
    worktree: checkout,
    registryRoot: root,
    allocate: (path) => {
      const record = owner('dev-2', path);
      const snapshot = readRegistryJson(root);
      snapshot.environmentsById['dev-2'] = record;
      snapshot.nextSequence = 3;
      writeRegistry(root, snapshot);
      return record;
    },
  });
  assert.equal(created.action, 'up');
  assert.equal(created.record.slotId, 'dev-2');
  assert.equal(created.allocatedNew, true);
  assert.equal(
    readRegistryJson(root).defaultEnvironmentByCheckout[checkout],
    'dev-1',
  );
  const explicit = resolveDevEnvironmentSelection({
    command: 'up',
    instance: 'dev-2',
    worktree: checkout,
    registryRoot: root,
    processDeps: dead,
  });
  assert.equal(explicit.record.slotId, 'dev-2');
  rmSync(root, { recursive: true, force: true });
  rmSync(checkout, { recursive: true, force: true });
});

test('signal cleanup uses the selected environment and ignores a stale pid', () => {
  const checkout = mkdtempSync(join(tmpdir(), 'offscreen-v2-signal-'));
  const other = mkdtempSync(join(tmpdir(), 'offscreen-v2-other-'));
  const root = mkdtempSync(join(tmpdir(), 'offscreen-v2-reg-'));
  const selected = owner('dev-2', checkout);
  const foreign = {
    ...owner('dev-1', other),
    lease: { pid: 201268, startTimeJiffies: 1684727 },
  };
  writeRegistry(root, {
    version: 2,
    nextSequence: 3,
    environmentsById: { 'dev-1': foreign, 'dev-2': selected },
    defaultEnvironmentByCheckout: { [checkout]: 'dev-2', [other]: 'dev-1' },
  });
  const sessions = environmentSessionRoot(root);
  writeEnvironmentSession(sessions, {
    slotId: 'dev-2',
    pid: 42,
    processStartTicks: '100',
    namespace: selected.namespace,
    checkoutPath: checkout,
    gamePort: selected.ports.game,
    tiltPort: selected.ports.tilt,
  });
  writeEnvironmentSession(sessions, {
    slotId: 'dev-1',
    pid: 201268,
    processStartTicks: '1684727',
    namespace: foreign.namespace,
    checkoutPath: other,
    gamePort: foreign.ports.game,
    tiltPort: foreign.ports.tilt,
  });
  assert.equal(ownedEnvironmentSessionPid(root, selected, alive), 42);
  assert.equal(ownedEnvironmentSessionPid(root, foreign, dead), null);
  assert.throws(() =>
    resolveDevEnvironmentSelection({
      command: 'status',
      instance: 'dev-9',
      worktree: checkout,
      registryRoot: root,
      processDeps: dead,
    }),
  );
  assert.throws(() =>
    resolveDevEnvironmentSelection({
      command: 'up',
      instance: 'dev-1',
      worktree: checkout,
      registryRoot: root,
      processDeps: alive,
    }),
  );
  assert.throws(() =>
    resolveDevEnvironmentSelection({
      command: 'status',
      instance: 'dev-1',
      worktree: checkout,
      registryRoot: root,
      processDeps: dead,
    }),
  );
  const stale = resolveDevEnvironmentSelection({
    command: 'status',
    instance: 'dev-1',
    worktree: other,
    registryRoot: root,
    processDeps: dead,
  });
  assert.equal(stale.record.lease.pid, 201268);
  assert.equal(
    readRegistryJson(root).environmentsById['dev-1'].lease.pid,
    201268,
  );
  rmSync(root, { recursive: true, force: true });
  rmSync(checkout, { recursive: true, force: true });
  rmSync(other, { recursive: true, force: true });
});

test('reserve and attach CLI stay registry-only with bounded output', () => {
  const checkout = mkdtempSync(join(tmpdir(), 'offscreen-v2-reserve-'));
  const { root, registryRoot } = isolatedRegistryRoot(
    'offscreen-v2-reserve-reg-',
  );
  emptyV2(registryRoot);
  /** @type {string[]} */
  const lines = [];
  let exitCode = -1;
  const allocatorDeps = {
    canonicalizePath: (path) => path,
    isPortAvailable: () => true,
  };
  runDevReserveCli({
    registryRoot,
    reserveDeps: allocatorDeps,
    log: (line) => lines.push(line),
    exit: (code) => {
      exitCode = code;
    },
  });
  assert.equal(exitCode, 0);
  assert.match(lines[0] ?? '', /RESERVED \/ UNATTACHED \/ UNPROVISIONED/);
  const reserved = Object.values(
    readRegistryJson(registryRoot).environmentsById,
  )[0];
  assert.equal(reserved.worktreePath, null);
  lines.length = 0;
  exitCode = -1;
  runDevAttachCli(reserved.slotId, {
    worktree: checkout,
    registryRoot,
    attachDeps: allocatorDeps,
    log: (line) => lines.push(line),
    exit: (code) => {
      exitCode = code;
    },
  });
  assert.equal(exitCode, 0);
  assert.equal(
    lines[0],
    formatAttachedEnvironmentLine({ slotId: reserved.slotId }),
  );
  const snapshot = readRegistryJson(registryRoot);
  assert.equal(
    snapshot.environmentsById[reserved.slotId].worktreePath,
    checkout,
  );
  assert.equal(
    snapshot.defaultEnvironmentByCheckout[checkout],
    reserved.slotId,
  );
  rmSync(root, { recursive: true, force: true });
  rmSync(checkout, { recursive: true, force: true });
});

test('failed attach leaves registry byte-equivalent', () => {
  const checkoutA = mkdtempSync(join(tmpdir(), 'offscreen-v2-attach-a-'));
  const checkoutB = mkdtempSync(join(tmpdir(), 'offscreen-v2-attach-b-'));
  const { root, registryRoot } = isolatedRegistryRoot(
    'offscreen-v2-attach-reg-',
  );
  emptyV2(registryRoot);
  const allocatorDeps = {
    canonicalizePath: (path) => path,
    isPortAvailable: () => true,
  };
  const reserved = reserveUnattachedEnvironment(registryRoot, allocatorDeps);
  attachUnattachedEnvironment(
    checkoutA,
    registryRoot,
    reserved.slotId,
    allocatorDeps,
  );
  const before = readFileSync(join(registryRoot, 'owners.json'), 'utf8');
  let exitCode = 0;
  runDevAttachCli(reserved.slotId, {
    worktree: checkoutB,
    registryRoot,
    attachDeps: allocatorDeps,
    log: () => {},
    exit: (code) => {
      exitCode = code;
    },
  });
  assert.equal(exitCode, 1);
  assert.equal(readFileSync(join(registryRoot, 'owners.json'), 'utf8'), before);
  rmSync(root, { recursive: true, force: true });
  rmSync(checkoutA, { recursive: true, force: true });
  rmSync(checkoutB, { recursive: true, force: true });
});

test('injected launch refusal restores process signal listener counts', async () => {
  const beforeSigint = process.listenerCount('SIGINT');
  const beforeSigterm = process.listenerCount('SIGTERM');
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-v2-launch-refuse-'));
  const registryRoot = join(
    mkdtempSync(join(tmpdir(), 'offscreen-v2-launch-reg-')),
    'registry',
  );
  mkdirSync(registryRoot, { recursive: true });
  /** @type {import('node:child_process').ChildProcess} */
  const child = new EventEmitter();
  // @ts-expect-error test stub
  child.pid = 42_001;
  await runDevTiltLaunch({
    worktree,
    registryRoot,
    fingerprintDevImageContext: () => ({
      ok: true,
      fingerprint: 'ab'.repeat(32),
    }),
    owner: owner('dev-2', worktree),
    allocateDevWorktreeOwner: () => owner('dev-2', worktree),
    collectDefaultProbes: async () => ({}),
    runStackPreflight: () => ({ ok: true, refusals: [] }),
    commandOnPath: () => true,
    probeLoopbackPortOccupied: async () => false,
    spawnFn: () => child,
    exit: () => {},
    reconcileDevSlot: async () => ({
      ok: false,
      phase: 'injected',
      detail: 'refuse',
    }),
  });
  assert.equal(process.listenerCount('SIGINT'), beforeSigint);
  assert.equal(process.listenerCount('SIGTERM'), beforeSigterm);
});

test('operator summary maps refusal ids to busy-retry, stop, or missing-platform', () => {
  assert.equal(
    resolveDevOperatorNextAction('slot-operation-busy'),
    'busy-retry',
  );
  assert.equal(resolveDevOperatorNextAction('session-active'), 'stop');
  assert.equal(
    resolveDevOperatorNextAction('missing-tilt'),
    'missing-platform',
  );
  assert.equal(
    resolveDevOperatorNextAction('slot-shared-core'),
    'missing-platform',
  );
  assert.equal(
    formatDevOperatorSummaryLine({
      slotId: 'dev-2',
      phase: 'reconcile',
      nextAction: 'missing-platform',
    }),
    'slot dev-2 phase=reconcile next=missing-platform',
  );
});

test('ready announcement prints selected slot once before loopback urls', () => {
  const lines = maybeAnnounce(
    {
      urls: {
        game: 'http://127.0.0.1:3000/',
        control: 'http://127.0.0.1:3000/control',
        tilt: 'http://127.0.0.1:10350/',
      },
    },
    'dev-3',
  );
  assert.equal(lines.length, 4);
  assert.equal(lines[0], 'slot dev-3 phase=ready');
  assert.ok(lines.slice(1).every((line) => line.includes('127.0.0.1')));
});

test('bare status never reserves or attaches', () => {
  const checkout = mkdtempSync(join(tmpdir(), 'offscreen-v2-status-ro-'));
  const root = mkdtempSync(join(tmpdir(), 'offscreen-v2-status-reg-'));
  emptyV2(root);
  const before = readFileSync(join(root, 'owners.json'), 'utf8');
  assert.throws(
    () =>
      resolveDevEnvironmentSelection({
        command: 'status',
        instance: null,
        worktree: checkout,
        registryRoot: root,
        allocate: () => {
          throw new Error('status must not allocate');
        },
      }),
    (error) => error.id === 'missing-default',
  );
  assert.equal(readFileSync(join(root, 'owners.json'), 'utf8'), before);
  rmSync(root, { recursive: true, force: true });
  rmSync(checkout, { recursive: true, force: true });
});
