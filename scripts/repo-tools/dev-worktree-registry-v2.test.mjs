import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  allocateIndependentEnvironment,
  getDefaultEnvironment,
  getEnvironment,
  listIndependentEnvironments,
} from './dev-worktree-allocator.mjs';
import {
  convertRegistryV1ToV2,
  isAllocatorRefusal,
  migrateRegistryV1ToV2,
  readRegistryV2,
  registryFilePath,
  REGISTRY_V1_BACKUP,
  writeRegistry,
} from './dev-worktree-registry.mjs';

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
    { version: 1, nextSequence: 2, ownersByWorktree: { '/canonical/checkout-1': { ...base.ownersByWorktree['/canonical/checkout-1'], cluster: 'kind-offscreen-lab' } } },
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

test('concurrent v2 allocations do not duplicate ids or ports', () => {
  withTemp((root) => {
    writeRegistry(root, {
      version: 2,
      nextSequence: 1,
      environmentsById: {},
      defaultEnvironmentByCheckout: {},
    });
    const here = fileURLToPath(new URL('./dev-worktree-allocator.mjs', import.meta.url));
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
