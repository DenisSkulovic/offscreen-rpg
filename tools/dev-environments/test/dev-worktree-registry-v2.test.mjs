import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  allocateIndependentEnvironment,
  attachUnattachedEnvironment,
  getDefaultEnvironment,
  getEnvironment,
  listIndependentEnvironments,
  reserveUnattachedEnvironment,
  portBundlesDisjoint,
} from '../src/domain/dev-worktree-allocator.mjs';
import { environmentSessionRoot, readEnvironmentSession, writeEnvironmentSession } from '../src/domain/dev-environment-session.mjs';
import {
  convertRegistryV1ToV2,
  isAllocatorRefusal,
  migrateRegistryV1ToV2,
  readExistingRegistryV2,
  readRegistryV2,
  registryFilePath,
  REGISTRY_V1_BACKUP,
  validateRegistryV2,
  writeRegistry,
} from '../src/domain/dev-worktree-registry.mjs';

const deps = {
  canonicalizePath: (/** @type {string} */ path) => path,
  isPortAvailable: () => true,
  readProcessIdentity: () => ({ startTimeJiffies: 1 }),
};

/**
 * @param {(root: string) => void} fn
 */
function withTemp(fn) {
  const root = mkdtempSync(join(tmpdir(), 'offscreen-registry-v2-'));
  try {
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function fourSlotV1() {
  /** @type {Record<string, object>} */
  const ownersByWorktree = {};
  for (let i = 1; i <= 4; i += 1) {
    const path = `/canonical/checkout-${i}`;
    ownersByWorktree[path] = {
      slotId: `dev-${i}`,
      worktreePath: path,
      cluster: 'kind-offscreen-dev',
      namespace: `offscreen-dev-${i}`,
      ports: { game: 13100 + i * 4, control: 13100 + i * 4, tilt: 13101 + i * 4, spare: 13102 + i * 4 },
      processIdentity: { pid: 1000 + i, startTimeJiffies: 50 + i },
      resourceUids: { namespace: `uid-${i}` },
      lease: { pid: 1000 + i, startTimeJiffies: 50 + i, acquiredAt: `2026-11-23T00:00:0${i}.000Z` },
    };
  }
  return { version: 1, nextSequence: 5, ownersByWorktree };
}

test('four-slot v1 migrates losslessly and keeps leases', () => {
  const v1 = fourSlotV1();
  const v2 = convertRegistryV1ToV2(v1);
  assert.equal(v2.version, 2);
  assert.equal(v2.nextSequence, 5);
  assert.equal(Object.keys(v2.environmentsById).length, 4);
  for (let i = 1; i <= 4; i += 1) {
    const before = v1.ownersByWorktree[`/canonical/checkout-${i}`];
    const after = v2.environmentsById[`dev-${i}`];
    assert.equal(v2.defaultEnvironmentByCheckout[`/canonical/checkout-${i}`], `dev-${i}`);
    assert.deepEqual(after.lease, before.lease);
    assert.deepEqual(after.resourceUids, before.resourceUids);
    assert.deepEqual(after.ports, before.ports);
    assert.deepEqual(after.processIdentity, before.processIdentity);
  }
});

test('two environments share a checkout and the default stays stable', () => {
  withTemp((root) => {
    const shared = {
      ...fourSlotV1().ownersByWorktree['/canonical/checkout-1'],
      worktreePath: '/canonical/shared',
    };
    writeRegistry(root, convertRegistryV1ToV2({
      version: 1,
      nextSequence: 2,
      ownersByWorktree: { '/canonical/shared': shared },
    }));
    const extra = allocateIndependentEnvironment('/canonical/shared', root, deps);
    assert.equal(extra.slotId, 'dev-2');
    assert.notEqual(extra.ports.game, 13104);
    assert.equal(getDefaultEnvironment(root, '/canonical/shared', deps)?.slotId, 'dev-1');
    assert.equal(listIndependentEnvironments(root).length, 2);
    assert.equal(getEnvironment(root, 'dev-2').worktreePath, '/canonical/shared');
  });
});

test('explicit migration writes v2 and keeps a v1 backup', () => {
  withTemp((root) => {
    const v1 = fourSlotV1();
    writeRegistry(root, v1);
    const live = migrateRegistryV1ToV2(root, { authorizeCutover: true, liveRoot: '/not-the-live-root' });
    assert.equal(live.version, 2);
    const backup = JSON.parse(readFileSync(join(root, REGISTRY_V1_BACKUP), 'utf8'));
    assert.equal(backup.version, 1);
    assert.equal(backup.nextSequence, 5);
    assert.equal(readRegistryV2(root).environmentsById['dev-1'].resourceUids.namespace, 'uid-1');
  });
});

test('unauthorized and live migration leave the fixture unchanged', () => {
  withTemp((root) => {
    writeRegistry(root, fourSlotV1());
    const before = readFileSync(registryFilePath(root), 'utf8');
    assert.throws(() => migrateRegistryV1ToV2(root, { liveRoot: '/not-live' }), (error) => {
      assert.equal(isAllocatorRefusal(error) && error.id, 'migration-unauthorized');
      return true;
    });
    assert.throws(() => migrateRegistryV1ToV2(root, { authorizeCutover: true, liveRoot: root }), (error) => {
      assert.equal(isAllocatorRefusal(error) && error.id, 'live-migration-refused');
      return true;
    });
    assert.equal(readFileSync(registryFilePath(root), 'utf8'), before);
  });
});

test('backup and write failures preserve the original registry', () => {
  withTemp((root) => {
    writeRegistry(root, fourSlotV1());
    const before = readFileSync(registryFilePath(root), 'utf8');
    assert.throws(() => migrateRegistryV1ToV2(root, {
      authorizeCutover: true,
      liveRoot: '/not-live',
      copyFile: () => { throw new Error('disk full'); },
    }));
    assert.equal(readFileSync(registryFilePath(root), 'utf8'), before);
    assert.throws(() => migrateRegistryV1ToV2(root, {
      authorizeCutover: true,
      liveRoot: '/not-live',
      writeSnapshot: () => { throw new Error('rename failed'); },
    }));
    assert.equal(readFileSync(registryFilePath(root), 'utf8'), before);
  });
});

test('malformed v1 snapshots are refused without a converted default', () => {
  const base = fourSlotV1();
  const cases = [
    { ...base, version: 3 },
    { version: 1, nextSequence: 5, ownersByWorktree: { '/canonical/checkout-1': { ...base.ownersByWorktree['/canonical/checkout-1'], slotId: 'dev-1' }, '/other': { ...base.ownersByWorktree['/canonical/checkout-2'], slotId: 'dev-1', worktreePath: '/other' } } },
    { version: 1, nextSequence: 3, ownersByWorktree: { '/canonical/checkout-1': { ...base.ownersByWorktree['/canonical/checkout-1'], ports: base.ownersByWorktree['/canonical/checkout-2'].ports }, '/canonical/checkout-2': base.ownersByWorktree['/canonical/checkout-2'] } },
    { version: 1, nextSequence: 2, ownersByWorktree: { '/canonical/checkout-1': { ...base.ownersByWorktree['/canonical/checkout-1'], namespace: 'foreign' } } },
    { version: 1, nextSequence: 2, ownersByWorktree: { '/canonical/checkout-1': { ...base.ownersByWorktree['/canonical/checkout-1'], cluster: 'kind-offscreen-release' } } },
    { version: 1, nextSequence: 2, ownersByWorktree: { '/not-the-record': base.ownersByWorktree['/canonical/checkout-1'] } },
  ];
  for (const raw of cases) {
    assert.throws(() => convertRegistryV1ToV2(/** @type {never} */ (raw)));
  }
  withTemp((root) => {
    writeFileSync(registryFilePath(root), '{', 'utf8');
    assert.throws(() => migrateRegistryV1ToV2(root, { authorizeCutover: true, liveRoot: '/not-live' }), (error) => {
      assert.equal(isAllocatorRefusal(error) && error.id, 'registry-corrupt');
      return true;
    });
    assert.equal(readFileSync(registryFilePath(root), 'utf8'), '{');
  });
});

test('unknown environment ids are refused', () => {
  withTemp((root) => {
    writeRegistry(root, convertRegistryV1ToV2(fourSlotV1()));
    assert.throws(() => getEnvironment(root, 'dev-9'), (error) => {
      assert.equal(isAllocatorRefusal(error) && error.id, 'unknown-environment');
      return true;
    });
  });
});

test('two reservations receive unique ids, ports, and no default mapping', () => {
  withTemp((root) => {
    writeRegistry(root, convertRegistryV1ToV2(fourSlotV1()));
    validateRegistryV2(readRegistryV2(root));
    const first = reserveUnattachedEnvironment(root, deps);
    const second = reserveUnattachedEnvironment(root, deps);
    assert.equal(first.worktreePath, null);
    assert.equal(second.worktreePath, null);
    assert.equal(first.lease, null);
    assert.deepEqual(second.resourceUids, {});
    assert.notEqual(first.slotId, second.slotId);
    assert.ok(portBundlesDisjoint(first.ports, second.ports));
    const snapshot = readRegistryV2(root);
    assert.equal(Object.keys(snapshot.defaultEnvironmentByCheckout).length, 4);
    assert.equal(snapshot.environmentsById[first.slotId].worktreePath, null);
    validateRegistryV2(snapshot);
  });
});

test('attached v2 records stay valid alongside neutral reservations', () => {
  withTemp((root) => {
    const attached = convertRegistryV1ToV2(fourSlotV1());
    writeRegistry(root, attached);
    reserveUnattachedEnvironment(root, deps);
    const snapshot = readRegistryV2(root);
    for (let i = 1; i <= 4; i += 1) {
      const record = snapshot.environmentsById[`dev-${i}`];
      assert.equal(record.worktreePath, `/canonical/checkout-${i}`);
      assert.equal(snapshot.defaultEnvironmentByCheckout[`/canonical/checkout-${i}`], `dev-${i}`);
    }
    validateRegistryV2(snapshot);
  });
});

test('malformed unattached reservations are refused', () => {
  const base = {
    slotId: 'dev-9',
    worktreePath: null,
    cluster: 'kind-offscreen-dev',
    namespace: 'offscreen-dev-9',
    ports: { game: 19000, control: 19000, tilt: 19001, spare: 19002 },
    processIdentity: null,
    resourceUids: {},
    lease: null,
  };
  const cases = [
    {
      version: 2,
      nextSequence: 10,
      environmentsById: { 'dev-9': { ...base, lease: { pid: 1, startTimeJiffies: 2, acquiredAt: '2026-11-23T00:00:00.000Z' } } },
      defaultEnvironmentByCheckout: {},
    },
    {
      version: 2,
      nextSequence: 10,
      environmentsById: { 'dev-9': { ...base, resourceUids: { ns: 'x' } } },
      defaultEnvironmentByCheckout: {},
    },
    {
      version: 2,
      nextSequence: 10,
      environmentsById: { 'dev-9': { ...base, processIdentity: { pid: 1, startTimeJiffies: 2 } } },
      defaultEnvironmentByCheckout: {},
    },
    {
      version: 2,
      nextSequence: 10,
      environmentsById: { 'dev-9': base },
      defaultEnvironmentByCheckout: { '/canonical/unbound': 'dev-9' },
    },
    {
      version: 2,
      nextSequence: 3,
      environmentsById: { 'dev-5': base },
      defaultEnvironmentByCheckout: {},
    },
  ];
  for (const raw of cases) {
    assert.throws(() => validateRegistryV2(raw), (error) => isAllocatorRefusal(error));
  }
});

test('reservation refuses missing registry, corrupt counter, exhaustion, and writes nothing on failure', () => {
  withTemp((root) => {
    assert.throws(() => reserveUnattachedEnvironment(root, deps), (error) => {
      assert.equal(isAllocatorRefusal(error) && error.id, 'registry-missing');
      return true;
    });
    writeRegistry(root, {
      version: 2,
      nextSequence: 2,
      environmentsById: {
        'dev-5': {
          slotId: 'dev-5',
          worktreePath: null,
          cluster: 'kind-offscreen-dev',
          namespace: 'offscreen-dev-5',
          ports: { game: 19000, control: 19000, tilt: 19001, spare: 19002 },
          processIdentity: null,
          resourceUids: {},
          lease: null,
        },
      },
      defaultEnvironmentByCheckout: {},
    });
    const corruptBefore = readFileSync(registryFilePath(root), 'utf8');
    assert.throws(() => reserveUnattachedEnvironment(root, deps), (error) => {
      assert.equal(isAllocatorRefusal(error) && error.id, 'registry-corrupt');
      return true;
    });
    assert.equal(readFileSync(registryFilePath(root), 'utf8'), corruptBefore);
    writeRegistry(root, {
      version: 2,
      nextSequence: 1,
      environmentsById: {},
      defaultEnvironmentByCheckout: {},
    });
    const tiny = { start: 22_000, end: 22_003 };
    reserveUnattachedEnvironment(root, { ...deps, portRange: tiny });
    assert.throws(
      () => reserveUnattachedEnvironment(root, { ...deps, portRange: tiny }),
      (error) => isAllocatorRefusal(error) && error.id === 'exhausted-port-range',
    );
    const afterExhaust = readFileSync(registryFilePath(root), 'utf8');
    assert.throws(
      () => reserveUnattachedEnvironment(root, { ...deps, portRange: tiny }),
      (error) => isAllocatorRefusal(error) && error.id === 'exhausted-port-range',
    );
    assert.equal(readFileSync(registryFilePath(root), 'utf8'), afterExhaust);
    assert.equal(readExistingRegistryV2(root).nextSequence, 2);
  });
});

const attachDeps = {
  canonicalizePath: (/** @type {string} */ path) => path,
  isPortAvailable: () => true,
  readProcessIdentity: () => null,
  readSlotSession: () => null,
  readLegacySession: () => null,
  processDeps: { pidAlive: () => false, readStartTicks: () => null },
};

test('attach binds unattached reservation and default mapping', () => {
  withTemp((root) => {
    writeRegistry(root, {
      version: 2,
      nextSequence: 5,
      environmentsById: {},
      defaultEnvironmentByCheckout: {},
    });
    const reserved = reserveUnattachedEnvironment(root, attachDeps);
    const attached = attachUnattachedEnvironment('/canonical/wt-a', root, reserved.slotId, attachDeps);
    assert.equal(attached.worktreePath, '/canonical/wt-a');
    const snapshot = readRegistryV2(root);
    assert.equal(snapshot.environmentsById[reserved.slotId].worktreePath, '/canonical/wt-a');
    assert.equal(snapshot.defaultEnvironmentByCheckout['/canonical/wt-a'], reserved.slotId);
    validateRegistryV2(snapshot);
  });
});

test('attach is idempotent for the same checkout and default', () => {
  withTemp((root) => {
    writeRegistry(root, { version: 2, nextSequence: 2, environmentsById: {}, defaultEnvironmentByCheckout: {} });
    const reserved = reserveUnattachedEnvironment(root, attachDeps);
    attachUnattachedEnvironment('/canonical/wt-a', root, reserved.slotId, attachDeps);
    const before = readFileSync(registryFilePath(root), 'utf8');
    const again = attachUnattachedEnvironment('/canonical/wt-a', root, reserved.slotId, attachDeps);
    assert.equal(again.worktreePath, '/canonical/wt-a');
    assert.equal(readFileSync(registryFilePath(root), 'utf8'), before);
  });
});

test('attach refuses foreign checkout, default collision, and retained state without mutation', () => {
  withTemp((root) => {
    const checkoutA = '/canonical/a';
    const checkoutB = '/canonical/b';
    writeRegistry(root, {
      version: 2,
      nextSequence: 6,
      environmentsById: {
        'dev-1': {
          slotId: 'dev-1',
          worktreePath: checkoutA,
          cluster: 'kind-offscreen-dev',
          namespace: 'offscreen-dev-1',
          ports: { game: 19000, control: 19000, tilt: 19001, spare: 19002 },
          processIdentity: null,
          resourceUids: {},
          lease: null,
        },
        'dev-5': {
          slotId: 'dev-5',
          worktreePath: checkoutB,
          cluster: 'kind-offscreen-dev',
          namespace: 'offscreen-dev-5',
          ports: { game: 19100, control: 19100, tilt: 19101, spare: 19102 },
          processIdentity: null,
          resourceUids: {},
          lease: null,
        },
      },
      defaultEnvironmentByCheckout: { [checkoutA]: 'dev-1' },
    });
    const reserved = reserveUnattachedEnvironment(root, attachDeps);
    const foreignBefore = readFileSync(registryFilePath(root), 'utf8');
    assert.throws(
      () => attachUnattachedEnvironment(checkoutA, root, 'dev-5', attachDeps),
      (error) => error.id === 'foreign-checkout',
    );
    assert.equal(readFileSync(registryFilePath(root), 'utf8'), foreignBefore);
    const defaultBefore = readFileSync(registryFilePath(root), 'utf8');
    assert.throws(
      () => attachUnattachedEnvironment(checkoutA, root, reserved.slotId, attachDeps),
      (error) => error.id === 'conflicting-default',
    );
    assert.equal(readFileSync(registryFilePath(root), 'utf8'), defaultBefore);
    const bound = attachUnattachedEnvironment(checkoutB, root, reserved.slotId, attachDeps);
    const tainted = readRegistryV2(root);
    tainted.environmentsById[bound.slotId] = {
      ...tainted.environmentsById[bound.slotId],
      resourceUids: { namespace: 'uid' },
    };
    writeRegistry(root, tainted);
    const uidBefore = readFileSync(registryFilePath(root), 'utf8');
    assert.throws(
      () => attachUnattachedEnvironment(checkoutB, root, bound.slotId, attachDeps),
      (error) => error.id === 'retained-resources',
    );
    assert.equal(readFileSync(registryFilePath(root), 'utf8'), uidBefore);
  });
});

test('attach refuses lease, session, occupied port, and legacy session', () => {
  withTemp((root) => {
    writeRegistry(root, { version: 2, nextSequence: 2, environmentsById: {}, defaultEnvironmentByCheckout: {} });
    const checkout = '/canonical/attach-refuse';
    const reserved = reserveUnattachedEnvironment(root, attachDeps);
    attachUnattachedEnvironment(checkout, root, reserved.slotId, attachDeps);
    const withLease = readRegistryV2(root);
    withLease.environmentsById[reserved.slotId] = {
      ...withLease.environmentsById[reserved.slotId],
      lease: { pid: 99, startTimeJiffies: 1, acquiredAt: 't' },
    };
    writeRegistry(root, withLease);
    const leaseBefore = readFileSync(registryFilePath(root), 'utf8');
    assert.throws(
      () => attachUnattachedEnvironment(checkout, root, reserved.slotId, {
        ...attachDeps,
        readProcessIdentity: (pid) => (pid === 99 ? { startTimeJiffies: 1 } : null),
        processDeps: { pidAlive: () => true, readStartTicks: () => '1' },
      }),
      (error) => error.id === 'active-lease',
    );
    assert.equal(readFileSync(registryFilePath(root), 'utf8'), leaseBefore);
    const clean = reserveUnattachedEnvironment(root, attachDeps);
    const sessions = environmentSessionRoot(root);
    writeEnvironmentSession(sessions, {
      slotId: clean.slotId,
      pid: 12,
      processStartTicks: '100',
      namespace: clean.namespace,
      checkoutPath: checkout,
      gamePort: clean.ports.game,
      tiltPort: clean.ports.tilt,
    });
    const sessionBefore = readFileSync(registryFilePath(root), 'utf8');
    assert.throws(
      () => attachUnattachedEnvironment('/canonical/session-blocked', root, clean.slotId, {
        ...attachDeps,
        readSlotSession: (_reg, id) => readEnvironmentSession(sessions, id),
        processDeps: { pidAlive: () => true, readStartTicks: () => '100' },
      }),
      (error) => error.id === 'local-session-present',
    );
    assert.equal(readFileSync(registryFilePath(root), 'utf8'), sessionBefore);
    const portBlock = reserveUnattachedEnvironment(root, attachDeps);
    const portBefore = readFileSync(registryFilePath(root), 'utf8');
    assert.throws(
      () => attachUnattachedEnvironment('/canonical/port', root, portBlock.slotId, {
        ...attachDeps,
        isPortAvailable: (port) => port !== portBlock.ports.game,
      }),
      (error) => error.id === 'foreign-listener',
    );
    assert.equal(readFileSync(registryFilePath(root), 'utf8'), portBefore);
  });
});

test('concurrent v2 allocations do not duplicate ids or ports', () => {
  withTemp((root) => {
    writeRegistry(root, {
      version: 2,
      nextSequence: 1,
      environmentsById: {},
      defaultEnvironmentByCheckout: {},
    });
    const here = fileURLToPath(new URL('../src/domain/dev-worktree-allocator.mjs', import.meta.url));
    const script = `
      import { allocateIndependentEnvironment } from ${JSON.stringify(here)};
      const record = allocateIndependentEnvironment(process.argv[1], process.argv[2], {
        canonicalizePath: (path) => path,
        isPortAvailable: () => true,
      });
      process.stdout.write(record.slotId + ' ' + record.ports.game);
    `;
    const runs = [1, 2, 3, 4].map((i) => spawnSync(process.execPath, ['--input-type=module', '-e', script, `/canonical/race-${i}`, root], { encoding: 'utf8' }));
    for (const run of runs) assert.equal(run.status, 0, run.stderr);
    const ids = runs.map((run) => run.stdout.split(' ')[0]);
    const ports = runs.map((run) => Number(run.stdout.split(' ')[1]));
    assert.equal(new Set(ids).size, 4);
    assert.equal(new Set(ports).size, 4);
  });
});
