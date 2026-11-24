import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEV_TEMPORAL_CONTEXT,
  DEV_TEMPORAL_NAMESPACE,
  DEV_TEMPORAL_OWNER,
  DEV_TEMPORAL_SCHEMA_JOB,
} from '../dev-bootstrap.mjs';
import { observeDevTemporalReady } from '../readiness.mjs';

const BASELINE_NAMESPACE = 'offscreen-dev-system';
const DEV_CLUSTER_NAME = 'offscreen-dev';
const WRITE_PATTERN = /\b(apply|create|delete|patch|replace)\b/i;

/**
 * @param {{
 *   schemaSucceeded?: number,
 *   schemaFailed?: number,
 *   postgresReplicas?: number,
 *   serverReplicas?: number,
 *   jobAbsent?: boolean,
 *   legacyHealthy?: boolean,
 * }} [options]
 */
function createMockRun(options = {}) {
  const {
    schemaSucceeded = 1,
    schemaFailed = 0,
    postgresReplicas = 1,
    serverReplicas = 1,
    jobAbsent = false,
    legacyHealthy = false,
  } = options;
  const calls = [];

  const postgres = {
    metadata: {
      name: 'temporal-postgres',
      namespace: DEV_TEMPORAL_NAMESPACE,
      labels: { 'offscreen.dev/owner': DEV_TEMPORAL_OWNER },
    },
    status: { availableReplicas: postgresReplicas },
  };
  const server = {
    metadata: {
      name: 'temporal-server',
      namespace: DEV_TEMPORAL_NAMESPACE,
      labels: { 'offscreen.dev/owner': DEV_TEMPORAL_OWNER },
    },
    status: { availableReplicas: serverReplicas },
  };
  const job = {
    metadata: {
      name: DEV_TEMPORAL_SCHEMA_JOB,
      namespace: DEV_TEMPORAL_NAMESPACE,
      labels: { 'offscreen.dev/owner': DEV_TEMPORAL_OWNER },
    },
    status: { succeeded: schemaSucceeded, failed: schemaFailed },
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
              name: DEV_TEMPORAL_CONTEXT,
              context: { cluster: DEV_CLUSTER_NAME },
            },
          ],
          clusters: [
            {
              name: DEV_CLUSTER_NAME,
              cluster: { server: 'https://127.0.0.1:24443' },
            },
          ],
        }),
      };
    }

    if (command === 'kubectl' && args.includes('get')) {
      const getIndex = args.indexOf('get');
      const resource = args[getIndex + 1];
      const name =
        args[getIndex + 2] === '-n' ? args[getIndex + 4] : args[getIndex + 2];
      if (resource === 'namespace' && name === BASELINE_NAMESPACE) {
        return {
          ok: true,
          status: 0,
          stdout: JSON.stringify({
            metadata: {
              name: BASELINE_NAMESPACE,
              uid: 'baseline-uid',
              labels: { 'offscreen.dev/owner': DEV_TEMPORAL_OWNER },
            },
          }),
        };
      }
      if (resource === 'deployment' && name === 'temporal-postgres') {
        return { ok: true, status: 0, stdout: JSON.stringify(postgres) };
      }
      if (resource === 'deployment' && name === 'temporal-server') {
        return { ok: true, status: 0, stdout: JSON.stringify(server) };
      }
      if (resource === 'job' && name === DEV_TEMPORAL_SCHEMA_JOB) {
        if (jobAbsent) {
          return { ok: true, status: 0, stdout: '' };
        }
        return { ok: true, status: 0, stdout: JSON.stringify(job) };
      }
      return { ok: true, status: 0, stdout: '' };
    }

    if (command === 'kubectl' && args.includes('exec')) {
      const joined = args.join(' ');
      if (joined.includes("datname IN ('temporal','temporal_visibility')")) {
        return legacyHealthy
          ? { ok: true, status: 0, stdout: 'temporal\ntemporal_visibility\n' }
          : { ok: true, status: 0, stdout: 'temporal\n' };
      }
      if (joined.includes('-d temporal_visibility')) {
        return legacyHealthy
          ? { ok: true, status: 0, stdout: 't\n' }
          : { ok: true, status: 0, stdout: 'f\n' };
      }
      if (joined.includes('-d temporal')) {
        return legacyHealthy
          ? { ok: true, status: 0, stdout: 't\n' }
          : { ok: true, status: 0, stdout: 'f\n' };
      }
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

test('healthy Temporal observation requires schema success and available server', () => {
  const { run, calls } = createMockRun();
  const result = observeDevTemporalReady({ run });
  assert.equal(result.ok, true);
  assertNoWrites(calls);
});

test('failed schema Job refuses with no exec writes', () => {
  const { run, calls } = createMockRun({ schemaSucceeded: 0, schemaFailed: 1 });
  const result = observeDevTemporalReady({ run });
  assert.equal(result.ok, false);
  assert.match(result.detail ?? '', /failed/);
  assertNoWrites(calls);
});

test('absent schema Job reuses legacy SQL evidence when databases and tables verify', () => {
  const { run, calls } = createMockRun({
    jobAbsent: true,
    legacyHealthy: true,
  });
  const result = observeDevTemporalReady({ run });
  assert.equal(result.ok, true);
  assert.equal(
    calls.some((call) => call.args.includes('exec')),
    true,
  );
  assertNoWrites(calls);
});

test('absent schema Job refuses partial legacy SQL evidence', () => {
  const { run, calls } = createMockRun({
    jobAbsent: true,
    legacyHealthy: false,
  });
  const result = observeDevTemporalReady({ run });
  assert.equal(result.ok, false);
  assert.match(result.detail ?? '', /database|schema_version/);
  assertNoWrites(calls);
});

test('nonzero kubectl exit with job stdout is unreadable, not trusted', () => {
  const { run, calls } = createMockRun();
  const failing = (command, args, runOptions = {}) => {
    if (command === 'kubectl' && args.includes('get') && args.includes('job')) {
      return {
        ok: false,
        status: 1,
        stdout: JSON.stringify({
          metadata: {
            name: DEV_TEMPORAL_SCHEMA_JOB,
            namespace: DEV_TEMPORAL_NAMESPACE,
            labels: { 'offscreen.dev/owner': DEV_TEMPORAL_OWNER },
          },
          status: { succeeded: 1, failed: 0 },
        }),
      };
    }
    return run(command, args, runOptions);
  };
  const result = observeDevTemporalReady({ run: failing });
  assert.equal(result.ok, false);
  assert.match(result.detail ?? '', /unreadable/);
  assertNoWrites(calls);
});
