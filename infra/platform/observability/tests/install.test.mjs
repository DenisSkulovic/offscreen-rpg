import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, X509Certificate } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import test from 'node:test';

import { readKindProfile } from '../../../clusters/kind/manager/config.mjs';
import { readPlatformProfile } from '../../common/profile.mjs';
import {
  helmValuesArgv,
  loadArtifacts,
  loadObservabilityVariants,
  loadOperationalArtifactSet,
  lintObservability,
  renderObservabilityDocuments,
} from '../artifacts.mjs';
import { ARTIFACT_HISTORY_ROWS } from '../artifact-history.mjs';
import { GRAFANA_ADMIN_SECRET } from '../inventory.mjs';
import { classifyOperationalInventory } from '../readiness.mjs';
import {
  evaluateObservationReceipt,
  parseEnsureReceipt,
} from '../receipt.mjs';
import { observabilityReadinessToServiceState } from '../../../environments/infra-cli.mjs';
import { runObservabilityDiagnosticWorker } from '../../../verification/diagnostic-live.mjs';
import {
  assertPhaseBudget,
  helmInstallArgv,
  parseNamespaceCreateResponse,
  PHASE_TIMEOUT_MS,
  runObservability,
  runObservabilityEnsure,
  runObservabilityPlan,
  runObservabilityStatus,
  verifyCompletedPhasePrefix,
  WORKER_BUDGET_MS,
} from '../install.mjs';
const work = mkdtempSync(join(tmpdir(), 'install-e2-'));
test.after(() => rmSync(work, { recursive: true, force: true }));

const devKind = readKindProfile('dev');
const devProfile = readPlatformProfile('dev');
// test-only trust
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


const DEV_SET = loadOperationalArtifactSet('dev', {
  kubeletTrust: BINDING,
  verifyArchive: false,
});
const artifacts = DEV_SET.desired;
const e1Developer = DEV_SET.admissible.find(
  (b) => b.artifactId === 'dev-e1-developer',
);
const RELEASE_SET = loadOperationalArtifactSet('release', { verifyArchive: false });
const setFor = (row) => (row.profileId === 'release' ? RELEASE_SET : DEV_SET);
const rowOf = (id) => ARTIFACT_HISTORY_ROWS.find((r) => r.id === id);

/** Exact snapshot for a history row, with the legacy keyed object map. */
function buildRowSnapshot(id) {
  const snap = buildSnapshot(rowOf(id));
  const ns = snap.namespace.object.metadata.name;
  const objects = {};
  for (const [key, object] of Object.entries(snap.scopedObjects)) {
    if (key.startsWith(`${ns}/`)) {
      objects[key.slice(ns.length + 1)] = object;
    }
  }
  return {
    ...snap,
    namespace: { ...snap.namespace, uid: 'uid-target-namespace' },
    objects,
    legacy: [],
    pending: false,
    pendingValid: true,
  };
}
const buildCompleteE2 = () => buildRowSnapshot('e2-fresh');

/**
 * @param {object} base
 */
function absentSnapshot(base = {}) {
  return {
    profileId: 'dev',
    namespace: { absent: true },
    objects: {},
    helmReleases: [],
    helmManifests: {},
    scopedObjects: {},
    clusterRbac: {},
    persistentVolumes: [],
    legacy: [],
    pending: false,
    pendingValid: true,
    ...base,
  };
}

/**
 * @param {string[]} phases
 */
function snapshotForPhases(phases) {
  if (!phases.includes('namespace')) {
    return absentSnapshot();
  }
  const complete = buildCompleteE2();
  /** @type {Record<string, object>} */
  const objects = {};
  const releaseNames = new Set(
    phases.filter((phase) => phase.startsWith('obs-')),
  );
  if (
    phases.includes('secret') &&
    complete.objects[`Secret/${GRAFANA_ADMIN_SECRET}`]
  ) {
    objects[`Secret/${GRAFANA_ADMIN_SECRET}`] =
      complete.objects[`Secret/${GRAFANA_ADMIN_SECRET}`];
  }
  for (const row of artifacts.expectedInventory.direct) {
    if (!releaseNames.has(row[4])) {
      continue;
    }
    const key = `${row[1]}/${row[3]}`;
    if (complete.objects[key]) {
      objects[key] = complete.objects[key];
    }
  }
  for (const row of artifacts.expectedInventory.generatedClaims) {
    if (!releaseNames.has(row[4])) {
      continue;
    }
    const key = `${row[1]}/${row[3]}`;
    if (complete.objects[key]) {
      objects[key] = complete.objects[key];
    }
  }
  if (releaseNames.size > 0) {
    for (const release of releaseNames) {
      const secretName = `sh.helm.release.v1.${release}.v1`;
      if (complete.objects[`Secret/${secretName}`]) {
        objects[`Secret/${secretName}`] =
          complete.objects[`Secret/${secretName}`];
      }
    }
  }
  return {
    ...complete,
    namespace: {
      absent: false,
      uid: complete.namespace.uid,
      object: {
        metadata: {
          name: devProfile.namespaces.observability,
          labels: {
            [devProfile.ownerLabel]: devProfile.ownerValue,
          },
        },
      },
    },
    objects,
    helmReleases: complete.helmReleases.filter((row) =>
      releaseNames.has(row.name),
    ),
    pending: false,
    pendingValid: true,
  };
}

const STAGED_NAMESPACE_UID = 'uid-target-namespace';

function namespaceCreateStdout(uid = STAGED_NAMESPACE_UID) {
  return JSON.stringify({
    kind: 'Namespace',
    metadata: {
      name: devProfile.namespaces.observability,
      uid,
      labels: { [devProfile.ownerLabel]: devProfile.ownerValue },
    },
    status: { phase: 'Active' },
  });
}

/**
 * @param {{
 *   failAt?: string,
 *   failHelmAt?: number,
 *   badNamespaceCreateStdout?: boolean,
 *   emptyNamespaceCreateStdout?: boolean,
 *   wrongNamespaceCreateUid?: string,
 *   failCustodyAdvanceAt?: string,
 *   timeoutAt?: string,
 *   closeUnconfirmed?: boolean,
 *   unknownAttempt?: boolean,
 *   cancelAfterFirst?: boolean,
 *   replacedBeforeClear?: boolean,
 *   calls?: { command: string, args: string[] }[],
 *   outputs?: string[],
 *   helmDurationMs?: number,
 * }} [options]
 */
function makeEnsureDeps(options = {}) {
  let phase = 0;
  /** @type {{ command: string, args: string[] }[]} */
  const calls = options.calls ?? [];
  const outputs = options.outputs ?? [];
  const pendingWrites = [];
  let clock = 0;
  // Real collection under the own custody reports the pending flags.
  const complete = {
    ...buildCompleteE2(),
    pending: true,
    pendingValid: true,
  };
  const stages = [
    absentSnapshot(),
    snapshotForPhases(['namespace']),
    snapshotForPhases(['namespace', 'secret']),
    snapshotForPhases(['namespace', 'secret', 'obs-prometheus']),
    snapshotForPhases(['namespace', 'secret', 'obs-prometheus', 'obs-loki']),
    snapshotForPhases([
      'namespace',
      'secret',
      'obs-prometheus',
      'obs-loki',
      'obs-tempo',
    ]),
    snapshotForPhases([
      'namespace',
      'secret',
      'obs-prometheus',
      'obs-loki',
      'obs-tempo',
      'obs-collector',
    ]),
    complete,
  ];

  const identity = {
    profile: devProfile,
    profileId: 'dev',
    contextName: devKind.contextName,
    clusterName: devProfile.clusterName,
    namespace: devProfile.namespaces.observability,
    snapshotPath: '/tmp/observability-fake-kubeconfig',
    tuple: {
      profileId: 'dev',
      contextName: devKind.contextName,
      clusterName: devProfile.clusterName,
      port: 24443,
      dockerContext: 'ensure-fixture-ctx',
      dockerControlPlaneId: 'cp',
      dockerEndpointHost: 'unix:///var/run/docker.sock',
      caSha256:
        'a3b5c7d9e1f2031425364758697a8b9cadbecfd0e1f2a3b4c5d6e7f8091a2b3c',
      kubeSystemUid: 'kube-system',
      baselineUid: 'baseline',
      targetNamespaceUid: null,
    },
    cleanup: () => ({ ok: true }),
  };

  /** @type {Record<string, unknown> | null} */
  let stored = null;
  const custody = {
    fd: 9,
    mode: 'exclusive',
    pendingPath: '/tmp/observability-ensure-pending',
    lockDirectory: '/tmp',
    cancelled: false,
    cancel() {
      this.cancelled = true;
    },
    begin(record) {
      if (this.cancelled || stored) {
        throw new Error('begin refused');
      }
      stored = {
        schema: 2,
        operationId: '00000000-0000-4000-8000-000000000010',
        service: 'observability',
        context: devKind.contextName,
        start: '2026-11-27T00:00:00.000Z',
        operation: record.operation ?? 'ensure',
        phase: record.phase,
        tuple: globalThis.structuredClone(record.tuple),
        details: globalThis.structuredClone(record.details ?? {}),
      };
      pendingWrites.push(globalThis.structuredClone(stored));
    },
    advance(record) {
      if (this.cancelled || !stored) {
        throw new Error('advance refused');
      }
      if (options.failCustodyAdvanceAt === record.phase) {
        throw new Error('advance refused');
      }
      stored = {
        ...stored,
        phase: record.phase,
        tuple: globalThis.structuredClone(record.tuple),
        details: globalThis.structuredClone(record.details ?? {}),
      };
      pendingWrites.push(globalThis.structuredClone(stored));
    },
    assertOwnPending() {
      if (this.cancelled || !stored) {
        throw new Error('pending record is not owned');
      }
      return globalThis.structuredClone(stored);
    },
    clear() {
      if (this.cancelled || !stored || options.replacedBeforeClear) {
        throw new Error('clear refused');
      }
      stored = null;
    },
    close() {},
  };

  return {
    pendingWrites,
    custody,
    artifactSet: DEV_SET,
    readKubeletTrust: () => options.trustReads?.shift?.() ?? BINDING,
    verifyArchive: false,
    now: () => clock,
    captureIdentity: async () => identity,
    acquireCustody: async () => custody,
    readPending: () =>
      stored ? { pending: true, valid: true } : { pending: false, valid: true },
    collectInventorySnapshot: () => stages[Math.min(phase, stages.length - 1)],
    recheckIdentity: (bound, { expectedNamespaceUid }) => {
      const observed = stages[Math.min(phase, stages.length - 1)].namespace;
      const uid = observed.absent ? null : observed.uid;
      return {
        ok:
          expectedNamespaceUid === uid &&
          bound.tuple.targetNamespaceUid === uid,
        reason: 'namespace-uid-changed',
      };
    },
    runMutation: async (command, args) => {
      calls.push({ command, args: args.slice() });
      if (options.cancelAfterFirst && calls.length === 1) {
        custody.cancel();
        return {
          ok: false,
          stdout: '',
          exitCode: null,
          signal: null,
          timedOut: false,
          cancelled: true,
          attempted: true,
          closeUnconfirmed: false,
        };
      }
      if (options.closeUnconfirmed && calls.length === 1) {
        return {
          ok: false,
          stdout: '',
          exitCode: null,
          signal: null,
          timedOut: false,
          cancelled: false,
          attempted: true,
          closeUnconfirmed: true,
        };
      }
      if (options.unknownAttempt && calls.length === 1) {
        return {
          ok: false,
          stdout: '',
          exitCode: null,
          signal: null,
          timedOut: false,
          cancelled: false,
          attempted: true,
          closeUnconfirmed: false,
        };
      }
      if (options.timeoutAt === 'namespace' && calls.length === 1) {
        return {
          ok: false,
          stdout: '',
          exitCode: null,
          signal: 'SIGKILL',
          timedOut: true,
          cancelled: false,
          attempted: true,
          closeUnconfirmed: false,
        };
      }
      if (
        options.failAt &&
        calls.length === 1 &&
        options.failAt === 'namespace'
      ) {
        return {
          ok: false,
          stdout: '',
          exitCode: 1,
          signal: null,
          timedOut: false,
        };
      }
      if (command === 'helm' && options.failHelmAt != null) {
        const helmCalls = calls.filter(
          (call) => call.command === 'helm',
        ).length;
        if (helmCalls === options.failHelmAt) {
          return {
            ok: false,
            stdout: '',
            exitCode: 1,
            signal: null,
            timedOut: false,
          };
        }
      }
      if (command === 'helm') {
        const slowMs = options.helmDurationMs ?? 1;
        clock += slowMs;
      } else {
        clock += 1;
      }
      phase += 1;
      outputs.push(`${command} ${args.join(' ')}`);
      const kubectlCreates = calls.filter(
        (call) => call.command === 'kubectl' && call.args.includes('create'),
      ).length;
      const isNamespaceCreate =
        command === 'kubectl' &&
        args.includes('create') &&
        kubectlCreates === 1;
      let stdout = '';
      if (isNamespaceCreate) {
        if (options.badNamespaceCreateStdout) {
          stdout = 'not-json';
        } else if (options.emptyNamespaceCreateStdout) {
          stdout = '';
        } else {
          const uid = options.wrongNamespaceCreateUid ?? STAGED_NAMESPACE_UID;
          stdout = namespaceCreateStdout(uid);
        }
      }
      return {
        ok: true,
        stdout,
        exitCode: 0,
        signal: null,
        timedOut: false,
      };
    },
    get calls() {
      return calls;
    },
    advanceClock(ms) {
      clock += ms;
    },
    get clock() {
      return clock;
    },
  };
}

test('ready observation is a no-op without writes', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps();
    const ready = buildCompleteE2();
    deps.collectInventorySnapshot = () => ({
      ...ready,
      pending: false,
      pendingValid: true,
    });
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(receipt.ok, true);
    assert.equal(receipt.mutation, 'none');
    assert.equal(receipt.pending, false);
    assert.equal(deps.calls.length, 0);
  } finally {
    if (prior === undefined) delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    else process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
  }
});

test('ensure refuses missing authorization before lock', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  try {
    const receipt = await runObservabilityEnsure('dev', devKind.contextName, {
      verifyArchive: false,
      captureIdentity: async () => {
        throw new Error('should not capture');
      },
    });
    assert.equal(receipt.reasonCode, 'ensure-not-authorized');
    assert.equal(receipt.mutation, 'none');
  } finally {
    if (prior === undefined) {
      delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    } else {
      process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
    }
  }
});

test('failed namespace phase stops before later mutations', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps({ failAt: 'namespace' });
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(receipt.ok, false);
    assert.equal(receipt.mutation, 'possible');
    assert.equal(receipt.pending, true);
    assert.deepEqual(receipt.completedPhases, []);
    assert.equal(deps.calls.length, 1);
    assert.equal(deps.calls[0]?.command, 'kubectl');
  } finally {
    if (prior === undefined) {
      delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    } else {
      process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
    }
  }
});

test('failed helm phase retains prefix and skips later helm calls', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps({ failHelmAt: 3 });
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(receipt.ok, false);
    assert.deepEqual(receipt.completedPhases, [
      'namespace',
      'secret',
      'obs-prometheus',
      'obs-loki',
    ]);
    const helmCalls = deps.calls.filter((call) => call.command === 'helm');
    assert.equal(helmCalls.length, 3);
  } finally {
    if (prior === undefined) {
      delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    } else {
      process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
    }
  }
});

test('helm install argv preserves helmValueArgs parity with render', () => {
  const releaseProfile = readPlatformProfile('release');
  const bundles = [
    [
      'dev',
      e1Developer,
      devKind.contextName,
      devProfile.namespaces.observability,
    ],
    [
      'release',
      loadArtifacts('release', { verifyArchive: false }),
      readKindProfile('release').contextName,
      releaseProfile.namespaces.observability,
    ],
  ];
  bundles.push([
    'dev-e2',
    artifacts,
    devKind.contextName,
    devProfile.namespaces.observability,
  ]);
  for (const [profileId, bundle, contextName, namespace] of bundles) {
    for (const release of bundle.releases) {
      const expectedValues =
        profileId === 'dev' && release.role === 'collector' ? 2 : 1;
      if (profileId !== 'dev-e2') {
        assert.equal(release.valuesPaths.length, expectedValues, profileId);
      }
      assert.equal(release.valuesPath, undefined);
      const slice = helmValuesArgv(release);
      const argv = helmInstallArgv(
        {
          snapshotPath: '/tmp/kubeconfig',
          contextName,
          namespace,
        },
        release,
      );
      const start = argv.indexOf('-f');
      assert.deepEqual(argv.slice(start, start + slice.length), slice);
      assert.equal(argv.at(-3), '--wait');
      assert.equal(argv.at(-2), '--timeout');
      assert.equal(argv.at(-1), '180s');
      assert.ok(!argv.includes('--atomic'));
      assert.ok(!argv.includes('--cleanup-on-fail'));
    }
  }
});

test('five slow helm calls still fit the 1500s worker budget', () => {
  let now = 0;
  const helmDuration = 250_000;
  for (const phase of [
    'namespace',
    'secret',
    'obs-prometheus',
    'obs-loki',
    'obs-tempo',
    'obs-collector',
    'obs-grafana',
  ]) {
    assert.doesNotThrow(() => assertPhaseBudget(WORKER_BUDGET_MS - now, phase));
    now += PHASE_TIMEOUT_MS[phase] ?? 0;
    if (phase.startsWith('obs-')) {
      assert.ok(now <= WORKER_BUDGET_MS);
    }
  }
  now += helmDuration;
  assert.ok(now < WORKER_BUDGET_MS);
});

test('ensure output never contains generated admin secret material', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps();
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    const joined = JSON.stringify(receipt);
    for (const call of deps.calls) {
      assert.ok(!call.args.some((arg) => arg.includes('admin-password=')));
    }
    assert.ok(!joined.includes('admin-password'));
    if (receipt.ok) {
      assert.equal(receipt.mutation, 'confirmed');
    }
  } finally {
    if (prior === undefined) {
      delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    } else {
      process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
    }
  }
});

test('stale identity is refused before writes proceed', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps();
    let recheckCount = 0;
    deps.recheckIdentity = () => {
      recheckCount += 1;
      if (recheckCount === 1) {
        return { ok: true };
      }
      return { ok: false, reason: 'identity-changed' };
    };
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(receipt.reasonCode, 'identity-changed');
    assert.equal(deps.calls.length, 1);
  } finally {
    if (prior === undefined) {
      delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    } else {
      process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
    }
  }
});

test('predecessor shape refuses ensure without writes', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps();
    const predecessorSnapshot = buildRowSnapshot('base-fresh');
    deps.collectInventorySnapshot = () => ({
      ...predecessorSnapshot,
      pending: false,
      pendingValid: true,
    });
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(receipt.ok, false);
    assert.equal(receipt.reasonCode, 'upgrade-required');
    assert.equal(receipt.mutation, 'none');
    assert.equal(receipt.pending, false);
    assert.deepEqual(receipt.completedPhases, []);
    assert.equal(deps.calls.length, 0);
  } finally {
    if (prior === undefined) {
      delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    } else {
      process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
    }
  }
});

test('foreign pending refuses at admission', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps();
    deps.foreignPendingAtAdmission = true;
    deps.collectInventorySnapshot = () =>
      absentSnapshot({ pending: true, pendingValid: true });
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(receipt.reasonCode, 'pending');
    assert.equal(receipt.mutation, 'none');
    assert.equal(deps.calls.length, 0);
  } finally {
    if (prior === undefined) {
      delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    } else {
      process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
    }
  }
});

test('own pending finalization succeeds when shape is ready', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps();
    deps.finalObservation = () => ({
      snapshot: { ...buildCompleteE2(), pending: true, pendingValid: true },
    });
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(receipt.ok, true);
    assert.equal(receipt.mutation, 'confirmed');
    assert.equal(receipt.pending, false);
  } finally {
    if (prior === undefined) {
      delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    } else {
      process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
    }
  }
});

test('foreign pending refuses during finalization even when shape is ready', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps();
    deps.foreignPendingAtFinalize = true;
    deps.finalObservation = () => ({
      snapshot: { ...buildCompleteE2(), pending: true, pendingValid: true },
    });
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(receipt.ok, false);
    assert.equal(receipt.reasonCode, 'pending');
  } finally {
    if (prior === undefined) {
      delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    } else {
      process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
    }
  }
});

test('phase-prefix acceptance allows partial snapshot only', () => {
  const partial = snapshotForPhases(['namespace', 'secret', 'obs-prometheus']);
  const identity = {
    tuple: { targetNamespaceUid: partial.namespace.uid },
  };
  const custody = {
    assertOwnPending: () => ({ operation: 'ensure' }),
  };
  const adapter = { identity, custody, profile: devProfile };
  const pass = verifyCompletedPhasePrefix(
    partial,
    artifacts,
    ['namespace', 'secret', 'obs-prometheus'],
    adapter,
  );
  assert.equal(pass.ok, true);
  const fail = verifyCompletedPhasePrefix(
    partial,
    artifacts,
    ['namespace', 'secret', 'obs-prometheus', 'obs-loki'],
    adapter,
  );
  assert.equal(fail.ok, false);
});

test('plan and status stay read-only', async () => {
  const receipt = await runObservability(
    'plan',
    'dev',
    'kind-offscreen-release',
    {
      verifyArchive: false,
      run: () => {
        throw new Error('plan must not invoke cluster IO');
      },
    },
  );
  assert.equal(receipt.reasonCode, 'context-mismatch');
  assert.equal(receipt.mutation, 'none');
});

test('fresh ensure binds namespace UID before secret and persists it under custody', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps();
    const result = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(result.ok, true, JSON.stringify(result));
    const uid = snapshotForPhases(['namespace']).namespace.uid;
    assert.equal(deps.pendingWrites[0].tuple.targetNamespaceUid, null);
    assert.equal(deps.pendingWrites[1].phase, 'namespace');
    assert.equal(deps.pendingWrites[1].tuple.targetNamespaceUid, uid);
    assert.equal(deps.pendingWrites[2].phase, 'secret');
    assert.ok(
      deps.pendingWrites
        .slice(1)
        .every((row) => row.tuple.targetNamespaceUid === uid),
    );
    const nsCreate = deps.calls[0];
    assert.ok(nsCreate.args.includes('create'));
    const outIndex = nsCreate.args.indexOf('-o');
    assert.ok(outIndex >= 0);
    assert.equal(nsCreate.args[outIndex + 1], 'json');
    assert.ok(deps.calls[1].args.includes('create'));
  } finally {
    if (prior === undefined) delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    else process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
  }
});

test('malformed namespace create JSON retains pending and skips secret', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps({ badNamespaceCreateStdout: true });
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(receipt.ok, false);
    assert.equal(receipt.mutation, 'possible');
    assert.equal(receipt.pending, true);
    assert.equal(deps.calls.length, 1);
    assert.equal(deps.calls[0].command, 'kubectl');
  } finally {
    if (prior === undefined) delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    else process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
  }
});

test('empty namespace create stdout retains pending as possible mutation', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps({ emptyNamespaceCreateStdout: true });
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(receipt.mutation, 'possible');
    assert.equal(receipt.pending, true);
    assert.equal(deps.calls.length, 1);
  } finally {
    if (prior === undefined) delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    else process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
  }
});

test('create-response UID mismatch with inventory rejects before secret', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps({
      wrongNamespaceCreateUid: 'wrong-create-uid',
    });
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(receipt.ok, false);
    assert.equal(receipt.reasonCode, 'identity-changed');
    assert.equal(deps.calls.length, 1);
  } finally {
    if (prior === undefined) delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    else process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
  }
});

test('failed custody advance after namespace bind prevents secret', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps({ failCustodyAdvanceAt: 'namespace' });
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(receipt.ok, false);
    assert.equal(receipt.pending, true);
    assert.equal(deps.calls.length, 1);
  } finally {
    if (prior === undefined) delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    else process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
  }
});

test('parseNamespaceCreateResponse validates Namespace object', () => {
  const identity = {
    namespace: devProfile.namespaces.observability,
    tuple: { targetNamespaceUid: null },
  };
  const uid = parseNamespaceCreateResponse(
    { ok: true, stdout: namespaceCreateStdout(), timedOut: false },
    identity,
    devProfile,
  );
  assert.equal(uid, STAGED_NAMESPACE_UID);
  assert.throws(
    () =>
      parseNamespaceCreateResponse(
        { ok: true, stdout: '{"kind":"ConfigMap"}', timedOut: false },
        identity,
        devProfile,
      ),
    /namespace-response-invalid/,
  );
});

test('replacement namespace after binding prevents secret creation', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps();
    const check = deps.recheckIdentity;
    let checks = 0;
    deps.recheckIdentity = (identity, options) => {
      checks += 1;
      if (checks === 3) return { ok: false, reason: 'namespace-uid-changed' };
      return check(identity, options);
    };
    const result = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(result.ok, false);
    assert.equal(result.reasonCode, 'identity-changed');
    assert.equal(result.pending, true);
    assert.equal(deps.calls.length, 1);
  } finally {
    if (prior === undefined) delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    else process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
  }
});

test('uncertain namespace outcomes stay possible and do not continue', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    for (const options of [
      { timeoutAt: 'namespace' },
      { closeUnconfirmed: true },
      { unknownAttempt: true },
      { cancelAfterFirst: true },
    ]) {
      const deps = makeEnsureDeps(options);
      const receipt = await runObservabilityEnsure(
        'dev',
        devKind.contextName,
        deps,
      );
      assert.equal(receipt.ok, false);
      assert.equal(receipt.mutation, 'possible');
      assert.equal(receipt.pending, true);
      assert.equal(deps.calls.length, 1);
      assert.equal(deps.custody.cancelled, options.cancelAfterFirst === true);
    }
  } finally {
    if (prior === undefined) delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    else process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
  }
});

test('replaced pending record cannot be cleared', async () => {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps({ replacedBeforeClear: true });
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    assert.equal(receipt.ok, false);
    assert.equal(receipt.reasonCode, 'cleanup-failed');
    assert.equal(receipt.pending, true);
    assert.equal(deps.calls.length, 7);
  } finally {
    if (prior === undefined) delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    else process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
  }
});

// ---------------------------------------------------------------- OBS-E2-10 T01
async function ensure(options = {}, tweak = () => {}) {
  const prior = process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
  process.env.OFFSCREEN_OBSERVABILITY_ENSURE = 'authorized';
  try {
    const deps = makeEnsureDeps(options);
    tweak(deps);
    const receipt = await runObservabilityEnsure(
      'dev',
      devKind.contextName,
      deps,
    );
    return { deps, receipt };
  } finally {
    if (prior === undefined) delete process.env.OFFSCREEN_OBSERVABILITY_ENSURE;
    else process.env.OFFSCREEN_OBSERVABILITY_ENSURE = prior;
  }
}

const GROUP_KEYS = ['artifactId', 'historyId', 'structuralReady', 'desiredConverged'];
const groupOf = (receipt) => Object.fromEntries(GROUP_KEYS.map((k) => [k, receipt[k]]));
const UNVERIFIED = {
  artifactId: null,
  historyId: null,
  structuralReady: false,
  desiredConverged: false,
};
const NO_TRUST_SET = {
  ...DEV_SET,
  desired: null,
  desiredUnavailableReason: 'kubelet-trust-unavailable',
  admissible: DEV_SET.admissible.filter((b) => b.artifactId !== 'dev-e2'),
};

test('fresh E2 ensure installs the E2 descriptor and reports the exact additive group', async () => {
  const { deps, receipt } = await ensure();
  assert.equal(receipt.ok, true, JSON.stringify(receipt));
  assert.deepEqual(groupOf(receipt), {
    artifactId: 'dev-e2',
    historyId: 'e2-fresh',
    structuralReady: true,
    desiredConverged: true,
  });
  const helm = deps.calls.filter((c) => c.command === 'helm');
  assert.equal(helm.length, 5);
  for (const [index, call] of helm.entries()) {
    assert.equal(call.args[0], 'install');
    assert.deepEqual(
      call.args,
      helmInstallArgv(
        { snapshotPath: '/tmp/observability-fake-kubeconfig', contextName: devKind.contextName, namespace: devProfile.namespaces.observability },
        artifacts.releases[index],
      ),
    );
  }
  assert.equal(deps.calls.length, 7);
  assert.equal((await deps.readPending()).pending, false);
});

test('exact E2 is a no-op with converged group; no writes', async () => {
  const { deps, receipt } = await ensure({}, (d) => {
    d.collectInventorySnapshot = () => buildCompleteE2();
  });
  assert.equal(receipt.ok, true);
  assert.equal(receipt.mutation, 'none');
  assert.deepEqual(groupOf(receipt), {
    artifactId: 'dev-e2', historyId: 'e2-fresh', structuralReady: true, desiredConverged: true,
  });
  assert.equal(deps.calls.length, 0);
  assert.equal(deps.pendingWrites.length, 0);
});

test('existing E1 developer and base refuse with upgrade-required and never install', async () => {
  for (const [id, group] of [
    ['developer-fresh', { artifactId: 'dev-e1-developer', historyId: 'developer-fresh', structuralReady: true, desiredConverged: false }],
    ['developer-upgraded', { artifactId: 'dev-e1-developer', historyId: 'developer-upgraded', structuralReady: true, desiredConverged: false }],
    ['base-fresh', { artifactId: 'dev-e1-base', historyId: 'base-fresh', structuralReady: false, desiredConverged: false }],
  ]) {
    const { deps, receipt } = await ensure({}, (d) => {
      d.collectInventorySnapshot = () => buildRowSnapshot(id);
    });
    assert.equal(receipt.ok, false, id);
    assert.equal(receipt.reasonCode, 'upgrade-required', id);
    assert.equal(receipt.mutation, 'none');
    assert.deepEqual(groupOf(receipt), group, id);
    assert.equal(deps.calls.length, 0);
    assert.equal(deps.pendingWrites.length, 0);
  }
});

test('mixed, pending and unmatched inventories refuse without writes', async () => {
  const mixed = buildRowSnapshot('developer-fresh');
  const e2 = buildCompleteE2();
  const lokiKey = Object.keys(mixed.helmManifests).find((k) => k === 'obs-loki');
  mixed.helmManifests['obs-prometheus'] = e2.helmManifests['obs-prometheus'];
  assert.ok(lokiKey);
  for (const snapshot of [
    mixed,
    { ...buildCompleteE2(), pending: true, pendingValid: true },
    { ...buildCompleteE2(), pending: true, pendingValid: false },
    { ...buildCompleteE2(), legacy: [{ name: 'obs-old' }] },
  ]) {
    const { deps, receipt } = await ensure({}, (d) => {
      d.collectInventorySnapshot = () => snapshot;
    });
    assert.equal(receipt.ok, false);
    assert.equal(receipt.mutation, 'none');
    assert.equal(deps.calls.length, 0);
    assert.equal(deps.pendingWrites.length, 0);
    assert.equal(receipt.desiredConverged, false);
  }
});

test('absent binding refuses fresh activation but E1 status stays readable', async () => {
  const absent = await ensure({}, (d) => {
    d.artifactSet = NO_TRUST_SET;
  });
  assert.equal(absent.receipt.ok, false);
  assert.equal(absent.receipt.reasonCode, 'kubelet-trust-unavailable');
  assert.equal(absent.receipt.mutation, 'none');
  assert.deepEqual(groupOf(absent.receipt), UNVERIFIED);
  assert.equal(absent.deps.calls.length, 0);
  assert.equal(absent.deps.pendingWrites.length, 0);

  const e1 = await ensure({}, (d) => {
    d.artifactSet = NO_TRUST_SET;
    d.collectInventorySnapshot = () => buildRowSnapshot('developer-fresh');
  });
  assert.equal(e1.receipt.reasonCode, 'upgrade-required');
  assert.equal(e1.receipt.artifactId, 'dev-e1-developer');
  assert.equal(e1.deps.calls.length, 0);
});

test('named cluster RBAC collision refuses before namespace creation', async () => {
  const collide = (snapshot) => ({
    ...snapshot,
    clusterRbac: {
      '/ClusterRole/obs-kube-state-metrics': { absent: false, object: {} },
    },
  });
  const atAdmission = await ensure({}, (d) => {
    d.collectInventorySnapshot = () => collide(absentSnapshot());
  });
  assert.equal(atAdmission.receipt.ok, false);
  assert.equal(atAdmission.receipt.mutation, 'none');
  assert.equal(atAdmission.deps.calls.length, 0);
  assert.equal(atAdmission.deps.pendingWrites.length, 0);

  // Appears between admission and the namespace write: no begin, no create.
  let reads = 0;
  const late = await ensure({}, (d) => {
    d.collectInventorySnapshot = () => {
      reads += 1;
      return reads === 1 ? absentSnapshot() : collide(absentSnapshot());
    };
  });
  assert.equal(late.receipt.ok, false);
  assert.equal(late.receipt.mutation, 'none');
  assert.equal(late.receipt.pending, false);
  assert.equal(late.deps.calls.length, 0);
  assert.equal(late.deps.pendingWrites.length, 0);
});

test('binding drift stops before the next mutation and again before clear', async () => {
  const drifted = { ...BINDING, bindingSha256: 'f'.repeat(64) };
  const first = await ensure({ trustReads: [drifted] });
  assert.equal(first.receipt.ok, false);
  assert.equal(first.receipt.reasonCode, 'identity-changed');
  assert.equal(first.receipt.mutation, 'none');
  assert.equal(first.deps.calls.length, 0);

  const mid = await ensure({
    trustReads: [BINDING, BINDING, drifted],
  });
  assert.equal(mid.receipt.reasonCode, 'identity-changed');
  assert.equal(mid.deps.calls.length, 2);
  assert.equal(mid.receipt.pending, true);

  // Seven mutation rechecks pass; the finalization recheck drifts.
  const last = await ensure({
    trustReads: [...Array(7).fill(BINDING), drifted],
  });
  assert.equal(last.receipt.ok, false);
  assert.equal(last.receipt.reasonCode, 'identity-changed');
  assert.equal(last.receipt.pending, true);
  assert.deepEqual(groupOf(last.receipt), UNVERIFIED);
  assert.equal((await last.deps.readPending()).pending, true);
});

test('finalization refuses and retains the fence for every non-exact input', async () => {
  const complete = () => ({ ...buildCompleteE2(), pending: true, pendingValid: true });
  const cases = {
    'absent snapshot': (d) => {
      d.finalObservation = () => ({ state: 'ready', reasonCode: 'ready', snapshot: null });
    },
    'final-looking public pending': (d) => {
      d.finalObservation = () => ({ snapshot: { ...buildCompleteE2(), pending: false, pendingValid: true } });
    },
    'old historical E1 shape': (d) => {
      d.finalObservation = () => ({ snapshot: { ...buildRowSnapshot('developer-fresh'), pending: true, pendingValid: true } });
    },
    'wrong phase record': (d) => {
      d.finalObservation = () => {
        const real = d.custody.assertOwnPending.bind(d.custody);
        d.custody.assertOwnPending = () => ({ ...real(), phase: 'obs-loki' });
        return { snapshot: complete() };
      };
    },
    'foreign or replaced record': (d) => {
      d.finalObservation = () => {
        d.custody.assertOwnPending = () => {
          throw new Error('record changed');
        };
        return { snapshot: complete() };
      };
    },
    'wrong namespace uid': (d) => {
      d.finalObservation = () => {
        const snapshot = complete();
        snapshot.namespace = { ...snapshot.namespace, uid: 'replaced-uid' };
        return { snapshot };
      };
    },
    'wrong binding annotation': (d) => {
      d.finalObservation = () => {
        const snapshot = complete();
        let tampered = false;
        for (const release of Object.values(snapshot.helmManifests)) {
          for (const doc of release.documents) {
            const annotations = doc.metadata?.annotations;
            if (
              doc.kind === 'ConfigMap' &&
              annotations?.['offscreen.dev/kubelet-trust-binding-sha256']
            ) {
              annotations['offscreen.dev/kubelet-trust-binding-sha256'] =
                'e'.repeat(64);
              tampered = true;
            }
          }
        }
        assert.ok(tampered, 'trust ConfigMap annotation present in fixture');
        return { snapshot };
      };
    },
    'missing helm release secret': (d) => {
      d.finalObservation = () => {
        const snapshot = complete();
        delete snapshot.objects['Secret/sh.helm.release.v1.obs-grafana.v1'];
        return { snapshot };
      };
    },
  };
  for (const [name, tweak] of Object.entries(cases)) {
    const { deps, receipt } = await ensure({}, tweak);
    assert.equal(receipt.ok, false, name);
    assert.equal(receipt.mutation, 'confirmed', name);
    assert.equal(receipt.pending, true, name);
    assert.deepEqual(groupOf(receipt), UNVERIFIED, name);
    assert.notEqual(receipt.reasonCode, 'ready', name);
    assert.equal(deps.pendingWrites.length > 0, true, name);
    assert.equal((await deps.readPending()).pending, true, name);
  }
});

test('E2 complete phase prefix requires the exact ordered seven phases', () => {
  const snapshot = { ...buildCompleteE2(), pending: true, pendingValid: true };
  const adapter = {
    identity: { tuple: { targetNamespaceUid: snapshot.namespace.uid } },
    custody: { assertOwnPending: () => ({ operation: 'ensure' }) },
    profile: devProfile,
  };
  const all = ['namespace', 'secret', 'obs-prometheus', 'obs-loki', 'obs-tempo', 'obs-collector', 'obs-grafana'];
  assert.equal(verifyCompletedPhasePrefix(snapshot, artifacts, all, adapter).ok, true);
  const noSecret = all.filter((p) => p !== 'secret');
  assert.equal(verifyCompletedPhasePrefix(snapshot, artifacts, noSecret, adapter).ok, false);
  assert.equal(
    verifyCompletedPhasePrefix(snapshot, artifacts, all, { ...adapter, custody: {} }).ok,
    false,
  );
});

test('release E1 ensure keeps the legacy finalization and reports its group', () => {
  assert.equal(RELEASE_SET.desired.artifactId, 'release-e1');
  assert.equal(RELEASE_SET.desired.kubeletTrustBindingSha256, undefined);
});

// ---------------------------------------------------------------- OBS-E2-10 T02
const observeFixture = (snapshot, set = DEV_SET, extra = {}) => () => ({
  ...classifyOperationalInventory({ ...snapshot, profileId: 'dev' }, set),
  snapshot,
  ...extra,
});
const stdoutOf = (receipt) => ({
  exitCode: 0,
  code: 0,
  stdout: `${JSON.stringify(receipt)}\n`,
  signal: null,
  timedOut: false,
});

test('plan and status route through the operational facade with the four fields', async () => {
  const cases = [
    ['developer-fresh', true, false, 'upgrade-required', 'dev-e1-developer'],
    ['developer-upgraded', true, false, 'upgrade-required', 'dev-e1-developer'],
    ['base-fresh', false, false, 'upgrade-required', 'dev-e1-base'],
    ['e2-fresh', true, true, 'ready', 'dev-e2'],
    ['e2-from-developer-upgraded', true, true, 'ready', 'dev-e2'],
  ];
  for (const [id, structural, converged, reason, artifactId] of cases) {
    for (const run of [runObservabilityPlan, runObservabilityStatus]) {
      let routed = 0;
      const receipt = await run('dev', devKind.contextName, {
        observeOperational: (...args) => {
          routed += 1;
          return observeFixture(buildRowSnapshot(id))(...args);
        },
      });
      assert.equal(routed, 1);
      assert.equal(receipt.reasonCode, reason, id);
      assert.equal(receipt.mutation, 'none');
      assert.deepEqual(groupOf(receipt), {
        artifactId, historyId: id, structuralReady: structural, desiredConverged: converged,
      });
      const evaluated = evaluateObservationReceipt(stdoutOf(receipt), { expectedProfile: 'dev' });
      assert.equal(evaluated.status, converged ? 'PASS' : 'FAIL', id);
      assert.equal(evaluated.desiredConverged, converged);
      const service = observabilityReadinessToServiceState({
        ...classifyOperationalInventory({ ...buildRowSnapshot(id), profileId: 'dev' }, DEV_SET),
      });
      assert.equal(service.state, converged ? 'installed' : 'not-ready');
      assert.equal(service.desiredConverged, converged);
    }
  }
});

test('pending, unknown, unavailable-binding and absent observations are never desired-ready', async () => {
  const pending = { ...buildCompleteE2(), pending: true, pendingValid: true };
  const unknown = { ...buildCompleteE2(), legacy: [{ name: 'obs-old' }] };
  const outcomes = [
    ['pending', observeFixture(pending)],
    ['unknown', observeFixture(unknown)],
    ['unavailable without E1', observeFixture(absentSnapshot(), NO_TRUST_SET, { desiredUnavailableReason: 'kubelet-trust-unavailable' })],
    ['unavailable with admitted E1', observeFixture(buildRowSnapshot('developer-fresh'), NO_TRUST_SET, { desiredUnavailableReason: 'kubelet-trust-unavailable' })],
  ];
  for (const [name, observeOperational] of outcomes) {
    const receipt = await runObservabilityStatus('dev', devKind.contextName, { observeOperational });
    assert.equal(receipt.desiredConverged, false, name);
    const evaluated = evaluateObservationReceipt(stdoutOf(receipt), { expectedProfile: 'dev' });
    assert.notEqual(evaluated.status, 'PASS', name === 'unavailable without E1' ? 'absent' : name);
    if (name === 'pending' || name === 'unknown') {
      assert.deepEqual(groupOf(receipt), UNVERIFIED);
    }
  }
  const e1 = await runObservabilityStatus('dev', devKind.contextName, {
    observeOperational: observeFixture(buildRowSnapshot('developer-fresh'), NO_TRUST_SET),
  });
  assert.equal(e1.reasonCode, 'upgrade-required');
});

test('diagnostic worker projects the operational group and cannot certify E1 as E2', () => {
  const run = (snapshot) =>
    runObservabilityDiagnosticWorker('dev', {}, { observe: observeFixture(snapshot) });
  const e2 = run(buildCompleteE2());
  assert.deepEqual(groupOf(e2.receipt), {
    artifactId: 'dev-e2', historyId: 'e2-fresh', structuralReady: true, desiredConverged: true,
  });
  assert.equal(evaluateObservationReceipt(stdoutOf(e2.receipt), { expectedProfile: 'dev' }).status, 'PASS');
  const e1 = run(buildRowSnapshot('developer-fresh'));
  assert.equal(e1.receipt.desiredConverged, false);
  assert.equal(evaluateObservationReceipt(stdoutOf(e1.receipt), { expectedProfile: 'dev' }).status, 'FAIL');
});

test('strict parser rejects partial, extra, unknown, wrong-profile and contradictory groups', () => {
  const good = {
    schema: 1, ok: true, profile: 'dev', operation: 'status', state: 'ready',
    reasonCode: 'ready', mutation: 'none', completedPhases: [], pending: false,
    artifactId: 'dev-e2', historyId: 'e2-fresh', structuralReady: true, desiredConverged: true,
  };
  const status = (body, options = { expectedProfile: 'dev' }) =>
    evaluateObservationReceipt(stdoutOf(body), options);
  assert.equal(status(good).status, 'PASS');
  const { artifactId: _a, historyId: _h, structuralReady: _s, desiredConverged: _d, ...legacy } = good;
  assert.equal(status(legacy).status, 'PASS');
  const bad = {
    'partial group': (() => { const { desiredConverged: _x, ...rest } = good; return rest; })(),
    'extra key': { ...good, extra: 1 },
    'unknown pair': { ...good, historyId: 'e2-bogus' },
    'mismatched pair': { ...good, historyId: 'developer-fresh' },
    'intermediate id': { ...good, historyId: 'prometheus-intent' },
    'release id on dev': { ...good, artifactId: 'release-e1', historyId: 'release-e1' },
    'wrong profile': { ...good, profile: 'release' },
    'nonboolean': { ...good, structuralReady: 'true' },
    'converged without structural': { ...good, structuralReady: false },
    'pending true desired': { ...good, pending: true },
    'E1 ready': { ...good, artifactId: 'dev-e1-developer', historyId: 'developer-fresh' },
    'null ids with true flags': { ...good, artifactId: null, historyId: null },
    'false desired on ready': { ...good, desiredConverged: false },
  };
  for (const [name, body] of Object.entries(bad)) {
    const evaluated = status(body);
    assert.equal(evaluated.status, 'FAIL', name);
    assert.equal(evaluated.reason, 'invalid-receipt', name);
  }
  assert.equal(status({ ...good, profile: 'release' }, { expectedProfile: 'release' }).status, 'FAIL');
});

test('ensure parser validates the group, expected profile and the new reason', () => {
  const ok = {
    schema: 1, ok: true, profile: 'dev', operation: 'ensure', state: 'ready',
    reasonCode: 'ready', mutation: 'none', completedPhases: [], pending: false,
    artifactId: 'dev-e2', historyId: 'e2-fresh', structuralReady: true, desiredConverged: true,
  };
  const parse = (body, exitCode = 0, options = { expectedProfile: 'dev' }) =>
    parseEnsureReceipt(stdoutOf(body) && { ...stdoutOf(body), exitCode }, options);
  assert.equal(parse(ok).ok, true);
  assert.equal(parse(ok).artifactId, 'dev-e2');
  assert.equal(parse(ok, 0, { expectedProfile: 'release' }).ok, false);
  assert.equal(parse({ ...ok, historyId: 'bogus' }).ok, false);
  assert.equal(parse({ ...ok, artifactId: 'dev-e1-developer', historyId: 'developer-fresh' }).ok, false);
  const unavailable = parse(
    { ...ok, ok: false, state: 'refused', reasonCode: 'kubelet-trust-unavailable', artifactId: null, historyId: null, structuralReady: false, desiredConverged: false },
    1,
  );
  assert.equal(unavailable.reasonCode, 'kubelet-trust-unavailable');
  assert.equal(unavailable.mutation, 'none');
  // A real ensure receipt round-trips through the strict parser.
});

test('public render and lint: dev E2 from an injected binding, release exact E1', () => {
  const run = undefined;
  const dev = renderObservabilityDocuments('dev', { run, kubeletTrust: BINDING, verifyArchive: false });
  assert.ok(dev.some((d) => d.kind === 'ConfigMap' && /kubelet-trust/.test(d.metadata?.name ?? '')));
  lintObservability('dev', { kubeletTrust: BINDING, verifyArchive: false });
  const release = renderObservabilityDocuments('release', { verifyArchive: false });
  assert.deepEqual(release, loadArtifacts('release', { verifyArchive: false }).documents);
  assert.throws(
    () => renderObservabilityDocuments('dev', { verifyArchive: false, readKubeletTrust: () => undefined, trustRun: () => ({ ok: false, stdout: '', stderr: '' }) }),
    /kubelet-trust-unavailable|artifact-invalid/,
  );
});
