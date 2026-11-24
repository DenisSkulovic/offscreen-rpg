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
} from '../src/adapters/dev-cnpg-bootstrap.mjs';

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

test('fresh ensure names only the dev context and a partial failure keeps earlier actions', () => {
  const created = ensureDevCnpg(ready, {
    authorize: true,
    operatorManifestSha256: pin.sha256,
  });
  assert.equal(created.ok, true);
  assert.equal(
    created.actions.every((action) => action.context === DEV_CNPG_CONTEXT),
    true,
  );
  assert.deepEqual(
    created.actions.map((action) => action.op),
    [
      'apply-operator',
      'wait-established-crd',
      'wait-operator-rollout',
      'apply-namespace',
      'apply-cluster',
    ],
  );
  const partial = ensureDevCnpg(ready, {
    authorize: true,
    failAfterOperator: true,
  });
  assert.equal(partial.ok, false);
  assert.equal(
    partial.actions.some((action) => action.op === 'apply-cluster'),
    false,
  );
  assert.equal(JSON.stringify(partial.actions).includes('delete'), false);
});

test('owned reentry is a no-op and foreign or release resources refuse', () => {
  const owned = ensureDevCnpg(
    {
      ...ready,
      resources: [
        {
          kind: 'Deployment',
          name: 'cnpg-controller-manager',
          namespace: 'cnpg-system',
          image: pin.operatorImage,
        },
        {
          kind: 'Namespace',
          name: DEV_CNPG_NAMESPACE,
          owner: 'offscreen-dev',
          uid: 'ns-1',
        },
        {
          kind: 'Cluster',
          name: DEV_CNPG_CLUSTER,
          namespace: DEV_CNPG_NAMESPACE,
          owner: 'offscreen-dev',
          uid: 'pg-1',
        },
      ],
    },
    { authorize: true },
  );
  assert.equal(owned.ok, true);
  assert.deepEqual(owned.actions, [{ op: 'noop' }]);

  const foreign = ensureDevCnpg(
    {
      ...ready,
      resources: [
        { kind: 'Namespace', name: DEV_CNPG_NAMESPACE, owner: null, uid: null },
      ],
    },
    { authorize: true },
  );
  assert.equal(foreign.ok, false);
  assert.equal(foreign.refusals[0].id, 'foreign-namespace');

  const release = statusDevCnpg({
    ...ready,
    resources: [{ kind: 'Namespace', name: RELEASE_CNPG_NAMESPACE }],
  });
  assert.equal(
    release.refusals.some((item) => item.id === 'release-resource-in-probe'),
    true,
  );
});

test('wrong context, low memory, timeout, bad pin, and missing authorization refuse', () => {
  for (const probe of [
    { ...ready, context: 'kind-offscreen-lab' },
    { ...ready, memoryMiB: 100 },
    { ...ready, timedOutCommands: ['docker'] },
    { ...ready, pin: { ...pin, sha256: 'abcd' } },
  ]) {
    const result = ensureDevCnpg(probe, { authorize: true });
    assert.equal(result.ok, false);
    assert.equal(result.mutated, false);
  }
  const unauthorized = ensureDevCnpg(ready);
  assert.equal(unauthorized.refusals.at(-1).id, 'ensure-not-authorized');
  const digest = ensureDevCnpg(ready, {
    authorize: true,
    operatorManifestSha256: 'a'.repeat(64),
  });
  assert.equal(digest.refusals[0].id, 'operator-manifest-sha-mismatch');
});

test('the CLI plans from an injected probe and refuses an injected live ensure', () => {
  const script = join(here, '../src/adapters/dev-cnpg-bootstrap-cli.mjs');
  const plan = spawnSync(process.execPath, [script, 'plan'], {
    encoding: 'utf8',
    env: { ...process.env, OFFSCREEN_DEV_CNPG_PROBE: JSON.stringify(ready) },
  });
  assert.equal(plan.status, 0);
  assert.equal(JSON.parse(plan.stdout).cluster, DEV_CNPG_CLUSTER);
  const ensure = spawnSync(process.execPath, [script, 'ensure'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      OFFSCREEN_DEV_CNPG_ENSURE: 'authorized',
      OFFSCREEN_DEV_CNPG_PROBE: JSON.stringify(ready),
    },
  });
  assert.equal(ensure.status, 2);
  assert.match(ensure.stderr, /injected probe cannot authorize/);
});

test('wrong target, unreadable reads, storage drift, digest, and operator waits refuse cluster apply', () => {
  const wrongTarget = ensureDevCnpg(
    { ...ready, context: 'kind-offscreen-lab' },
    { authorize: true },
  );
  assert.equal(
    wrongTarget.actions.some((action) => action.op === 'apply-cluster'),
    false,
  );

  const unreadable = ensureDevCnpg(
    {
      ...ready,
      unreadableReads: [
        { id: 'postgres-cluster', reason: 'kubectl get failed' },
      ],
    },
    { authorize: true },
  );
  assert.equal(unreadable.ok, false);
  assert.equal(
    unreadable.actions.some((action) => action.op === 'apply-cluster'),
    false,
  );

  const drift = ensureDevCnpg(
    {
      ...ready,
      resources: [
        {
          kind: 'Deployment',
          name: 'cnpg-controller-manager',
          namespace: 'cnpg-system',
          image: pin.operatorImage,
        },
        {
          kind: 'Namespace',
          name: DEV_CNPG_NAMESPACE,
          owner: 'offscreen-dev',
          uid: 'ns-1',
        },
        {
          kind: 'Cluster',
          name: DEV_CNPG_CLUSTER,
          namespace: DEV_CNPG_NAMESPACE,
          owner: 'offscreen-dev',
          uid: 'pg-1',
          storageClass: 'local-path',
        },
      ],
    },
    { authorize: true },
  );
  assert.equal(drift.ok, false);
  assert.equal(
    drift.refusals.some((item) => item.id === 'storage-class-drift'),
    true,
  );
  assert.equal(
    drift.actions.some((action) => action.op === 'apply-cluster'),
    false,
  );

  const digest = ensureDevCnpg(ready, {
    authorize: true,
    operatorManifestSha256: 'b'.repeat(64),
  });
  assert.equal(digest.ok, false);
  assert.equal(
    digest.actions.some((action) => action.op === 'apply-cluster'),
    false,
  );

  const waitFailure = ensureDevCnpg(ready, {
    authorize: true,
    operatorManifestSha256: pin.sha256,
    failOperatorWaits: true,
  });
  assert.equal(waitFailure.ok, false);
  assert.equal(
    waitFailure.refusals.some(
      (item) => item.id === 'operator-readiness-failed',
    ),
    true,
  );
  assert.equal(
    waitFailure.actions.some((action) => action.op === 'apply-cluster'),
    false,
  );

  const owned = ensureDevCnpg(
    {
      ...ready,
      crdState: 'present',
      resources: [
        {
          kind: 'Deployment',
          name: 'cnpg-controller-manager',
          namespace: 'cnpg-system',
          image: pin.operatorImage,
        },
        {
          kind: 'Namespace',
          name: DEV_CNPG_NAMESPACE,
          owner: 'offscreen-dev',
          uid: 'ns-1',
        },
        {
          kind: 'Cluster',
          name: DEV_CNPG_CLUSTER,
          namespace: DEV_CNPG_NAMESPACE,
          owner: 'offscreen-dev',
          uid: 'pg-1',
        },
      ],
    },
    { authorize: true },
  );
  assert.deepEqual(owned.actions, [{ op: 'noop' }]);
});

test('authorized execution rechecks the probe and applies only dev context commands', () => {
  let checks = 0;
  const calls = [];
  const result = executeAuthorizedDevCnpg({
    collect() {
      checks += 1;
      return ready;
    },
    readOperatorManifest() {
      return { body: `image: ${pin.operatorImage}\n`, sha256: pin.sha256 };
    },
    run(command, args) {
      calls.push({ command, args });
      return { ok: true, stdout: '', stderr: '' };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(checks, 2);
  assert.equal(
    calls.every(
      (call) =>
        call.args[0] === '--context' && call.args[1] === DEV_CNPG_CONTEXT,
    ),
    true,
  );
  assert.equal(
    calls.some((call) => call.args.includes('delete')),
    false,
  );
});
