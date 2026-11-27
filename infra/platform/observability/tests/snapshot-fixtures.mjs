import { isDeepStrictEqual } from 'node:util';
import { parseHelmManifestDocuments } from '../inventory.mjs';
import { GRAFANA_ADMIN_SECRET, EXPECTED_HELM_RELEASES } from '../inventory.mjs';

/**
 * @param {ReturnType<typeof import('../artifacts.mjs').loadArtifacts>} artifacts
 */
function resolveNamespace(artifacts) {
  return (
    artifacts.profile.namespaces.observability ?? 'offscreen-dev-observability'
  );
}

/**
 * @param {string} release
 * @param {string} namespace
 */
function helmMeta(release, namespace) {
  return {
    labels: { 'app.kubernetes.io/managed-by': 'Helm' },
    annotations: {
      'meta.helm.sh/release-name': release,
      'meta.helm.sh/release-namespace': namespace,
    },
  };
}

/**
 * @param {ReturnType<typeof import('../artifacts.mjs').loadArtifacts>['releases'][number]} release
 */
function helmChartRef(release) {
  return `${release.chartName}-${release.chartVersion}`;
}

/**
 * @param {ReturnType<typeof import('../artifacts.mjs').loadArtifacts>['releases'][number]} release
 * @param {number} revision
 * @param {string} status
 */
function helmHistoryRow(release, revision, status) {
  return {
    revision: String(revision),
    status,
    chart: helmChartRef(release),
    appVersion: release.appVersion,
  };
}

/**
 * @param {object} doc
 * @param {string} release
 * @param {string} namespace
 * @param {string} uid
 */
function objectFromDoc(doc, release, namespace, uid) {
  const meta = {
    ...doc.metadata,
    namespace,
    uid,
    generation: 2,
    resourceVersion: '100',
    labels: {
      ...(doc.metadata?.labels ?? {}),
      ...helmMeta(release, namespace).labels,
    },
    annotations: {
      ...(doc.metadata?.annotations ?? {}),
      ...helmMeta(release, namespace).annotations,
    },
  };
  /** @type {Record<string, unknown>} */
  const live = {
    apiVersion: doc.apiVersion,
    kind: doc.kind,
    metadata: meta,
    spec: structuredClone(doc.spec),
    status: undefined,
  };
  if (doc.kind === 'ConfigMap') {
    live.data = structuredClone(doc.data);
    if (doc.binaryData) {
      live.binaryData = structuredClone(doc.binaryData);
    }
  }
  return live;
}

/**
 * @param {ReturnType<typeof import('../artifacts.mjs').loadArtifacts>} artifacts
 * @param {number} collectorRevision
 * @param {{
 *   liveArtifacts?: ReturnType<typeof import('../artifacts.mjs').loadArtifacts>,
 *   collectorManifestArtifacts?: ReturnType<typeof import('../artifacts.mjs').loadArtifacts>,
 *   predecessorArtifacts?: ReturnType<typeof import('../artifacts.mjs').loadArtifacts>,
 * }} [options]
 */
function buildHelmState(artifacts, collectorRevision, options = {}) {
  const NS = resolveNamespace(artifacts);
  const liveArtifacts = options.liveArtifacts ?? artifacts;
  const manifestArtifacts = options.collectorManifestArtifacts ?? liveArtifacts;
  /** @type {Record<string, { revision: string, status: string, chart: string, appVersion: string }[]>} */
  const helmHistory = {};
  /** @type {{ name: string, namespace: string, revision: string, status: string, chart: string, appVersion: string }[]} */
  const helmReleases = [];
  /** @type {Record<string, { revision: string, documents: object[], previousDocuments?: object[] }>} */
  const helmManifests = {};

  for (const release of artifacts.releases) {
    const isCollector = release.role === 'collector';
    const revision = isCollector ? collectorRevision : 1;
    const listStatus = 'deployed';
    helmReleases.push({
      name: release.name,
      namespace: NS,
      revision: String(revision),
      status: listStatus,
      chart: helmChartRef(release),
      appVersion: release.appVersion,
    });
    if (isCollector && revision === 2) {
      helmHistory[release.name] = [
        helmHistoryRow(release, 1, 'superseded'),
        helmHistoryRow(release, 2, 'deployed'),
      ];
    } else {
      helmHistory[release.name] = [
        helmHistoryRow(release, revision, listStatus),
      ];
    }
    const manifestSource = liveArtifacts.releases.find(
      (row) => row.name === release.name,
    );
    const manifestDocs = manifestArtifacts.releases.find(
      (row) => row.name === release.name,
    );
    const entry = {
      revision: String(revision),
      documents: structuredClone(
        manifestDocs?.documents ?? manifestSource?.documents ?? [],
      ),
    };
    if (isCollector && revision === 2 && options.predecessorArtifacts) {
      const base = options.predecessorArtifacts.releases.find(
        (row) => row.role === 'collector',
      );
      entry.previousDocuments = structuredClone(base?.documents ?? []);
    }
    helmManifests[release.name] = entry;
  }

  return { helmReleases, helmHistory, helmManifests };
}

/**
 * @param {ReturnType<typeof import('../artifacts.mjs').loadArtifacts>} artifacts
 * @param {ReturnType<typeof import('../artifacts.mjs').loadArtifacts>} [liveArtifacts]
 */
function documentsForLive(artifacts, liveArtifacts = artifacts) {
  const byRelease = new Map(
    liveArtifacts.releases.map((row) => [row.name, row.documents]),
  );
  const merged = [];
  for (const release of artifacts.releases) {
    const docs = byRelease.get(release.name) ?? release.documents;
    merged.push(...docs);
  }
  return merged;
}

/**
 * @param {ReturnType<typeof import('../artifacts.mjs').loadArtifacts>} artifacts
 * @param {{
 *   liveArtifacts?: ReturnType<typeof import('../artifacts.mjs').loadArtifacts>,
 *   collectorRevision?: number,
 *   collectorManifestArtifacts?: ReturnType<typeof import('../artifacts.mjs').loadArtifacts>,
 *   predecessorArtifacts?: ReturnType<typeof import('../artifacts.mjs').loadArtifacts>,
 * }} [options]
 */
export function buildCompleteDevSnapshot(artifacts, options = {}) {
  const NS = resolveNamespace(artifacts);
  const collectorRevision = options.collectorRevision ?? 1;
  const liveArtifacts = options.liveArtifacts ?? artifacts;
  const liveDocuments = documentsForLive(artifacts, liveArtifacts);
  /** @type {Record<string, object>} */
  const objects = {};
  const expected = artifacts.expectedInventory;
  const docsByKey = new Map();
  for (const doc of liveDocuments) {
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
    const live = objectFromDoc(doc, row[4], NS, uid);
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
      if (!live.spec?.volumeName) {
        live.spec = {
          ...live.spec,
          volumeName: `pv-${row[3]}`,
        };
      }
    }
    objects[key] = live;
  }

  for (const row of expected.generatedClaims ?? []) {
    const key = `${row[1]}/${row[3]}`;
    const uid = `uid-${row[3]}`;
    uids[row[3]] = uid;
    const template = liveArtifacts.releases
      .find((release) => release.name === row[4])
      ?.documents.find(
        (doc) =>
          doc.kind === 'StatefulSet' &&
          Array.isArray(doc.spec?.volumeClaimTemplates),
      )?.spec?.volumeClaimTemplates?.[0];
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
        accessModes: template?.spec?.accessModes ?? ['ReadWriteOnce'],
        storageClassName:
          template?.spec?.storageClassName ?? artifacts.profile.storageClass,
        resources: template?.spec?.resources ?? {
          requests: { storage: '5Gi' },
        },
        volumeMode: template?.spec?.volumeMode ?? 'Filesystem',
        volumeName: `pv-${row[3]}`,
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
    dataKeys: ['admin-password', 'admin-user'],
    hasValues: true,
  };

  const { helmReleases, helmHistory, helmManifests } = buildHelmState(
    artifacts,
    collectorRevision,
    options,
  );

  for (const row of helmReleases) {
    const revision = Number.parseInt(row.revision, 10);
    const secretName = `sh.helm.release.v1.${row.name}.v${revision}`;
    objects[`Secret/${secretName}`] = {
      kind: 'Secret',
      metadata: {
        name: secretName,
        namespace: NS,
        uid: `uid-helm-${row.name}-v${revision}`,
        labels: {
          owner: 'helm',
          name: row.name,
          status: row.status,
          version: row.revision,
        },
      },
      type: 'helm.sh/release.v1',
      dataKeys: ['release'],
      hasValues: true,
    };
  }

  for (const release of liveArtifacts.releases) {
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
            {
              apiVersion: 'apps/v1',
              kind: 'Deployment',
              name: workloadName,
              uid: workloadUid,
              controller: true,
            },
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
        labels: structuredClone(
          workload.spec?.template?.metadata?.labels ?? {},
        ),
        ownerReferences: [
          {
            apiVersion: podOwnerKind === 'ReplicaSet' ? 'apps/v1' : 'apps/v1',
            kind: podOwnerKind,
            name: podOwnerName,
            uid: podOwner.metadata.uid,
            controller: true,
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

  const persistentVolumes = (expected.generatedClaims ?? [])
    .concat(expected.direct.filter((row) => row[1] === 'PersistentVolumeClaim'))
    .map((row) => {
      const claimName = row[3];
      return {
        metadata: { name: `pv-${claimName}`, uid: `uid-pv-${claimName}` },
        spec: {
          claimRef: {
            name: claimName,
            namespace: NS,
            uid: uids[claimName],
          },
        },
        status: { phase: 'Bound' },
      };
    });

  return {
    profileId: artifacts.profile.id,
    namespace: {
      absent: false,
      uid: uids.namespace,
      object: {
        metadata: {
          name: NS,
          uid: uids.namespace,
          labels: {
            [artifacts.profile.ownerLabel]: artifacts.profile.ownerValue,
          },
        },
      },
    },
    namespaceUid: uids.namespace,
    claimUids: uids,
    objects,
    helmReleases,
    helmHistory,
    helmManifests,
    persistentVolumes,
    legacy: [],
    pending: false,
    pendingValid: true,
  };
}

/**
 * @param {ReturnType<typeof import('../artifacts.mjs').loadArtifacts>} desired
 * @param {ReturnType<typeof import('../artifacts.mjs').loadArtifacts>} predecessor
 */
export function buildPredecessorDevSnapshot(desired, predecessor) {
  return buildCompleteDevSnapshot(desired, {
    liveArtifacts: predecessor,
    collectorManifestArtifacts: predecessor,
    predecessorArtifacts: predecessor,
  });
}

/**
 * @param {ReturnType<typeof import('../artifacts.mjs').loadArtifacts>} desired
 * @param {ReturnType<typeof import('../artifacts.mjs').loadArtifacts>} predecessor
 */
export function buildUpgradedDevSnapshot(desired, predecessor) {
  return buildCompleteDevSnapshot(desired, {
    collectorRevision: 2,
    predecessorArtifacts: predecessor,
    collectorManifestArtifacts: desired,
  });
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

/**
 * @param {ReturnType<typeof import('../artifacts.mjs').loadArtifacts>} artifacts
 */
export function buildCompleteReleaseSnapshot(artifacts) {
  return buildCompleteDevSnapshot(artifacts);
}

/**
 * @param {string} manifest
 * @param {string} namespace
 */
export function parseFixtureManifestDocuments(manifest, namespace) {
  return parseHelmManifestDocuments(manifest, namespace);
}
