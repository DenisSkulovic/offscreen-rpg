import { EventEmitter } from 'node:events';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runDevTiltLaunch } from '../src/application/dev-lifecycle.mjs';
import {
  acquireSlotOperationLock,
  isAllocatorRefusal,
  slotOperationLockFilePath,
  withSlotOperationLock,
} from '../src/domain/dev-worktree-registry.mjs';

const FAKE_OWNER = {
  slotId: 'dev-1',
  worktreePath: '/tmp/unused',
  cluster: 'kind-offscreen-dev',
  namespace: 'offscreen-dev-1',
  ports: { game: 13_100, control: 13_101, tilt: 13_102, spare: 13_103 },
  processIdentity: null,
  resourceUids: {},
  lease: null,
};

function okPreflight() {
  return { ok: true, refusals: [] };
}

function alwaysFreeProbe() {
  return Promise.resolve(false);
}

function fakeSpawn() {
  /** @type {import('node:child_process').ChildProcess} */
  const child = new EventEmitter();
  // @ts-expect-error test stub
  child.pid = 42_001;
  child.exitCode = null;
  return () => child;
}

function launchDeps(registryRoot, worktree, overrides = {}) {
  return {
    worktree,
    registryRoot,
    fingerprintDevImageContext: () => ({
      ok: true,
      fingerprint: 'ab'.repeat(32),
    }),
    owner: { ...FAKE_OWNER, worktreePath: worktree },
    allocateDevWorktreeOwner: () => ({
      ...FAKE_OWNER,
      worktreePath: worktree,
    }),
    collectDefaultProbes: async () => ({}),
    runStackPreflight: () => okPreflight(),
    commandOnPath: () => true,
    probeLoopbackPortOccupied: alwaysFreeProbe,
    spawnFn: fakeSpawn(),
    startupWindowMs: 0,
    startupPollMs: 1,
    sleep: async () => {},
    readStartTicks: () => '11',
    collectStartupReadiness: async () => ({}),
    exitAfterSession: true,
    exit: () => {},
    ...overrides,
  };
}

test('slot lock file lives under registry operations', () => {
  const registryRoot = mkdtempSync(join(tmpdir(), 'offscreen-op-lock-'));
  const path = slotOperationLockFilePath(registryRoot, 'dev-7');
  assert.match(path, /operations\/dev-7\.lock$/);
});

test('lock released on injected failure in withSlotOperationLock', () => {
  const registryRoot = mkdtempSync(join(tmpdir(), 'offscreen-op-lock-'));
  mkdirSync(registryRoot, { recursive: true });
  assert.throws(
    () =>
      withSlotOperationLock(
        { registryRoot, slotId: 'dev-1', tryOnly: true },
        () => {
          throw new Error('injected');
        },
      ),
    /injected/,
  );
  const again = acquireSlotOperationLock({
    registryRoot,
    slotId: 'dev-1',
    tryOnly: true,
  });
  again.release();
});

test('second same-slot acquire refuses while lock held', () => {
  const registryRoot = mkdtempSync(join(tmpdir(), 'offscreen-op-lock-'));
  const first = acquireSlotOperationLock({
    registryRoot,
    slotId: 'dev-2',
    tryOnly: true,
  });
  assert.throws(
    () =>
      acquireSlotOperationLock({
        registryRoot,
        slotId: 'dev-2',
        tryOnly: true,
      }),
    (error) => isAllocatorRefusal(error) && error.id === 'slot-operation-busy',
  );
  first.release();
});

test('different slots acquire independently', () => {
  const registryRoot = mkdtempSync(join(tmpdir(), 'offscreen-op-lock-'));
  const a = acquireSlotOperationLock({
    registryRoot,
    slotId: 'dev-3',
    tryOnly: true,
  });
  const b = acquireSlotOperationLock({
    registryRoot,
    slotId: 'dev-4',
    tryOnly: true,
  });
  a.release();
  b.release();
});

test('launch failure releases the slot operation lock', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-lock-'));
  const registryRoot = join(mkdtempSync(join(tmpdir(), 'offscreen-reg-')), 'r');
  mkdirSync(registryRoot, { recursive: true });
  await runDevTiltLaunch(
    launchDeps(registryRoot, worktree, {
      reconcileDevSlot: async () => ({
        ok: false,
        phase: 'injected',
        detail: 'fail',
      }),
    }),
  );
  const again = acquireSlotOperationLock({
    registryRoot,
    slotId: FAKE_OWNER.slotId,
    tryOnly: true,
  });
  again.release();
});

test('two launches on same slot: only one reconcile', async () => {
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-lock-'));
  const registryRoot = join(mkdtempSync(join(tmpdir(), 'offscreen-reg-')), 'r');
  mkdirSync(registryRoot, { recursive: true });
  let reconcileCount = 0;
  /** @type {(() => void) | undefined} */
  let releaseReconcile;
  const reconcileBlocked = new Promise((resolve) => {
    releaseReconcile = () => resolve();
  });
  const deps = launchDeps(registryRoot, worktree, {
    exitAfterSession: false,
    exitAfterReady: true,
    reconcileDevSlot: async () => {
      reconcileCount += 1;
      await reconcileBlocked;
      return {
        ok: true,
        readyForWorkloads: true,
        record: { ...FAKE_OWNER, worktreePath: worktree },
      };
    },
    collectStartupReadiness: async () =>
      Object.fromEntries(
        [
          'game-web',
          'game-api',
          'game-authority',
          'game-control',
          'game-executor',
          'game-relay',
        ].map((role) => [role, { ok: true }]),
      ),
  });
  const launchA = runDevTiltLaunch(deps);
  while (reconcileCount === 0) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  let secondExit = 0;
  await runDevTiltLaunch({
    ...deps,
    exit: (code) => {
      secondExit = code;
    },
  });
  assert.equal(secondExit, 1);
  releaseReconcile?.();
  await launchA;
  assert.equal(reconcileCount, 1);
});

test('parallel launches on different slots both reconcile', async () => {
  const worktreeA = mkdtempSync(join(tmpdir(), 'offscreen-wt-a-'));
  const worktreeB = mkdtempSync(join(tmpdir(), 'offscreen-wt-b-'));
  const registryRoot = join(mkdtempSync(join(tmpdir(), 'offscreen-reg-')), 'r');
  mkdirSync(registryRoot, { recursive: true });
  const ownerA = {
    ...FAKE_OWNER,
    slotId: 'dev-5',
    namespace: 'offscreen-dev-5',
    worktreePath: worktreeA,
  };
  const ownerB = {
    ...FAKE_OWNER,
    slotId: 'dev-6',
    namespace: 'offscreen-dev-6',
    ports: { game: 13_200, control: 13_201, tilt: 13_202, spare: 13_203 },
    worktreePath: worktreeB,
  };
  /** @type {string[]} */
  const reconciled = [];
  const readyReadiness = async () =>
    Object.fromEntries(
      [
        'game-web',
        'game-api',
        'game-authority',
        'game-control',
        'game-executor',
        'game-relay',
      ].map((role) => [role, { ok: true }]),
    );
  await Promise.all([
    runDevTiltLaunch(
      launchDeps(registryRoot, worktreeA, {
        owner: ownerA,
        exitAfterReady: true,
        collectStartupReadiness: readyReadiness,
        reconcileDevSlot: async () => {
          reconciled.push('dev-5');
          return { ok: true, readyForWorkloads: true, record: ownerA };
        },
      }),
    ),
    runDevTiltLaunch(
      launchDeps(registryRoot, worktreeB, {
        owner: ownerB,
        exitAfterReady: true,
        collectStartupReadiness: readyReadiness,
        reconcileDevSlot: async () => {
          reconciled.push('dev-6');
          return { ok: true, readyForWorkloads: true, record: ownerB };
        },
      }),
    ),
  ]);
  assert.deepEqual(reconciled.sort(), ['dev-5', 'dev-6']);
});
