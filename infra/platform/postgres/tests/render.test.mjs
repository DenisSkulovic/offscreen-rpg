import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { POSTGRES_OPERATOR_PIN_KEYS, parsePins } from '../../common/pins.mjs';
import {
  assertPlatformRenderRequest,
  lintPlatformChart,
  renderPlatformDocuments,
} from '../../common/render.mjs';
import { runPlatformCommand } from '../../common/commands.mjs';
import {
  DEV_CNPG_CLUSTER,
  DEV_CNPG_MAX_CONNECTIONS,
  DEV_CNPG_NAMESPACE,
  DEV_CNPG_OWNER,
  parseCnpgPin,
} from '../dev-bootstrap.mjs';

const postgresRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pinText = readFileSync(join(postgresRoot, 'operator.pin'), 'utf8');
const pins = parsePins(pinText, POSTGRES_OPERATOR_PIN_KEYS);
const pin = parseCnpgPin(pinText);

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

const expectedDevNamespace = {
  apiVersion: 'v1',
  kind: 'Namespace',
  metadata: {
    name: DEV_CNPG_NAMESPACE,
    labels: { 'offscreen.dev/owner': DEV_CNPG_OWNER },
  },
};

const expectedDevCluster = {
  apiVersion: 'postgresql.cnpg.io/v1',
  kind: 'Cluster',
  metadata: {
    name: DEV_CNPG_CLUSTER,
    namespace: DEV_CNPG_NAMESPACE,
    labels: { 'offscreen.dev/owner': DEV_CNPG_OWNER },
  },
  spec: {
    instances: 1,
    imageName: pin.postgresImage,
    storage: { size: '2Gi', storageClass: 'standard' },
    resources: {
      requests: { cpu: '100m', memory: '384Mi' },
      limits: { cpu: '500m', memory: '1Gi' },
    },
    postgresql: {
      parameters: {
        shared_buffers: '128MB',
        max_connections: String(DEV_CNPG_MAX_CONNECTIONS),
        work_mem: '4MB',
        maintenance_work_mem: '32MB',
      },
    },
    bootstrap: {
      initdb: {
        database: 'dev',
        owner: 'dev',
        localeCType: 'C',
        localeCollate: 'C',
      },
    },
  },
};

const expectedReleaseNamespace = {
  apiVersion: 'v1',
  kind: 'Namespace',
  metadata: {
    name: 'lab-postgres',
    labels: { 'offscreen.rpg/lab': 'disposable' },
  },
};

const expectedReleaseCluster = {
  apiVersion: 'postgresql.cnpg.io/v1',
  kind: 'Cluster',
  metadata: { name: 'lab-pg', namespace: 'lab-postgres' },
  spec: {
    instances: 1,
    imageName: pins.POSTGRES_IMAGE,
    storage: { size: '1Gi', storageClass: 'local-path' },
    resources: {
      requests: { cpu: '100m', memory: '256Mi' },
      limits: { cpu: '500m', memory: '768Mi' },
    },
    postgresql: {
      parameters: {
        shared_buffers: '64MB',
        max_connections: '20',
        work_mem: '4MB',
        maintenance_work_mem: '32MB',
      },
    },
    bootstrap: {
      initdb: {
        database: 'lab',
        owner: 'lab',
        localeCType: 'C',
        localeCollate: 'C',
      },
    },
  },
};

test('dev namespace and cluster match renderDevCnpg* via common renderer', () => {
  const nsDocs = renderPlatformDocuments(
    { service: 'postgres', profile: 'dev', section: 'namespace' },
    { run: helmRun },
  );
  assert.equal(nsDocs.length, 1);
  assert.deepEqual(nsDocs[0], expectedDevNamespace);

  const clusterDocs = renderPlatformDocuments(
    { service: 'postgres', profile: 'dev', section: 'cluster' },
    { run: helmRun },
  );
  assert.equal(clusterDocs.length, 1);
  assert.deepEqual(clusterDocs[0], expectedDevCluster);
  assert.equal(clusterDocs[0].spec.imageName, pins.POSTGRES_IMAGE);
});

test('release namespace and cluster match static manifests and pinned image', () => {
  const nsDocs = renderPlatformDocuments(
    { service: 'postgres', profile: 'release', section: 'namespace' },
    { run: helmRun },
  );
  assert.equal(nsDocs.length, 1);
  assert.deepEqual(nsDocs[0], expectedReleaseNamespace);

  const clusterDocs = renderPlatformDocuments(
    { service: 'postgres', profile: 'release', section: 'cluster' },
    { run: helmRun },
  );
  assert.equal(clusterDocs.length, 1);
  assert.deepEqual(clusterDocs[0], expectedReleaseCluster);
  assert.equal(clusterDocs[0].spec.imageName, pins.POSTGRES_IMAGE);
});

test('full render emits namespace and cluster only (no Secret docs)', () => {
  for (const profile of /** @type {const} */ (['dev', 'release'])) {
    const docs = renderPlatformDocuments(
      { service: 'postgres', profile, section: 'all' },
      { run: helmRun },
    );
    assert.equal(docs.length, 2);
    const kinds = docs.map((doc) => doc.kind).sort();
    assert.deepEqual(kinds, ['Cluster', 'Namespace']);
    assert.ok(docs.every((doc) => doc.kind !== 'Secret'));
    const cluster = docs.find((doc) => doc.kind === 'Cluster');
    assert.equal(cluster?.spec.imageName, pins.POSTGRES_IMAGE);
    assert.equal(cluster?.spec.instances, 1);
  }
});

test('lintPlatformChart succeeds for dev and release', () => {
  lintPlatformChart({ service: 'postgres', profile: 'dev' }, { run: helmRun });
  lintPlatformChart(
    { service: 'postgres', profile: 'release' },
    { run: helmRun },
  );
});

test('negative: unknown profile or section and tampered pin overlay', () => {
  assert.throws(
    () => assertPlatformRenderRequest('postgres', 'staging', 'all'),
    /unsupported profile/,
  );
  assert.throws(
    () => assertPlatformRenderRequest('postgres', 'dev', 'broker'),
    /unsupported section/,
  );
  assert.throws(
    () =>
      renderPlatformDocuments(
        { service: 'postgres', profile: 'dev', section: 'namespace' },
        {
          run: helmRun,
          stdinOverlay: { images: { postgres: 'placeholder-postgres' } },
        },
      ),
    /images.postgres must be resolved from pin overlay/,
  );
  assert.throws(
    () => parsePins('POSTGRES_IMAGE=\n', POSTGRES_OPERATOR_PIN_KEYS),
    /missing pin key/,
  );
});
