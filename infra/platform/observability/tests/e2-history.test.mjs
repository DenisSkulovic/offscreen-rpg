import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, X509Certificate } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import process from 'node:process';
import { join } from 'node:path';
import test from 'node:test';
import { loadOperationalArtifactSet } from '../artifacts.mjs';
import {
  ARTIFACT_HISTORY_ROWS,
  E2_INTERMEDIATE_ROWS,
} from '../artifact-history.mjs';
import {
  assessHistoryShape,
  classifyOperationalInventory,
  manifestSetSha256,
  observeOperationalObservability,
  verifyOwnedHistoryShape,
  resolveHistoryRow,
  verifyHistoryHelmRevisions,
  verifyHistoryHelmStorage,
  verifyHistoryRbac,
  verifyHistoryWorkloads,
} from '../readiness.mjs';

// Rendering tests elsewhere tamper with checked-in values files; serialize
// with the same process-lifetime lock the artifact tests use.
function acquireSourceTreeLock() {
  const dir = join(tmpdir(), 'offscreen-obs-artifact-tests.lock');
  const pidFile = join(dir, 'pid');
  for (;;) {
    try {
      mkdirSync(dir);
      writeFileSync(pidFile, String(process.pid));
      break;
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      try {
        process.kill(Number(readFileSync(pidFile, 'utf8')), 0);
      } catch (probe) {
        if (probe?.code === 'ESRCH') rmSync(dir, { recursive: true, force: true });
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
  process.on('exit', () => rmSync(dir, { recursive: true, force: true }));
}
acquireSourceTreeLock();

const work = mkdtempSync(join(tmpdir(), 'e2-history-'));
test.after(() => rmSync(work, { recursive: true, force: true }));

// ------------------------------------------------------- test-only trust
function makeRoot(cn) {
  const key = join(work, `${cn}.key`);
  const crt = join(work, `${cn}.crt`);
  execFileSync(
    'openssl',
    ['req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:prime256v1',
      '-nodes', '-keyout', key, '-out', crt, '-subj', `/CN=${cn}`, '-days', '30',
      '-addext', 'basicConstraints=critical,CA:TRUE'],
    { stdio: 'ignore' },
  );
  const x = new X509Certificate(readFileSync(crt));
  const lines = x.raw.toString('base64').match(/.{1,64}/g);
  return {
    caSha256: createHash('sha256').update(x.raw).digest('hex'),
    caPem: `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----\n`,
  };
}
const BODY = {
  schema: 1,
  contextName: 'kind-offscreen-dev',
  kubeSystemUid: 'kube-system-uid',
  baselineUid: 'baseline-uid',
  nodes: ['offscreen-dev-control-plane', 'offscreen-dev-worker'].map((name, i) => ({
    name,
    nodeUid: `node-uid-${i}`,
    dockerId: String(i + 1).repeat(64),
    ...makeRoot(name),
  })),
};
const BINDING = {
  ...BODY,
  bindingSha256: createHash('sha256').update(JSON.stringify(BODY)).digest('hex'),
};

const DEV_SET = loadOperationalArtifactSet('dev', {
  kubeletTrust: BINDING,
  verifyArchive: false,
});
const RELEASE_SET = loadOperationalArtifactSet('release', { verifyArchive: false });
const setFor = (row) => (row.profileId === 'release' ? RELEASE_SET : DEV_SET);

// -------------------------------------------------------------- fixtures
const ROLE_ORDER = ['collector', 'prometheus', 'grafana', 'loki', 'tempo'];
const clone = (v) => structuredClone(v);

function helmMeta(release, ns) {
  return {
    labels: { 'app.kubernetes.io/managed-by': 'Helm' },
    annotations: {
      'meta.helm.sh/release-name': release,
      'meta.helm.sh/release-namespace': ns,
    },
  };
}

function liveFromDoc(doc, release, ns, uid) {
  const meta = helmMeta(release, ns);
  const clusterScoped = doc.kind.startsWith('Cluster');
  const live = {
    apiVersion: doc.apiVersion,
    kind: doc.kind,
    metadata: {
      ...clone(doc.metadata),
      namespace: clusterScoped ? '' : ns,
      uid,
      generation: 1,
      labels: { ...(doc.metadata?.labels ?? {}), ...meta.labels },
      annotations: { ...(doc.metadata?.annotations ?? {}), ...meta.annotations },
    },
  };
  for (const key of ['spec', 'data', 'binaryData', 'rules', 'roleRef', 'subjects']) {
    if (doc[key] !== undefined) live[key] = clone(doc[key]);
  }
  if (live.kind === 'Deployment' || live.kind === 'StatefulSet') {
    live.spec.replicas = live.spec.replicas ?? 1;
    const n = live.spec.replicas;
    live.status = {
      observedGeneration: 1, replicas: n, readyReplicas: n,
      availableReplicas: n, updatedReplicas: n, currentReplicas: n,
    };
  }
  if (live.kind === 'PersistentVolumeClaim') {
    live.status = { phase: 'Bound' };
  }
  return live;
}

const chartRef = (r) => `${r.chartName}-${r.chartVersion}`;

/** Build the exact snapshot a row describes, from its own descriptors. */
function buildSnapshot(row) {
  const set = setFor(row);
  const bundles = new Map(
    [...set.admissible, set.desired].filter(Boolean).map((b) => [b.artifactId, b]),
  );
  const roles = Object.fromEntries(
    ROLE_ORDER.map((role) => [
      role,
      row.releases[role].map((id) => ({
        id,
        bundle: bundles.get(id),
        release: bundles.get(id).releases.find((r) => r.role === role),
      })),
    ]),
  );
  const profile = roles.collector[0].bundle.profile;
  const ns = profile.namespaces.observability;
  const scoped = {};
  const add = (namespace, object) => {
    scoped[`${namespace}/${object.kind}/${object.metadata.name}`] = object;
  };
  const helmReleases = [];
  const helmHistory = {};
  const helmManifests = {};
  for (const role of ROLE_ORDER) {
    const revs = roles[role];
    const last = revs[revs.length - 1].release;
    const n = revs.length;
    helmReleases.push({
      name: last.name, namespace: ns, revision: String(n), status: 'deployed',
      chart: chartRef(last), appVersion: last.appVersion,
    });
    helmHistory[last.name] = revs.map((entry, i) => ({
      revision: String(i + 1),
      status: i === n - 1 ? 'deployed' : 'superseded',
      chart: chartRef(entry.release),
      appVersion: entry.release.appVersion,
    }));
    helmManifests[last.name] = {
      revision: String(n),
      documents: clone(last.documents),
      ...(n === 2 ? { previousDocuments: clone(revs[0].release.documents) } : {}),
    };
    revs.forEach((entry, i) => {
      const name = `sh.helm.release.v1.${last.name}.v${i + 1}`;
      add(ns, {
        apiVersion: 'v1', kind: 'Secret',
        metadata: {
          name, namespace: ns, uid: `uid-${name}`,
          labels: {
            owner: 'helm', name: last.name, version: String(i + 1),
            status: i === n - 1 ? 'deployed' : 'superseded',
          },
        },
        type: 'helm.sh/release.v1', dataKeys: ['release'],
      });
    });
  }
  add(ns, {
    apiVersion: 'v1', kind: 'Secret',
    metadata: { name: 'obs-grafana-admin', namespace: ns, uid: 'uid-admin' },
    type: 'Opaque', dataKeys: ['admin-password', 'admin-user'],
  });

  const clusterRbac = {};
  const uids = {};
  for (const role of ROLE_ORDER) {
    const { bundle, release } = roles[role][roles[role].length - 1];
    for (const entry of bundle.expectedInventory.direct) {
      if (entry[4] !== release.name) continue;
      const doc = release.documents.find(
        (d) => d.kind === entry[1] && d.metadata.name === entry[3],
      );
      assert.ok(doc, `fixture doc ${entry[1]}/${entry[3]}`);
      const live = liveFromDoc(doc, release.name, ns, `uid-${entry[1]}-${entry[3]}`);
      uids[`${entry[1]}/${entry[3]}`] = live.metadata.uid;
      if (entry[1].startsWith('Cluster')) {
        add('', live);
        clusterRbac[`/${entry[1]}/${entry[3]}`] = { absent: false, object: live };
      } else {
        add(ns, live);
      }
    }
    for (const entry of bundle.expectedInventory.generatedClaims) {
      if (entry[4] !== release.name) continue;
      const uid = `uid-pvc-${entry[3]}`;
      uids[`PersistentVolumeClaim/${entry[3]}`] = uid;
      add(ns, {
        apiVersion: 'v1', kind: 'PersistentVolumeClaim',
        metadata: { name: entry[3], namespace: ns, uid },
        spec: { volumeName: `pv-${entry[3]}` }, status: { phase: 'Bound' },
      });
    }
  }
  for (const name of ['obs-kube-state-metrics', 'obs-prometheus-kubelet']) {
    for (const kind of ['ClusterRole', 'ClusterRoleBinding']) {
      clusterRbac[`/${kind}/${name}`] ??= { absent: true };
    }
  }

  for (const role of ROLE_ORDER) {
    const { release } = roles[role][roles[role].length - 1];
    for (const [key, containers] of Object.entries(release.expectedWorkloads)) {
      const [, , kind, name] = key.split('/');
      const workload = scoped[`${ns}/${kind}/${name}`];
      let owner = workload;
      let podName = `${name}-0`;
      if (kind === 'Deployment') {
        const rsName = `${name}-6d4f8c9b7`;
        owner = {
          apiVersion: 'apps/v1', kind: 'ReplicaSet',
          metadata: {
            name: rsName, namespace: ns, uid: `uid-${rsName}`,
            ownerReferences: [{ apiVersion: 'apps/v1', kind: 'Deployment', name, uid: workload.metadata.uid, controller: true }],
          },
        };
        add(ns, owner);
        podName = `${rsName}-k9x2p`;
      }
      add(ns, {
        apiVersion: 'v1', kind: 'Pod',
        metadata: {
          name: podName, namespace: ns, uid: `uid-pod-${name}`,
          ownerReferences: [{ apiVersion: 'apps/v1', kind: owner.kind, name: owner.metadata.name, uid: owner.metadata.uid, controller: true }],
        },
        spec: clone(workload.spec.template.spec),
        status: {
          phase: 'Running',
          containerStatuses: containers.map((c) => ({
            name: c.name, ready: true,
            state: { running: { startedAt: '2026-01-01T00:00:00Z' } },
            imageID: c.canonicalReference,
          })),
        },
      });
    }
  }
  const persistentVolumes = Object.entries(uids)
    .filter(([key]) => key.startsWith('PersistentVolumeClaim/'))
    .map(([key, uid]) => ({
      metadata: { name: `pv-${key.split('/')[1]}` },
      spec: { claimRef: { name: key.split('/')[1], namespace: ns, uid } },
    }));
  return {
    profileId: profile.id,
    namespace: {
      absent: false,
      object: { metadata: { name: ns, labels: { [profile.ownerLabel]: profile.ownerValue } } },
    },
    scopedObjects: scoped,
    clusterRbac,
    helmReleases,
    helmHistory,
    helmManifests,
    persistentVolumes,
  };
}

const ALL = (snapshot, row) => {
  const set = setFor(row);
  return {
    revisions: verifyHistoryHelmRevisions(snapshot, set, row),
    storage: verifyHistoryHelmStorage(snapshot, set, row),
    rbac: verifyHistoryRbac(snapshot, set, row),
    workloads: verifyHistoryWorkloads(snapshot, set, row),
    shape: assessHistoryShape(snapshot, set, row),
  };
};

const cache = new Map();
function base(row) {
  if (!cache.has(row)) cache.set(row, buildSnapshot(row));
  return clone(cache.get(row));
}
const row = (id) => ARTIFACT_HISTORY_ROWS.find((r) => r.id === id);
const nsOf = (snapshot) => snapshot.helmReleases[0].namespace;
const key = (snapshot, kind, name) => `${nsOf(snapshot)}/${kind}/${name}`;

function refuses(id, mutate, detail, which = 'shape') {
  const r = row(id);
  const snapshot = base(r);
  mutate(snapshot);
  const result = ALL(snapshot, r)[which];
  assert.equal(result.ok, false, `${id}: expected refusal ${detail}`);
  assert.match(String(result.detail), detail);
  if (which !== 'shape') {
    const shape = ALL(snapshot, r).shape;
    assert.equal(shape.ok, false, `${id}: shape must also refuse`);
  }
}

// -------------------------------------------------------------- positives
for (const r of ARTIFACT_HISTORY_ROWS) {
  test(`final row ${r.id} verifies exactly`, () => {
    const results = ALL(buildSnapshot(r), r);
    for (const [name, result] of Object.entries(results)) {
      assert.equal(result.ok, true, `${name}: ${result.detail}`);
    }
    assert.equal(results.shape.state, 'ready');
  });
}

for (const r of E2_INTERMEDIATE_ROWS) {
  test(`intermediate row ${r.originalHistoryId} verifies exactly`, () => {
    const selected = resolveHistoryRow('dev', r.originalHistoryId, 'prometheus-intent');
    assert.equal(selected, r);
    const results = ALL(buildSnapshot(r), r);
    for (const [name, result] of Object.entries(results)) {
      assert.equal(result.ok, true, `${name}: ${result.detail}`);
    }
  });
}

test('a snapshot of one row never satisfies a neighbouring row with the same numbers', () => {
  const fromFresh = base(row('e2-from-developer-fresh'));
  const fromUpgraded = row('e2-from-developer-upgraded');
  // Same Prometheus/Grafana revisions 1,2; collector history differs.
  assert.equal(ALL(fromFresh, fromUpgraded).revisions.ok, false);
  const upgraded = base(fromUpgraded);
  assert.equal(ALL(upgraded, row('e2-from-developer-fresh')).revisions.ok, false);
  assert.equal(ALL(upgraded, row('developer-upgraded')).shape.ok, false);
});

test('only the exact frozen rows and known descriptors are accepted', () => {
  const r = row('e2-fresh');
  const snapshot = base(r);
  assert.match(
    verifyHistoryHelmRevisions(snapshot, DEV_SET, clone(r)).detail,
    /history-row-unknown/,
  );
  const withoutE2 = { desired: null, admissible: DEV_SET.admissible.filter((b) => b.artifactId !== 'dev-e2') };
  assert.match(verifyHistoryHelmRevisions(snapshot, withoutE2, r).detail, /artifact-missing-dev-e2/);
  assert.match(
    verifyHistoryHelmRevisions(snapshot, { admissible: [DEV_SET.desired, { ...DEV_SET.desired }] }, r).detail,
    /artifact-ambiguous/,
  );
  const unscoped = base(r);
  delete unscoped.scopedObjects;
  assert.match(verifyHistoryHelmStorage(unscoped, DEV_SET, r).detail, /scoped-objects-missing/);
});

// ------------------------------------------- manifests: right numbers, wrong content
test('correct revision numbers with wrong current manifest refuse', () => {
  const id = 'e2-from-developer-upgraded';
  const dev = DEV_SET.admissible.find((b) => b.artifactId === 'dev-e1-developer');
  const baseBundle = DEV_SET.admissible.find((b) => b.artifactId === 'dev-e1-base');
  const docs = (bundle, role) => clone(bundle.releases.find((x) => x.role === role).documents);
  refuses(id, (s) => { s.helmManifests['obs-prometheus'].documents = docs(dev, 'prometheus'); }, /manifest-content-obs-prometheus/, 'revisions');
  refuses(id, (s) => { s.helmManifests['obs-grafana'].documents = docs(dev, 'grafana'); }, /manifest-content-obs-grafana/, 'revisions');
  refuses(id, (s) => { s.helmManifests['obs-collector'].documents = docs(baseBundle, 'collector'); }, /manifest-content-obs-collector/, 'revisions');
  refuses(id, (s) => { s.helmManifests['obs-loki'].documents[0].metadata.name += 'x'; }, /manifest-content-obs-loki/, 'revisions');
});

test('correct revision numbers with wrong predecessor manifest refuse', () => {
  const id = 'e2-from-developer-upgraded';
  const e2 = DEV_SET.desired;
  const dev = DEV_SET.admissible.find((b) => b.artifactId === 'dev-e1-developer');
  const docs = (bundle, role) => clone(bundle.releases.find((x) => x.role === role).documents);
  refuses(id, (s) => { s.helmManifests['obs-prometheus'].previousDocuments = docs(e2, 'prometheus'); }, /manifest-previous-content-obs-prometheus/, 'revisions');
  refuses(id, (s) => { s.helmManifests['obs-grafana'].previousDocuments = docs(e2, 'grafana'); }, /manifest-previous-content-obs-grafana/, 'revisions');
  // collector predecessor must be BASE here, not the developer collector
  refuses(id, (s) => { s.helmManifests['obs-collector'].previousDocuments = docs(dev, 'collector'); }, /manifest-previous-content-obs-collector/, 'revisions');
  refuses(id, (s) => { delete s.helmManifests['obs-prometheus'].previousDocuments; }, /manifest-previous-content-obs-prometheus/, 'revisions');
  refuses('e2-fresh', (s) => { s.helmManifests['obs-prometheus'].previousDocuments = []; }, /manifest-previous-unexpected/, 'revisions');
});

test('history shape: contiguity, single deployed, superseded predecessors, pins', () => {
  const id = 'e2-from-developer-fresh';
  refuses(id, (s) => { s.helmHistory['obs-prometheus'][1].revision = '3'; }, /helm-history-contiguous-obs-prometheus/, 'revisions');
  refuses(id, (s) => { s.helmHistory['obs-prometheus'][0].status = 'deployed'; }, /helm-history-status-obs-prometheus/, 'revisions');
  refuses(id, (s) => { s.helmHistory['obs-grafana'].pop(); }, /helm-history-length-obs-grafana/, 'revisions');
  refuses(id, (s) => { s.helmHistory['obs-grafana'][1].status = 'failed'; }, /helm-history-status-obs-grafana/, 'revisions');
  refuses(id, (s) => { s.helmHistory['obs-grafana'][0].chart = 'grafana-0.0.0'; }, /helm-history-pin-obs-grafana/, 'revisions');
  refuses(id, (s) => { s.helmReleases[1].revision = '3'; }, /helm-status-obs-prometheus/, 'revisions');
  refuses(id, (s) => { s.helmReleases[3].appVersion = '0.0.0'; }, /helm-pin-obs-loki/, 'revisions');
  refuses(id, (s) => { s.helmReleases.push({ ...s.helmReleases[0] }); }, /extra-helm-revision/, 'revisions');
  refuses(id, (s) => { s.helmReleases.pop(); }, /helm-release-count/, 'revisions');
});

// ------------------------------------------------------------ storage
test('storage bijection refuses wrong metadata, extra and missing Secrets', () => {
  const id = 'e2-from-developer-upgraded';
  const sec = (s, name) => s.scopedObjects[key(s, 'Secret', `sh.helm.release.v1.${name}`)];
  refuses(id, (s) => { sec(s, 'obs-prometheus.v1').metadata.labels.status = 'deployed'; }, /helm-storage-metadata/, 'storage');
  refuses(id, (s) => { sec(s, 'obs-prometheus.v2').metadata.labels.version = '1'; }, /helm-storage-metadata/, 'storage');
  refuses(id, (s) => { sec(s, 'obs-collector.v2').type = 'Opaque'; }, /helm-storage-metadata/, 'storage');
  refuses(id, (s) => { sec(s, 'obs-collector.v1').dataKeys = ['release', 'x']; }, /helm-storage-metadata/, 'storage');
  refuses(id, (s) => { sec(s, 'obs-loki.v1').metadata.labels.name = 'obs-tempo'; }, /helm-storage-metadata/, 'storage');
  refuses(id, (s) => { sec(s, 'obs-loki.v1').metadata.labels.extra = 'x'; }, /helm-storage-metadata/, 'storage');
  refuses(id, (s) => { sec(s, 'obs-loki.v1').metadata.deletionTimestamp = '2026-01-01T00:00:00Z'; }, /helm-storage-terminating/, 'storage');
  refuses(id, (s) => { delete sec(s, 'obs-tempo.v1').metadata.uid; }, /helm-storage-metadata/, 'storage');
  refuses(id, (s) => {
    const secret = sec(s, 'obs-grafana.v1');
    secret.metadata.namespace = 'elsewhere';
    s.scopedObjects['elsewhere/Secret/sh.helm.release.v1.obs-grafana.v1'] = secret;
    delete s.scopedObjects[key(s, 'Secret', 'sh.helm.release.v1.obs-grafana.v1')];
  }, /scoped-identity-mismatch|helm-storage-namespace/, 'storage');
  refuses(id, (s) => {
    const extra = clone(sec(s, 'obs-prometheus.v2'));
    extra.metadata.name = 'sh.helm.release.v1.obs-prometheus.v3';
    extra.metadata.labels.version = '3';
    s.scopedObjects[key(s, 'Secret', extra.metadata.name)] = extra;
  }, /helm-storage-extra/, 'storage');
  refuses(id, (s) => {
    const extra = clone(sec(s, 'obs-tempo.v1'));
    extra.metadata.name = 'sh.helm.release.v1.obs-tempo.v2';
    s.scopedObjects[key(s, 'Secret', extra.metadata.name)] = extra;
  }, /helm-storage-extra/, 'storage');
  refuses(id, (s) => { delete s.scopedObjects[key(s, 'Secret', 'sh.helm.release.v1.obs-prometheus.v1')]; }, /helm-storage-missing-obs-prometheus-v1/, 'storage');
  refuses(id, (s) => { delete s.scopedObjects[key(s, 'Secret', 'sh.helm.release.v1.obs-collector.v1')]; }, /helm-storage-missing-obs-collector-v1/, 'storage');
  // a retained predecessor Secret that the row does not retain is extra
  refuses('e2-fresh', (s) => {
    const extra = clone(sec(s, 'obs-collector.v1'));
    extra.metadata.name = 'sh.helm.release.v1.obs-collector.v0';
    s.scopedObjects[key(s, 'Secret', extra.metadata.name)] = extra;
  }, /helm-storage-extra/, 'storage');
});

// ----------------------------------------------------------- workloads
test('runtime images, containers and descendants are exact', () => {
  const id = 'e2-from-developer-upgraded';
  const pod = (s, name) => Object.values(s.scopedObjects).find((o) => o.kind === 'Pod' && o.metadata.name.startsWith(name));
  const wl = (s, kind, name) => s.scopedObjects[key(s, kind, name)];
  refuses(id, (s) => { pod(s, 'obs-kube-state-metrics').status.containerStatuses[0].imageID = 'registry.example/unknown@sha256:' + 'a'.repeat(64); }, /obs-kube-state-metrics-runtime-wrong-repository/, 'workloads');
  refuses(id, (s) => { const st = pod(s, 'obs-redis-exporter').status.containerStatuses[0]; st.imageID = st.imageID.replace(/@sha256:.*/, '@sha256:' + 'b'.repeat(64)); }, /obs-redis-exporter-runtime-child-or-wrong-digest/, 'workloads');
  refuses(id, (s) => { pod(s, 'obs-prometheus').spec.containers[0].image = 'registry.example/unknown:1'; }, /obs-prometheus-pod-containers/, 'workloads');
  refuses(id, (s) => { wl(s, 'Deployment', 'obs-grafana').spec.template.spec.containers[0].name = 'other'; }, /obs-grafana-containers/, 'workloads');
  refuses(id, (s) => { pod(s, 'obs-grafana').spec.containers.push({ name: 'sidecar', image: 'x' }); }, /obs-grafana-pod-containers/, 'workloads');
  refuses(id, (s) => { pod(s, 'obs-collector').status.containerStatuses[0].ready = false; }, /obs-collector-runtime-not-running-ready/, 'workloads');
  refuses(id, (s) => { pod(s, 'obs-collector').status.containerStatuses.push({ name: 'x', ready: true }); }, /obs-collector-runtime-status-count/, 'workloads');
  refuses(id, (s) => { delete s.scopedObjects[Object.keys(s.scopedObjects).find((k) => k.includes('/Pod/obs-loki'))]; }, /obs-loki-missing-pod/, 'workloads');
  refuses(id, (s) => { delete s.scopedObjects[key(s, 'Deployment', 'obs-kube-state-metrics')]; }, /missing-workload-obs-kube-state-metrics/, 'workloads');
  refuses(id, (s) => { wl(s, 'Deployment', 'obs-redis-exporter').status.readyReplicas = 0; }, /obs-redis-exporter-stale-generation/, 'workloads');
  refuses(id, (s) => {
    const owner = pod(s, 'obs-tempo').metadata.ownerReferences[0];
    owner.uid = 'forged';
  }, /obs-tempo-missing-pod/, 'workloads');
  refuses(id, (s) => {
    const stray = clone(pod(s, 'obs-grafana'));
    stray.metadata.name = 'stray';
    stray.metadata.ownerReferences = [];
    s.scopedObjects[key(s, 'Pod', 'stray')] = stray;
  }, /unexpected-pod-stray/, 'workloads');
  refuses(id, (s) => {
    const extra = clone(wl(s, 'Deployment', 'obs-grafana'));
    extra.metadata.name = 'rogue';
    s.scopedObjects[key(s, 'Deployment', 'rogue')] = extra;
  }, /unexpected-workload-rogue/, 'workloads');
  // E1 rows must not carry the E2 helper workloads
  refuses('developer-fresh', (s) => {
    const extra = clone(wl(s, 'Deployment', 'obs-grafana'));
    extra.metadata.name = 'obs-kube-state-metrics';
    s.scopedObjects[key(s, 'Deployment', 'obs-kube-state-metrics')] = extra;
  }, /unexpected-workload-obs-kube-state-metrics|scoped-identity-mismatch/, 'workloads');
});

// ---------------------------------------------------------------- RBAC
test('unexpected, missing or altered cluster RBAC refuses', () => {
  const id = 'e2-from-developer-fresh';
  const ck = (kind, name) => `/${kind}/${name}`;
  const role = (s, name = 'obs-kube-state-metrics') => s.scopedObjects[ck('ClusterRole', name)];
  const bind = (s, name = 'obs-kube-state-metrics') => s.scopedObjects[ck('ClusterRoleBinding', name)];
  refuses(id, (s) => { role(s).rules.push({ apiGroups: [''], resources: ['secrets'], verbs: ['get'] }); }, /rbac-rules-obs-kube-state-metrics/, 'rbac');
  refuses(id, (s) => { role(s, 'obs-prometheus-kubelet').rules[0].verbs.push('delete'); }, /rbac-rules-obs-prometheus-kubelet/, 'rbac');
  refuses(id, (s) => { role(s).aggregationRule = { clusterRoleSelectors: [] }; }, /rbac-rules/, 'rbac');
  refuses(id, (s) => { bind(s).subjects[0].namespace = 'kube-system'; }, /rbac-binding-obs-kube-state-metrics/, 'rbac');
  refuses(id, (s) => { bind(s).subjects.push({ kind: 'User', name: 'x' }); }, /rbac-binding-obs-kube-state-metrics/, 'rbac');
  refuses(id, (s) => { bind(s).roleRef.name = 'cluster-admin'; }, /rbac-binding-obs-kube-state-metrics/, 'rbac');
  refuses(id, (s) => { bind(s).metadata.deletionTimestamp = 'now'; }, /rbac-terminating/, 'rbac');
  refuses(id, (s) => { delete bind(s).metadata.annotations['meta.helm.sh/release-name']; }, /rbac-ownership/, 'rbac');
  refuses(id, (s) => { delete s.scopedObjects[ck('ClusterRoleBinding', 'obs-prometheus-kubelet')]; }, /rbac-missing-obs-prometheus-kubelet/, 'rbac');
  refuses(id, (s) => { delete s.scopedObjects[ck('ClusterRole', 'obs-kube-state-metrics')]; }, /rbac-missing-obs-kube-state-metrics/, 'rbac');
  refuses(id, (s) => {
    const extra = clone(role(s));
    extra.metadata.name = 'foreign-admin';
    s.scopedObjects[ck('ClusterRole', 'foreign-admin')] = extra;
  }, /unexpected-rbac-foreign-admin/, 'rbac');
  // E1 rows own no cluster RBAC, even the exact E2 names
  for (const e1 of ['developer-fresh', 'developer-upgraded', 'base-fresh', 'release-e1']) {
    refuses(e1, (s) => {
      const donor = clone(base(row('e2-fresh')).scopedObjects[ck('ClusterRole', 'obs-kube-state-metrics')]);
      s.scopedObjects[ck('ClusterRole', 'obs-kube-state-metrics')] = donor;
    }, /unexpected-rbac-obs-kube-state-metrics/, 'rbac');
    refuses(e1, (s) => {
      s.clusterRbac[ck('ClusterRole', 'obs-prometheus-kubelet')] = { absent: false, object: {} };
    }, /unexpected-rbac/, 'rbac');
  }
});

// -------------------------------------------------------- whole-row shape
test('whole-row shape refuses scope, inventory and ownership drift', () => {
  const id = 'e2-fresh';
  refuses(id, (s) => { s.namespace.absent = true; }, /empty-namespace-present/);
  refuses(id, (s) => { s.namespace.object.metadata.labels = {}; }, /namespace-owner-label/);
  refuses(id, (s) => { delete s.scopedObjects[key(s, 'Service', 'obs-kube-state-metrics')]; }, /missing-obs-kube-state-metrics/);
  refuses(id, (s) => { s.scopedObjects[key(s, 'ConfigMap', 'obs-kubelet-trust')].metadata.deletionTimestamp = 'now'; }, /terminating-resource/);
  refuses(id, (s) => { delete s.scopedObjects[key(s, 'ConfigMap', 'obs-grafana')].metadata.annotations['meta.helm.sh/release-name']; }, /helm-ownership-obs-grafana/);
  refuses(id, (s) => { const c = clone(s.scopedObjects[key(s, 'ConfigMap', 'obs-grafana')]); c.metadata.name = 'foreign'; s.scopedObjects[key(s, 'ConfigMap', 'foreign')] = c; }, /ConfigMap\/foreign/);
  refuses(id, (s) => { s.persistentVolumes[0].spec.claimRef.uid = 'other'; }, /pv-claimref/);
  refuses(id, (s) => { s.scopedObjects[key(s, 'Secret', 'obs-grafana-admin')].dataKeys = ['admin-user']; }, /grafana-secret-key/);
  refuses(id, (s) => { s.scopedObjects[key(s, 'Service', 'obs-loki-headless')].spec.clusterIP = '10.0.0.1'; }, /headless-obs-loki-headless/);
  assert.throws(() => resolveHistoryRow('release', 'e2-fresh'), /does not belong to profile/);
  assert.throws(() => resolveHistoryRow('dev', 'e2-fresh', 'bogus-phase'), /unknown phase/);
});


// ------------------------------------------------ T03: operational + owned
const NS_UID = 'ns-uid-1';
const OP_ID = '11111111-1111-4111-8111-111111111111';
function operational(id, mutate = () => {}) {
  const r = row(id);
  const snapshot = base(r);
  snapshot.namespace.uid = NS_UID;
  snapshot.pending = false;
  snapshot.pendingValid = true;
  snapshot.legacy = [];
  mutate(snapshot);
  return { r, snapshot, set: setFor(r) };
}
const classify = (id, mutate) => {
  const { snapshot, set } = operational(id, mutate);
  return classifyOperationalInventory(snapshot, set);
};

for (const [id, state, reason, sr, dc] of [
  ['base-fresh', 'not-ready', 'upgrade-required', false, false],
  ['developer-fresh', 'not-ready', 'upgrade-required', true, false],
  ['developer-upgraded', 'not-ready', 'upgrade-required', true, false],
  ['e2-fresh', 'ready', 'ready', true, true],
  ['e2-from-developer-fresh', 'ready', 'ready', true, true],
  ['e2-from-developer-upgraded', 'ready', 'ready', true, true],
  ['release-e1', 'ready', 'ready', true, true],
]) {
  test(`operational classification ${id}`, () => {
    const result = classify(id);
    assert.equal(result.state, state);
    assert.equal(result.reasonCode, reason);
    assert.equal(result.historyId, id);
    assert.equal(result.artifactId, row(id).artifactId);
    assert.equal(result.structuralReady, sr);
    assert.equal(result.desiredConverged, dc);
    assert.equal(result.artifacts.artifactId, row(id).artifactId);
  });
}

test('operational classification refuses pending, ambiguity, mixed, foreign and absent collisions', () => {
  const pending = classify('e2-fresh', (s) => {
    s.pending = true;
  });
  assert.equal(pending.reasonCode, 'pending');
  assert.equal(pending.pending, true);
  assert.equal(pending.structuralReady, false);
  assert.equal(pending.artifactId, null);
  assert.equal(classify('e2-fresh', (s) => { s.pendingValid = false; }).reasonCode, 'pending');
  const failed = classify('e2-fresh', (s) => {
    const key = Object.keys(s.scopedObjects).find((k) => k.includes('/Deployment/obs-grafana'));
    s.scopedObjects[key].status.availableReplicas = 0;
    s.scopedObjects[key].status.readyReplicas = 0;
  });
  assert.notEqual(failed.state, 'ready');
  assert.equal(failed.desiredConverged, false);
  // mixed P/G: Prometheus at E2 revision, Grafana still E1 only
  const mixed = classify('e2-from-developer-fresh', (s) => {
    s.helmReleases = s.helmReleases.map((r) =>
      r.name === 'obs-grafana' ? { ...r, revision: '1' } : r,
    );
  });
  assert.notEqual(mixed.state, 'ready');
  assert.equal(mixed.artifactId, null);
  const foreign = classify('e2-fresh', (s) => {
    s.namespace.object.metadata.labels = {};
  });
  assert.equal(foreign.state, 'foreign');
  assert.equal(foreign.desiredConverged, false);
  const unreadable = classifyOperationalInventory(null, DEV_SET);
  assert.equal(unreadable.state, 'unreadable');
  // ambiguity: duplicate descriptor identity is refused, never matched
  const { snapshot } = operational('developer-fresh');
  const dup = {
    ...DEV_SET,
    admissible: [...DEV_SET.admissible, { ...DEV_SET.admissible[1] }],
  };
  const ambiguous = classifyOperationalInventory(snapshot, dup);
  assert.notEqual(ambiguous.state, 'ready');
  assert.equal(ambiguous.artifactId, null);
});

test('absent namespace with an RBAC collision or clean state', () => {
  const absent = {
    profileId: 'dev',
    namespace: { absent: true },
    scopedObjects: {},
    clusterRbac: {},
    helmReleases: [],
    persistentVolumes: [],
    pending: false,
    pendingValid: true,
  };
  assert.equal(classifyOperationalInventory(absent, DEV_SET).state, 'absent');
  const collide = {
    ...absent,
    clusterRbac: { '/ClusterRole/obs-kube-state-metrics': { absent: false } },
  };
  const result = classifyOperationalInventory(collide, DEV_SET);
  assert.equal(result.state, 'not-ready');
  assert.equal(result.detail, 'absent-rbac-collision');
});

test('E2 desired unavailable keeps E1 developer admission and never admits E2', () => {
  const unavailable = {
    desired: null,
    desiredArtifactId: 'dev-e2',
    desiredUnavailableReason: 'kubelet-trust-unavailable',
    admissible: DEV_SET.admissible.filter((b) => b.artifactId !== 'dev-e2'),
    staticInventory: DEV_SET.staticInventory,
  };
  const dev = operational('developer-fresh');
  const e1 = classifyOperationalInventory(dev.snapshot, unavailable);
  assert.equal(e1.structuralReady, true);
  assert.equal(e1.desiredConverged, false);
  assert.equal(e1.reasonCode, 'upgrade-required');
  const e2 = operational('e2-fresh');
  const result = classifyOperationalInventory(e2.snapshot, unavailable);
  assert.notEqual(result.state, 'ready');
  assert.equal(result.artifactId, null);
});

function custodyFor(record) {
  return { assertOwnPending: () => structuredClone(record) };
}
function upgradeRecord(originalId, pendingPhase, overrides = {}) {
  const predecessor = DEV_SET.admissible.find((b) => b.artifactId === 'dev-e1-developer');
  const original = row(originalId);
  return {
    schema: 2,
    operationId: OP_ID,
    service: 'observability',
    context: DEV_SET.desired.profile.contextName,
    start: '2026-11-28T00:00:00.000Z',
    operation: 'upgrade-e2',
    phase: pendingPhase,
    tuple: { profileId: 'dev', targetNamespaceUid: NS_UID },
    details: {
      predecessorId: 'dev-e1-developer',
      predecessorHistoryId: originalId,
      targetId: 'dev-e2',
      predecessorManifestSetSha256: manifestSetSha256(predecessor),
      targetManifestSetSha256: manifestSetSha256(DEV_SET.desired),
      kubeletTrustBindingSha256: DEV_SET.desired.kubeletTrustBindingSha256,
      originalCollectorRevision: original.releases.collector.length,
      originalPrometheusRevision: 1,
      originalGrafanaRevision: 1,
      targetPrometheusRevision: 2,
      targetGrafanaRevision: 2,
    },
    ...overrides,
  };
}
const ensureRecord = (overrides = {}) => ({
  schema: 2,
  operationId: OP_ID,
  service: 'observability',
  context: DEV_SET.desired.profile.contextName,
  start: '2026-11-28T00:00:00.000Z',
  operation: 'ensure',
  phase: 'obs-grafana',
  tuple: { profileId: 'dev', targetNamespaceUid: NS_UID },
  details: {},
  ...overrides,
});
function owned(id, phase, pendingPhase, record, extra = {}, mutate = () => {}) {
  const { r, snapshot } = operational(id, (s) => {
    s.pending = true;
    mutate(s);
  });
  const params = {
    custody: custodyFor(record),
    historyId: r.id ?? r.originalHistoryId,
    operationId: OP_ID,
    phase,
    namespaceUid: NS_UID,
    expectedOperation: record.operation,
    pendingPhase,
    ...extra,
  };
  return verifyOwnedHistoryShape(snapshot, DEV_SET, params);
}
const MATRIX = [
  ['developer-fresh', null, 'prometheus-intent'],
  ['developer-upgraded', null, 'prometheus-intent'],
  ['developer-fresh', 'prometheus-intent', 'prometheus-intent'],
  ['developer-upgraded', 'prometheus-intent', 'prometheus-intent'],
  ['developer-fresh', 'grafana-intent', 'grafana-intent'],
  ['developer-upgraded', 'grafana-intent', 'grafana-intent'],
  ['e2-from-developer-fresh', null, 'grafana-intent'],
  ['e2-from-developer-upgraded', null, 'grafana-intent'],
  ['e2-from-developer-fresh', null, 'final-verification'],
  ['e2-from-developer-upgraded', null, 'final-verification'],
];
function ownedMatrix(id, phase, pendingPhase, recordOverrides = {}, extra = {}) {
  const originalId = id.startsWith('e2-from-') ? id.slice(8) : id;
  const r = phase === null ? row(id) : resolveHistoryRow('dev', id, phase);
  const snapshot = buildSnapshot(r);
  snapshot.namespace.uid = NS_UID;
  snapshot.pending = true;
  snapshot.pendingValid = true;
  snapshot.legacy = [];
  const record = upgradeRecord(originalId, pendingPhase, recordOverrides);
  return verifyOwnedHistoryShape(snapshot, DEV_SET, {
    custody: custodyFor(record),
    historyId: id,
    operationId: OP_ID,
    phase,
    namespaceUid: NS_UID,
    expectedOperation: 'upgrade-e2',
    pendingPhase,
    ...extra,
  });
}

for (const [id, phase, pendingPhase] of MATRIX) {
  test(`owned ${id} phase=${phase} pending=${pendingPhase} verifies`, () => {
    const result = ownedMatrix(id, phase, pendingPhase);
    assert.equal(result.ok, true, result.detail);
    assert.equal(result.historyId, id);
  });
}

test('owned fresh E2 ensure final verifies and refuses wrong pairs', () => {
  const ok = owned('e2-fresh', null, 'obs-grafana', ensureRecord());
  assert.equal(ok.ok, true, ok.detail);
  assert.equal(owned('e2-fresh', null, 'obs-loki', ensureRecord({ phase: 'obs-loki' })).ok, false);
  assert.equal(owned('e2-fresh', null, 'obs-grafana', ensureRecord({ details: { x: 1 } })).ok, false);
  assert.equal(owned('e2-fresh', 'grafana-intent', 'obs-grafana', ensureRecord()).ok, false);
});

test('owned verifier refuses wrong phase-shape pairs and mismatched shapes', () => {
  // intermediate shape with final-verification pending
  const mid = resolveHistoryRow('dev', 'developer-fresh', 'grafana-intent');
  const s1 = buildSnapshot(mid);
  s1.namespace.uid = NS_UID; s1.pending = true; s1.pendingValid = true;
  const r1 = verifyOwnedHistoryShape(s1, DEV_SET, {
    custody: custodyFor(upgradeRecord('developer-fresh', 'final-verification')),
    historyId: 'developer-fresh', operationId: OP_ID, phase: 'grafana-intent',
    namespaceUid: NS_UID, expectedOperation: 'upgrade-e2', pendingPhase: 'final-verification',
  });
  assert.equal(r1.ok, false);
  // E2 final row pending prometheus-intent
  assert.equal(ownedMatrix('e2-from-developer-fresh', null, 'prometheus-intent').ok, false);
  // original final row at grafana-intent with null phase
  assert.equal(ownedMatrix('developer-fresh', null, 'grafana-intent').ok, false);
  // shape does not match the requested row
  assert.equal(
    ownedMatrix('developer-fresh', null, 'prometheus-intent', {}, { historyId: 'developer-upgraded' }).ok,
    false,
  );
  // phase must equal pendingPhase when non-null
  assert.equal(
    ownedMatrix('developer-fresh', 'prometheus-intent', 'prometheus-intent', {}, { phase: 'grafana-intent' }).ok,
    false,
  );
});

test('owned verifier refuses missing, nonexclusive, foreign, replaced and mismatched custody', () => {
  const good = () => upgradeRecord('developer-fresh', 'prometheus-intent');
  const run = (extra, recordOverrides) =>
    ownedMatrix('developer-fresh', null, 'prometheus-intent', recordOverrides, extra);
  assert.equal(run({ custody: undefined }).detail, 'missing-custody');
  assert.equal(run({ custody: {} }).detail, 'missing-custody');
  assert.equal(
    run({ custody: { readPending: () => ({ pending: true, valid: true }), inspectPending: () => good(), pending: true } }).ok,
    false,
  );
  assert.equal(run({ custody: { assertOwnPending() { throw new Error('refused: changed'); } } }).detail, 'custody-refused');
  assert.equal(run({ custody: { assertOwnPending: () => null } }).ok, false);
  // foreign valid pending (other operation / id / context)
  assert.equal(run({}, { operationId: '22222222-2222-4222-8222-222222222222' }).detail, 'operation-id-mismatch');
  assert.equal(run({}, { context: 'kind-other' }).detail, 'context-mismatch');
  assert.equal(run({}, { operation: 'ensure' }).detail, 'operation-mismatch');
  assert.equal(run({}, { phase: 'grafana-intent' }).detail, 'phase-mismatch');
  assert.equal(run({}, { tuple: { profileId: 'dev', targetNamespaceUid: 'other' } }).detail, 'namespace-uid-mismatch');
  assert.equal(run({ namespaceUid: 'other' }).ok, false);
  assert.equal(run({ expectedOperation: 'persistence' }).ok, false);
  assert.equal(run({ operationId: '' }).ok, false);
  assert.equal(run({ pendingPhase: 'grafana-intent' }).ok, false);
  const base2 = good();
  for (const key of Object.keys(base2.details)) {
    const details = { ...base2.details, [key]: 'x' };
    assert.equal(run({}, { details }).detail, `details-${key}`);
  }
  // wrong predecessor / target pair
  assert.equal(
    run({}, { details: { ...base2.details, predecessorHistoryId: 'developer-upgraded' } }).ok,
    false,
  );
  assert.equal(run({}, { details: { ...base2.details, targetId: 'dev-e1-developer' } }).ok, false);
});

test('owned verifier requires actual pending flags and exact namespace/shape', () => {
  const r = row('developer-fresh');
  const mk = (mutate) => {
    const s = buildSnapshot(r);
    s.namespace.uid = NS_UID; s.pending = true; s.pendingValid = true;
    mutate(s);
    return verifyOwnedHistoryShape(s, DEV_SET, {
      custody: custodyFor(upgradeRecord('developer-fresh', 'prometheus-intent')),
      historyId: 'developer-fresh', operationId: OP_ID, phase: null,
      namespaceUid: NS_UID, expectedOperation: 'upgrade-e2', pendingPhase: 'prometheus-intent',
    });
  };
  assert.equal(mk(() => {}).ok, true);
  assert.equal(mk((s) => { s.pending = false; }).detail, 'owned-pending-required');
  assert.equal(mk((s) => { s.pendingValid = false; }).detail, 'owned-pending-required');
  assert.equal(mk((s) => { s.namespace.uid = 'other'; }).detail, 'snapshot-namespace-uid-mismatch');
  assert.equal(mk((s) => { s.helmReleases = s.helmReleases.slice(1); }).ok, false);
});

test('final-shaped pending is never public readiness', () => {
  for (const id of ['e2-fresh', 'e2-from-developer-fresh', 'developer-fresh']) {
    const result = classify(id, (s) => { s.pending = true; });
    assert.equal(result.reasonCode, 'pending');
    assert.equal(result.desiredConverged, false);
    assert.equal(result.structuralReady, false);
  }
});

test('operational facade carries artifact and history ids and refuses on recheck failure', () => {
  const r = row('e2-fresh');
  const snapshot = buildSnapshot(r);
  void snapshot;
  const result = observeOperationalObservability('dev', {
    identity: { cleanup() { return { ok: true }; }, tuple: {} },
    artifactSet: DEV_SET,
    run: () => ({ ok: false, status: 1, stdout: '', stderr: '' }),
    now: () => 1000,
    deadline: 1000 + 5000,
  });
  assert.equal(result.state, 'unreadable');
  assert.equal(result.structuralReady, false);
  assert.equal(result.desiredConverged, false);
  assert.equal(result.artifactId, null);
});
