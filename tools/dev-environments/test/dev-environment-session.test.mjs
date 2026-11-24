import assert from 'node:assert/strict';
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  adoptLegacyEnvironmentSession,
  environmentSessionPath,
  environmentSessionRoot,
  parseDevCliArgs,
  readEnvironmentSession,
  parkSelectedEnvironment,
  resolveDevEnvironmentSelection,
  stopSelectedEnvironment,
  writeEnvironmentSession,
} from '../src/domain/dev-environment-session.mjs';
import {
  DEV_SESSION_JSON_FILE_MODE,
  devSessionJsonFileMode,
  writeDevSessionJsonAtomically,
} from '../src/domain/dev-session-json.mjs';
import { reserveUnattachedEnvironment } from '../src/domain/dev-worktree-allocator.mjs';
import {
  cutoverAuthorizedLiveRegistry,
  migrateRegistryV1ToV2,
  rollbackLiveRegistryCutover,
  writeRegistry,
} from '../src/domain/dev-worktree-registry.mjs';

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
      game: 13000 + n,
      control: 13000 + n,
      tilt: 14000 + n,
      spare: 15000 + n,
    },
    processIdentity: null,
    resourceUids: { namespace: `uid-${slot}` },
    lease: null,
  };
}

function v1(root) {
  const a = '/canonical/a';
  const b = '/canonical/b';
  writeRegistry(root, {
    version: 1,
    nextSequence: 5,
    ownersByWorktree: {
      [a]: owner('dev-1', a),
      [b]: owner('dev-2', b),
      '/canonical/c': owner('dev-3', '/canonical/c'),
      '/canonical/d': owner('dev-4', '/canonical/d'),
    },
  });
}

test('legacy four-slot selection keeps the checkout default', () => {
  const root = mkdtempSync(join(tmpdir(), 'offscreen-fu02-'));
  v1(root);
  const selected = resolveDevEnvironmentSelection({
    command: 'status',
    instance: null,
    worktree: '/canonical/a',
    registryRoot: root,
  });
  assert.equal(selected.record.slotId, 'dev-1');
  assert.equal(
    resolveDevEnvironmentSelection({
      command: 'status',
      instance: 'dev-4',
      worktree: '/canonical/d',
      registryRoot: root,
    }).record.slotId,
    'dev-4',
  );
  rmSync(root, { recursive: true, force: true });
});

test('explicit unknown id and conflicting flags refuse', () => {
  const root = mkdtempSync(join(tmpdir(), 'offscreen-fu02-'));
  v1(root);
  assert.throws(
    () =>
      resolveDevEnvironmentSelection({
        command: 'status',
        instance: 'dev-9',
        worktree: '/canonical/a',
        registryRoot: root,
      }),
    (error) => error.id === 'unknown-environment',
  );
  assert.throws(
    () =>
      parseDevCliArgs(['node', 'dev-tilt.mjs', 'new', '--instance', 'dev-1']),
    (error) => error.id === 'conflicting-arguments',
  );
  assert.throws(
    () => parseDevCliArgs(['node', 'dev-tilt.mjs', '--instance']),
    (error) => error.id === 'invalid-arguments',
  );
  assert.throws(
    () =>
      parseDevCliArgs([
        'node',
        'dev-tilt.mjs',
        'reserve',
        '--instance',
        'dev-1',
      ]),
    (error) => error.id === 'conflicting-arguments',
  );
  assert.throws(
    () => parseDevCliArgs(['node', 'dev-tilt.mjs', 'attach']),
    (error) => error.id === 'invalid-arguments',
  );
  assert.deepEqual(parseDevCliArgs(['node', 'dev-tilt.mjs', 'reserve']), {
    command: 'reserve',
    instance: null,
  });
  assert.deepEqual(
    parseDevCliArgs(['node', 'dev-tilt.mjs', 'attach', '--instance', 'dev-2']),
    { command: 'attach', instance: 'dev-2' },
  );
  rmSync(root, { recursive: true, force: true });
});

test('two sessions share a checkout and stopping one leaves the other', () => {
  const root = mkdtempSync(join(tmpdir(), 'offscreen-fu02-'));
  const checkout = '/canonical/shared';
  writeRegistry(root, {
    version: 2,
    nextSequence: 3,
    environmentsById: {
      'dev-1': owner('dev-1', checkout),
      'dev-2': owner('dev-2', checkout),
    },
    defaultEnvironmentByCheckout: { [checkout]: 'dev-1' },
  });
  const sessions = environmentSessionRoot(root);
  const first = owner('dev-1', checkout);
  const second = owner('dev-2', checkout);
  writeEnvironmentSession(sessions, {
    ...first,
    checkoutPath: checkout,
    gamePort: first.ports.game,
    tiltPort: first.ports.tilt,
    pid: 11,
    processStartTicks: '100',
    forwardPid: 12,
    forwardStartTicks: '100',
  });
  writeEnvironmentSession(sessions, {
    ...second,
    checkoutPath: checkout,
    gamePort: second.ports.game,
    tiltPort: second.ports.tilt,
    pid: 21,
    processStartTicks: '100',
    forwardPid: 22,
    forwardStartTicks: '100',
  });
  /** @type {number[]} */
  const signalled = [];
  /** @type {string[]} */
  const scaled = [];
  const stopped = stopSelectedEnvironment({
    owner: owner('dev-2', checkout),
    sessionRoot: sessions,
    processDeps: alive,
    signal: (pid) => signalled.push(pid),
    scale: (namespace) => scaled.push(namespace),
  });
  assert.equal(stopped.ok, true);
  assert.deepEqual(signalled, [21, 22]);
  assert.deepEqual(scaled, ['offscreen-dev-2']);
  assert.equal(readEnvironmentSession(sessions, 'dev-1').pid, 11);
  assert.equal(readEnvironmentSession(sessions, 'dev-1').stopped, undefined);
  rmSync(root, { recursive: true, force: true });
});

test('stale pid, foreign namespace and corrupt legacy do not signal or scale', () => {
  const checkout = mkdtempSync(join(tmpdir(), 'offscreen-fu02-wt-'));
  const root = mkdtempSync(join(tmpdir(), 'offscreen-fu02-'));
  const record = owner('dev-3', checkout);
  const sessions = environmentSessionRoot(root);
  writeEnvironmentSession(sessions, {
    ...record,
    checkoutPath: checkout,
    gamePort: record.ports.game,
    tiltPort: record.ports.tilt,
    pid: 5,
    processStartTicks: '100',
  });
  /** @type {number[]} */
  const signalled = [];
  const stale = stopSelectedEnvironment({
    owner: record,
    sessionRoot: sessions,
    processDeps: { pidAlive: () => true, readStartTicks: () => '999' },
    signal: (pid) => signalled.push(pid),
    scale: () => signalled.push(-1),
  });
  assert.equal(stale.ok, false);
  assert.equal(stale.reason, 'start_time_mismatch');
  assert.deepEqual(signalled, []);
  const foreign = stopSelectedEnvironment({
    owner: record,
    sessionRoot: sessions,
    session: {
      ...record,
      slotId: 'dev-3',
      namespace: 'offscreen-dev-9',
      checkoutPath: checkout,
      gamePort: record.ports.game,
      tiltPort: record.ports.tilt,
      pid: 5,
      processStartTicks: '100',
    },
    processDeps: alive,
    signal: (pid) => signalled.push(pid),
    scale: () => signalled.push(-1),
  });
  assert.equal(foreign.reason, 'slot_or_namespace_mismatch');
  mkdirSync(join(checkout, '.offscreen'), { recursive: true });
  writeFileSync(join(checkout, '.offscreen', 'dev-session.json'), '{');
  assert.throws(
    () =>
      adoptLegacyEnvironmentSession({
        worktree: checkout,
        owner: record,
        sessionRoot: sessions,
        processDeps: alive,
      }),
    (error) => error.id === 'corrupt-session',
  );
  rmSync(root, { recursive: true, force: true });
  rmSync(checkout, { recursive: true, force: true });
});

test('verified legacy session is copied and the original file stays', () => {
  const checkout = mkdtempSync(join(tmpdir(), 'offscreen-fu02-legacy-'));
  const root = mkdtempSync(join(tmpdir(), 'offscreen-fu02-'));
  const record = owner('dev-1', checkout);
  mkdirSync(join(checkout, '.offscreen'), { recursive: true });
  const legacy = {
    pid: 7,
    processStartTicks: '100',
    forwardPid: 8,
    forwardStartTicks: '100',
    slotId: 'dev-1',
    namespace: record.namespace,
    gamePort: record.ports.game,
    tiltPort: record.ports.tilt,
  };
  writeFileSync(
    join(checkout, '.offscreen', 'dev-session.json'),
    JSON.stringify(legacy),
  );
  const adopted = adoptLegacyEnvironmentSession({
    worktree: checkout,
    owner: record,
    sessionRoot: environmentSessionRoot(root),
    processDeps: alive,
  });
  assert.equal(adopted.slotId, 'dev-1');
  assert.equal(
    readFileSync(
      join(checkout, '.offscreen', 'dev-session.json'),
      'utf8',
    ).includes('dev-1'),
    true,
  );
  rmSync(root, { recursive: true, force: true });
  rmSync(checkout, { recursive: true, force: true });
});

test('authorized cutover preserves ids and a later edit blocks rollback', () => {
  const previous = process.env.OFFSCREEN_DEV_WORKTREE_REGISTRY;
  const root = mkdtempSync(join(tmpdir(), 'offscreen-fu02-live-'));
  process.env.OFFSCREEN_DEV_WORKTREE_REGISTRY = root;
  try {
    v1(root);
    assert.throws(
      () =>
        cutoverAuthorizedLiveRegistry(
          root,
          { ok: true, sessionsVerified: true },
          {},
        ),
      (error) => error.id === 'migration-unauthorized',
    );
    assert.throws(
      () => migrateRegistryV1ToV2(root, { authorizeCutover: true }),
      (error) => error.id === 'live-migration-refused',
    );
    const v2 = cutoverAuthorizedLiveRegistry(
      root,
      { ok: true, sessionsVerified: true },
      { authorizeLiveCutover: true },
    );
    assert.equal(
      v2.environmentsById['dev-1'].resourceUids.namespace,
      'uid-dev-1',
    );
    assert.equal(v2.defaultEnvironmentByCheckout['/canonical/a'], 'dev-1');
    writeRegistry(root, v2);
    v2.nextSequence = 99;
    writeRegistry(root, v2);
    assert.throws(
      () => rollbackLiveRegistryCutover(root),
      (error) => error.id === 'rollback-refused',
    );
  } finally {
    if (previous === undefined)
      delete process.env.OFFSCREEN_DEV_WORKTREE_REGISTRY;
    else process.env.OFFSCREEN_DEV_WORKTREE_REGISTRY = previous;
    rmSync(root, { recursive: true, force: true });
  }
});

test('explicit instance on unattached reservation refuses', () => {
  const root = mkdtempSync(join(tmpdir(), 'offscreen-fu02-unattached-'));
  writeRegistry(root, {
    version: 2,
    nextSequence: 2,
    environmentsById: {},
    defaultEnvironmentByCheckout: {},
  });
  const reserved = reserveUnattachedEnvironment(root, {
    canonicalizePath: (path) => path,
    isPortAvailable: () => true,
  });
  assert.throws(
    () =>
      resolveDevEnvironmentSelection({
        command: 'status',
        instance: reserved.slotId,
        worktree: '/canonical/a',
        registryRoot: root,
      }),
    (error) => error.id === 'unattached-environment',
  );
  rmSync(root, { recursive: true, force: true });
});

test('explicit instance from a foreign checkout refuses without registry mutation', () => {
  const root = mkdtempSync(join(tmpdir(), 'offscreen-fu02-'));
  v1(root);
  const before = readFileSync(join(root, 'owners.json'), 'utf8');
  assert.throws(
    () =>
      resolveDevEnvironmentSelection({
        command: 'up',
        instance: 'dev-2',
        worktree: '/canonical/a',
        registryRoot: root,
      }),
    (error) => error.id === 'foreign-checkout',
  );
  assert.equal(readFileSync(join(root, 'owners.json'), 'utf8'), before);
  rmSync(root, { recursive: true, force: true });
});

function sessionFor(record, extra = {}) {
  return {
    slotId: record.slotId,
    namespace: record.namespace,
    checkoutPath: record.worktreePath,
    gamePort: record.ports.game,
    tiltPort: record.ports.tilt,
    pid: 40,
    processStartTicks: '100',
    forwardPid: 41,
    forwardStartTicks: '100',
    consumerId: 'cursor-a',
    ...extra,
  };
}

test('owned park scales six roles, clears the reservation, and repeats cleanly', () => {
  const checkout = mkdtempSync(join(tmpdir(), 'offscreen-park-'));
  const root = mkdtempSync(join(tmpdir(), 'offscreen-park-reg-'));
  const record = {
    ...owner('dev-3', checkout),
    lease: { pid: 40, startTimeJiffies: '100', acquiredAt: 't' },
  };
  const sessions = environmentSessionRoot(root);
  writeEnvironmentSession(sessions, sessionFor(record));
  const scaled = [];
  const desired = {
    'game-web': 1,
    'game-api': 1,
    'game-authority': 1,
    'game-control': 1,
    'game-executor': 1,
    'game-relay': 1,
  };
  let lease = record.lease;
  const running = new Set([40, 41]);
  const stopping = {
    pidAlive: (pid) => running.has(pid),
    readStartTicks: () => '100',
  };
  const first = parkSelectedEnvironment({
    owner: record,
    sessionRoot: sessions,
    processDeps: stopping,
    signal: (pid) => running.delete(pid),
    scaleRole: (_namespace, role) => {
      scaled.push(role);
      desired[role] = 0;
    },
    readDesiredReplicas: () => desired,
    clearReservation: () => {
      lease = null;
      record.lease = null;
    },
  });
  assert.equal(first.released, true);
  assert.equal(scaled.length, 6);
  assert.equal(lease, null);
  assert.equal(first.tenantIdentity.resourceUids.namespace, 'uid-dev-3');
  const second = parkSelectedEnvironment({
    owner: record,
    sessionRoot: sessions,
    processDeps: stopping,
    signal: () => {
      throw new Error('repeat must not signal');
    },
    scaleRole: () => {
      throw new Error('repeat must not scale');
    },
    readDesiredReplicas: () => desired,
  });
  assert.equal(second.reason, 'already_parked');
  rmSync(root, { recursive: true, force: true });
  rmSync(checkout, { recursive: true, force: true });
});

test('one failed deployment keeps the reservation and session for retry', () => {
  const checkout = mkdtempSync(join(tmpdir(), 'offscreen-park-fail-'));
  const root = mkdtempSync(join(tmpdir(), 'offscreen-park-reg-'));
  const record = {
    ...owner('dev-4', checkout),
    lease: { pid: 40, startTimeJiffies: '100' },
  };
  const sessions = environmentSessionRoot(root);
  writeEnvironmentSession(sessions, sessionFor(record));
  const running = new Set([40, 41]);
  const result = parkSelectedEnvironment({
    owner: record,
    sessionRoot: sessions,
    processDeps: {
      pidAlive: (pid) => running.has(pid),
      readStartTicks: () => '100',
    },
    signal: (pid) => running.delete(pid),
    scaleRole: (_namespace, role) => {
      if (role === 'game-executor') throw new Error('scale executor failed');
    },
    clearReservation: () => {
      throw new Error('reservation cleared');
    },
  });
  assert.equal(result.released, false);
  assert.equal(result.reason, 'scale_incomplete');
  assert.equal(readEnvironmentSession(sessions, 'dev-4').released, false);
  assert.equal(record.lease.pid, 40);
  rmSync(root, { recursive: true, force: true });
  rmSync(checkout, { recursive: true, force: true });
});

test('stale process, foreign lease and foreign consumer do not scale', () => {
  const checkout = mkdtempSync(join(tmpdir(), 'offscreen-park-refuse-'));
  const root = mkdtempSync(join(tmpdir(), 'offscreen-park-reg-'));
  const record = {
    ...owner('dev-2', checkout),
    lease: { pid: 99, startTimeJiffies: '100' },
  };
  const sessions = environmentSessionRoot(root);
  writeEnvironmentSession(sessions, sessionFor(record));
  const scaled = [];
  const stale = parkSelectedEnvironment({
    owner: { ...record, lease: { pid: 40, startTimeJiffies: '100' } },
    sessionRoot: sessions,
    processDeps: { pidAlive: () => true, readStartTicks: () => '404' },
    scaleRole: () => scaled.push('scaled'),
  });
  assert.equal(stale.reason, 'start_time_mismatch');
  const foreign = parkSelectedEnvironment({
    owner: record,
    sessionRoot: sessions,
    processDeps: alive,
    scaleRole: () => scaled.push('scaled'),
  });
  assert.equal(foreign.reason, 'foreign_lease');
  const consumer = parkSelectedEnvironment({
    owner: { ...record, lease: { pid: 40, startTimeJiffies: '100' } },
    sessionRoot: sessions,
    processDeps: alive,
    activeConsumer: 'cursor-b',
    scaleRole: () => scaled.push('scaled'),
  });
  assert.equal(consumer.reason, 'foreign_consumer');
  assert.deepEqual(scaled, []);

  const noopCheckout = mkdtempSync(join(tmpdir(), 'offscreen-park-noop-'));
  const noopRoot = mkdtempSync(join(tmpdir(), 'offscreen-park-reg-'));
  const noopRecord = {
    ...owner('dev-5', noopCheckout),
    lease: { pid: 40, startTimeJiffies: '100' },
  };
  const noopSessions = environmentSessionRoot(noopRoot);
  writeEnvironmentSession(noopSessions, sessionFor(noopRecord));
  const noop = parkSelectedEnvironment({
    owner: noopRecord,
    sessionRoot: noopSessions,
    processDeps: alive,
    signal: () => {},
    scaleRole: () => scaled.push('scaled'),
    clearReservation: () => {
      throw new Error('reservation cleared');
    },
  });
  assert.equal(noop.reason, 'process-stop-incomplete');
  assert.equal(noop.released, false);
  assert.equal(readEnvironmentSession(noopSessions, 'dev-5').parked, false);

  const order = [];
  const ordered = new Set([40, 41]);
  const orderedResult = parkSelectedEnvironment({
    owner: { ...record, lease: { pid: 40, startTimeJiffies: '100' } },
    sessionRoot: sessions,
    processDeps: {
      pidAlive: (pid) => ordered.has(pid),
      readStartTicks: () => '100',
    },
    signal: (pid, sig) => {
      order.push(pid);
      if (sig === 'SIGTERM' && pid === 40) ordered.delete(40);
    },
    scaleRole: () => scaled.push('scaled'),
  });
  assert.deepEqual(order, [40, 41, 41]);
  assert.equal(orderedResult.reason, 'process-stop-incomplete');
  assert.equal(ordered.has(41), true);
  rmSync(noopRoot, { recursive: true, force: true });
  rmSync(noopCheckout, { recursive: true, force: true });
  rmSync(root, { recursive: true, force: true });
  rmSync(checkout, { recursive: true, force: true });
});

test('park kills a tilt process that ignores SIGTERM and then scales six roles', () => {
  const root = mkdtempSync(join(tmpdir(), 'offscreen-park-kill-'));
  const checkout = mkdtempSync(join(tmpdir(), 'offscreen-park-kill-src-'));
  const sessions = environmentSessionRoot(root);
  const record = {
    ...owner('dev-5', checkout),
    lease: { pid: 50, startTimeJiffies: '100' },
  };
  writeEnvironmentSession(sessions, {
    ...sessionFor(record),
    pid: 50,
  });
  const alive = new Set([50]);
  const signals = [];
  const scaled = [];
  const result = parkSelectedEnvironment({
    owner: record,
    sessionRoot: sessions,
    processDeps: {
      pidAlive: (pid) => alive.has(pid),
      readStartTicks: () => '100',
      sleep: () => {},
    },
    signal: (pid, sig) => {
      signals.push(sig);
      if (sig === 'SIGKILL') alive.delete(pid);
    },
    scaleRole: (_namespace, role) => scaled.push(role),
    readDesiredReplicas: () =>
      Object.fromEntries(scaled.map((role) => [role, 0])),
    portOccupied: () => false,
  });
  assert.equal(result.ok, true);
  assert.equal(result.released, true);
  assert.deepEqual(signals, ['SIGTERM', 'SIGKILL']);
  assert.equal(scaled.length, 6);
  rmSync(root, { recursive: true, force: true });
  rmSync(checkout, { recursive: true, force: true });
});

test('park does not SIGKILL a reused PID after the polite wait', () => {
  const root = mkdtempSync(join(tmpdir(), 'offscreen-park-reuse-'));
  const checkout = mkdtempSync(join(tmpdir(), 'offscreen-park-reuse-src-'));
  const sessions = environmentSessionRoot(root);
  const record = {
    ...owner('dev-5', checkout),
    lease: { pid: 50, startTimeJiffies: '100' },
  };
  writeEnvironmentSession(sessions, {
    ...sessionFor(record),
    pid: 50,
    forwardPid: null,
    forwardStartTicks: null,
  });
  let reads = 0;
  const signals = [];
  const scaled = [];
  const result = parkSelectedEnvironment({
    owner: record,
    sessionRoot: sessions,
    processDeps: {
      pidAlive: () => true,
      readStartTicks: () => {
        reads += 1;
        // The polite wait still sees the owned start time. The next read is a reused PID.
        return reads > 43 ? '999' : '100';
      },
      sleep: () => {},
    },
    signal: (_pid, sig) => signals.push(sig),
    scaleRole: (_namespace, role) => scaled.push(role),
    readDesiredReplicas: () =>
      Object.fromEntries(scaled.map((role) => [role, 0])),
    portOccupied: () => false,
  });
  assert.equal(result.ok, true);
  assert.deepEqual(signals, ['SIGTERM']);
  assert.equal(scaled.length, 6);
  rmSync(root, { recursive: true, force: true });
  rmSync(checkout, { recursive: true, force: true });
});

test('park waits through a slow forwarder exit before scaling', () => {
  const root = mkdtempSync(join(tmpdir(), 'offscreen-park-slow-'));
  const checkout = mkdtempSync(join(tmpdir(), 'offscreen-park-slow-src-'));
  const sessions = environmentSessionRoot(root);
  const record = {
    ...owner('dev-5', checkout),
    lease: { pid: 50, startTimeJiffies: '100' },
  };
  writeEnvironmentSession(sessions, {
    ...sessionFor(record),
    pid: 50,
    forwardPid: 51,
  });
  const alive = new Set([50, 51]);
  let polls = 0;
  const scaled = [];
  const result = parkSelectedEnvironment({
    owner: record,
    sessionRoot: sessions,
    processDeps: {
      pidAlive: (pid) => alive.has(pid),
      readStartTicks: () => '100',
      sleep: () => {
        polls += 1;
        if (polls >= 3) alive.delete(51);
      },
    },
    signal: (pid) => {
      if (pid === 50) alive.delete(50);
    },
    scaleRole: (_namespace, role) => scaled.push(role),
    readDesiredReplicas: () =>
      Object.fromEntries(scaled.map((role) => [role, 0])),
    portOccupied: () => false,
  });
  assert.equal(result.ok, true);
  assert.equal(result.released, true);
  assert.equal(alive.has(51), false);
  assert.equal(scaled.length, 6);
  rmSync(root, { recursive: true, force: true });
  rmSync(checkout, { recursive: true, force: true });
});

test('park releases only after both processes exit and a free port, and never signals the other environment', () => {
  const root = mkdtempSync(join(tmpdir(), 'offscreen-park-pair-'));
  const checkoutA = mkdtempSync(join(tmpdir(), 'offscreen-park-a-'));
  const checkoutB = mkdtempSync(join(tmpdir(), 'offscreen-park-b-'));
  const sessions = environmentSessionRoot(root);
  const recordA = {
    ...owner('dev-5', checkoutA),
    lease: { pid: 50, startTimeJiffies: '100' },
  };
  const recordB = {
    ...owner('dev-6', checkoutB),
    lease: { pid: 60, startTimeJiffies: '200' },
  };
  writeEnvironmentSession(sessions, {
    ...sessionFor(recordA),
    pid: 50,
    forwardPid: 51,
  });
  writeEnvironmentSession(sessions, {
    ...sessionFor(recordB),
    pid: 60,
    processStartTicks: '200',
    forwardPid: 61,
    forwardStartTicks: '200',
  });
  const alive = new Set([50, 51, 60, 61]);
  const signalled = [];
  const listening = { current: true };
  const desired = {
    'game-web': 1,
    'game-api': 1,
    'game-authority': 1,
    'game-control': 1,
    'game-executor': 1,
    'game-relay': 1,
  };
  const deps = {
    pidAlive: (pid) => alive.has(pid),
    readStartTicks: (pid) => (pid === 60 || pid === 61 ? '200' : '100'),
  };
  const held = parkSelectedEnvironment({
    owner: recordA,
    sessionRoot: sessions,
    processDeps: deps,
    signal: (pid) => {
      signalled.push(pid);
      alive.delete(pid);
    },
    portOccupied: () => listening.current,
    scaleRole: () => {
      throw new Error('scaled while listening');
    },
  });
  assert.deepEqual(signalled, [50, 51]);
  assert.equal(held.reason, 'conflicting_listener');
  assert.equal(held.released, false);
  listening.current = false;
  const released = parkSelectedEnvironment({
    owner: recordA,
    sessionRoot: sessions,
    processDeps: deps,
    signal: (pid) => signalled.push(pid),
    portOccupied: () => false,
    scaleRole: (_namespace, role) => {
      desired[role] = 0;
    },
    readDesiredReplicas: () => desired,
    clearReservation: () => {
      recordA.lease = null;
    },
  });
  assert.equal(released.reason, 'parked');
  assert.deepEqual(signalled, [50, 51]);
  assert.equal(alive.has(60) && alive.has(61), true);
  rmSync(root, { recursive: true, force: true });
  rmSync(checkoutA, { recursive: true, force: true });
  rmSync(checkoutB, { recursive: true, force: true });
});

test('atomic session write replaces an existing slot file with mode 0600', () => {
  const root = mkdtempSync(join(tmpdir(), 'offscreen-atomic-'));
  const sessions = environmentSessionRoot(root);
  const record = owner('dev-1', '/canonical/a');
  const first = { ...sessionFor(record), pid: 10, marker: 'first' };
  writeEnvironmentSession(sessions, first);
  assert.equal(readEnvironmentSession(sessions, 'dev-1').marker, 'first');
  assert.equal(
    devSessionJsonFileMode(environmentSessionPath(sessions, 'dev-1')),
    DEV_SESSION_JSON_FILE_MODE,
  );
  writeEnvironmentSession(sessions, { ...first, pid: 11, marker: 'second' });
  const updated = readEnvironmentSession(sessions, 'dev-1');
  assert.equal(updated.pid, 11);
  assert.equal(updated.marker, 'second');
  assert.equal(
    readFileSync(environmentSessionPath(sessions, 'dev-1'), 'utf8'),
    `${JSON.stringify(updated)}\n`,
  );
  const temps = readdirSync(sessions).filter((name) => name.includes('.tmp'));
  assert.deepEqual(temps, []);
  rmSync(root, { recursive: true, force: true });
});

test('injected session write or rename failure keeps the prior valid file', () => {
  const root = mkdtempSync(join(tmpdir(), 'offscreen-atomic-fail-'));
  const file = join(root, 'dev-2.json');
  const prior = { slotId: 'dev-2', pid: 20, namespace: 'offscreen-dev-2' };
  writeDevSessionJsonAtomically(file, prior);
  const before = readFileSync(file, 'utf8');
  assert.throws(
    () =>
      writeDevSessionJsonAtomically(
        file,
        { slotId: 'dev-2', pid: 99 },
        {
          writePayload: () => {
            throw new Error('injected write failure');
          },
        },
      ),
    /injected write failure/,
  );
  assert.equal(readFileSync(file, 'utf8'), before);
  assert.deepEqual(
    readdirSync(root).filter((name) => name.includes('.tmp')),
    [],
  );
  assert.throws(
    () =>
      writeDevSessionJsonAtomically(
        file,
        { slotId: 'dev-2', pid: 99 },
        {
          finalize: () => {
            throw new Error('injected rename failure');
          },
        },
      ),
    /injected rename failure/,
  );
  assert.equal(readFileSync(file, 'utf8'), before);
  rmSync(root, { recursive: true, force: true });
});

test('concurrent readers see only complete session JSON during atomic replace', () => {
  const root = mkdtempSync(join(tmpdir(), 'offscreen-atomic-read-'));
  const sessions = environmentSessionRoot(root);
  const record = owner('dev-3', '/canonical/c');
  writeEnvironmentSession(sessions, { ...sessionFor(record), pid: 30 });
  const dest = environmentSessionPath(sessions, 'dev-3');
  let readsDuringReplace = 0;
  let corruptReads = 0;
  writeDevSessionJsonAtomically(
    dest,
    { ...sessionFor(record), pid: 31 },
    {
      finalize: (temp, target) => {
        for (let attempt = 0; attempt < 200; attempt += 1) {
          if (!existsSync(target)) continue;
          try {
            const parsed = JSON.parse(readFileSync(target, 'utf8'));
            if (
              parsed.slotId !== 'dev-3' ||
              (parsed.pid !== 30 && parsed.pid !== 31)
            ) {
              corruptReads += 1;
            }
            readsDuringReplace += 1;
          } catch {
            corruptReads += 1;
          }
        }
        renameSync(temp, target);
        chmodSync(target, DEV_SESSION_JSON_FILE_MODE);
      },
    },
  );
  assert.ok(readsDuringReplace > 0);
  assert.equal(corruptReads, 0);
  assert.equal(readEnvironmentSession(sessions, 'dev-3').pid, 31);
  rmSync(root, { recursive: true, force: true });
});
