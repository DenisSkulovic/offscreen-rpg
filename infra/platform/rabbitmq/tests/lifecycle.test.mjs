import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, URL } from 'node:url';
import test from 'node:test';

import {
  DEV_API_PORT_RANGE,
  readKindProfile,
} from '../../../clusters/kind/manager/config.mjs';
import {
  DEV_BASELINE_NAMESPACE,
  DEV_CLUSTER_OWNER,
} from '../../../clusters/kind/manager/dev-bootstrap.mjs';
import {
  acquireRabbitmqLock,
  resolveGitCommonDirectory,
} from '../custody.mjs';
import {
  ensureRabbitmqInstall,
  lockedEnsureRabbitmq,
  planRabbitmqInstall,
} from '../install.mjs';
import { rabbitmqTargetFromProfile } from '../inventory.mjs';

const devKind = readKindProfile('dev');
const devTarget = rabbitmqTargetFromProfile('dev');
const devPort = DEV_API_PORT_RANGE.start;

const workerPath = fileURLToPath(
  new URL('./lifecycle-custody-worker.mjs', import.meta.url),
);
const installSh = fileURLToPath(new URL('../install.sh', import.meta.url));

function ok(stdout = '', status = 0) {
  return {
    ok: status === 0,
    status,
    stdout,
    stderr: '',
    timedOut: false,
    missing: false,
    ambiguous: false,
  };
}

/** @param {Record<string, unknown>} [extra] */
function stubTargetRun(extra = {}) {
  let baselineUid = 'baseline-uid-1';
  return (command, args, options) => {
    if (command === 'kind' && args[0] === 'get' && args[1] === 'clusters') {
      return ok(`${devKind.clusterName}\n`);
    }
    if (
      command === 'kubectl' &&
      args.includes('config') &&
      args.includes('view') &&
      args.includes('json')
    ) {
      return ok(
        JSON.stringify({
          clusters: [
            {
              name: `kind-${devKind.clusterName}`,
              cluster: { server: `https://127.0.0.1:${devPort}` },
            },
          ],
          contexts: [
            {
              name: devKind.contextName,
              context: {
                cluster: `kind-${devKind.clusterName}`,
                user: `kind-${devKind.clusterName}`,
              },
            },
          ],
          users: [{ name: `kind-${devKind.clusterName}`, user: {} }],
        }),
      );
    }
    if (
      command === 'kubectl' &&
      args.includes('namespace') &&
      args.includes(DEV_BASELINE_NAMESPACE)
    ) {
      return ok(
        JSON.stringify({
          metadata: {
            name: DEV_BASELINE_NAMESPACE,
            uid: baselineUid,
            labels: { 'offscreen.dev/owner': DEV_CLUSTER_OWNER },
          },
        }),
      );
    }
    if (
      command === 'kubectl' &&
      args.includes('storageclass') &&
      args.includes('standard')
    ) {
      return ok('storageclass.storage.k8s.io/standard\n');
    }
    if (typeof extra.run === 'function') {
      return extra.run(command, args, options, {
        setBaselineUid: (uid) => {
          baselineUid = uid;
        },
      });
    }
    return ok();
  };
}

test('flock inheritance blocks contenders until child exits', async () => {
  const commonDir = mkdtempSync(join(tmpdir(), 'rabbitmq-common-'));
  const helper = spawn(
    process.execPath,
    [workerPath, commonDir, devKind.contextName, '2500'],
    { stdio: 'ignore', detached: true },
  );
  helper.unref();
  await delay(400);
  assert.throws(
    () =>
      acquireRabbitmqLock(devKind.contextName, {
        commonDir,
        lockWaitSec: 1,
        lockAcquireMs: 2_000,
      }),
    /lock unavailable/,
    'contender should be blocked while child holds flock',
  );
  await delay(2800);
  const after = acquireRabbitmqLock(devKind.contextName, {
    commonDir,
    lockWaitSec: 1,
    lockAcquireMs: 2_000,
  });
  after.release();
  rmSync(commonDir, { recursive: true, force: true });
});

test('ensure refuses without explicit authorization', () => {
  const prior = process.env.OFFSCREEN_RABBITMQ_ENSURE;
  delete process.env.OFFSCREEN_RABBITMQ_ENSURE;
  try {
    const result = ensureRabbitmqInstall('dev', devKind.contextName, {
      commonDir: mkdtempSync(join(tmpdir(), 'rabbitmq-ensure-')),
      run: stubTargetRun(),
    });
    assert.equal(result.ok, false);
    assert.equal(result.mutation, 'none');
    assert.equal(result.reasonCode, 'ensure-not-authorized');
  } finally {
    if (prior === undefined) {
      delete process.env.OFFSCREEN_RABBITMQ_ENSURE;
    } else {
      process.env.OFFSCREEN_RABBITMQ_ENSURE = prior;
    }
  }
});

test('no-arg install.sh wrapper refuses before writes', () => {
  const prior = process.env.OFFSCREEN_RABBITMQ_ENSURE;
  delete process.env.OFFSCREEN_RABBITMQ_ENSURE;
  try {
    const result = spawnSync('bash', [installSh], {
      encoding: 'utf8',
      env: { ...process.env, OFFSCREEN_RABBITMQ_ENSURE: undefined },
    });
    assert.equal(result.status, 2);
    const line = String(result.stdout)
      .trim()
      .split('\n')
      .filter(Boolean)
      .at(-1);
    const parsed = JSON.parse(line ?? '{}');
    assert.equal(parsed.reasonCode, 'ensure-not-authorized');
    assert.equal(parsed.mutation, 'none');
  } finally {
    if (prior === undefined) delete process.env.OFFSCREEN_RABBITMQ_ENSURE;
    else process.env.OFFSCREEN_RABBITMQ_ENSURE = prior;
  }
});

test('plan refuses malformed context before any write', () => {
  const calls = [];
  const result = planRabbitmqInstall('dev', 'kind-offscreen-release', {
    run: (command, args) => {
      calls.push([command, ...args]);
      return stubTargetRun()(command, args);
    },
    skipTargetAssert: true,
  });
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'context-mismatch');
  assert.equal(
    calls.some(
      (call) =>
        String(call).includes('create') || String(call).includes('apply'),
    ),
    false,
  );
});

test('repeat ensure under lock issues zero write commands', () => {
  const calls = [];
  const lock = acquireRabbitmqLock(devKind.contextName, {
    commonDir: mkdtempSync(join(tmpdir(), 'rabbitmq-repeat-')),
  });
  const prior = process.env.OFFSCREEN_RABBITMQ_ENSURE;
  process.env.OFFSCREEN_RABBITMQ_ENSURE = 'authorized';
  try {
    const result = lockedEnsureRabbitmq(
      'dev',
      devKind.contextName,
      process.hrtime.bigint() + 60_000_000_000n,
      lock.lockFd,
      {
        skipWaits: true,
        skipTargetAssert: true,
        observeInventory: () => ({
          state: 'recognized',
          reason: 'recognized-install',
          targetBroker: { state: 'present', object: recognizedFixtureBroker() },
        }),
        observeReady: () => ({
          ok: true,
          state: 'ready',
          reason: 'structural-ready',
        }),
        run: (command, args, options) => {
          calls.push([command, ...args]);
          return stubTargetRun()(command, args, options);
        },
      },
    );
    assert.equal(result.ok, true);
    assert.equal(result.mutation, 'none');
    assert.equal(
      calls.some((call) => {
        const text = call.join(' ');
        return (
          (text.includes('create') && !text.includes('dry-run')) ||
          text.includes(' apply ')
        );
      }),
      false,
    );
  } finally {
    lock.release();
    if (prior === undefined) delete process.env.OFFSCREEN_RABBITMQ_ENSURE;
    else process.env.OFFSCREEN_RABBITMQ_ENSURE = prior;
  }
});

function recognizedFixtureBroker() {
  return {
    apiVersion: 'rabbitmq.com/v1beta1',
    kind: 'RabbitmqCluster',
    metadata: {
      name: devTarget.brokerName,
      namespace: devTarget.brokerNamespace,
      uid: 'cr-1',
      generation: 1,
      labels: { 'offscreen.rpg/rabbitmq-design': 'native-v1' },
    },
    spec: {
      replicas: 1,
      image:
        'docker.io/library/rabbitmq:4.3.4-management@sha256:eb5295d083325da5929a5ade766684d4019ffd2bce8bc7e43d6f9a05cafc8646',
      service: { type: 'ClusterIP' },
      persistence: { storageClassName: 'standard', storage: '5Gi' },
      resources: {
        requests: { cpu: '200m', memory: '1Gi' },
        limits: { cpu: '500m', memory: '1Gi' },
      },
    },
    status: {
      observedGeneration: 1,
      conditions: [
        { type: 'AllReplicasReady', status: 'True' },
        { type: 'ReconcileSuccess', status: 'True' },
      ],
      defaultUser: {
        serviceReference: {
          name: 'rabbitmq',
          namespace: devTarget.brokerNamespace,
        },
        secretReference: {
          name: 'rabbitmq-default-user',
          namespace: devTarget.brokerNamespace,
        },
      },
    },
  };
}

const absentInventory = () => ({
  state: 'absent',
  reason: 'fresh-absent',
  targetBroker: { state: 'absent' },
});

test('fresh ensure runs census before the first create', () => {
  const calls = [];
  let censusCalls = 0;
  const lock = acquireRabbitmqLock(devKind.contextName, {
    commonDir: mkdtempSync(join(tmpdir(), 'rabbitmq-stage-')),
  });
  const prior = process.env.OFFSCREEN_RABBITMQ_ENSURE;
  process.env.OFFSCREEN_RABBITMQ_ENSURE = 'authorized';
  try {
    lockedEnsureRabbitmq(
      'dev',
      devKind.contextName,
      process.hrtime.bigint() + 120_000_000_000n,
      lock.lockFd,
      {
        skipWaits: true,
        skipTargetAssert: true,
        baselineUid: 'baseline-uid-1',
        observeInventory: () => {
          censusCalls += 1;
          return absentInventory();
        },
        run: (command, args) => {
          calls.push([command, ...args]);
          const joined = args.join(' ');
          if (
            joined.includes(DEV_BASELINE_NAMESPACE) &&
            joined.includes('namespace')
          ) {
            return ok(
              JSON.stringify({
                metadata: {
                  name: DEV_BASELINE_NAMESPACE,
                  uid: 'baseline-uid-1',
                  labels: { 'offscreen.dev/owner': DEV_CLUSTER_OWNER },
                },
              }),
            );
          }
          if (joined.includes('storageclass')) {
            return ok('storageclass.storage.k8s.io/standard\n');
          }
          if (joined.includes('create') && !joined.includes('dry-run')) {
            return ok('', 0);
          }
          return ok('');
        },
      },
    );
    const firstCreate = calls.findIndex((call) => {
      const joined = call.join(' ');
      return joined.includes('create') && !joined.includes('dry-run');
    });
    assert.ok(censusCalls > 0);
    assert.ok(firstCreate >= 0);
    assert.equal(
      calls.some((call) => call.join(' ').includes(' apply ')),
      false,
    );
    assert.equal(
      calls.some((call) => call.join(' ').includes(' delete ')),
      false,
    );
  } finally {
    lock.release();
    if (prior === undefined) delete process.env.OFFSCREEN_RABBITMQ_ENSURE;
    else process.env.OFFSCREEN_RABBITMQ_ENSURE = prior;
  }
});

test('lost create response is possible and does not retry', () => {
  const calls = [];
  const lock = acquireRabbitmqLock(devKind.contextName, {
    commonDir: mkdtempSync(join(tmpdir(), 'rabbitmq-ambiguous-')),
  });
  const prior = process.env.OFFSCREEN_RABBITMQ_ENSURE;
  process.env.OFFSCREEN_RABBITMQ_ENSURE = 'authorized';
  let createCalls = 0;
  try {
    const result = lockedEnsureRabbitmq(
      'dev',
      devKind.contextName,
      process.hrtime.bigint() + 120_000_000_000n,
      lock.lockFd,
      {
        skipWaits: true,
        skipTargetAssert: true,
        baselineUid: 'baseline-uid-1',
        observeInventory: absentInventory,
        run: (command, args) => {
          calls.push([command, ...args]);
          const joined = args.join(' ');
          if (
            joined.includes(DEV_BASELINE_NAMESPACE) &&
            joined.includes('namespace')
          ) {
            return ok(
              JSON.stringify({
                metadata: {
                  name: DEV_BASELINE_NAMESPACE,
                  uid: 'baseline-uid-1',
                  labels: { 'offscreen.dev/owner': DEV_CLUSTER_OWNER },
                },
              }),
            );
          }
          if (joined.includes('storageclass')) {
            return ok('storageclass.storage.k8s.io/standard\n');
          }
          if (joined.includes('create') && !joined.includes('dry-run')) {
            createCalls += 1;
            if (createCalls === 1) {
              return {
                ok: false,
                status: null,
                stdout: '',
                stderr: '',
                timedOut: true,
                missing: false,
                ambiguous: true,
                signal: 'SIGKILL',
              };
            }
          }
          if (joined.includes('storageclass')) {
            return ok('storageclass.storage.k8s.io/standard\n');
          }
          if (
            joined.includes('rabbitmqclusters.rabbitmq.com') &&
            joined.includes('-A')
          ) {
            return ok(JSON.stringify({ items: [] }));
          }
          return ok('');
        },
      },
    );
    assert.equal(result.mutation, 'possible');
    assert.equal(result.reasonCode, 'ambiguous-write');
    assert.equal(createCalls, 1);
  } finally {
    lock.release();
    if (prior === undefined) delete process.env.OFFSCREEN_RABBITMQ_ENSURE;
    else process.env.OFFSCREEN_RABBITMQ_ENSURE = prior;
  }
});

test('baseline uid mismatch refuses before write phase', () => {
  const lock = acquireRabbitmqLock(devKind.contextName, {
    commonDir: mkdtempSync(join(tmpdir(), 'rabbitmq-uid-')),
  });
  const prior = process.env.OFFSCREEN_RABBITMQ_ENSURE;
  process.env.OFFSCREEN_RABBITMQ_ENSURE = 'authorized';
  let baselineReads = 0;
  try {
    const result = lockedEnsureRabbitmq(
      'dev',
      devKind.contextName,
      process.hrtime.bigint() + 120_000_000_000n,
      lock.lockFd,
      {
        skipWaits: true,
        skipTargetAssert: true,
        baselineUid: 'baseline-1',
        observeInventory: absentInventory,
        run: (command, args) => {
          const joined = args.join(' ');
          if (
            joined.includes(DEV_BASELINE_NAMESPACE) &&
            joined.includes('namespace')
          ) {
            baselineReads += 1;
            return ok(
              JSON.stringify({
                metadata: {
                  name: DEV_BASELINE_NAMESPACE,
                  uid: baselineReads === 1 ? 'baseline-1' : 'baseline-2',
                  labels: { 'offscreen.dev/owner': DEV_CLUSTER_OWNER },
                },
              }),
            );
          }
          if (joined.includes('storageclass')) {
            return ok('storageclass.storage.k8s.io/standard\n');
          }
          if (
            joined.includes('rabbitmqclusters.rabbitmq.com') &&
            joined.includes('-A')
          ) {
            return ok(JSON.stringify({ items: [] }));
          }
          if (joined.includes('create') && !joined.includes('dry-run')) {
            return ok();
          }
          return ok('');
        },
      },
    );
    assert.equal(result.ok, false);
    assert.equal(result.reasonCode, 'baseline-uid-mismatch');
  } finally {
    lock.release();
    if (prior === undefined) delete process.env.OFFSCREEN_RABBITMQ_ENSURE;
    else process.env.OFFSCREEN_RABBITMQ_ENSURE = prior;
  }
});

test('lock paths resolve under git common directory layout', () => {
  const commonDir = mkdtempSync(join(tmpdir(), 'rabbitmq-common-layout-'));
  const lock = acquireRabbitmqLock(devKind.contextName, { commonDir });
  assert.match(lock.lockPath, /kind-offscreen-dev-rabbitmq\.lock$/);
  lock.release();
  rmSync(commonDir, { recursive: true, force: true });
  assert.ok(resolveGitCommonDirectory().length > 0);
});
