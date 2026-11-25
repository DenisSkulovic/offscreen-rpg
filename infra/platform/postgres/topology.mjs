import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertPlatformTarget,
  readPlatformObject,
  runPlatformCommand,
  RELEASE_BASELINE_NAMESPACE,
} from '../common/commands.mjs';
import { renderPlatformDocuments } from '../common/render.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import {
  DEV_BASELINE_NAMESPACE,
  DEV_CLUSTER_OWNER,
} from '../../clusters/kind/manager/dev-bootstrap.mjs';
import {
  DEV_CNPG_CLUSTER,
  DEV_CNPG_MIN_MEMORY_MIB,
  DEV_CNPG_OWNER,
  RELEASE_CNPG_CLUSTER,
  RELEASE_CNPG_NAMESPACE,
  parseCnpgPin,
} from './dev-bootstrap.mjs';
import {
  RELEASE_CNPG_MIN_MEMORY_MIB,
  RELEASE_LAB_LABEL_KEY,
  RELEASE_LAB_LABEL_VALUE,
} from './release-install.mjs';

const postgresRoot = dirname(fileURLToPath(import.meta.url));
const operatorPinPath = join(postgresRoot, 'operator.pin');

export const CNPG_HEALTHY_PHASE = 'Cluster in healthy state';
export const TOPOLOGY_READINESS_TIMEOUT_MS = 600_000;
export const TOPOLOGY_READINESS_POLL_MS = 5_000;
export const CNPG_OPERATOR_DEPLOYMENT = 'cnpg-controller-manager';
export const CNPG_OPERATOR_NAMESPACE = 'cnpg-system';
export const CNPG_CRD_NAME = 'clusters.postgresql.cnpg.io';

/** @typedef {'plan' | 'ensure' | 'status'} TopologyCommand */
/** @typedef {'dev' | 'release'} TopologyEnv */

/**
 * @param {unknown} value
 */
export function assertPositiveCnpgInstances(value) {
  if (!Number.isInteger(value) || value < 1 || !Number.isSafeInteger(value)) {
    throw new Error(
      'rendered cluster must request a positive safe integer instance count',
    );
  }
}

/**
 * Pure CNPG Cluster topology readiness: instance counts aligned, Ready, healthy phase, primary named.
 * @param {object | null | undefined} cluster
 * @param {number} expectedInstances
 * @returns {{ ok: true, currentPrimary: string } | { ok: false, detail: string }}
 */
export function assessCnpgClusterTopologyReadiness(cluster, expectedInstances) {
  if (!cluster || typeof cluster !== 'object') {
    return { ok: false, detail: 'cluster object is missing' };
  }
  if (!Number.isInteger(expectedInstances) || expectedInstances < 1) {
    return {
      ok: false,
      detail: `expected instance count is invalid: ${String(expectedInstances)}`,
    };
  }

  const specInstances = cluster.spec?.instances;
  if (specInstances !== expectedInstances) {
    return {
      ok: false,
      detail: `spec.instances is ${specInstances ?? 'unknown'}, expected ${expectedInstances}`,
    };
  }

  const statusInstances = cluster.status?.instances;
  if (statusInstances !== expectedInstances) {
    return {
      ok: false,
      detail: `status.instances is ${statusInstances ?? 'unknown'}, expected ${expectedInstances}`,
    };
  }

  const readyInstances = cluster.status?.readyInstances;
  if (readyInstances !== expectedInstances) {
    return {
      ok: false,
      detail: `status.readyInstances is ${readyInstances ?? 'unknown'}, expected ${expectedInstances}`,
    };
  }

  const conditions = Array.isArray(cluster.status?.conditions)
    ? cluster.status.conditions
    : [];
  const readyCondition = conditions.find((item) => item?.type === 'Ready');
  if (readyCondition?.status !== 'True') {
    return { ok: false, detail: 'cluster Ready condition is not True' };
  }

  const phase = cluster.status?.phase;
  if (phase !== CNPG_HEALTHY_PHASE) {
    return {
      ok: false,
      detail: `cluster phase is ${phase ?? 'unknown'}, not healthy`,
    };
  }

  const currentPrimary = cluster.status?.currentPrimary;
  if (typeof currentPrimary !== 'string' || currentPrimary.length === 0) {
    return { ok: false, detail: 'cluster currentPrimary is missing' };
  }

  return { ok: true, currentPrimary };
}

/**
 * @param {'absent' | 'compatible' | 'foreign'} clusterState
 * @param {object} expectedCluster rendered baseline cluster document
 * @param {object} probe host-collected probe
 * @param {string} clusterName
 * @returns {number}
 */
export function resolveExpectedCnpgInstances(
  clusterState,
  expectedCluster,
  probe,
  clusterName,
) {
  const live = (probe.resources ?? []).find(
    (item) => item.kind === 'Cluster' && item.name === clusterName,
  );
  if (
    clusterState === 'compatible' &&
    live?.instances != null &&
    Number.isInteger(live.instances) &&
    live.instances >= 1
  ) {
    return live.instances;
  }
  return expectedCluster.spec?.instances;
}

/**
 * @param {string} text
 */
export function parseCanonicalPositiveInteger(text) {
  if (typeof text !== 'string' || !/^[1-9]\d*$/.test(text)) {
    throw new Error('instances must be a canonical positive integer');
  }
  const value = Number(text);
  if (!Number.isSafeInteger(value)) {
    throw new Error('instances must be a safe integer');
  }
  return value;
}

/**
 * @param {string} value
 * @returns {number}
 */
export function parseKubernetesMemoryToMib(value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('memory quantity must be a string');
  }
  const match = value.match(/^(\d+)(Mi|Gi)$/);
  if (!match) {
    throw new Error(`unknown memory quantity: ${value}`);
  }
  const amount = Number(match[1]);
  const unit = match[2];
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`invalid memory quantity: ${value}`);
  }
  if (unit === 'Mi') {
    return amount;
  }
  return amount * 1024;
}

/**
 * @param {TopologyEnv} env
 */
export function baselineCnpgClusterName(env) {
  return env === 'dev' ? DEV_CNPG_CLUSTER : RELEASE_CNPG_CLUSTER;
}

/**
 * @param {string} uid
 * @param {string} resourceVersion
 * @param {number} currentInstances
 * @param {number} targetInstances
 */
export function buildInstancesCasPatch(
  uid,
  resourceVersion,
  currentInstances,
  targetInstances,
) {
  assertPositiveCnpgInstances(currentInstances);
  assertPositiveCnpgInstances(targetInstances);
  return [
    { op: 'test', path: '/metadata/uid', value: uid },
    { op: 'test', path: '/metadata/resourceVersion', value: resourceVersion },
    { op: 'test', path: '/spec/instances', value: currentInstances },
    { op: 'replace', path: '/spec/instances', value: targetInstances },
  ];
}

/**
 * @param {object | undefined} deployment
 */
export function isOperatorDeploymentAvailable(deployment) {
  const conditions = Array.isArray(deployment?.status?.conditions)
    ? deployment.status.conditions
    : [];
  return conditions.some(
    (item) => item?.type === 'Available' && item?.status === 'True',
  );
}

/**
 * @param {object | null | undefined} live
 * @param {object} expected
 * @param {TopologyEnv} profileId
 */
export function assessLiveClusterIdentity(live, expected, profileId) {
  if (!live) {
    return 'absent';
  }
  const profile = readPlatformProfile(profileId);
  const baselineName = baselineCnpgClusterName(profileId);
  const initdb = expected.spec?.bootstrap?.initdb;
  const storage = expected.spec?.storage;
  const matches =
    live.metadata?.name === baselineName &&
    live.metadata?.namespace === profile.namespaces.postgres &&
    live.spec?.imageName === expected.spec?.imageName &&
    live.spec?.storage?.storageClass === storage?.storageClass &&
    live.spec?.storage?.size === storage?.size &&
    live.spec?.bootstrap?.initdb?.database === initdb?.database &&
    live.spec?.bootstrap?.initdb?.owner === initdb?.owner &&
    live.spec?.bootstrap?.initdb?.localeCType === initdb?.localeCType &&
    live.spec?.bootstrap?.initdb?.localeCollate === initdb?.localeCollate;
  if (!matches) {
    return 'foreign';
  }
  if (profileId === 'dev') {
    const owner = live.metadata?.labels?.['offscreen.dev/owner'];
    if (owner !== DEV_CNPG_OWNER) {
      return 'foreign';
    }
  }
  return 'compatible';
}

/**
 * @param {TopologyEnv} profileId
 * @param {typeof runPlatformCommand} [run]
 */
export function renderExpectedBaselineCluster(
  profileId,
  run = runPlatformCommand,
) {
  const docs = renderPlatformDocuments(
    { service: 'postgres', profile: profileId, section: 'cluster' },
    { run },
  );
  if (docs.length !== 1 || docs[0]?.kind !== 'Cluster') {
    throw new Error('expected one rendered baseline cluster document');
  }
  return docs[0];
}

/** Longest CNPG-derived name suffix budget (e.g. `-rw-lb`) below the 63-char limit. */
export const OWNED_CNPG_RESOURCE_SUFFIX_HEADROOM = 22;

const OWNED_PG_EXPERIMENT_LABEL = 'offscreen.rpg/pg-experiment';

const ALLOWED_OWNED_RENDER_DEPS = new Set(['run', 'renderExpected']);

/**
 * @param {string} value
 * @param {string} field
 * @param {number} minLen
 * @param {number} maxLen
 */
export function assertOwnedPostgresDnsLabel(value, field, minLen, maxLen) {
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string`);
  }
  if (value.length < minLen || value.length > maxLen) {
    throw new Error(
      `${field} must be a lowercase DNS label of ${minLen}-${maxLen} characters`,
    );
  }
  const pattern =
    maxLen === 1
      ? /^[a-z0-9]$/
      : new RegExp(`^[a-z0-9](?:[a-z0-9-]{0,${maxLen - 2}}[a-z0-9])?$`);
  if (!pattern.test(value)) {
    throw new Error(`${field} must be a lowercase DNS label`);
  }
}

/**
 * @param {TopologyEnv} profileId
 * @param {string} clusterName
 */
export function assertOwnedPostgresClusterName(profileId, clusterName) {
  assertOwnedPostgresDnsLabel(clusterName, 'clusterName', 1, 40);
  const reserved = baselineCnpgClusterName(profileId);
  if (clusterName === reserved) {
    throw new Error(`clusterName is reserved for baseline cluster ${reserved}`);
  }
  const profile = readPlatformProfile(profileId);
  const postgresNs = profile.namespaces.postgres;
  if (clusterName === postgresNs) {
    throw new Error(
      `clusterName is reserved for baseline postgres namespace ${postgresNs}`,
    );
  }
  if (clusterName.length + OWNED_CNPG_RESOURCE_SUFFIX_HEADROOM > 63) {
    throw new Error(
      'clusterName leaves insufficient CNPG resource suffix headroom',
    );
  }
}

/**
 * @param {string} ownerId
 */
export function ownedPostgresNamespaceName(ownerId) {
  assertOwnedPostgresDnsLabel(ownerId, 'ownerId', 1, 24);
  return `offscreen-pg-${ownerId}`;
}

/**
 * @param {TopologyEnv} profileId
 * @param {string} ownerId
 */
export function buildOwnedPostgresLabels(profileId, ownerId) {
  const profile = readPlatformProfile(profileId);
  return {
    [`${profile.ownerLabel}/owner`]: profile.ownerValue,
    [OWNED_PG_EXPERIMENT_LABEL]: ownerId,
  };
}

/**
 * @param {{
 *   profileId: TopologyEnv,
 *   ownerId: string,
 *   clusterName: string,
 *   instances: number,
 * }} input
 * @param {{
 *   run?: typeof runPlatformCommand,
 *   renderExpected?: typeof renderExpectedBaselineCluster,
 * }} [deps]
 */
export function renderOwnedPostgresCluster(
  { profileId, ownerId, clusterName, instances },
  deps = {},
) {
  if (profileId !== 'dev' && profileId !== 'release') {
    throw new Error('profileId must be dev or release');
  }
  for (const key of Object.keys(deps)) {
    if (!ALLOWED_OWNED_RENDER_DEPS.has(key)) {
      throw new Error(`unsupported owned render dependency: ${key}`);
    }
  }

  assertOwnedPostgresDnsLabel(ownerId, 'ownerId', 1, 24);
  assertOwnedPostgresClusterName(profileId, clusterName);
  assertPositiveCnpgInstances(instances);

  const run = deps.run ?? runPlatformCommand;
  const renderExpected = deps.renderExpected ?? renderExpectedBaselineCluster;
  const baselineBefore = structuredClone(renderExpected(profileId, run));

  const rendered = renderPlatformDocuments(
    { service: 'postgres', profile: profileId, section: 'cluster' },
    { run, stdinOverlay: { instances } },
  );
  if (rendered.length !== 1 || rendered[0]?.kind !== 'Cluster') {
    throw new Error('expected one rendered owned cluster document');
  }
  if (rendered[0].spec?.instances !== instances) {
    throw new Error('rendered cluster instances do not match request');
  }

  const namespaceName = ownedPostgresNamespaceName(ownerId);
  const labels = buildOwnedPostgresLabels(profileId, ownerId);

  const cluster = structuredClone(rendered[0]);
  cluster.metadata = {
    ...cluster.metadata,
    name: clusterName,
    namespace: namespaceName,
    labels,
  };

  const namespace = {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: {
      name: namespaceName,
      labels,
    },
  };

  const baselineAfter = renderExpected(profileId, run);
  if (!structuredEqual(baselineBefore, baselineAfter)) {
    throw new Error(
      'baseline cluster render must not mutate across owned render',
    );
  }

  return { namespace, cluster };
}

/**
 * @param {unknown} left
 * @param {unknown} right
 */
function structuredEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * @param {() => string} [readMeminfo]
 */
export function readHostMemoryMib(readMeminfo) {
  try {
    const text = readMeminfo
      ? readMeminfo()
      : readFileSync('/proc/meminfo', 'utf8');
    const available = text.match(/^MemAvailable:\s+(\d+)\s+kB/m);
    return available ? Math.floor(Number(available[1]) / 1024) : 0;
  } catch {
    return 0;
  }
}

/**
 * @param {string} text
 */
function readCnpgPin(text) {
  return parseCnpgPin(text);
}

/**
 * @param {number} currentInstances
 * @param {number} targetInstances
 * @param {number} availableMiB
 * @param {number} perInstanceLimitMiB
 * @param {number} minHeadroomMiB
 */
export function assessTopologyMemoryPreflight(
  currentInstances,
  targetInstances,
  availableMiB,
  perInstanceLimitMiB,
  minHeadroomMiB,
) {
  if (targetInstances <= currentInstances) {
    return { ok: true };
  }
  const additional = targetInstances - currentInstances;
  const required = minHeadroomMiB + additional * perInstanceLimitMiB;
  if (availableMiB < required) {
    return {
      ok: false,
      detail: `available memory ${availableMiB}MiB is below required ${required}MiB for scale-up`,
    };
  }
  return { ok: true };
}

/**
 * @param {object} expectedCluster
 * @param {number} currentInstances
 * @param {number} targetInstances
 */
export function summarizeTopologyResources(
  expectedCluster,
  currentInstances,
  targetInstances,
) {
  const limits = expectedCluster.spec?.resources?.limits ?? {};
  const requests = expectedCluster.spec?.resources?.requests ?? {};
  const limitMemoryMiB = parseKubernetesMemoryToMib(limits.memory);
  const requestMemoryMiB = parseKubernetesMemoryToMib(requests.memory);
  const limitCpu = limits.cpu ?? '0';
  const requestCpu = requests.cpu ?? '0';
  const storage = expectedCluster.spec?.storage?.size ?? 'unknown';
  return {
    current: {
      instances: currentInstances,
      memoryLimitPerInstanceMiB: limitMemoryMiB,
      memoryRequestPerInstanceMiB: requestMemoryMiB,
      cpuLimitPerInstance: limitCpu,
      cpuRequestPerInstance: requestCpu,
      storagePerInstance: storage,
    },
    target: {
      instances: targetInstances,
      memoryLimitTotalMiB: limitMemoryMiB * targetInstances,
      memoryRequestTotalMiB: requestMemoryMiB * targetInstances,
      cpuLimitPerInstance: limitCpu,
      cpuRequestPerInstance: requestCpu,
      storagePerInstance: storage,
    },
    delta: {
      instances: targetInstances - currentInstances,
      memoryLimitMiB: limitMemoryMiB * (targetInstances - currentInstances),
      memoryRequestMiB: requestMemoryMiB * (targetInstances - currentInstances),
    },
  };
}

/**
 * @typedef {{
 *   command: TopologyCommand,
 *   env: TopologyEnv,
 *   clusterName: string,
 *   instances: number,
 *   confirmContext?: string,
 *   allowScaleDown: boolean,
 *   ownerId?: string,
 * }} ParsedTopologyCli
 */

/**
 * @param {string[]} argv
 * @returns {ParsedTopologyCli}
 */
export function parseTopologyCliArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0) {
    throw new Error('topology command is required');
  }

  const command = args[0];
  if (command !== 'plan' && command !== 'ensure' && command !== 'status') {
    throw new Error('topology command must be plan, ensure, or status');
  }

  /** @type {Partial<ParsedTopologyCli>} */
  const parsed = {
    command,
    allowScaleDown: false,
  };
  const seen = new Set();

  for (let index = 1; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith('--')) {
      throw new Error(`unexpected positional argument: ${token}`);
    }
    if (seen.has(token)) {
      throw new Error(`duplicate flag: ${token}`);
    }
    seen.add(token);

    if (token === '--allow-scale-down') {
      parsed.allowScaleDown = true;
      continue;
    }

    const next = args[index + 1];
    if (next == null || next.startsWith('--')) {
      throw new Error(`flag ${token} requires a value`);
    }

    if (token === '--env') {
      if (next !== 'dev' && next !== 'release') {
        throw new Error('env must be dev or release');
      }
      parsed.env = next;
      index += 1;
      continue;
    }
    if (token === '--cluster') {
      if (typeof next !== 'string' || next.length === 0) {
        throw new Error('cluster name is required');
      }
      parsed.clusterName = next;
      index += 1;
      continue;
    }
    if (token === '--owner') {
      if (typeof next !== 'string' || next.length === 0) {
        throw new Error('owner id is required');
      }
      parsed.ownerId = next;
      index += 1;
      continue;
    }
    if (token === '--instances') {
      parsed.instances = parseCanonicalPositiveInteger(next);
      index += 1;
      continue;
    }
    if (token === '--confirm-context') {
      if (typeof next !== 'string' || next.length === 0) {
        throw new Error('confirm-context value is required');
      }
      parsed.confirmContext = next;
      index += 1;
      continue;
    }

    throw new Error(`unknown flag: ${token}`);
  }

  if (parsed.env == null) {
    throw new Error('--env is required');
  }
  if (parsed.clusterName == null) {
    throw new Error('--cluster is required');
  }
  if (parsed.instances == null) {
    throw new Error('--instances is required');
  }
  if (command === 'ensure' && parsed.confirmContext == null) {
    throw new Error('ensure requires --confirm-context');
  }

  const baselineName = baselineCnpgClusterName(parsed.env);
  const isBaselineCluster = parsed.clusterName === baselineName;
  if (parsed.ownerId != null) {
    assertOwnedPostgresDnsLabel(parsed.ownerId, 'ownerId', 1, 24);
    if (isBaselineCluster) {
      throw new Error('baseline cluster name cannot be used with --owner');
    }
    assertOwnedPostgresClusterName(parsed.env, parsed.clusterName);
  } else if (!isBaselineCluster) {
    throw new Error('--owner is required for non-baseline cluster names');
  }

  return /** @type {ParsedTopologyCli} */ (parsed);
}

/**
 * @param {ParsedTopologyCli} request
 */
export function isOwnedTopologyRequest(request) {
  return request.ownerId != null;
}

/**
 * @param {string} clusterName
 * @param {string} namespaceName
 */
export function buildOwnedCnpgEndpoints(clusterName, namespaceName) {
  return {
    readWrite: `${clusterName}-rw.${namespaceName}.svc.cluster.local:5432`,
    readOnly: `${clusterName}-ro.${namespaceName}.svc.cluster.local:5432`,
  };
}

/**
 * @param {object | null | undefined} live
 * @param {object} expected
 * @param {TopologyEnv} profileId
 * @param {string} ownerId
 * @param {string} clusterName
 * @param {string} namespaceName
 */
export function assessLiveOwnedClusterIdentity(
  live,
  expected,
  profileId,
  ownerId,
  clusterName,
  namespaceName,
) {
  if (!live) {
    return 'absent';
  }
  const profile = readPlatformProfile(profileId);
  const initdb = expected.spec?.bootstrap?.initdb;
  const storage = expected.spec?.storage;
  const labels = live.metadata?.labels ?? {};
  const ownerLabelKey = `${profile.ownerLabel}/owner`;
  const matches =
    live.metadata?.name === clusterName &&
    live.metadata?.namespace === namespaceName &&
    live.spec?.imageName === expected.spec?.imageName &&
    live.spec?.storage?.storageClass === storage?.storageClass &&
    live.spec?.storage?.size === storage?.size &&
    live.spec?.bootstrap?.initdb?.database === initdb?.database &&
    live.spec?.bootstrap?.initdb?.owner === initdb?.owner &&
    live.spec?.bootstrap?.initdb?.localeCType === initdb?.localeCType &&
    live.spec?.bootstrap?.initdb?.localeCollate === initdb?.localeCollate &&
    labels[ownerLabelKey] === profile.ownerValue &&
    labels[OWNED_PG_EXPERIMENT_LABEL] === ownerId;
  return matches ? 'compatible' : 'foreign';
}

/**
 * @param {object | null | undefined} namespace
 * @param {TopologyEnv} profileId
 * @param {string} ownerId
 */
export function assessOwnedNamespaceOwnership(namespace, profileId, ownerId) {
  if (!namespace) {
    return 'absent';
  }
  const profile = readPlatformProfile(profileId);
  const labels = namespace.metadata?.labels ?? {};
  const ownerLabelKey = `${profile.ownerLabel}/owner`;
  if (
    labels[ownerLabelKey] === profile.ownerValue &&
    labels[OWNED_PG_EXPERIMENT_LABEL] === ownerId &&
    typeof namespace.metadata?.uid === 'string' &&
    namespace.metadata.uid.length > 0
  ) {
    return 'owned';
  }
  return 'foreign';
}

/**
 * @param {{
 *   env: TopologyEnv,
 *   kindClusterName: string,
 *   target: ReturnType<typeof assertPlatformTarget>,
 *   postgresNamespace: object,
 *   crdPresent: boolean,
 *   operator: object | null,
 *   operatorAvailable: boolean,
 *   pin: ReturnType<typeof parseCnpgPin>,
 *   expectedCluster: object,
 *   cluster: object | null,
 *   clusterIdentity: 'absent' | 'compatible' | 'foreign',
 *   memoryMiB: number,
 *   unreadable: { id: string, reason: string }[],
 * }} observation
 */
function assessTopologyObservation(observation) {
  /** @type {{ id: string, detail: string }[]} */
  const refusals = [];
  const profile = readPlatformProfile(observation.env);
  const baselineName = baselineCnpgClusterName(observation.env);

  if (observation.unreadable.length > 0) {
    refusals.push({
      id: 'unreadable-observation',
      detail: observation.unreadable.map((item) => item.id).join(', '),
    });
  }
  if (observation.target.contextName !== profile.contextName) {
    refusals.push({
      id: 'wrong-context',
      detail: `kubectl context is ${observation.target.contextName}, expected ${profile.contextName}`,
    });
  }

  const pgNs = observation.postgresNamespace;
  const pgLabels = pgNs?.metadata?.labels ?? {};
  if (observation.env === 'dev') {
    if (pgLabels['offscreen.dev/owner'] !== DEV_CNPG_OWNER) {
      refusals.push({
        id: 'postgres-namespace-owner-mismatch',
        detail: 'postgres namespace is not dev-owned',
      });
    }
  } else if (pgLabels[RELEASE_LAB_LABEL_KEY] !== RELEASE_LAB_LABEL_VALUE) {
    refusals.push({
      id: 'postgres-namespace-owner-mismatch',
      detail: 'postgres namespace is not release-owned',
    });
  }
  if (
    typeof pgNs?.metadata?.uid !== 'string' ||
    pgNs.metadata.uid.length === 0
  ) {
    refusals.push({
      id: 'postgres-namespace-uid-missing',
      detail: 'postgres namespace uid is missing',
    });
  }

  if (!observation.crdPresent) {
    refusals.push({
      id: 'crd-absent',
      detail: 'clusters.postgresql.cnpg.io CRD is absent',
    });
  }
  if (!observation.operator) {
    refusals.push({
      id: 'operator-absent',
      detail: 'CNPG operator deployment is absent',
    });
  } else if (
    observation.operator.spec?.template?.spec?.containers?.[0]?.image !==
    observation.pin.operatorImage
  ) {
    refusals.push({
      id: 'operator-image-mismatch',
      detail: 'operator image does not match operator.pin',
    });
  } else if (!observation.operatorAvailable) {
    refusals.push({
      id: 'operator-not-available',
      detail: 'CNPG operator deployment is not Available',
    });
  }

  if (observation.clusterIdentity === 'foreign') {
    refusals.push({
      id: 'cluster-identity-mismatch',
      detail: `${baselineName} has incompatible bootstrap, storage, image, or ownership`,
    });
  }
  if (observation.clusterIdentity === 'absent') {
    refusals.push({
      id: 'cluster-absent',
      detail: `${baselineName} is absent; use bootstrap ensure to create it`,
    });
  }
  if (observation.cluster) {
    const uid = observation.cluster.metadata?.uid;
    const rv = observation.cluster.metadata?.resourceVersion;
    if (typeof uid !== 'string' || uid.length === 0) {
      refusals.push({
        id: 'cluster-uid-missing',
        detail: 'cluster uid is missing',
      });
    }
    if (typeof rv !== 'string' || rv.length === 0) {
      refusals.push({
        id: 'cluster-resource-version-missing',
        detail: 'cluster resourceVersion is missing',
      });
    }
  }

  return refusals;
}

/**
 * @param {TopologyEnv} env
 * @param {{
 *   run?: typeof runPlatformCommand,
 *   readMeminfo?: () => string,
 *   readPin?: () => string,
 *   assertTarget?: typeof assertPlatformTarget,
 *   renderExpected?: typeof renderExpectedBaselineCluster,
 * }} deps
 */
export function collectCnpgTopologyObservation(env, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const assertTarget = deps.assertTarget ?? assertPlatformTarget;
  const renderExpected = deps.renderExpected ?? renderExpectedBaselineCluster;
  const profile = readPlatformProfile(env);
  const kindClusterName = profile.clusterName;
  const baselineName = baselineCnpgClusterName(env);
  /** @type {{ id: string, reason: string }[]} */
  const unreadable = [];

  let target;
  try {
    target = assertTarget(env, { run });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      env,
      kindClusterName,
      target: null,
      targetError: message,
      unreadable,
    };
  }

  const read = (spec) => {
    const observation = readPlatformObject(spec, { run });
    if (observation.state === 'unreadable') {
      unreadable.push({ id: spec.name, reason: observation.reason });
    }
    return observation;
  };

  const baselineNsName =
    env === 'dev' ? DEV_BASELINE_NAMESPACE : RELEASE_BASELINE_NAMESPACE;
  const baselineObservation = read({
    profileId: env,
    resource: 'namespace',
    name: baselineNsName,
  });
  if (baselineObservation.state === 'present') {
    const labels = baselineObservation.object?.metadata?.labels ?? {};
    if (env === 'dev') {
      if (labels[`${profile.ownerLabel}/owner`] !== DEV_CLUSTER_OWNER) {
        unreadable.push({
          id: 'baseline-owner',
          reason: 'dev baseline owner mismatch',
        });
      }
    } else if (labels[`${profile.ownerLabel}/lab`] !== profile.ownerValue) {
      unreadable.push({
        id: 'baseline-owner',
        reason: 'release baseline lab label mismatch',
      });
    }
    if (!baselineObservation.object?.metadata?.uid) {
      unreadable.push({
        id: 'baseline-uid',
        reason: 'baseline namespace uid missing',
      });
    }
  } else {
    unreadable.push({
      id: 'baseline-namespace',
      reason: baselineObservation.reason ?? 'baseline namespace absent',
    });
  }

  const postgresObservation = read({
    profileId: env,
    resource: 'namespace',
    name: profile.namespaces.postgres,
  });
  const crdObservation = read({
    profileId: env,
    resource: 'crd',
    name: CNPG_CRD_NAME,
  });
  const operatorObservation = read({
    profileId: env,
    resource: 'deployment',
    name: CNPG_OPERATOR_DEPLOYMENT,
    namespace: CNPG_OPERATOR_NAMESPACE,
  });
  const clusterObservation =
    crdObservation.state === 'present'
      ? read({
          profileId: env,
          resource: 'cluster.postgresql.cnpg.io',
          name: baselineName,
          namespace: profile.namespaces.postgres,
        })
      : { state: 'absent' };

  let pin;
  try {
    pin = readCnpgPin(
      deps.readPin ? deps.readPin() : readFileSync(operatorPinPath, 'utf8'),
    );
  } catch {
    pin = null;
  }
  if (!pin) {
    unreadable.push({ id: 'operator-pin', reason: 'operator pin unreadable' });
  }

  let expectedCluster;
  try {
    expectedCluster = renderExpected(env, run);
  } catch (error) {
    unreadable.push({
      id: 'expected-cluster-render',
      reason: error instanceof Error ? error.message : 'render failed',
    });
    expectedCluster = null;
  }

  const clusterBody =
    clusterObservation.state === 'present' ? clusterObservation.object : null;
  const clusterIdentity =
    expectedCluster && clusterBody
      ? assessLiveClusterIdentity(clusterBody, expectedCluster, env)
      : clusterBody
        ? 'foreign'
        : 'absent';

  return {
    env,
    kindClusterName,
    target,
    targetError: null,
    postgresNamespace:
      postgresObservation.state === 'present'
        ? postgresObservation.object
        : null,
    crdPresent: crdObservation.state === 'present',
    operator:
      operatorObservation.state === 'present'
        ? operatorObservation.object
        : null,
    operatorAvailable: isOperatorDeploymentAvailable(
      operatorObservation.state === 'present'
        ? operatorObservation.object
        : null,
    ),
    pin,
    expectedCluster,
    cluster: clusterBody,
    clusterIdentity,
    memoryMiB: readHostMemoryMib(deps.readMeminfo),
    unreadable,
  };
}

/**
 * @param {ParsedTopologyCli} request
 * @param {ReturnType<typeof collectCnpgTopologyObservation>} observation
 */
export function planCnpgTopology(request, observation) {
  if (observation.targetError) {
    return {
      command: 'plan',
      ok: false,
      readOnly: true,
      refusals: [{ id: 'target-unverified', detail: observation.targetError }],
    };
  }
  const refusals = assessTopologyObservation(observation);
  const currentInstances = observation.cluster?.spec?.instances ?? null;
  return {
    command: 'plan',
    ok: refusals.length === 0,
    readOnly: true,
    env: request.env,
    baselineCluster: baselineCnpgClusterName(request.env),
    currentInstances,
    targetInstances: request.instances,
    resources:
      observation.expectedCluster && Number.isInteger(currentInstances)
        ? summarizeTopologyResources(
            observation.expectedCluster,
            currentInstances,
            request.instances,
          )
        : null,
    refusals,
    mutated: false,
    complete: refusals.length === 0,
  };
}

/**
 * @param {ParsedTopologyCli} request
 * @param {ReturnType<typeof collectCnpgTopologyObservation>} observation
 */
export function statusCnpgTopology(request, observation) {
  const plan = planCnpgTopology(request, observation);
  return { ...plan, command: 'status' };
}

/**
 * @param {TopologyEnv} env
 * @param {{ namespace: string, clusterName: string, expectedInstances: number }} target
 * @param {{
 *   run: typeof runPlatformCommand,
 *   sleep?: (ms: number) => void,
 *   now?: () => number,
 *   readinessTimeoutMs?: number,
 * }} deps
 */
export function waitForCnpgClusterReadiness(env, target, deps) {
  const now = deps.now ?? Date.now;
  const sleep = deps.sleep ?? (() => {});
  const deadline =
    now() + (deps.readinessTimeoutMs ?? TOPOLOGY_READINESS_TIMEOUT_MS);
  let last = {
    ok: false,
    detail: 'topology readiness poll did not start',
  };

  while (now() <= deadline) {
    const observation = readPlatformObject(
      {
        profileId: env,
        resource: 'cluster.postgresql.cnpg.io',
        name: target.clusterName,
        namespace: target.namespace,
      },
      { run: deps.run },
    );
    if (observation.state === 'present') {
      last = assessCnpgClusterTopologyReadiness(
        observation.object,
        target.expectedInstances,
      );
      if (last.ok) {
        return last;
      }
    } else {
      last = {
        ok: false,
        detail: `cluster observation state is ${observation.state}`,
      };
    }
    if (now() >= deadline) {
      break;
    }
    sleep(TOPOLOGY_READINESS_POLL_MS);
  }
  return last;
}

/**
 * @param {TopologyEnv} env
 * @param {number} expectedInstances
 * @param {{
 *   run: typeof runPlatformCommand,
 *   sleep?: (ms: number) => void,
 *   now?: () => number,
 *   readinessTimeoutMs?: number,
 * }} deps
 */
export function waitForCnpgTopologyReadiness(env, expectedInstances, deps) {
  const profile = readPlatformProfile(env);
  const baselineName = baselineCnpgClusterName(env);
  return waitForCnpgClusterReadiness(
    env,
    {
      namespace: profile.namespaces.postgres,
      clusterName: baselineName,
      expectedInstances,
    },
    deps,
  );
}

/**
 * @param {object} createResult
 */
function parseCreatedObjectUid(createResult) {
  if (!createResult.stdout?.trim()) {
    return null;
  }
  try {
    const object = JSON.parse(createResult.stdout);
    const uid = object?.metadata?.uid;
    return typeof uid === 'string' && uid.length > 0 ? uid : null;
  } catch {
    return null;
  }
}

/**
 * @param {TopologyEnv} env
 * @param {string} ownerId
 * @param {string} clusterName
 * @param {{
 *   run?: typeof runPlatformCommand,
 *   readMeminfo?: () => string,
 *   readPin?: () => string,
 *   assertTarget?: typeof assertPlatformTarget,
 *   renderOwned?: typeof renderOwnedPostgresCluster,
 * }} deps
 */
export function collectOwnedCnpgTopologyObservation(
  env,
  ownerId,
  clusterName,
  deps = {},
) {
  const run = deps.run ?? runPlatformCommand;
  const assertTarget = deps.assertTarget ?? assertPlatformTarget;
  const renderOwned = deps.renderOwned ?? renderOwnedPostgresCluster;
  const profile = readPlatformProfile(env);
  const kindClusterName = profile.clusterName;
  const namespaceName = ownedPostgresNamespaceName(ownerId);
  /** @type {{ id: string, reason: string }[]} */
  const unreadable = [];

  let target;
  try {
    target = assertTarget(env, { run });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      env,
      ownerId,
      clusterName,
      namespaceName,
      kindClusterName,
      target: null,
      targetError: message,
      unreadable,
    };
  }

  const read = (spec) => {
    const observation = readPlatformObject(spec, { run });
    if (observation.state === 'unreadable') {
      unreadable.push({ id: spec.name, reason: observation.reason });
    }
    return observation;
  };

  const baselineNsName =
    env === 'dev' ? DEV_BASELINE_NAMESPACE : RELEASE_BASELINE_NAMESPACE;
  const baselineObservation = read({
    profileId: env,
    resource: 'namespace',
    name: baselineNsName,
  });
  if (baselineObservation.state === 'present') {
    const labels = baselineObservation.object?.metadata?.labels ?? {};
    if (env === 'dev') {
      if (labels[`${profile.ownerLabel}/owner`] !== DEV_CLUSTER_OWNER) {
        unreadable.push({
          id: 'baseline-owner',
          reason: 'dev baseline owner mismatch',
        });
      }
    } else if (labels[`${profile.ownerLabel}/lab`] !== profile.ownerValue) {
      unreadable.push({
        id: 'baseline-owner',
        reason: 'release baseline lab label mismatch',
      });
    }
  } else {
    unreadable.push({
      id: 'baseline-namespace',
      reason: baselineObservation.reason ?? 'baseline namespace absent',
    });
  }

  const ownedNamespaceObservation = read({
    profileId: env,
    resource: 'namespace',
    name: namespaceName,
  });
  const baselineName = baselineCnpgClusterName(env);
  const baselineClusterConflict = read({
    profileId: env,
    resource: 'cluster.postgresql.cnpg.io',
    name: clusterName,
    namespace: profile.namespaces.postgres,
  });
  if (baselineClusterConflict.state === 'present') {
    unreadable.push({
      id: 'cluster-name-conflict',
      reason: `cluster name ${clusterName} already exists in ${profile.namespaces.postgres}`,
    });
  }
  if (
    clusterName === baselineName ||
    clusterName === profile.namespaces.postgres
  ) {
    unreadable.push({
      id: 'cluster-name-reserved',
      reason: `cluster name ${clusterName} is reserved`,
    });
  }

  const crdObservation = read({
    profileId: env,
    resource: 'crd',
    name: CNPG_CRD_NAME,
  });
  const operatorObservation = read({
    profileId: env,
    resource: 'deployment',
    name: CNPG_OPERATOR_DEPLOYMENT,
    namespace: CNPG_OPERATOR_NAMESPACE,
  });
  const clusterObservation =
    crdObservation.state === 'present'
      ? read({
          profileId: env,
          resource: 'cluster.postgresql.cnpg.io',
          name: clusterName,
          namespace: namespaceName,
        })
      : { state: 'absent' };

  let pin;
  try {
    pin = readCnpgPin(
      deps.readPin ? deps.readPin() : readFileSync(operatorPinPath, 'utf8'),
    );
  } catch {
    pin = null;
  }
  if (!pin) {
    unreadable.push({ id: 'operator-pin', reason: 'operator pin unreadable' });
  }

  let expectedCluster;
  try {
    const rendered = renderOwned(env, ownerId, clusterName, 1, { run });
    expectedCluster = rendered.cluster;
  } catch (error) {
    unreadable.push({
      id: 'expected-owned-cluster-render',
      reason: error instanceof Error ? error.message : 'render failed',
    });
    expectedCluster = null;
  }

  const ownedNamespace =
    ownedNamespaceObservation.state === 'present'
      ? ownedNamespaceObservation.object
      : null;
  const namespaceOwnership = assessOwnedNamespaceOwnership(
    ownedNamespace,
    env,
    ownerId,
  );

  const clusterBody =
    clusterObservation.state === 'present' ? clusterObservation.object : null;
  const clusterIdentity =
    expectedCluster && clusterBody
      ? assessLiveOwnedClusterIdentity(
          clusterBody,
          expectedCluster,
          env,
          ownerId,
          clusterName,
          namespaceName,
        )
      : clusterBody
        ? 'foreign'
        : 'absent';

  return {
    env,
    ownerId,
    clusterName,
    namespaceName,
    kindClusterName,
    target,
    targetError: null,
    ownedNamespace,
    namespaceOwnership,
    crdPresent: crdObservation.state === 'present',
    operator:
      operatorObservation.state === 'present'
        ? operatorObservation.object
        : null,
    operatorAvailable: isOperatorDeploymentAvailable(
      operatorObservation.state === 'present'
        ? operatorObservation.object
        : null,
    ),
    pin,
    expectedCluster,
    cluster: clusterBody,
    clusterIdentity,
    memoryMiB: readHostMemoryMib(deps.readMeminfo),
    unreadable,
  };
}

/**
 * @param {ReturnType<typeof collectOwnedCnpgTopologyObservation>} observation
 */
function assessOwnedTopologyObservation(observation) {
  /** @type {{ id: string, detail: string }[]} */
  const refusals = [];
  const profile = readPlatformProfile(observation.env);

  if (observation.unreadable.length > 0) {
    refusals.push({
      id: 'unreadable-observation',
      detail: observation.unreadable.map((item) => item.id).join(', '),
    });
  }
  if (observation.target.contextName !== profile.contextName) {
    refusals.push({
      id: 'wrong-context',
      detail: `kubectl context is ${observation.target.contextName}, expected ${profile.contextName}`,
    });
  }
  if (observation.namespaceOwnership === 'foreign') {
    refusals.push({
      id: 'owned-namespace-foreign',
      detail: 'owned namespace labels or uid do not match experiment owner',
    });
  }
  if (
    observation.ownedNamespace &&
    observation.namespaceOwnership === 'owned' &&
    (typeof observation.ownedNamespace.metadata?.uid !== 'string' ||
      observation.ownedNamespace.metadata.uid.length === 0)
  ) {
    refusals.push({
      id: 'owned-namespace-uid-missing',
      detail: 'owned namespace uid is missing',
    });
  }
  if (!observation.crdPresent) {
    refusals.push({
      id: 'crd-absent',
      detail: 'clusters.postgresql.cnpg.io CRD is absent',
    });
  }
  if (!observation.operator) {
    refusals.push({
      id: 'operator-absent',
      detail: 'CNPG operator deployment is absent',
    });
  } else if (
    observation.operator.spec?.template?.spec?.containers?.[0]?.image !==
    observation.pin?.operatorImage
  ) {
    refusals.push({
      id: 'operator-image-mismatch',
      detail: 'operator image does not match operator.pin',
    });
  } else if (!observation.operatorAvailable) {
    refusals.push({
      id: 'operator-not-available',
      detail: 'CNPG operator deployment is not Available',
    });
  }
  if (observation.clusterIdentity === 'foreign') {
    refusals.push({
      id: 'cluster-identity-mismatch',
      detail: `${observation.clusterName} has incompatible bootstrap, storage, image, or ownership`,
    });
  }
  if (observation.cluster) {
    const uid = observation.cluster.metadata?.uid;
    const rv = observation.cluster.metadata?.resourceVersion;
    if (typeof uid !== 'string' || uid.length === 0) {
      refusals.push({
        id: 'cluster-uid-missing',
        detail: 'cluster uid is missing',
      });
    }
    if (typeof rv !== 'string' || rv.length === 0) {
      refusals.push({
        id: 'cluster-resource-version-missing',
        detail: 'cluster resourceVersion is missing',
      });
    }
  }
  return refusals;
}

/**
 * @param {ParsedTopologyCli} request
 * @param {ReturnType<typeof collectOwnedCnpgTopologyObservation>} observation
 */
export function planOwnedCnpgTopology(request, observation) {
  if (observation.targetError) {
    return {
      command: 'plan',
      ok: false,
      readOnly: true,
      refusals: [{ id: 'target-unverified', detail: observation.targetError }],
    };
  }
  const refusals = assessOwnedTopologyObservation(observation);
  const currentInstances = observation.cluster?.spec?.instances ?? 0;
  let resources = null;
  if (observation.expectedCluster) {
    const scaled = structuredClone(observation.expectedCluster);
    scaled.spec.instances = request.instances;
    resources = summarizeTopologyResources(
      scaled,
      currentInstances,
      request.instances,
    );
  }
  return {
    command: 'plan',
    ok: refusals.length === 0,
    readOnly: true,
    mode: 'owned',
    env: request.env,
    ownerId: request.ownerId,
    clusterName: request.clusterName,
    namespace: observation.namespaceName,
    currentInstances,
    targetInstances: request.instances,
    resources,
    refusals,
    mutated: false,
    complete: refusals.length === 0,
  };
}

/**
 * @param {ParsedTopologyCli} request
 * @param {ReturnType<typeof collectOwnedCnpgTopologyObservation>} observation
 */
export function statusOwnedCnpgTopology(request, observation) {
  const plan = planOwnedCnpgTopology(request, observation);
  const endpoints = buildOwnedCnpgEndpoints(
    request.clusterName,
    observation.namespaceName,
  );
  return {
    ...plan,
    command: 'status',
    endpoints,
    clusterUid: observation.cluster?.metadata?.uid ?? null,
    instances: observation.cluster?.spec?.instances ?? null,
  };
}

/**
 * @param {ParsedTopologyCli} request
 * @param {ReturnType<typeof collectOwnedCnpgTopologyObservation>} observation
 * @param {{
 *   run?: typeof runPlatformCommand,
 *   sleep?: (ms: number) => void,
 *   now?: () => number,
 *   assertTarget?: typeof assertPlatformTarget,
 *   collect?: typeof collectOwnedCnpgTopologyObservation,
 *   renderOwned?: typeof renderOwnedPostgresCluster,
 * }} deps
 */
export function ensureOwnedCnpgTopology(request, observation, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const collect = deps.collect ?? collectOwnedCnpgTopologyObservation;
  const renderOwned = deps.renderOwned ?? renderOwnedPostgresCluster;
  const profile = readPlatformProfile(request.env);
  const namespaceName = observation.namespaceName;

  if (request.confirmContext !== profile.contextName) {
    return {
      command: 'ensure',
      ok: false,
      readOnly: false,
      mode: 'owned',
      refusals: [
        {
          id: 'confirm-context-mismatch',
          detail: `confirm-context must equal ${profile.contextName}`,
        },
      ],
      mutated: false,
      complete: false,
    };
  }

  const preliminary = planOwnedCnpgTopology(request, observation);
  if (!preliminary.ok) {
    return {
      ...preliminary,
      command: 'ensure',
      readOnly: false,
      mutated: false,
      complete: false,
    };
  }

  const currentInstances = observation.cluster?.spec?.instances ?? 0;
  const targetInstances = request.instances;
  const minHeadroom =
    request.env === 'dev'
      ? DEV_CNPG_MIN_MEMORY_MIB
      : RELEASE_CNPG_MIN_MEMORY_MIB;

  if (targetInstances < currentInstances && !request.allowScaleDown) {
    return {
      command: 'ensure',
      ok: false,
      readOnly: false,
      mode: 'owned',
      env: request.env,
      ownerId: request.ownerId,
      clusterName: request.clusterName,
      currentInstances,
      targetInstances,
      refusals: [
        {
          id: 'scale-down-not-allowed',
          detail: 'scale-down requires --allow-scale-down',
        },
      ],
      mutated: false,
      complete: false,
    };
  }

  const { namespace: namespaceManifest, cluster: expectedCluster } =
    renderOwned(
      {
        profileId: request.env,
        ownerId: request.ownerId,
        clusterName: request.clusterName,
        instances: targetInstances,
      },
      { run },
    );

  let liveLimitMiB;
  try {
    liveLimitMiB = parseKubernetesMemoryToMib(
      (observation.cluster ?? expectedCluster).spec?.resources?.limits?.memory,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      command: 'ensure',
      ok: false,
      readOnly: false,
      mode: 'owned',
      refusals: [{ id: 'live-memory-limit-unreadable', detail: message }],
      mutated: false,
      complete: false,
    };
  }

  const memory = assessTopologyMemoryPreflight(
    currentInstances,
    targetInstances,
    observation.memoryMiB,
    liveLimitMiB,
    minHeadroom,
  );
  if (!memory.ok) {
    return {
      command: 'ensure',
      ok: false,
      readOnly: false,
      mode: 'owned',
      refusals: [{ id: 'insufficient-memory', detail: memory.detail }],
      mutated: false,
      complete: false,
    };
  }

  const resources = summarizeTopologyResources(
    expectedCluster,
    currentInstances,
    targetInstances,
  );

  if (observation.cluster && targetInstances !== currentInstances) {
    const starting = assessCnpgClusterTopologyReadiness(
      observation.cluster,
      currentInstances,
    );
    if (!starting.ok) {
      return {
        command: 'ensure',
        ok: false,
        readOnly: false,
        mode: 'owned',
        currentInstances,
        targetInstances,
        resources,
        refusals: [
          {
            id: 'unhealthy-starting-topology',
            detail: starting.detail,
          },
        ],
        mutated: false,
        complete: false,
      };
    }
  }

  let mutated = false;
  let ownedNamespaceUid = observation.ownedNamespace?.metadata?.uid ?? null;
  let clusterUid = observation.cluster?.metadata?.uid ?? null;
  let clusterResourceVersion =
    observation.cluster?.metadata?.resourceVersion ?? null;

  const namespaceAbsent = observation.namespaceOwnership === 'absent';
  const clusterAbsent = observation.clusterIdentity === 'absent';

  const recheckBeforeWrite = () => {
    const fresh = collect(
      request.env,
      request.ownerId,
      request.clusterName,
      deps,
    );
    if (fresh.targetError) {
      return {
        ok: false,
        refusals: [{ id: 'target-unverified', detail: fresh.targetError }],
      };
    }
    const ownedLabelsOk =
      fresh.namespaceOwnership === 'absent' ||
      fresh.namespaceOwnership === 'owned';
    if (!ownedLabelsOk) {
      return {
        ok: false,
        refusals: [
          {
            id: 'fence-owned-namespace-drift',
            detail: 'owned namespace owner labels changed before write',
          },
        ],
      };
    }
    if (
      ownedNamespaceUid != null &&
      fresh.ownedNamespace?.metadata?.uid !== ownedNamespaceUid
    ) {
      return {
        ok: false,
        refusals: [
          {
            id: 'fence-owned-namespace-drift',
            detail: 'owned namespace uid changed before write',
          },
        ],
      };
    }
    if (
      clusterUid != null &&
      (fresh.cluster?.metadata?.uid !== clusterUid ||
        fresh.cluster?.metadata?.resourceVersion !== clusterResourceVersion)
    ) {
      return {
        ok: false,
        refusals: [
          {
            id: 'fence-changed-before-patch',
            detail: 'target cluster identity changed before write',
          },
        ],
      };
    }
    return { ok: true, observation: fresh };
  };

  if (namespaceAbsent) {
    const fence = recheckBeforeWrite();
    if (!fence.ok) {
      return {
        command: 'ensure',
        ok: false,
        readOnly: false,
        mode: 'owned',
        refusals: fence.refusals,
        mutated,
        complete: false,
      };
    }
    const createNs = run(
      'kubectl',
      ['--context', profile.contextName, 'create', '-f', '-', '-o', 'json'],
      { input: `${JSON.stringify(namespaceManifest)}\n` },
    );
    if (!createNs.ok) {
      return {
        command: 'ensure',
        ok: false,
        readOnly: false,
        mode: 'owned',
        refusals: [
          {
            id: 'namespace-create-failed',
            detail: createNs.stderr?.trim() || 'namespace create failed',
          },
        ],
        mutated,
        complete: false,
      };
    }
    ownedNamespaceUid = parseCreatedObjectUid(createNs);
    if (!ownedNamespaceUid) {
      return {
        command: 'ensure',
        ok: false,
        readOnly: false,
        mode: 'owned',
        refusals: [
          {
            id: 'namespace-create-unreadable',
            detail: 'namespace create succeeded but uid was not captured',
          },
        ],
        mutated: true,
        complete: false,
        recoveryIdentity: {
          ownerId: request.ownerId,
          clusterName: request.clusterName,
          namespace: namespaceName,
          namespaceUid: null,
        },
      };
    }
    mutated = true;
  }

  if (clusterAbsent) {
    const fence = recheckBeforeWrite();
    if (!fence.ok) {
      return {
        command: 'ensure',
        ok: false,
        readOnly: false,
        mode: 'owned',
        refusals: fence.refusals,
        mutated,
        complete: false,
        recoveryIdentity: ownedNamespaceUid
          ? {
              ownerId: request.ownerId,
              clusterName: request.clusterName,
              namespace: namespaceName,
              namespaceUid: ownedNamespaceUid,
            }
          : undefined,
      };
    }
    const createCluster = run(
      'kubectl',
      ['--context', profile.contextName, 'create', '-f', '-', '-o', 'json'],
      { input: `${JSON.stringify(expectedCluster)}\n` },
    );
    if (!createCluster.ok) {
      return {
        command: 'ensure',
        ok: false,
        readOnly: false,
        mode: 'owned',
        refusals: [
          {
            id: createCluster.stderr?.includes('AlreadyExists')
              ? 'create-conflict'
              : 'cluster-create-failed',
            detail: createCluster.stderr?.trim() || 'cluster create failed',
          },
        ],
        mutated,
        complete: false,
        recoveryIdentity: {
          ownerId: request.ownerId,
          clusterName: request.clusterName,
          namespace: namespaceName,
          namespaceUid: ownedNamespaceUid,
        },
      };
    }
    clusterUid = parseCreatedObjectUid(createCluster);
    clusterResourceVersion = null;
    if (!clusterUid) {
      return {
        command: 'ensure',
        ok: false,
        readOnly: false,
        mode: 'owned',
        refusals: [
          {
            id: 'cluster-create-unreadable',
            detail: 'cluster create succeeded but uid was not captured',
          },
        ],
        mutated: true,
        complete: false,
        recoveryIdentity: {
          ownerId: request.ownerId,
          clusterName: request.clusterName,
          namespace: namespaceName,
          namespaceUid: ownedNamespaceUid,
        },
      };
    }
    mutated = true;
  } else if (targetInstances !== currentInstances) {
    const fence = recheckBeforeWrite();
    if (!fence.ok) {
      return {
        command: 'ensure',
        ok: false,
        readOnly: false,
        mode: 'owned',
        refusals: fence.refusals,
        mutated,
        complete: false,
      };
    }
    const patchBody = buildInstancesCasPatch(
      clusterUid,
      clusterResourceVersion,
      currentInstances,
      targetInstances,
    );
    const patch = run('kubectl', [
      '--context',
      profile.contextName,
      '-n',
      namespaceName,
      'patch',
      'cluster.postgresql.cnpg.io',
      request.clusterName,
      '--type=json',
      '-p',
      JSON.stringify(patchBody),
    ]);
    if (!patch.ok) {
      const after = readPlatformObject(
        {
          profileId: request.env,
          resource: 'cluster.postgresql.cnpg.io',
          name: request.clusterName,
          namespace: namespaceName,
        },
        { run },
      );
      const observedInstances =
        after.state === 'present' ? after.object?.spec?.instances : 'unknown';
      const uncertain = observedInstances === targetInstances;
      return {
        command: 'ensure',
        ok: false,
        readOnly: false,
        mode: 'owned',
        refusals: [
          {
            id: uncertain ? 'patch-result-uncertain' : 'patch-failed',
            detail:
              patch.stderr?.trim() ||
              `patch failed; observed instances ${String(observedInstances)}`,
          },
        ],
        mutated: uncertain,
        complete: false,
        recoveryIdentity: {
          ownerId: request.ownerId,
          clusterName: request.clusterName,
          namespace: namespaceName,
          namespaceUid: ownedNamespaceUid,
          clusterUid,
        },
      };
    }
    mutated = true;
  }

  const readiness = waitForCnpgClusterReadiness(
    request.env,
    {
      namespace: namespaceName,
      clusterName: request.clusterName,
      expectedInstances: targetInstances,
    },
    {
      run,
      sleep: deps.sleep,
      now: deps.now,
    },
  );
  if (!readiness.ok) {
    return {
      command: 'ensure',
      ok: false,
      readOnly: false,
      mode: 'owned',
      env: request.env,
      ownerId: request.ownerId,
      clusterName: request.clusterName,
      currentInstances,
      targetInstances,
      resources,
      refusals: [{ id: 'readiness-timeout', detail: readiness.detail }],
      mutated,
      complete: false,
      recoveryIdentity: {
        ownerId: request.ownerId,
        clusterName: request.clusterName,
        namespace: namespaceName,
        namespaceUid: ownedNamespaceUid,
        clusterUid,
      },
    };
  }

  const endpoints = buildOwnedCnpgEndpoints(request.clusterName, namespaceName);
  return {
    command: 'ensure',
    ok: true,
    readOnly: false,
    mode: 'owned',
    env: request.env,
    ownerId: request.ownerId,
    clusterName: request.clusterName,
    namespace: namespaceName,
    currentInstances,
    targetInstances,
    instances: targetInstances,
    clusterUid,
    currentPrimary: readiness.currentPrimary,
    endpoints,
    resources,
    refusals: [],
    mutated,
    complete: true,
  };
}

/**
 * @param {ParsedTopologyCli} request
 * @param {ReturnType<typeof collectCnpgTopologyObservation>} observation
 * @param {{
 *   run?: typeof runPlatformCommand,
 *   sleep?: (ms: number) => void,
 *   now?: () => number,
 *   assertTarget?: typeof assertPlatformTarget,
 *   collect?: typeof collectCnpgTopologyObservation,
 * }} deps
 */
export function ensureCnpgTopology(request, observation, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const collect = deps.collect ?? collectCnpgTopologyObservation;
  const profile = readPlatformProfile(request.env);
  const baselineName = baselineCnpgClusterName(request.env);

  // --confirm-context is operational authorization to mutate local topology, not
  // proof of Kubernetes RBAC identity. Shared dev scaling is reserved for the
  // human owner, not ordinary agent stack commands.
  if (request.confirmContext !== profile.contextName) {
    return {
      command: 'ensure',
      ok: false,
      readOnly: false,
      refusals: [
        {
          id: 'confirm-context-mismatch',
          detail: `confirm-context must equal ${profile.contextName}`,
        },
      ],
      mutated: false,
      complete: false,
    };
  }

  const preliminary = planCnpgTopology(request, observation);
  if (!preliminary.ok) {
    return {
      ...preliminary,
      command: 'ensure',
      readOnly: false,
      mutated: false,
      complete: false,
    };
  }

  const currentInstances = observation.cluster.spec.instances;
  const targetInstances = request.instances;
  const minHeadroom =
    request.env === 'dev'
      ? DEV_CNPG_MIN_MEMORY_MIB
      : RELEASE_CNPG_MIN_MEMORY_MIB;

  if (targetInstances < currentInstances && !request.allowScaleDown) {
    return {
      command: 'ensure',
      ok: false,
      readOnly: false,
      env: request.env,
      currentInstances,
      targetInstances,
      refusals: [
        {
          id: 'scale-down-not-allowed',
          detail: 'scale-down requires --allow-scale-down',
        },
      ],
      mutated: false,
      complete: false,
    };
  }

  let liveLimitMiB;
  try {
    liveLimitMiB = parseKubernetesMemoryToMib(
      observation.cluster.spec?.resources?.limits?.memory,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      command: 'ensure',
      ok: false,
      readOnly: false,
      refusals: [{ id: 'live-memory-limit-unreadable', detail: message }],
      mutated: false,
      complete: false,
    };
  }

  const memory = assessTopologyMemoryPreflight(
    currentInstances,
    targetInstances,
    observation.memoryMiB,
    liveLimitMiB,
    minHeadroom,
  );
  if (!memory.ok) {
    return {
      command: 'ensure',
      ok: false,
      readOnly: false,
      refusals: [{ id: 'insufficient-memory', detail: memory.detail }],
      mutated: false,
      complete: false,
    };
  }

  const resources = summarizeTopologyResources(
    observation.expectedCluster,
    currentInstances,
    targetInstances,
  );

  if (targetInstances !== currentInstances) {
    const starting = assessCnpgClusterTopologyReadiness(
      observation.cluster,
      currentInstances,
    );
    if (!starting.ok) {
      return {
        command: 'ensure',
        ok: false,
        readOnly: false,
        currentInstances,
        targetInstances,
        resources,
        refusals: [
          {
            id: 'unhealthy-starting-topology',
            detail: starting.detail,
          },
        ],
        mutated: false,
        complete: false,
      };
    }
  }

  let mutated = false;
  if (targetInstances !== currentInstances) {
    const fence = {
      postgresNamespaceUid: observation.postgresNamespace.metadata.uid,
      clusterUid: observation.cluster.metadata.uid,
      clusterResourceVersion: observation.cluster.metadata.resourceVersion,
    };

    const beforePatch = collect(request.env, deps);
    if (
      beforePatch.postgresNamespace?.metadata?.uid !==
        fence.postgresNamespaceUid ||
      beforePatch.cluster?.metadata?.uid !== fence.clusterUid ||
      beforePatch.cluster?.metadata?.resourceVersion !==
        fence.clusterResourceVersion
    ) {
      return {
        command: 'ensure',
        ok: false,
        readOnly: false,
        refusals: [
          {
            id: 'fence-changed-before-patch',
            detail: 'target namespace or cluster identity changed before patch',
          },
        ],
        mutated: false,
        complete: false,
      };
    }

    const patchBody = buildInstancesCasPatch(
      fence.clusterUid,
      fence.clusterResourceVersion,
      currentInstances,
      targetInstances,
    );
    const patch = run('kubectl', [
      '--context',
      profile.contextName,
      '-n',
      profile.namespaces.postgres,
      'patch',
      'cluster.postgresql.cnpg.io',
      baselineName,
      '--type=json',
      '-p',
      JSON.stringify(patchBody),
    ]);

    if (!patch.ok) {
      const after = readPlatformObject(
        {
          profileId: request.env,
          resource: 'cluster.postgresql.cnpg.io',
          name: baselineName,
          namespace: profile.namespaces.postgres,
        },
        { run },
      );
      const observedInstances =
        after.state === 'present' ? after.object?.spec?.instances : 'unknown';
      const uncertain = observedInstances === targetInstances;
      return {
        command: 'ensure',
        ok: false,
        readOnly: false,
        refusals: [
          {
            id: uncertain ? 'patch-result-uncertain' : 'patch-failed',
            detail:
              patch.stderr?.trim() ||
              `patch failed; observed instances ${String(observedInstances)}`,
          },
        ],
        mutated: uncertain,
        complete: false,
      };
    }
    mutated = true;
  }

  const readiness = waitForCnpgTopologyReadiness(request.env, targetInstances, {
    run,
    sleep: deps.sleep,
    now: deps.now,
  });
  if (!readiness.ok) {
    return {
      command: 'ensure',
      ok: false,
      readOnly: false,
      env: request.env,
      currentInstances,
      targetInstances,
      resources,
      refusals: [{ id: 'readiness-timeout', detail: readiness.detail }],
      mutated,
      complete: false,
    };
  }

  return {
    command: 'ensure',
    ok: true,
    readOnly: false,
    env: request.env,
    baselineCluster: baselineName,
    currentInstances,
    targetInstances,
    currentPrimary: readiness.currentPrimary,
    resources,
    refusals: [],
    mutated,
    complete: true,
  };
}

/**
 * @param {ParsedTopologyCli} parsed
 * @param {{
 *   run?: typeof runPlatformCommand,
 *   sleep?: (ms: number) => void,
 *   now?: () => number,
 *   readMeminfo?: () => string,
 *   readPin?: () => string,
 *   assertTarget?: typeof assertPlatformTarget,
 *   collect?: typeof collectCnpgTopologyObservation,
 * }} [deps]
 */
export function runCnpgTopologyControl(parsed, deps = {}) {
  if (isOwnedTopologyRequest(parsed)) {
    const collectOwned =
      deps.collectOwned ?? deps.collect ?? collectOwnedCnpgTopologyObservation;
    const observation = collectOwned(
      parsed.env,
      parsed.ownerId,
      parsed.clusterName,
      deps,
    );
    if (parsed.command === 'plan') {
      return planOwnedCnpgTopology(parsed, observation);
    }
    if (parsed.command === 'status') {
      return statusOwnedCnpgTopology(parsed, observation);
    }
    return ensureOwnedCnpgTopology(parsed, observation, {
      ...deps,
      collect: collectOwned,
    });
  }

  const observation = (deps.collect ?? collectCnpgTopologyObservation)(
    parsed.env,
    deps,
  );
  if (parsed.command === 'plan') {
    return planCnpgTopology(parsed, observation);
  }
  if (parsed.command === 'status') {
    return statusCnpgTopology(parsed, observation);
  }
  return ensureCnpgTopology(parsed, observation, deps);
}

/**
 * @param {unknown} value
 */
function redactTopologyValue(value) {
  if (typeof value !== 'string') {
    return value;
  }
  if (value.length > 200) {
    return `${value.slice(0, 80)}…[redacted]`;
  }
  return value.replace(
    /"(secretAccessKey|accessKeyId|password|token)":\s*"[^"]*"/gi,
    '"$1":"[redacted]"',
  );
}

/**
 * @param {Record<string, unknown>} receipt
 */
export function redactTopologyReceipt(receipt) {
  const next = { ...receipt };
  if (Array.isArray(receipt.refusals)) {
    next.refusals = receipt.refusals.map((item) => ({
      ...item,
      detail: item.detail ? redactTopologyValue(item.detail) : undefined,
    }));
  }
  if (
    receipt.recoveryIdentity &&
    typeof receipt.recoveryIdentity === 'object'
  ) {
    next.recoveryIdentity = { ...receipt.recoveryIdentity };
  }
  return next;
}
