import assert from 'node:assert/strict';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  DEV_S3_IMAGE,
  DEV_S3_NAMESPACE,
  DEV_S3_STORAGE_CLASS,
} from '../dev-bootstrap.mjs';
import { runPlatformCommand } from '../../common/commands.mjs';
import {
  assertPlatformRenderRequest,
  lintPlatformChart,
  renderPlatformDocuments,
} from '../../common/render.mjs';

const chartRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'chart');
const commonRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../common',
);
const cliPath = join(commonRoot, 'cli.mjs');
const repoRoot = join(commonRoot, '../../..');

function findDoc(docs, kind, name) {
  return docs.find((doc) => doc.kind === kind && doc.metadata?.name === name);
}

test('object-storage chart lint and section counts', () => {
  lintPlatformChart(
    { service: 'object-storage', profile: 'dev' },
    { chartRoot },
  );
  lintPlatformChart(
    { service: 'object-storage', profile: 'release' },
    { chartRoot },
  );
  const devAll = renderPlatformDocuments(
    { service: 'object-storage', profile: 'dev', section: 'all' },
    { chartRoot },
  );
  assert.equal(devAll.length, 4);
  const devNs = renderPlatformDocuments(
    { service: 'object-storage', profile: 'dev', section: 'namespace' },
    { chartRoot },
  );
  assert.equal(devNs.length, 1);
  const devWl = renderPlatformDocuments(
    { service: 'object-storage', profile: 'dev', section: 'workloads' },
    { chartRoot },
  );
  assert.equal(devWl.length, 3);
  const relAll = renderPlatformDocuments(
    { service: 'object-storage', profile: 'release', section: 'all' },
    { chartRoot },
  );
  assert.equal(relAll.length, 4);
});

test('dev deployment matches bootstrap contract except readiness probe', () => {
  const docs = renderPlatformDocuments(
    { service: 'object-storage', profile: 'dev', section: 'workloads' },
    { chartRoot },
  );
  assert.equal(
    docs.some((doc) => doc.kind === 'Secret'),
    false,
  );
  const deploy = findDoc(docs, 'Deployment', 'object-store');
  assert.ok(deploy);
  assert.equal(deploy.metadata.namespace, DEV_S3_NAMESPACE);
  assert.equal(deploy.spec.template.spec.containers[0].image, DEV_S3_IMAGE);
  const container = deploy.spec.template.spec.containers[0];
  assert.ok(container.readinessProbe?.exec);
  assert.equal(container.livenessProbe, undefined);
  assert.equal(
    container.env.some((item) => item.name === 'S3_BUCKET'),
    false,
  );
  const pvc = findDoc(docs, 'PersistentVolumeClaim', 'object-store-data');
  assert.equal(pvc.spec.storageClassName, DEV_S3_STORAGE_CLASS);
  assert.equal(pvc.spec.resources.requests.storage, '2Gi');
});

test('release deployment keeps store.yaml probes and S3_BUCKET', () => {
  const docs = renderPlatformDocuments(
    { service: 'object-storage', profile: 'release', section: 'workloads' },
    { chartRoot },
  );
  const deploy = findDoc(docs, 'Deployment', 'object-store');
  const container = deploy.spec.template.spec.containers[0];
  assert.ok(container.readinessProbe?.exec);
  assert.ok(container.livenessProbe?.exec);
  const bucket = container.env.find((item) => item.name === 'S3_BUCKET');
  assert.deepEqual(bucket, { name: 'S3_BUCKET', value: 'lab-objects' });
  const pvc = findDoc(docs, 'PersistentVolumeClaim', 'object-store-data');
  assert.equal(pvc.spec.storageClassName, 'local-path');
  assert.deepEqual(pvc.metadata.labels, {
    app: 'object-store',
    'offscreen.rpg/lab': 'disposable',
  });
});

test('object-storage rejects unknown section and unsupported profile via cli', () => {
  assert.throws(
    () => assertPlatformRenderRequest('object-storage', 'dev', 'cluster'),
    /unsupported section/,
  );
  const badSection = spawnSync(
    process.execPath,
    [cliPath, 'render', 'object-storage', 'dev', 'broker'],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  assert.notEqual(badSection.status, 0);
  assert.match(badSection.stderr, /unsupported section/);
  const badProfile = spawnSync(
    process.execPath,
    [cliPath, 'render', 'object-storage', 'staging', 'all'],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  assert.notEqual(badProfile.status, 0);
  assert.match(badProfile.stderr, /unsupported profile/);
});

test('object-storage helm stdout never includes Secret documents', () => {
  const result = runPlatformCommand(
    'helm',
    [
      'template',
      'platform-object-storage',
      chartRoot,
      '-f',
      join(chartRoot, 'profiles/release.yaml'),
      '-f',
      '-',
    ],
    { input: '{"section":"all"}\n', timeoutMs: 30_000 },
  );
  assert.equal(result.ok, true);
  assert.match(result.stdout, /object-store-s3/);
  assert.doesNotMatch(result.stdout, /"kind":"Secret"/);
  assert.doesNotMatch(result.stdout, /kind: Secret/);
});
