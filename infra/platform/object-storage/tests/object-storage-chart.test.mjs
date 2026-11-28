import assert from 'node:assert/strict';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { DEV_S3_IMAGE, DEV_S3_STORAGE_CLASS } from '../dev-bootstrap.mjs';
import { runPlatformCommand } from '../../common/commands.mjs';
import {
  assertHelmAvailable,
  assertPlatformRenderRequest,
  lintPlatformChart,
  parseObjectStorageHelmDocuments,
  renderPlatformDocuments,
  resolvePlatformChartPath,
  resolvePlatformProfilePath,
} from '../../common/render.mjs';
import { readPlatformProfile } from '../../common/profile.mjs';

const commonRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../common',
);
const cliPath = join(commonRoot, 'cli.mjs');
const repoRoot = join(commonRoot, '../../..');

function findDoc(docs, kind, name) {
  return docs.find((doc) => doc.kind === kind && doc.metadata?.name === name);
}

function assertSyntheticNamespace(doc, profileId) {
  const profile = readPlatformProfile(profileId);
  assert.equal(doc.kind, 'Namespace');
  assert.equal(doc.metadata.name, profile.namespaces.objectStorage);
  assert.equal(doc.metadata.namespace, undefined);
  if (profileId === 'dev') {
    assert.deepEqual(doc.metadata.labels, {
      'offscreen.dev/owner': 'offscreen-dev',
    });
  } else {
    assert.deepEqual(doc.metadata.labels, {
      'offscreen.rpg/lab': 'disposable',
    });
  }
}

function assertNoHelmHooksOrSecrets(docs) {
  for (const doc of docs) {
    assert.notEqual(doc.kind, 'Secret');
    const serialized = JSON.stringify(doc);
    assert.doesNotMatch(serialized, /"helm\.sh\/hook"/);
  }
}

test('helm is required for object-storage chart tests', () => {
  assertHelmAvailable();
});

for (const profileId of /** @type {const} */ (['dev', 'release'])) {
  test(`native object-storage public render sections for ${profileId}`, () => {
    assertHelmAvailable();
    lintPlatformChart({ service: 'object-storage', profile: profileId });
    const all = renderPlatformDocuments({
      service: 'object-storage',
      profile: profileId,
      section: 'all',
    });
    assert.equal(all.length, 4);
    assertSyntheticNamespace(all[0], profileId);
    assertNoHelmHooksOrSecrets(all);

    const namespaceOnly = renderPlatformDocuments({
      service: 'object-storage',
      profile: profileId,
      section: 'namespace',
    });
    assert.equal(namespaceOnly.length, 1);
    assertSyntheticNamespace(namespaceOnly[0], profileId);

    const workloads = renderPlatformDocuments({
      service: 'object-storage',
      profile: profileId,
      section: 'workloads',
    });
    assert.equal(workloads.length, 3);
    const profile = readPlatformProfile(profileId);
    const expectedNs = profile.namespaces.objectStorage;
    for (const doc of workloads) {
      assert.equal(doc.metadata.namespace, expectedNs);
    }
    assert.ok(findDoc(workloads, 'Deployment', 'object-store'));
    assert.ok(findDoc(workloads, 'Service', 'object-store'));
    assert.ok(findDoc(workloads, 'PersistentVolumeClaim', 'object-store-data'));
    const pvc = findDoc(
      workloads,
      'PersistentVolumeClaim',
      'object-store-data',
    );
    assert.equal(pvc.metadata.annotations['helm.sh/resource-policy'], 'keep');
  });
}

test('native dev deployment matches baseline contract without S3_BUCKET', () => {
  assertHelmAvailable();
  const docs = renderPlatformDocuments({
    service: 'object-storage',
    profile: 'dev',
    section: 'workloads',
  });
  const profile = readPlatformProfile('dev');
  assertNoHelmHooksOrSecrets(docs);
  const deploy = findDoc(docs, 'Deployment', 'object-store');
  assert.ok(deploy);
  assert.equal(deploy.spec.strategy.type, 'Recreate');
  assert.equal(deploy.spec.replicas, 1);
  assert.equal(deploy.metadata.namespace, profile.namespaces.objectStorage);
  assert.equal(deploy.spec.template.spec.containers[0].image, DEV_S3_IMAGE);
  const container = deploy.spec.template.spec.containers[0];
  assert.deepEqual(container.args, ['mini', '-dir=/data', '-metricsPort=9327']);
  assert.deepEqual(container.ports, [
    { name: 's3', containerPort: 8333 },
    { name: 'metrics', containerPort: 9327 },
  ]);
  assert.ok(container.readinessProbe?.exec);
  assert.equal(container.livenessProbe, undefined);
  assert.equal(
    container.env.some((item) => item.name === 'S3_BUCKET'),
    false,
  );
  const sc = deploy.spec.template.spec.securityContext;
  assert.equal(sc.runAsUser, 1000);
  assert.equal(sc.runAsGroup, 1000);
  assert.equal(sc.fsGroup, 1000);
  assert.equal(deploy.spec.template.spec.automountServiceAccountToken, false);
  const pvc = findDoc(docs, 'PersistentVolumeClaim', 'object-store-data');
  assert.equal(pvc.metadata.annotations['helm.sh/resource-policy'], 'keep');
  assert.equal(pvc.spec.storageClassName, DEV_S3_STORAGE_CLASS);
  assert.equal(pvc.spec.resources.requests.storage, '2Gi');
  assert.equal(pvc.spec.volumeMode, 'Filesystem');
  const service = findDoc(docs, 'Service', 'object-store');
  assert.equal(service.spec.type, 'ClusterIP');
  assert.deepEqual(service.spec.ports, [
    { name: 's3', port: 8333, targetPort: 's3' },
    { name: 'metrics', port: 9327, targetPort: 'metrics' },
  ]);
});

const renderDev = (stdinOverlay) =>
  renderPlatformDocuments(
    { service: 'object-storage', profile: 'dev', section: 'workloads' },
    stdinOverlay ? { stdinOverlay } : {},
  );

test('dev with fixed false overlay differs from target only in args and named ports', () => {
  assertHelmAvailable();
  const old = renderDev({ metricsEnabled: false });
  const target = renderDev();
  const oldDeploy = findDoc(old, 'Deployment', 'object-store');
  const oldContainer = oldDeploy.spec.template.spec.containers[0];
  assert.deepEqual(oldContainer.args, ['mini', '-dir=/data']);
  assert.deepEqual(oldContainer.ports, [{ name: 's3', containerPort: 8333 }]);
  const strip = (docs) => {
    const copy = structuredClone(docs);
    const c = findDoc(copy, 'Deployment', 'object-store').spec.template.spec
      .containers[0];
    delete c.args;
    delete c.ports;
    findDoc(copy, 'Service', 'object-store').spec.ports.splice(1);
    return copy;
  };
  assert.deepEqual(strip(old), strip(target));
});

test('release render is unchanged by the default and rejects metricsEnabled true', () => {
  assertHelmAvailable();
  const run = (overlay) =>
    renderPlatformDocuments(
      { service: 'object-storage', profile: 'release', section: 'workloads' },
      overlay ? { stdinOverlay: overlay } : {},
    );
  assert.deepEqual(run(), run({ metricsEnabled: false }));
  const container = findDoc(run(), 'Deployment', 'object-store').spec.template
    .spec.containers[0];
  assert.deepEqual(container.args, ['mini', '-dir=/data']);
  assert.throws(() => run({ metricsEnabled: true }), /helm template failed/);
});

test('native release deployment keeps probes and rejects S3_BUCKET bootstrap', () => {
  assertHelmAvailable();
  const docs = renderPlatformDocuments({
    service: 'object-storage',
    profile: 'release',
    section: 'workloads',
  });
  assertNoHelmHooksOrSecrets(docs);
  const deploy = findDoc(docs, 'Deployment', 'object-store');
  const container = deploy.spec.template.spec.containers[0];
  assert.ok(container.readinessProbe?.exec);
  assert.ok(container.livenessProbe?.exec);
  assert.equal(
    container.env.some((item) => item.name === 'S3_BUCKET'),
    false,
  );
  const pvc = findDoc(docs, 'PersistentVolumeClaim', 'object-store-data');
  assert.equal(pvc.spec.storageClassName, 'local-path');
  assert.equal(pvc.metadata.annotations['helm.sh/resource-policy'], 'keep');
  assert.deepEqual(pvc.metadata.labels, {
    app: 'object-store',
    'offscreen.rpg/lab': 'disposable',
  });
});

test('render path rejects unknown section and unsupported profile via cli', () => {
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

test('native chart rejects schema violations through public render', () => {
  assertHelmAvailable();
  assert.throws(
    () =>
      renderPlatformDocuments(
        { service: 'object-storage', profile: 'dev', section: 'all' },
        { stdinOverlay: { unexpectedField: true } },
      ),
    /helm template failed/,
  );
  assert.throws(
    () =>
      renderPlatformDocuments(
        { service: 'object-storage', profile: 'dev', section: 'all' },
        { stdinOverlay: { section: 'workloads' } },
      ),
    /helm template failed/,
  );
});

function rawNativeHelmStdout(profileId) {
  const chartPath = resolvePlatformChartPath('object-storage');
  const profilePath = resolvePlatformProfilePath('object-storage', profileId);
  const profile = readPlatformProfile(profileId);
  const result = runPlatformCommand(
    'helm',
    [
      'template',
      'platform-object-storage',
      chartPath,
      '-f',
      profilePath,
      '--namespace',
      profile.namespaces.objectStorage,
    ],
    { timeoutMs: 30_000 },
  );
  assert.equal(result.ok, true, result.stderr);
  return result.stdout ?? '';
}

test('parseObjectStorageHelmDocuments rejects malformed yaml and unexpected objects', () => {
  assertHelmAvailable();
  const profile = readPlatformProfile('dev');
  const ns = profile.namespaces.objectStorage;
  assert.throws(
    () => parseObjectStorageHelmDocuments(':\ninvalid', 'dev'),
    /malformed platform document/,
  );
  const extraConfig = `${rawNativeHelmStdout('dev')}---
apiVersion: v1
kind: ConfigMap
metadata:
  name: unexpected
  namespace: ${ns}
`;
  assert.throws(
    () => parseObjectStorageHelmDocuments(extraConfig, 'dev'),
    /unexpected platform resource identity/,
  );
});
