export {
  CNPG_HEALTHY_PHASE,
  TOPOLOGY_READINESS_TIMEOUT_MS,
  TOPOLOGY_READINESS_POLL_MS,
  assertPositiveCnpgInstances,
  assessCnpgClusterTopologyReadiness,
  resolveExpectedCnpgInstances,
  isOperatorDeploymentAvailable,
  waitForCnpgClusterReadiness,
  waitForCnpgTopologyReadiness,
} from './cluster-readiness.mjs';

export {
  CNPG_OPERATOR_DEPLOYMENT,
  CNPG_OPERATOR_NAMESPACE,
  CNPG_CRD_NAME,
  baselineCnpgClusterName,
} from './config.mjs';

export {
  parseCanonicalPositiveInteger,
  parseKubernetesMemoryToMib,
  buildInstancesCasPatch,
  assessLiveClusterIdentity,
  renderExpectedBaselineCluster,
  OWNED_CNPG_RESOURCE_SUFFIX_HEADROOM,
  assertOwnedPostgresDnsLabel,
  assertOwnedPostgresClusterName,
  ownedPostgresNamespaceName,
  buildOwnedPostgresLabels,
  renderOwnedPostgresCluster,
  readHostMemoryMib,
  assessTopologyMemoryPreflight,
  summarizeTopologyResources,
  buildOwnedCnpgEndpoints,
  assessLiveOwnedClusterIdentity,
  assessOwnedNamespaceOwnership,
} from './topology/model.mjs';

export {
  parseTopologyCliArgs,
  isOwnedTopologyRequest,
} from './topology/arguments.mjs';

export {
  collectCnpgTopologyObservation,
  collectOwnedCnpgTopologyObservation,
} from './topology/observation.mjs';

export {
  planCnpgTopology,
  statusCnpgTopology,
  ensureCnpgTopology,
} from './topology/baseline.mjs';

export {
  planOwnedCnpgTopology,
  statusOwnedCnpgTopology,
  ensureOwnedCnpgTopology,
} from './topology/owned.mjs';

import { isOwnedTopologyRequest } from './topology/arguments.mjs';
import {
  collectCnpgTopologyObservation,
  collectOwnedCnpgTopologyObservation,
} from './topology/observation.mjs';
import {
  planCnpgTopology,
  statusCnpgTopology,
  ensureCnpgTopology,
} from './topology/baseline.mjs';
import {
  planOwnedCnpgTopology,
  statusOwnedCnpgTopology,
  ensureOwnedCnpgTopology,
} from './topology/owned.mjs';

/** @typedef {import('./topology/arguments.mjs').ParsedTopologyCli} ParsedTopologyCli */

/**
 * @param {ParsedTopologyCli} parsed
 * @param {{
 *   run?: import('../common/commands.mjs').runPlatformCommand,
 *   sleep?: (ms: number) => void,
 *   now?: () => number,
 *   readMeminfo?: () => string,
 *   readPin?: () => string,
 *   assertTarget?: import('../common/commands.mjs').assertPlatformTarget,
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
