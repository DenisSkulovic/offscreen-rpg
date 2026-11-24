import assert from 'node:assert/strict';
import test from 'node:test';
import { TEMPORAL_LEGACY_YAML_SUCCESSORS } from '../dev-bootstrap.mjs';
import {
  executeReleaseTemporalInstall,
  observeReleaseTemporal,
  planReleaseTemporalInstall,
  verifyReleaseRenderedPins,
} from '../release-install.mjs';

const absent = { state: 'absent' };
const presentOwned = (uid = 'uid-1') => ({
  state: 'present',
  foreign: false,
  owner: 'disposable',
  uid,
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
