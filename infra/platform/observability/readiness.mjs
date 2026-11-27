import { isDeepStrictEqual } from 'node:util';
import { runPlatformCommand } from '../common/commands.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import {
  CLEANUP_BUDGET_MS,
  captureIdentity,
  recheckIdentity,
  INVENTORY_BUDGET_MS,
  PREFLIGHT_BUDGET_MS,
} from './identity.mjs';
import {
  GRAFANA_ADMIN_REQUIRED_KEYS,
  GRAFANA_ADMIN_SECRET,
  collectInventory,
  EXPECTED_HELM_RELEASES,
} from './inventory.mjs';
import { readPending } from './custody.mjs';
import { loadArtifacts } from './artifacts.mjs';

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
 */
function structuralReady(snapshot, artifacts) {
  if (snapshot.namespace?.absent) {
    return {
      ok: false,
      state: 'not-ready',
      reasonCode: 'not-ready',
      detail: 'empty-namespace-present',
    };
  }
  const direct = assessDirectInventory(snapshot, artifacts);
  if (!direct.ok) {
    return direct;
  }
  const helmCheck = verifyHelmRevisions(snapshot.helmReleases ?? []);
  if (!helmCheck.ok) {
    return {
      ok: false,
      state: 'not-ready',
      reasonCode: 'not-ready',
      detail: helmCheck.detail,
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

export function classifyInventory(snapshot, artifacts) {
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
    if (snapshot.pending === false) {
      return {
        state: 'absent',
        reasonCode: 'absent',
        pending: false,
        detail: 'clean-absent',
      };
    }
    return {
      state: 'not-ready',
      reasonCode: 'pending',
      pending: snapshot.pending !== false,
      detail: 'pending-blocks-absent',
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

  const ready = structuralReady(snapshot, artifacts);
  if (!ready.ok) {
    return {
      state: ready.state ?? 'not-ready',
      reasonCode: ready.reasonCode ?? 'not-ready',
      pending: pendingFlag,
      detail: ready.detail ?? 'not-ready',
    };
  }

  if (pendingFlag) {
    return {
      state: 'ready',
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
 * @param {'dev' | 'release'} profileId
 * @param {{
 *   identity?: ReturnType<typeof captureIdentity>,
 *   artifacts?: ReturnType<typeof loadArtifacts>,
 *   run?: typeof runPlatformCommand,
 *   now?: () => number,
 *   deadline?: number,
 *   readPending?: (contextName: string) => { pending: boolean, valid: boolean },
 *   verifyArchive?: boolean,
 *   onIdentityCaptured?: (identity: ReturnType<typeof captureIdentity>) => void,
 * }} [deps]
 */
export function observeObservability(profileId, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const now = deps.now ?? (() => Date.now());
  const started = now();
  const ownsIdentity = deps.identity == null;
  let identity = deps.identity;

  try {
    const profile = readPlatformProfile(profileId);
    const artifacts =
      deps.artifacts ??
      loadArtifacts(profileId, {
        run,
        verifyArchive: deps.verifyArchive !== false,
      });

    if (ownsIdentity) {
      const preflightDeadline = started + PREFLIGHT_BUDGET_MS;
      identity = captureIdentity(profileId, profile.contextName, {
        run,
        now,
        deadline: preflightDeadline,
      });
      if (typeof deps.onIdentityCaptured === 'function') {
        deps.onIdentityCaptured(identity);
      }
    }

    const inventoryDeadline =
      deps.deadline ?? started + PREFLIGHT_BUDGET_MS + INVENTORY_BUDGET_MS;
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

    const recheck = recheckIdentity(identity, {
      run,
      now,
      deadline: inventoryDeadline,
      expectedNamespaceUid: identity.tuple.targetNamespaceUid,
    });
    if (!recheck.ok) {
      throw new Error(`unreadable: ${recheck.reason ?? 'identity-changed'}`);
    }

    const classified = classifyInventory(snapshot, artifacts);

    if (ownsIdentity) {
      const cleanupDeadline = inventoryDeadline + CLEANUP_BUDGET_MS;
      if (now() > cleanupDeadline) {
        throw new Error('unreadable: cleanup-deadline');
      }
      const cleanup = identity.cleanup();
      if (!cleanup.ok) {
        throw new Error('unreadable: cleanup-failed');
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
      return {
        state: 'unreadable',
        reasonCode: 'unreadable',
        pending: false,
        detail: message.replace(/^unreadable:\s*/, ''),
      };
    }
    return {
      state: 'unreadable',
      reasonCode: 'unreadable',
      pending: false,
      detail: message,
    };
  }
}
