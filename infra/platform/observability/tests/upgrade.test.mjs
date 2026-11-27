import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { readPlatformProfile } from '../../common/profile.mjs';
import { loadObservabilityVariants } from '../artifacts.mjs';
import { acquireCustody, readPending } from '../custody.mjs';
import {
  exitCodeForUpgrade,
  helmUpgradeArgv,
  projectUpgradePreservation,
  runObservabilityUpgrade,
} from '../upgrade.mjs';
import {
  buildCompleteDevSnapshot,
  buildPredecessorDevSnapshot,
  buildUpgradedDevSnapshot,
  cloneSnapshot,
} from './snapshot-fixtures.mjs';

const profile = readPlatformProfile('dev');
const variants = loadObservabilityVariants('dev');
const memoryOk = {
  ok: true,
  stdout: 'MemAvailable: 8388608 kB\nMemTotal: 16777216 kB\n',
};

/**
 * @param {number} miB
 */
function memory(miB) {
  return { ok: true, stdout: `MemAvailable: ${miB * 1024} kB\n` };
}

/**
 * @param {object} snapshot
 */
function harness(snapshot, extras = {}) {
  const calls = [];
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-upgrade-'));
  mkdirSync(join(stateRoot, 'locks'), { recursive: true, mode: 0o700 });
  const identity = {
    snapshotPath: '/tmp/kubeconfig',
    contextName: profile.contextName,
    namespace: profile.namespaces.observability,
    tuple: {
      profileId: 'dev',
      contextName: profile.contextName,
      clusterName: profile.clusterName,
      port: 24443,
      dockerContext: 'default',
      dockerControlPlaneId: '0123456789abcdef',
      dockerEndpointHost: 'unix:///var/run/docker.sock',
      caSha256: 'ab'.repeat(32),
      kubeSystemUid: 'kube-system-uid',
      baselineUid: 'baseline-uid',
      targetNamespaceUid: snapshot.namespace?.uid ?? 'uid-namespace',
    },
    cleanup() {},
  };
  let reads = 0;
  return {
    calls,
    stateRoot,
    async run() {
      const previous = process.env.OFFSCREEN_OBSERVABILITY_UPGRADE;
      process.env.OFFSCREEN_OBSERVABILITY_UPGRADE = 'authorized';
      try {
        return await runObservabilityUpgrade({
          argv: [],
          run: async (command, args) => {
            calls.push([command, args]);
            return extras.memory ?? memoryOk;
          },
          captureIdentity: async () => identity,
          acquireCustody: (contextName, deps) =>
            acquireCustody(contextName, { ...deps, stateRoot }),
          collectInventory: async () => {
            reads += 1;
            return reads === 1 ? snapshot : (extras.next ?? snapshot);
          },
          loadObservabilityVariants: () => variants,
          readPlatformProfile: () => profile,
          openForwards: false,
          recheckIdentity: () => ({ ok: true }),
          readPending: (contextName) => readPending(contextName, { stateRoot }),
          runMutation: extras.runMutation,
          ...extras.deps,
        });
      } finally {
        if (previous == null) {
          delete process.env.OFFSCREEN_OBSERVABILITY_UPGRADE;
        } else {
          process.env.OFFSCREEN_OBSERVABILITY_UPGRADE = previous;
        }
        rmSync(stateRoot, { recursive: true, force: true });
      }
    },
  };
}

test('upgrade refuses arguments and missing authorization before host access', async () => {
  let ran = false;
  const denied = await runObservabilityUpgrade({
    argv: [],
    run: async () => {
      ran = true;
      return memoryOk;
    },
  });
  assert.equal(denied.reasonCode, 'ensure-not-authorized');
  assert.equal(exitCodeForUpgrade(denied), 2);
  assert.equal(ran, false);
  process.env.OFFSCREEN_OBSERVABILITY_UPGRADE = 'authorized';
  const invalid = await runObservabilityUpgrade({
    argv: ['--force'],
    run: async () => {
      ran = true;
      return memoryOk;
    },
  });
  delete process.env.OFFSCREEN_OBSERVABILITY_UPGRADE;
  assert.equal(invalid.reasonCode, 'invalid-invocation');
  assert.equal(exitCodeForUpgrade(invalid), 2);
  assert.equal(ran, false);
});

test('upgrade refuses memory below the floor and unreadable meminfo', async () => {
  process.env.OFFSCREEN_OBSERVABILITY_UPGRADE = 'authorized';
  const below = await runObservabilityUpgrade({
    argv: [],
    run: async () => memory(4095),
  });
  const late = await runObservabilityUpgrade({
    argv: [],
    run: async () => ({ ok: false, stdout: '' }),
  });
  delete process.env.OFFSCREEN_OBSERVABILITY_UPGRADE;
  assert.equal(below.ok, false);
  assert.equal(below.mutation, 'none');
  assert.equal(late.ok, false);
});

test('current rev2 is a no-op and predecessor upgrades once', async () => {
  const current = buildUpgradedDevSnapshot(variants.desired, variants.predecessor);
  const noop = harness(current);
  const noopReceipt = await noop.run();
  assert.equal(noopReceipt.ok, true);
  assert.equal(noopReceipt.mutation, 'none');
  assert.equal(noopReceipt.oldRevision, 2);
  assert.equal(noopReceipt.newRevision, 2);

  const predecessor = buildPredecessorDevSnapshot(variants.desired, variants.predecessor);
  const upgraded = buildUpgradedDevSnapshot(variants.desired, variants.predecessor);
  let writes = 0;
  const transition = harness(predecessor, {
    next: upgraded,
    runMutation: async (command, args) => {
      writes += 1;
      assert.equal(command, 'helm');
      const release = variants.desired.releases.find((row) => row.role === 'collector');
      assert.deepEqual(
        args,
        helmUpgradeArgv(
          {
            snapshotPath: '/tmp/kubeconfig',
            contextName: profile.contextName,
            namespace: profile.namespaces.observability,
          },
          release,
        ),
      );
      assert.equal(args.includes('--reset-values'), true);
      assert.equal(args.includes('--atomic'), false);
      assert.equal(args.includes('--install'), false);
      return { ok: true, timedOut: false, cancelled: false };
    },
  });
  const receipt = await transition.run();
  assert.equal(receipt.ok, true);
  assert.equal(receipt.oldRevision, 1);
  assert.equal(receipt.newRevision, 2);
  assert.equal(writes, 1);
  assert.equal(exitCodeForUpgrade(receipt), 0);
  const preserved = projectUpgradePreservation(predecessor, variants.predecessor);
  assert.equal(typeof preserved?.grafanaSecretUid, 'string');
});

test('absent, foreign and pending snapshots do not mutate', async () => {
  const absent = cloneSnapshot(buildCompleteDevSnapshot(variants.desired));
  absent.namespace = { absent: true, uid: null };
  absent.objects = {};
  absent.helmReleases = [];
  absent.persistentVolumes = [];
  let writes = 0;
  const receipt = await harness(absent, {
    runMutation: async () => {
      writes += 1;
      return { ok: true };
    },
  }).run();
  assert.equal(receipt.reasonCode, 'absent');
  assert.equal(writes, 0);
});

test('timeout and failed transport keep the pending fence', async () => {
  const predecessor = buildPredecessorDevSnapshot(variants.desired, variants.predecessor);
  const timed = await harness(predecessor, {
    runMutation: async () => ({ ok: false, timedOut: true, attempted: true }),
  }).run();
  assert.equal(timed.pending, true);
  assert.equal(timed.mutation, 'possible');
  assert.equal(timed.newRevision, null);

  const failed = await harness(predecessor, {
    next: buildUpgradedDevSnapshot(variants.desired, variants.predecessor),
    deps: { failTransport: true },
    runMutation: async () => ({ ok: true }),
  }).run();
  assert.equal(failed.pending, true);
  assert.equal(failed.ok, false);
});

test('changed preservation, missing inventory, wrong forwards and failed cleanup stay fenced', async () => {
  const predecessor = buildPredecessorDevSnapshot(variants.desired, variants.predecessor);
  const upgraded = buildUpgradedDevSnapshot(variants.desired, variants.predecessor);
  const changed = cloneSnapshot(upgraded);
  changed.objects['Pod/obs-loki-0'].metadata.uid = 'uid-pod-changed';
  let writes = 0;
  const drifted = await harness(predecessor, {
    next: changed,
    runMutation: async () => {
      writes += 1;
      return { ok: true };
    },
  }).run();
  assert.equal(writes, 1);
  assert.equal(drifted.ok, false);
  assert.equal(drifted.pending, true);
  assert.equal(drifted.mutation, 'possible');
  assert.equal(drifted.newRevision, null);

  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-upgrade-missing-'));
  mkdirSync(join(stateRoot, 'locks'), { recursive: true, mode: 0o700 });
  process.env.OFFSCREEN_OBSERVABILITY_UPGRADE = 'authorized';
  let missingWrites = 0;
  const missing = await runObservabilityUpgrade({
    argv: [],
    run: async () => memoryOk,
    observeRun: () => ({ ok: false, stdout: '', stderr: 'missing' }),
    captureIdentity: async () => ({
      snapshotPath: '/tmp/kubeconfig',
      contextName: profile.contextName,
      namespace: profile.namespaces.observability,
      tuple: { targetNamespaceUid: 'uid-namespace' },
      cleanup() {
        return { ok: true };
      },
    }),
    acquireCustody: (contextName, deps) =>
      acquireCustody(contextName, { ...deps, stateRoot }),
    loadObservabilityVariants: () => variants,
    readPlatformProfile: () => profile,
    runMutation: async () => {
      missingWrites += 1;
      return { ok: true };
    },
  });
  delete process.env.OFFSCREEN_OBSERVABILITY_UPGRADE;
  rmSync(stateRoot, { recursive: true, force: true });
  assert.equal(missingWrites, 0);
  assert.equal(missing.mutation, 'none');
  assert.equal(missing.ok, false);

  let forwardOptions = null;
  const forwarded = await harness(predecessor, {
    next: upgraded,
    runMutation: async () => ({ ok: true }),
    deps: {
      openForwards: async (_identity, held, options) => {
        forwardOptions = { mode: held.mode, bindings: options.bindings };
        return {
          ports: { developerHttp: 14318 },
          failure: new Promise(() => {}),
          close: async () => ({ ok: true }),
        };
      },
      probeForwardTransport: async () => ({ ok: true }),
    },
  }).run();
  assert.equal(forwarded.ok, true);
  assert.equal(forwardOptions.mode, 'exclusive');
  assert.deepEqual(forwardOptions.bindings, [{ key: 'developerHttp' }]);

  const unclean = await harness(predecessor, {
    next: upgraded,
    runMutation: async () => ({ ok: true }),
    deps: {
      openForwards: async () => ({
        ports: { developerHttp: 14318 },
        failure: new Promise(() => {}),
        close: async () => ({ ok: false }),
      }),
      probeForwardTransport: async () => ({ ok: true }),
    },
  }).run();
  assert.equal(unclean.ok, false);
  assert.equal(unclean.pending, true);
  assert.equal(unclean.mutation, 'possible');
});
