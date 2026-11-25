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
  const plan = planDevCnpg(probe, options);
  if (!options.authorize) {
    return {
      ...plan,
      mode: 'ensure',
      readOnly: false,
      ok: false,
      mutated: false,
      refusals: [
        ...plan.refusals,
        {
          id: 'ensure-not-authorized',
          detail: 'live CNPG ensure was not authorized',
        },
      ],
    };
  }
  if (plan.refusals.length > 0 || !plan.clusterManifest) {
    return {
      ...plan,
      mode: 'ensure',
      readOnly: false,
      ok: false,
      mutated: false,
    };
  }
  if (
    options.operatorManifestSha256 &&
    options.operatorManifestSha256 !== probe.pin.sha256
  ) {
    return {
      ...plan,
      mode: 'ensure',
      readOnly: false,
      ok: false,
      mutated: false,
      refusals: [
        {
          id: 'operator-manifest-sha-mismatch',
          detail: 'downloaded operator manifest does not match operator.pin',
        },
      ],
    };
  }
  const liveCluster = (probe.resources ?? []).find(
    (item) => item.kind === 'Cluster' && item.name === DEV_CNPG_CLUSTER,
  );
  const storageDrift = Boolean(
    liveCluster?.storageClass && liveCluster.storageClass !== DEV_STORAGE_CLASS,
  );
  if (storageDrift) {
    return {
      ...plan,
      mode: 'ensure',
      readOnly: false,
      ok: false,
      mutated: false,
      refusals: [
        ...plan.refusals,
        {
          id: 'storage-class-drift',
          detail: `cluster storage class is ${liveCluster.storageClass}, expected ${DEV_STORAGE_CLASS}`,
        },
      ],
      actions: [],
    };
  }
  if (plan.namespaceState === 'owned' && plan.clusterState === 'owned') {
    return {
      ...plan,
      mode: 'ensure',
      readOnly: false,
      ok: true,
      mutated: false,
      actions: [{ op: 'noop' }],
    };
  }
  const crdState = probe.crdState ?? 'unknown';
  const operatorPresent = (probe.resources ?? []).some(
    (item) =>
      item.kind === 'Deployment' && item.name === 'cnpg-controller-manager',
  );
  if (
    plan.clusterState === 'absent' &&
    crdState === 'absent' &&
    operatorPresent
  ) {
    return {
      ...plan,
      mode: 'ensure',
      readOnly: false,
      ok: false,
      mutated: false,
      refusals: [
        ...plan.refusals,
        {
          id: 'crd-absent-with-operator',
          detail:
            'cluster CRD is absent while the operator deployment is already present',
        },
      ],
      actions: [],
    };
  }
  /** @type {{ op: string, context: string, [key: string]: unknown }[]} */
  const actions = [];
  const context = DEV_CNPG_CONTEXT;
  const needsOperatorApply = !(
    plan.operatorImage &&
    probe.resources?.some(
      (item) =>
        item.kind === 'Deployment' &&
        item.name === 'cnpg-controller-manager' &&
        item.image === plan.operatorImage,
    )
  );
  if (!needsOperatorApply) {
    actions.push({ op: 'verify-operator', context, image: plan.operatorImage });
  } else {
    actions.push({
      op: 'apply-operator',
      context,
      image: plan.operatorImage,
      sha256: probe.pin.sha256,
      args: [
        '--context',
        context,
        'apply',
        '--server-side',
        '--field-manager=offscreen-dev-cnpg',
        '-f',
        '-',
      ],
    });
    actions.push({
      op: 'wait-established-crd',
      context,
      args: [
        'wait',
        '--for=condition=Established',
        'crd/clusters.postgresql.cnpg.io',
        '--timeout=180s',
      ],
    });
    actions.push({
      op: 'wait-operator-rollout',
      context,
      args: [
        '-n',
        'cnpg-system',
        'rollout',
        'status',
        'deployment/cnpg-controller-manager',
        '--timeout=240s',
      ],
    });
  }
  if (options.failAfterOperator) {
    return {
      ...plan,
      mode: 'ensure',
      readOnly: false,
      ok: false,
      mutated: true,
      refusals: [
        {
          id: 'partial-operator',
          detail: 'cluster was not applied; owned data was not deleted',
        },
      ],
      actions,
    };
  }
  if (options.failOperatorWaits) {
    return {
      ...plan,
      mode: 'ensure',
      readOnly: false,
      ok: false,
      mutated: true,
      refusals: [
        {
          id: 'operator-readiness-failed',
          detail: 'operator CRD or rollout did not become ready',
        },
      ],
      actions,
    };
  }
  if (plan.namespaceState !== 'owned') {
    actions.push({
      op: 'apply-namespace',
      context,
      manifest: plan.namespaceManifest,
      args: ['--context', context, 'apply', '-f', '-'],
    });
  }
  if (plan.clusterState !== 'owned') {
    actions.push({
      op: 'apply-cluster',
      context,
      manifest: plan.clusterManifest,
      args: ['--context', context, 'apply', '-f', '-'],
    });
  }
  const touchesRelease = actions.some((action) =>
    JSON.stringify(action).includes(RELEASE_CNPG_NAMESPACE),
  );
  return {
    ...plan,
    mode: 'ensure',
    readOnly: false,
    ok: !touchesRelease,
    mutated: actions.some(
      (action) => action.op !== 'verify-operator' && action.op !== 'noop',
    ),
    actions,
  };
}
