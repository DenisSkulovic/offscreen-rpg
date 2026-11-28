import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  fstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { setTimeout } from 'node:timers';
import { fileURLToPath, URL } from 'node:url';
import test from 'node:test';

import { readKindProfile } from '../../../clusters/kind/manager/config.mjs';
import { readPlatformProfile } from '../../common/profile.mjs';
import {
  acquireCustody,
  acquireProofCustody,
  custodyPaths,
  inspectPendingRecord,
  readPending,
  resolveProductionStateRoot,
  runMutation,
} from '../custody.mjs';
import { ownedChildResult } from '../forward.mjs';

const devKind = readKindProfile('dev');
const workerPath = fileURLToPath(
  new URL('./custody-worker.mjs', import.meta.url),
);

/**
 * @param {string} lockPath
 * @param {{ waitSec?: number }} [options]
 */
function flockContender(lockPath, options = {}) {
  const args = ['--exclusive'];
  if (options.waitSec === undefined) {
    args.push('-n');
  } else {
    args.push('--wait', String(options.waitSec));
  }
  args.push(lockPath, process.execPath, '-e', '0');
  return spawnSync('flock', args, { encoding: 'utf8' });
}

/** @param {string} stateRoot */
function prepareState(stateRoot, contextName = devKind.contextName) {
  const paths = custodyPaths(stateRoot, contextName);
  mkdirSync(paths.lockDirectory, { recursive: true, mode: 0o700 });
  return paths;
}

/**
 * @param {string} [phase]
 * @param {string | null} [targetNamespaceUid]
 */
function ensureRequest(phase = 'namespace', targetNamespaceUid = null) {
  return {
    phase,
    operation: 'ensure',
    details: {},
    tuple: {
      profileId: 'dev',
      contextName: devKind.contextName,
      clusterName: devKind.clusterName,
      port: 24443,
      dockerContext: 'default',
      dockerControlPlaneId: '0123456789abcdef',
      dockerEndpointHost: 'unix:///var/run/docker.sock',
      caSha256: 'ab'.repeat(32),
      kubeSystemUid: 'kube-system-uid',
      baselineUid: 'baseline-uid',
      targetNamespaceUid:
        phase === 'namespace'
          ? targetNamespaceUid
          : (targetNamespaceUid ?? 'namespace-uid'),
    },
  };
}

test('inspectPendingRecord reports absent and legacy without mutation', () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-inspect-'));
  const absent = inspectPendingRecord(devKind.contextName, { stateRoot });
  assert.equal(absent.outcome, 'absent');
  assert.equal(absent.record, null);
  const paths = prepareState(stateRoot);
  writeFileSync(
    paths.pendingPath,
    `${JSON.stringify({
      operationId: 'op',
      service: 'observability',
      context: devKind.contextName,
      phase: 'namespace',
      tuple: { contextName: devKind.contextName },
      start: '2026-01-01T00:00:00.000Z',
    })}\n`,
    { mode: 0o600 },
  );
  const legacy = inspectPendingRecord(devKind.contextName, { stateRoot });
  assert.equal(legacy.outcome, 'legacy');
  assert.equal(legacy.record, null);
  assert.equal(typeof legacy.identity?.ino, 'number');
  rmSync(stateRoot, { recursive: true, force: true });
});

test('readPending missing file is absent and valid without creating paths', () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-read-'));
  const paths = custodyPaths(stateRoot, devKind.contextName);
  assert.equal(existsSync(paths.lockDirectory), false);
  const observation = readPending(devKind.contextName, { stateRoot });
  assert.equal(observation.pending, false);
  assert.equal(observation.valid, true);
  assert.equal(existsSync(paths.lockDirectory), false);
  rmSync(stateRoot, { recursive: true, force: true });
});

test('readPending malformed and symlink pending fail closed', () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-invalid-'));
  const paths = prepareState(stateRoot);
  writeFileSync(paths.pendingPath, '{ not-json', { mode: 0o600 });
  assert.deepEqual(readPending(devKind.contextName, { stateRoot }), {
    pending: true,
    valid: false,
  });
  rmSync(paths.pendingPath);
  symlinkSync('/etc/hosts', paths.pendingPath);
  assert.deepEqual(readPending(devKind.contextName, { stateRoot }), {
    pending: true,
    valid: false,
  });
  rmSync(stateRoot, { recursive: true, force: true });
});

test('lock path stays distinct from Redis filenames', () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-paths-'));
  const obsPaths = custodyPaths(stateRoot, devKind.contextName);
  const redisLock = join(
    stateRoot,
    'platform-locks',
    `${devKind.contextName}-redis.lock`,
  );
  const redisPending = join(
    stateRoot,
    'platform-locks',
    `${devKind.contextName}-redis.pending`,
  );
  assert.match(obsPaths.lockPath, /-observability\.lock$/);
  assert.match(obsPaths.pendingPath, /-observability\.pending$/);
  assert.notEqual(obsPaths.lockPath, redisLock);
  assert.notEqual(obsPaths.pendingPath, redisPending);
  rmSync(stateRoot, { recursive: true, force: true });
});

test('concurrent holders contend on the same context lock', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-contend-'));
  const paths = prepareState(stateRoot);
  const first = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
  });
  const blocked = flockContender(paths.lockPath);
  assert.equal(blocked.status, 1);
  first.begin(ensureRequest());
  first.close();
  const after = flockContender(paths.lockPath);
  assert.equal(after.status, 0);
  rmSync(stateRoot, { recursive: true, force: true });
});

test('acquireCustody refuses stale valid pending', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-stale-'));
  const paths = prepareState(stateRoot);
  const record = {
    operationId: '00000000-0000-4000-8000-000000000001',
    service: 'observability',
    context: devKind.contextName,
    phase: 'helm',
    tuple: { port: 24443 },
    start: new Date().toISOString(),
  };
  writeFileSync(paths.pendingPath, `${JSON.stringify(record)}\n`, {
    mode: 0o600,
  });
  await assert.rejects(
    () => acquireCustody(devKind.contextName, { stateRoot, lockWaitSec: 1 }),
    /pending receipt already exists/,
  );
  rmSync(stateRoot, { recursive: true, force: true });
});

test('parent death leaves inherited lock until child exits', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-parent-'));
  const paths = prepareState(stateRoot);
  const helper = spawn(
    process.execPath,
    [workerPath, stateRoot, devKind.contextName, '1200'],
    { stdio: 'ignore' },
  );
  await new Promise((resolve) => {
    helper.once('exit', resolve);
  });
  assert.equal(helper.exitCode, 0);
  const blocked = flockContender(paths.lockPath);
  assert.equal(blocked.status, 1);
  await new Promise((resolve) => setTimeout(resolve, 1_300));
  const after = flockContender(paths.lockPath);
  assert.equal(after.status, 0);
  rmSync(stateRoot, { recursive: true, force: true });
});

test('runMutation TERM then KILL for ignore-TERM child and keeps pending', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-kill-'));
  const paths = prepareState(stateRoot);
  const script = mkdtempSync(join(tmpdir(), 'obs-term-ignore-'));
  const slowPath = join(script, 'slow.mjs');
  writeFileSync(
    slowPath,
    `process.on('SIGTERM', () => {});\nsetTimeout(() => {}, 60_000);\n`,
    { mode: 0o700 },
  );
  const custody = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
  });
  custody.begin(ensureRequest());
  const started = performance.now();
  const result = await runMutation(process.execPath, [slowPath], {
    custody,
    now: () => performance.now(),
    deadline: started + 5_000,
    timeoutMs: 1_000,
    killGraceMs: 300,
  });
  assert.equal(result.ok, false);
  assert.equal(result.timedOut, true);
  assert.ok(result.signal === 'SIGKILL' || result.signal === 'SIGTERM');
  assert.equal(existsSync(paths.pendingPath), true);
  custody.close();
  rmSync(stateRoot, { recursive: true, force: true });
  rmSync(script, { recursive: true, force: true });
});

test('cancellation latch prevents any later spawn', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-cancel-'));
  prepareState(stateRoot);
  const custody = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
  });
  custody.begin(ensureRequest('secret'));
  custody.cancel();
  const result = await runMutation(process.execPath, ['-e', '0'], {
    custody,
    timeoutMs: 5_000,
  });
  assert.equal(result.ok, false);
  custody.close();
  rmSync(stateRoot, { recursive: true, force: true });
});

test('close alone retains pending and blocks later acquisition', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-retain-'));
  const paths = prepareState(stateRoot);
  const retained = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
  });
  retained.begin(ensureRequest('obs-prometheus'));
  retained.close();
  assert.equal(existsSync(paths.pendingPath), true);
  await assert.rejects(
    () => acquireCustody(devKind.contextName, { stateRoot, lockWaitSec: 1 }),
    /pending receipt already exists/,
  );
  rmSync(stateRoot, { recursive: true, force: true });
});

test('held custody clear removes durable pending', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-clear-'));
  const paths = prepareState(stateRoot);
  const custody = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
  });
  custody.begin(ensureRequest());
  custody.clear();
  assert.equal(existsSync(paths.pendingPath), false);
  custody.close();
  rmSync(stateRoot, { recursive: true, force: true });
});

test('acquireCustody refuses symlink lock path', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-symlink-'));
  const paths = prepareState(stateRoot);
  rmSync(paths.lockPath, { force: true });
  symlinkSync('/etc/hosts', paths.lockPath);
  await assert.rejects(
    () => acquireCustody(devKind.contextName, { stateRoot, lockWaitSec: 1 }),
    /lock path is a symlink/,
  );
  rmSync(stateRoot, { recursive: true, force: true });
});

test('production state root remains owner-local', () => {
  assert.equal(
    resolveProductionStateRoot(),
    join(homedir(), '.local', 'state', 'offscreen-rpg'),
  );
});

test('release profile uses the same service-specific lock basename', () => {
  const release = readPlatformProfile('release');
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-release-'));
  const paths = custodyPaths(stateRoot, release.contextName);
  assert.match(paths.lockPath, /-observability\.lock$/);
  rmSync(stateRoot, { recursive: true, force: true });
});

test('unknown schema and replaced records stay fences', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-fence-'));
  const paths = prepareState(stateRoot);
  writeFileSync(paths.pendingPath, '{"schema":9}\n', { mode: 0o600 });
  assert.deepEqual(readPending(devKind.contextName, { stateRoot }), {
    pending: true,
    valid: false,
  });
  await assert.rejects(
    () => acquireCustody(devKind.contextName, { stateRoot, lockWaitSec: 1 }),
    /invalid receipt/,
  );
  rmSync(paths.pendingPath);
  const custody = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
  });
  custody.begin(ensureRequest());
  writeFileSync(paths.pendingPath, '{', { mode: 0o600 });
  assert.throws(() => custody.assertOwnPending(), /changed/);
  assert.equal(existsSync(paths.pendingPath), true);
  assert.throws(() => custody.clear(), /authority failed|changed/);
  assert.equal(existsSync(paths.lockPath), true);
  custody.close();
  rmSync(paths.pendingPath);
  const replaced = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
  });
  replaced.begin(ensureRequest());
  const body = readFileSync(paths.pendingPath);
  const copy = `${paths.pendingPath}.copy`;
  writeFileSync(copy, body, { mode: 0o600 });
  renameSync(copy, paths.pendingPath);
  assert.throws(() => replaced.assertOwnPending(), /changed/);
  assert.equal(existsSync(paths.pendingPath), true);
  replaced.close();
  rmSync(stateRoot, { recursive: true, force: true });
});

test('shared custody has no mutation methods and proof lock is separate', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-shared-'));
  prepareState(stateRoot);
  const shared = await acquireCustody(devKind.contextName, {
    stateRoot,
    mode: 'shared',
    lockWaitSec: 5,
  });
  const second = await acquireCustody(devKind.contextName, {
    stateRoot,
    mode: 'shared',
    lockWaitSec: 5,
  });
  assert.equal(shared.mode, 'shared');
  assert.equal('begin' in shared, false);
  assert.equal('clear' in shared, false);
  const proof = await acquireProofCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
  });
  assert.equal(proof.mode, 'proof');
  assert.equal('begin' in proof, false);
  assert.match(String(proof.fd), /^[0-9]+$/);
  await assert.rejects(
    () =>
      runMutation(process.execPath, ['-e', 'process.exit(0)'], {
        custody: shared,
        timeoutMs: 1_000,
      }),
    /exclusive/,
  );
  proof.close();
  second.close();
  shared.close();
  rmSync(stateRoot, { recursive: true, force: true });
});

test('compare advance binds namespace once and cancellation refuses clear', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-advance-'));
  const paths = prepareState(stateRoot);
  const custody = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
    fault: 'rename',
  });
  custody.begin(ensureRequest());
  assert.throws(
    () => custody.advance(ensureRequest('namespace', 'bound-uid')),
    /rename failed/,
  );
  assert.equal(existsSync(paths.pendingPath), true);
  custody.close();
  await assert.rejects(
    () => acquireCustody(devKind.contextName, { stateRoot, lockWaitSec: 1 }),
    /pending/,
  );
  rmSync(paths.pendingPath);
  const next = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
  });
  next.begin(ensureRequest());
  next.advance(ensureRequest('namespace', 'bound-uid'));
  assert.throws(
    () => next.advance(ensureRequest('namespace', 'other-uid')),
    /binding changed/,
  );
  next.cancel();
  assert.throws(() => next.clear(), /cancelled/);
  assert.equal(existsSync(paths.pendingPath), true);
  assert.equal(existsSync(paths.lockPath), true);
  next.close();
  rmSync(stateRoot, { recursive: true, force: true });
});

test('fsync failure keeps the pending fence and a traversed context is refused', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-fsync-'));
  prepareState(stateRoot);
  const custody = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
    fault: 'fsync',
  });
  assert.throws(() => custody.begin(ensureRequest()), /fsync failed/);
  custody.close();
  await assert.rejects(
    () =>
      acquireCustody(`../${devKind.contextName}`, {
        stateRoot,
        lockWaitSec: 1,
      }),
    /profile context/,
  );
  rmSync(stateRoot, { recursive: true, force: true });
});

test('aborted lock request does not leave the lock held', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-abort-'));
  const paths = prepareState(stateRoot);
  const signal = globalThis.AbortSignal.abort();
  await assert.rejects(
    () =>
      acquireCustody(devKind.contextName, {
        stateRoot,
        lockWaitSec: 5,
        signal,
      }),
    /lock/,
  );
  const after = flockContender(paths.lockPath);
  assert.equal(after.status, 0);
  assert.equal(existsSync(paths.lockPath), true);
  rmSync(stateRoot, { recursive: true, force: true });
});

test('close-unconfirmed mutation retains the lock fd and pending record', async (t) => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-unconfirmed-'));
  const paths = prepareState(stateRoot);
  const script = mkdtempSync(join(tmpdir(), 'obs-unconfirmed-'));
  const slowPath = join(script, 'slow.mjs');
  writeFileSync(slowPath, 'setTimeout(() => {}, 60_000);\n');
  const custody = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
  });
  custody.begin(ensureRequest());
  t.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const started = performance.now();
    const pending = runMutation(process.execPath, [slowPath], {
      custody,
      now: () => performance.now(),
      deadline: started + 30_000,
      timeoutMs: 10_000,
      killGraceMs: 2_000,
    });
    t.mock.timers.tick(20_000);
    const result = await pending;
    assert.equal(result.ok, false);
    assert.equal(result.closeUnconfirmed, true);
    assert.equal(result.attempted, true);
    assert.doesNotThrow(() => fstatSync(custody.fd));
    assert.throws(() => custody.clear(), /authority failed|changed|cancelled/);
    assert.equal(existsSync(paths.pendingPath), true);
    assert.throws(() => custody.close(), /still active/);
  } finally {
    t.mock.timers.reset();
    rmSync(script, { recursive: true, force: true });
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

const NAMESPACE = 'offscreen-observability';

function disruptionTuple() {
  return ensureRequest('obs-prometheus').tuple;
}

function disruptionBaseline() {
  return {
    collectorPodUid: 'collector-pod-uid',
    workloadUids: {
      'Deployment/obs-prometheus': 'prom-uid',
      'StatefulSet/obs-loki': 'loki-uid',
      'StatefulSet/obs-tempo': 'tempo-uid',
      'Deployment/obs-collector': 'collector-uid',
      'Deployment/obs-grafana': 'grafana-uid',
    },
    claims: [
      {
        name: 'obs-prometheus',
        uid: 'claim-prom-uid',
        volumeName: 'pv-prom',
        pvUid: 'pv-prom-uid',
        claimRef: {
          name: 'obs-prometheus',
          namespace: NAMESPACE,
          uid: 'claim-prom-uid',
        },
      },
      {
        name: 'storage-obs-loki-0',
        uid: 'claim-loki-uid',
        volumeName: 'pv-loki',
        pvUid: 'pv-loki-uid',
        claimRef: {
          name: 'storage-obs-loki-0',
          namespace: NAMESPACE,
          uid: 'claim-loki-uid',
        },
      },
      {
        name: 'storage-obs-tempo-0',
        uid: 'claim-tempo-uid',
        volumeName: 'pv-tempo',
        pvUid: 'pv-tempo-uid',
        claimRef: {
          name: 'storage-obs-tempo-0',
          namespace: NAMESPACE,
          uid: 'claim-tempo-uid',
        },
      },
    ],
  };
}

function outageBeginDetails(
  baseline = disruptionBaseline(),
  down = { resourceVersion: 'rv-down-1', generation: 4, outcome: 'planned' },
) {
  return {
    baseline,
    tempo: {
      uid: baseline.workloadUids['StatefulSet/obs-tempo'],
      originalReplicas: 1,
    },
    down,
    restore: null,
  };
}

function frozenIdentity(tuple = disruptionTuple(), snapshotPath = '/tmp/fake-kubeconfig') {
  return {
    snapshotPath,
    contextName: devKind.contextName,
    namespace: NAMESPACE,
    tuple,
  };
}

function mockOwnedChild(stdout) {
  const result = ownedChildResult(true, {
    attempted: true,
    stdout,
    exitCode: 0,
  });
  return {
    pid: 42,
    closed: Promise.resolve(result),
    outcome: Promise.resolve(result),
    stop() {
      return this.outcome;
    },
    onOutput() {},
  };
}

test('D10 shared handle does not expose restore helpers', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-d10-shared-'));
  prepareState(stateRoot);
  const shared = await acquireCustody(devKind.contextName, {
    stateRoot,
    mode: 'shared',
    lockWaitSec: 5,
  });
  assert.equal('restoreTempoOnce' in shared, false);
  assert.equal('finishCancelledOutage' in shared, false);
  assert.equal('confirmOutageDown' in shared, false);
  shared.close();
  rmSync(stateRoot, { recursive: true, force: true });
});

test('D10 normal cancellation blocks advance clear and mutation', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-d10-cancel-normal-'));
  prepareState(stateRoot);
  const custody = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
  });
  const baseline = disruptionBaseline();
  custody.begin({
    operation: 'outage',
    phase: 'outage-down',
    tuple: disruptionTuple(),
    details: outageBeginDetails(baseline),
  });
  custody.cancel();
  assert.throws(() => custody.advance(ensureRequest()), /cancelled/);
  assert.throws(() => custody.clear(), /cancelled/);
  const mutation = await runMutation(process.execPath, ['-e', '0'], {
    custody,
    timeoutMs: 1_000,
  });
  assert.equal(mutation.cancelled, true);
  custody.close();
  rmSync(stateRoot, { recursive: true, force: true });
});

test('D10 cancelled owned restore uses one fixed kubectl argv', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-d10-restore-argv-'));
  prepareState(stateRoot);
  const tuple = disruptionTuple();
  const baseline = disruptionBaseline();
  const childCalls = [];
  const custody = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
    startOwnedChild(command, args, options) {
      childCalls.push({ command, args, options });
      return mockOwnedChild(
        JSON.stringify({
          metadata: {
            uid: 'tempo-uid',
            generation: 6,
            resourceVersion: 'rv-restore',
          },
          spec: { replicas: 1 },
        }),
      );
    },
  });
  const details = outageBeginDetails(baseline);
  custody.begin({
    operation: 'outage',
    phase: 'outage-down',
    tuple,
    details,
  });
  custody.confirmOutageDown({
    observed: {
      uid: 'tempo-uid',
      resourceVersion: 'rv-down-2',
      generation: 5,
      replicas: 0,
    },
  });
  custody.cancel();
  const identity = frozenIdentity(tuple);
  const fresh = {
    uid: 'tempo-uid',
    resourceVersion: 'rv-fresh',
    generation: 5,
    replicas: 0,
    claims: baseline.claims,
    collectorPodUid: baseline.collectorPodUid,
  };
  const result = await custody.restoreTempoOnce(identity, { fresh, deadline: performance.now() + 30_000 });
  assert.equal(childCalls.length, 1);
  assert.equal(childCalls[0].command, 'kubectl');
  assert.deepEqual(childCalls[0].args, [
    'patch',
    'statefulset',
    'obs-tempo',
    '--kubeconfig',
    identity.snapshotPath,
    '--context',
    identity.contextName,
    '-n',
    identity.namespace,
    '--type=json',
    '-p',
    JSON.stringify([
      { op: 'test', path: '/metadata/uid', value: 'tempo-uid' },
      { op: 'test', path: '/metadata/resourceVersion', value: 'rv-fresh' },
      { op: 'test', path: '/metadata/generation', value: 5 },
      { op: 'test', path: '/spec/replicas', value: 0 },
      { op: 'replace', path: '/spec/replicas', value: 1 },
    ]),
    '-o',
    'json',
  ]);
  assert.equal(result.restorationAttempted, true);
  assert.equal(result.ok, true);
  custody.close();
  rmSync(stateRoot, { recursive: true, force: true });
});

test('D10 second restore attempt is denied', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-d10-restore-twice-'));
  prepareState(stateRoot);
  const tuple = disruptionTuple();
  const baseline = disruptionBaseline();
  const custody = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
    startOwnedChild() {
      return mockOwnedChild(
        JSON.stringify({
          metadata: { uid: 'tempo-uid', generation: 6 },
          spec: { replicas: 1 },
        }),
      );
    },
  });
  custody.begin({
    operation: 'outage',
    phase: 'outage-down',
    tuple,
    details: outageBeginDetails(baseline),
  });
  custody.confirmOutageDown({
    observed: {
      uid: 'tempo-uid',
      resourceVersion: 'rv-down-2',
      generation: 5,
      replicas: 0,
    },
  });
  const identity = frozenIdentity(tuple);
  const fresh = {
    uid: 'tempo-uid',
    resourceVersion: 'rv-fresh',
    generation: 5,
    replicas: 0,
    claims: baseline.claims,
    collectorPodUid: baseline.collectorPodUid,
  };
  await custody.restoreTempoOnce(identity, { fresh, deadline: performance.now() + 30_000 });
  await assert.rejects(
    () => custody.restoreTempoOnce(identity, { fresh, deadline: performance.now() + 30_000 }),
    /outage-down|already attempted/,
  );
  custody.close();
  rmSync(stateRoot, { recursive: true, force: true });
});

test('D10 unknown down still allows one compensation and retains pending', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-d10-unknown-down-'));
  const paths = prepareState(stateRoot);
  const tuple = disruptionTuple();
  const baseline = disruptionBaseline();
  const custody = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
    startOwnedChild() {
      return mockOwnedChild(
        JSON.stringify({
          metadata: { uid: 'tempo-uid', generation: 6 },
          spec: { replicas: 1 },
        }),
      );
    },
  });
  custody.begin({
    operation: 'outage',
    phase: 'outage-down',
    tuple,
    details: outageBeginDetails(baseline),
  });
  custody.confirmOutageDown({ notAttempted: false });
  const identity = frozenIdentity(tuple);
  const fresh = {
    uid: 'tempo-uid',
    resourceVersion: 'rv-fresh',
    generation: 5,
    replicas: 0,
    claims: baseline.claims,
    collectorPodUid: baseline.collectorPodUid,
  };
  await custody.restoreTempoOnce(identity, { fresh, deadline: performance.now() + 30_000 });
  assert.equal(existsSync(paths.pendingPath), true);
  custody.close();
  rmSync(stateRoot, { recursive: true, force: true });
});

test('D10 unknown restore blocks compare-clear', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-d10-unknown-restore-'));
  const paths = prepareState(stateRoot);
  const tuple = disruptionTuple();
  const baseline = disruptionBaseline();
  const custody = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
    startOwnedChild() {
      return mockOwnedChild('');
    },
  });
  custody.begin({
    operation: 'outage',
    phase: 'outage-down',
    tuple,
    details: outageBeginDetails(baseline),
  });
  custody.confirmOutageDown({
    observed: {
      uid: 'tempo-uid',
      resourceVersion: 'rv-down-2',
      generation: 5,
      replicas: 0,
    },
  });
  const identity = frozenIdentity(tuple);
  await custody.restoreTempoOnce(identity, {
    fresh: {
      uid: 'tempo-uid',
      resourceVersion: 'rv-fresh',
      generation: 5,
      replicas: 0,
      claims: baseline.claims,
      collectorPodUid: baseline.collectorPodUid,
    },
    deadline: performance.now() + 30_000,
  });
  assert.throws(() => custody.clear(), /cancelled|authority|restore/);
  assert.throws(
    () =>
      custody.finishCancelledOutage(identity, {
        verified: {
          tempo: { uid: 'tempo-uid', replicas: 1, generation: 6 },
          claims: baseline.claims,
          collectorPodUid: baseline.collectorPodUid,
          workloadUids: baseline.workloadUids,
        },
      }),
    /uncertain/,
  );
  assert.equal(existsSync(paths.pendingPath), true);
  custody.close();
  rmSync(stateRoot, { recursive: true, force: true });
});

test('D10 close-unconfirmed refuses restore', async (t) => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-d10-close-unconfirmed-'));
  const paths = prepareState(stateRoot);
  const script = mkdtempSync(join(tmpdir(), 'obs-d10-unconfirmed-'));
  const slowPath = join(script, 'slow.mjs');
  writeFileSync(slowPath, 'setTimeout(() => {}, 60_000);\n');
  const tuple = disruptionTuple();
  const baseline = disruptionBaseline();
  const custody = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
  });
  custody.begin({
    operation: 'outage',
    phase: 'outage-down',
    tuple,
    details: outageBeginDetails(baseline),
  });
  custody.confirmOutageDown({
    observed: {
      uid: 'tempo-uid',
      resourceVersion: 'rv-down-2',
      generation: 5,
      replicas: 0,
    },
  });
  t.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const started = performance.now();
    const pending = runMutation(process.execPath, [slowPath], {
      custody,
      now: () => performance.now(),
      deadline: started + 30_000,
      timeoutMs: 10_000,
      killGraceMs: 2_000,
    });
    t.mock.timers.tick(20_000);
    const result = await pending;
    assert.equal(result.closeUnconfirmed, true);
    await assert.rejects(
      () =>
        custody.restoreTempoOnce(frozenIdentity(tuple), {
          fresh: {
            uid: 'tempo-uid',
            resourceVersion: 'rv-fresh',
            generation: 5,
            replicas: 0,
            claims: baseline.claims,
            collectorPodUid: baseline.collectorPodUid,
          },
          deadline: performance.now() + 30_000,
        }),
      /authority failed/,
    );
    assert.equal(existsSync(paths.pendingPath), true);
  } finally {
    t.mock.timers.reset();
    rmSync(script, { recursive: true, force: true });
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('D10 restore refuses wrong fresh identity and claims', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-d10-restore-refuse-'));
  const tuple = disruptionTuple();
  const baseline = disruptionBaseline();
  const custody = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
  });
  custody.begin({
    operation: 'outage',
    phase: 'outage-down',
    tuple,
    details: outageBeginDetails(baseline),
  });
  custody.confirmOutageDown({
    observed: {
      uid: 'tempo-uid',
      resourceVersion: 'rv-down-2',
      generation: 5,
      replicas: 0,
    },
  });
  const identity = frozenIdentity(tuple);
  await assert.rejects(
    () =>
      custody.restoreTempoOnce(identity, {
        fresh: {
          uid: 'other-uid',
          resourceVersion: 'rv-fresh',
          generation: 5,
          replicas: 0,
          claims: baseline.claims,
          collectorPodUid: baseline.collectorPodUid,
        },
        deadline: performance.now() + 30_000,
      }),
    /fresh state is invalid/,
  );
  await assert.rejects(
    () =>
      custody.restoreTempoOnce(identity, {
        fresh: {
          uid: 'tempo-uid',
          resourceVersion: 'rv-down-2',
          generation: 5,
          replicas: 0,
          claims: baseline.claims,
          collectorPodUid: baseline.collectorPodUid,
        },
        deadline: performance.now() + 30_000,
      }),
    /fresh state is invalid/,
  );
  const claims = globalThis.structuredClone(baseline.claims);
  claims[0].uid = 'changed';
  await assert.rejects(
    () =>
      custody.restoreTempoOnce(identity, {
        fresh: {
          uid: 'tempo-uid',
          resourceVersion: 'rv-fresh',
          generation: 5,
          replicas: 0,
          claims,
          collectorPodUid: baseline.collectorPodUid,
        },
        deadline: performance.now() + 30_000,
      }),
    /fresh state is invalid/,
  );
  custody.close();
  rmSync(stateRoot, { recursive: true, force: true });
});

test('D10 missing or replaced pending refuses restore', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-d10-pending-replace-'));
  const paths = prepareState(stateRoot);
  const tuple = disruptionTuple();
  const baseline = disruptionBaseline();
  const custody = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
  });
  custody.begin({
    operation: 'outage',
    phase: 'outage-down',
    tuple,
    details: outageBeginDetails(baseline),
  });
  custody.confirmOutageDown({
    observed: {
      uid: 'tempo-uid',
      resourceVersion: 'rv-down-2',
      generation: 5,
      replicas: 0,
    },
  });
  writeFileSync(paths.pendingPath, '{', { mode: 0o600 });
  await assert.rejects(
    () =>
      custody.restoreTempoOnce(frozenIdentity(tuple), {
        fresh: {
          uid: 'tempo-uid',
          resourceVersion: 'rv-fresh',
          generation: 5,
          replicas: 0,
          claims: baseline.claims,
          collectorPodUid: baseline.collectorPodUid,
        },
        deadline: performance.now() + 30_000,
      }),
    /changed|invalid/,
  );
  custody.close();
  rmSync(stateRoot, { recursive: true, force: true });
});

test('D10 finishCancelledOutage clears only exact verified projection', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-d10-finish-cancelled-'));
  const paths = prepareState(stateRoot);
  const tuple = disruptionTuple();
  const baseline = disruptionBaseline();
  const custody = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
    startOwnedChild() {
      return mockOwnedChild(
        JSON.stringify({
          metadata: { uid: 'tempo-uid', generation: 6 },
          spec: { replicas: 1 },
        }),
      );
    },
  });
  custody.begin({
    operation: 'outage',
    phase: 'outage-down',
    tuple,
    details: outageBeginDetails(baseline),
  });
  custody.confirmOutageDown({
    observed: {
      uid: 'tempo-uid',
      resourceVersion: 'rv-down-2',
      generation: 5,
      replicas: 0,
    },
  });
  const identity = frozenIdentity(tuple);
  await custody.restoreTempoOnce(identity, {
    fresh: {
      uid: 'tempo-uid',
      resourceVersion: 'rv-fresh',
      generation: 5,
      replicas: 0,
      claims: baseline.claims,
      collectorPodUid: baseline.collectorPodUid,
    },
    deadline: performance.now() + 30_000,
  });
  custody.finishCancelledOutage(identity, {
    verified: {
      tempo: { uid: 'tempo-uid', replicas: 1, generation: 6 },
      claims: baseline.claims,
      collectorPodUid: baseline.collectorPodUid,
      workloadUids: baseline.workloadUids,
    },
  });
  assert.equal(existsSync(paths.pendingPath), false);
  custody.close();
  rmSync(stateRoot, { recursive: true, force: true });
});

test('D10 failed final projection refuses compare-clear', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-d10-finish-bad-'));
  const paths = prepareState(stateRoot);
  const tuple = disruptionTuple();
  const baseline = disruptionBaseline();
  const custody = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
    startOwnedChild() {
      return mockOwnedChild(
        JSON.stringify({
          metadata: { uid: 'tempo-uid', generation: 6 },
          spec: { replicas: 1 },
        }),
      );
    },
  });
  custody.begin({
    operation: 'outage',
    phase: 'outage-down',
    tuple,
    details: outageBeginDetails(baseline),
  });
  custody.confirmOutageDown({
    observed: {
      uid: 'tempo-uid',
      resourceVersion: 'rv-down-2',
      generation: 5,
      replicas: 0,
    },
  });
  const identity = frozenIdentity(tuple);
  await custody.restoreTempoOnce(identity, {
    fresh: {
      uid: 'tempo-uid',
      resourceVersion: 'rv-fresh',
      generation: 5,
      replicas: 0,
      claims: baseline.claims,
      collectorPodUid: baseline.collectorPodUid,
    },
    deadline: performance.now() + 30_000,
  });
  assert.throws(
    () =>
      custody.finishCancelledOutage(identity, {
        verified: {
          tempo: { uid: 'tempo-uid', replicas: 1, generation: 99 },
          claims: baseline.claims,
          collectorPodUid: baseline.collectorPodUid,
          workloadUids: baseline.workloadUids,
        },
      }),
    /verified tempo invalid/,
  );
  assert.equal(existsSync(paths.pendingPath), true);
  custody.close();
  rmSync(stateRoot, { recursive: true, force: true });
});

test('D10 public advance is refused after cancellation for outage down confirm', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-d10-outage-advance-cancel-'));
  prepareState(stateRoot);
  const custody = await acquireCustody(devKind.contextName, {
    stateRoot,
    lockWaitSec: 5,
  });
  custody.begin({
    operation: 'outage',
    phase: 'outage-down',
    tuple: disruptionTuple(),
    details: outageBeginDetails(),
  });
  custody.cancel();
  assert.throws(
    () =>
      custody.confirmOutageDown({
        observed: {
          uid: 'tempo-uid',
          resourceVersion: 'rv-down-2',
          generation: 5,
          replicas: 0,
        },
      }),
    /cancelled/,
  );
  custody.close();
  rmSync(stateRoot, { recursive: true, force: true });
});

/** @param {string} [history] */
function e2Request(history = 'developer-fresh', mutate = (details) => details) {
  const request = ensureRequest('prometheus-intent', 'namespace-uid');
  request.operation = 'upgrade-e2';
  request.details = mutate({
    predecessorId: 'dev-e1-developer',
    predecessorHistoryId: history,
    targetId: 'dev-e2',
    predecessorManifestSetSha256: 'aa'.repeat(32),
    targetManifestSetSha256: 'bb'.repeat(32),
    kubeletTrustBindingSha256: 'cc'.repeat(32),
    originalCollectorRevision: history === 'developer-fresh' ? 1 : 2,
    originalPrometheusRevision: 1,
    originalGrafanaRevision: 1,
    targetPrometheusRevision: 2,
    targetGrafanaRevision: 2,
    preservedUids: { namespace: 'namespace-uid', claim: 'claim-uid' },
    markerIds: { trace: 'trace-id' },
  });
  return request;
}

/** @param {string} historyId @param {string | null} phase */
function verdict(historyId, phase) {
  return { ok: true, detail: 'owned-history-shape', artifactId: 'x', historyId, phase };
}

/** @param {string} stateRoot */
async function e2Custody(stateRoot) {
  return acquireCustody(devKind.contextName, { stateRoot, lockWaitSec: 5 });
}

/** @param {any} custody @param {string} phase @param {any} verified @param {any} [details] */
function e2Advance(custody, phase, verified, details) {
  const request = ensureRequest(phase, 'namespace-uid');
  request.details = details ?? custody.assertOwnPending().details;
  return custody.advance({ ...request, verified });
}

test('upgrade-e2 runs the three fixed phases and clears only from final', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-e2-'));
  const paths = prepareState(stateRoot);
  const custody = await e2Custody(stateRoot);
  custody.begin(e2Request('developer-upgraded'));
  const first = custody.assertOwnPending();
  assert.equal(first.operation, 'upgrade-e2');
  assert.equal(first.phase, 'prometheus-intent');
  assert.equal(inspectPendingRecord(devKind.contextName, { stateRoot }).outcome, 'record');
  assert.throws(
    () => custody.clear({ verified: verdict('e2-from-developer-upgraded', null) }),
    /not final/,
  );
  e2Advance(custody, 'grafana-intent', verdict('developer-upgraded', 'prometheus-intent'));
  e2Advance(custody, 'final-verification', verdict('e2-from-developer-upgraded', null));
  assert.equal(custody.assertOwnPending().phase, 'final-verification');
  custody.clear({ verified: verdict('e2-from-developer-upgraded', null) });
  assert.equal(existsSync(paths.pendingPath), false);
  custody.close();
  rmSync(stateRoot, { recursive: true, force: true });
});

test('upgrade-e2 refuses invalid begin shapes without a record', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-e2-bad-'));
  const paths = prepareState(stateRoot);
  const custody = await e2Custody(stateRoot);
  const bad = [
    e2Request('developer-fresh', (d) => ({ ...d, extra: 1 })),
    e2Request('developer-fresh', ({ markerIds, ...d }) => d),
    e2Request('e2-from-developer-fresh'),
    e2Request('developer-base'),
    e2Request('developer-fresh', (d) => ({ ...d, predecessorId: 'dev-e1-base' })),
    e2Request('developer-fresh', (d) => ({ ...d, targetId: 'dev-e1-developer' })),
    e2Request('developer-fresh', (d) => ({ ...d, originalCollectorRevision: 2 })),
    e2Request('developer-fresh', (d) => ({ ...d, originalPrometheusRevision: 2 })),
    e2Request('developer-fresh', (d) => ({ ...d, targetGrafanaRevision: 1 })),
    e2Request('developer-fresh', (d) => ({ ...d, targetManifestSetSha256: 'AB'.repeat(32) })),
    e2Request('developer-fresh', (d) => ({ ...d, kubeletTrustBindingSha256: 'ab' })),
    e2Request('developer-fresh', (d) => ({ ...d, preservedUids: {} })),
    e2Request('developer-fresh', (d) => ({ ...d, markerIds: { trace: 7 } })),
  ];
  for (const request of bad) {
    assert.throws(() => custody.begin(request), /upgrade-e2 details are invalid/);
  }
  for (const phase of ['grafana-intent', 'final-verification', 'other']) {
    const request = e2Request();
    request.phase = phase;
    assert.throws(() => custody.begin(request), /phase is invalid/);
  }
  assert.equal(existsSync(paths.pendingPath), false);
  custody.begin(e2Request());
  assert.throws(() => custody.begin(e2Request()), /already established/);
  custody.close();
  rmSync(stateRoot, { recursive: true, force: true });
});

test('upgrade-e2 refuses unverified, wrong, skipped and mutated advance', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-e2-adv-'));
  prepareState(stateRoot);
  const custody = await e2Custody(stateRoot);
  custody.begin(e2Request());
  const start = custody.assertOwnPending();
  const good = verdict('developer-fresh', 'prometheus-intent');
  const refusals = [
    ['grafana-intent', undefined, /verification is missing/],
    ['grafana-intent', { ...good, ok: false }, /verification is missing/],
    ['grafana-intent', { ...good, detail: 'x' }, /verification is missing/],
    ['grafana-intent', verdict('developer-fresh', null), /verification is missing/],
    ['grafana-intent', verdict('developer-upgraded', 'prometheus-intent'), /verification is missing/],
    ['grafana-intent', verdict('e2-from-developer-fresh', null), /verification is missing/],
    ['final-verification', verdict('e2-from-developer-fresh', null), /out of order/],
    ['prometheus-intent', good, /out of order/],
    ['bogus', good, /out of order/],
  ];
  for (const [phase, verified, pattern] of refusals) {
    assert.throws(() => e2Advance(custody, phase, verified), pattern);
    assert.deepEqual(custody.assertOwnPending(), start);
  }
  assert.throws(
    () =>
      e2Advance(custody, 'grafana-intent', good, {
        ...start.details,
        markerIds: { trace: 'other' },
      }),
    /details changed/,
  );
  assert.throws(
    () => e2Advance(custody, 'grafana-intent', good, { ...start.details, x: 1 }),
    /details are invalid/,
  );
  assert.deepEqual(custody.assertOwnPending(), start);
  e2Advance(custody, 'grafana-intent', good);
  // stale verdict for the previous row cannot advance or clear later phases
  assert.throws(() => e2Advance(custody, 'final-verification', good), /verification is missing/);
  assert.throws(() => custody.clear({ verified: good }), /not final/);
  e2Advance(custody, 'final-verification', verdict('e2-from-developer-fresh', null));
  for (const verified of [undefined, good, verdict('developer-fresh', null), { ...verdict('e2-from-developer-fresh', null), ok: false }]) {
    assert.throws(() => custody.clear(verified === undefined ? undefined : { verified }), /verification is missing/);
  }
  assert.throws(() => e2Advance(custody, 'final-verification', verdict('e2-from-developer-fresh', null)), /out of order/);
  assert.equal(custody.assertOwnPending().phase, 'final-verification');
  custody.close();
  rmSync(stateRoot, { recursive: true, force: true });
});

test('upgrade-e2 tuple and namespace binding stay immutable', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-e2-tuple-'));
  prepareState(stateRoot);
  const custody = await e2Custody(stateRoot);
  custody.begin(e2Request());
  const request = ensureRequest('grafana-intent', 'other-uid');
  request.details = custody.assertOwnPending().details;
  assert.throws(
    () => custody.advance({ ...request, verified: verdict('developer-fresh', 'prometheus-intent') }),
    /namespace binding changed/,
  );
  custody.close();
  rmSync(stateRoot, { recursive: true, force: true });
});

test('upgrade-e2 lost, replaced or malformed pending cannot advance or clear', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-e2-lost-'));
  const paths = prepareState(stateRoot);
  const custody = await e2Custody(stateRoot);
  custody.begin(e2Request());
  const body = readFileSync(paths.pendingPath);
  const copy = `${paths.pendingPath}.copy`;
  writeFileSync(copy, body, { mode: 0o600 });
  renameSync(copy, paths.pendingPath);
  assert.throws(() => custody.assertOwnPending(), /changed/);
  assert.throws(
    () => e2Advance(custody, 'grafana-intent', verdict('developer-fresh', 'prometheus-intent'), e2Request().details),
    /authority failed|changed/,
  );
  assert.throws(
    () => custody.clear({ verified: verdict('e2-from-developer-fresh', null) }),
    /authority failed|changed|not final/,
  );
  assert.equal(JSON.parse(readFileSync(paths.pendingPath, 'utf8')).phase, 'prometheus-intent');
  custody.close();
  rmSync(stateRoot, { recursive: true, force: true });
});

test('upgrade-e2 records from a foreign owner or malformed shape stay fences', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-e2-fence-'));
  const paths = prepareState(stateRoot);
  const owner = await e2Custody(stateRoot);
  owner.begin(e2Request());
  const valid = JSON.parse(readFileSync(paths.pendingPath, 'utf8'));
  owner.close();
  // a fresh handle never adopts the valid record
  const second = await e2Custody(stateRoot).catch((error) => error);
  assert.match(String(second?.message ?? ''), /pending|receipt/);
  assert.equal(readPending(devKind.contextName, { stateRoot }).pending, true);
  assert.throws(() => (second.assertOwnPending ?? (() => { throw new Error('none'); }))());
  const variants = [
    { ...valid, extra: true },
    { ...valid, phase: 'collector-upgrade' },
    { ...valid, phase: 'unknown' },
    { ...valid, operation: 'upgrade-e3' },
    { ...valid, details: { ...valid.details, extra: 1 } },
    { ...valid, details: { ...valid.details, predecessorHistoryId: 'developer-base' } },
    { ...valid, details: { ...valid.details, kubeletTrustBindingSha256: 'zz' } },
    { ...valid, context: 'other' },
  ];
  for (const variant of variants) {
    writeFileSync(paths.pendingPath, `${JSON.stringify(variant)}\n`, { mode: 0o600 });
    assert.deepEqual(readPending(devKind.contextName, { stateRoot }), {
      pending: true,
      valid: false,
    });
    assert.equal(inspectPendingRecord(devKind.contextName, { stateRoot }).outcome, 'invalid');
    await assert.rejects(
      () => acquireCustody(devKind.contextName, { stateRoot, lockWaitSec: 1 }),
      /invalid receipt/,
    );
  }
  // legacy (schema-less) pending remains a fence
  writeFileSync(
    paths.pendingPath,
    `${JSON.stringify({ operationId: 'op', service: 'observability', context: devKind.contextName, phase: 'x', tuple: {}, start: 'now' })}\n`,
    { mode: 0o600 },
  );
  assert.equal(inspectPendingRecord(devKind.contextName, { stateRoot }).outcome, 'legacy');
  rmSync(stateRoot, { recursive: true, force: true });
});

test('ensure and historical upgrade records cannot use the E2 advance or clear gate', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-custody-e2-ens-'));
  prepareState(stateRoot);
  const custody = await e2Custody(stateRoot);
  custody.begin(ensureRequest());
  assert.throws(
    () => custody.advance({ ...ensureRequest('obs-grafana', 'namespace-uid'), details: e2Request().details }),
    /ensure details must be empty/,
  );
  custody.clear();
  custody.close();
  rmSync(stateRoot, { recursive: true, force: true });
});
