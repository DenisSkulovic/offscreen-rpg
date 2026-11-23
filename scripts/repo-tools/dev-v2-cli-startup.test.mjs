import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  environmentSessionRoot,
  ownedEnvironmentSessionPid,
  resolveDevEnvironmentSelection,
  writeEnvironmentSession,
} from './dev-environment-session.mjs';
import { readRegistryJson, writeRegistry } from './dev-worktree-registry.mjs';

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
    ports: { game: 23000 + n, control: 24000 + n, tilt: 25000 + n, spare: 26000 + n },
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
    command: 'up', instance: null, worktree: checkout, registryRoot: root, allocate,
  });
  const again = resolveDevEnvironmentSelection({
    command: 'up', instance: null, worktree: checkout, registryRoot: root, allocate,
  });
  const status = resolveDevEnvironmentSelection({
    command: 'status', instance: null, worktree: checkout, registryRoot: root, allocate,
  });
  const stop = resolveDevEnvironmentSelection({
    command: 'stop', instance: null, worktree: checkout, registryRoot: root, allocate,
  });
  assert.equal(calls, 1);
  assert.equal(started.allocatedDefault, true);
  assert.equal(started.record.slotId, 'dev-1');
  assert.equal(again.record.slotId, 'dev-1');
  assert.equal(again.allocatedDefault, undefined);
  assert.equal(status.record.slotId, 'dev-1');
  assert.equal(stop.record.slotId, 'dev-1');
  assert.equal(readRegistryJson(root).defaultEnvironmentByCheckout[checkout], 'dev-1');
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
  assert.equal(readRegistryJson(root).defaultEnvironmentByCheckout[checkout], 'dev-1');
  const explicit = resolveDevEnvironmentSelection({
    command: 'up', instance: 'dev-2', worktree: checkout, registryRoot: root, processDeps: dead,
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
  const foreign = { ...owner('dev-1', other), lease: { pid: 201268, startTimeJiffies: 1684727 } };
  writeRegistry(root, {
    version: 2,
    nextSequence: 3,
    environmentsById: { 'dev-1': foreign, 'dev-2': selected },
    defaultEnvironmentByCheckout: { [checkout]: 'dev-2', [other]: 'dev-1' },
  });
  const sessions = environmentSessionRoot(root);
  writeEnvironmentSession(sessions, {
    slotId: 'dev-2', pid: 42, processStartTicks: '100', namespace: selected.namespace,
    checkoutPath: checkout, gamePort: selected.ports.game, tiltPort: selected.ports.tilt,
  });
  writeEnvironmentSession(sessions, {
    slotId: 'dev-1', pid: 201268, processStartTicks: '1684727', namespace: foreign.namespace,
    checkoutPath: other, gamePort: foreign.ports.game, tiltPort: foreign.ports.tilt,
  });
  assert.equal(ownedEnvironmentSessionPid(root, selected, alive), 42);
  assert.equal(ownedEnvironmentSessionPid(root, foreign, dead), null);
  assert.throws(() => resolveDevEnvironmentSelection({
    command: 'status', instance: 'dev-9', worktree: checkout, registryRoot: root, processDeps: dead,
  }));
  assert.throws(() => resolveDevEnvironmentSelection({
    command: 'up', instance: 'dev-1', worktree: checkout, registryRoot: root, processDeps: alive,
  }));
  const stale = resolveDevEnvironmentSelection({
    command: 'status', instance: 'dev-1', worktree: checkout, registryRoot: root, processDeps: dead,
  });
  assert.equal(stale.record.lease.pid, 201268);
  assert.equal(readRegistryJson(root).environmentsById['dev-1'].lease.pid, 201268);
  rmSync(root, { recursive: true, force: true });
  rmSync(checkout, { recursive: true, force: true });
  rmSync(other, { recursive: true, force: true });
});
