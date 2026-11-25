import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertPlatformTarget,
  readPlatformObject,
  runPlatformCommand,
  RELEASE_BASELINE_NAMESPACE,
} from '../../common/commands.mjs';
import { readPlatformProfile } from '../../common/profile.mjs';
import {
  DEV_BASELINE_NAMESPACE,
  DEV_CLUSTER_OWNER,
} from '../../../clusters/kind/manager/dev-bootstrap.mjs';
import {
  baselineCnpgClusterName,
  CNPG_CRD_NAME,
  CNPG_OPERATOR_DEPLOYMENT,
  CNPG_OPERATOR_NAMESPACE,
  DEV_CNPG_OWNER,
  parseCnpgPin,
  RELEASE_LAB_LABEL_KEY,
  RELEASE_LAB_LABEL_VALUE,
} from '../config.mjs';
import { isOperatorDeploymentAvailable } from '../cluster-readiness.mjs';
import {
  assessLiveClusterIdentity,
  assessLiveOwnedClusterIdentity,
  assessOwnedNamespaceOwnership,
  ownedPostgresNamespaceName,
  readHostMemoryMib,
  renderExpectedBaselineCluster,
  renderOwnedPostgresCluster,
} from './model.mjs';

/** @typedef {'dev' | 'release'} TopologyEnv */

const topologyParent = dirname(fileURLToPath(import.meta.url));
const operatorPinPath = join(topologyParent, '..', 'operator.pin');

/**
 * @param {typeof runPlatformCommand} run
 * @param {{ id: string, reason: string }[]} unreadable
 */
function createPlatformObjectReader(run, unreadable) {
  return (spec) => {
    const observation = readPlatformObject(spec, { run });
    if (observation.state === 'unreadable') {
      unreadable.push({ id: spec.name, reason: observation.reason });
    }
    return observation;
  };
}

/**
 * @param {string} text
 */
function readCnpgPin(text) {
  return parseCnpgPin(text);
}

/**
 * @param {{ readPin?: () => string }} deps
 * @returns {ReturnType<typeof parseCnpgPin> | null}
 */
function readOperatorPinFromDeps(deps) {
  try {
    return readCnpgPin(
      deps.readPin ? deps.readPin() : readFileSync(operatorPinPath, 'utf8'),
    );
  } catch {
    return null;
  }
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
export function assessTopologyObservation(observation) {
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

  const read = createPlatformObjectReader(run, unreadable);

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

  const pin = readOperatorPinFromDeps(deps);
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

  const read = createPlatformObjectReader(run, unreadable);

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

  const pin = readOperatorPinFromDeps(deps);
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
export function assessOwnedTopologyObservation(observation) {
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
