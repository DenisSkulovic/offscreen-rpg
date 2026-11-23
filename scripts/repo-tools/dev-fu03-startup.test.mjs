import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { reconcileDevSlot } from './dev-slot-startup.mjs';
import {
  readEnvironmentSession,
  resolveDevEnvironmentSelection,
  writeEnvironmentSession,
  environmentSessionRoot,
} from './dev-environment-session.mjs';
import { writeRegistry } from './dev-worktree-registry.mjs';
import { runDevTiltLaunch } from './dev-tilt.mjs';

function owner(slot, checkout) {
  const n = Number(slot.slice(4));
  return {
    slotId: slot,
    worktreePath: checkout,
    cluster: 'kind-offscreen-dev',
    namespace: `offscreen-${slot}`,
    ports: { game: 13000 + n, control: 13100 + n, tilt: 13200 + n, spare: 13300 + n },
    processIdentity: null,
    resourceUids: { namespace: `uid-${slot}`, database: `db-${slot}` },
    lease: null,
  };
}

function readyDeps(calls) {
  return {
    allocate() {
      calls.allocate += 1;
      throw new Error('allocate');
    },
    async probeCluster() {
      return { ok: true, cluster: 'kind-offscreen-dev', memoryMiB: 4096 };
    },
    async ensureSql(record) {
      calls.sql.push(record.slotId);
      return { retained: [record.resourceUids.database] };
    },
    async ensureMigration() {
      return { ok: true };
    },
    async ensureS3(record) {
      calls.s3.push(record.slotId);
      return {};
    },
    async ensureTemporal() {
      return {};
    },
    async project(record) {
      calls.project.push(record.slotId);
      return { ok: true, images: { web: `offscreen-dev-workspace:${record.slotId}-web` } };
    },
    async ensureImages(record) {
      calls.images.push(record.resourceUids.database);
      return { ok: true, refs: { web: `offscreen-dev-workspace:${record.slotId}-web` } };
    },
    async applyWorkloads(record) {
      calls.workloads.push(record.slotId);
      return { ok: true };
    },
  };
}

test('explicit owner reaches startup and does not allocate', async () => {
  const calls = { allocate: 0, sql: [], s3: [], project: [], images: [], workloads: [] };
  const selected = owner('dev-2', '/checkout');
  const result = await reconcileDevSlot({
    worktree: '/checkout',
    registryRoot: '/unused',
    owner: selected,
    memoryMiB: 4096,
  }, readyDeps(calls));
  assert.equal(result.ok, true);
  assert.equal(result.record.slotId, 'dev-2');
  assert.equal(result.identities.namespace, 'offscreen-dev-2');
  assert.equal(calls.allocate, 0);
  assert.deepEqual(calls.sql, ['dev-2']);
  assert.deepEqual(calls.workloads, ['dev-2']);
});

test('failed image load does not apply workloads', async () => {
  const calls = { allocate: 0, sql: [], s3: [], project: [], images: [], workloads: [] };
  const deps = readyDeps(calls);
  deps.ensureImages = async () => ({ ok: false, refusals: [{ detail: 'image missing' }] });
  const result = await reconcileDevSlot({
    worktree: '/checkout',
    registryRoot: '/unused',
    owner: owner('dev-3', '/checkout'),
    memoryMiB: 4096,
  }, deps);
  assert.equal(result.ok, false);
  assert.equal(result.phase, 'images');
  assert.deepEqual(calls.workloads, []);
  assert.equal(calls.allocate, 0);
});

test('two environments keep separate sessions and starting B does not signal A', async () => {
  const root = mkdtempSync(join(tmpdir(), 'offscreen-fu03-'));
  const checkout = '/shared/checkout';
  const a = owner('dev-1', checkout);
  const b = owner('dev-2', checkout);
  writeRegistry(root, {
    version: 2,
    nextSequence: 3,
    environmentsById: { 'dev-1': a, 'dev-2': b },
    defaultEnvironmentByCheckout: { [checkout]: 'dev-1' },
  });
  writeEnvironmentSession(environmentSessionRoot(root), {
    slotId: 'dev-1', pid: 11, processStartTicks: '100', namespace: a.namespace, gamePort: a.ports.game, tiltPort: a.ports.tilt,
  });
  const selected = resolveDevEnvironmentSelection({
    command: 'up', instance: 'dev-2', worktree: checkout, registryRoot: root,
  });
  assert.equal(selected.record.slotId, 'dev-2');
  assert.equal(selected.action, 'up');
  const signalled = [];
  await runDevTiltLaunch({
    owner: selected.record,
    worktree: checkout,
    registryRoot: root,
    reconcileDevSlot: async (input) => {
      assert.equal(input.owner.slotId, 'dev-2');
      return { ok: true, readyForWorkloads: true, record: input.owner };
    },
    collectDefaultProbes: async () => ({}),
    runStackPreflight: () => ({ ok: true, refusals: [] }),
    commandOnPath: () => true,
    probeLoopbackPortOccupied: async () => false,
    spawnFn: () => ({ pid: 22, on() {} }),
    exitAfterSession: true,
    pidAlive: (pid) => pid === 11,
    readStartTicks: () => '100',
    signal: (pid) => signalled.push(pid),
    exit: () => {
      throw new Error('exit');
    },
  });
  assert.deepEqual(signalled, []);
  assert.equal(readEnvironmentSession(environmentSessionRoot(root), 'dev-1').pid, 11);
  assert.equal(readEnvironmentSession(environmentSessionRoot(root), 'dev-2').pid, 22);
  assert.equal(readEnvironmentSession(environmentSessionRoot(root), 'dev-2').tiltPort, b.ports.tilt);
  rmSync(root, { recursive: true, force: true });
});

test('unknown id and active foreign checkout refuse', () => {
  const root = mkdtempSync(join(tmpdir(), 'offscreen-fu03-'));
  const a = owner('dev-1', '/one');
  a.lease = { pid: 4, startTimeJiffies: 9, acquiredAt: 't' };
  writeRegistry(root, {
    version: 2,
    nextSequence: 2,
    environmentsById: { 'dev-1': a },
    defaultEnvironmentByCheckout: { '/one': 'dev-1' },
  });
  assert.throws(
    () => resolveDevEnvironmentSelection({ command: 'up', instance: 'dev-9', worktree: '/one', registryRoot: root }),
    (error) => error.id === 'unknown-environment',
  );
  assert.throws(
    () => resolveDevEnvironmentSelection({ command: 'up', instance: 'dev-1', worktree: '/other', registryRoot: root }),
    (error) => error.id === 'foreign-checkout',
  );
  a.lease = null;
  writeRegistry(root, {
    version: 2,
    nextSequence: 2,
    environmentsById: { 'dev-1': a },
    defaultEnvironmentByCheckout: { '/one': 'dev-1' },
  });
  const rebound = resolveDevEnvironmentSelection({
    command: 'up', instance: 'dev-1', worktree: '/other', registryRoot: root,
  });
  assert.equal(rebound.rebindCheckout, true);
  assert.equal(rebound.record.resourceUids.database, 'db-dev-1');
  rmSync(root, { recursive: true, force: true });
});
