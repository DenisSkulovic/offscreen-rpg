import { previewBaselineEnsure } from './preview.mjs';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPlatformCommand } from '../../common/commands.mjs';
import {
  renderPlatformDocuments,
  renderPlatformYaml,
} from '../../common/render.mjs';
import {
  RELEASE_CNPG_CLUSTER,
  RELEASE_CNPG_NAMESPACE,
  parseCnpgPin,
  RELEASE_CNPG_CONTEXT,
  RELEASE_CNPG_CLUSTER_NAME,
  RELEASE_LAB_LABEL_VALUE,
  RELEASE_CNPG_MIN_MEMORY_MIB,
  RELEASE_OPERATOR_FIELD_MANAGER,
} from '../config.mjs';
import {
  assertPositiveCnpgInstances,
  resolveExpectedCnpgInstances,
} from '../cluster-readiness.mjs';

const postgresRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const operatorPinPath = join(postgresRoot, 'operator.pin');

export function assertReleaseClusterPin(documents, pin) {
  if (
    documents.length !== 1 ||
    documents[0]?.kind !== 'Cluster' ||
    documents[0]?.metadata?.name !== RELEASE_CNPG_CLUSTER ||
    documents[0]?.metadata?.namespace !== RELEASE_CNPG_NAMESPACE
  ) {
    throw new Error('unexpected rendered release PostgreSQL cluster identity');
  }
  const spec = documents[0].spec;
  if (spec?.imageName !== pin.postgresImage) {
    throw new Error('rendered cluster imageName does not match operator.pin');
  }
  assertPositiveCnpgInstances(spec?.instances);
}

/**
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function renderReleaseManifests(deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const namespaceDocs = renderPlatformDocuments(
    { service: 'postgres', profile: 'release', section: 'namespace' },
    { run },
  );
  const clusterDocs = renderPlatformDocuments(
    { service: 'postgres', profile: 'release', section: 'cluster' },
    { run },
  );
  assertReleaseClusterPin(
    clusterDocs,
    parseCnpgPin(readFileSync(operatorPinPath, 'utf8')),
  );
  return {
    namespaceManifest: renderPlatformYaml(namespaceDocs),
    clusterManifest: renderPlatformYaml(clusterDocs),
    expectedCluster: clusterDocs[0],
  };
}

/**
 * @param {object | undefined} resource
 * @returns {'absent' | 'compatible' | 'foreign'}
 */
function classifyNamespace(resource) {
  if (!resource) return 'absent';
  if (
    resource.name === RELEASE_CNPG_NAMESPACE &&
    resource.labLabel === RELEASE_LAB_LABEL_VALUE
  ) {
    return 'compatible';
  }
  return 'foreign';
}

/**
 * @param {object | undefined} resource
 * @param {object} expected
 * @returns {'absent' | 'compatible' | 'foreign'}
 */
function classifyCluster(resource, expected) {
  if (!resource) return 'absent';
  const initdb = expected.spec?.bootstrap?.initdb;
  const storage = expected.spec?.storage;
  const matches =
    resource.name === RELEASE_CNPG_CLUSTER &&
    resource.namespace === RELEASE_CNPG_NAMESPACE &&
    resource.image === expected.spec?.imageName &&
    resource.storageClass === storage?.storageClass &&
    resource.storageSize === storage?.size &&
    resource.bootstrap?.database === initdb?.database &&
    resource.bootstrap?.owner === initdb?.owner &&
    resource.bootstrap?.localeCType === initdb?.localeCType &&
    resource.bootstrap?.localeCollate === initdb?.localeCollate;
  return matches ? 'compatible' : 'foreign';
}

/**
 * @param {object} probe
 * @param {object} expectedCluster
 */
export function assessReleaseCnpg(probe, expectedCluster) {
  if (probe.fullAssessment) {
    const state = probe.fullAssessment;
    const project = value => value === 'absent' ? 'absent' :
      ['compatible', 'ready', 'pending'].includes(value) ? 'compatible' :
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
  if (probe.context !== RELEASE_CNPG_CONTEXT) {
    refusals.push({
      id: 'wrong-context',
      detail: `kubectl context is ${probe.context ?? 'unset'}`,
    });
  }
  if (probe.clusterName !== RELEASE_CNPG_CLUSTER_NAME) {
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
      detail: 'release API is not a loopback endpoint',
    });
  }
  if ((probe.timedOutCommands ?? []).length > 0) {
    refusals.push({
      id: 'command-timeout',
      detail: probe.timedOutCommands.join(', '),
    });
  }
  if ((probe.memoryMiB ?? 0) < RELEASE_CNPG_MIN_MEMORY_MIB) {
    refusals.push({
      id: 'insufficient-memory',
      detail: `available memory ${probe.memoryMiB ?? 0}MiB is below ${RELEASE_CNPG_MIN_MEMORY_MIB}MiB`,
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
    (item) => item.kind === 'Namespace' && item.name === RELEASE_CNPG_NAMESPACE,
  );
  const cluster = resources.find(
    (item) => item.kind === 'Cluster' && item.name === RELEASE_CNPG_CLUSTER,
  );
  const operator = resources.find(
    (item) =>
      item.kind === 'Deployment' && item.name === 'cnpg-controller-manager',
  );
  if (classifyNamespace(namespace) === 'foreign') {
    refusals.push({
      id: 'foreign-namespace',
      detail: `${RELEASE_CNPG_NAMESPACE} exists without the disposable lab label`,
    });
  }
  const clusterState = classifyCluster(cluster, expectedCluster);
  if (clusterState === 'foreign') {
    refusals.push({
      id: 'cluster-spec-mismatch',
      detail: `${RELEASE_CNPG_CLUSTER} exists with incompatible image, storage, or bootstrap identity`,
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
  return {
    refusals,
    pin,
    namespace: classifyNamespace(namespace),
    cluster: clusterState,
    operatorPresent: Boolean(operator),
    operatorMatches: Boolean(
      operator && pin && operator.image === pin.operatorImage,
    ),
    crdState,
  };
}

/**
 * @param {object} probe
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function planReleaseCnpg(probe, deps = {}) {
  const manifests = renderReleaseManifests(deps);
  const assessment = assessReleaseCnpg(probe, manifests.expectedCluster);
  const expectedInstances = probe.fullAssessment?.observedInstances ?? resolveExpectedCnpgInstances(
    assessment.cluster,
    manifests.expectedCluster,
    probe,
    RELEASE_CNPG_CLUSTER,
  );
  return {
    mode: 'plan',
    readOnly: true,
    context: RELEASE_CNPG_CONTEXT,
    namespace: RELEASE_CNPG_NAMESPACE,
    cluster: RELEASE_CNPG_CLUSTER,
    expectedInstances,
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
 * @param {{ authorize?: boolean, operatorManifestSha256?: string, failOperatorWaits?: boolean, failClusterWait?: boolean, run?: typeof runPlatformCommand }} [options]
 */
export function ensureReleaseCnpg(probe, options = {}) {
  return previewBaselineEnsure(planReleaseCnpg(probe, options), probe, options);
}
