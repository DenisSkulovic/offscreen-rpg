import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { runPlatformCommand } from '../common/commands.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import {
  captureIdentity,
  recheckIdentity,
  INVENTORY_BUDGET_MS,
  OBSERVABILITY_ARTIFACT_BUDGET_MS,
  OBSERVABILITY_OBSERVATION_WORKER_MS,
  PREFLIGHT_BUDGET_MS,
} from './identity.mjs';
import {
  GRAFANA_ADMIN_REQUIRED_KEYS,
  GRAFANA_ADMIN_SECRET,
  collectInventory,
  EXPECTED_HELM_RELEASES,
  HELM_RELEASE_PREFIX,
  CLUSTER_RBAC_KINDS,
  scopedObjectKey,
  assessClusterBindingOwnership,
  findAbsentNamespaceRbacCollisions,
} from './inventory.mjs';
import {
  ARTIFACT_HISTORY_ROWS,
  E2_INTERMEDIATE_ROWS,
  HISTORY_ROLES,
  lookupArtifactHistoryRow,
  lookupE2IntermediateRow,
} from './artifact-history.mjs';
import { readPending } from './custody.mjs';
import {
  loadArtifacts,
  loadObservabilityVariants,
  loadOperationalArtifactSet,
} from './artifacts.mjs';
import { readDevKubeletTrust } from './kubelet-trust.mjs';
import { isValidPhasePrefix } from './receipt.mjs';

const IGNORED_OBJECT_KEYS = new Set([
  'Event',
  'ServiceAccount/default',
  'ConfigMap/kube-root-ca.crt',
]);

const HEADLESS_SERVICES = Object.freeze([
  'obs-loki-headless',
  'obs-tempo-headless',
]);

const LEGACY_ORPHAN_LABELS = Object.freeze([
  { key: 'app.kubernetes.io/name', value: 'otel-collector' },
  { key: 'app', value: 'otel-collector' },
  { key: 'app', value: 'hop-a' },
  { key: 'app', value: 'hop-b' },
]);

/**
 * @param {string} reference
 */
export function parseImageReference(reference) {
  const digestIndex = reference.indexOf('@sha256:');
  if (digestIndex < 1) {
    return { ok: false, reason: 'tag-only-or-missing-digest' };
  }
  const repository = reference.slice(0, digestIndex);
  const hex = reference.slice(digestIndex + '@sha256:'.length);
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    return { ok: false, reason: 'digest-malformed' };
  }
  return {
    ok: true,
    repository,
    digest: `sha256:${hex}`,
    canonicalReference: reference,
  };
}

/**
 * @param {object | undefined} podSpec
 * @param {{ containerName: string, renderedReference: string, canonicalReference: string }} expected
 */
export function verifyPodSpecImageIdentity(podSpec, expected) {
  if (!podSpec) {
    return { ok: false, reason: 'missing-pod-spec' };
  }
  const init = podSpec.initContainers ?? [];
  const ephemeral = podSpec.ephemeralContainers ?? [];
  if (init.length > 0 || ephemeral.length > 0) {
    return { ok: false, reason: 'extra-init-or-ephemeral' };
  }
  const containers = podSpec.containers ?? [];
  if (containers.length !== 1) {
    return { ok: false, reason: 'container-count' };
  }
  const container = containers[0];
  if (container?.name !== expected.containerName) {
    return { ok: false, reason: 'container-name' };
  }
  const image = container?.image;
  if (image !== expected.renderedReference) {
    return { ok: false, reason: 'spec-image' };
  }
  return { ok: true };
}

/**
 * @param {object | undefined} status
 * @param {string} containerName
 * @param {string} canonicalReference
 */
export function verifyContainerRuntimeIdentity(
  status,
  containerName,
  canonicalReference,
) {
  const expected = parseImageReference(canonicalReference);
  if (!expected.ok) {
    return { ok: false, reason: 'expected-image-invalid' };
  }
  const statuses = status?.containerStatuses;
  if (!Array.isArray(statuses) || statuses.length !== 1) {
    return { ok: false, reason: 'status-count' };
  }
  const entry = statuses[0];
  if (entry?.name !== containerName) {
    return { ok: false, reason: 'status-name' };
  }
  if (entry.ready !== true || entry.state?.running == null) {
    return { ok: false, reason: 'not-running-ready' };
  }
  const imageId = entry.imageID ?? '';
  if (typeof imageId !== 'string' || imageId.length === 0) {
    return { ok: false, reason: 'missing-image-id' };
  }
  // ContainerStatus.image is runtime metadata, not identity evidence (B07).
  // Only imageID must equal the pinned canonical repository and digest.
  const at = imageId.indexOf('@sha256:');
  if (at < 1) {
    return { ok: false, reason: 'bare-config-digest' };
  }
  const repo = imageId.slice(0, at);
  const hex = imageId.slice(at + '@sha256:'.length);
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    return { ok: false, reason: 'runtime-digest-malformed' };
  }
  if (repo !== expected.repository) {
    return { ok: false, reason: 'wrong-repository' };
  }
  const digest = `sha256:${hex}`;
  if (digest !== expected.digest) {
    return { ok: false, reason: 'child-or-wrong-digest' };
  }
  const canonical = `${repo}@${digest}`;
  if (canonical !== canonicalReference) {
    return { ok: false, reason: 'canonical-mismatch' };
  }
  return { ok: true };
}

/**
 * @param {object} workload
 * @param {{ containerName: string, renderedReference: string, canonicalReference: string }} expected
 */
export function verifyWorkloadImageIdentity(workload, expected) {
  const podSpec =
    workload.kind === 'StatefulSet'
      ? workload.spec?.template?.spec
      : workload.spec?.template?.spec;
  const specCheck = verifyPodSpecImageIdentity(podSpec, expected);
  if (!specCheck.ok) {
    return specCheck;
  }
  return { ok: true };
}

/**
 * @param {[string, string, string, string, string]} row
 */
function inventoryRowKey(row) {
  return `${row[0]}|${row[1]}|${row[2]}|${row[3]}`;
}

/**
 * @param {object | undefined} meta
 */
function isTerminating(meta) {
  return meta?.deletionTimestamp != null;
}

/**
 * @param {object | undefined} object
 * @param {string} release
 */
function hasHelmOwnership(object, release) {
  const labels = object?.metadata?.labels ?? {};
  const annotations = object?.metadata?.annotations ?? {};
  return (
    labels['app.kubernetes.io/managed-by'] === 'Helm' &&
    annotations['meta.helm.sh/release-name'] === release &&
    typeof annotations['meta.helm.sh/release-namespace'] === 'string'
  );
}

/**
 * @param {object | undefined} deployment
 */
function deploymentRolloutReady(deployment) {
  const generation = deployment?.metadata?.generation;
  const observed = deployment?.status?.observedGeneration;
  if (
    generation == null ||
    observed == null ||
    Number(observed) < Number(generation)
  ) {
    return false;
  }
  if (deployment?.spec?.replicas !== 1) {
    return false;
  }
  const status = deployment?.status ?? {};
  return (
    status.updatedReplicas === 1 &&
    status.readyReplicas === 1 &&
    status.availableReplicas === 1
  );
}

/**
 * @param {object | undefined} statefulSet
 */
function statefulSetRolloutReady(statefulSet) {
  const generation = statefulSet?.metadata?.generation;
  const observed = statefulSet?.status?.observedGeneration;
  if (
    generation == null ||
    observed == null ||
    Number(observed) < Number(generation)
  ) {
    return false;
  }
  const replicas = statefulSet?.spec?.replicas ?? 0;
  const status = statefulSet?.status ?? {};
  return (
    status.readyReplicas === replicas &&
    status.currentReplicas === replicas &&
    replicas >= 1
  );
}

/**
 * @param {object | undefined} service
 * @param {boolean} expectHeadless
 */
function servicePortsWithDefaults(ports) {
  return Array.isArray(ports)
    ? ports.map((port) => ({ protocol: 'TCP', ...port }))
    : ports;
}

/**
 * @param {object | undefined} live
 * @param {object | undefined} expected
 */
function serviceSpecCompatible(live, expected) {
  if (live?.spec?.clusterIP !== expected?.spec?.clusterIP) {
    return false;
  }
  if (live?.spec?.type !== expected?.spec?.type) {
    return false;
  }
  if (!isDeepStrictEqual(live?.spec?.selector, expected?.spec?.selector)) {
    return false;
  }
  return isDeepStrictEqual(
    servicePortsWithDefaults(live?.spec?.ports),
    servicePortsWithDefaults(expected?.spec?.ports),
  );
}

/**
 * @param {object} snapshot
 * @param {ReturnType<typeof loadArtifacts>} artifacts
 */
function readExpectedInventory(artifacts) {
  const profileId = artifacts.profile?.id;
  if (
    artifacts.expectedInventory?.direct &&
    Array.isArray(artifacts.expectedInventory.direct)
  ) {
    return artifacts.expectedInventory;
  }
  return profileId ? artifacts.expectedInventory?.[profileId] : null;
}

/**
 * @param {object} doc
 */
function documentIdentity(doc) {
  return `${doc.apiVersion}|${doc.kind}|${doc.metadata?.namespace ?? ''}|${doc.metadata?.name}`;
}

/**
 * @param {object[]} left
 * @param {object[]} right
 */
function collectorDocumentsEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }
  const rightById = new Map(right.map((doc) => [documentIdentity(doc), doc]));
  for (const doc of left) {
    const peer = rightById.get(documentIdentity(doc));
    if (!peer || !isDeepStrictEqual(doc, peer)) {
      return false;
    }
  }
  return true;
}

/**
 * @param {object[]} documents
 */
function manifestIdentitySet(documents) {
  return new Set(documents.map((doc) => documentIdentity(doc)));
}

/**
 * @param {object | undefined} snapshot
 */
function pendingAdmitsPublicReadyOrAbsent(snapshot) {
  return snapshot?.pending === false && snapshot?.pendingValid === true;
}

/**
 * @param {object | undefined} snapshot
 */
function pendingBlocksPublicReady(snapshot) {
  if (snapshot?.pending === true) {
    return true;
  }
  if (snapshot?.pendingValid === false) {
    return true;
  }
  if (snapshot?.pendingValid !== true) {
    return true;
  }
  return false;
}

/**
 * @param {ReturnType<typeof loadArtifacts>['releases'][number]} release
 */
function expectedHelmChartRef(release) {
  return `${release.chartName}-${release.chartVersion}`;
}

/**
 * @param {object} snapshot
 * @param {ReturnType<typeof loadArtifacts>} artifacts
 */
/**
 * Dev collector revision 2 keeps the superseded revision-1 Secret beside the deployed revision.
 *
 * @param {object} snapshot
 * @param {ReturnType<typeof loadArtifacts>} artifacts
 */
function upgradedDevCollectorRetention(snapshot, artifacts) {
  if (artifacts.profile?.id !== 'dev') {
    return { mode: 'none' };
  }
  const release = (snapshot.helmReleases ?? []).find((row) => row.name === 'obs-collector');
  if (String(release?.revision) !== '2' || release?.status !== 'deployed') {
    return { mode: 'none' };
  }
  const history = snapshot.helmHistory?.['obs-collector'];
  if (
    !Array.isArray(history) ||
    history.length !== 2 ||
    String(history[0]?.revision) !== '1' ||
    history[0]?.status !== 'superseded' ||
    String(history[1]?.revision) !== '2' ||
    history[1]?.status !== 'deployed'
  ) {
    return { mode: 'reject', detail: 'helm-storage-history' };
  }
  return {
    mode: 'retain',
    retained: 'sh.helm.release.v1.obs-collector.v1',
    deployed: 'sh.helm.release.v1.obs-collector.v2',
  };
}

/**
 * @param {object} object
 * @param {string | undefined} namespace
 * @param {string} releaseName
 * @param {string} revision
 * @param {string} status
 */
function helmStorageMetadataMatches(object, namespace, releaseName, revision, status) {
  const labels = object.metadata?.labels ?? {};
  return (
    object.metadata?.namespace === namespace &&
    typeof object.metadata?.uid === 'string' &&
    !isTerminating(object.metadata) &&
    object.type === 'helm.sh/release.v1' &&
    (object.dataKeys ?? []).includes('release') &&
    labels.owner === 'helm' &&
    labels.name === releaseName &&
    String(labels.version) === revision &&
    labels.status === status
  );
}

function verifyHelmStorageBijection(snapshot, artifacts) {
  const namespace = artifacts.profile?.namespaces?.observability;
  const retention = upgradedDevCollectorRetention(snapshot, artifacts);
  if (retention.mode === 'reject') {
    return { ok: false, detail: retention.detail };
  }
  const expected = new Map();
  for (const row of snapshot.helmReleases ?? []) {
    const revision = Number.parseInt(String(row.revision), 10);
    if (!Number.isFinite(revision) || revision < 1) {
      return { ok: false, detail: 'helm-storage-revision' };
    }
    expected.set(row.name, `sh.helm.release.v1.${row.name}.v${revision}`);
  }
  if (retention.mode === 'retain') {
    expected.set('obs-collector-retained', retention.retained);
  }
  const observed = new Set();
  for (const object of Object.values(snapshot.objects ?? {})) {
    if (object.kind !== 'Secret') {
      continue;
    }
    const name = object.metadata?.name ?? '';
    const isCandidate =
      name.startsWith('sh.helm.release.v1.') ||
      object.type === 'helm.sh/release.v1' ||
      object.metadata?.labels?.owner === 'helm';
    if (!isCandidate) {
      continue;
    }
    if (object.metadata?.namespace !== namespace) {
      return { ok: false, detail: 'helm-storage-namespace' };
    }
    if (isTerminating(object.metadata)) {
      return { ok: false, detail: 'helm-storage-terminating' };
    }
    if (!(object.dataKeys ?? []).includes('release')) {
      return { ok: false, detail: 'helm-storage-data-keys' };
    }
    if (retention.mode === 'retain' && name === retention.retained) {
      if (!helmStorageMetadataMatches(object, namespace, 'obs-collector', '1', 'superseded')) {
        return { ok: false, detail: 'helm-storage-metadata' };
      }
    }
    if (retention.mode === 'retain' && name === retention.deployed) {
      if (!helmStorageMetadataMatches(object, namespace, 'obs-collector', '2', 'deployed')) {
        return { ok: false, detail: 'helm-storage-metadata' };
      }
    }
    observed.add(name);
  }
  for (const [release, secretName] of expected) {
    if (!observed.has(secretName)) {
      return { ok: false, detail: `helm-storage-missing-${release}` };
    }
  }
  for (const name of observed) {
    if (![...expected.values()].includes(name)) {
      return { ok: false, detail: 'helm-storage-extra' };
    }
  }
  return { ok: true };
}

/**
 * @param {object} snapshot
 * @param {ReturnType<typeof loadArtifacts>} artifacts
 * @param {{ collectorVariant?: 'desired' | 'predecessor' | 'upgraded', predecessorArtifacts?: ReturnType<typeof loadArtifacts> | null }} [variant]
 */
function verifyHelmRevisionMatrix(snapshot, artifacts, variant = {}) {
  const collectorVariant = variant.collectorVariant ?? 'desired';
  const predecessorArtifacts = variant.predecessorArtifacts ?? null;
  const releases = snapshot.helmReleases ?? [];
  const history = snapshot.helmHistory ?? {};
  const manifests = snapshot.helmManifests ?? {};
  const seen = new Set();
  for (const row of releases) {
    if (seen.has(row.name)) {
      return { ok: false, detail: 'extra-helm-revision' };
    }
    seen.add(row.name);
  }
  if (releases.length !== EXPECTED_HELM_RELEASES.length) {
    return { ok: false, detail: 'helm-release-count' };
  }
  for (const row of releases) {
    const descriptor = artifacts.releases.find(
      (entry) => entry.name === row.name,
    );
    if (!descriptor) {
      return { ok: false, detail: `helm-unknown-release-${row.name}` };
    }
    if (row.status !== 'deployed') {
      return { ok: false, detail: `helm-status-${row.name}` };
    }
    const expectedChart = expectedHelmChartRef(descriptor);
    if (
      row.chart !== expectedChart ||
      row.appVersion !== descriptor.appVersion
    ) {
      return { ok: false, detail: `helm-pin-${row.name}` };
    }
    const rows = history[row.name];
    if (!Array.isArray(rows) || rows.length === 0) {
      return { ok: false, detail: `helm-history-missing-${row.name}` };
    }
    const latestHistory = rows[rows.length - 1];
    if (
      String(latestHistory.revision) !== String(row.revision) ||
      latestHistory.status !== row.status ||
      latestHistory.chart !== row.chart ||
      latestHistory.appVersion !== row.appVersion
    ) {
      return { ok: false, detail: `helm-history-list-mismatch-${row.name}` };
    }
    for (const entry of rows) {
      if (!['deployed', 'superseded'].includes(entry.status)) {
        return { ok: false, detail: `helm-history-status-${row.name}` };
      }
      if (
        entry.chart !== expectedChart ||
        entry.appVersion !== descriptor.appVersion
      ) {
        return { ok: false, detail: `helm-history-pin-${row.name}` };
      }
    }
    const manifest = manifests[row.name];
    if (!manifest || !Array.isArray(manifest.documents)) {
      return { ok: false, detail: `helm-manifest-missing-${row.name}` };
    }
    if (String(manifest.revision) !== String(row.revision)) {
      return { ok: false, detail: `helm-manifest-revision-${row.name}` };
    }

    const role = descriptor.role;
    if (role === 'collector') {
      const revision = Number.parseInt(String(row.revision), 10);
      const collectorDescriptor =
        collectorVariant === 'predecessor'
          ? artifacts.releases.find((entry) => entry.role === 'collector')
          : descriptor;
      const expectedDocs = collectorDescriptor?.documents ?? [];
      if (!collectorDocumentsEqual(manifest.documents, expectedDocs)) {
        return { ok: false, detail: 'collector-manifest' };
      }
      if (revision === 2) {
        if (!Array.isArray(manifest.previousDocuments)) {
          return { ok: false, detail: 'collector-previous-manifest' };
        }
        const base =
          predecessorArtifacts?.releases.find(
            (entry) => entry.role === 'collector',
          ) ?? artifacts.releases.find((entry) => entry.role === 'collector');
        if (!base) {
          return { ok: false, detail: 'collector-base-missing' };
        }
        if (
          !collectorDocumentsEqual(manifest.previousDocuments, base.documents)
        ) {
          return { ok: false, detail: 'collector-previous-manifest' };
        }
        if (rows.length !== 2 || rows[0].status !== 'superseded') {
          return { ok: false, detail: 'collector-history-shape' };
        }
      } else if (rows.length !== 1) {
        return { ok: false, detail: `helm-history-length-${row.name}` };
      }
    } else if (
      !isDeepStrictEqual(
        manifestIdentitySet(manifest.documents),
        manifestIdentitySet(descriptor.documents),
      )
    ) {
      return { ok: false, detail: `manifest-identity-${row.name}` };
    }
  }
  return { ok: true };
}

function assessDirectInventory(snapshot, artifacts) {
  const expected = readExpectedInventory(artifacts);
  if (!expected) {
    return {
      ok: false,
      state: 'unreadable',
      reasonCode: 'unreadable',
      detail: 'missing-expected-inventory',
    };
  }
  const generatedNames = new Set(expected.generatedClaims.map((row) => row[3]));
  for (const row of [...expected.direct, ...expected.generatedClaims]) {
    const key = objectKeyFromRow(row);
    const live = snapshot.objects?.[key];
    if (!live) {
      return {
        ok: false,
        state: 'not-ready',
        reasonCode: 'not-ready',
        detail: `missing-${row[3]}`,
      };
    }
    if (isTerminating(live.metadata)) {
      return {
        ok: false,
        state: 'not-ready',
        reasonCode: 'not-ready',
        detail: 'terminating-resource',
      };
    }
    const release = row[4];
    const directKinds = new Set([
      'Deployment',
      'StatefulSet',
      'ConfigMap',
      'Service',
      'PersistentVolumeClaim',
      'ServiceAccount',
    ]);
    if (
      directKinds.has(row[1]) &&
      row[3] !== GRAFANA_ADMIN_SECRET &&
      !generatedNames.has(row[3])
    ) {
      if (!hasHelmOwnership(live, release)) {
        return {
          ok: false,
          state: 'foreign',
          reasonCode: 'foreign',
          detail: `helm-ownership-${row[3]}`,
        };
      }
    }
  }
  return { ok: true };
}

/**
 * @param {Record<string, object>} objects
 * @param {object[]} persistentVolumes
 */
function verifyPersistentVolumeClaims(objects, persistentVolumes) {
  const required = [
    'obs-prometheus',
    'storage-obs-loki-0',
    'storage-obs-tempo-0',
  ];
  for (const claimName of required) {
    const pvc = objects[`PersistentVolumeClaim/${claimName}`];
    if (!pvc || pvc.status?.phase !== 'Bound') {
      return { ok: false, detail: `pvc-bound-${claimName}` };
    }
    const pvcUid = pvc.metadata?.uid;
    if (typeof pvcUid !== 'string' || pvcUid.length === 0) {
      return { ok: false, detail: `pvc-uid-${claimName}` };
    }
    const boundPv = persistentVolumes.find(
      (pv) =>
        pv?.spec?.claimRef?.name === claimName &&
        pv?.spec?.claimRef?.namespace === pvc.metadata?.namespace,
    );
    if (!boundPv) {
      return { ok: false, detail: `pv-missing-${claimName}` };
    }
    if (boundPv.spec?.claimRef?.uid !== pvcUid) {
      return { ok: false, detail: `pv-claimref-${claimName}` };
    }
  }
  return { ok: true };
}

/**
 * @param {Record<string, object>} objects
 */
function verifyControllerChains(objects) {
  for (const object of Object.values(objects)) {
    if (object.kind !== 'Pod') {
      continue;
    }
    const owner = object.metadata?.ownerReferences?.[0];
    if (!owner) {
      return { ok: false, detail: 'pod-missing-owner' };
    }
    const parent = objects[`${owner.kind}/${owner.name}`];
    if (!parent) {
      return { ok: false, detail: `orphan-${owner.kind}-${owner.name}` };
    }
    if (owner.uid != null && parent.metadata?.uid !== owner.uid) {
      return { ok: false, detail: `foreign-child-${object.metadata?.name}` };
    }
    if (owner.kind === 'ReplicaSet') {
      const deployOwner = parent.metadata?.ownerReferences?.[0];
      const deploy = deployOwner
        ? objects[`Deployment/${deployOwner.name}`]
        : null;
      if (!deploy || deployOwner.uid !== deploy.metadata?.uid) {
        return { ok: false, detail: 'dangling-replicaset' };
      }
    }
  }
  return { ok: true };
}

/**
 * @param {Record<string, object>} objects
 */
function detectLegacyOrphanControllers(objects) {
  for (const object of Object.values(objects)) {
    if (!['Pod', 'ReplicaSet'].includes(object.kind)) {
      continue;
    }
    const labels = object.metadata?.labels ?? {};
    for (const rule of LEGACY_ORPHAN_LABELS) {
      if (labels[rule.key] === rule.value) {
        return { ok: false, detail: `legacy-orphan-${object.metadata?.name}` };
      }
    }
    const name = object.metadata?.name ?? '';
    if (
      /^(hop-a|hop-b|otel-collector)/.test(name) &&
      !objects['Deployment/otel-collector']
    ) {
      return { ok: false, detail: `legacy-orphan-${name}` };
    }
  }
  return { ok: true };
}

/**
 * @param {[string, string, string, string, string]} row
 */
function objectKeyFromRow(row) {
  return `${row[1]}/${row[3]}`;
}

/**
 * @param {Record<string, object>} objects
 * @param {ReturnType<typeof loadArtifacts>['releases']} releases
 */
function verifyWorkloadImages(objects, releases) {
  for (const release of releases) {
    const role = release.role;
    const expectedImage = release.expectedImage;
    const kind =
      role === 'loki' || role === 'tempo' ? 'StatefulSet' : 'Deployment';
    const name = `obs-${role === 'collector' ? 'collector' : role}`;
    const live = objects[`${kind}/${name}`];
    if (!live) {
      return { ok: false, detail: `missing-workload-${name}` };
    }
    const imageCheck = verifyWorkloadImageIdentity(live, expectedImage);
    if (!imageCheck.ok) {
      return { ok: false, detail: `${name}-${imageCheck.reason}` };
    }
    if (kind === 'Deployment' && !deploymentRolloutReady(live)) {
      return { ok: false, detail: `${name}-stale-generation` };
    }
    if (kind === 'StatefulSet' && !statefulSetRolloutReady(live)) {
      return { ok: false, detail: `${name}-stale-generation` };
    }
    const pods = Object.values(objects).filter(
      (object) =>
        object.kind === 'Pod' &&
        object.metadata?.ownerReferences?.some(
          (ref) =>
            (ref.kind === 'ReplicaSet' || ref.kind === 'StatefulSet') &&
            objects[`${ref.kind}/${ref.name}`] != null,
        ),
    );
    const related = pods.filter((pod) => {
      const owner = pod.metadata?.ownerReferences?.[0];
      if (!owner) return false;
      const parent = objects[`${owner.kind}/${owner.name}`];
      if (!parent) return false;
      return (
        parent.metadata?.ownerReferences?.some(
          (ref) => ref.kind === kind && ref.name === name,
        ) ||
        (owner.kind === 'StatefulSet' && owner.name === name)
      );
    });
    if (related.length < 1) {
      return { ok: false, detail: `${name}-missing-pod` };
    }
    for (const pod of related) {
      const podSpecCheck = verifyPodSpecImageIdentity(pod.spec, expectedImage);
      if (!podSpecCheck.ok) {
        return { ok: false, detail: `${name}-pod-${podSpecCheck.reason}` };
      }
      const runtimeCheck = verifyContainerRuntimeIdentity(
        pod.status,
        expectedImage.containerName,
        expectedImage.canonicalReference,
      );
      if (!runtimeCheck.ok) {
        return { ok: false, detail: `${name}-runtime-${runtimeCheck.reason}` };
      }
    }
  }
  return { ok: true };
}

/**
 * @param {Record<string, object>} objects
 */
/**
 * @param {Record<string, object>} objects
 * @param {ReturnType<typeof loadArtifacts>} artifacts
 */
function verifyHeadlessServices(objects, artifacts) {
  for (const name of HEADLESS_SERVICES) {
    const service = objects[`Service/${name}`];
    if (!service) {
      return { ok: false, detail: `missing-${name}` };
    }
    const expected = artifacts.documents.find(
      (doc) => doc.kind === 'Service' && doc.metadata?.name === name,
    );
    if (!expected) {
      return { ok: false, detail: `expected-missing-${name}` };
    }
    if (!serviceSpecCompatible(service, expected)) {
      return { ok: false, detail: `headless-${name}` };
    }
  }
  return { ok: true };
}

/**
 * @param {Record<string, object>} objects
 */
function verifyGrafanaAdminSecret(objects) {
  const secret = objects[`Secret/${GRAFANA_ADMIN_SECRET}`];
  if (!secret) {
    return { ok: false, detail: 'missing-grafana-secret' };
  }
  const keys = secret.dataKeys ?? [];
  for (const required of GRAFANA_ADMIN_REQUIRED_KEYS) {
    if (!keys.includes(required)) {
      return { ok: false, detail: 'grafana-secret-key' };
    }
  }
  return { ok: true };
}

/**
 * @param {object[]} helmReleases
 */
function verifyHelmRevisions(helmReleases) {
  const counts = new Map();
  for (const row of helmReleases) {
    const name = row?.name;
    if (typeof name !== 'string') {
      continue;
    }
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  for (const name of EXPECTED_HELM_RELEASES) {
    const count = counts.get(name) ?? 0;
    if (count > 1) {
      return { ok: false, detail: 'extra-helm-revision' };
    }
    if (count !== 1) {
      return { ok: false, detail: `helm-revision-${name}` };
    }
  }
  return { ok: true };
}

/**
 * @param {Record<string, object>} objects
 * @param {ReturnType<typeof loadArtifacts>} artifacts
 */
function findUnknownEnumerated(objects, artifacts) {
  const expected = readExpectedInventory(artifacts);
  if (!expected) {
    return null;
  }
  const allowed = new Set(
    [...expected.direct, ...expected.generatedClaims].map((row) =>
      objectKeyFromRow(row),
    ),
  );
  for (const ignored of IGNORED_OBJECT_KEYS) {
    const [kind, name] = ignored.split('/');
    if (name) {
      allowed.add(`${kind}/${name}`);
    }
  }
  for (const key of Object.keys(objects)) {
    const object = objects[key];
    const kind = object.kind;
    if (kind === 'ReplicaSet' || kind === 'Pod' || kind === 'EndpointSlice') {
      continue;
    }
    if (
      kind === 'Secret' &&
      (object.metadata?.name?.startsWith('sh.helm.release.v1.') ||
        object.metadata?.name === GRAFANA_ADMIN_SECRET)
    ) {
      continue;
    }
    if (!allowed.has(key) && !IGNORED_OBJECT_KEYS.has(key)) {
      return key;
    }
  }
  return null;
}

/**
 * @param {object} snapshot
 * @param {ReturnType<typeof loadArtifacts>} artifacts
 * @param {{ collectorVariant?: 'desired' | 'predecessor' | 'upgraded', predecessorArtifacts?: ReturnType<typeof loadArtifacts> | null }} [options]
 */
function assessShape(snapshot, artifacts, options = {}) {
  if (snapshot.namespace?.absent) {
    return {
      ok: false,
      state: 'not-ready',
      reasonCode: 'not-ready',
      detail: 'empty-namespace-present',
    };
  }
  const profile = artifacts.profile ?? snapshot.artifactsProfile;
  const ownerLabel = profile?.ownerLabel;
  const ownerValue = profile?.ownerValue;
  if (
    ownerLabel &&
    ownerValue &&
    snapshot.namespace?.object?.metadata?.labels?.[ownerLabel] !== ownerValue
  ) {
    return {
      ok: false,
      state: 'not-ready',
      reasonCode: 'not-ready',
      detail: 'namespace-owner-label',
    };
  }

  const direct = assessDirectInventory(snapshot, artifacts);
  if (!direct.ok) {
    return direct;
  }
  const helmRevision = verifyHelmRevisionMatrix(snapshot, artifacts, {
    collectorVariant: options.collectorVariant,
    predecessorArtifacts: options.predecessorArtifacts,
  });
  if (!helmRevision.ok) {
    return {
      ok: false,
      state: 'not-ready',
      reasonCode: 'not-ready',
      detail: helmRevision.detail,
    };
  }
  const helmStorage = verifyHelmStorageBijection(snapshot, artifacts);
  if (!helmStorage.ok) {
    return {
      ok: false,
      state: 'not-ready',
      reasonCode: 'not-ready',
      detail: helmStorage.detail,
    };
  }
  const headless = verifyHeadlessServices(snapshot.objects ?? {}, artifacts);
  if (!headless.ok) {
    return {
      ok: false,
      state: 'not-ready',
      reasonCode: 'not-ready',
      detail: headless.detail,
    };
  }
  const pvc = verifyPersistentVolumeClaims(
    snapshot.objects ?? {},
    snapshot.persistentVolumes ?? [],
  );
  if (!pvc.ok) {
    return {
      ok: false,
      state: 'not-ready',
      reasonCode: 'not-ready',
      detail: pvc.detail,
    };
  }
  const chains = verifyControllerChains(snapshot.objects ?? {});
  if (!chains.ok) {
    return {
      ok: false,
      state: chains.detail?.includes('foreign-child') ? 'foreign' : 'not-ready',
      reasonCode: chains.detail?.includes('foreign-child')
        ? 'foreign'
        : 'not-ready',
      detail: chains.detail,
    };
  }
  const secret = verifyGrafanaAdminSecret(snapshot.objects ?? {});
  if (!secret.ok) {
    return {
      ok: false,
      state: 'not-ready',
      reasonCode: 'not-ready',
      detail: secret.detail,
    };
  }
  const images = verifyWorkloadImages(
    snapshot.objects ?? {},
    artifacts.releases,
  );
  if (!images.ok) {
    return {
      ok: false,
      state: 'not-ready',
      reasonCode: 'not-ready',
      detail: images.detail,
    };
  }
  const unknown = findUnknownEnumerated(snapshot.objects ?? {}, artifacts);
  if (unknown) {
    return {
      ok: false,
      state: 'foreign',
      reasonCode: 'foreign',
      detail: unknown,
    };
  }
  return { ok: true, state: 'ready', reasonCode: 'ready', detail: 'ready' };
}

// ---------------------------------------------------------------------------
// OBS-E2-09 T02: exact history verification. Every verifier below consumes the
// SAME explicit frozen history row (artifact-history.mjs) and the immutable
// per-revision descriptors selected by that row's artifact IDs. The historical
// E1 verifiers above keep their original semantics and callers.
// ---------------------------------------------------------------------------

/**
 * @param {string} detail
 */
function historyFail(detail) {
  return { ok: false, detail };
}

/**
 * Resolve a frozen history row to its immutable per-revision descriptors.
 * Only the exact frozen rows are accepted; an arbitrary object never is.
 * @param {{ desired?: object | null, admissible?: object[] } | null | undefined} artifactSet
 * @param {object} row
 */
export function resolveHistoryDescriptors(artifactSet, row) {
  if (
    !ARTIFACT_HISTORY_ROWS.includes(row) &&
    !E2_INTERMEDIATE_ROWS.includes(row)
  ) {
    return historyFail('history-row-unknown');
  }
  const bundles = new Map();
  for (const bundle of [
    ...(artifactSet?.admissible ?? []),
    artifactSet?.desired,
  ]) {
    if (!bundle) continue;
    if (typeof bundle.artifactId !== 'string') {
      return historyFail('artifact-id-missing');
    }
    if (bundles.has(bundle.artifactId) && bundles.get(bundle.artifactId) !== bundle) {
      return historyFail(`artifact-ambiguous-${bundle.artifactId}`);
    }
    bundles.set(bundle.artifactId, bundle);
  }
  /** @type {Record<string, { artifactId: string, bundle: any, release: any }[]>} */
  const roles = {};
  for (const role of HISTORY_ROLES) {
    const ids = row.releases?.[role];
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 2) {
      return historyFail(`history-length-${role}`);
    }
    roles[role] = [];
    for (const artifactId of ids) {
      const bundle = bundles.get(artifactId);
      if (!bundle) return historyFail(`artifact-missing-${artifactId}`);
      if (bundle.profile?.id !== row.profileId) {
        return historyFail(`artifact-profile-${artifactId}`);
      }
      const matches = (bundle.releases ?? []).filter((r) => r.role === role);
      if (matches.length !== 1) return historyFail(`artifact-release-${role}`);
      roles[role].push({ artifactId, bundle, release: matches[0] });
    }
    const names = new Set(roles[role].map((entry) => entry.release.name));
    if (names.size !== 1) return historyFail(`release-name-${role}`);
  }
  const namespace = roles.collector[0].bundle.profile?.namespaces?.observability;
  if (typeof namespace !== 'string' || namespace.length === 0) {
    return historyFail('history-namespace');
  }
  return { ok: true, roles, namespace };
}

/**
 * Select the explicit frozen row: a final row (`phase` null) or the exact
 * non-public intermediate row of an original history ID.
 * @param {string} profileId
 * @param {string} historyId
 * @param {string | null} [phase]
 */
export function resolveHistoryRow(profileId, historyId, phase = null) {
  return phase === null || phase === undefined
    ? lookupArtifactHistoryRow(profileId, historyId)
    : lookupE2IntermediateRow(historyId, phase);
}

/**
 * Typed view of the scoped snapshot. Cluster objects have namespace ''.
 * @param {object} snapshot
 */
function readScopedView(snapshot) {
  const scoped = snapshot?.scopedObjects;
  if (!scoped || typeof scoped !== 'object') {
    return historyFail('scoped-objects-missing');
  }
  /** @type {{ key: string, namespace: string, kind: string, name: string, object: any }[]} */
  const entries = [];
  for (const [key, object] of Object.entries(scoped)) {
    const parts = key.split('/');
    if (parts.length < 3) return historyFail('scoped-key-malformed');
    const [namespace, kind] = parts;
    const name = parts.slice(2).join('/');
    const metadata = object?.metadata ?? {};
    if (
      object?.kind !== kind ||
      metadata.name !== name ||
      (metadata.namespace ?? '') !== namespace
    ) {
      return historyFail('scoped-identity-mismatch');
    }
    entries.push({ key, namespace, kind, name, object });
  }
  return { ok: true, scoped, entries };
}

/**
 * Exactly one retained revision list per role; the chart/app pins, the
 * actual manifest content and the single deployed revision all come from the
 * per-revision descriptors of the SAME row.
 * @param {object} snapshot
 * @param {object | null} artifactSet
 * @param {object} row
 */
export function verifyHistoryHelmRevisions(snapshot, artifactSet, row) {
  const resolved = resolveHistoryDescriptors(artifactSet, row);
  if (!resolved.ok) return resolved;
  const listed = snapshot?.helmReleases ?? [];
  const names = new Set();
  for (const entry of listed) {
    if (names.has(entry.name)) return historyFail('extra-helm-revision');
    names.add(entry.name);
  }
  if (listed.length !== HISTORY_ROLES.length) {
    return historyFail('helm-release-count');
  }
  for (const role of HISTORY_ROLES) {
    const revisions = resolved.roles[role];
    const count = revisions.length;
    const current = revisions[count - 1].release;
    const name = current.name;
    const listRow = listed.find((entry) => entry.name === name);
    if (!listRow) return historyFail(`helm-revision-${name}`);
    if (
      String(listRow.revision) !== String(count) ||
      listRow.status !== 'deployed'
    ) {
      return historyFail(`helm-status-${name}`);
    }
    if (
      listRow.chart !== expectedHelmChartRef(current) ||
      listRow.appVersion !== current.appVersion
    ) {
      return historyFail(`helm-pin-${name}`);
    }
    const history = snapshot?.helmHistory?.[name];
    if (!Array.isArray(history) || history.length !== count) {
      return historyFail(`helm-history-length-${name}`);
    }
    for (let index = 0; index < count; index += 1) {
      const entry = history[index];
      const expectedRelease = revisions[index].release;
      if (String(entry?.revision) !== String(index + 1)) {
        return historyFail(`helm-history-contiguous-${name}`);
      }
      const expectedStatus = index === count - 1 ? 'deployed' : 'superseded';
      if (entry.status !== expectedStatus) {
        return historyFail(`helm-history-status-${name}`);
      }
      if (
        entry.chart !== expectedHelmChartRef(expectedRelease) ||
        entry.appVersion !== expectedRelease.appVersion
      ) {
        return historyFail(`helm-history-pin-${name}`);
      }
    }
    const manifest = snapshot?.helmManifests?.[name];
    if (!manifest || !Array.isArray(manifest.documents)) {
      return historyFail(`helm-manifest-missing-${name}`);
    }
    if (String(manifest.revision) !== String(count)) {
      return historyFail(`helm-manifest-revision-${name}`);
    }
    if (!collectorDocumentsEqual(manifest.documents, current.documents)) {
      return historyFail(`manifest-content-${name}`);
    }
    if (count === 2) {
      if (
        !Array.isArray(manifest.previousDocuments) ||
        !collectorDocumentsEqual(
          manifest.previousDocuments,
          revisions[0].release.documents,
        )
      ) {
        return historyFail(`manifest-previous-content-${name}`);
      }
    } else if (manifest.previousDocuments !== undefined) {
      return historyFail(`manifest-previous-unexpected-${name}`);
    }
  }
  return { ok: true };
}

const HISTORY_STORAGE_LABELS = new Set(['owner', 'name', 'status', 'version', 'modifiedAt']);

/**
 * Helm storage Secrets are in exact bijection with the row's retained
 * revisions: name, type, labels, release key, namespace, non-termination.
 * @param {object} snapshot
 * @param {object | null} artifactSet
 * @param {object} row
 */
export function verifyHistoryHelmStorage(snapshot, artifactSet, row) {
  const resolved = resolveHistoryDescriptors(artifactSet, row);
  if (!resolved.ok) return resolved;
  const view = readScopedView(snapshot);
  if (!view.ok) return view;
  /** @type {Map<string, { release: string, revision: number, status: string }>} */
  const expected = new Map();
  for (const role of HISTORY_ROLES) {
    const revisions = resolved.roles[role];
    revisions.forEach((entry, index) => {
      expected.set(
        `${HELM_RELEASE_PREFIX}${entry.release.name}.v${index + 1}`,
        {
          release: entry.release.name,
          revision: index + 1,
          status: index === revisions.length - 1 ? 'deployed' : 'superseded',
        },
      );
    });
  }
  const observed = new Set();
  for (const { namespace, kind, name, object } of view.entries) {
    if (kind !== 'Secret') continue;
    const labels = object.metadata?.labels ?? {};
    const candidate =
      name.startsWith(HELM_RELEASE_PREFIX) ||
      object.type === 'helm.sh/release.v1' ||
      labels.owner === 'helm';
    if (!candidate) continue;
    if (namespace !== resolved.namespace) {
      return historyFail('helm-storage-namespace');
    }
    const want = expected.get(name);
    if (!want) return historyFail('helm-storage-extra');
    if (isTerminating(object.metadata)) {
      return historyFail('helm-storage-terminating');
    }
    if (
      typeof object.metadata?.uid !== 'string' ||
      object.metadata.uid.length === 0 ||
      object.type !== 'helm.sh/release.v1' ||
      !isDeepStrictEqual(object.dataKeys, ['release']) ||
      labels.owner !== 'helm' ||
      labels.name !== want.release ||
      String(labels.version) !== String(want.revision) ||
      labels.status !== want.status ||
      Object.keys(labels).some((key) => !HISTORY_STORAGE_LABELS.has(key))
    ) {
      return historyFail('helm-storage-metadata');
    }
    observed.add(name);
  }
  for (const [name, want] of expected) {
    if (!observed.has(name)) {
      return historyFail(`helm-storage-missing-${want.release}-v${want.revision}`);
    }
  }
  return { ok: true };
}

/**
 * Namespaced objects of the target namespace keyed `Kind/name`.
 * @param {ReturnType<typeof readScopedView> & { ok: true }} view
 * @param {string} namespace
 */
function namespacedView(view, namespace) {
  /** @type {Record<string, any>} */
  const out = {};
  for (const entry of view.entries) {
    if (entry.namespace === namespace) out[`${entry.kind}/${entry.name}`] = entry.object;
  }
  return out;
}

/**
 * Resolve a pod or ReplicaSet to its controlling Deployment/StatefulSet key.
 * @param {Record<string, any>} objects
 * @param {any} object
 * @returns {string | null}
 */
function controllerWorkloadKey(objects, object) {
  const owners = object?.metadata?.ownerReferences ?? [];
  if (owners.length !== 1 || owners[0]?.controller !== true) return null;
  const parent = objects[`${owners[0].kind}/${owners[0].name}`];
  if (!parent || parent.metadata?.uid !== owners[0].uid) return null;
  if (owners[0].kind === 'Deployment' || owners[0].kind === 'StatefulSet') {
    return `${owners[0].kind}/${owners[0].name}`;
  }
  if (object.kind === 'Pod' && owners[0].kind === 'ReplicaSet') {
    return controllerWorkloadKey(objects, parent);
  }
  if (object.kind === 'ReplicaSet') return null;
  return null;
}

/**
 * @param {any} podSpec
 * @param {{ name: string, renderedReference: string }[]} containers
 */
function exactContainers(podSpec, containers) {
  if (!podSpec) return false;
  if ((podSpec.initContainers ?? []).length > 0) return false;
  if ((podSpec.ephemeralContainers ?? []).length > 0) return false;
  const actual = podSpec.containers ?? [];
  return (
    actual.length === containers.length &&
    containers.every(
      (expected, index) =>
        actual[index]?.name === expected.name &&
        actual[index]?.image === expected.renderedReference,
    )
  );
}

/**
 * Exact per-workload containers/images/runtime status, owned controller
 * chains and the closed set of descendants (KSM and exporter included).
 * @param {object} snapshot
 * @param {object | null} artifactSet
 * @param {object} row
 */
export function verifyHistoryWorkloads(snapshot, artifactSet, row) {
  const resolved = resolveHistoryDescriptors(artifactSet, row);
  if (!resolved.ok) return resolved;
  const view = readScopedView(snapshot);
  if (!view.ok) return view;
  const objects = namespacedView(view, resolved.namespace);
  /** @type {Map<string, { name: string, renderedReference: string, canonicalReference: string }[]>} */
  const declared = new Map();
  for (const role of HISTORY_ROLES) {
    const revisions = resolved.roles[role];
    const current = revisions[revisions.length - 1].release;
    const entries = Object.entries(current.expectedWorkloads ?? {});
    if (entries.length === 0) return historyFail(`workloads-undeclared-${role}`);
    for (const [key, containers] of entries) {
      const match = /^namespaced\/([^/]+)\/(Deployment|StatefulSet)\/(.+)$/.exec(key);
      if (!match || match[1] !== resolved.namespace) {
        return historyFail(`workload-scope-${role}`);
      }
      const objectKey = `${match[2]}/${match[3]}`;
      if (declared.has(objectKey)) return historyFail(`workload-duplicate-${match[3]}`);
      declared.set(objectKey, containers);
    }
  }
  for (const [key, containers] of declared) {
    const name = key.split('/')[1];
    const live = objects[key];
    if (!live) return historyFail(`missing-workload-${name}`);
    if (isTerminating(live.metadata)) return historyFail(`${name}-terminating`);
    if (!exactContainers(live.spec?.template?.spec, containers)) {
      return historyFail(`${name}-containers`);
    }
    const ready =
      live.kind === 'Deployment'
        ? deploymentRolloutReady(live)
        : statefulSetRolloutReady(live);
    if (!ready) return historyFail(`${name}-stale-generation`);
    const pods = Object.values(objects).filter(
      (object) => object.kind === 'Pod' && controllerWorkloadKey(objects, object) === key,
    );
    if (pods.length < 1) return historyFail(`${name}-missing-pod`);
    for (const pod of pods) {
      if (isTerminating(pod.metadata)) return historyFail(`${name}-pod-terminating`);
      if (!exactContainers(pod.spec, containers)) {
        return historyFail(`${name}-pod-containers`);
      }
      if (pod.status?.phase !== 'Running') return historyFail(`${name}-pod-phase`);
      const statuses = pod.status?.containerStatuses;
      if (
        !Array.isArray(statuses) ||
        statuses.length !== containers.length ||
        (pod.status?.initContainerStatuses ?? []).length > 0
      ) {
        return historyFail(`${name}-runtime-status-count`);
      }
      for (const container of containers) {
        const entry = statuses.find((candidate) => candidate?.name === container.name);
        if (!entry) return historyFail(`${name}-runtime-status-name`);
        const runtime = verifyContainerRuntimeIdentity(
          { containerStatuses: [entry] },
          container.name,
          container.canonicalReference,
        );
        if (!runtime.ok) return historyFail(`${name}-runtime-${runtime.reason}`);
      }
    }
  }
  for (const [key, object] of Object.entries(objects)) {
    if (object.kind === 'Pod' || object.kind === 'ReplicaSet') {
      const owner = controllerWorkloadKey(objects, object);
      if (!owner || !declared.has(owner)) {
        return historyFail(`unexpected-${object.kind.toLowerCase()}-${object.metadata?.name}`);
      }
    } else if (
      ['Deployment', 'StatefulSet', 'DaemonSet', 'Job', 'CronJob'].includes(object.kind) &&
      !declared.has(key)
    ) {
      return historyFail(`unexpected-workload-${object.metadata?.name}`);
    }
  }
  return { ok: true };
}

/**
 * Exact cluster RBAC: only the named roles/bindings the row's current
 * descriptors render, with exact rules, roleRef and subjects. Nothing else
 * may be present.
 * @param {object} snapshot
 * @param {object | null} artifactSet
 * @param {object} row
 */
export function verifyHistoryRbac(snapshot, artifactSet, row) {
  const resolved = resolveHistoryDescriptors(artifactSet, row);
  if (!resolved.ok) return resolved;
  const view = readScopedView(snapshot);
  if (!view.ok) return view;
  /** @type {Map<string, { doc: any, release: string }>} */
  const expected = new Map();
  for (const role of HISTORY_ROLES) {
    const revisions = resolved.roles[role];
    const current = revisions[revisions.length - 1].release;
    for (const doc of current.documents) {
      if (!CLUSTER_RBAC_KINDS.includes(doc.kind)) continue;
      expected.set(`/${doc.kind}/${doc.metadata.name}`, {
        doc,
        release: current.name,
      });
    }
  }
  for (const entry of view.entries) {
    if (entry.namespace === '' && !expected.has(entry.key)) {
      return historyFail(`unexpected-rbac-${entry.name}`);
    }
  }
  for (const [key, observation] of Object.entries(snapshot.clusterRbac ?? {})) {
    if (observation?.absent === false && !expected.has(key)) {
      return historyFail(`unexpected-rbac-${key}`);
    }
  }
  for (const [key, { doc, release }] of expected) {
    const live = view.scoped[key];
    const name = doc.metadata.name;
    if (!live) return historyFail(`rbac-missing-${name}`);
    if (typeof live.metadata?.uid !== 'string' || live.metadata.uid.length === 0) {
      return historyFail(`rbac-uid-${name}`);
    }
    if (isTerminating(live.metadata)) return historyFail(`rbac-terminating-${name}`);
    if (
      !hasHelmOwnership(live, release) ||
      live.metadata.annotations?.['meta.helm.sh/release-namespace'] !== resolved.namespace
    ) {
      return historyFail(`rbac-ownership-${name}`);
    }
    if (doc.kind === 'ClusterRole') {
      if (
        !isDeepStrictEqual(live.rules ?? null, doc.rules ?? null) ||
        live.aggregationRule != null
      ) {
        return historyFail(`rbac-rules-${name}`);
      }
    } else {
      const owned = assessClusterBindingOwnership(
        { absent: false, object: live },
        name,
        resolved.namespace,
      );
      if (
        !owned.ok ||
        !isDeepStrictEqual(live.roleRef, doc.roleRef) ||
        !isDeepStrictEqual(live.subjects, doc.subjects)
      ) {
        return historyFail(`rbac-binding-${name}`);
      }
    }
  }
  return { ok: true };
}

/**
 * Whole-row shape: scoped inventory, histories, storage, RBAC, PVCs, headless
 * services, workloads and closed enumeration, all from one explicit row.
 * @param {object} snapshot
 * @param {object | null} artifactSet
 * @param {object} row
 */
export function assessHistoryShape(snapshot, artifactSet, row) {
  const notReady = (detail) => ({
    ok: false,
    state: 'not-ready',
    reasonCode: 'not-ready',
    detail,
  });
  const resolved = resolveHistoryDescriptors(artifactSet, row);
  if (!resolved.ok) return notReady(resolved.detail);
  if (snapshot?.namespace?.absent) return notReady('empty-namespace-present');
  const view = readScopedView(snapshot);
  if (!view.ok) return notReady(view.detail);
  const profile = resolved.roles.collector[0].bundle.profile;
  if (
    profile.ownerLabel &&
    profile.ownerValue &&
    snapshot.namespace?.object?.metadata?.labels?.[profile.ownerLabel] !==
      profile.ownerValue
  ) {
    return notReady('namespace-owner-label');
  }
  const objects = namespacedView(view, resolved.namespace);
  const allowed = new Set(IGNORED_OBJECT_KEYS);
  const generated = new Set();
  /** @type {any[][]} */
  const rows = [];
  for (const role of HISTORY_ROLES) {
    const revisions = resolved.roles[role];
    const { bundle, release } = revisions[revisions.length - 1];
    for (const entry of bundle.expectedInventory?.direct ?? []) {
      if (entry[4] === release.name) rows.push(entry);
    }
    for (const entry of bundle.expectedInventory?.generatedClaims ?? []) {
      if (entry[4] === release.name) {
        rows.push(entry);
        generated.add(entry[3]);
      }
    }
  }
  const directKinds = new Set([
    'Deployment',
    'StatefulSet',
    'ConfigMap',
    'Service',
    'PersistentVolumeClaim',
    'ServiceAccount',
  ]);
  for (const entry of rows) {
    if (CLUSTER_RBAC_KINDS.includes(entry[1])) continue;
    const key = scopedObjectKey(entry[2], entry[1], entry[3]);
    const live = view.scoped[key];
    if (!live) return notReady(`missing-${entry[3]}`);
    if (isTerminating(live.metadata)) return notReady('terminating-resource');
    allowed.add(`${entry[1]}/${entry[3]}`);
    if (
      directKinds.has(entry[1]) &&
      !generated.has(entry[3]) &&
      !hasHelmOwnership(live, entry[4])
    ) {
      return { ok: false, state: 'foreign', reasonCode: 'foreign', detail: `helm-ownership-${entry[3]}` };
    }
  }
  const steps = [
    verifyHistoryHelmRevisions(snapshot, artifactSet, row),
    verifyHistoryHelmStorage(snapshot, artifactSet, row),
    verifyHistoryRbac(snapshot, artifactSet, row),
    (() => {
      const lokiCurrent = resolved.roles.loki[resolved.roles.loki.length - 1].bundle;
      return verifyHeadlessServices(objects, lokiCurrent);
    })(),
    verifyPersistentVolumeClaims(objects, snapshot.persistentVolumes ?? []),
    verifyGrafanaAdminSecret(objects),
    verifyHistoryWorkloads(snapshot, artifactSet, row),
  ];
  for (const step of steps) {
    if (!step.ok) return notReady(step.detail);
  }
  for (const [key, object] of Object.entries(objects)) {
    if (['ReplicaSet', 'Pod', 'EndpointSlice'].includes(object.kind)) continue;
    if (
      object.kind === 'Secret' &&
      (object.metadata?.name?.startsWith(HELM_RELEASE_PREFIX) ||
        object.metadata?.name === GRAFANA_ADMIN_SECRET)
    ) {
      continue;
    }
    if (!allowed.has(key)) {
      return { ok: false, state: 'foreign', reasonCode: 'foreign', detail: key };
    }
  }
  return { ok: true, state: 'ready', reasonCode: 'ready', detail: 'ready' };
}

/**
 * @param {object} snapshot
 * @param {ReturnType<typeof loadArtifacts>} artifacts
 */
/**
 * @param {object} snapshot
 */
function detectLegacyOrphans(snapshot) {
  const orphan = detectLegacyOrphanControllers(snapshot.objects ?? {});
  if (!orphan.ok) {
    return {
      state: 'legacy',
      reasonCode: 'legacy',
      detail: orphan.detail,
    };
  }
  return null;
}

/**
 * @param {object} snapshot
 * @param {ReturnType<typeof loadArtifacts>} desired
 * @param {{ predecessorArtifacts?: ReturnType<typeof loadArtifacts> | null }} [options]
 */
export function classifyInventory(snapshot, desired, options = {}) {
  const predecessorArtifacts = options.predecessorArtifacts ?? null;
  const pendingFlag = snapshot.pending === true;

  if (Array.isArray(snapshot.legacy) && snapshot.legacy.length > 0) {
    return {
      state: 'legacy',
      reasonCode: 'legacy',
      pending: pendingFlag,
      detail: snapshot.legacy[0]?.name ?? 'legacy',
    };
  }

  if (snapshot.namespace?.absent === true) {
    if (!pendingAdmitsPublicReadyOrAbsent(snapshot)) {
      return {
        state: 'not-ready',
        reasonCode: 'pending',
        pending: pendingBlocksPublicReady(snapshot) ? true : pendingFlag,
        detail: 'pending-blocks-absent',
      };
    }
    const foreignPv = (snapshot.persistentVolumes ?? []).some(
      (pv) =>
        pv?.spec?.claimRef?.namespace ===
        desired.profile?.namespaces?.observability,
    );
    if (foreignPv || (snapshot.helmReleases ?? []).length > 0) {
      return {
        state: 'not-ready',
        reasonCode: 'not-ready',
        pending: false,
        detail: 'absent-not-clean',
      };
    }
    return {
      state: 'absent',
      reasonCode: 'absent',
      pending: false,
      detail: 'clean-absent',
    };
  }

  const legacyOrphan = detectLegacyOrphans(snapshot);
  if (legacyOrphan) {
    return {
      ...legacyOrphan,
      pending: pendingFlag,
    };
  }

  const objectCount = Object.keys(snapshot.objects ?? {}).length;
  if (objectCount === 0 && !snapshot.namespace?.absent) {
    return {
      state: 'not-ready',
      reasonCode: 'not-ready',
      pending: pendingFlag,
      detail: 'empty-namespace',
    };
  }

  let ready = assessShape(snapshot, desired, {
    collectorVariant: 'desired',
    predecessorArtifacts,
  });
  if (
    !ready.ok &&
    predecessorArtifacts &&
    desired.profile?.id === 'dev' &&
    (ready.detail?.startsWith('collector') ||
      ready.detail?.includes('obs-collector'))
  ) {
    const predecessorShape = assessShape(snapshot, predecessorArtifacts, {
      collectorVariant: 'predecessor',
      predecessorArtifacts,
    });
    if (predecessorShape.ok) {
      return {
        state: 'not-ready',
        reasonCode: 'upgrade-required',
        pending: pendingFlag,
        detail: 'upgrade-required',
      };
    }
  }

  if (!ready.ok) {
    return {
      state: ready.state ?? 'not-ready',
      reasonCode: ready.reasonCode ?? 'not-ready',
      pending: pendingFlag,
      detail: ready.detail ?? 'not-ready',
    };
  }

  if (pendingBlocksPublicReady(snapshot)) {
    return {
      state: 'not-ready',
      reasonCode: 'pending',
      pending: true,
      detail: 'pending-complete',
    };
  }

  return {
    state: 'ready',
    reasonCode: 'ready',
    pending: false,
    detail: 'ready',
  };
}

/**
 * @param {object | null | undefined} snapshot
 * @param {ReturnType<typeof loadArtifacts>} desired
 * @param {{
 *   identity: { tuple?: { targetNamespaceUid?: string | null } },
 *   custody: { assertOwnPending: () => object },
 *   predecessorArtifacts?: ReturnType<typeof loadArtifacts> | null,
 *   expectedOperation: 'ensure' | 'upgrade' | 'persistence' | 'outage',
 *   expectedRevision: number,
 * }} params
 */
export function verifyOwnedFinalShape(snapshot, desired, params) {
  if (snapshot == null) {
    return { ok: false, configRevision: null, detail: 'missing-snapshot' };
  }
  if (typeof params.custody?.assertOwnPending !== 'function') {
    return { ok: false, configRevision: null, detail: 'missing-custody' };
  }
  params.custody.assertOwnPending();
  if (snapshot.pending !== true || snapshot.pendingValid !== true) {
    return {
      ok: false,
      configRevision: null,
      detail: 'owned-pending-required',
    };
  }
  const namespaceUid = params.identity?.tuple?.targetNamespaceUid;
  if (
    namespaceUid != null &&
    snapshot.namespace?.uid != null &&
    snapshot.namespace.uid !== namespaceUid
  ) {
    return {
      ok: false,
      configRevision: null,
      detail: 'namespace-uid-mismatch',
    };
  }
  const variant =
    params.expectedOperation === 'upgrade' || params.expectedRevision === 2
      ? 'upgraded'
      : 'desired';
  const shape = assessShape(snapshot, desired, {
    collectorVariant: variant,
    predecessorArtifacts: params.predecessorArtifacts ?? null,
  });
  if (!shape.ok) {
    return {
      ok: false,
      configRevision: null,
      detail: shape.detail ?? 'shape-refused',
    };
  }
  const collector = snapshot.helmReleases?.find(
    (row) => row.name === 'obs-collector',
  );
  const revision = collector
    ? Number.parseInt(String(collector.revision), 10)
    : null;
  if (revision !== params.expectedRevision) {
    return {
      ok: false,
      configRevision: revision,
      detail: 'revision-mismatch',
    };
  }
  return { ok: true, configRevision: revision, detail: 'owned-final-shape' };
}

/**
 * @param {object} snapshot
 * @param {ReturnType<typeof loadArtifacts>} desired
 * @param {{
 *   identity: { tuple?: { targetNamespaceUid?: string | null } },
 *   custody: { assertOwnPending: () => object },
 *   completedPhases: string[],
 * }} params
 */
export function verifyOwnedEnsurePrefix(snapshot, desired, params) {
  if (typeof params.custody?.assertOwnPending !== 'function') {
    return { ok: false, detail: 'missing-custody' };
  }
  params.custody.assertOwnPending();
  if (!isValidPhasePrefix(params.completedPhases)) {
    return { ok: false, detail: 'invalid-phase-prefix' };
  }
  if (snapshot.pending !== true || snapshot.pendingValid !== true) {
    return { ok: false, detail: 'owned-pending-required' };
  }
  if (findAbsentNamespaceRbacCollisions(snapshot).length > 0) {
    return { ok: false, detail: 'rbac-collision' };
  }
  const profile = desired.profile;
  const completedReleasePhases = params.completedPhases.filter((phase) =>
    phase.startsWith('obs-'),
  );
  if (params.completedPhases.includes('namespace')) {
    if (snapshot.namespace?.absent) {
      return { ok: false, detail: 'namespace-absent' };
    }
    if (
      profile?.ownerLabel &&
      snapshot.namespace?.object?.metadata?.labels?.[profile.ownerLabel] !==
        profile.ownerValue
    ) {
      return { ok: false, detail: 'namespace-owner-label' };
    }
  }
  for (const release of desired.releases) {
    const secretName = `sh.helm.release.v1.${release.name}.v1`;
    const key = `Secret/${secretName}`;
    const allowed = completedReleasePhases.includes(release.name);
    if (allowed) {
      if (!snapshot.objects?.[key]) {
        return { ok: false, detail: `missing-helm-${release.name}` };
      }
    } else if (snapshot.objects?.[key]) {
      return { ok: false, detail: `unexpected-helm-${release.name}` };
    }
  }
  // The historical subset shape describes E1 only. The exact E2 shape is
  // verified by verifyOwnedHistoryShape at finalization, never here.
  if (
    completedReleasePhases.length === EXPECTED_HELM_RELEASES.length &&
    desired.artifactId !== 'dev-e2'
  ) {
    const subset = assessShape(snapshot, desired, {
      collectorVariant: 'desired',
    });
    if (!subset.ok) {
      return { ok: false, detail: subset.detail ?? 'shape-refused' };
    }
  }
  return { ok: true, detail: 'owned-ensure-prefix' };
}

/**
 * @param {object} snapshot
 * @param {ReturnType<typeof loadArtifacts>} desired
 * @param {{
 *   identity: { tuple?: { targetNamespaceUid?: string | null } },
 *   custody: { assertOwnPending: () => object },
 *   predecessorArtifacts?: ReturnType<typeof loadArtifacts> | null,
 *   expectedRevision: number,
 *   baseline: { tempoUid: string, generation: number },
 * }} params
 */
export function verifyOwnedTempoDown(snapshot, desired, params) {
  if (typeof params.custody?.assertOwnPending !== 'function') {
    return { ok: false, configRevision: null, detail: 'missing-custody' };
  }
  params.custody.assertOwnPending();
  if (
    !pendingAdmitsPublicReadyOrAbsent(snapshot) ||
    snapshot.pending !== true
  ) {
    return {
      ok: false,
      configRevision: null,
      detail: 'owned-pending-required',
    };
  }
  const tempo = snapshot.objects?.['StatefulSet/obs-tempo'];
  if (!tempo || tempo.metadata?.uid !== params.baseline.tempoUid) {
    return { ok: false, configRevision: null, detail: 'tempo-uid' };
  }
  if (tempo.metadata?.generation !== params.baseline.generation + 1) {
    return { ok: false, configRevision: null, detail: 'tempo-generation' };
  }
  if (tempo.spec?.replicas !== 0) {
    return { ok: false, configRevision: null, detail: 'tempo-replicas' };
  }
  const observed = tempo.status?.observedGeneration;
  if (
    observed == null ||
    Number(observed) < Number(tempo.metadata.generation)
  ) {
    return {
      ok: false,
      configRevision: null,
      detail: 'tempo-observed-generation',
    };
  }
  for (const object of Object.values(snapshot.objects ?? {})) {
    if (
      object.kind === 'Pod' &&
      object.metadata?.ownerReferences?.some(
        (ref) => ref.kind === 'StatefulSet' && ref.name === 'obs-tempo',
      ) &&
      !isTerminating(object.metadata)
    ) {
      return { ok: false, configRevision: null, detail: 'tempo-pod-active' };
    }
  }
  const collector = snapshot.helmReleases?.find(
    (row) => row.name === 'obs-collector',
  );
  const revision = collector
    ? Number.parseInt(String(collector.revision), 10)
    : null;
  if (revision !== params.expectedRevision) {
    return { ok: false, configRevision: revision, detail: 'revision-mismatch' };
  }
  return { ok: true, configRevision: revision, detail: 'owned-tempo-down' };
}

// ---------------------------------------------------------------------------
// OBS-E2-09 T03: operational classification, owned history phases and the
// operational observation facade. Legacy E1 functions above keep semantics.
// ---------------------------------------------------------------------------

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/**
 * Deterministic digest of one bundle's exact rendered release-manifest set:
 * ordered roles, documents sorted by identity, canonical JSON, no credentials.
 * @param {{ releases?: any[] }} bundle
 */
export function manifestSetSha256(bundle) {
  const projection = HISTORY_ROLES.map((role) => {
    const release = (bundle?.releases ?? []).find((r) => r.role === role);
    const documents = [...(release?.documents ?? [])]
      .map((doc) => canonicalJson(doc))
      .sort();
    return { role, name: release?.name ?? null, documents };
  });
  return createHash('sha256').update(canonicalJson(projection)).digest('hex');
}

const STRUCTURAL_REASON_ABSENT_NAMESPACE = 'namespace-owner-label';

/**
 * Classify the observation against the exact admissible final rows. Only an
 * exactly one matched final row can be operational. Pending, foreign, mixed,
 * ambiguous, unreadable and colliding states are never public-ready.
 * @param {object} snapshot
 * @param {{ desired?: any, admissible?: any[], desiredUnavailableReason?: string | null }} artifactSet
 */
export function classifyOperationalInventory(snapshot, artifactSet) {
  const pendingFlag = snapshot?.pending === true;
  const base = (state, reasonCode, detail, extra = {}) => ({
    state,
    reasonCode,
    pending: pendingFlag,
    detail,
    artifactId: null,
    historyId: null,
    artifacts: null,
    structuralReady: false,
    desiredConverged: false,
    ...extra,
  });
  if (snapshot == null || artifactSet == null) {
    return base('unreadable', 'unreadable', 'missing-observation', {
      pending: false,
    });
  }
  const bundles = [...(artifactSet.admissible ?? []), artifactSet.desired].filter(
    Boolean,
  );
  const profileId =
    snapshot.profileId ?? bundles[0]?.profile?.id ?? null;
  if (
    typeof profileId !== 'string' ||
    bundles.length === 0 ||
    bundles.some((b) => b.profile?.id !== profileId)
  ) {
    return base('unreadable', 'unreadable', 'profile-mismatch');
  }
  if (Array.isArray(snapshot.legacy) && snapshot.legacy.length > 0) {
    return base('legacy', 'legacy', snapshot.legacy[0]?.name ?? 'legacy');
  }
  const namespace = bundles[0].profile?.namespaces?.observability;
  if (snapshot.namespace?.absent === true) {
    if (!pendingAdmitsPublicReadyOrAbsent(snapshot)) {
      return base('not-ready', 'pending', 'pending-blocks-absent', {
        pending: pendingBlocksPublicReady(snapshot) ? true : pendingFlag,
      });
    }
    const foreignPv = (snapshot.persistentVolumes ?? []).some(
      (pv) => pv?.spec?.claimRef?.namespace === namespace,
    );
    if (foreignPv || (snapshot.helmReleases ?? []).length > 0) {
      return base('not-ready', 'not-ready', 'absent-not-clean', {
        pending: false,
      });
    }
    if (findAbsentNamespaceRbacCollisions(snapshot).length > 0) {
      return base('not-ready', 'not-ready', 'absent-rbac-collision', {
        pending: false,
      });
    }
    return base('absent', 'absent', 'clean-absent', { pending: false });
  }
  const orphan = detectLegacyOrphans(snapshot);
  if (orphan) return base(orphan.state, orphan.reasonCode, orphan.detail);
  // Public pending is classified before any final readiness.
  if (pendingBlocksPublicReady(snapshot)) {
    return base('not-ready', 'pending', 'pending-blocks-public', {
      pending: true,
    });
  }
  const rows = ARTIFACT_HISTORY_ROWS.filter((r) => r.profileId === profileId);
  const matched = [];
  const refusals = [];
  for (const row of rows) {
    const result = assessHistoryShape(snapshot, artifactSet, row);
    if (result.ok) matched.push(row);
    else refusals.push(result);
  }
  if (matched.length > 1) {
    return base('not-ready', 'not-ready', 'ambiguous-history');
  }
  if (matched.length === 0) {
    if (refusals.length > 0 && refusals.every((r) => r.state === 'foreign')) {
      return base('foreign', 'foreign', refusals[0].detail);
    }
    if (
      refusals.length > 0 &&
      refusals.every((r) => r.detail === STRUCTURAL_REASON_ABSENT_NAMESPACE)
    ) {
      return base('foreign', 'foreign', STRUCTURAL_REASON_ABSENT_NAMESPACE);
    }
    return base('not-ready', 'not-ready', 'mixed-or-unmatched');
  }
  const row = matched[0];
  const artifacts = bundles.find((b) => b.artifactId === row.artifactId) ?? null;
  const identity = { artifactId: row.artifactId, historyId: row.id, artifacts };
  if (row.artifactId === 'dev-e1-base') {
    return base('not-ready', 'upgrade-required', 'upgrade-required', {
      ...identity,
    });
  }
  if (row.artifactId === 'dev-e1-developer') {
    return base('not-ready', 'upgrade-required', 'upgrade-required', {
      ...identity,
      structuralReady: true,
    });
  }
  const desiredConverged =
    artifactSet.desired != null &&
    artifactSet.desired.artifactId === row.artifactId;
  if (!desiredConverged) {
    return base('not-ready', 'not-ready', 'desired-mismatch', identity);
  }
  return base('ready', 'ready', 'ready', {
    ...identity,
    pending: false,
    structuralReady: true,
    desiredConverged: true,
  });
}

const UPGRADE_PHASE_MATRIX = Object.freeze([
  ['prometheus-intent', 'original', null],
  ['prometheus-intent', 'original', 'prometheus-intent'],
  ['grafana-intent', 'original', 'grafana-intent'],
  ['grafana-intent', 'e2-from', null],
  ['final-verification', 'e2-from', null],
]);
const ORIGINAL_HISTORY_IDS = Object.freeze(['developer-fresh', 'developer-upgraded']);
const E2_FROM_HISTORY_IDS = Object.freeze([
  'e2-from-developer-fresh',
  'e2-from-developer-upgraded',
]);

/**
 * Internal owned verifier (H04). Requires the actual active exclusive
 * custody handle; never a public admission and never authority acquisition.
 * @param {object | null | undefined} snapshot
 * @param {{ desired?: any, admissible?: any[] } | null} artifactSet
 * @param {{
 *   custody: { assertOwnPending: () => any },
 *   historyId: string,
 *   operationId: string,
 *   phase: string | null,
 *   namespaceUid: string,
 *   expectedOperation: 'upgrade-e2' | 'ensure',
 *   pendingPhase: string,
 * }} params
 */
export function verifyOwnedHistoryShape(snapshot, artifactSet, params) {
  const refuse = (detail) => ({ ok: false, detail });
  if (snapshot == null) return refuse('missing-snapshot');
  if (typeof params?.custody?.assertOwnPending !== 'function') {
    return refuse('missing-custody');
  }
  /** @type {any} */
  let record;
  try {
    record = params.custody.assertOwnPending();
  } catch {
    return refuse('custody-refused');
  }
  if (record == null || typeof record !== 'object' || Array.isArray(record)) {
    return refuse('custody-record-invalid');
  }
  const { expectedOperation, pendingPhase, historyId, operationId } = params;
  const phase = params.phase ?? null;
  if (expectedOperation !== 'upgrade-e2' && expectedOperation !== 'ensure') {
    return refuse('operation-unsupported');
  }
  if (typeof operationId !== 'string' || operationId.length === 0) {
    return refuse('operation-id-missing');
  }
  if (typeof params.namespaceUid !== 'string' || params.namespaceUid.length === 0) {
    return refuse('namespace-uid-missing');
  }
  if (record.schema !== 2) return refuse('record-schema');
  if (record.operation !== expectedOperation) return refuse('operation-mismatch');
  if (record.operationId !== operationId) return refuse('operation-id-mismatch');
  if (typeof pendingPhase !== 'string' || record.phase !== pendingPhase) {
    return refuse('phase-mismatch');
  }
  if (record.tuple?.targetNamespaceUid !== params.namespaceUid) {
    return refuse('namespace-uid-mismatch');
  }
  const snapshotUid =
    snapshot.namespace?.uid ?? snapshot.namespace?.object?.metadata?.uid;
  if (snapshotUid !== params.namespaceUid) {
    return refuse('snapshot-namespace-uid-mismatch');
  }
  if (snapshot.pending !== true || snapshot.pendingValid !== true) {
    return refuse('owned-pending-required');
  }
  if (phase !== null && phase !== pendingPhase) {
    return refuse('phase-pending-mismatch');
  }
  const target = artifactSet?.desired;
  if (target == null || target.artifactId !== 'dev-e2') {
    return refuse('e2-desired-unavailable');
  }
  const contextName = target.profile?.contextName;
  if (
    typeof contextName !== 'string' ||
    record.context !== contextName ||
    record.tuple?.profileId !== 'dev' ||
    snapshot.profileId !== 'dev'
  ) {
    return refuse('context-mismatch');
  }
  if (typeof historyId !== 'string') return refuse('history-id-missing');

  /** @type {object | undefined} */
  let row;
  if (expectedOperation === 'ensure') {
    if (
      pendingPhase !== 'obs-grafana' ||
      historyId !== 'e2-fresh' ||
      phase !== null
    ) {
      return refuse('phase-shape-pair');
    }
    if (
      record.details == null ||
      typeof record.details !== 'object' ||
      Object.keys(record.details).length !== 0
    ) {
      return refuse('ensure-details');
    }
    try {
      row = resolveHistoryRow('dev', historyId, null);
    } catch {
      return refuse('history-row-unknown');
    }
  } else {
    const kind = ORIGINAL_HISTORY_IDS.includes(historyId)
      ? 'original'
      : E2_FROM_HISTORY_IDS.includes(historyId)
        ? 'e2-from'
        : null;
    const permitted = UPGRADE_PHASE_MATRIX.some(
      ([pending, k, p]) => pending === pendingPhase && k === kind && p === phase,
    );
    if (!permitted) return refuse('phase-shape-pair');
    const originalId =
      kind === 'original' ? historyId : historyId.slice('e2-from-'.length);
    try {
      row = resolveHistoryRow('dev', historyId, phase);
    } catch {
      return refuse('history-row-unknown');
    }
    const predecessor = (artifactSet.admissible ?? []).find(
      (b) => b.artifactId === 'dev-e1-developer',
    );
    if (!predecessor) return refuse('predecessor-unavailable');
    const original = ARTIFACT_HISTORY_ROWS.find((r) => r.id === originalId);
    const details = record.details;
    if (details == null || typeof details !== 'object') {
      return refuse('upgrade-details');
    }
    const expectedDetails = {
      predecessorId: 'dev-e1-developer',
      predecessorHistoryId: originalId,
      targetId: 'dev-e2',
      predecessorManifestSetSha256: manifestSetSha256(predecessor),
      targetManifestSetSha256: manifestSetSha256(target),
      kubeletTrustBindingSha256: target.kubeletTrustBindingSha256,
      originalCollectorRevision: original.releases.collector.length,
      originalPrometheusRevision: 1,
      originalGrafanaRevision: 1,
      targetPrometheusRevision: 2,
      targetGrafanaRevision: 2,
    };
    for (const [name, value] of Object.entries(expectedDetails)) {
      if (details[name] !== value) return refuse(`details-${name}`);
    }
  }
  const shape = assessHistoryShape(snapshot, artifactSet, row);
  if (!shape.ok) return refuse(shape.detail ?? 'shape-refused');
  return {
    ok: true,
    detail: 'owned-history-shape',
    artifactId: row.artifactId ?? null,
    historyId,
    phase,
  };
}

const OBSERVATION_START_BUDGET_MS =
  OBSERVABILITY_ARTIFACT_BUDGET_MS + PREFLIGHT_BUDGET_MS + 10_000 + 30_000;

/**
 * @param {'dev' | 'release'} profileId
 * @param {{
 *   identity?: ReturnType<typeof captureIdentity>,
 *   artifacts?: ReturnType<typeof loadArtifacts>,
 *   predecessorArtifacts?: ReturnType<typeof loadArtifacts> | null,
 *   run?: typeof runPlatformCommand,
 *   now?: () => number,
 *   deadline?: number,
 *   readPending?: (contextName: string) => { pending: boolean, valid: boolean },
 *   verifyArchive?: boolean,
 *   onIdentityCaptured?: (identity: ReturnType<typeof captureIdentity>) => void,
 *   stateRoot?: string,
 * }} [deps]
 */
export function observeObservability(profileId, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const now = deps.now ?? (() => Date.now());
  const started = now();
  const absoluteCap = started + OBSERVABILITY_OBSERVATION_WORKER_MS;
  const effectiveDeadline = Math.min(deps.deadline ?? absoluteCap, absoluteCap);
  const ownsIdentity = deps.identity == null;
  let identity = deps.identity;

  /** @param {string} detail */
  const unreadable = (detail) => ({
    state: 'unreadable',
    reasonCode: 'unreadable',
    pending: false,
    detail,
  });

  if (effectiveDeadline <= started) {
    return unreadable('deadline');
  }

  try {
    const profile = readPlatformProfile(profileId);
    let artifacts = deps.artifacts;
    let predecessorArtifacts = deps.predecessorArtifacts ?? null;

    if (artifacts == null) {
      if (now() + OBSERVABILITY_ARTIFACT_BUDGET_MS > effectiveDeadline) {
        throw new Error('unreadable: deadline');
      }
      const variants = loadObservabilityVariants(profileId, {
        run,
        verifyArchive: deps.verifyArchive !== false,
      });
      artifacts = variants.desired;
      predecessorArtifacts = variants.predecessor;
    }

    if (ownsIdentity) {
      const identityDeadline = Math.min(
        started + OBSERVATION_START_BUDGET_MS,
        effectiveDeadline,
      );
      if (identityDeadline <= now()) {
        throw new Error('unreadable: deadline');
      }
      identity = captureIdentity(profileId, profile.contextName, {
        run,
        now,
        deadline: identityDeadline,
      });
      if (typeof deps.onIdentityCaptured === 'function') {
        deps.onIdentityCaptured(identity);
      }
    }

    const inventoryDeadline = Math.min(
      started + OBSERVATION_START_BUDGET_MS + INVENTORY_BUDGET_MS,
      effectiveDeadline,
    );
    if (inventoryDeadline <= now()) {
      throw new Error('unreadable: deadline');
    }

    const snapshot = collectInventory(identity, artifacts, {
      run,
      now,
      deadline: inventoryDeadline,
      stateRoot: deps.stateRoot,
      readPending:
        deps.readPending ??
        ((contextName) =>
          readPending(contextName, { stateRoot: deps.stateRoot })),
    });
    snapshot.profileId = profileId;

    const recheckDeadline = Math.min(
      inventoryDeadline + PREFLIGHT_BUDGET_MS,
      effectiveDeadline,
    );
    if (recheckDeadline <= now()) {
      throw new Error('unreadable: deadline');
    }

    const recheck = recheckIdentity(identity, {
      run,
      now,
      deadline: recheckDeadline,
      expectedNamespaceUid: identity.tuple.targetNamespaceUid,
    });
    if (!recheck.ok) {
      throw new Error(`unreadable: ${recheck.reason ?? 'identity-changed'}`);
    }

    const classified = classifyInventory(snapshot, artifacts, {
      predecessorArtifacts,
    });

    if (ownsIdentity) {
      if (now() >= effectiveDeadline) {
        throw new Error('unreadable: deadline');
      }
      const cleanup = identity.cleanup();
      if (!cleanup.ok) {
        throw new Error('unreadable: cleanup-failed');
      }
      if (now() > effectiveDeadline) {
        throw new Error('unreadable: deadline');
      }
    }

    return {
      ...classified,
      snapshot,
      identity: ownsIdentity ? undefined : identity,
    };
  } catch (error) {
    if (ownsIdentity && identity?.cleanup) {
      identity.cleanup();
    }
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith('unreadable:')) {
      return unreadable(message.replace(/^unreadable:\s*/, ''));
    }
    return unreadable(message);
  }
}


/**
 * Operational observation: one identity-bound bounded observation plus
 * recheck, classified against the exact admissible artifact set. Never
 * re-resolves desired afterwards; legacy observeObservability is unchanged.
 * @param {'dev' | 'release'} profileId
 * @param {{
 *   identity?: ReturnType<typeof captureIdentity>,
 *   artifactSet?: ReturnType<typeof loadOperationalArtifactSet>,
 *   readKubeletTrust?: (identity: any) => unknown,
 *   run?: typeof runPlatformCommand,
 *   trustRun?: (...args: any[]) => any,
 *   now?: () => number,
 *   deadline?: number,
 *   readPending?: (contextName: string) => { pending: boolean, valid: boolean },
 *   verifyArchive?: boolean,
 *   onIdentityCaptured?: (identity: ReturnType<typeof captureIdentity>) => void,
 *   stateRoot?: string,
 * }} [deps]
 */
export function observeOperationalObservability(profileId, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const now = deps.now ?? (() => Date.now());
  const started = now();
  const absoluteCap = started + OBSERVABILITY_OBSERVATION_WORKER_MS;
  const effectiveDeadline = Math.min(deps.deadline ?? absoluteCap, absoluteCap);
  const ownsIdentity = deps.identity == null;
  let identity = deps.identity;
  const empty = {
    artifactId: null,
    historyId: null,
    artifacts: null,
    structuralReady: false,
    desiredConverged: false,
  };
  /** @param {string} detail */
  const unreadable = (detail) => ({
    state: 'unreadable',
    reasonCode: 'unreadable',
    pending: false,
    detail,
    ...empty,
  });
  if (effectiveDeadline <= started) return unreadable('deadline');
  try {
    const profile = readPlatformProfile(profileId);
    if (ownsIdentity) {
      const identityDeadline = Math.min(
        started + OBSERVATION_START_BUDGET_MS,
        effectiveDeadline,
      );
      if (identityDeadline <= now()) throw new Error('unreadable: deadline');
      identity = captureIdentity(profileId, profile.contextName, {
        run,
        now,
        deadline: identityDeadline,
      });
      if (typeof deps.onIdentityCaptured === 'function') {
        deps.onIdentityCaptured(identity);
      }
    }
    let artifactSet = deps.artifactSet;
    if (artifactSet == null) {
      if (now() + OBSERVABILITY_ARTIFACT_BUDGET_MS > effectiveDeadline) {
        throw new Error('unreadable: deadline');
      }
      const trustReader =
        profileId === 'dev'
          ? () =>
              deps.readKubeletTrust
                ? deps.readKubeletTrust(identity)
                : readDevKubeletTrust(identity, {
                    ...(deps.trustRun ? { run: deps.trustRun } : {}),
                    now,
                    deadline: Math.min(
                      now() + PREFLIGHT_BUDGET_MS,
                      effectiveDeadline,
                    ),
                  })
          : undefined;
      artifactSet = loadOperationalArtifactSet(profileId, {
        run,
        verifyArchive: deps.verifyArchive !== false,
        ...(trustReader ? { readKubeletTrust: trustReader } : {}),
      });
    }
    const inventoryArtifacts =
      artifactSet.desired ??
      [...(artifactSet.admissible ?? [])].reverse()[0] ??
      null;
    if (inventoryArtifacts == null) throw new Error('unreadable: artifacts');

    const inventoryDeadline = Math.min(
      started + OBSERVATION_START_BUDGET_MS + INVENTORY_BUDGET_MS,
      effectiveDeadline,
    );
    if (inventoryDeadline <= now()) throw new Error('unreadable: deadline');
    const snapshot = collectInventory(identity, inventoryArtifacts, {
      run,
      now,
      deadline: inventoryDeadline,
      stateRoot: deps.stateRoot,
      staticInventory: artifactSet.staticInventory ?? undefined,
      readPending:
        deps.readPending ??
        ((contextName) =>
          readPending(contextName, { stateRoot: deps.stateRoot })),
    });
    snapshot.profileId = profileId;
    const recheckDeadline = Math.min(
      inventoryDeadline + PREFLIGHT_BUDGET_MS,
      effectiveDeadline,
    );
    if (recheckDeadline <= now()) throw new Error('unreadable: deadline');
    const recheck = recheckIdentity(identity, {
      run,
      now,
      deadline: recheckDeadline,
      expectedNamespaceUid: identity.tuple.targetNamespaceUid,
    });
    if (!recheck.ok) {
      throw new Error(`unreadable: ${recheck.reason ?? 'identity-changed'}`);
    }
    const classified = classifyOperationalInventory(snapshot, artifactSet);
    if (ownsIdentity) {
      if (now() >= effectiveDeadline) throw new Error('unreadable: deadline');
      const cleanup = identity.cleanup();
      if (!cleanup.ok) throw new Error('unreadable: cleanup-failed');
      if (now() > effectiveDeadline) throw new Error('unreadable: deadline');
    }
    return {
      ...classified,
      ...(artifactSet.desiredUnavailableReason
        ? { desiredUnavailableReason: artifactSet.desiredUnavailableReason }
        : {}),
      snapshot,
      identity: ownsIdentity ? undefined : identity,
    };
  } catch (error) {
    if (ownsIdentity && identity?.cleanup) identity.cleanup();
    const message = error instanceof Error ? error.message : String(error);
    return unreadable(message.replace(/^unreadable:\s*/, ''));
  }
}
