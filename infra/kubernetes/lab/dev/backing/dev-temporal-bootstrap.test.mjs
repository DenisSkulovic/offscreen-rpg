import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEV_TEMPORAL_ADMIN_IMAGE,
  DEV_TEMPORAL_CONTEXT,
  DEV_TEMPORAL_NAMESPACE,
  DEV_TEMPORAL_POSTGRES_IMAGE,
  DEV_TEMPORAL_SCHEMA_JOB,
  DEV_TEMPORAL_SERVER_IMAGE,
  DEV_TEMPORAL_STORAGE_CLASS,
  RELEASE_TEMPORAL_NAMESPACE,
  ensureDevTemporal,
  executeAuthorizedDevTemporal,
  renderDevTemporal,
} from './dev-temporal-bootstrap.mjs';

const ready = {
  context: DEV_TEMPORAL_CONTEXT,
  clusterName: 'offscreen-dev',
  baselineOwner: 'offscreen-dev',
  dockerAvailable: true,
  kindAvailable: true,
  memoryMiB: 8000,
  storageClass: DEV_TEMPORAL_STORAGE_CLASS,
  timedOutCommands: [],
  resources: [],
};

test('the rendered Temporal stack uses the pinned images and dev storage class', () => {
  const pin = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../temporal/images.pin'), 'utf8');
  const manifest = renderDevTemporal();
  assert.equal(renderDevTemporal(), manifest);
  assert.match(pin, new RegExp(DEV_TEMPORAL_SERVER_IMAGE.split(':')[1]));
  assert.match(manifest, new RegExp(DEV_TEMPORAL_SERVER_IMAGE));
  assert.match(manifest, new RegExp(DEV_TEMPORAL_ADMIN_IMAGE));
  assert.match(manifest, new RegExp(DEV_TEMPORAL_POSTGRES_IMAGE));
  assert.match(manifest, new RegExp(`storageClassName: ${DEV_TEMPORAL_STORAGE_CLASS}`));
  assert.match(manifest, /type: ClusterIP/);
  assert.doesNotMatch(manifest, /ttlSecondsAfterFinished/);
  assert.doesNotMatch(manifest, /local-path/);
  assert.doesNotMatch(manifest, new RegExp(RELEASE_TEMPORAL_NAMESPACE));
  assert.doesNotMatch(manifest, /stringData/);
});

test('fresh ensure creates the secret and schema job once, and a partial failure keeps the secret', () => {
  const created = ensureDevTemporal(ready, { authorize: true });
  assert.deepEqual(created.actions.map((action) => action.op), ['ensure-namespace', 'create-secret', 'apply-postgres', 'create-schema-job', 'apply-server', 'verify-readiness']);
  const partial = ensureDevTemporal(ready, { authorize: true, failAfterSecret: true });
  assert.equal(partial.ok, false);
  assert.equal(JSON.stringify(partial.actions).includes('delete'), false);
});

test('a succeeded schema job is reused and a failed or foreign job is not replaced', () => {
  const owned = {
    ...ready,
    resources: [
      { kind: 'Namespace', name: DEV_TEMPORAL_NAMESPACE, owner: 'offscreen-dev', uid: 'ns' },
      { kind: 'Secret', name: 'temporal-db', owner: 'offscreen-dev', uid: 'sec' },
      { kind: 'PersistentVolumeClaim', name: 'temporal-postgres', owner: 'offscreen-dev', uid: 'pvc' },
      { kind: 'Job', name: DEV_TEMPORAL_SCHEMA_JOB, owner: 'offscreen-dev', uid: 'job', succeeded: true },
      { kind: 'Deployment', name: 'temporal-server', owner: 'offscreen-dev', uid: 'dep', image: DEV_TEMPORAL_SERVER_IMAGE },
    ],
  };
  const calls = [];
  const result = executeAuthorizedDevTemporal({
    collect: () => owned,
    generatePassword() {
      throw new Error('password must not be regenerated');
    },
    run(_command, args) {
      calls.push(args.join(' '));
      return { ok: true, stdout: '1' };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.actions.some((action) => action.op === 'reuse-schema-job'), true);
  assert.equal(calls.some((line) => line.includes(' create ')), false);
  const failed = ensureDevTemporal({ ...ready, resources: [{ kind: 'Job', name: DEV_TEMPORAL_SCHEMA_JOB, owner: 'offscreen-dev', uid: 'job', failed: true }] }, { authorize: true });
  assert.equal(failed.refusals.some((item) => item.id === 'schema-job-failed'), true);
  const foreign = ensureDevTemporal({ ...ready, resources: [{ kind: 'Job', name: DEV_TEMPORAL_SCHEMA_JOB, succeeded: true }] }, { authorize: true });
  assert.equal(foreign.ok, false);
  assert.equal(foreign.mutated, false);
});

test('wrong context, low memory, and the release namespace refuse without mutation', () => {
  for (const probe of [
    { ...ready, context: 'kind-offscreen-lab' },
    { ...ready, memoryMiB: 100 },
    { ...ready, resources: [{ kind: 'Namespace', name: RELEASE_TEMPORAL_NAMESPACE }] },
  ]) {
    const result = ensureDevTemporal(probe, { authorize: true });
    assert.equal(result.ok, false);
    assert.equal(result.mutated, false);
  }
});

test('execution omits the password from the receipt and the CLI refuses live ensure', () => {
  const result = executeAuthorizedDevTemporal({
    collect: () => ready,
    generatePassword: () => 'temporal-password-value',
    run(_command, args, options = {}) {
      assert.equal(args[1], DEV_TEMPORAL_CONTEXT);
      return { ok: true, stdout: args.includes('jsonpath={.status.succeeded}') ? '1' : options.input ?? '' };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(result).includes('temporal-password-value'), false);
  const script = join(dirname(fileURLToPath(import.meta.url)), 'dev-temporal-bootstrap-cli.mjs');
  const ensure = spawnSync(process.execPath, [script, 'ensure'], {
    encoding: 'utf8',
    env: { ...process.env, OFFSCREEN_DEV_TEMPORAL_ENSURE: 'authorized', OFFSCREEN_DEV_TEMPORAL_PROBE: JSON.stringify(ready) },
  });
  assert.equal(ensure.status, 2);
  assert.match(ensure.stderr, /cannot authorize mutation/);
});
