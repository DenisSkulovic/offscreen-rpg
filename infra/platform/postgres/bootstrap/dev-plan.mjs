import { previewBaselineEnsure } from './preview.mjs';
import { runPlatformCommand } from '../../common/commands.mjs';
import { renderPlatformDocuments } from '../../common/render.mjs';
import { formatManifestDocuments } from '../../common/manifest-output.mjs';
import {
  DEV_CNPG_CONTEXT,
  DEV_CNPG_CLUSTER,
  DEV_CNPG_CLUSTER_NAME,
  DEV_CNPG_NAMESPACE,
  DEV_CNPG_OWNER,
  DEV_CNPG_MAX_CONNECTIONS,
  DEV_CNPG_POOL_CAP,
  DEV_CNPG_MIN_MEMORY_MIB,
  DEV_STORAGE_CLASS,
  RELEASE_CNPG_NAMESPACE,
  RELEASE_CNPG_CLUSTER,
} from '../config.mjs';

/**
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function renderDevCnpgNamespace(deps = {}) {
  const docs = renderPlatformDocuments(
    { service: 'postgres', profile: 'dev', section: 'namespace' },
    { run: deps.run ?? runPlatformCommand },
  );
  return formatManifestDocuments(docs, 'yaml');
}

/**
 * @param {{ postgresImage: string }} pin
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function renderDevCnpgCluster(pin, deps = {}) {
  void pin;
  const docs = renderPlatformDocuments(
    { service: 'postgres', profile: 'dev', section: 'cluster' },
    { run: deps.run ?? runPlatformCommand },
  );
  return formatManifestDocuments(docs, 'yaml');
}

/**
 * @param {object} probe
 */
function renderManifests(probe, deps = {}) {
  if (!probe.pin?.postgresImage)
    return { namespaceManifest: null, clusterManifest: null };
  try {
    return {
      namespaceManifest: renderDevCnpgNamespace(deps),
      clusterManifest: renderDevCnpgCluster(probe.pin, deps),
    };
  } catch {
    return { namespaceManifest: null, clusterManifest: null };
  }
}

/**
 * @param {{ owner?: string, uid?: string } | undefined} resource
 * @returns {'absent' | 'owned' | 'foreign'}
 */
function classify(resource) {
  if (!resource) return 'absent';
  if (resource.owner === DEV_CNPG_OWNER && resource.uid) return 'owned';
  return 'foreign';
}

/**
 * @param {object} probe
 */
export function assessDevCnpg(probe) {
  if (probe.fullAssessment) {
    const state = probe.fullAssessment;
    const project = value => value === 'absent' ? 'absent' :
      ['compatible', 'ready', 'pending'].includes(value) ? 'owned' :
      value === 'incompatible' ? 'foreign' : 'unknown';
    return {
      refusals: Array.isArray(state.refusals) ? state.refusals : [{ id: 'invalid-observation', detail: 'Missing refusal classification' }],
      pin: probe.pin,
      namespace: project(state.namespace),
      cluster: project(state.cluster),
      operatorPresent: state.operator !== 'absent' && state.operator !== 'unknown',
      operatorMatches: ['ready', 'pending'].includes(state.operator),
      crdState: probe.crdState,
    };
  }

  /** @type {{ id: string, detail: string }[]} */
  const refusals = [];
  const unreadable = probe.unreadableReads ?? [];
  if (unreadable.length > 0) {
    refusals.push({
      id: 'unreadable-observation',
      detail: unreadable.map((item) => item.id).join(', '),
    });
  }
  if (probe.context !== DEV_CNPG_CONTEXT) {
    refusals.push({
      id: 'wrong-context',
      detail: `kubectl context is ${probe.context ?? 'unset'}`,
    });
  }
  if (probe.clusterName !== DEV_CNPG_CLUSTER_NAME) {
    refusals.push({
      id: 'wrong-cluster',
      detail: `cluster is ${probe.clusterName ?? 'unset'}`,
    });
  }
  if (
    probe.apiServer &&
    !String(probe.apiServer).startsWith('https://127.0.0.1:')
  ) {
    refusals.push({
      id: 'api-not-loopback',
      detail: 'dev API is not a loopback endpoint',
    });
  }
  if (probe.baselineOwner !== DEV_CNPG_OWNER) {
    refusals.push({
      id: 'baseline-unowned',
      detail: 'dev baseline namespace owner was not verified',
    });
  }
  if (!probe.dockerAvailable || !probe.kindAvailable) {
    refusals.push({
      id: 'runtime-unavailable',
      detail: 'docker or kind is not available',
    });
  }
  if ((probe.timedOutCommands ?? []).length > 0) {
    refusals.push({
      id: 'command-timeout',
      detail: probe.timedOutCommands.join(', '),
    });
  }
  if ((probe.memoryMiB ?? 0) < DEV_CNPG_MIN_MEMORY_MIB) {
    refusals.push({
      id: 'insufficient-memory',
      detail: `available memory ${probe.memoryMiB ?? 0}MiB is below ${DEV_CNPG_MIN_MEMORY_MIB}MiB`,
    });
  }
  let pin = probe.pin ?? null;
  if (
    !pin ||
    !/^[0-9a-f]{64}$/.test(pin.sha256 ?? '') ||
    !pin.operatorImage ||
    !pin.postgresImage
  ) {
    refusals.push({
      id: 'unverified-pin',
      detail: 'CNPG operator pin is missing or invalid',
    });
    pin = null;
  }
  const resources = probe.resources ?? [];
  const namespace = resources.find(
    (item) => item.kind === 'Namespace' && item.name === DEV_CNPG_NAMESPACE,
  );
  const cluster = resources.find(
    (item) => item.kind === 'Cluster' && item.name === DEV_CNPG_CLUSTER,
  );
  const operator = resources.find(
    (item) =>
      item.kind === 'Deployment' && item.name === 'cnpg-controller-manager',
  );
  if (classify(namespace) === 'foreign') {
    refusals.push({
      id: 'foreign-namespace',
      detail: `${DEV_CNPG_NAMESPACE} exists without dev ownership`,
    });
  }
  if (classify(cluster) === 'foreign') {
    refusals.push({
      id: 'foreign-cluster',
      detail: `${DEV_CNPG_CLUSTER} exists without dev ownership`,
    });
  }
  if (operator && pin && operator.image !== pin.operatorImage) {
    refusals.push({
      id: 'operator-image-mismatch',
      detail: `operator image is ${operator.image}`,
    });
  }
  const crdState = probe.crdState ?? 'unknown';
  if (crdState === 'present' && !operator) {
    refusals.push({
      id: 'crd-without-operator',
      detail:
        'clusters.postgresql.cnpg.io CRD is present but the operator deployment is absent',
    });
  }
  if (
    resources.some(
      (item) =>
        item.namespace === RELEASE_CNPG_NAMESPACE ||
        item.name === RELEASE_CNPG_NAMESPACE ||
        item.name === RELEASE_CNPG_CLUSTER,
    )
  ) {
    refusals.push({
      id: 'release-resource-in-probe',
      detail: 'release CNPG resource was included in the dev probe',
    });
  }
  return {
    refusals,
    pin,
    namespace: classify(namespace),
    cluster: classify(cluster),
    operatorPresent: Boolean(operator),
    crdState,
  };
}

/**
 * @param {object} probe
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function planDevCnpg(probe, deps = {}) {
  const assessment = assessDevCnpg(probe);
  const manifests = assessment.pin
    ? renderManifests(probe, deps)
    : { namespaceManifest: null, clusterManifest: null };
  return {
    mode: 'plan',
    readOnly: true,
    context: DEV_CNPG_CONTEXT,
    namespace: DEV_CNPG_NAMESPACE,
    cluster: DEV_CNPG_CLUSTER,
    maxConnections: DEV_CNPG_MAX_CONNECTIONS,
    poolCap: DEV_CNPG_POOL_CAP,
    memoryRequest: '384Mi',
    memoryLimit: '1Gi',
    storage: '2Gi',
    operatorImage: assessment.pin?.operatorImage ?? null,
    postgresImage: assessment.pin?.postgresImage ?? null,
    namespaceManifest: manifests.namespaceManifest,
    clusterManifest: manifests.clusterManifest,
    namespaceState: assessment.namespace,
    clusterState: assessment.cluster,
    refusals: assessment.refusals,
    actions: [],
  };
}

/**
 * @param {object} probe
 */
export function statusDevCnpg(probe) {
  const assessment = assessDevCnpg(probe);
  return {
    mode: 'status',
    readOnly: true,
    context: probe.context ?? null,
    namespace: assessment.namespace,
    cluster: assessment.cluster,
    operatorPresent: assessment.operatorPresent,
    refusals: assessment.refusals,
    actions: [],
  };
}

/**
 * @param {object} probe
 * @param {{ authorize?: boolean, operatorManifestSha256?: string, failAfterOperator?: boolean, failOperatorWaits?: boolean, run?: typeof runPlatformCommand }} [options]
 */
export function ensureDevCnpg(probe, options = {}) {
  return previewBaselineEnsure(planDevCnpg(probe, options), probe, options);
}
