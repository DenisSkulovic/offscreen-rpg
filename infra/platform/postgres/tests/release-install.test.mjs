import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runPlatformCommand } from '../../common/commands.mjs';
import { renderPlatformDocuments } from '../../common/render.mjs';
import {
  parseCnpgPin,
  RELEASE_CNPG_CLUSTER,
  RELEASE_CNPG_NAMESPACE,
} from '../dev-bootstrap.mjs';
import {
  RELEASE_CNPG_CLUSTER_NAME,
  RELEASE_CNPG_CONTEXT,
  ensureReleaseCnpg,
  assertReleaseClusterPin,
  executeAuthorizedReleaseCnpg,
  planReleaseCnpg,
} from '../release-install.mjs';
import { CNPG_HEALTHY_PHASE } from '../topology.mjs';

const postgresRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pin = parseCnpgPin(
  readFileSync(join(postgresRoot, 'operator.pin'), 'utf8'),
);

function helmRun(command, args, options) {
  if (command !== 'helm') {
    return {
      ok: false,
      status: 1,
      stdout: '',
      stderr: 'unexpected command',
      timedOut: false,
      missing: false,
    };
  }
  return runPlatformCommand(command, args, options);
}

function compatibleNamespace() {
  return {
    kind: 'Namespace',
    name: RELEASE_CNPG_NAMESPACE,
    labLabel: 'disposable',
    uid: 'ns-1',
  };
}

function compatibleCluster(overrides = {}) {
  const docs = renderPlatformDocuments(
    { service: 'postgres', profile: 'release', section: 'cluster' },
    { run: helmRun },
  );
  const spec = docs[0].spec;
  return {
    kind: 'Cluster',
    name: RELEASE_CNPG_CLUSTER,
    namespace: RELEASE_CNPG_NAMESPACE,
    uid: 'pg-1',
    image: spec.imageName,
    instances: spec.instances,
    storageClass: spec.storage.storageClass,
    storageSize: spec.storage.size,
    bootstrap: {
      database: spec.bootstrap.initdb.database,
      owner: spec.bootstrap.initdb.owner,
      localeCType: spec.bootstrap.initdb.localeCType,
      localeCollate: spec.bootstrap.initdb.localeCollate,
    },
    ...overrides,
  };
}

/**
 * @param {number} instances
 */
function healthyClusterJson(instances) {
  return JSON.stringify({
    spec: { instances },
    status: {
      instances,
      readyInstances: instances,
      phase: CNPG_HEALTHY_PHASE,
      conditions: [{ type: 'Ready', status: 'True' }],
      currentPrimary: `lab-pg-${instances}`,
    },
  });
}

const ready = {
  context: RELEASE_CNPG_CONTEXT,
  clusterName: RELEASE_CNPG_CLUSTER_NAME,
  apiServer: 'https://127.0.0.1:6443',
  memoryMiB: 8000,
  timedOutCommands: [],
  pin,
  resources: [],
  crdState: 'absent',
};

test('full compatible inventory preserves existing instance count', () => {
  const result = ensureReleaseCnpg({ ...ready, resources: [compatibleNamespace(), compatibleCluster({ instances: 4 })],
    fullAssessment: { operator: 'ready', namespace: 'compatible', cluster: 'ready', observedInstances: 4, refusals: [] },
  }, { authorize: true });
  assert.equal(result.ok, true);
  assert.equal(result.expectedInstances, 4);
  assert.equal(result.mutated, false);
  assert.deepEqual(result.actions.map(a => a.op), ['verify-operator', 'wait-cluster-ready']);
});

test('full cold inventory previews native create-only operations', () => {
  const result = ensureReleaseCnpg({ ...ready, fullAssessment: {
    operator: 'absent', namespace: 'absent', cluster: 'absent', refusals: [],
  } }, { authorize: true });
  assert.equal(result.ok, true);
  assert.equal(result.mutated, false);
  assert.deepEqual(result.actions.map(a => a.op),
    ['apply-operator', 'create-namespace', 'create-cluster', 'wait-cluster-ready']);
});

test('projected, partial, and foreign observations refuse mutation preview', () => {
  for (const probe of [ready, { ...ready, fullAssessment: {
    operator: 'partial', namespace: 'absent', cluster: 'absent',
    refusals: [{ id: 'operator-partial', detail: 'partial inventory' }],
  } }, { ...ready, resources: [{ kind: 'Namespace', name: RELEASE_CNPG_NAMESPACE, labLabel: null }] }]) {
    const result = ensureReleaseCnpg(probe, { authorize: true });
    assert.equal(result.ok, false);
    assert.equal(result.mutated, false);
    assert.deepEqual(result.actions, []);
  }
});

test('plan is read-only; mismatched manifest digest refuses', () => {
  const plan = planReleaseCnpg(ready, { run: helmRun });
  assert.equal(plan.readOnly, true);
  assert.deepEqual(plan.actions, []);
  const result = ensureReleaseCnpg(ready, { authorize: true, operatorManifestSha256: 'a'.repeat(64) });
  assert.ok(result.refusals.some(item => item.id === 'operator-manifest-sha-mismatch'));
});
test('release installer CLI validates structured render and actually executes', () => {
  const result = spawnSync(
    process.execPath,
    [join(postgresRoot, 'release-install.mjs'), 'verify-render'],
    { encoding: 'utf8', timeout: 30000 },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'release PostgreSQL render verified');
  const unknown = spawnSync(
    process.execPath,
    [join(postgresRoot, 'release-install.mjs'), 'unknown'],
    { encoding: 'utf8', timeout: 30000 },
  );
  assert.equal(unknown.status, 2);
});

test('release render guard rejects wrong pin, count and identity', () => {
  const docs = renderPlatformDocuments({
    service: 'postgres',
    profile: 'release',
    section: 'cluster',
  });
  assert.doesNotThrow(() => assertReleaseClusterPin(docs, pin));
  const bad = structuredClone(docs);
  bad[0].spec.imageName += '-wrong';
  assert.throws(() => assertReleaseClusterPin(bad, pin), /imageName/);
  bad[0].spec.imageName = pin.postgresImage;
  bad[0].spec.instances = 0;
  assert.throws(
    () => assertReleaseClusterPin(bad, pin),
    /positive safe integer/,
  );
  assert.throws(() => assertReleaseClusterPin([], pin), /identity/);
});

