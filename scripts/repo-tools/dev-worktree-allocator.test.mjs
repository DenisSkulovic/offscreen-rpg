import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  allocateDevWorktreeOwner,
  attachDevWorktreeProcess,
  getProcessIdentitySupport,
  isAllocatorRefusal,
  listDevWorktreeOwners,
  planPortBundleForSlotIndex,
  portBundleValues,
  portBundlesDisjoint,
  reconcileStaleDevWorktreeProcess,
  reconcileStaleWithoutLiveProcess,
  assertOwnerMatchesWorktree,
  ensurePortsStillOwned,
  DEV_CLUSTER_NAME,
  DEFAULT_PORT_RANGE,
} from './dev-worktree-allocator.mjs';
import { encodeDnsSafeSlotId, withRegistryLock } from './dev-worktree-registry.mjs';

const IDENTITY_COUNTS = [1, 4, 5, 10, 100];

/**
 * @param {() => void} fn
 */
function withTempRegistry(fn) {
  const root = mkdtempSync(join(tmpdir(), 'offscreen-dev-registry-'));
  try {
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/**
 * @param {string} registryRoot
 * @param {number} n
 * @param {import('./dev-worktree-allocator.mjs').DevWorktreeAllocatorDeps} [deps]
 */
function allocateSyntheticWorktrees(registryRoot, n, deps = {}) {
  /** @type {ReturnType<typeof allocateDevWorktreeOwner>[]} */
  const owners = [];
  for (let i = 0; i < n; i += 1) {
    owners.push(allocateDevWorktreeOwner(`/tmp/synthetic-worktree-${i}`, registryRoot, deps));
  }
  return owners;
}

test('encodeDnsSafeSlotId accepts unbounded sequences used in acceptance counts', () => {
  for (const n of IDENTITY_COUNTS) {
    const id = encodeDnsSafeSlotId(n);
    assert.match(id, /^dev-\d+$/);
  }
  assert.equal(encodeDnsSafeSlotId(100), 'dev-100');
});

for (const count of IDENTITY_COUNTS) {
  test(`allocate ${count} synthetic identities without config changes`, () => {
    withTempRegistry((registryRoot) => {
      const deps = {
        canonicalizePath: (p) => p,
        isPortAvailable: () => true,
        readProcessIdentity: (pid) => ({ startTimeJiffies: pid * 10 }),
      };
      const owners = allocateSyntheticWorktrees(registryRoot, count, deps);
      assert.equal(owners.length, count);
      assert.equal(new Set(owners.map((o) => o.slotId)).size, count);
      assert.equal(new Set(owners.map((o) => o.worktreePath)).size, count);
      for (let i = 0; i < owners.length; i += 1) {
        for (let j = i + 1; j < owners.length; j += 1) {
          assert.ok(
            portBundlesDisjoint(owners[i].ports, owners[j].ports),
            `ports must not be shared between worktree ${i} and ${j}`,
          );
        }
      }
      for (const owner of owners) {
        assert.equal(owner.cluster, DEV_CLUSTER_NAME);
        assert.equal(owner.namespace, `offscreen-${owner.slotId}`);
      }
    });
  });
}

test('same worktree reattaches the same ports and slot', () => {
  withTempRegistry((registryRoot) => {
    const deps = {
      canonicalizePath: (p) => p,
      isPortAvailable: () => true,
      readProcessIdentity: () => ({ startTimeJiffies: 1 }),
    };
    const path = '/tmp/worktree-alpha';
    const first = allocateDevWorktreeOwner(path, registryRoot, deps);
    const second = allocateDevWorktreeOwner(path, registryRoot, deps);
    assert.deepEqual(second.ports, first.ports);
    assert.equal(second.slotId, first.slotId);
    assert.equal(listDevWorktreeOwners(registryRoot).length, 1);
  });
});

test('dynamic port bundle planning is not a fixed four-slot table', () => {
  const fifth = planPortBundleForSlotIndex(4, DEFAULT_PORT_RANGE);
  const tenth = planPortBundleForSlotIndex(9, DEFAULT_PORT_RANGE);
  assert.ok(fifth);
  assert.ok(tenth);
  assert.ok(portBundlesDisjoint(fifth, tenth));
  assert.ok(fifth.tilt < tenth.game);
});

test('concurrent allocation race: lock holder times out second caller without mutation', () => {
  withTempRegistry((registryRoot) => {
    let entered = false;
    assert.throws(
      () => {
        withRegistryLock(
          {
            registryRoot,
            lockTimeoutMs: 80,
            sleepMs: (ms) => {
              const end = Date.now() + ms;
              while (Date.now() < end) {
                // spin
              }
            },
          },
          () => {
            entered = true;
            withRegistryLock({ registryRoot, lockTimeoutMs: 50 }, () => {
              throw new Error('should not enter nested lock');
            });
          },
        );
      },
      (error) => isAllocatorRefusal(error) && error.id === 'registry-lock-timeout',
    );
    assert.equal(entered, true);
  });
});

test('foreign listener refuses reattach without killing', () => {
  withTempRegistry((registryRoot) => {
    const owner = allocateDevWorktreeOwner('/tmp/foreign-listener', registryRoot, {
      canonicalizePath: (p) => p,
      isPortAvailable: () => true,
      readProcessIdentity: () => ({ startTimeJiffies: 1 }),
    });
    assert.throws(
      () => {
        allocateDevWorktreeOwner('/tmp/foreign-listener', registryRoot, {
          canonicalizePath: (p) => p,
          isPortAvailable: (port) => port !== owner.ports.tilt,
          readProcessIdentity: () => ({ startTimeJiffies: 1 }),
        });
      },
      (error) => isAllocatorRefusal(error) && error.id === 'foreign-listener',
    );
  });
});

test('stale PID reused by another owner refuses reclaim', () => {
  const owner = {
    slotId: 'dev-1',
    worktreePath: '/tmp/stale-pid',
    cluster: DEV_CLUSTER_NAME,
    namespace: 'offscreen-dev-1',
    ports: { game: 13100, control: 13100, tilt: 13101, spare: 13102 },
    processIdentity: { pid: 4242, startTimeJiffies: 111 },
    resourceUids: { deployment: 'uid-a' },
    lease: { pid: 4242, startTimeJiffies: 111, acquiredAt: '2026-01-01T00:00:00.000Z' },
  };
  assert.throws(
    () => {
      reconcileStaleDevWorktreeProcess(
        { owner, pid: 4242 },
        { readProcessIdentity: () => ({ startTimeJiffies: 999 }) },
      );
    },
    (error) => isAllocatorRefusal(error) && error.id === 'stale-pid-reused',
  );
});

test('exhausted port range refuses new worktree', () => {
  withTempRegistry((registryRoot) => {
    const tinyRange = { start: 20_000, end: 20_003 };
    const deps = {
      canonicalizePath: (p) => p,
      isPortAvailable: () => true,
      readProcessIdentity: () => ({ startTimeJiffies: 1 }),
      portRange: tinyRange,
      bundleSize: 4,
    };
    allocateDevWorktreeOwner('/tmp/only-one-bundle', registryRoot, deps);
    assert.throws(
      () => allocateDevWorktreeOwner('/tmp/no-room', registryRoot, deps),
      (error) => isAllocatorRefusal(error) && error.id === 'exhausted-port-range',
    );
  });
});

test('wrong worktree refuses owner mismatch', () => {
  const owner = {
    slotId: 'dev-3',
    worktreePath: '/canonical/a',
    cluster: DEV_CLUSTER_NAME,
    namespace: 'offscreen-dev-3',
    ports: { game: 13100, control: 13100, tilt: 13101, spare: 13102 },
    processIdentity: null,
    resourceUids: {},
    lease: null,
  };
  assert.throws(
    () => assertOwnerMatchesWorktree(owner, '/canonical/b'),
    (error) => isAllocatorRefusal(error) && error.id === 'wrong-worktree',
  );
});

test('resource UID mismatch refuses stale reconciliation', () => {
  const owner = {
    slotId: 'dev-2',
    worktreePath: '/tmp/reconcile',
    cluster: DEV_CLUSTER_NAME,
    namespace: 'offscreen-dev-2',
    ports: { game: 13104, control: 13104, tilt: 13105, spare: 13106 },
    processIdentity: { pid: 77, startTimeJiffies: 5 },
    resourceUids: { 'tilt-session': 'abc' },
    lease: { pid: 77, startTimeJiffies: 5, acquiredAt: '2026-01-01T00:00:00.000Z' },
  };
  assert.throws(
    () => {
      reconcileStaleWithoutLiveProcess({
        owner,
        resourceUids: { 'tilt-session': 'different' },
      });
    },
    (error) => isAllocatorRefusal(error) && error.id === 'resource-uid-mismatch',
  );
});

test('stale dead process reconciles when resource UID and owner labels match', () => {
  const owner = {
    slotId: 'dev-2',
    worktreePath: '/tmp/reconcile',
    cluster: DEV_CLUSTER_NAME,
    namespace: 'offscreen-dev-2',
    ports: { game: 13104, control: 13104, tilt: 13105, spare: 13106 },
    processIdentity: { pid: 77, startTimeJiffies: 5 },
    resourceUids: { 'tilt-session': 'abc' },
    lease: { pid: 77, startTimeJiffies: 5, acquiredAt: '2026-01-01T00:00:00.000Z' },
  };
  const reconciled = reconcileStaleWithoutLiveProcess({
    owner,
    resourceUids: { 'tilt-session': 'abc' },
    ownerLabels: { 'offscreen.dev/owner': 'dev-2' },
    expectedOwnerLabel: 'dev-2',
  });
  assert.equal(reconciled.lease, null);
  assert.equal(reconciled.processIdentity, null);
});

test('attach stores validated process identity without kubernetes calls', () => {
  const owner = {
    slotId: 'dev-9',
    worktreePath: '/tmp/attach',
    cluster: DEV_CLUSTER_NAME,
    namespace: 'offscreen-dev-9',
    ports: { game: 13120, control: 13120, tilt: 13121, spare: 13122 },
    processIdentity: null,
    resourceUids: {},
    lease: null,
  };
  attachDevWorktreeProcess(
    {
      owner,
      pid: 9001,
      resourceUids: { ns: 'uid-1' },
      ownerLabels: { 'offscreen.dev/owner': 'dev-9' },
      expectedOwnerLabel: 'dev-9',
    },
    { readProcessIdentity: () => ({ startTimeJiffies: 42 }) },
  );
  assert.equal(owner.lease?.pid, 9001);
  assert.equal(owner.processIdentity?.startTimeJiffies, 42);
  assert.deepEqual(portBundleValues(owner.ports).sort(), [13120, 13120, 13121, 13122].sort());
});

test('ensurePortsStillOwned treats live lease listeners as owned', () => {
  const owner = {
    slotId: 'dev-4',
    worktreePath: '/tmp/owned',
    cluster: DEV_CLUSTER_NAME,
    namespace: 'offscreen-dev-4',
    ports: { game: 13108, control: 13108, tilt: 13109, spare: 13110 },
    processIdentity: { pid: 5, startTimeJiffies: 8 },
    resourceUids: {},
    lease: { pid: 5, startTimeJiffies: 8, acquiredAt: '2026-01-01T00:00:00.000Z' },
  };
  assert.doesNotThrow(() => {
    ensurePortsStillOwned(
      owner,
      (port) => port !== owner.ports.tilt,
      () => ({ startTimeJiffies: 8 }),
    );
  });
});

test('process identity support is reported for platform stop semantics', () => {
  const support = getProcessIdentitySupport();
  assert.ok(typeof support.api === 'string');
  assert.ok(typeof support.supported === 'boolean');
  if (process.platform === 'linux') {
    assert.equal(support.supported, true);
    assert.match(support.api, /\/proc/);
  }
});