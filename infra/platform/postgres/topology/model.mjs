import { readFileSync } from 'node:fs';
import { runPlatformCommand } from '../../common/commands.mjs';
import { renderPlatformDocuments } from '../../common/render.mjs';
import { readPlatformProfile } from '../../common/profile.mjs';
import { DEV_CNPG_OWNER, baselineCnpgClusterName } from '../config.mjs';
import { assertPositiveCnpgInstances } from '../cluster-readiness.mjs';

/** @typedef {'dev' | 'release'} TopologyEnv */

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
  const baselineBefore = globalThis.structuredClone(
    renderExpected(profileId, run),
  );

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

  const cluster = globalThis.structuredClone(rendered[0]);
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
