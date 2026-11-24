import assert from 'node:assert/strict';
import process from 'node:process';
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
  objectStoreReadinessMet,
  planDevObjectStore,
  renderDevObjectStore,
} from '../../../infra/platform/object-storage/dev-bootstrap.mjs';

function readinessStdout(args) {
  const text = args.join(' ');
  if (text.includes('jsonpath={.status.phase}'))
    return { ok: true, stdout: 'Bound\n' };
  if (text.includes('availableReplicas')) return { ok: true, stdout: '1\n' };
  if (text.includes('http_code')) return { ok: true, stdout: '403' };
  return { ok: true, stdout: '' };
}

const ready = {
  context: DEV_S3_CONTEXT,
  clusterName: 'offscreen-dev',
  baselineOwner: 'offscreen-dev',
  dockerAvailable: true,
  kindAvailable: true,
  memoryMiB: 8000,
  storageClass: 'standard',
  timedOutCommands: [],
  resources: [],
};

test('the rendered store is private, pinned, and uses the dev storage class', () => {
  const manifest = renderDevObjectStore();
  assert.equal(renderDevObjectStore(), manifest);
  assert.match(manifest, new RegExp(DEV_S3_IMAGE));
  assert.match(
    manifest,
    new RegExp(`"storageClassName":"${DEV_S3_STORAGE_CLASS}"`),
  );
  assert.match(manifest, /"runAsNonRoot":true/);
  assert.match(manifest, /"automountServiceAccountToken":false/);
  assert.match(manifest, /"type":"ClusterIP"/);
  assert.doesNotMatch(manifest, /local-path/);
  assert.doesNotMatch(manifest, new RegExp(RELEASE_S3_NAMESPACE));
  assert.doesNotMatch(manifest, /stringData/);
  const plan = planDevObjectStore(ready);
  assert.equal(plan.refusals.length, 0);
  assert.equal(plan.readOnly, true);
});

test('fresh ensure creates one admin secret and a partial failure keeps it', () => {
  const created = ensureDevObjectStore(ready, { authorize: true });
  assert.deepEqual(
    created.actions.map((action) => action.op),
    [
      'ensure-namespace',
      'create-secret',
      'apply-workloads',
      'verify-readiness',
    ],
  );
  assert.equal(
    created.actions.every(
      (action) => !action.context || action.context === DEV_S3_CONTEXT,
    ),
    true,
  );
  const partial = ensureDevObjectStore(ready, {
    authorize: true,
    failAfterSecret: true,
  });
  assert.equal(partial.ok, false);
  assert.deepEqual(
    partial.actions.map((action) => action.op),
    ['ensure-namespace', 'create-secret'],
  );
  assert.equal(JSON.stringify(partial.actions).includes('delete'), false);
});

test('owned reentry reuses the secret and does not generate a new one', () => {
  const ownedProbe = {
    ...ready,
    resources: [
      {
        kind: 'Namespace',
        name: DEV_S3_NAMESPACE,
        owner: 'offscreen-dev',
        uid: 'ns',
      },
      {
        kind: 'Secret',
        name: 'object-store-s3',
        namespace: DEV_S3_NAMESPACE,
        owner: 'offscreen-dev',
        uid: 'sec',
      },
      {
        kind: 'PersistentVolumeClaim',
        name: 'object-store-data',
        owner: 'offscreen-dev',
        uid: 'pvc',
      },
      {
        kind: 'Deployment',
        name: 'object-store',
        owner: 'offscreen-dev',
        uid: 'dep',
        image: DEV_S3_IMAGE,
      },
      {
        kind: 'Service',
        name: 'object-store',
        owner: 'offscreen-dev',
        uid: 'svc',
        serviceType: 'ClusterIP',
      },
    ],
  };
  let generated = 0;
  const result = executeAuthorizedDevObjectStore({
    collect: () => ownedProbe,
    generateCredentials() {
      generated += 1;
      return { accessKeyId: 'new', secretAccessKey: 'new' };
    },
    run(_command, args) {
      return readinessStdout(args);
    },
  });
  assert.equal(result.ok, true);
  assert.equal(generated, 0);
  assert.deepEqual(
    result.actions.map((action) => action.op),
    ['reuse-secret', 'verify-readiness'],
  );
});

test('foreign resources, wrong context, low memory, and a copied admin secret refuse', () => {
  const cases = [
    { ...ready, resources: [{ kind: 'Namespace', name: DEV_S3_NAMESPACE }] },
    { ...ready, context: 'kind-offscreen-lab' },
    { ...ready, memoryMiB: 100 },
    {
      ...ready,
      resources: [
        {
          kind: 'Secret',
          name: 'object-store-s3',
          namespace: 'app-slot',
          owner: 'offscreen-dev',
          uid: 'x',
        },
      ],
    },
    {
      ...ready,
      resources: [
        { kind: 'Deployment', name: 'object-store', image: DEV_S3_IMAGE },
      ],
    },
    {
      ...ready,
      resources: [
        { kind: 'Service', name: 'object-store', serviceType: 'ClusterIP' },
      ],
    },
    {
      ...ready,
      resources: [{ kind: 'Namespace', name: RELEASE_S3_NAMESPACE }],
    },
  ];
  for (const probe of cases) {
    const result = ensureDevObjectStore(probe, { authorize: true });
    assert.equal(result.ok, false);
    assert.equal(result.mutated, false);
  }
  assert.equal(
    ensureDevObjectStore(ready).refusals.at(-1).id,
    'ensure-not-authorized',
  );
});

test('execution applies only the dev context and omits credential bytes from the receipt', () => {
  const calls = [];
  const result = executeAuthorizedDevObjectStore({
    collect: () => ready,
    generateCredentials: () => ({
      accessKeyId: 'access-secret-value',
      secretAccessKey: 'secret-secret-value',
    }),
    run(command, args, options = {}) {
      calls.push({ command, args, input: options.input ?? '' });
      return readinessStdout(args);
    },
  });
  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(result).includes('access-secret-value'), false);
  assert.equal(calls[0].args[1], DEV_S3_CONTEXT);
  assert.match(calls[0].input, new RegExp(`"name":"${DEV_S3_NAMESPACE}"`));
  assert.equal(calls[1].args.includes('create'), true);
  assert.match(calls[1].input, /access-secret-value/);
  assert.doesNotMatch(calls[2].input, /"kind":"Secret"/);
  assert.match(calls[2].input, /"kind":"Deployment"/);
});

test('secret creation failure does not apply workloads, and a later pass reuses the secret', () => {
  const calls = [];
  const failed = executeAuthorizedDevObjectStore({
    collect: () => ready,
    generateCredentials: () => ({
      accessKeyId: 'kept-access',
      secretAccessKey: 'kept-secret',
    }),
    run(_command, _args, options = {}) {
      calls.push(options.input ?? '');
      return { ok: !String(options.input).includes('"kind":"Secret"') };
    },
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.refusals[0].id, 'create-secret-failed');
  assert.equal(
    calls.some((input) => input.includes('"kind":"Deployment"')),
    false,
  );
  const recovered = ensureDevObjectStore(
    {
      ...ready,
      resources: [
        {
          kind: 'Namespace',
          name: DEV_S3_NAMESPACE,
          owner: 'offscreen-dev',
          uid: 'ns',
        },
        {
          kind: 'Secret',
          name: 'object-store-s3',
          namespace: DEV_S3_NAMESPACE,
          owner: 'offscreen-dev',
          uid: 'sec',
        },
      ],
    },
    { authorize: true },
  );
  assert.deepEqual(
    recovered.actions.map((action) => action.op),
    ['reuse-secret', 'apply-workloads', 'verify-readiness'],
  );
});

test('the CLI plans from an injected probe and refuses live ensure', () => {
  const script = join(
    dirname(fileURLToPath(import.meta.url)),
    '../src/adapters/dev-object-store-bootstrap-cli.mjs',
  );
  const plan = spawnSync(process.execPath, [script, 'plan'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      OFFSCREEN_DEV_S3_PROBE: JSON.stringify(ready),
      OFFSCREEN_DEV_S3_ENSURE: 'authorized',
    },
  });
  assert.equal(plan.status, 0);
  assert.equal(JSON.parse(plan.stdout).namespace, DEV_S3_NAMESPACE);
  const ensure = spawnSync(process.execPath, [script, 'ensure'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      OFFSCREEN_DEV_S3_ENSURE: 'authorized',
      OFFSCREEN_DEV_S3_PROBE: JSON.stringify(ready),
    },
  });
  assert.equal(ensure.status, 2);
  assert.match(ensure.stderr, /injected probe cannot authorize mutation/);
});

test('pvc or deployment without admin secret refuses', () => {
  const probe = {
    ...ready,
    resources: [
      {
        kind: 'PersistentVolumeClaim',
        name: 'object-store-data',
        owner: 'offscreen-dev',
        uid: 'pvc',
        storageClass: DEV_S3_STORAGE_CLASS,
      },
    ],
  };
  const result = ensureDevObjectStore(probe, { authorize: true });
  assert.equal(result.ok, false);
  assert.equal(
    result.refusals.some((item) => item.id === 'admin-secret-missing'),
    true,
  );
});

test('unreadable probe refuses without mutation', () => {
  const probe = {
    ...ready,
    unreadables: [
      { kind: 'Secret', name: 'object-store-s3', reason: 'kubectl get failed' },
    ],
  };
  const calls = [];
  const result = executeAuthorizedDevObjectStore({
    collect: () => probe,
    run(command, args) {
      calls.push(args);
      return { ok: true, stdout: '' };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.mutated, false);
  assert.equal(calls.length, 0);
});

test('a successful kubectl get is not readiness', () => {
  assert.equal(
    objectStoreReadinessMet({
      pvcPhase: 'Pending',
      availableReplicas: '1',
      s3Status: '403',
    }),
    false,
  );
  assert.equal(
    objectStoreReadinessMet({
      pvcPhase: 'Bound',
      availableReplicas: '0',
      s3Status: '403',
    }),
    false,
  );
  assert.equal(
    objectStoreReadinessMet({
      pvcPhase: 'Bound',
      availableReplicas: '1',
      s3Status: '000',
    }),
    false,
  );
  assert.equal(
    objectStoreReadinessMet({
      pvcPhase: 'Bound',
      availableReplicas: '1',
      s3Status: '403',
    }),
    true,
  );
});

import { collectDevObjectStoreProbe } from '../../../infra/platform/object-storage/dev-host-probe.mjs';

test('host inventory uses get-scoped ignore-not-found and refuses malformed responses', () => {
  const observed = [];
  const probe = collectDevObjectStoreProbe({
    readMeminfo: () => 'MemAvailable: 8192000 kB',
    run(command, args) {
      if (args.includes('--ignore-not-found')) {
        observed.push(args);
        assert.ok(args.indexOf('get') < args.indexOf('--ignore-not-found'));
        if (args.includes('object-store-data')) return { ok: true, stdout: 'invalid JSON' };
        if (args.includes('object-store-s3')) return { ok: true, stdout: JSON.stringify({ metadata: { name: 'object-store-s3', namespace: DEV_S3_NAMESPACE, labels: { 'offscreen.dev/owner': 'offscreen-dev' }, uid: 'sec' }, data: { password: 'fixture-private' } }) };
      }
      return { ok: true, stdout: '' };
    },
  });
  assert.equal(observed.length, 5);
  assert.equal(probe.unreadables.length, 1);
  assert.equal(probe.unreadables[0].reason, 'malformed json');
  assert.equal(probe.resources[0].uid, 'sec');
  assert.ok(!JSON.stringify(probe).includes('fixture-private'));
});
