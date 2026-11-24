import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectDevTemporalProbe } from '../src/adapters/dev-temporal-host-probe.mjs';
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
} from '../src/adapters/dev-temporal-bootstrap.mjs';

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
  const pin = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../infra/platform/temporal/images.pin'), 'utf8');
  const manifest = renderDevTemporal();
  assert.equal(renderDevTemporal(), manifest);
  assert.match(pin, new RegExp(DEV_TEMPORAL_SERVER_IMAGE.split(':')[1]));
  assert.match(manifest, new RegExp(DEV_TEMPORAL_SERVER_IMAGE));
  assert.match(manifest, new RegExp(DEV_TEMPORAL_ADMIN_IMAGE));
  assert.match(manifest, new RegExp(DEV_TEMPORAL_POSTGRES_IMAGE));
  assert.match(manifest, new RegExp(`"storageClassName":"${DEV_TEMPORAL_STORAGE_CLASS}"`));
  assert.match(manifest, /"type":"ClusterIP"/);
  assert.match(manifest, /\/etc\/temporal\/lab\/start\.sh/);
  assert.match(manifest, /databaseName: \\"temporal\\"/);
  assert.match(manifest, /databaseName: \\"temporal_visibility\\"/);
  assert.match(manifest, /grpcPort: 7233/);
  assert.match(manifest, /httpPort: 7243/);
  assert.match(manifest, /"name":"temporal-server-scripts"/);
  assert.match(manifest, /"name":"temporal-dynamic"/);
  assert.match(manifest, /POSTGRES_SEEDS/);
  assert.match(manifest, /setup-schema -v 0\.0/);
  assert.match(manifest, /nc -z \\"\$POSTGRES_SEEDS\\" 5432/);
  assert.doesNotMatch(manifest, /"args":\["start"/);
  assert.doesNotMatch(manifest, /ttlSecondsAfterFinished/);
  assert.doesNotMatch(manifest, /local-path/);
  assert.doesNotMatch(manifest, new RegExp(RELEASE_TEMPORAL_NAMESPACE));
  assert.doesNotMatch(manifest, /stringData/);
});

test('fresh ensure creates the secret and schema job once, and a partial failure keeps the secret', () => {
  const created = ensureDevTemporal(ready, { authorize: true });
  assert.deepEqual(created.actions.map((action) => action.op), ['ensure-namespace', 'create-secret', 'apply-postgres', 'create-schema-job', 'verify-schema', 'apply-server']);
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
      { kind: 'Deployment', name: 'temporal-postgres', owner: 'offscreen-dev', uid: 'dep-pg' },
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
  const verifyIdx = result.actions.findIndex((action) => action.op === 'verify-schema');
  const serverIdx = result.actions.findIndex(
    (action) => action.op === 'apply-server' || action.op === 'reuse-server',
  );
  assert.equal(verifyIdx >= 0 && serverIdx >= 0 && verifyIdx < serverIdx, true);
  assert.equal(calls.some((line) => line.includes(' create ')), false);
  const failed = ensureDevTemporal({ ...ready, resources: [{ kind: 'Job', name: DEV_TEMPORAL_SCHEMA_JOB, owner: 'offscreen-dev', uid: 'job', failed: true }] }, { authorize: true });
  assert.equal(failed.refusals.some((item) => item.id === 'schema-job-failed'), true);
  const foreign = ensureDevTemporal({ ...ready, resources: [{ kind: 'Job', name: DEV_TEMPORAL_SCHEMA_JOB, succeeded: true }] }, { authorize: true });
  assert.equal(foreign.ok, false);
  assert.equal(foreign.mutated, false);
  const unownedMap = ensureDevTemporal({ ...ready, resources: [{ kind: 'ConfigMap', name: 'temporal-dynamic', uid: 'cm' }] }, { authorize: true });
  assert.equal(unownedMap.ok, false);
  assert.equal(unownedMap.mutated, false);
  const blocked = executeAuthorizedDevTemporal({
    collect: () => ready,
    generatePassword: () => 'temporal-password-value',
    run(_command, args) {
      const joined = args.join(' ');
      if (joined.includes('availableReplicas')) return { ok: true, stdout: '1' };
      return { ok: true, stdout: '0' };
    },
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.actions.some((action) => action.op === 'apply-server'), false);
  assert.equal(blocked.refusals.some((item) => item.id === 'schema-not-ready'), true);
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
      const joined = args.join(' ');
      if (joined.includes('availableReplicas')) return { ok: true, stdout: '1' };
      if (joined.includes('status.succeeded')) return { ok: true, stdout: '1' };
      if (joined.includes('status.failed')) return { ok: true, stdout: '0' };
      return { ok: true, stdout: options.input ?? '' };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(result).includes('temporal-password-value'), false);
  const script = join(dirname(fileURLToPath(import.meta.url)), '../src/adapters/dev-temporal-bootstrap-cli.mjs');
  const ensure = spawnSync(process.execPath, [script, 'ensure'], {
    encoding: 'utf8',
    env: { ...process.env, OFFSCREEN_DEV_TEMPORAL_ENSURE: 'authorized', OFFSCREEN_DEV_TEMPORAL_PROBE: JSON.stringify(ready), OFFSCREEN_DEV_TEMPORAL_PROBE_MODE: 'test' },
  });
  assert.equal(ensure.status, 2);
  assert.match(ensure.stderr, /injected probe cannot authorize mutation/);
  const injectedPlan = spawnSync(process.execPath, [script, 'plan'], {
    encoding: 'utf8',
    env: { ...process.env, OFFSCREEN_DEV_TEMPORAL_PROBE: JSON.stringify(ready) },
  });
  assert.equal(injectedPlan.status, 2);
  assert.match(injectedPlan.stderr, /injected Temporal probe outside tests/);
});

test('the host probe drops secret data and records a foreign config map', () => {
  const probe = collectDevTemporalProbe({
    readMeminfo: () => 'MemAvailable: 8388608 kB\n',
    run(command, args) {
      const joined = args.join(' ');
      if (command === 'docker') return { ok: true, stdout: '28\n', timedOut: false };
      if (command === 'kind') return { ok: true, stdout: 'offscreen-dev\n', timedOut: false };
      if (joined.includes('current-context')) return { ok: true, stdout: 'kind-offscreen-lab\n', timedOut: false };
      if (joined.includes('cluster-info')) return { ok: true, stdout: 'https://127.0.0.1:24443\n', timedOut: false };
      if (joined.includes('offscreen-dev-system')) return { ok: true, stdout: JSON.stringify({ metadata: { labels: { 'offscreen.dev/owner': 'offscreen-dev' } } }), timedOut: false };
      if (joined.includes('storageclass')) return { ok: true, stdout: 'standard', timedOut: false };
      if (joined.includes('get secret')) {
        return { ok: true, stdout: JSON.stringify({ metadata: { name: 'temporal-db', namespace: DEV_TEMPORAL_NAMESPACE, uid: 'sec', labels: { 'offscreen.dev/owner': 'offscreen-dev' } }, data: { password: 'c2VjcmV0' } }), timedOut: false };
      }
      if (joined.includes('get configmap temporal-dynamic')) {
        return { ok: true, stdout: JSON.stringify({ metadata: { name: 'temporal-dynamic', namespace: DEV_TEMPORAL_NAMESPACE, uid: 'cm' } }), timedOut: false };
      }
      return { ok: false, stdout: '', timedOut: false };
    },
  });
  assert.equal(JSON.stringify(probe).includes('c2VjcmV0'), false);
  assert.equal(probe.currentContext, 'kind-offscreen-lab');
  assert.equal(probe.resources.find((item) => item.name === 'temporal-dynamic').owner, null);
});
