import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEV_CNPG_CLUSTER,
  DEV_CNPG_CONTEXT,
  DEV_CNPG_NAMESPACE,
  DEV_CNPG_OWNER,
} from '../dev-bootstrap.mjs';
import { observeDevPostgresReady } from '../readiness.mjs';
import { CNPG_HEALTHY_PHASE } from '../topology.mjs';

const BASELINE_NAMESPACE = 'offscreen-dev-system';
const DEV_CLUSTER_NAME = 'offscreen-dev';

const WRITE_PATTERN = /\b(apply|create|delete|patch|replace)\b/i;

/**
 * @param {{
 *   currentPrimary?: string,
 *   podRole?: string | null,
 *   podClusterLabel?: string,
 *   clusterOwner?: string,
 *   ready?: boolean,
 *   clusterUnreadable?: boolean,
 *   podUnreadable?: boolean,
 *   sqlStdout?: string,
 *   sqlOk?: boolean,
 * }} [options]
 */
function createMockRun(options = {}) {
  const {
    currentPrimary = 'dev-pg-2',
    podRole = 'primary',
    podClusterLabel = DEV_CNPG_CLUSTER,
    clusterOwner = DEV_CNPG_OWNER,
    ready = true,
    clusterUnreadable = false,
    podUnreadable = false,
    sqlStdout = '1',
    sqlOk = true,
  } = options;
  const calls = [];

  const clusterBody = {
    metadata: {
      name: DEV_CNPG_CLUSTER,
      namespace: DEV_CNPG_NAMESPACE,
      labels: { 'offscreen.dev/owner': clusterOwner },
    },
    spec: { instances: 1 },
    status: {
      instances: 1,
      readyInstances: 1,
      phase: CNPG_HEALTHY_PHASE,
      conditions: ready ? [{ type: 'Ready', status: 'True' }] : [],
      currentPrimary,
    },
  };

  const podBody = {
    metadata: {
      name: currentPrimary,
      namespace: DEV_CNPG_NAMESPACE,
      labels:
        podRole == null
          ? { [String('cnpg.io/cluster')]: podClusterLabel }
          : {
              'cnpg.io/cluster': podClusterLabel,
              'cnpg.io/instanceRole': podRole,
            },
    },
  };

  /** @type {import('../../common/commands.mjs').runPlatformCommand} */
  const run = (command, args, runOptions = {}) => {
    calls.push({ command, args, runOptions });

    if (command === 'kind' && args[0] === 'get' && args[1] === 'clusters') {
      return { ok: true, status: 0, stdout: `${DEV_CLUSTER_NAME}\n` };
    }

    if (
      command === 'kubectl' &&
      args.includes('config') &&
      args.includes('view')
    ) {
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify({
          contexts: [
            {
              name: DEV_CNPG_CONTEXT,
              context: { cluster: `kind-${DEV_CLUSTER_NAME}` },
            },
          ],
          clusters: [
            {
              name: `kind-${DEV_CLUSTER_NAME}`,
              cluster: { server: 'https://127.0.0.1:24443' },
            },
          ],
        }),
      };
    }

    if (command === 'kubectl' && args.includes('get')) {
      const getIndex = args.indexOf('get');
      const resource = args[getIndex + 1];
      let name;
      if (args[getIndex + 2] === '-n') {
        name = args[getIndex + 4];
      } else {
        name = args[getIndex + 2];
      }
      if (resource === 'namespace' && name === BASELINE_NAMESPACE) {
        return {
          ok: true,
          status: 0,
          stdout: JSON.stringify({
            metadata: {
              name: BASELINE_NAMESPACE,
              uid: 'baseline-uid',
              labels: { 'offscreen.dev/owner': DEV_CNPG_OWNER },
            },
          }),
        };
      }
      if (
        resource === 'cluster.postgresql.cnpg.io' &&
        name === DEV_CNPG_CLUSTER
      ) {
        if (clusterUnreadable) {
          return { ok: false, status: 1, stdout: '', stderr: 'forbidden' };
        }
        return { ok: true, status: 0, stdout: JSON.stringify(clusterBody) };
      }
      if (resource === 'pod' && name === currentPrimary) {
        if (podUnreadable) {
          return { ok: false, status: 1, stdout: '', stderr: 'forbidden' };
        }
        return { ok: true, status: 0, stdout: JSON.stringify(podBody) };
      }
      return { ok: true, status: 0, stdout: '' };
    }

    if (command === 'kubectl' && args.includes('exec')) {
      const pod = args[args.indexOf('exec') + 1];
      assert.equal(pod, currentPrimary, 'sql probe must target currentPrimary');
      return {
        ok: sqlOk,
        status: sqlOk ? 0 : 1,
        stdout: sqlStdout,
        stderr: '',
      };
    }

    return { ok: false, status: 1, stdout: '', stderr: 'unexpected command' };
  };

  return { run, calls };
}

function assertNoWrites(calls) {
  for (const call of calls) {
    const joined = call.args.join(' ');
    assert.equal(WRITE_PATTERN.test(joined), false, joined);
  }
}

test('observation uses currentPrimary, not a fixed instance name', () => {
  const { run, calls } = createMockRun({ currentPrimary: 'dev-pg-2' });
  const result = observeDevPostgresReady({ run });
  assert.equal(result.ok, true);
  assert.equal(result.primaryPod, 'dev-pg-2');
  const execCall = calls.find(
    (call) => call.command === 'kubectl' && call.args.includes('exec'),
  );
  assert.equal(
    execCall?.args.at(execCall.args.indexOf('exec') + 1),
    'dev-pg-2',
  );
  assertNoWrites(calls);
});

test('unreadable cluster refuses without exec', () => {
  const { run, calls } = createMockRun({ clusterUnreadable: true });
  const result = observeDevPostgresReady({ run });
  assert.equal(result.ok, false);
  assert.match(result.detail ?? '', /unreadable/);
  assert.equal(
    calls.some((call) => call.args.includes('exec')),
    false,
  );
  assertNoWrites(calls);
});

test('foreign primary pod refuses before sql', () => {
  const { run, calls } = createMockRun({
    podClusterLabel: 'other-cluster',
    podRole: 'primary',
  });
  const result = observeDevPostgresReady({ run });
  assert.equal(result.ok, false);
  assert.match(result.detail ?? '', /foreign|cluster label/);
  assert.equal(
    calls.some((call) => call.args.includes('exec')),
    false,
  );
  assertNoWrites(calls);
});

test('unknown instance role refuses before sql', () => {
  const { run, calls } = createMockRun({ podRole: null });
  const result = observeDevPostgresReady({ run });
  assert.equal(result.ok, false);
  assert.match(result.detail ?? '', /unknown/);
  assert.equal(
    calls.some((call) => call.args.includes('exec')),
    false,
  );
  assertNoWrites(calls);
});

test('foreign cluster owner refuses', () => {
  const { run, calls } = createMockRun({ clusterOwner: 'foreign-owner' });
  const result = observeDevPostgresReady({ run });
  assert.equal(result.ok, false);
  assert.match(result.detail ?? '', /foreign ownership/);
  assertNoWrites(calls);
});

test('stale Ready, bad counts, and missing primary refuse', () => {
  const { run, calls } = createMockRun({ ready: false });
  const stale = observeDevPostgresReady({ run });
  assert.equal(stale.ok, false);
  assert.match(stale.detail ?? '', /Ready/);
  assertNoWrites(calls);

  const mismatchRun = (command, args, runOptions = {}) => {
    const mock = createMockRun();
    const base = mock.run(command, args, runOptions);
    if (command === 'kubectl' && args.includes('cluster.postgresql.cnpg.io')) {
      const body = JSON.parse(String(base.stdout));
      body.status.readyInstances = 0;
      return { ...base, stdout: JSON.stringify(body) };
    }
    return base;
  };
  const mismatch = observeDevPostgresReady({ run: mismatchRun });
  assert.equal(mismatch.ok, false);
  assert.match(mismatch.detail ?? '', /readyInstances/);

  let clusterBody;
  const missingPrimaryRun = (command, args, runOptions = {}) => {
    const mock = createMockRun();
    const base = mock.run(command, args, runOptions);
    if (command === 'kubectl' && args.includes('cluster.postgresql.cnpg.io')) {
      clusterBody = JSON.parse(String(base.stdout));
      delete clusterBody.status.currentPrimary;
      return { ...base, stdout: JSON.stringify(clusterBody) };
    }
    return base;
  };
  const primary = observeDevPostgresReady({ run: missingPrimaryRun });
  assert.equal(primary.ok, false);
  assert.match(primary.detail ?? '', /currentPrimary/);
});
