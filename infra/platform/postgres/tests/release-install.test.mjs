import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runPlatformCommand } from '../../common/commands.mjs';
import { renderPlatformDocuments } from '../../common/render.mjs';
import {
  parseCnpgPin,
  RELEASE_CNPG_CLUSTER,
  RELEASE_CNPG_NAMESPACE,
} from '../dev-bootstrap.mjs';
import {
  RELEASE_CNPG_CLUSTER_NAME,
  RELEASE_CNPG_CONTEXT,
  ensureReleaseCnpg,
  assertReleaseClusterPin,
  executeAuthorizedReleaseCnpg,
  planReleaseCnpg,
} from '../release-install.mjs';

const postgresRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pin = parseCnpgPin(
  readFileSync(join(postgresRoot, 'operator.pin'), 'utf8'),
);

function helmRun(command, args, options) {
  if (command !== 'helm') {
    return {
      ok: false,
      status: 1,
      stdout: '',
      stderr: 'unexpected command',
      timedOut: false,
      missing: false,
    };
  }
  return runPlatformCommand(command, args, options);
}

function compatibleNamespace() {
  return {
    kind: 'Namespace',
    name: RELEASE_CNPG_NAMESPACE,
    labLabel: 'disposable',
    uid: 'ns-1',
  };
}

function compatibleCluster() {
  const docs = renderPlatformDocuments(
    { service: 'postgres', profile: 'release', section: 'cluster' },
    { run: helmRun },
  );
  const spec = docs[0].spec;
  return {
    kind: 'Cluster',
    name: RELEASE_CNPG_CLUSTER,
    namespace: RELEASE_CNPG_NAMESPACE,
    uid: 'pg-1',
    image: spec.imageName,
    instances: spec.instances,
    storageClass: spec.storage.storageClass,
    storageSize: spec.storage.size,
    bootstrap: {
      database: spec.bootstrap.initdb.database,
      owner: spec.bootstrap.initdb.owner,
      localeCType: spec.bootstrap.initdb.localeCType,
      localeCollate: spec.bootstrap.initdb.localeCollate,
    },
  };
}

const ready = {
  context: RELEASE_CNPG_CONTEXT,
  clusterName: RELEASE_CNPG_CLUSTER_NAME,
  apiServer: 'https://127.0.0.1:6443',
  memoryMiB: 8000,
  timedOutCommands: [],
  pin,
  resources: [],
  crdState: 'absent',
};

test('matching namespace, cluster, and operator reuse without apply writes', () => {
  const decision = ensureReleaseCnpg(
    {
      ...ready,
      resources: [
        {
          kind: 'Deployment',
          name: 'cnpg-controller-manager',
          namespace: 'cnpg-system',
          image: pin.operatorImage,
        },
        compatibleNamespace(),
        compatibleCluster(),
      ],
      crdState: 'present',
    },
    { authorize: true, operatorManifestSha256: pin.sha256 },
  );
  assert.equal(decision.ok, true);
  assert.equal(decision.mutated, false);
  assert.equal(
    decision.actions.some((action) => String(action.op).startsWith('apply-')),
    false,
  );
  assert.deepEqual(
    decision.actions.map((action) => action.op),
    ['verify-operator', 'wait-webhook-endpoint', 'wait-cluster-ready'],
  );
});

test('missing namespace and cluster plan create only the absent pieces', () => {
  const created = ensureReleaseCnpg(ready, {
    authorize: true,
    operatorManifestSha256: pin.sha256,
  });
  assert.equal(created.ok, true);
  assert.deepEqual(
    created.actions.map((action) => action.op),
    [
      'apply-operator',
      'wait-established-crd',
      'wait-operator-rollout',
      'wait-webhook-endpoint',
      'apply-namespace',
      'apply-cluster',
      'wait-cluster-ready',
    ],
  );
  const onlyNamespace = ensureReleaseCnpg(
    {
      ...ready,
      resources: [
        {
          kind: 'Deployment',
          name: 'cnpg-controller-manager',
          namespace: 'cnpg-system',
          image: pin.operatorImage,
        },
        compatibleCluster(),
      ],
      crdState: 'present',
    },
    { authorize: true, operatorManifestSha256: pin.sha256 },
  );
  assert.equal(onlyNamespace.ok, true);
  assert.equal(
    onlyNamespace.actions.some((action) => action.op === 'apply-cluster'),
    false,
  );
  assert.equal(
    onlyNamespace.actions.some((action) => action.op === 'apply-namespace'),
    true,
  );

  const onlyCluster = ensureReleaseCnpg(
    {
      ...ready,
      resources: [
        {
          kind: 'Deployment',
          name: 'cnpg-controller-manager',
          namespace: 'cnpg-system',
          image: pin.operatorImage,
        },
        compatibleNamespace(),
      ],
      crdState: 'present',
    },
    { authorize: true, operatorManifestSha256: pin.sha256 },
  );
  assert.equal(onlyCluster.ok, true);
  assert.equal(
    onlyCluster.actions.some((action) => action.op === 'apply-namespace'),
    false,
  );
  assert.equal(
    onlyCluster.actions.some((action) => action.op === 'apply-cluster'),
    true,
  );
});

test('plan remains read-only and uses the release renderer', () => {
  const plan = planReleaseCnpg(ready, { run: helmRun });
  assert.equal(plan.readOnly, true);
  assert.match(plan.namespaceManifest, /"name":"lab-postgres"/);
  assert.match(
    plan.clusterManifest,
    new RegExp(`"imageName":"${pin.postgresImage}"`),
  );
});

test('unreadable observation, foreign resources, and spec mismatch refuse create', () => {
  const unreadable = ensureReleaseCnpg(
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
    unreadable.actions.some((action) => action.op?.startsWith('apply-')),
    false,
  );

  const foreignNs = ensureReleaseCnpg(
    {
      ...ready,
      resources: [
        {
          kind: 'Namespace',
          name: RELEASE_CNPG_NAMESPACE,
          labLabel: null,
          uid: 'ns-1',
        },
      ],
    },
    { authorize: true },
  );
  assert.equal(foreignNs.refusals[0].id, 'foreign-namespace');
  assert.equal(
    foreignNs.actions.some((action) => action.op?.startsWith('apply-')),
    false,
  );

  const imageMismatch = ensureReleaseCnpg(
    {
      ...ready,
      resources: [
        {
          kind: 'Deployment',
          name: 'cnpg-controller-manager',
          namespace: 'cnpg-system',
          image: pin.operatorImage,
        },
        compatibleNamespace(),
        {
          ...compatibleCluster(),
          image: 'ghcr.io/cloudnative-pg/postgresql:0.0.0',
        },
      ],
      crdState: 'present',
    },
    { authorize: true },
  );
  assert.equal(
    imageMismatch.refusals.some((item) => item.id === 'cluster-spec-mismatch'),
    true,
  );
  assert.equal(
    imageMismatch.actions.some((action) => action.op === 'apply-cluster'),
    false,
  );

  const storageMismatch = ensureReleaseCnpg(
    {
      ...ready,
      resources: [
        {
          kind: 'Deployment',
          name: 'cnpg-controller-manager',
          namespace: 'cnpg-system',
          image: pin.operatorImage,
        },
        compatibleNamespace(),
        { ...compatibleCluster(), storageClass: 'standard' },
      ],
      crdState: 'present',
    },
    { authorize: true },
  );
  assert.equal(
    storageMismatch.refusals.some(
      (item) => item.id === 'cluster-spec-mismatch',
    ),
    true,
  );

  const operatorMismatch = ensureReleaseCnpg(
    {
      ...ready,
      resources: [
        {
          kind: 'Deployment',
          name: 'cnpg-controller-manager',
          namespace: 'cnpg-system',
          image: 'ghcr.io/cloudnative-pg/cloudnative-pg:0.0.0',
        },
        compatibleNamespace(),
        compatibleCluster(),
      ],
      crdState: 'present',
    },
    { authorize: true },
  );
  assert.equal(
    operatorMismatch.refusals.some(
      (item) => item.id === 'operator-image-mismatch',
    ),
    true,
  );
  assert.equal(
    operatorMismatch.actions.some((action) => action.op === 'apply-operator'),
    false,
  );

  const unauthorized = ensureReleaseCnpg(ready);
  assert.equal(unauthorized.refusals.at(-1).id, 'ensure-not-authorized');
});

test('matching operator verifies readiness and rejects a bad manifest digest', () => {
  const matching = ensureReleaseCnpg(
    {
      ...ready,
      resources: [
        {
          kind: 'Deployment',
          name: 'cnpg-controller-manager',
          namespace: 'cnpg-system',
          image: pin.operatorImage,
        },
      ],
      crdState: 'present',
    },
    { authorize: true, operatorManifestSha256: pin.sha256 },
  );
  assert.equal(matching.actions[0].op, 'verify-operator');
  assert.equal(
    matching.actions.some((action) => action.op === 'apply-operator'),
    false,
  );
  let manifestReads = 0;
  const executed = executeAuthorizedReleaseCnpg({
    collect: () => ({
      ...ready,
      resources: [
        {
          kind: 'Deployment',
          name: 'cnpg-controller-manager',
          namespace: 'cnpg-system',
          image: pin.operatorImage,
        },
      ],
      crdState: 'present',
    }),
    readOperatorManifest: () => {
      manifestReads += 1;
      return { body: '', sha256: '' };
    },
    run: (_command, args) => {
      const query = args.join(' ');
      if (query.includes('jsonpath={.status.phase}')) {
        return { ok: true, stdout: 'Cluster in healthy state', stderr: '' };
      }
      if (query.includes('jsonpath={.spec.instances}')) {
        return { ok: true, stdout: '1', stderr: '' };
      }
      if (query.includes("type=='Ready'")) {
        return { ok: true, stdout: 'True', stderr: '' };
      }
      return { ok: true, stdout: '10.0.0.1', stderr: '' };
    },
  });
  assert.equal(executed.ok, true);
  assert.equal(manifestReads, 0);

  const digest = ensureReleaseCnpg(ready, {
    authorize: true,
    operatorManifestSha256: 'a'.repeat(64),
  });
  assert.equal(digest.refusals[0].id, 'operator-manifest-sha-mismatch');
  assert.equal(
    digest.actions.some((action) => action.op?.startsWith('apply-')),
    false,
  );
});


test('release installer CLI validates structured render and actually executes', () => {
  const result = spawnSync(process.execPath, [join(postgresRoot, 'release-install.mjs'), 'verify-render'], { encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'release PostgreSQL render verified');
  const unknown = spawnSync(process.execPath, [join(postgresRoot, 'release-install.mjs'), 'unknown'], { encoding: 'utf8', timeout: 30000 });
  assert.equal(unknown.status, 2);
});

test('release render guard rejects wrong pin, count and identity', () => {
  const docs = renderPlatformDocuments({ service: 'postgres', profile: 'release', section: 'cluster' });
  assert.doesNotThrow(() => assertReleaseClusterPin(docs, pin));
  const bad = structuredClone(docs);
  bad[0].spec.imageName += '-wrong';
  assert.throws(() => assertReleaseClusterPin(bad, pin), /imageName/);
  bad[0].spec.imageName = pin.postgresImage;
  bad[0].spec.instances = 2;
  assert.throws(() => assertReleaseClusterPin(bad, pin), /one instance/);
  assert.throws(() => assertReleaseClusterPin([], pin), /identity/);
});

import { collectReleaseCnpgProbe } from '../release-install.mjs';

test('cold release inventory does not query an unregistered CNPG resource', () => {
  const calls = [];
  const probe = collectReleaseCnpgProbe({
    readMeminfo: () => 'MemAvailable: 8192000 kB',
    run(command, args) {
      calls.push(args);
      if (args.includes('cluster.postgresql.cnpg.io')) throw Error('CRD not installed');
      return { ok: true, stdout: '' };
    },
  });
  assert.equal(probe.crdState, 'absent');
  assert.deepEqual(probe.unreadableReads, []);
  assert.ok(!calls.some(args => args.includes('cluster.postgresql.cnpg.io')));
});

test('unreadable CNPG CRD does not authorize cold installation', () => {
  const probe = collectReleaseCnpgProbe({
    readMeminfo: () => 'MemAvailable: 8192000 kB',
    run(command, args) {
      if (args.includes('cluster.postgresql.cnpg.io')) throw Error('CRD state unknown');
      if (args.includes('crd')) return { ok: false, stdout: '', stderr: 'Forbidden' };
      return { ok: true, stdout: '' };
    },
  });
  assert.equal(probe.crdState, 'unreadable');
  assert.ok(probe.unreadableReads.some(row => row.id === 'postgres-crd'));
});
