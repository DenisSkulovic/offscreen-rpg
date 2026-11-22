import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEV_S3_CONTEXT,
  DEV_S3_IMAGE,
  DEV_S3_NAMESPACE,
  DEV_S3_STORAGE_CLASS,
  RELEASE_S3_NAMESPACE,
  ensureDevObjectStore,
  executeAuthorizedDevObjectStore,
  planDevObjectStore,
  renderDevObjectStore,
} from './dev-object-store-bootstrap.mjs';

const ready = {
  context: DEV_S3_CONTEXT,
  clusterName: 'offscreen-dev',
  baselineOwner: 'offscreen-dev',
  dockerAvailable: true,
  kindAvailable: true,
  memoryMiB: 8000,
  timedOutCommands: [],
  resources: [],
};

test('the rendered store is private, pinned, and uses the dev storage class', () => {
  const manifest = renderDevObjectStore();
  assert.equal(renderDevObjectStore(), manifest);
  assert.match(manifest, new RegExp(DEV_S3_IMAGE));
  assert.match(manifest, new RegExp(`storageClassName: ${DEV_S3_STORAGE_CLASS}`));
  assert.match(manifest, /type: ClusterIP/);
  assert.doesNotMatch(manifest, /local-path/);
  assert.doesNotMatch(manifest, new RegExp(RELEASE_S3_NAMESPACE));
  assert.doesNotMatch(manifest, /stringData/);
  const plan = planDevObjectStore(ready);
  assert.equal(plan.refusals.length, 0);
  assert.equal(plan.readOnly, true);
});

test('fresh ensure creates one admin secret and a partial failure keeps it', () => {
  const created = ensureDevObjectStore(ready, { authorize: true });
  assert.deepEqual(created.actions.map((action) => action.op), ['create-secret', 'apply-store']);
  assert.equal(created.actions.every((action) => !action.context || action.context === DEV_S3_CONTEXT), true);
  const partial = ensureDevObjectStore(ready, { authorize: true, failAfterSecret: true });
  assert.equal(partial.ok, false);
  assert.deepEqual(partial.actions.map((action) => action.op), ['create-secret']);
  assert.equal(JSON.stringify(partial.actions).includes('delete'), false);
});

test('owned reentry reuses the secret and does not generate a new one', () => {
  const ownedProbe = {
    ...ready,
    resources: [
      { kind: 'Namespace', name: DEV_S3_NAMESPACE, owner: 'offscreen-dev', uid: 'ns' },
      { kind: 'Secret', name: 'object-store-s3', namespace: DEV_S3_NAMESPACE, owner: 'offscreen-dev', uid: 'sec' },
      { kind: 'PersistentVolumeClaim', name: 'object-store-data', owner: 'offscreen-dev', uid: 'pvc' },
      { kind: 'Deployment', name: 'object-store', image: DEV_S3_IMAGE, serviceType: 'ClusterIP' },
    ],
  };
  let generated = 0;
  const result = executeAuthorizedDevObjectStore({
    collect: () => ownedProbe,
    generateCredentials() {
      generated += 1;
      return { accessKeyId: 'new', secretAccessKey: 'new' };
    },
    run() {
      throw new Error('owned reentry must not apply');
    },
  });
  assert.equal(result.ok, true);
  assert.equal(generated, 0);
  assert.deepEqual(result.actions.map((action) => action.op), ['reuse-secret', 'noop']);
});

test('foreign resources, wrong context, low memory, and a copied admin secret refuse', () => {
  const cases = [
    { ...ready, resources: [{ kind: 'Namespace', name: DEV_S3_NAMESPACE }] },
    { ...ready, context: 'kind-offscreen-lab' },
    { ...ready, memoryMiB: 100 },
    { ...ready, resources: [{ kind: 'Secret', name: 'object-store-s3', namespace: 'app-slot', owner: 'offscreen-dev', uid: 'x' }] },
    { ...ready, resources: [{ kind: 'Namespace', name: RELEASE_S3_NAMESPACE }] },
  ];
  for (const probe of cases) {
    const result = ensureDevObjectStore(probe, { authorize: true });
    assert.equal(result.ok, false);
    assert.equal(result.mutated, false);
  }
  assert.equal(ensureDevObjectStore(ready).refusals.at(-1).id, 'ensure-not-authorized');
});

test('execution applies only the dev context and omits credential bytes from the receipt', () => {
  const calls = [];
  const result = executeAuthorizedDevObjectStore({
    collect: () => ready,
    generateCredentials: () => ({ accessKeyId: 'access-secret-value', secretAccessKey: 'secret-secret-value' }),
    run(command, args, options = {}) {
      calls.push({ command, args, input: options.input ?? '' });
      return { ok: true };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(result).includes('access-secret-value'), false);
  assert.equal(calls[0].args[1], DEV_S3_CONTEXT);
  assert.match(calls[0].input, /access-secret-value/);
  assert.match(calls[1].input, new RegExp(DEV_S3_NAMESPACE));
});

test('the CLI plans from an injected probe and refuses live ensure', () => {
  const script = join(dirname(fileURLToPath(import.meta.url)), 'dev-object-store-bootstrap-cli.mjs');
  const plan = spawnSync(process.execPath, [script, 'plan'], {
    encoding: 'utf8',
    env: { ...process.env, OFFSCREEN_DEV_S3_PROBE: JSON.stringify(ready), OFFSCREEN_DEV_S3_ENSURE: 'authorized' },
  });
  assert.equal(plan.status, 0);
  assert.equal(JSON.parse(plan.stdout).namespace, DEV_S3_NAMESPACE);
  const ensure = spawnSync(process.execPath, [script, 'ensure'], {
    encoding: 'utf8',
    env: { ...process.env, OFFSCREEN_DEV_S3_ENSURE: 'authorized', OFFSCREEN_DEV_S3_PROBE: JSON.stringify(ready) },
  });
  assert.equal(ensure.status, 2);
  assert.match(ensure.stderr, /refusing live object-store ensure/);
});
