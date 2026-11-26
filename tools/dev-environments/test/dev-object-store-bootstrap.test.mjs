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

/** Observation failure. This must not look like an absent namespace. */
function closedRun() {
  return { ok: false, status: 1, stdout: '', stderr: 'closed' };
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
  const plan = planDevObjectStore(ready, { run: closedRun });
  assert.equal(plan.readOnly, true);
  assert.equal(plan.state, 'unknown');
});

test('sync ensure does not write and does not report a mutation', () => {
  const created = ensureDevObjectStore(
    ready,
    { authorize: true },
    { run: closedRun },
  );
  assert.equal(created.ok, false);
  assert.equal(created.mutated, false);
  assert.equal(created.state, 'unknown');
  assert.deepEqual(created.actions, []);
  const partial = ensureDevObjectStore(
    ready,
    { authorize: true, failAfterSecret: true },
    { run: closedRun },
  );
  assert.equal(partial.ok, false);
  assert.equal(partial.mutated, false);
  assert.equal(JSON.stringify(partial.actions).includes('delete'), false);
});

test('unreadable observation does not generate credentials or write', async () => {
  let generated = 0;
  const calls = [];
  const result = await executeAuthorizedDevObjectStore({
    generateCredentials() {
      generated += 1;
      return { accessKeyId: 'new', secretAccessKey: 'new' };
    },
    run(command, args) {
      calls.push({ command, args });
      return closedRun();
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.mutated, false);
  assert.equal(generated, 0);
  assert.equal(
    calls.some((call) =>
      /\b(apply|create|delete|patch|replace|install|upgrade)\b/i.test(
        call.args.join(' '),
      ),
    ),
    false,
  );
});

test('foreign resources, wrong context, low memory, and a copied admin secret refuse', () => {
  const cases = [
    { ...ready, resources: [{ kind: 'Namespace', name: DEV_S3_NAMESPACE }] },
    { ...ready, context: 'kind-offscreen-release' },
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
    const result = ensureDevObjectStore(
      probe,
      { authorize: true },
      { run: closedRun },
    );
    assert.equal(result.ok, false);
    assert.equal(result.mutated, false);
  }
  assert.equal(
    ensureDevObjectStore(ready, {}, { run: closedRun }).refusals.at(-1).id,
    'ensure-not-authorized',
  );
});

test('unreadable execution omits credential bytes and does not apply', async () => {
  const calls = [];
  const result = await executeAuthorizedDevObjectStore({
    generateCredentials: () => ({
      accessKeyId: 'access-secret-value',
      secretAccessKey: 'secret-secret-value',
    }),
    run(command, args, options = {}) {
      calls.push({ command, args, input: options.input ?? '' });
      return closedRun();
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.mutated, false);
  assert.equal(JSON.stringify(result).includes('access-secret-value'), false);
  assert.equal(
    calls.some(
      (call) => call.args.includes('apply') || call.args.includes('install'),
    ),
    false,
  );
});

test('the CLI plans from an injected probe and refuses live ensure', () => {
  const script = join(
    dirname(fileURLToPath(import.meta.url)),
    '../src/adapters/dev-object-store-bootstrap-cli.mjs',
  );
  const env = { ...process.env };
  delete env.OFFSCREEN_DEV_S3_ENSURE;
  for (const subcommand of ['plan', 'ensure', 'prove']) {
    const result = spawnSync(process.execPath, [script, subcommand], {
      encoding: 'utf8',
      env,
    });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /sole writer/);
    assert.equal(result.stdout, '');
  }
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
  const result = ensureDevObjectStore(
    probe,
    { authorize: true },
    { run: closedRun },
  );
  assert.equal(result.ok, false);
  assert.equal(result.mutated, false);
  assert.equal(result.state, 'unknown');
});

test('unreadable probe refuses without mutation', async () => {
  const probe = {
    ...ready,
    unreadables: [
      { kind: 'Secret', name: 'object-store-s3', reason: 'kubectl get failed' },
    ],
  };
  const calls = [];
  const result = await executeAuthorizedDevObjectStore({
    collect: () => probe,
    run(command, args) {
      calls.push(args);
      return closedRun();
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.mutated, false);
  assert.equal(
    calls.some((args) =>
      /\b(apply|create|delete|patch|replace|install|upgrade)\b/i.test(
        args.join(' '),
      ),
    ),
    false,
  );
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
        if (args.includes('object-store-data'))
          return { ok: true, stdout: 'invalid JSON' };
        if (args.includes('object-store-s3'))
          return {
            ok: true,
            stdout: JSON.stringify({
              metadata: {
                name: 'object-store-s3',
                namespace: DEV_S3_NAMESPACE,
                labels: { 'offscreen.dev/owner': 'offscreen-dev' },
                uid: 'sec',
              },
              data: { password: 'fixture-private' },
            }),
          };
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
