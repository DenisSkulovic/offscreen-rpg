import assert from 'node:assert/strict';
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { readKindProfile } from '../../../clusters/kind/manager/config.mjs';
import { DEV_CLUSTER_OWNER } from '../../../clusters/kind/manager/dev-bootstrap.mjs';
import {
  classifyInventory,
  observeObservability,
  parseImageReference,
  verifyContainerRuntimeIdentity,
  verifyPodSpecImageIdentity,
} from '../readiness.mjs';
import { loadArtifacts } from '../artifacts.mjs';
import {
  buildCompleteDevSnapshot,
  cloneSnapshot,
  expectHeadlessSpec,
} from './snapshot-fixtures.mjs';

const specimensRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'specimens',
);
const LOCK_PATH = join(specimensRoot, 'image-lock-candidate.tsv');
const LOCK_LINES = readFileSync(LOCK_PATH, 'utf8').trim().split('\n').slice(1);
const LOCK_COLLECTOR = LOCK_LINES.find((line) =>
  line.startsWith('collector\t'),
).split('\t')[1];

const expectedImage = {
  containerName: 'opentelemetry-collector',
  renderedReference: LOCK_COLLECTOR.replace(
    /@sha256:.+$/,
    (match) => `:0.183.2${match}`,
  ),
  canonicalReference: LOCK_COLLECTOR,
};

test('parseImageReference rejects tag-only image', () => {
  const parsed = parseImageReference('docker.io/example:v1');
  assert.equal(parsed.ok, false);
});

test('B07 negatives for runtime identity', () => {
  const baseStatus = {
    containerStatuses: [
      {
        name: expectedImage.containerName,
        ready: true,
        state: { running: { startedAt: '2026-01-01T00:00:00Z' } },
        imageID: expectedImage.canonicalReference,
      },
    ],
  };
  assert.equal(
    verifyContainerRuntimeIdentity(
      baseStatus,
      expectedImage.containerName,
      expectedImage.canonicalReference,
    ).ok,
    true,
  );
  const wrongRepo = {
    containerStatuses: [
      {
        ...baseStatus.containerStatuses[0],
        imageID: `ghcr.io/wrong@sha256:${LOCK_COLLECTOR.split('@sha256:')[1]}`,
      },
    ],
  };
  assert.equal(
    verifyContainerRuntimeIdentity(
      wrongRepo,
      expectedImage.containerName,
      expectedImage.canonicalReference,
    ).reason,
    'wrong-repository',
  );
  const bare = {
    containerStatuses: [
      {
        ...baseStatus.containerStatuses[0],
        imageID: `sha256:${LOCK_COLLECTOR.split('@sha256:')[1]}`,
      },
    ],
  };
  assert.equal(
    verifyContainerRuntimeIdentity(
      bare,
      expectedImage.containerName,
      expectedImage.canonicalReference,
    ).reason,
    'bare-config-digest',
  );
  const child = {
    containerStatuses: [
      {
        ...baseStatus.containerStatuses[0],
        imageID: `${expectedImage.canonicalReference.slice(0, expectedImage.canonicalReference.length - 2)}00`,
      },
    ],
  };
  assert.equal(
    verifyContainerRuntimeIdentity(
      child,
      expectedImage.containerName,
      expectedImage.canonicalReference,
    ).reason,
    'child-or-wrong-digest',
  );
  const extra = {
    containerStatuses: [
      baseStatus.containerStatuses[0],
      { name: 'side', ready: true, imageID: expectedImage.canonicalReference },
    ],
  };
  assert.equal(
    verifyContainerRuntimeIdentity(
      extra,
      expectedImage.containerName,
      expectedImage.canonicalReference,
    ).reason,
    'status-count',
  );
  const wrongName = {
    containerStatuses: [{ ...baseStatus.containerStatuses[0], name: 'other' }],
  };
  assert.equal(
    verifyContainerRuntimeIdentity(
      wrongName,
      expectedImage.containerName,
      expectedImage.canonicalReference,
    ).reason,
    'status-name',
  );
  const withStatusImage = {
    containerStatuses: [
      { ...baseStatus.containerStatuses[0], image: 'ignored' },
    ],
  };
  assert.equal(
    verifyContainerRuntimeIdentity(
      withStatusImage,
      expectedImage.containerName,
      expectedImage.canonicalReference,
    ).reason,
    'status-image-forbidden',
  );
});

test('pod spec rejects extra containers and tag-only spec', () => {
  const ok = verifyPodSpecImageIdentity(
    {
      containers: [
        {
          name: expectedImage.containerName,
          image: expectedImage.renderedReference,
        },
      ],
    },
    expectedImage,
  );
  assert.equal(ok.ok, true);
  const extra = verifyPodSpecImageIdentity(
    {
      containers: [
        {
          name: expectedImage.containerName,
          image: expectedImage.renderedReference,
        },
        { name: 'extra', image: 'x' },
      ],
    },
    expectedImage,
  );
  assert.equal(extra.reason, 'container-count');
  const init = verifyPodSpecImageIdentity(
    {
      containers: [
        {
          name: expectedImage.containerName,
          image: expectedImage.renderedReference,
        },
      ],
      initContainers: [{ name: 'init', image: 'x' }],
    },
    expectedImage,
  );
  assert.equal(init.reason, 'extra-init-or-ephemeral');
});

test('observeObservability with default pending reports absent when namespace missing', () => {
  const devKind = readKindProfile('dev');
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const root = mkdtempSync(join(tmpdir(), 'obs-default-pending-'));
  const snapshotPath = join(root, 'snapshot.json');
  writeFileSync(
    snapshotPath,
    `${JSON.stringify({
      contexts: [
        {
          name: devKind.contextName,
          context: {
            cluster: `kind-${devKind.clusterName}`,
            user: `kind-${devKind.clusterName}`,
          },
        },
      ],
      clusters: [
        {
          name: `kind-${devKind.clusterName}`,
          cluster: {
            server: 'https://127.0.0.1:24443',
            'certificate-authority-data': 'Y2E=',
          },
        },
      ],
      users: [{ name: `kind-${devKind.clusterName}`, user: {} }],
      'current-context': devKind.contextName,
    })}\n`,
    { mode: 0o600 },
  );
  chmodSync(snapshotPath, 0o600);
  const result = observeObservability('dev', {
    verifyArchive: false,
    artifacts,
    stateRoot: root,
    now: () => 0,
    deadline: 500_000,
    identity: {
      profileId: 'dev',
      profile: { id: 'dev' },
      contextName: devKind.contextName,
      clusterName: devKind.clusterName,
      namespace: 'offscreen-dev-observability',
      snapshotPath,
      tuple: {
        targetNamespaceUid: null,
        port: 24443,
      },
      cleanup: () => ({ ok: true }),
    },
    run(command, args) {
      const resource = args[args.indexOf('get') + 1];
      if (
        command === 'kubectl' &&
        resource === 'namespace' &&
        args.includes('offscreen-dev-observability')
      ) {
        return {
          ok: true,
          status: 0,
          stdout: '\n',
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (command === 'kubectl' && args.includes('ignore-not-found')) {
        return {
          ok: true,
          status: 0,
          stdout: '\n',
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (command === 'kubectl' && args.includes('pv')) {
        return {
          ok: true,
          status: 0,
          stdout: '{"items":[]}',
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (
        command === 'kubectl' &&
        args.includes('get') &&
        args.includes('-o', 'json') &&
        !args.includes('ignore-not-found')
      ) {
        return {
          ok: true,
          status: 0,
          stdout: '{"items":[]}',
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (command === 'helm') {
        return {
          ok: true,
          status: 0,
          stdout: '[]',
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (command === 'kubectl' && args.includes('current-context')) {
        return {
          ok: true,
          status: 0,
          stdout: `${devKind.contextName}\n`,
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (
        command === 'kubectl' &&
        args.includes('config') &&
        args.includes('view')
      ) {
        return {
          ok: true,
          status: 0,
          stdout: JSON.stringify({
            contexts: [
              {
                name: devKind.contextName,
                context: {
                  cluster: `kind-${devKind.clusterName}`,
                  user: `kind-${devKind.clusterName}`,
                },
              },
            ],
            clusters: [
              {
                name: `kind-${devKind.clusterName}`,
                cluster: {
                  server: 'https://127.0.0.1:24443',
                  'certificate-authority-data': 'Y2E=',
                },
              },
            ],
            users: [{ name: `kind-${devKind.clusterName}`, user: {} }],
            'current-context': devKind.contextName,
          }),
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      return {
        ok: false,
        status: 1,
        stdout: '',
        stderr: 'unexpected',
        timedOut: false,
        missing: false,
      };
    },
  });
  rmSync(root, { recursive: true, force: true });
  assert.equal(result.state, 'absent');
  assert.equal(result.pending, false);
});

test('observeObservability recheck failure forces unreadable', () => {
  const devKind = readKindProfile('dev');
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const root = mkdtempSync(join(tmpdir(), 'obs-recheck-'));
  const snapshotPath = join(root, 'snapshot.json');
  writeFileSync(
    snapshotPath,
    `${JSON.stringify({
      contexts: [
        {
          name: devKind.contextName,
          context: {
            cluster: `kind-${devKind.clusterName}`,
            user: `kind-${devKind.clusterName}`,
          },
        },
      ],
      clusters: [
        {
          name: `kind-${devKind.clusterName}`,
          cluster: {
            server: 'https://127.0.0.1:24443',
            'certificate-authority-data': 'Y2E=',
          },
        },
      ],
      users: [{ name: `kind-${devKind.clusterName}`, user: {} }],
      'current-context': devKind.contextName,
    })}\n`,
    { mode: 0o600 },
  );
  chmodSync(snapshotPath, 0o600);
  const result = observeObservability('dev', {
    artifacts,
    now: () => 0,
    deadline: 500_000,
    identity: {
      profileId: 'dev',
      contextName: devKind.contextName,
      clusterName: devKind.clusterName,
      namespace: 'offscreen-dev-observability',
      snapshotPath,
      tuple: { targetNamespaceUid: null, port: 24443 },
      cleanup: () => ({ ok: true }),
    },
    run(command, args) {
      const resource = args[args.indexOf('get') + 1];
      if (
        command === 'kubectl' &&
        resource === 'namespace' &&
        args.includes('offscreen-dev-observability')
      ) {
        return {
          ok: true,
          status: 0,
          stdout: JSON.stringify({
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: { name: 'offscreen-dev-observability', uid: 'ns-uid' },
          }),
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (command === 'kubectl' && args.includes('current-context')) {
        return {
          ok: true,
          status: 0,
          stdout: 'wrong-context\n',
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (command === 'kubectl' || command === 'helm') {
        return {
          ok: true,
          status: 0,
          stdout:
            command === 'helm'
              ? '[]'
              : args.includes('ignore-not-found')
                ? '\n'
                : '{"items":[]}',
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      return {
        ok: false,
        status: 1,
        stdout: '',
        stderr: 'x',
        timedOut: false,
        missing: false,
      };
    },
  });
  assert.equal(result.state, 'unreadable');
  assert.match(result.detail, /context-changed/);
});

test('classifyInventory complete dev snapshot is ready with headless services', () => {
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const snapshot = buildCompleteDevSnapshot(artifacts);
  const classified = classifyInventory(snapshot, artifacts);
  assert.deepEqual(classified, {
    state: 'ready',
    reasonCode: 'ready',
    pending: false,
    detail: 'ready',
  });
  assert.equal(
    expectHeadlessSpec(snapshot, artifacts, 'obs-loki-headless'),
    true,
  );
  assert.equal(
    expectHeadlessSpec(snapshot, artifacts, 'obs-tempo-headless'),
    true,
  );
});

test('classifyInventory pending complete shape is ready but pending blocks admission', () => {
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const snapshot = { ...buildCompleteDevSnapshot(artifacts), pending: true };
  const classified = classifyInventory(snapshot, artifacts);
  assert.equal(classified.state, 'ready');
  assert.equal(classified.reasonCode, 'pending');
  assert.equal(classified.pending, true);
  assert.notEqual(classified.state, 'absent');
});

test('classifyInventory missing headless service is not-ready', () => {
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const snapshot = cloneSnapshot(buildCompleteDevSnapshot(artifacts));
  delete snapshot.objects['Service/obs-loki-headless'];
  const classified = classifyInventory(snapshot, artifacts);
  assert.equal(classified.state, 'not-ready');
  assert.match(classified.detail, /obs-loki-headless/);
});

test('classifyInventory wrong headless ports refuse', () => {
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const snapshot = cloneSnapshot(buildCompleteDevSnapshot(artifacts));
  snapshot.objects['Service/obs-tempo-headless'].spec.ports = [];
  const classified = classifyInventory(snapshot, artifacts);
  assert.equal(classified.state, 'not-ready');
  assert.match(classified.detail, /headless-obs-tempo-headless/);
});

test('classifyInventory legacy orphan replica set refuses', () => {
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const snapshot = buildCompleteDevSnapshot(artifacts);
  snapshot.objects['ReplicaSet/orphan-otel'] = {
    kind: 'ReplicaSet',
    metadata: {
      name: 'orphan-otel',
      namespace: 'offscreen-dev-observability',
      uid: 'uid-orphan',
      labels: { 'app.kubernetes.io/name': 'otel-collector' },
    },
  };
  const classified = classifyInventory(snapshot, artifacts);
  assert.equal(classified.state, 'legacy');
  assert.match(classified.detail, /legacy-orphan/);
});

test('classifyInventory wrong runtime image refuses', () => {
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const snapshot = cloneSnapshot(buildCompleteDevSnapshot(artifacts));
  snapshot.objects['Pod/obs-collector-0'].status.containerStatuses[0].imageID =
    'docker.io/example@sha256:1111111111111111111111111111111111111111111111111111111111111111';
  const classified = classifyInventory(snapshot, artifacts);
  assert.equal(classified.state, 'not-ready');
  assert.match(classified.detail, /runtime/);
});

test('classifyInventory wrong pv claimRef uid refuses', () => {
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const snapshot = cloneSnapshot(buildCompleteDevSnapshot(artifacts));
  snapshot.persistentVolumes[0].spec.claimRef.uid = 'foreign-uid';
  const classified = classifyInventory(snapshot, artifacts);
  assert.equal(classified.state, 'not-ready');
  assert.match(classified.detail, /pv-claimref/);
});

test('classifyInventory stale deployment generation refuses', () => {
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const snapshot = cloneSnapshot(buildCompleteDevSnapshot(artifacts));
  snapshot.objects['Deployment/obs-prometheus'].status.observedGeneration = 0;
  const classified = classifyInventory(snapshot, artifacts);
  assert.equal(classified.state, 'not-ready');
  assert.match(classified.detail, /stale-generation/);
});

test('classifyInventory foreign child controller uid refuses', () => {
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const snapshot = cloneSnapshot(buildCompleteDevSnapshot(artifacts));
  snapshot.objects['Pod/obs-prometheus-0'].metadata.ownerReferences[0].uid =
    'foreign-rs-uid';
  const classified = classifyInventory(snapshot, artifacts);
  assert.equal(classified.state, 'foreign');
  assert.match(classified.detail, /foreign-child/);
});

test('classifyInventory extra helm revision refuses', () => {
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const snapshot = cloneSnapshot(buildCompleteDevSnapshot(artifacts));
  snapshot.helmReleases.push({ ...snapshot.helmReleases[0], revision: '2' });
  const classified = classifyInventory(snapshot, artifacts);
  assert.equal(classified.state, 'not-ready');
  assert.match(classified.detail, /extra-helm-revision/);
});

test('classifyInventory terminating resource refuses', () => {
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const snapshot = cloneSnapshot(buildCompleteDevSnapshot(artifacts));
  snapshot.objects['Deployment/obs-grafana'].metadata.deletionTimestamp =
    '2026-01-01T00:00:00Z';
  const classified = classifyInventory(snapshot, artifacts);
  assert.equal(classified.state, 'not-ready');
  assert.equal(classified.detail, 'terminating-resource');
});

test('classifyInventory empty present namespace is not fresh', () => {
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const classified = classifyInventory(
    {
      profileId: 'dev',
      namespace: { absent: false, uid: 'ns' },
      legacy: [],
      objects: {},
      helmReleases: [],
      pending: false,
    },
    artifacts,
  );
  assert.equal(classified.state, 'not-ready');
  assert.match(classified.detail, /empty-namespace/);
});

test('observeObservability standalone cleanup failure forces unreadable', () => {
  const devKind = readKindProfile('dev');
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const result = observeObservability('dev', {
    artifacts,
    verifyArchive: false,
    now: () => 0,
    onIdentityCaptured(identity) {
      identity.cleanup = () => ({ ok: false, error: 'cleanup-failed' });
    },
    run(command, args) {
      const resource = args[args.indexOf('get') + 1];
      if (command === 'kind') {
        return {
          ok: true,
          status: 0,
          stdout: 'offscreen-dev\n',
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (command === 'docker' && args[0] === 'context' && args[1] === 'show') {
        return {
          ok: true,
          status: 0,
          stdout: 'default\n',
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (
        command === 'docker' &&
        args[0] === 'context' &&
        args[1] === 'inspect'
      ) {
        return {
          ok: true,
          status: 0,
          stdout: '"unix:///var/run/docker.sock"\n',
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (command === 'docker' && args[0] === 'inspect') {
        return {
          ok: true,
          status: 0,
          stdout: JSON.stringify([
            {
              Id: 'cp-id',
              State: { Running: true },
              Config: {
                Labels: {
                  'io.x-k8s.kind.cluster': 'offscreen-dev',
                  'io.x-k8s.kind.role': 'control-plane',
                },
              },
              NetworkSettings: {
                Ports: {
                  '6443/tcp': [{ HostIp: '127.0.0.1', HostPort: '24443' }],
                },
              },
            },
          ]),
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (command === 'kubectl' && args.includes('offscreen-dev-system')) {
        return {
          ok: true,
          status: 0,
          stdout: JSON.stringify({
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: {
              name: 'offscreen-dev-system',
              uid: 'baseline-uid',
              labels: { 'offscreen.dev/owner': DEV_CLUSTER_OWNER },
            },
          }),
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (command === 'kubectl' && args.includes('kube-system')) {
        return {
          ok: true,
          status: 0,
          stdout: JSON.stringify({ metadata: { uid: 'kube-system-uid' } }),
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (
        command === 'kubectl' &&
        resource === 'namespace' &&
        args.includes('offscreen-dev-observability')
      ) {
        return {
          ok: true,
          status: 0,
          stdout: args.includes('ignore-not-found')
            ? '\n'
            : JSON.stringify({
                apiVersion: 'v1',
                kind: 'Namespace',
                metadata: { name: 'offscreen-dev-observability', uid: 'ns' },
              }),
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (command === 'kubectl' && args.includes('ignore-not-found')) {
        return {
          ok: true,
          status: 0,
          stdout: '\n',
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (command === 'kubectl' && args.includes('pv')) {
        return {
          ok: true,
          status: 0,
          stdout: '{"items":[]}',
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (command === 'kubectl' && args.includes('current-context')) {
        return {
          ok: true,
          status: 0,
          stdout: `${devKind.contextName}\n`,
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (command === 'kubectl' && args.includes('config')) {
        return {
          ok: true,
          status: 0,
          stdout: JSON.stringify({
            contexts: [
              {
                name: devKind.contextName,
                context: {
                  cluster: 'kind-offscreen-dev',
                  user: 'kind-offscreen-dev',
                },
              },
            ],
            clusters: [
              {
                name: 'kind-offscreen-dev',
                cluster: {
                  server: 'https://127.0.0.1:24443',
                  'certificate-authority-data': 'Y2E=',
                },
              },
            ],
            users: [
              {
                name: 'kind-offscreen-dev',
                user: { 'client-certificate-data': 'Y2VydA==' },
              },
            ],
            'current-context': devKind.contextName,
          }),
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (command === 'helm') {
        return {
          ok: true,
          status: 0,
          stdout: '[]',
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (command === 'kubectl') {
        return {
          ok: true,
          status: 0,
          stdout: '{"items":[]}',
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      return {
        ok: false,
        status: 1,
        stdout: '',
        stderr: 'unexpected',
        timedOut: false,
        missing: false,
      };
    },
  });
  assert.equal(result.state, 'unreadable');
  assert.match(result.detail, /cleanup-failed/);
});
