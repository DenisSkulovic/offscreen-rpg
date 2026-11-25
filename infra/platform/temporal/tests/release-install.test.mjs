import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { TEMPORAL_LEGACY_YAML_SUCCESSORS } from '../dev-bootstrap.mjs';
import { TEMPORAL_AUTHENTICATED_SQL_QUERY } from '../legacy-sql-probe.mjs';
import {
  executeReleaseTemporalInstall,
  planReleaseTemporalInstall,
  verifyReleaseRenderedPins,
} from '../release-install.mjs';

const TEMPORAL_SQL_ARGV_LITERAL =
  ': "${POSTGRES_PASSWORD:?missing database password}"; export PGPASSWORD="$POSTGRES_PASSWORD"; exec psql -w -h 127.0.0.1 -U temporal -d "$1" -Atqc "$2"';

/** @param {string[]} args */
function readTemporalPostgresSqlArgs(args) {
  const marker = args.indexOf('temporal-sql');
  if (marker < 0 || marker + 2 >= args.length) return undefined;
  return { database: args[marker + 1], query: args[marker + 2] };
}

/** @param {string[]} args @param {Record<string, { ok: boolean, stdout?: string }>} responses */
function fakeReleasePostgresSqlExec(args, responses) {
  const sql = readTemporalPostgresSqlArgs(args);
  if (!sql) return undefined;
  return responses[sql.database];
}

const absent = { state: 'absent' };
const presentOwned = (uid = 'uid-1') => ({
  state: 'present',
  foreign: false,
  owner: 'disposable',
  uid,
});

/** Observations for a completed schema job planning apply-server. */
function schemaReadyObservations() {
  return {
    namespace: presentOwned(),
    secret: presentOwned(),
    pvc: presentOwned(),
    postgres: presentOwned(),
    server: absent,
    admin: absent,
    schemaJob: { ...presentOwned('job-done'), condition: 'Complete' },
    namespaceJob: absent,
    defaultNamespace: absent,
    clusterHealth: absent,
    sql: {
      state: 'readable',
      databases: { temporal: true, temporal_visibility: true },
      schemaTables: { temporal: true, temporal_visibility: true },
    },
  };
}

/** Explicit successful gate callbacks required after T02 fail-closed wiring. */
function successfulGateDeps(overrides = {}) {
  return {
    waitPostgresReady: () => ({ ok: true, refusals: [] }),
    waitSchemaJob: () => ({ ok: true, refusals: [] }),
    waitNamespaceJob: () => ({ ok: true, refusals: [] }),
    probeSql: () => ({ ok: true, refusals: [] }),
    ...overrides,
  };
}

test('release SQL exec fake matches database and query argv tail', () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../release-install.mjs'),
    'utf8',
  );
  assert.ok(source.includes(`'${TEMPORAL_SQL_ARGV_LITERAL}'`));
  assert.match(source, /'temporal-sql',\s*\n\s*database,\s*\n\s*query,/);
  const argv = [
    'exec',
    'deploy/temporal-postgres',
    '--',
    'bash',
    '-c',
    TEMPORAL_SQL_ARGV_LITERAL,
    'temporal-sql',
    'postgres',
    TEMPORAL_AUTHENTICATED_SQL_QUERY,
  ];
  assert.deepEqual(readTemporalPostgresSqlArgs(argv), {
    database: 'postgres',
    query: TEMPORAL_AUTHENTICATED_SQL_QUERY,
  });
  assert.equal(
    fakeReleasePostgresSqlExec(argv, { postgres: { ok: true, stdout: '1' } })
      ?.stdout,
    '1',
  );
});

test('legacy flat YAML successors map chart sections', () => {
  assert.equal(
    TEMPORAL_LEGACY_YAML_SUCCESSORS['namespace.yaml'],
    'chart templates namespace section',
  );
  assert.equal(
    TEMPORAL_LEGACY_YAML_SUCCESSORS['postgres.yaml'],
    'chart templates postgres section',
  );
  assert.equal(
    TEMPORAL_LEGACY_YAML_SUCCESSORS['schema-job.yaml'],
    'chart templates schema section',
  );
  assert.equal(
    TEMPORAL_LEGACY_YAML_SUCCESSORS['server.yaml'],
    'chart templates server section',
  );
  assert.equal(
    TEMPORAL_LEGACY_YAML_SUCCESSORS['admin.yaml'],
    'chart templates admin section (release only)',
  );
  assert.equal(
    TEMPORAL_LEGACY_YAML_SUCCESSORS['namespace-job.yaml'],
    'chart templates namespace-job section (release only)',
  );
});

test('verifyReleaseRenderedPins accepts the pinned release chart output', () => {
  verifyReleaseRenderedPins({
    images: {
      server: 'docker.io/temporalio/server:1.32.2',
      admin: 'docker.io/temporalio/admin-tools:1.32.2',
      postgres: 'docker.io/library/postgres:17.11-bookworm',
    },
  });
});

test('fresh release install plans ordered bootstrap without delete actions', () => {
  const plan = planReleaseTemporalInstall({
    namespace: absent,
    secret: absent,
    pvc: absent,
    postgres: absent,
    server: absent,
    admin: absent,
    schemaJob: absent,
    namespaceJob: absent,
    defaultNamespace: absent,
    clusterHealth: absent,
  });
  assert.equal(plan.ok, true);
  const ops = plan.actions.map((action) => action.op);
  assert.deepEqual(ops.slice(0, 5), [
    'ensure-namespace',
    'create-secret',
    'apply-postgres',
    'wait-postgres-ready',
    'wait-authenticated-sql',
  ]);
  assert.equal(ops.includes('apply-server'), true);
  assert.equal(ops.includes('apply-admin'), true);
  assert.equal(
    ops.some((op) => op.includes('delete')),
    false,
  );
});

test('schema job failure refuses without replay writes', () => {
  const plan = planReleaseTemporalInstall({
    schemaJob: {
      state: 'present',
      foreign: false,
      owner: 'disposable',
      uid: 'job-1',
      condition: 'Failed',
    },
    secret: presentOwned(),
    pvc: presentOwned(),
    postgres: presentOwned(),
    server: absent,
    namespace: presentOwned(),
    admin: absent,
    namespaceJob: absent,
    defaultNamespace: absent,
    clusterHealth: absent,
  });
  assert.equal(plan.ok, false);
  assert.equal(plan.refusals[0]?.id, 'schema-job-failed');
});

test('fake runner skips writes on unreadable PVC', () => {
  const calls = [];
  const result = executeReleaseTemporalInstall({
    observe: () => ({
      namespace: absent,
      secret: absent,
      pvc: { state: 'unreadable', reason: 'kubectl get failed' },
      postgres: absent,
      server: absent,
      admin: absent,
      schemaJob: absent,
      namespaceJob: absent,
      defaultNamespace: absent,
      clusterHealth: absent,
    }),
    kubectl: (...args) => {
      calls.push(args);
      return { ok: true };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(calls.length, 0);
});

test('fake runner reentry after secret conflict performs no further writes', () => {
  const writes = [];
  const result = executeReleaseTemporalInstall({
    observe: () => ({
      namespace: absent,
      secret: absent,
      pvc: absent,
      postgres: absent,
      server: absent,
      admin: absent,
      schemaJob: absent,
      namespaceJob: absent,
      defaultNamespace: absent,
      clusterHealth: absent,
    }),
    kubectl: (_args, options) => {
      if (options?.input?.includes('kind: Secret')) {
        writes.push('create-secret');
        return { ok: false, stderr: 'AlreadyExists' };
      }
      writes.push('other');
      return { ok: true };
    },
    generatePassword: () => '0123456789abcdef0123456789abcdef0123456789abcdef',
  });
  assert.equal(result.ok, false);
  assert.equal(result.reobserve, true);
  assert.equal(writes.includes('create-secret'), true);
  assert.equal(writes.includes('delete'), false);
  assert.equal(result.writes.includes('delete'), false);
});

test('runner calls probeSql for SQL gates and reaches apply-server with fakes', () => {
  const probePhases = [];
  const writes = [];
  const result = executeReleaseTemporalInstall({
    observe: () => schemaReadyObservations(),
    kubectl: (args) => {
      if (args[0] === 'apply') writes.push('apply');
      return { ok: true };
    },
    ...successfulGateDeps({
      probeSql: (phase) => {
        probePhases.push(phase);
        return { ok: true, refusals: [] };
      },
    }),
  });
  assert.equal(result.ok, true);
  assert.deepEqual(probePhases, ['authenticated', 'schema']);
  assert.equal(result.writes.includes('apply-server'), true);
  assert.equal(result.writes.includes('apply-admin'), true);
  const authGate = result.actions.find(
    (item) => item.op === 'wait-authenticated-sql',
  );
  assert.equal(authGate?.ok, true);
  const schemaGate = result.actions.find(
    (item) => item.op === 'verify-schema-tables',
  );
  assert.equal(schemaGate?.ok, true);
});

test('absent probeSql stops before server apply', () => {
  const writes = [];
  const result = executeReleaseTemporalInstall({
    observe: () => schemaReadyObservations(),
    kubectl: (args) => {
      if (args[0] === 'apply') writes.push('kubectl-apply');
      return { ok: true };
    },
    ...successfulGateDeps({ probeSql: undefined }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0]?.id, 'sql-probe-missing');
  assert.equal(writes.length, 0);
  assert.equal(result.writes.includes('apply-server'), false);
  const authGate = result.actions.find(
    (item) => item.op === 'wait-authenticated-sql',
  );
  assert.equal(authGate?.ok, false);
});

test('failed schema probe stops before server apply', () => {
  const writes = [];
  const result = executeReleaseTemporalInstall({
    observe: () => schemaReadyObservations(),
    kubectl: () => ({ ok: true }),
    ...successfulGateDeps({
      probeSql: (phase) =>
        phase === 'schema'
          ? {
              ok: false,
              refusals: [{ id: 'schema-version-missing', detail: 'missing' }],
            }
          : { ok: true, refusals: [] },
    }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0]?.id, 'schema-version-missing');
  assert.equal(writes.length, 0);
  assert.equal(result.writes.includes('apply-server'), false);
  const schemaGate = result.actions.find(
    (item) => item.op === 'verify-schema-tables',
  );
  assert.equal(schemaGate?.ok, false);
});

test('absent postgres waiter fails closed before SQL probe', () => {
  const probeCalls = [];
  const result = executeReleaseTemporalInstall({
    observe: () => schemaReadyObservations(),
    kubectl: () => ({ ok: true }),
    ...successfulGateDeps({
      waitPostgresReady: undefined,
      probeSql: (phase) => {
        probeCalls.push(phase);
        return { ok: true, refusals: [] };
      },
    }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0]?.id, 'postgres-wait-missing');
  assert.deepEqual(probeCalls, []);
  const waitAction = result.actions.find(
    (item) => item.op === 'wait-postgres-ready',
  );
  assert.equal(waitAction?.ok, false);
});

test('default namespace job reuses after describe finds default', () => {
  const plan = planReleaseTemporalInstall({
    namespace: presentOwned(),
    secret: presentOwned(),
    pvc: presentOwned(),
    postgres: presentOwned(),
    server: presentOwned(),
    admin: presentOwned(),
    schemaJob: { ...presentOwned(), condition: 'Complete' },
    namespaceJob: absent,
    defaultNamespace: { state: 'present' },
    clusterHealth: { state: 'release-serving' },
    serverHealth: { state: 'healthy', mode: 'release-serving' },
    sql: {
      state: 'readable',
      databases: { temporal: true, temporal_visibility: true },
      schemaTables: { temporal: true, temporal_visibility: true },
    },
  });
  assert.equal(plan.ok, true);
  assert.equal(
    plan.actions.some((action) => action.op === 'reuse-default-namespace'),
    true,
  );
  assert.equal(
    plan.actions.some((action) => action.op === 'create-namespace-job'),
    false,
  );
});
