import assert from 'node:assert/strict';
import process from 'node:process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  DEV_CNPG_CLUSTER,
  DEV_CNPG_CONTEXT,
  DEV_CNPG_MAX_CONNECTIONS,
  DEV_CNPG_NAMESPACE,
  DEV_CNPG_POOL_CAP,
  RELEASE_CNPG_NAMESPACE,
  ensureDevCnpg,
  executeAuthorizedDevCnpg,
  parseCnpgPin,
  planDevCnpg,
  renderDevCnpgCluster,
  statusDevCnpg,
} from '../../../infra/platform/postgres/dev-bootstrap.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const pin = parseCnpgPin(
  readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      '../../../infra/platform/postgres/operator.pin',
    ),
    'utf8',
  ),
);

const ready = {
  context: DEV_CNPG_CONTEXT,
  clusterName: 'offscreen-dev',
  apiServer: 'https://127.0.0.1:24443',
  baselineOwner: 'offscreen-dev',
  memoryMiB: 8000,
  dockerAvailable: true,
  kindAvailable: true,
  timedOutCommands: [],
  pin,
  resources: [],
};

test('the rendered cluster is deterministic and uses the pinned image and connection budget', () => {
  const manifest = renderDevCnpgCluster(pin);
  assert.equal(renderDevCnpgCluster(pin), manifest);
  assert.match(manifest, new RegExp(`imageName: ${pin.postgresImage}`));
  assert.match(
    manifest,
    new RegExp(`max_connections: "${DEV_CNPG_MAX_CONNECTIONS}"`),
  );
  assert.equal(DEV_CNPG_POOL_CAP, 2);
  assert.doesNotMatch(manifest, new RegExp(RELEASE_CNPG_NAMESPACE));
  const plan = planDevCnpg(ready);
  assert.equal(plan.readOnly, true);
  assert.equal(plan.context, DEV_CNPG_CONTEXT);
  assert.equal(plan.refusals.length, 0);
  assert.match(
    plan.clusterManifest,
    new RegExp(`namespace: ${DEV_CNPG_NAMESPACE}`),
  );
});

test('projected observations cannot authorize creation', () => {
  const result = ensureDevCnpg(ready, { authorize: true });
  assert.equal(result.ok, false);
  assert.equal(result.mutated, false);
  assert.ok(result.refusals.some(item => item.id === 'full-observation-required'));
  assert.deepEqual(result.actions, []);
});

test('full cold observation previews create-only operations without claiming writes', () => {
  const result = ensureDevCnpg({ ...ready, fullAssessment: {
    operator: 'absent', namespace: 'absent', cluster: 'absent', refusals: [],
  } }, { authorize: true });
  assert.equal(result.ok, true);
  assert.equal(result.mutated, false);
  assert.deepEqual(result.actions.map(item => item.op),
    ['apply-operator', 'create-namespace', 'create-cluster', 'wait-cluster-ready']);
});

test('compatible full observation previews verification only', () => {
  const result = ensureDevCnpg({ ...ready, fullAssessment: {
    operator: 'ready', namespace: 'compatible', cluster: 'ready', refusals: [],
  } }, { authorize: true });
  assert.equal(result.ok, true);
  assert.equal(result.mutated, false);
  assert.deepEqual(result.actions.map(item => item.op), ['verify-operator', 'wait-cluster-ready']);
});

test('wrong context, low memory, timeout, bad pin, unreadable and foreign resources refuse', () => {
  for (const probe of [
    { ...ready, context: 'kind-offscreen-release' },
    { ...ready, memoryMiB: 100 },
    { ...ready, timedOutCommands: ['docker'] },
    { ...ready, pin: { ...pin, sha256: 'abcd' } },
    { ...ready, unreadableReads: [{ id: 'postgres-cluster' }] },
    { ...ready, resources: [{ kind: 'Namespace', name: DEV_CNPG_NAMESPACE, owner: null }] },
    { ...ready, resources: [{ kind: 'Namespace', name: RELEASE_CNPG_NAMESPACE }] },
  ]) {
    const result = ensureDevCnpg(probe, { authorize: true });
    assert.equal(result.ok, false);
    assert.equal(result.mutated, false);
    assert.deepEqual(result.actions, []);
  }
});

test('CLI supports injected read-only plan but refuses injected ensure', () => {
  const script = join(here, '../src/adapters/dev-cnpg-bootstrap-cli.mjs');
  const env = { ...process.env, OFFSCREEN_DEV_CNPG_PROBE: JSON.stringify(ready),
    OFFSCREEN_DEV_CNPG_ENSURE: 'authorized' };
  const plan = spawnSync(process.execPath, [script, 'plan'], { encoding: 'utf8', env });
  assert.equal(plan.status, 0, plan.stderr);
  assert.equal(JSON.parse(plan.stdout).cluster, DEV_CNPG_CLUSTER);
  const ensure = spawnSync(process.execPath, [script, 'ensure'], { encoding: 'utf8', env });
  assert.equal(ensure.status, 2);
  assert.match(ensure.stderr, /injected probes forbidden/);
});
