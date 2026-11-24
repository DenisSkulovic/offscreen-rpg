import assert from 'node:assert/strict';
import test from 'node:test';
import { runPlatformCommand } from '../../common/commands.mjs';
import { DEV_S3_IMAGE, DEV_S3_PVC, DEV_S3_SECRET } from '../dev-bootstrap.mjs';
import {
  RELEASE_S3_CONTEXT,
  RELEASE_S3_NAMESPACE,
  RELEASE_S3_OWNER,
  collectReleaseObjectStorageProbe,
  ensureReleaseObjectStorageInstall,
  executeReleaseObjectStorageInstall,
} from '../release-install.mjs';

const releaseReadyProbe = {
  context: RELEASE_S3_CONTEXT,
  clusterName: 'offscreen-lab',
  baselineOwner: RELEASE_S3_OWNER,
  storageClass: 'local-path',
  unreadables: [],
  resources: [],
};

function readinessStdout(args) {
  const text = args.join(' ');
  if (text.includes('jsonpath={.status.phase}'))
    return { ok: true, stdout: 'Bound\n' };
  if (text.includes('availableReplicas')) return { ok: true, stdout: '1\n' };
  if (text.includes('http_code')) return { ok: true, stdout: '200' };
  return { ok: true, stdout: '' };
}

function ownedReleaseProbe() {
  return {
    ...releaseReadyProbe,
    resources: [
      {
        kind: 'Namespace',
        name: RELEASE_S3_NAMESPACE,
        owner: RELEASE_S3_OWNER,
        uid: 'ns',
      },
      {
        kind: 'Secret',
        name: DEV_S3_SECRET,
        namespace: RELEASE_S3_NAMESPACE,
        owner: RELEASE_S3_OWNER,
        uid: 'sec',
      },
      {
        kind: 'PersistentVolumeClaim',
        name: DEV_S3_PVC,
        owner: RELEASE_S3_OWNER,
        uid: 'pvc',
        storageClass: 'local-path',
      },
      {
        kind: 'Deployment',
        name: 'object-store',
        owner: RELEASE_S3_OWNER,
        uid: 'dep',
        image: DEV_S3_IMAGE,
      },
      {
        kind: 'Service',
        name: 'object-store',
        owner: RELEASE_S3_OWNER,
        uid: 'svc',
        serviceType: 'ClusterIP',
      },
    ],
  };
}

test('release reentry performs no kubectl writes', () => {
  const calls = [];
  const result = executeReleaseObjectStorageInstall({
    collect: () => ownedReleaseProbe(),
    renderDeps: { run: runPlatformCommand },
    run(command, args) {
      calls.push({ command, args });
      return readinessStdout(args);
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.mutated, false);
  assert.equal(
    calls.some(
      (call) =>
        call.args.includes('apply') ||
        call.args.includes('create') ||
        call.command === 'helm',
    ),
    false,
  );
});

test('release refuses when pvc exists without admin secret', () => {
  const probe = {
    ...releaseReadyProbe,
    resources: [
      {
        kind: 'PersistentVolumeClaim',
        name: DEV_S3_PVC,
        owner: RELEASE_S3_OWNER,
        uid: 'pvc',
        storageClass: 'local-path',
      },
    ],
  };
  const result = ensureReleaseObjectStorageInstall(probe);
  assert.equal(result.ok, false);
  assert.equal(
    result.refusals.some((item) => item.id === 'admin-secret-missing'),
    true,
  );
});

test('unreadable release state causes no mutation', () => {
  const probe = {
    ...releaseReadyProbe,
    unreadables: [
      { kind: 'Secret', name: DEV_S3_SECRET, reason: 'kubectl get failed' },
    ],
  };
  const calls = [];
  const result = executeReleaseObjectStorageInstall({
    collect: () => probe,
    renderDeps: { run: runPlatformCommand },
    run(command, args) {
      calls.push({ command, args });
      return { ok: true, stdout: '' };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.mutated, false);
  assert.equal(calls.length, 0);
});

test('failed release secret creation does not apply workloads', () => {
  const calls = [];
  const result = executeReleaseObjectStorageInstall({
    collect: () => releaseReadyProbe,
    renderDeps: { run: runPlatformCommand },
    generateCredentials: () => ({
      accessKeyId: 'kept-access',
      secretAccessKey: 'kept-secret',
    }),
    run(command, args) {
      calls.push(args.join(' '));
      if (args.includes('create'))
        return { ok: false, stderr: 'AlreadyExists' };
      return { ok: true, stdout: 'Bound\n' };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0].id, 'create-secret-failed');
  const createIndex = calls.findIndex((line) => line.includes('create'));
  assert.notEqual(createIndex, -1);
  const afterSecret = calls.slice(createIndex + 1);
  assert.equal(
    afterSecret.some((line) => line.includes('apply')),
    false,
  );
});

test('release probe collector maps readPlatformObject shapes', () => {
  const probe = collectReleaseObjectStorageProbe({
    run(command, args) {
      const joined = args.join(' ');
      if (joined.includes('storageclass local-path')) {
        return { ok: true, stdout: 'local-path' };
      }
      if (joined.includes('get namespace lab-objects')) {
        return { ok: true, stdout: '' };
      }
      return { ok: true, stdout: '' };
    },
  });
  assert.equal(probe.context, RELEASE_S3_CONTEXT);
  assert.equal(probe.storageClass, 'local-path');
});
