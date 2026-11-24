import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  allocateDevWorktreeOwner,
  allocateIndependentEnvironment,
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
} from '../src/domain/dev-worktree-allocator.mjs';
import {
  encodeDnsSafeSlotId,
  flockLockFilePath,
  lockFilePath,
  migrateRegistryV1ToV2,
  readRegistryV2,
  registryFilePath,
  REGISTRY_VERSION,
  REGISTRY_VERSION_V2,
  withRegistryLock,
  writeRegistry,
} from '../src/domain/dev-worktree-registry.mjs';

const registryModulePath = fileURLToPath(
  new URL('../src/domain/dev-worktree-registry.mjs', import.meta.url),
);

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
 * @param {import('../src/domain/dev-worktree-allocator.mjs').DevWorktreeAllocatorDeps} [deps]
 */
function allocateSyntheticWorktrees(registryRoot, n, deps = {}) {
  /** @type {ReturnType<typeof allocateDevWorktreeOwner>[]} */
  const owners = [];
  for (let i = 0; i < n; i += 1) {
    owners.push(
      allocateDevWorktreeOwner(
        `/tmp/synthetic-worktree-${i}`,
        registryRoot,
        deps,
      ),
    );
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
  assert.deepEqual(portBundleValues(fifth), [
    fifth.game,
    fifth.game + 1,
    fifth.game + 2,
    fifth.game + 3,
  ]);
  assert.equal(new Set(portBundleValues(fifth)).size, 4);
  assert.ok(portBundlesDisjoint(fifth, tenth));
  assert.ok(fifth.tilt < tenth.game);
});

test('a range that cannot hold four distinct ports refuses a new bundle', () => {
  assert.equal(
    planPortBundleForSlotIndex(0, { start: 20000, end: 20002 }, 4),
    null,
  );
  assert.equal(
    planPortBundleForSlotIndex(0, { start: 20000, end: 20003 }, 3),
    null,
  );
  withTempRegistry((registryRoot) => {
    assert.throws(
      () =>
        allocateDevWorktreeOwner('/tmp/too-small', registryRoot, {
          canonicalizePath: (p) => p,
          isPortAvailable: () => true,
          portRange: { start: 20000, end: 20002 },
        }),
      (error) =>
        isAllocatorRefusal(error) && error.id === 'exhausted-port-range',
    );
  });
});

test('concurrent allocation race: lock holder times out second caller without mutation', () => {
  withTempRegistry((registryRoot) => {
    let entered = false;
    assert.throws(
      () => {
        withRegistryLock({ registryRoot, lockTimeoutMs: 5_000 }, () => {
          entered = true;
          withRegistryLock({ registryRoot, lockTimeoutMs: 200 }, () => {
            throw new Error('should not enter nested lock');
          });
        });
      },
      (error) =>
        isAllocatorRefusal(error) && error.id === 'registry-lock-timeout',
    );
    assert.equal(entered, true);
  });
});

test('legacy owners.lock refuses kernel flock without deleting the legacy file', () => {
  withTempRegistry((registryRoot) => {
    writeFileSync(lockFilePath(registryRoot), '{"pid":1,"at":0}\n', 'utf8');
    assert.throws(
      () => withRegistryLock({ registryRoot }, () => {}),
      (error) =>
        isAllocatorRefusal(error) && error.id === 'legacy-registry-lock',
    );
    assert.ok(
      readFileSync(lockFilePath(registryRoot), 'utf8').includes('"pid":1'),
    );
    assert.throws(
      () =>
        allocateDevWorktreeOwner('/tmp/legacy-lock', registryRoot, {
          canonicalizePath: (p) => p,
          isPortAvailable: () => true,
        }),
      (error) =>
        isAllocatorRefusal(error) && error.id === 'legacy-registry-lock',
    );
  });
});

test(
  'subprocess flock holder blocks then releases the registry lock',
  { timeout: 30_000 },
  async () => {
    await new Promise((resolve, reject) => {
      withTempRegistry((registryRoot) => {
        const heldSentinel = join(registryRoot, '.flock-holder-ready');
        /** @type {string[]} */
        const holderStderr = [];
        const holder = spawn(
          process.execPath,
          [
            '--input-type=module',
            '-e',
            `
        import { spawnSync } from 'node:child_process';
        import { writeFileSync } from 'node:fs';
        import { withRegistryLock } from ${JSON.stringify(registryModulePath)};
        withRegistryLock({ registryRoot: ${JSON.stringify(registryRoot)}, lockTimeoutMs: 30_000 }, () => {
          writeFileSync(${JSON.stringify(heldSentinel)}, 'held\\n', 'utf8');
          spawnSync('sleep', ['3'], { stdio: 'ignore' });
        });
        `,
          ],
          { stdio: ['ignore', 'pipe', 'pipe'] },
        );
        holder.stderr?.on('data', (chunk) =>
          holderStderr.push(chunk.toString()),
        );
        holder.on('error', reject);

        const waitHeldUntil = Date.now() + 10_000;
        const waitForSentinel = () => {
          if (existsSync(heldSentinel)) {
            assert.equal(
              holder.exitCode,
              null,
              'holder should still be running while the lock is contested',
            );
            let contested = false;
            assert.throws(
              () =>
                withRegistryLock({ registryRoot, lockTimeoutMs: 500 }, () => {
                  contested = true;
                }),
              (error) =>
                isAllocatorRefusal(error) &&
                error.id === 'registry-lock-timeout',
            );
            assert.equal(contested, false);
            holder.once('close', (code) => {
              try {
                assert.equal(code, 0, holderStderr.join(''));
                let acquired = false;
                withRegistryLock({ registryRoot, lockTimeoutMs: 5_000 }, () => {
                  acquired = true;
                });
                assert.equal(acquired, true);
                assert.ok(existsSync(flockLockFilePath(registryRoot)));
                resolve();
              } catch (error) {
                reject(error);
              }
            });
            return;
          }
          if (holder.exitCode !== null || Date.now() >= waitHeldUntil) {
            reject(
              new assert.AssertionError({
                message: 'holder process should acquire the registry lock',
                operator: 'ok',
                actual: false,
              }),
            );
            return;
          }
          setTimeout(waitForSentinel, 10);
        };
        waitForSentinel();
      });
    });
  },
);

test('foreign listener refuses reattach without killing', () => {
  withTempRegistry((registryRoot) => {
    const owner = allocateDevWorktreeOwner(
      '/tmp/foreign-listener',
      registryRoot,
      {
        canonicalizePath: (p) => p,
        isPortAvailable: () => true,
        readProcessIdentity: () => ({ startTimeJiffies: 1 }),
      },
    );
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
    lease: {
      pid: 4242,
      startTimeJiffies: 111,
      acquiredAt: '2026-01-01T00:00:00.000Z',
    },
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
      (error) =>
        isAllocatorRefusal(error) && error.id === 'exhausted-port-range',
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
    lease: {
      pid: 77,
      startTimeJiffies: 5,
      acquiredAt: '2026-01-01T00:00:00.000Z',
    },
  };
  assert.throws(
    () => {
      reconcileStaleWithoutLiveProcess({
        owner,
        resourceUids: { 'tilt-session': 'different' },
      });
    },
    (error) =>
      isAllocatorRefusal(error) && error.id === 'resource-uid-mismatch',
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
    lease: {
      pid: 77,
      startTimeJiffies: 5,
      acquiredAt: '2026-01-01T00:00:00.000Z',
    },
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
  assert.deepEqual(
    portBundleValues(owner.ports).sort(),
    [13120, 13120, 13121, 13122].sort(),
  );
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
    lease: {
      pid: 5,
      startTimeJiffies: 8,
      acquiredAt: '2026-01-01T00:00:00.000Z',
    },
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

test('historical three-port records migrate unchanged and new bundles avoid them', () => {
  withTempRegistry((registryRoot) => {
    const historical = {
      game: 13100,
      control: 13100,
      tilt: 13101,
      spare: 13102,
    };
    writeRegistry(registryRoot, {
      version: REGISTRY_VERSION,
      nextSequence: 2,
      ownersByWorktree: {
        '/tmp/legacy': {
          slotId: 'dev-1',
          worktreePath: '/tmp/legacy',
          cluster: DEV_CLUSTER_NAME,
          namespace: 'offscreen-dev-1',
          ports: historical,
          processIdentity: null,
          resourceUids: {},
          lease: null,
        },
      },
    });
    const migrated = migrateRegistryV1ToV2(registryRoot, {
      authorizeCutover: true,
      liveRoot: '/not-live',
    });
    assert.deepEqual(migrated.environmentsById['dev-1'].ports, historical);
    const created = allocateIndependentEnvironment('/tmp/fresh', registryRoot, {
      canonicalizePath: (path) => path,
      isPortAvailable: () => true,
    });
    const reserved = new Set([13100, 13101, 13102]);
    for (const port of portBundleValues(created.ports)) {
      assert.equal(reserved.has(port), false);
    }
    assert.equal(new Set(portBundleValues(created.ports)).size, 4);
    assert.deepEqual(
      readRegistryV2(registryRoot).environmentsById['dev-1'].ports,
      historical,
    );
  });
});

test('an invalid cluster writes nothing on either allocation path', () => {
  const deps = {
    canonicalizePath: (path) => path,
    isPortAvailable: () => true,
    cluster: 'kind-offscreen-lab',
  };
  withTempRegistry((registryRoot) => {
    writeRegistry(registryRoot, {
      version: REGISTRY_VERSION,
      nextSequence: 4,
      ownersByWorktree: {},
    });
    const before = readFileSync(registryFilePath(registryRoot));
    assert.throws(
      () => allocateDevWorktreeOwner('/tmp/lab-v1', registryRoot, deps),
      (error) => isAllocatorRefusal(error) && error.id === 'invalid-cluster',
    );
    assert.deepEqual(readFileSync(registryFilePath(registryRoot)), before);
  });
  withTempRegistry((registryRoot) => {
    writeRegistry(registryRoot, {
      version: REGISTRY_VERSION_V2,
      nextSequence: 7,
      environmentsById: {},
      defaultEnvironmentByCheckout: {},
    });
    const before = readFileSync(registryFilePath(registryRoot));
    assert.throws(
      () => allocateIndependentEnvironment('/tmp/lab-v2', registryRoot, deps),
      (error) => isAllocatorRefusal(error) && error.id === 'invalid-cluster',
    );
    assert.deepEqual(readFileSync(registryFilePath(registryRoot)), before);
    assert.equal(readRegistryV2(registryRoot).nextSequence, 7);
  });
});
