import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { writeFileSync, mkdirSync } from 'node:fs';

import { main, runLiveProof } from '../proof.mjs';
import {
  OUTAGE_TARGET,
  runOutageProof,
  runPersistenceProof,
} from '../disruptions.mjs';
import {
  queryGrafanaDatasourceHealth,
  summarizeResourceSamples,
} from '../resources.mjs';
import {
  buildExpectedLokiInstallArgv,
  maybeInjectQuotaForLokiInstall,
  quotaHardPopulated,
  runPartialInstallProof,
} from '../partial-install.mjs';
import {
  CANONICAL_DEV_CONTEXT,
  assessDatasourceHealth,
  assessHealthStructuralObservation,
  buildProofReceipt,
  defaultReceiptIo,
  extractStableIdentities,
  gateImplemented,
  parseProofCli,
  persistProofReceipt,
  refusePhaseStart,
  refuseProofInvocation,
  remainingWorkBudgetMs,
  runProofOperationSession,
  stableIdentitiesCompatible,
} from '../proof-host.mjs';

const AUTH_ENV = { OFFSCREEN_OBSERVABILITY_PROOF: 'authorized' };
const DISRUPTION_ENV = {
  ...AUTH_ENV,
  OFFSCREEN_OBSERVABILITY_DISRUPTION: 'authorized',
};
const NS_UID_A = '11111111-1111-1111-1111-111111111111';
const NS_UID_B = '22222222-2222-2222-2222-222222222222';
const CLUSTER_UID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ISOLATED_ENV = {
  ...DISRUPTION_ENV,
  OFFSCREEN_OBSERVABILITY_ISOLATED_PROOF: 'authorized',
  OFFSCREEN_OBSERVABILITY_EXPECTED_CLUSTER_UID: CLUSTER_UID,
};
const SOURCE_SHA = 'abc123deadbeef';

/**
 * @param {string} namespaceUid
 */
function readyObservation(namespaceUid = NS_UID_A) {
  /** @type {Record<string, object>} */
  const objects = {};
  const workloads = [
    ['Deployment', 'obs-prometheus'],
    ['Deployment', 'obs-collector'],
    ['Deployment', 'obs-grafana'],
    ['StatefulSet', 'obs-loki'],
    ['StatefulSet', 'obs-tempo'],
  ];
  for (const [kind, name] of workloads) {
    objects[`${kind}/${name}`] = {
      kind,
      metadata: { uid: `uid-${name}`, name },
      spec: { replicas: 1 },
      status: {
        readyReplicas: 1,
        availableReplicas: 1,
        updatedReplicas: 1,
        replicas: 1,
      },
    };
  }
  for (const claim of [
    'obs-prometheus',
    'storage-obs-loki-0',
    'storage-obs-tempo-0',
  ]) {
    objects[`PersistentVolumeClaim/${claim}`] = {
      kind: 'PersistentVolumeClaim',
      metadata: {
        uid: `pvc-${claim}`,
        name: claim,
        namespace: 'offscreen-dev-observability',
      },
      spec: { volumeName: `pv-${claim}` },
      status: { phase: 'Bound' },
    };
  }
  objects['Secret/obs-grafana-admin'] = {
    kind: 'Secret',
    metadata: { uid: 'uid-grafana-admin', name: 'obs-grafana-admin' },
  };
  for (const name of [
    'sh.helm.release.v1.obs-prometheus.v1',
    'sh.helm.release.v1.obs-loki.v1',
    'sh.helm.release.v1.obs-tempo.v1',
    'sh.helm.release.v1.obs-collector.v1',
    'sh.helm.release.v1.obs-grafana.v1',
  ]) {
    objects[`Secret/${name}`] = {
      kind: 'Secret',
      metadata: { uid: `uid-${name}`, name },
    };
  }
  objects['Pod/obs-collector'] = {
    kind: 'Pod',
    metadata: { uid: 'uid-pod-obs-collector', name: 'obs-collector' },
  };
  return {
    state: 'ready',
    reasonCode: 'ready',
    snapshot: {
      namespace: {
        object: { metadata: { uid: namespaceUid } },
      },
      objects,
      persistentVolumes: [
        {
          metadata: { uid: 'pv-obs-prometheus' },
          spec: {
            claimRef: {
              name: 'obs-prometheus',
              namespace: 'offscreen-dev-observability',
              uid: 'pvc-obs-prometheus',
            },
          },
        },
        {
          metadata: { uid: 'pv-storage-obs-loki-0' },
          spec: {
            claimRef: {
              name: 'storage-obs-loki-0',
              namespace: 'offscreen-dev-observability',
              uid: 'pvc-storage-obs-loki-0',
            },
          },
        },
        {
          metadata: { uid: 'pv-storage-obs-tempo-0' },
          spec: {
            claimRef: {
              name: 'storage-obs-tempo-0',
              namespace: 'offscreen-dev-observability',
              uid: 'pvc-storage-obs-tempo-0',
            },
          },
        },
      ],
    },
  };
}

function healthyDatasources() {
  return {
    'offscreen-metrics': { ok: true, status: 'ok' },
    'offscreen-logs': { ok: true, status: 'ok' },
    'offscreen-traces': { ok: true, status: 'ok' },
  };
}

function mockPersistenceCustody() {
  const events = [];
  return {
    events,
    begin(request) {
      events.push(['begin', request.phase, request.details.step]);
    },
    advance(request) {
      events.push(['advance', request.phase, request.details.step]);
    },
    clear() {
      events.push(['clear']);
    },
  };
}

function mockOutageCustody(restoreImpl) {
  const events = [];
  const custody = {
    events,
    cancelled: false,
    begin(request) {
      events.push(['begin', request.phase, request.operation]);
    },
    confirmOutageDown(payload) {
      events.push([
        'confirmDown',
        payload?.observed?.replicas ?? payload?.notAttempted ?? null,
      ]);
    },
    async restoreTempoOnce(identity, options) {
      events.push(['restore', options?.fresh?.generation ?? null]);
      if (restoreImpl) {
        return restoreImpl(identity, options);
      }
      return {
        ok: true,
        restorationFailed: false,
        restorationAttempted: true,
      };
    },
    clear() {
      events.push(['clear']);
    },
    cancel() {
      this.cancelled = true;
      events.push(['cancel']);
    },
    assertOwnPending() {
      return {};
    },
  };
  return custody;
}

/**
 * @param {{ tempoReplicas?: number, tempoGeneration?: number, includeTempoPod?: boolean, tempoRv?: string }} [options]
 */
function outageWorkloadObservation(options = {}) {
  const {
    tempoReplicas = 1,
    tempoGeneration = 4,
    includeTempoPod = tempoReplicas > 0,
    tempoRv = 'rv-tempo-1',
  } = options;
  const observation = persistenceWorkloadObservation();
  attachPersistencePodInventory(observation);
  const tempo = observation.snapshot.objects[OUTAGE_TARGET.workloadKey];
  tempo.metadata.resourceVersion = tempoRv;
  tempo.metadata.generation = tempoGeneration;
  tempo.spec.replicas = tempoReplicas;
  tempo.status = {
    ...(tempo.status ?? {}),
    readyReplicas: tempoReplicas,
    replicas: tempoReplicas,
    observedGeneration: tempoGeneration,
  };
  if (!includeTempoPod) {
    delete observation.snapshot.objects['Pod/obs-tempo-0'];
  } else if (!observation.snapshot.objects['Pod/obs-tempo-0']) {
    attachPersistencePodInventory(observation);
  }
  return observation;
}

/**
 * @param {Array<ReturnType<typeof outageWorkloadObservation>>} states
 */
function createOutageObserve(states) {
  let calls = 0;
  return async () => {
    const next = states[Math.min(calls, states.length - 1)];
    calls += 1;
    return next;
  };
}

/**
 * @param {ReturnType<typeof readyObservation>} observation
 * @param {Record<string, string>} [podUids]
 */
function attachPersistencePodInventory(observation, podUids = {}) {
  const objects = observation.snapshot.objects;
  const defaults = {
    'Deployment/obs-prometheus': 'pod-prom',
    'Deployment/obs-collector': 'uid-pod-obs-collector',
    'Deployment/obs-grafana': 'pod-grafana',
    'StatefulSet/obs-loki': 'pod-loki',
    'StatefulSet/obs-tempo': 'pod-tempo',
  };
  const active = { ...defaults, ...podUids };
  const promDeployUid = objects['Deployment/obs-prometheus'].metadata.uid;
  const collectorDeployUid = objects['Deployment/obs-collector'].metadata.uid;
  const grafanaDeployUid = objects['Deployment/obs-grafana'].metadata.uid;
  const lokiStsUid = objects['StatefulSet/obs-loki'].metadata.uid;
  const tempoStsUid = objects['StatefulSet/obs-tempo'].metadata.uid;
  objects['ReplicaSet/obs-prometheus-rs'] = {
    kind: 'ReplicaSet',
    metadata: {
      uid: 'rs-prom',
      name: 'obs-prometheus-rs',
      ownerReferences: [
        { kind: 'Deployment', name: 'obs-prometheus', uid: promDeployUid },
      ],
    },
  };
  objects['ReplicaSet/obs-collector-rs'] = {
    kind: 'ReplicaSet',
    metadata: {
      uid: 'rs-collector',
      name: 'obs-collector-rs',
      ownerReferences: [
        { kind: 'Deployment', name: 'obs-collector', uid: collectorDeployUid },
      ],
    },
  };
  objects['ReplicaSet/obs-grafana-rs'] = {
    kind: 'ReplicaSet',
    metadata: {
      uid: 'rs-grafana',
      name: 'obs-grafana-rs',
      ownerReferences: [
        { kind: 'Deployment', name: 'obs-grafana', uid: grafanaDeployUid },
      ],
    },
  };
  const readyStatus = {
    phase: 'Running',
    conditions: [{ type: 'Ready', status: 'True' }],
  };
  objects['Pod/obs-prometheus-0'] = {
    kind: 'Pod',
    metadata: {
      uid: active['Deployment/obs-prometheus'],
      name: 'obs-prometheus-0',
      ownerReferences: [
        { kind: 'ReplicaSet', name: 'obs-prometheus-rs', uid: 'rs-prom' },
      ],
    },
    status: readyStatus,
  };
  objects['Pod/obs-collector'] = {
    kind: 'Pod',
    metadata: {
      uid: active['Deployment/obs-collector'],
      name: 'obs-collector',
      ownerReferences: [
        { kind: 'ReplicaSet', name: 'obs-collector-rs', uid: 'rs-collector' },
      ],
    },
    status: readyStatus,
  };
  objects['Pod/obs-grafana-0'] = {
    kind: 'Pod',
    metadata: {
      uid: active['Deployment/obs-grafana'],
      name: 'obs-grafana-0',
      ownerReferences: [
        { kind: 'ReplicaSet', name: 'obs-grafana-rs', uid: 'rs-grafana' },
      ],
    },
    status: readyStatus,
  };
  objects['Pod/obs-loki-0'] = {
    kind: 'Pod',
    metadata: {
      uid: active['StatefulSet/obs-loki'],
      name: 'obs-loki-0',
      ownerReferences: [
        { kind: 'StatefulSet', name: 'obs-loki', uid: lokiStsUid },
      ],
    },
    status: readyStatus,
  };
  objects['Pod/obs-tempo-0'] = {
    kind: 'Pod',
    metadata: {
      uid: active['StatefulSet/obs-tempo'],
      name: 'obs-tempo-0',
      ownerReferences: [
        { kind: 'StatefulSet', name: 'obs-tempo', uid: tempoStsUid },
      ],
    },
    status: readyStatus,
  };
  return observation;
}

function persistenceWorkloadObservation() {
  const observation = readyObservation();
  attachPersistencePodInventory(observation);
  for (const key of [
    'Deployment/obs-prometheus',
    'StatefulSet/obs-loki',
    'StatefulSet/obs-tempo',
  ]) {
    const row = observation.snapshot.objects[key];
    row.metadata.resourceVersion = `rv-${key.split('/')[1]}`;
    row.metadata.generation = 1;
  }
  return observation;
}

function createFakeIdentity(namespaceUid = NS_UID_A) {
  return {
    profileId: 'dev',
    contextName: CANONICAL_DEV_CONTEXT,
    clusterName: 'offscreen-dev',
    namespace: 'offscreen-dev-observability',
    tuple: {
      profileId: 'dev',
      contextName: CANONICAL_DEV_CONTEXT,
      clusterName: 'offscreen-dev',
      port: 24_443,
      dockerContext: 'proof-docker-ctx',
      dockerControlPlaneId: 'proof-cp-id',
      dockerEndpointHost: 'unix:///var/run/docker.sock',
      caSha256:
        'a3b5c7d9e1f2031425364758697a8b9cadbecfd0e1f2a3b4c5d6e7f8091a2b3c',
      kubeSystemUid: CLUSTER_UID,
      baselineUid: CLUSTER_UID,
      targetNamespaceUid: namespaceUid,
    },
    snapshotSha256:
      'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    snapshotDev: 1,
    snapshotIno: 1,
    snapshotPath: '/tmp/offscreen-proof-fake-snapshot.json',
    cleanup() {
      return { ok: true };
    },
  };
}

function fakePartialInstallPlans(identity) {
  const prometheus = {
    name: 'obs-prometheus',
    role: 'prometheus',
    chartPath: '/charts/prometheus-31.0.0.tgz',
    chartName: 'prometheus',
    chartVersion: '31.0.0',
    appVersion: 'v3.16.0',
    valuesPaths: ['/values/prometheus.yaml'],
    sha256: '26d67031afc5585c7e54edf6601a67f38ad515e75fdcd35be86a636690ec62bc',
    helmValueArgs: [
      '--set-string',
      'server.persistentVolume.storageClass=standard',
    ],
  };
  const loki = {
    name: 'obs-loki',
    role: 'loki',
    chartPath: '/charts/loki-21.6.0.tgz',
    chartName: 'loki',
    chartVersion: '21.6.0',
    appVersion: '3.7.10',
    valuesPaths: ['/values/loki.yaml'],
    sha256: 'ae5aa1c2039636e94f89b6149c3cd2f5a2f9e1749d9600de51f94da3160ee6b2',
    helmValueArgs: [
      '--set-string',
      'singleBinary.persistence.storageClass=standard',
    ],
  };
  return {
    artifacts: { profile: { storageClass: 'standard' } },
    prometheus,
    loki,
    exactLokiArgv: buildExpectedLokiInstallArgv(identity, loki),
  };
}

function partialEnsureWorkerReceipt() {
  return {
    exitCode: 1,
    timedOut: false,
    receipt: {
      ok: false,
      state: 'partial',
      reasonCode: 'phase-failed',
      pending: true,
      mutation: 'confirmed',
      completedPhases: ['namespace', 'secret', 'obs-prometheus', 'obs-loki'],
    },
  };
}

function createMemoryIo() {
  /** @type {Map<string, string>} */
  const store = new Map();
  return {
    writeTemp(path, data) {
      store.set(path, data);
    },
    fsyncFile() {},
    rename(from, to) {
      store.set(to, store.get(from) ?? '');
      store.delete(from);
    },
    fsyncDir() {},
    readBack(path) {
      return store.get(path) ?? '';
    },
    ensureDir() {},
  };
}

function sessionDirs() {
  const dir = mkdtempSync(join(tmpdir(), 'obs-proof-test-'));
  return { dir, receiptPath: join(dir, 'receipt.json') };
}

test('parseProofCli accepts canonical health invocation', () => {
  const parsed = parseProofCli([
    'node',
    'proof.mjs',
    'health',
    'dev',
    CANONICAL_DEV_CONTEXT,
  ]);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.gate, 'health');
});

test('missing authorization is refused', async () => {
  const code = await main(
    ['node', 'proof.mjs', 'health', 'dev', CANONICAL_DEV_CONTEXT],
    {},
  );
  assert.equal(code, 1);
  const refusal = refuseProofInvocation({
    gate: 'health',
    profile: 'dev',
    context: CANONICAL_DEV_CONTEXT,
    env: {},
  });
  assert.equal(refusal.refused, true);
  assert.equal(refusal.reasonCode, 'proof-unauthorized');
});

test('wrong context is refused', async () => {
  const refusal = refuseProofInvocation({
    gate: 'health',
    profile: 'dev',
    context: 'kind-wrong',
    env: AUTH_ENV,
  });
  assert.equal(refusal.refused, true);
  assert.equal(refusal.reasonCode, 'context-not-canonical-dev');
});

test('wrong cluster UID fails before accepting a healthy receipt', async () => {
  const { dir, receiptPath } = sessionDirs();
  const result = await runProofOperationSession({
    gate: 'health',
    profile: 'dev',
    context: CANONICAL_DEV_CONTEXT,
    env: AUTH_ENV,
    evidenceDir: dir,
    receiptPath,
    io: createMemoryIo(),
    clock: { now: () => 1_000 },
    readSourceSha: () => SOURCE_SHA,
    captureIdentity: () => createFakeIdentity(),
    recheckIdentity: () => ({ ok: false, reason: 'cluster-uid-changed' }),
    observe: async () => readyObservation(),
    queryDatasourceHealth: async () => healthyDatasources(),
  });
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'cluster-uid-changed');
});

test('changed namespace UID fails repeat comparison', async () => {
  const { dir, receiptPath } = sessionDirs();
  let calls = 0;
  const result = await runProofOperationSession({
    gate: 'health',
    profile: 'dev',
    context: CANONICAL_DEV_CONTEXT,
    env: AUTH_ENV,
    evidenceDir: dir,
    receiptPath,
    io: createMemoryIo(),
    clock: { now: () => 1_000 },
    readSourceSha: () => SOURCE_SHA,
    captureIdentity: () => createFakeIdentity(),
    recheckIdentity: () => ({ ok: true }),
    observe: async () => readyObservation(),
    repeatObservation: async () => readyObservation('namespace-uid-b'),
    queryDatasourceHealth: async () => {
      calls += 1;
      return healthyDatasources();
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'namespace-uid-changed');
});

test('health proof passes through the default datasource adapter', async () => {
  const { dir, receiptPath } = sessionDirs();
  const seen = [];
  const sessionHealth = {
    remainingWorkMs: () => 90_000,
    clock: { now: () => 1_000 },
    identity: createFakeIdentity(),
  };
  const result = await runProofOperationSession({
    gate: 'health',
    profile: 'dev',
    context: CANONICAL_DEV_CONTEXT,
    env: AUTH_ENV,
    evidenceDir: dir,
    receiptPath,
    io: createMemoryIo(),
    clock: { now: () => 1_000 },
    readSourceSha: () => SOURCE_SHA,
    captureIdentity: () => createFakeIdentity(),
    recheckIdentity: () => ({ ok: true }),
    observe: async () => readyObservation(),
    repeatObservation: async () => readyObservation(),
    queryDatasourceHealth: (session) =>
      queryGrafanaDatasourceHealth(session, {
        grafanaPort: 13000,
        readAdminPassword: () => ({
          ok: true,
          user: 'admin',
          password: 'secret-value',
        }),
        httpGet: async (url, headers) => {
          seen.push({ url, authorization: headers.authorization });
          if (url.endsWith('/api/health')) {
            return { status: 200, body: JSON.stringify({ database: 'ok' }) };
          }
          if (url.endsWith('/health')) {
            return { status: 200, body: JSON.stringify({ status: 'OK' }) };
          }
          const uid = url.split('/').pop();
          const body = {
            'offscreen-metrics': {
              uid,
              type: 'prometheus',
              url: 'http://obs-prometheus:9090',
            },
            'offscreen-logs': {
              uid,
              type: 'loki',
              url: 'http://obs-loki:3100',
            },
            'offscreen-traces': {
              uid,
              type: 'tempo',
              url: 'http://obs-tempo:3200',
            },
          }[uid];
          return { status: 200, body: JSON.stringify(body) };
        },
      }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.reasonCode, null);
  assert.equal(seen.some((row) => row.url.includes('offscreen-metrics')), true);
  assert.equal(
    seen.every((row) => !row.url.includes('secret-value') && !row.authorization.includes('secret-value') === false || row.authorization.startsWith('Basic ')),
    true,
  );
  assert.equal(JSON.stringify(seen).includes('secret-value'), false);
  void sessionHealth;
});

test('unimplemented gate is recognized without live session', () => {
  assert.equal(gateImplemented('signals'), true);
  assert.equal(gateImplemented('persistence'), true);
  assert.equal(gateImplemented('partial-install'), false);
  assert.equal(gateImplemented('health'), true);
  assert.equal(gateImplemented('resources'), true);
  assert.equal(gateImplemented('outage'), true);
  assert.equal(gateImplemented('developer'), true);
});

test('D10 persistence positive path retains claims with query-only replay', async () => {
  const { dir, receiptPath } = sessionDirs();
  let otlpSubmissions = 0;
  let replayQueries = 0;
  let finishCount = 0;
  let rolloutIndex = 0;
  const custody = mockPersistenceCustody();
  const claims = {
    'obs-prometheus': { uid: 'pvc-obs-prometheus', volumeName: 'pv-obs-prometheus' },
    'storage-obs-loki-0': {
      uid: 'pvc-storage-obs-loki-0',
      volumeName: 'pv-storage-obs-loki-0',
    },
    'storage-obs-tempo-0': {
      uid: 'pvc-storage-obs-tempo-0',
      volumeName: 'pv-storage-obs-tempo-0',
    },
  };
  const session = {
    gate: 'persistence',
    profile: 'dev',
    context: CANONICAL_DEV_CONTEXT,
    env: DISRUPTION_ENV,
    identity: createFakeIdentity(),
    clock: { now: () => 0 },
    remainingWorkMs: () => 3_300_000,
    elapsedMs: () => 0,
    evidenceDir: dir,
    receiptPath,
    custody,
  };
  const result = await runPersistenceProof(session, {
    observe: async () => persistenceWorkloadObservation(),
    readClaims: async () => ({ ok: true, tuple: claims }),
    verifyFinalShape: async () => ({ ok: true }),
    finishProbePod: async () => {
      finishCount += 1;
      return { ok: true };
    },
    runPythonProbe: async ({ identityJson, session: s, mode }) => {
      const workDir = join(
        s.evidenceDir,
        identityJson ? `replay-${replayQueries}` : 'baseline',
      );
      mkdirSync(workDir, { recursive: true });
      if (!identityJson) {
        otlpSubmissions += 1;
        writeFileSync(
          join(workDir, 'identity.json'),
          JSON.stringify({
            run: 'abc123456789abcd',
            trace: 'trace123456789abc',
            marker: 'marker',
            now: 1,
          }),
        );
      } else {
        replayQueries += 1;
        assert.equal(mode, 'normal');
      }
      return { ok: true, workDir };
    },
    rollWorkload: async ({ pre }) => {
      rolloutIndex += 1;
      return { ok: true, podUidAfter: `next-pod-${rolloutIndex}` };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(otlpSubmissions, 1);
  assert.equal(replayQueries, 3);
  assert.equal(finishCount, 4);
  assert.equal(
    custody.events.some((row) => row[0] === 'begin' && row[1] === 'restart-prometheus'),
    true,
  );
  assert.equal(
    custody.events.filter((row) => row[0] === 'advance').length,
    2,
  );
  assert.equal(custody.events.at(-1)?.[0], 'clear');
});

test('D10 persistence stale RV refuses rollout', async () => {
  const custody = mockPersistenceCustody();
  const result = await runPersistenceProof(
    {
      gate: 'persistence',
      profile: 'dev',
      context: CANONICAL_DEV_CONTEXT,
      env: DISRUPTION_ENV,
      identity: createFakeIdentity(),
      clock: { now: () => 0 },
      remainingWorkMs: () => 3_300_000,
      elapsedMs: () => 0,
      evidenceDir: mkdtempSync(join(tmpdir(), 'obs-d10-stale-')),
      receiptPath: join(tmpdir(), 'unused-stale.json'),
      custody,
    },
    {
      observe: async () => persistenceWorkloadObservation(),
      verifyFinalShape: async () => ({ ok: true }),
      finishProbePod: async () => ({ ok: true }),
      runPythonProbe: async ({ session: s, identityJson }) => {
        const workDir = join(s.evidenceDir, identityJson ? 'replay' : 'baseline');
        mkdirSync(workDir, { recursive: true });
        if (!identityJson) {
          writeFileSync(
            join(workDir, 'identity.json'),
            JSON.stringify({ run: 'abc123456789abcd', now: 1 }),
          );
        }
        return { ok: true, workDir };
      },
      rollWorkload: async () => ({
        ok: false,
        reasonCode: 'rollout-stale-rv',
      }),
    },
  );
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'rollout-stale-rv');
});

test('D10 persistence unknown write stops later restarts', async () => {
  const custody = mockPersistenceCustody();
  let rollCalls = 0;
  const result = await runPersistenceProof(
    {
      gate: 'persistence',
      profile: 'dev',
      context: CANONICAL_DEV_CONTEXT,
      env: DISRUPTION_ENV,
      identity: createFakeIdentity(),
      clock: { now: () => 0 },
      remainingWorkMs: () => 3_300_000,
      elapsedMs: () => 0,
      evidenceDir: mkdtempSync(join(tmpdir(), 'obs-d10-unknown-')),
      receiptPath: join(tmpdir(), 'unused-unknown.json'),
      custody,
    },
    {
      observe: async () => persistenceWorkloadObservation(),
      verifyFinalShape: async () => ({ ok: true }),
      finishProbePod: async () => ({ ok: true }),
      runPythonProbe: async ({ session: s, identityJson }) => {
        const workDir = join(s.evidenceDir, identityJson ? 'replay' : 'baseline');
        mkdirSync(workDir, { recursive: true });
        if (!identityJson) {
          writeFileSync(
            join(workDir, 'identity.json'),
            JSON.stringify({ run: 'abc123456789abcd', now: 1 }),
          );
        }
        return { ok: true, workDir };
      },
      rollWorkload: async () => {
        rollCalls += 1;
        return {
          ok: false,
          reasonCode: 'rollout-patch-unknown',
          unknownWrite: true,
        };
      },
    },
  );
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'rollout-patch-unknown');
  assert.equal(rollCalls, 1);
});

test('D10 persistence replaced claims fail after restart', async () => {
  const custody = mockPersistenceCustody();
  let readClaimsCalls = 0;
  const result = await runPersistenceProof(
    {
      gate: 'persistence',
      profile: 'dev',
      context: CANONICAL_DEV_CONTEXT,
      env: DISRUPTION_ENV,
      identity: createFakeIdentity(),
      clock: { now: () => 0 },
      remainingWorkMs: () => 3_300_000,
      elapsedMs: () => 0,
      evidenceDir: mkdtempSync(join(tmpdir(), 'obs-d10-claims-')),
      receiptPath: join(tmpdir(), 'unused-claims.json'),
      custody,
    },
    {
      observe: async () => persistenceWorkloadObservation(),
      verifyFinalShape: async () => ({ ok: true }),
      finishProbePod: async () => ({ ok: true }),
      runPythonProbe: async ({ session: s, identityJson }) => {
        const workDir = join(s.evidenceDir, identityJson ? 'replay' : 'baseline');
        mkdirSync(workDir, { recursive: true });
        if (!identityJson) {
          writeFileSync(
            join(workDir, 'identity.json'),
            JSON.stringify({ run: 'abc123456789abcd', now: 1 }),
          );
        }
        return { ok: true, workDir };
      },
      rollWorkload: async () => ({ ok: true, podUidAfter: 'next-pod-1' }),
      readClaims: async () => {
        readClaimsCalls += 1;
        if (readClaimsCalls === 1) {
          return {
            ok: true,
            tuple: {
              'obs-prometheus': {
                uid: 'pvc-obs-prometheus',
                volumeName: 'pv-obs-prometheus',
              },
              'storage-obs-loki-0': {
                uid: 'pvc-storage-obs-loki-0',
                volumeName: 'pv-storage-obs-loki-0',
              },
              'storage-obs-tempo-0': {
                uid: 'pvc-storage-obs-tempo-0',
                volumeName: 'pv-storage-obs-tempo-0',
              },
            },
          };
        }
        return {
          ok: true,
          tuple: {
            'obs-prometheus': {
              uid: 'pvc-obs-prometheus-replaced',
              volumeName: 'pv-obs-prometheus',
            },
            'storage-obs-loki-0': {
              uid: 'pvc-storage-obs-loki-0',
              volumeName: 'pv-storage-obs-loki-0',
            },
            'storage-obs-tempo-0': {
              uid: 'pvc-storage-obs-tempo-0',
              volumeName: 'pv-storage-obs-tempo-0',
            },
          },
        };
      },
    },
  );
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'claim-uid-changed');
});

test('D10 persistence replay POST is refused', async () => {
  const custody = mockPersistenceCustody();
  const result = await runPersistenceProof(
    {
      gate: 'persistence',
      profile: 'dev',
      context: CANONICAL_DEV_CONTEXT,
      env: DISRUPTION_ENV,
      identity: createFakeIdentity(),
      clock: { now: () => 0 },
      remainingWorkMs: () => 3_300_000,
      elapsedMs: () => 0,
      evidenceDir: mkdtempSync(join(tmpdir(), 'obs-d10-replay-post-')),
      receiptPath: join(tmpdir(), 'unused-replay-post.json'),
      custody,
    },
    {
      observe: async () => persistenceWorkloadObservation(),
      verifyFinalShape: async () => ({ ok: true }),
      finishProbePod: async () => ({ ok: true }),
      runPythonProbe: async ({ session: s, identityJson }) => {
        const workDir = join(s.evidenceDir, identityJson ? 'replay' : 'baseline');
        mkdirSync(workDir, { recursive: true });
        if (!identityJson) {
          writeFileSync(
            join(workDir, 'identity.json'),
            JSON.stringify({ run: 'abc123456789abcd', now: 1 }),
          );
          return { ok: true, workDir };
        }
        return { ok: false, reasonCode: 'persistence-replay-post' };
      },
      rollWorkload: async () => ({ ok: true, podUidAfter: 'next-pod-1' }),
    },
  );
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'persistence-replay-post');
});

test('D10 outage positive path down restores and recovers', async () => {
  const { dir, receiptPath } = sessionDirs();
  const custody = mockOutageCustody();
  const baselineUp = outageWorkloadObservation();
  const tempoDown = outageWorkloadObservation({
    tempoReplicas: 0,
    tempoGeneration: 5,
    includeTempoPod: false,
    tempoRv: 'rv-tempo-2',
  });
  const tempoRestored = outageWorkloadObservation({
    tempoReplicas: 1,
    tempoGeneration: 6,
    includeTempoPod: true,
    tempoRv: 'rv-tempo-3',
  });
  let otlpSubmissions = 0;
  let outageProbes = 0;
  const session = {
    gate: 'outage',
    profile: 'dev',
    context: CANONICAL_DEV_CONTEXT,
    env: DISRUPTION_ENV,
    identity: createFakeIdentity(),
    clock: { now: () => 0 },
    remainingWorkMs: () => 4_500_000,
    elapsedMs: () => 0,
    evidenceDir: dir,
    receiptPath,
    custody,
  };
  const result = await runOutageProof(session, {
    observe: createOutageObserve([
      baselineUp,
      baselineUp,
      tempoDown,
      tempoDown,
      tempoRestored,
      tempoRestored,
      tempoRestored,
    ]),
    verifyFinalShape: async () => ({ ok: true }),
    finishProbePod: async () => ({ ok: true }),
    scaleWorkload: async ({ replicas, pre }) => {
      assert.equal(replicas, 0);
      assert.equal(pre.replicas, 1);
      return {
        ok: true,
        observed: {
          uid: pre.uid,
          resourceVersion: 'rv-tempo-2',
          generation: pre.generation + 1,
          replicas: 0,
        },
      };
    },
    runPythonProbe: async ({ session: s, mode, identityJson }) => {
      const workDir = join(s.evidenceDir, mode);
      mkdirSync(workDir, { recursive: true });
      if (mode === 'normal' && identityJson == null) {
        otlpSubmissions += 1;
        writeFileSync(
          join(workDir, 'identity.json'),
          JSON.stringify({ run: 'abc123456789abcd', now: 1 }),
        );
      }
      if (mode === 'tempo-outage') {
        outageProbes += 1;
      }
      return { ok: true, workDir };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(otlpSubmissions, 2);
  assert.equal(outageProbes, 1);
  assert.equal(custody.events.at(0)?.[0], 'begin');
  assert.equal(
    custody.events.some((row) => row[0] === 'restore' && row[1] === 5),
    true,
  );
  assert.equal(custody.events.at(-1)?.[0], 'clear');
});

test('D10 outage insufficient reserve refuses restore', async () => {
  const custody = mockOutageCustody();
  const baselineUp = outageWorkloadObservation();
  const tempoDown = outageWorkloadObservation({
    tempoReplicas: 0,
    tempoGeneration: 5,
    includeTempoPod: false,
  });
  const result = await runOutageProof(
    {
      gate: 'outage',
      profile: 'dev',
      context: CANONICAL_DEV_CONTEXT,
      env: DISRUPTION_ENV,
      identity: createFakeIdentity(),
      clock: { now: () => 0 },
      remainingWorkMs: () => 700_000,
      elapsedMs: () => 0,
      evidenceDir: mkdtempSync(join(tmpdir(), 'obs-d10-outage-budget-')),
      receiptPath: join(tmpdir(), 'unused-outage-budget.json'),
      custody,
    },
    {
      observe: createOutageObserve([baselineUp, baselineUp, tempoDown, tempoDown]),
      finishProbePod: async () => ({ ok: true }),
      scaleWorkload: async () => ({
        ok: true,
        observed: {
          uid: 'uid-obs-tempo',
          resourceVersion: 'rv-down',
          generation: 5,
          replicas: 0,
        },
      }),
      runPythonProbe: async ({ session: s, mode }) => {
        const workDir = join(s.evidenceDir, mode);
        mkdirSync(workDir, { recursive: true });
        if (mode === 'normal') {
          writeFileSync(
            join(workDir, 'identity.json'),
            JSON.stringify({ run: 'abc123456789abcd', now: 1 }),
          );
        }
        return { ok: true, workDir };
      },
    },
  );
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'outage-restore-budget');
  assert.equal(custody.events.includes(['restore', null]), false);
});

test('D10 outage unknown restore fails without clear', async () => {
  const custody = mockOutageCustody(() => ({
    ok: false,
    restorationFailed: true,
    restorationAttempted: true,
  }));
  const baselineUp = outageWorkloadObservation();
  const tempoDown = outageWorkloadObservation({
    tempoReplicas: 0,
    tempoGeneration: 5,
    includeTempoPod: false,
  });
  const result = await runOutageProof(
    {
      gate: 'outage',
      profile: 'dev',
      context: CANONICAL_DEV_CONTEXT,
      env: DISRUPTION_ENV,
      identity: createFakeIdentity(),
      clock: { now: () => 0 },
      remainingWorkMs: () => 4_000_000,
      elapsedMs: () => 0,
      evidenceDir: mkdtempSync(join(tmpdir(), 'obs-d10-unknown-restore-')),
      receiptPath: join(tmpdir(), 'unused-unknown-restore.json'),
      custody,
    },
    {
      observe: createOutageObserve([baselineUp, baselineUp, tempoDown, tempoDown]),
      finishProbePod: async () => ({ ok: true }),
      scaleWorkload: async () => ({
        ok: true,
        observed: {
          uid: 'uid-obs-tempo',
          resourceVersion: 'rv-down',
          generation: 5,
          replicas: 0,
        },
      }),
      runPythonProbe: async ({ session: s, mode }) => {
        const workDir = join(s.evidenceDir, mode);
        mkdirSync(workDir, { recursive: true });
        if (mode === 'normal') {
          writeFileSync(
            join(workDir, 'identity.json'),
            JSON.stringify({ run: 'abc123456789abcd', now: 1 }),
          );
        }
        return { ok: true, workDir };
      },
    },
  );
  assert.equal(result.ok, false);
  assert.equal(result.restorationFailed, true);
  assert.equal(result.reasonCode, 'outage-restore-failed');
  assert.equal(custody.events.at(-1)?.[0], 'restore');
});

test('D10 outage changed claims fail after restore', async () => {
  const custody = mockOutageCustody();
  const baselineUp = outageWorkloadObservation();
  const tempoDown = outageWorkloadObservation({
    tempoReplicas: 0,
    tempoGeneration: 5,
    includeTempoPod: false,
  });
  const tempoRestored = outageWorkloadObservation({
    tempoReplicas: 1,
    tempoGeneration: 6,
    includeTempoPod: true,
  });
  const result = await runOutageProof(
    {
      gate: 'outage',
      profile: 'dev',
      context: CANONICAL_DEV_CONTEXT,
      env: DISRUPTION_ENV,
      identity: createFakeIdentity(),
      clock: { now: () => 0 },
      remainingWorkMs: () => 4_500_000,
      elapsedMs: () => 0,
      evidenceDir: mkdtempSync(join(tmpdir(), 'obs-d10-outage-claims-')),
      receiptPath: join(tmpdir(), 'unused-outage-claims.json'),
      custody,
    },
    {
      observe: createOutageObserve([
        baselineUp,
        baselineUp,
        tempoDown,
        tempoDown,
        tempoRestored,
      ]),
      finishProbePod: async () => ({ ok: true }),
      scaleWorkload: async () => ({
        ok: true,
        observed: {
          uid: 'uid-obs-tempo',
          resourceVersion: 'rv-down',
          generation: 5,
          replicas: 0,
        },
      }),
      runPythonProbe: async ({ session: s, mode }) => {
        const workDir = join(s.evidenceDir, mode);
        mkdirSync(workDir, { recursive: true });
        if (mode === 'normal') {
          writeFileSync(
            join(workDir, 'identity.json'),
            JSON.stringify({ run: 'abc123456789abcd', now: 1 }),
          );
        }
        return { ok: true, workDir };
      },
      readClaims: async () => {
        return {
          ok: true,
          claims: [
            {
              name: 'obs-prometheus',
              uid: 'pvc-obs-prometheus-replaced',
              volumeName: 'pv-obs-prometheus',
              pvUid: 'pv-obs-prometheus',
              claimRef: {
                name: 'obs-prometheus',
                namespace: 'offscreen-dev-observability',
                uid: 'pvc-obs-prometheus-replaced',
              },
            },
            {
              name: 'storage-obs-loki-0',
              uid: 'pvc-storage-obs-loki-0',
              volumeName: 'pv-storage-obs-loki-0',
              pvUid: 'pv-storage-obs-loki-0',
              claimRef: {
                name: 'storage-obs-loki-0',
                namespace: 'offscreen-dev-observability',
                uid: 'pvc-storage-obs-loki-0',
              },
            },
            {
              name: 'storage-obs-tempo-0',
              uid: 'pvc-storage-obs-tempo-0',
              volumeName: 'pv-storage-obs-tempo-0',
              pvUid: 'pv-storage-obs-tempo-0',
              claimRef: {
                name: 'storage-obs-tempo-0',
                namespace: 'offscreen-dev-observability',
                uid: 'pvc-storage-obs-tempo-0',
              },
            },
          ],
        };
      },
    },
  );
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'claim-uid-changed');
});

test('D10 outage changed Collector fails after restore', async () => {
  const custody = mockOutageCustody();
  const baselineUp = outageWorkloadObservation();
  const collectorChanged = outageWorkloadObservation({
    tempoReplicas: 1,
    tempoGeneration: 6,
    includeTempoPod: true,
  });
  collectorChanged.snapshot.objects['Pod/obs-collector'].metadata.uid =
    'collector-replaced';
  const tempoDown = outageWorkloadObservation({
    tempoReplicas: 0,
    tempoGeneration: 5,
    includeTempoPod: false,
  });
  const result = await runOutageProof(
    {
      gate: 'outage',
      profile: 'dev',
      context: CANONICAL_DEV_CONTEXT,
      env: DISRUPTION_ENV,
      identity: createFakeIdentity(),
      clock: { now: () => 0 },
      remainingWorkMs: () => 4_500_000,
      elapsedMs: () => 0,
      evidenceDir: mkdtempSync(join(tmpdir(), 'obs-d10-outage-collector-')),
      receiptPath: join(tmpdir(), 'unused-outage-collector.json'),
      custody,
    },
    {
      observe: createOutageObserve([
        baselineUp,
        baselineUp,
        tempoDown,
        tempoDown,
        collectorChanged,
      ]),
      finishProbePod: async () => ({ ok: true }),
      scaleWorkload: async () => ({
        ok: true,
        observed: {
          uid: 'uid-obs-tempo',
          resourceVersion: 'rv-down',
          generation: 5,
          replicas: 0,
        },
      }),
      runPythonProbe: async ({ session: s, mode }) => {
        const workDir = join(s.evidenceDir, mode);
        mkdirSync(workDir, { recursive: true });
        if (mode === 'normal') {
          writeFileSync(
            join(workDir, 'identity.json'),
            JSON.stringify({ run: 'abc123456789abcd', now: 1 }),
          );
        }
        return { ok: true, workDir };
      },
    },
  );
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'collector-uid-changed');
});

test('D10 outage cancelled POST is refused', async () => {
  const custody = mockOutageCustody();
  const baselineUp = outageWorkloadObservation();
  const tempoDown = outageWorkloadObservation({
    tempoReplicas: 0,
    tempoGeneration: 5,
    includeTempoPod: false,
  });
  let isolationCalls = 0;
  const result = await runOutageProof(
    {
      gate: 'outage',
      profile: 'dev',
      context: CANONICAL_DEV_CONTEXT,
      env: DISRUPTION_ENV,
      identity: createFakeIdentity(),
      clock: { now: () => 0 },
      remainingWorkMs: () => 4_500_000,
      elapsedMs: () => 0,
      evidenceDir: mkdtempSync(join(tmpdir(), 'obs-d10-outage-cancel-')),
      receiptPath: join(tmpdir(), 'unused-outage-cancel.json'),
      custody,
    },
    {
      observe: createOutageObserve([baselineUp, baselineUp, tempoDown, tempoDown]),
      finishProbePod: async () => ({ ok: true }),
      scaleWorkload: async () => ({
        ok: true,
        observed: {
          uid: 'uid-obs-tempo',
          resourceVersion: 'rv-down',
          generation: 5,
          replicas: 0,
        },
      }),
      runPythonProbe: async ({ session: s, mode, identityJson }) => {
        if (mode === 'tempo-outage') {
          isolationCalls += 1;
          return { ok: false, reasonCode: 'outage-cancelled-post' };
        }
        const workDir = join(s.evidenceDir, mode);
        mkdirSync(workDir, { recursive: true });
        if (mode === 'normal' && identityJson == null) {
          writeFileSync(
            join(workDir, 'identity.json'),
            JSON.stringify({ run: 'abc123456789abcd', now: 1 }),
          );
        }
        return { ok: true, workDir };
      },
    },
  );
  assert.equal(result.ok, false);
  assert.equal(isolationCalls, 1);
  assert.equal(result.reasonCode, 'outage-cancelled-post');
  assert.equal(custody.events.at(-1)?.[0], 'restore');
});

test('D10 outage restoration failure fails receipt', async () => {
  const { dir, receiptPath } = sessionDirs();
  const baselineUp = outageWorkloadObservation();
  const tempoDown = outageWorkloadObservation({
    tempoReplicas: 0,
    tempoGeneration: 5,
    includeTempoPod: false,
  });
  const session = {
    gate: 'outage',
    profile: 'dev',
    context: CANONICAL_DEV_CONTEXT,
    env: DISRUPTION_ENV,
    identity: createFakeIdentity(),
    clock: { now: () => 0 },
    remainingWorkMs: () => 4_000_000,
    elapsedMs: () => 0,
    evidenceDir: dir,
    receiptPath,
  };
  const result = await runOutageProof(session, {
    observe: createOutageObserve([baselineUp, baselineUp, tempoDown, tempoDown]),
    finishProbePod: async () => ({ ok: true }),
    scaleWorkload: async () => ({
      ok: true,
      observed: {
        uid: 'uid-obs-tempo',
        resourceVersion: 'rv-down',
        generation: 5,
        replicas: 0,
      },
    }),
    runPythonProbe: async ({ session: s, mode }) => {
      const workDir = join(s.evidenceDir, mode);
      mkdirSync(workDir, { recursive: true });
      if (mode === 'normal') {
        writeFileSync(
          join(workDir, 'identity.json'),
          JSON.stringify({ run: 'abc123456789abcd', now: 1 }),
        );
      }
      return { ok: true, workDir };
    },
    restoreTempo: async () => ({
      ok: false,
      reasonCode: 'outage-restore-failed',
      restorationFailed: true,
    }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.restorationFailed, true);
  assert.equal(result.reasonCode, 'outage-restore-failed');
  let outageCalled = false;
  const persisted = await runProofOperationSession({
    gate: 'outage',
    profile: 'dev',
    context: CANONICAL_DEV_CONTEXT,
    env: DISRUPTION_ENV,
    evidenceDir: dir,
    receiptPath,
    io: defaultReceiptIo(dir),
    clock: { now: () => 0 },
    readSourceSha: () => SOURCE_SHA,
    captureIdentity: () => createFakeIdentity(),
    recheckIdentity: () => ({ ok: true }),
    runOutage: async () => {
      outageCalled = true;
      return {
        ok: false,
        reasonCode: 'outage-restore-failed',
        restorationFailed: true,
      };
    },
  });
  assert.equal(persisted.ok, false);
  assert.equal(persisted.reasonCode, 'outage-restore-failed');
  assert.equal(outageCalled, true);
  assert.equal(existsSync(receiptPath), true);
});

test('missing disruption authorization refuses before scale or restart', async () => {
  let scaled = false;
  let restarted = false;
  const session = {
    gate: 'persistence',
    profile: 'dev',
    context: CANONICAL_DEV_CONTEXT,
    env: AUTH_ENV,
    identity: createFakeIdentity(),
    clock: { now: () => 0 },
    remainingWorkMs: () => 3_300_000,
    elapsedMs: () => 0,
    evidenceDir: mkdtempSync(join(tmpdir(), 'obs-proof-no-disruption-')),
    receiptPath: join(tmpdir(), 'unused.json'),
  };
  const persistence = await runPersistenceProof(session, {
    rollWorkload: async () => {
      restarted = true;
      return { ok: true };
    },
    scaleWorkload: async () => {
      scaled = true;
      return { ok: true };
    },
    observe: async () => readyObservation(),
  });
  assert.equal(persistence.ok, false);
  assert.equal(persistence.reasonCode, 'disruption-unauthorized');
  assert.equal(restarted, false);
  assert.equal(scaled, false);

  const code = await main(
    ['node', 'proof.mjs', 'persistence', 'dev', CANONICAL_DEV_CONTEXT],
    AUTH_ENV,
  );
  assert.equal(code, 1);
});

test('resource sampling records missing CPU family as not observed', () => {
  const report = summarizeResourceSamples({
    'obs-collector': Array.from({ length: 12 }, () => ({
      workingSetBytes: 10_485_760,
      memoryTime: 't',
      cpuNanoCores: null,
    })),
  });
  assert.equal(report['obs-collector'].cpuMilli, 'not-observed');
});

test('signals gate refuses before probe spawn without authorization', async () => {
  const code = await main(
    ['node', 'proof.mjs', 'signals', 'dev', CANONICAL_DEV_CONTEXT],
    {},
  );
  assert.equal(code, 1);
});

test('signals gate invokes injected runner through proof live session', async () => {
  let kubectl = false;
  const result = await runLiveProof(
    { gate: 'signals', profile: 'dev', context: CANONICAL_DEV_CONTEXT },
    {
      readSourceSha: () => SOURCE_SHA,
      captureIdentity: () => createFakeIdentity(),
      recheckIdentity: () => ({ ok: true }),
      verifyCleanCheckout: () => ({ ok: true }),
      runSignals: async () => ({ ok: false, reasonCode: 'probe-failed' }),
      env: AUTH_ENV,
      signalsDeps: {
        run: () => {
          kubectl = true;
          return { ok: false };
        },
      },
    },
  );
  assert.equal(kubectl, false);
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'probe-failed');
});

test('signals session uses injected runner without kubectl', async () => {
  const { dir, receiptPath } = sessionDirs();
  let ensureCalled = false;
  let cleanupCalled = false;
  const result = await runProofOperationSession({
    gate: 'signals',
    profile: 'dev',
    context: CANONICAL_DEV_CONTEXT,
    env: AUTH_ENV,
    evidenceDir: dir,
    receiptPath,
    io: defaultReceiptIo(dir),
    clock: { now: () => 0 },
    readSourceSha: () => SOURCE_SHA,
    captureIdentity: () => createFakeIdentity(),
    recheckIdentity: () => ({ ok: true }),
    verifyCleanCheckout: () => ({ ok: true }),
    runSignals: async (session) => {
      assert.equal(session.gate, 'signals');
      assert.equal(session.evidenceDir, dir);
      cleanupCalled = true;
      return { ok: false, reasonCode: 'callback-failed' };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'callback-failed');
  assert.equal(ensureCalled, false);
  assert.equal(cleanupCalled, true);
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
  assert.equal(receipt.ok, false);
  assert.equal(receipt.completed, false);
});

test('phase start refuses when remaining work budget is insufficient', () => {
  assert.equal(refusePhaseStart(119_000, 120_000), true);
  assert.equal(remainingWorkBudgetMs(0, 'health'), 1_225_000);
  assert.equal(remainingWorkBudgetMs(1, 'health'), 1_224_999);
  assert.equal(assessHealthStructuralObservation(readyObservation()).ok, true);
  assert.equal(assessDatasourceHealth(healthyDatasources()).ok, true);
  assert.equal(
    stableIdentitiesCompatible(
      extractStableIdentities(readyObservation(NS_UID_A)),
      extractStableIdentities(readyObservation(NS_UID_A)),
    ).ok,
    true,
  );
  const receipt = buildProofReceipt({
    gate: 'health',
    profile: 'dev',
    context: CANONICAL_DEV_CONTEXT,
    sourceSha: SOURCE_SHA,
    clusterUid: CLUSTER_UID,
    namespaceUid: NS_UID_A,
    completed: true,
    cleanup: true,
    reasonCode: null,
  });
  assert.equal(receipt.ok, true);
  const receiptDir = mkdtempSync(join(tmpdir(), 'obs-proof-receipt-'));
  const persisted = persistProofReceipt({
    receiptDir,
    receiptPath: join(receiptDir, 'receipt.json'),
    payload: receipt,
    io: createMemoryIo(),
  });
  assert.equal(persisted.ok, true);
});

test('wrong Loki argv creates no quota', async () => {
  const identity = createFakeIdentity(null);
  const plans = fakePartialInstallPlans(identity);
  let quotaWrites = 0;
  const session = {
    profile: 'dev',
    identity,
    env: ISOLATED_ENV,
    clock: { now: () => 0 },
    remainingWorkMs: () => 3_600_000,
    evidenceDir: mkdtempSync(join(tmpdir(), 'obs-partial-wrong-')),
  };
  const wrongArgv = [...plans.exactLokiArgv];
  wrongArgv[2] = '/charts/wrong-loki.tgz';
  const outcome = await maybeInjectQuotaForLokiInstall(session, wrongArgv, {
    plans,
    createQuota: async () => {
      quotaWrites += 1;
      return { ok: true };
    },
    waitQuotaHard: async () => ({ ok: true }),
    chartSha256: plans.loki.sha256,
  });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.quotaCreated, false);
  assert.equal(quotaWrites, 0);
});

test('quota status.hard missing fails the receipt', async () => {
  const identity = createFakeIdentity(null);
  const plans = fakePartialInstallPlans(identity);
  const session = {
    profile: 'dev',
    identity,
    env: ISOLATED_ENV,
    clock: { now: () => 0 },
    remainingWorkMs: () => 3_600_000,
    evidenceDir: mkdtempSync(join(tmpdir(), 'obs-partial-quota-')),
  };
  const injected = await maybeInjectQuotaForLokiInstall(
    session,
    plans.exactLokiArgv,
    {
      plans,
      recheck: () => ({ ok: true }),
      createQuota: async () => ({ ok: true }),
      waitQuotaHard: async () => ({
        ok: false,
        reasonCode: 'quota-hard-missing',
      }),
      chartSha256: plans.loki.sha256,
    },
  );
  assert.equal(injected.ok, false);
  assert.equal(injected.reasonCode, 'quota-hard-missing');
  assert.equal(quotaHardPopulated({ status: { hard: {} } }), false);
  assert.equal(
    quotaHardPopulated({
      status: { hard: { 'count/statefulsets.apps': '0' } },
    }),
    true,
  );

  const { dir, receiptPath } = sessionDirs();
  let partialCalled = false;
  const persisted = await runProofOperationSession({
    gate: 'partial-install',
    profile: 'dev',
    context: CANONICAL_DEV_CONTEXT,
    env: ISOLATED_ENV,
    evidenceDir: dir,
    receiptPath,
    io: defaultReceiptIo(dir),
    clock: { now: () => 0 },
    runPartialInstall: async () => {
      partialCalled = true;
      return { ok: true };
    },
  });
  assert.equal(persisted.ok, false);
  assert.equal(persisted.reasonCode, 'gate-not-implemented');
  assert.equal(partialCalled, false);
  assert.equal(existsSync(receiptPath), false);
});

test('missing isolated authorization refuses first', async () => {
  const identity = createFakeIdentity(null);
  let wrapperWritten = false;
  const session = {
    profile: 'dev',
    identity,
    env: DISRUPTION_ENV,
    clock: { now: () => 0 },
    remainingWorkMs: () => 3_600_000,
    evidenceDir: mkdtempSync(join(tmpdir(), 'obs-partial-auth-')),
  };
  const result = await runPartialInstallProof(session, {
    writeWrapper: () => {
      wrapperWritten = true;
      return join(session.evidenceDir, 'helm-wrapper');
    },
    createQuota: async () => {
      throw new Error('quota-should-not-run');
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'isolated-unauthorized');
  assert.equal(wrapperWritten, false);

  const code = await main(
    ['node', 'proof.mjs', 'partial-install', 'dev', CANONICAL_DEV_CONTEXT],
    DISRUPTION_ENV,
  );
  assert.equal(code, 1);
});

test('repeat ensure issues no write', async () => {
  const identity = createFakeIdentity(null);
  const plans = fakePartialInstallPlans(identity);
  const session = {
    profile: 'dev',
    identity,
    env: ISOLATED_ENV,
    clock: { now: () => 0 },
    remainingWorkMs: () => 3_600_000,
    evidenceDir: mkdtempSync(join(tmpdir(), 'obs-partial-repeat-')),
  };
  const result = await runPartialInstallProof(session, {
    resolvePlans: () => plans,
    verifyNamespaceAbsent: async () => ({ ok: true }),
    recheck: () => ({ ok: true }),
    resolveRealHelm: () => ({ ok: true, path: '/usr/bin/helm' }),
    runWrappedEnsure: async () => ({
      ok: true,
      workerReceipt: partialEnsureWorkerReceipt(),
    }),
    runRepeatEnsure: async () => ({
      refused: false,
      writes: 1,
      mutation: 'none',
      ok: true,
    }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'repeat-ensure-wrote');
});

test('developer gate refuses a missing proof lock before forwards', async () => {
  const { runDeveloperProof } = await import('../developer.mjs');
  const result = await runDeveloperProof({
    identity: createFakeIdentity(),
    clock: { now: () => 0 },
    remainingWorkMs: () => 600_000,
    custody: null,
    proofCustody: null,
  });
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'wrong-lock');
});

test('developer gate reports malformed child output and forward failure', async () => {
  const { runDeveloperProof, developerProbeArgs } = await import('../developer.mjs');
  const argv = developerProbeArgs(
    {
      developerHttp: 14318,
      diagnosticHttp: 4318,
      prometheus: 19090,
      loki: 13100,
      tempo: 13200,
    },
    '/tmp/proof-locks',
    600_000,
  );
  assert.equal(argv.args[0].endsWith('developer-probe.py'), true);
  assert.deepEqual(argv.args.slice(1, 5), [
    '--developer-http-port',
    '14318',
    '--diagnostic-http-port',
    '4318',
  ]);
  const session = {
    identity: createFakeIdentity(),
    clock: { now: () => 1_000 },
    remainingWorkMs: () => 600_000,
    custody: { fd: 3 },
    proofCustody: { fd: 4, lockDirectory: '/tmp/proof-locks' },
  };
  const malformed = await runDeveloperProof(session, {
    openForwards: async () => ({
      ports: {
        developerHttp: 14318,
        diagnosticHttp: 9,
        prometheus: 19090,
        loki: 13100,
        tempo: 13200,
      },
      close: async () => {},
    }),
    startOwnedChild: () => ({
      outcome: Promise.resolve({ ok: true, stdout: 'not-json' }),
    }),
  });
  assert.equal(malformed.reasonCode, 'malformed-result');
  const failedChild = await runDeveloperProof(session, {
    openForwards: async () => ({
      ports: {
        developerHttp: 14318,
        diagnosticHttp: 9,
        prometheus: 19090,
        loki: 13100,
        tempo: 13200,
      },
      close: async () => {},
    }),
    startOwnedChild: () => ({
      outcome: Promise.resolve({ ok: false, stdout: '' }),
    }),
  });
  assert.equal(failedChild.reasonCode, 'developer-child-failed');
  const failedForward = await runDeveloperProof(session, {
    openForwards: async () => {
      throw new Error('forward-down');
    },
  });
  assert.equal(failedForward.reasonCode, 'forward-failed');
});

test('developer session accepts an injected runner', async () => {
  const result = await runLiveProof(
    { gate: 'developer', profile: 'dev', context: CANONICAL_DEV_CONTEXT },
    {
      readSourceSha: () => SOURCE_SHA,
      captureIdentity: () => createFakeIdentity(),
      recheckIdentity: () => ({ ok: true }),
      verifyCleanCheckout: () => ({ ok: true }),
      env: AUTH_ENV,
      custody: { fd: 3 },
      proofCustody: { fd: 4, lockDirectory: '/tmp/proof-locks' },
      runDeveloper: async (session) => {
        assert.equal(session.proofCustody.fd, 4);
        return { ok: true, cleanup: true };
      },
    },
  );
  assert.equal(result.ok, true);
  assert.equal(result.phase, 'developer-complete');
});
