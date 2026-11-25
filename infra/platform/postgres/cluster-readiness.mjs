import { readPlatformObject } from '../common/commands.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import { baselineCnpgClusterName } from './config.mjs';

export const CNPG_HEALTHY_PHASE = 'Cluster in healthy state';
export const TOPOLOGY_READINESS_TIMEOUT_MS = 600_000;
export const TOPOLOGY_READINESS_POLL_MS = 5_000;

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
 * @param {TopologyEnv} env
 * @param {{ namespace: string, clusterName: string, expectedInstances: number }} target
 * @param {{
 *   run: typeof import('../common/commands.mjs').runPlatformCommand,
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
 *   run: typeof import('../common/commands.mjs').runPlatformCommand,
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
