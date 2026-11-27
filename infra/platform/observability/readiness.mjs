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
} from './inventory.mjs';
import { readPending } from './custody.mjs';
import { loadArtifacts, loadObservabilityVariants } from './artifacts.mjs';
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
function verifyHelmStorageBijection(snapshot, artifacts) {
  const namespace = artifacts.profile?.namespaces?.observability;
  const expected = new Map();
  for (const row of snapshot.helmReleases ?? []) {
    const revision = Number.parseInt(String(row.revision), 10);
    if (!Number.isFinite(revision) || revision < 1) {
      return { ok: false, detail: 'helm-storage-revision' };
    }
    expected.set(row.name, `sh.helm.release.v1.${row.name}.v${revision}`);
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
  const shape = assessShape(snapshot, desired, { collectorVariant: variant });
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
  if (completedReleasePhases.length === EXPECTED_HELM_RELEASES.length) {
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
