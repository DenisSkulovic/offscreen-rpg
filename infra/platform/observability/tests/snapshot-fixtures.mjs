import { isDeepStrictEqual } from 'node:util';
import { GRAFANA_ADMIN_SECRET } from '../inventory.mjs';
import { EXPECTED_HELM_RELEASES } from '../inventory.mjs';

const NS = 'offscreen-dev-observability';

/**
 * @param {string} release
 */
function helmMeta(release) {
  return {
    labels: { 'app.kubernetes.io/managed-by': 'Helm' },
    annotations: {
      'meta.helm.sh/release-name': release,
      'meta.helm.sh/release-namespace': NS,
    },
  };
}

/**
 * @param {object} doc
 * @param {string} release
 * @param {string} uid
 */
function objectFromDoc(doc, release, uid) {
  const meta = {
    ...doc.metadata,
    namespace: NS,
    uid,
    generation: 2,
    resourceVersion: '100',
    ...helmMeta(release),
  };
  return {
    apiVersion: doc.apiVersion,
    kind: doc.kind,
    metadata: meta,
    spec: structuredClone(doc.spec),
    status: undefined,
  };
}

/**
 * @param {ReturnType<typeof import('../artifacts.mjs').loadArtifacts>} artifacts
 */
export function buildCompleteDevSnapshot(artifacts) {
  /** @type {Record<string, object>} */
  const objects = {};
  const expected = artifacts.expectedInventory;
  const docsByKey = new Map();
  for (const doc of artifacts.documents) {
    docsByKey.set(`${doc.kind}/${doc.metadata?.name}`, doc);
  }

  /** @type {Record<string, string>} */
  const uids = { namespace: 'uid-target-namespace' };

  for (const row of expected.direct) {
    const key = `${row[1]}/${row[3]}`;
    const doc = docsByKey.get(key);
    if (!doc) {
      throw new Error(`fixture missing document ${key}`);
    }
    const uid = `uid-${row[3]}`;
    uids[row[3]] = uid;
    const live = objectFromDoc(doc, row[4], uid);
    if (live.kind === 'Deployment' || live.kind === 'StatefulSet') {
      live.status = {
        observedGeneration: live.metadata.generation,
        replicas: live.spec?.replicas ?? 1,
        readyReplicas: live.spec?.replicas ?? 1,
        availableReplicas: live.spec?.replicas ?? 1,
        updatedReplicas: live.spec?.replicas ?? 1,
        currentReplicas: live.spec?.replicas ?? 1,
      };
    }
    if (live.kind === 'PersistentVolumeClaim') {
      live.status = { phase: 'Bound' };
    }
    objects[key] = {
      ...live,
      metadata: { ...live.metadata },
    };
  }

  for (const row of expected.generatedClaims) {
    const key = `${row[1]}/${row[3]}`;
    const uid = `uid-${row[3]}`;
    uids[row[3]] = uid;
    objects[key] = {
      apiVersion: row[0],
      kind: row[1],
      metadata: {
        name: row[3],
        namespace: NS,
        uid,
        generation: 1,
      },
      spec: {
        accessModes: ['ReadWriteOnce'],
        storageClassName: artifacts.profile.storageClass,
        resources: {
          requests: { storage: row[3].includes('loki') ? '5Gi' : '2Gi' },
        },
        volumeMode: 'Filesystem',
      },
      status: { phase: 'Bound' },
    };
  }

  objects[`Secret/${GRAFANA_ADMIN_SECRET}`] = {
    kind: 'Secret',
    metadata: {
      name: GRAFANA_ADMIN_SECRET,
      namespace: NS,
      uid: 'uid-grafana-admin',
    },
    type: 'Opaque',
    dataKeys: ['admin-user', 'admin-password'],
    hasValues: true,
  };

  for (const release of EXPECTED_HELM_RELEASES) {
    const secretName = `sh.helm.release.v1.${release}.v1`;
    objects[`Secret/${secretName}`] = {
      kind: 'Secret',
      metadata: {
        name: secretName,
        namespace: NS,
        uid: `uid-helm-${release}`,
        labels: {
          owner: 'helm',
          name: release,
          status: 'deployed',
          version: '1',
        },
      },
      type: 'helm.sh/release.v1',
      dataKeys: ['release'],
      hasValues: true,
    };
  }

  const helmReleases = EXPECTED_HELM_RELEASES.map((name) => ({
    name,
    namespace: NS,
    status: 'deployed',
    revision: '1',
    chart: `chart-${name}`,
    app_version: '1.0.0',
  }));

  for (const release of artifacts.releases) {
    const role = release.role;
    const expectedImage = release.expectedImage;
    const kind =
      role === 'loki' || role === 'tempo' ? 'StatefulSet' : 'Deployment';
    const workloadName = `obs-${role === 'collector' ? 'collector' : role}`;
    const workloadUid = uids[workloadName];
    const workload = objects[`${kind}/${workloadName}`];
    if (!workload) {
      continue;
    }

    /** @type {object | null} */
    let podOwner = null;
    let podOwnerKind = 'StatefulSet';
    let podOwnerName = workloadName;

    if (kind === 'Deployment') {
      const rsName = `${workloadName}-rs`;
      const rsUid = `uid-${rsName}`;
      uids[rsName] = rsUid;
      objects[`ReplicaSet/${rsName}`] = {
        kind: 'ReplicaSet',
        metadata: {
          name: rsName,
          namespace: NS,
          uid: rsUid,
          ownerReferences: [
            { kind: 'Deployment', name: workloadName, uid: workloadUid },
          ],
        },
        spec: { replicas: 1, template: workload.spec.template },
        status: { observedGeneration: 2, readyReplicas: 1, replicas: 1 },
      };
      podOwner = objects[`ReplicaSet/${rsName}`];
      podOwnerKind = 'ReplicaSet';
      podOwnerName = rsName;
    } else {
      podOwner = workload;
    }

    const podName = `${workloadName}-0`;
    const podUid = `uid-pod-${workloadName}`;
    objects[`Pod/${podName}`] = {
      kind: 'Pod',
      metadata: {
        name: podName,
        namespace: NS,
        uid: podUid,
        ownerReferences: [
          {
            kind: podOwnerKind,
            name: podOwnerName,
            uid: podOwner.metadata.uid,
          },
        ],
      },
      spec: structuredClone(workload.spec.template.spec),
      status: {
        phase: 'Running',
        containerStatuses: [
          {
            name: expectedImage.containerName,
            ready: true,
            state: { running: { startedAt: '2026-01-01T00:00:00Z' } },
            imageID: expectedImage.canonicalReference,
          },
        ],
      },
    };
  }

  const persistentVolumes = [
    {
      metadata: { name: 'pv-obs-prometheus' },
      spec: {
        claimRef: {
          name: 'obs-prometheus',
          namespace: NS,
          uid: uids['obs-prometheus'],
        },
      },
    },
    {
      metadata: { name: 'pv-storage-obs-loki-0' },
      spec: {
        claimRef: {
          name: 'storage-obs-loki-0',
          namespace: NS,
          uid: uids['storage-obs-loki-0'],
        },
      },
    },
    {
      metadata: { name: 'pv-storage-obs-tempo-0' },
      spec: {
        claimRef: {
          name: 'storage-obs-tempo-0',
          namespace: NS,
          uid: uids['storage-obs-tempo-0'],
        },
      },
    },
  ];

  return {
    profileId: 'dev',
    namespace: { absent: false, uid: uids.namespace },
    namespaceUid: uids.namespace,
    claimUids: uids,
    objects,
    helmReleases,
    helmManifests: {},
    persistentVolumes,
    legacy: [],
    pending: false,
  };
}

/**
 * @param {ReturnType<typeof buildCompleteDevSnapshot>} base
 */
export function cloneSnapshot(base) {
  return structuredClone(base);
}

/**
 * @param {ReturnType<typeof buildCompleteDevSnapshot>} snapshot
 * @param {ReturnType<typeof import('../artifacts.mjs').loadArtifacts>} artifacts
 */
export function expectHeadlessSpec(snapshot, artifacts, serviceName) {
  const live = snapshot.objects[`Service/${serviceName}`];
  const expected = artifacts.documents.find(
    (doc) => doc.kind === 'Service' && doc.metadata?.name === serviceName,
  );
  return (
    live?.spec?.clusterIP === 'None' &&
    isDeepStrictEqual(live?.spec?.selector, expected?.spec?.selector) &&
    isDeepStrictEqual(live?.spec?.ports, expected?.spec?.ports)
  );
}
