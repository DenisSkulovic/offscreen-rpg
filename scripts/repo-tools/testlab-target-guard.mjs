/**
 * Pure testlab target policy; no kubectl, DB, or cluster mutations.
 */

import { TESTLAB_ALLOWED_TARGETS } from './testlab-grant-contract.mjs';

/** @typedef {{ id: string, message: string }} TestlabTargetRefusal */

export const OFFSCREEN_WRITER_EXECUTION_MODE_ENV =
  'OFFSCREEN_WRITER_EXECUTION_MODE';
export const WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB =
  'scripted-offline-lab';
export const WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED = 'provider-authorized';
export const OFFSCREEN_WRITER_PROVIDER_MODEL_ENV =
  'OFFSCREEN_WRITER_PROVIDER_MODEL';
export const OFFSCREEN_WRITER_PROVIDER_POLICY_VERSION_ENV =
  'OFFSCREEN_WRITER_PROVIDER_POLICY_VERSION';
export const OPENROUTER_API_KEY_ENV = 'OPENROUTER_API_KEY';

/** Mirrors stack-preflight / owned-app-resources.json lab identity (read-only facts). */
export const LAB_OWNED_APP_IDENTITY = Object.freeze({
  clusterName: 'offscreen-release',
  contextName: 'kind-offscreen-release',
  authorityNamespace: 'lab-authority',
  workersNamespace: 'lab-workers',
  gameAuthorityDeployment: 'game-authority',
  gameExecutorDeployment: 'game-executor',
  postgresNamespace: 'lab-postgres',
  postgresClusterKind: 'Cluster',
  postgresClusterName: 'lab-pg',
});

export const TESTLAB_TARGET_REFUSAL_CODES = Object.freeze({
  DB_CONNECTION_FORBIDDEN: 'db-connection-forbidden',
  INVALID_TARGET: 'invalid-target',
  UNKNOWN_TARGET: 'unknown-target',
  PRODUCTION_TARGET: 'production-target',
  MISSING_DISPOSABLE_MODE: 'missing-disposable-mode',
  WRONG_CLUSTER_CONTEXT: 'wrong-cluster-context',
  WRONG_CLUSTER_NAME: 'wrong-cluster-name',
  WRONG_CLUSTER_UID: 'wrong-cluster-uid',
  MISSING_CLUSTER_UID: 'missing-cluster-uid',
  WRONG_WORKLOAD_NAMESPACE: 'wrong-workload-namespace',
  AMBIGUOUS_DB: 'ambiguous-db',
  WRONG_DB_INSTANCE: 'wrong-db-instance',
  MISSING_DB_INSTANCE_UID: 'missing-db-instance-uid',
  WRONG_DB_INSTANCE_UID: 'wrong-db-instance-uid',
  OPERATOR_GRANT_REQUIRED: 'operator-grant-required',
  PROVIDER_AUTHORIZED_MODE: 'provider-authorized-mode',
  MISSING_WRITER_MODE: 'missing-writer-mode',
  WRONG_WRITER_MODE: 'wrong-writer-mode',
  OPENROUTER_KEY_PRESENT: 'openrouter-key-present',
  PROVIDER_PIN_PRESENT: 'provider-pin-present',
  MIXED_PROVIDER_PIN: 'mixed-provider-pin',
  MISSING_PROVIDER_PIN: 'missing-provider-pin',
  ENV_FROM_AMBIGUOUS: 'env-from-ambiguous',
  VALUE_FROM_AMBIGUOUS: 'value-from-ambiguous',
});

/** @param {unknown} value */
function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/** @param {Record<string, string | undefined> | undefined} env */
function openrouterKeyPresent(env) {
  const raw = env?.[OPENROUTER_API_KEY_ENV];
  return raw !== undefined && raw.trim() !== '';
}

/** @param {Record<string, string | undefined> | undefined} env */
function providerModelPresent(env) {
  const raw = env?.[OFFSCREEN_WRITER_PROVIDER_MODEL_ENV];
  return raw !== undefined && raw.trim() !== '';
}

/** @param {Record<string, string | undefined> | undefined} env */
function providerPolicyVersionPresent(env) {
  const raw = env?.[OFFSCREEN_WRITER_PROVIDER_POLICY_VERSION_ENV];
  return raw !== undefined && raw.trim() !== '';
}

/**
 * @param {Record<string, string | undefined> | undefined} env
 * @param {string} workloadLabel
 * @param {TestlabTargetRefusal[]} refusals
 */
function verifyProviderFreeWorkloadEnv(env, workloadLabel, refusals) {
  const mode = env?.[OFFSCREEN_WRITER_EXECUTION_MODE_ENV];
  const trimmed = typeof mode === 'string' ? mode.trim() : '';
  if (trimmed === '') {
    refusals.push({
      id: TESTLAB_TARGET_REFUSAL_CODES.MISSING_WRITER_MODE,
      message: `${workloadLabel} must set ${OFFSCREEN_WRITER_EXECUTION_MODE_ENV} to ${WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB}.`,
    });
    return;
  }
  if (trimmed === WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED) {
    refusals.push({
      id: TESTLAB_TARGET_REFUSAL_CODES.PROVIDER_AUTHORIZED_MODE,
      message: `${workloadLabel} must not use provider-authorized writer mode.`,
    });
    return;
  }
  if (trimmed !== WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB) {
    refusals.push({
      id: TESTLAB_TARGET_REFUSAL_CODES.WRONG_WRITER_MODE,
      message: `${workloadLabel} has unsupported ${OFFSCREEN_WRITER_EXECUTION_MODE_ENV}.`,
    });
    return;
  }
  if (openrouterKeyPresent(env)) {
    refusals.push({
      id: TESTLAB_TARGET_REFUSAL_CODES.OPENROUTER_KEY_PRESENT,
      message: `${workloadLabel} must not have ${OPENROUTER_API_KEY_ENV} set.`,
    });
  }
  const modelPin = providerModelPresent(env);
  const policyPin = providerPolicyVersionPresent(env);
  if (modelPin || policyPin) {
    refusals.push({
      id: TESTLAB_TARGET_REFUSAL_CODES.PROVIDER_PIN_PRESENT,
      message: `${workloadLabel} must not set provider pin env vars.`,
    });
    if (modelPin !== policyPin) {
      refusals.push({
        id: TESTLAB_TARGET_REFUSAL_CODES.MIXED_PROVIDER_PIN,
        message: `${workloadLabel} has a partial provider pin (model/policy mismatch).`,
      });
    }
  }
}

/**
 * @param {Record<string, string | undefined> | undefined} env
 * @param {string} workloadLabel
 * @param {TestlabTargetRefusal[]} refusals
 */
/**
 * envFrom and valueFrom hide whether a provider credential is present.
 * @param {{ envFrom?: boolean, ambiguousValueFrom?: boolean }} workload
 * @param {string} workloadLabel
 * @param {TestlabTargetRefusal[]} refusals
 */
function verifyWorkloadCredentialShape(workload, workloadLabel, refusals) {
  if (workload?.envFrom === true) {
    refusals.push({
      id: TESTLAB_TARGET_REFUSAL_CODES.ENV_FROM_AMBIGUOUS,
      message: `${workloadLabel} must not use envFrom; provider credentials would be ambiguous.`,
    });
  }
  if (workload?.ambiguousValueFrom === true) {
    refusals.push({
      id: TESTLAB_TARGET_REFUSAL_CODES.VALUE_FROM_AMBIGUOUS,
      message: `${workloadLabel} writer or provider env uses valueFrom; refusing ambiguous credentials.`,
    });
  }
}

function verifyDisposableProviderFreeEnv(env, workloadLabel, refusals) {
  verifyProviderFreeWorkloadEnv(env, workloadLabel, refusals);
  const mode = env?.[OFFSCREEN_WRITER_EXECUTION_MODE_ENV]?.trim() ?? '';
  if (mode === WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED) {
    const modelPin = providerModelPresent(env);
    const policyPin = providerPolicyVersionPresent(env);
    if (!modelPin || !policyPin) {
      refusals.push({
        id: TESTLAB_TARGET_REFUSAL_CODES.MISSING_PROVIDER_PIN,
        message: `${workloadLabel} provider-authorized mode requires both provider pin env vars.`,
      });
    }
  }
}

/**
 * @typedef {{
 *   target?: string,
 *   runtimeMode?: string,
 *   production?: boolean,
 *   localEnv?: Record<string, string | undefined>,
 *   cluster?: {
 *     contextName?: string | null,
 *     clusterName?: string | null,
 *     uid?: string | null,
 *   },
 *   expectedClusterUid?: string | null,
 *   databaseUrl?: string | null,
 *   dbInstance?: {
 *     namespace?: string,
 *     name?: string,
 *     kind?: string,
 *     uid?: string | null,
 *   } | null,
 *   expectedDbInstanceUid?: string | null,
 *   dbInstanceAmbiguous?: boolean,
 *   gameAuthority?: {
 *     namespace?: string,
 *     deploymentName?: string,
 *     image?: string,
 *     podImage?: string,
 *     ready?: boolean,
 *     env?: Record<string, string | undefined>,
 *     envFrom?: boolean,
 *     ambiguousValueFrom?: boolean,
 *   },
 *   gameExecutor?: {
 *     namespace?: string,
 *     deploymentName?: string,
 *     image?: string,
 *     podImage?: string,
 *     ready?: boolean,
 *     env?: Record<string, string | undefined>,
 *     envFrom?: boolean,
 *     ambiguousValueFrom?: boolean,
 *   },
 *   operatorGrantAuthorized?: boolean,
 *   dbConnection?: unknown,
 *   pgClient?: unknown,
 *   connectionHandle?: unknown,
 * }} TestlabTargetObservation
 */

/**
 * @param {TestlabTargetObservation | null | undefined} observation
 * @param {{ intent?: 'read' | 'write' }} [options]
 *   Default intent is `write`, so existing callers keep the operator-grant requirement.
 * @returns {{ ok: true, target: string } | { ok: false, refusals: readonly TestlabTargetRefusal[] }}
 */
export function verifyTestlabTarget(observation, options = {}) {
  const intent = options.intent === 'read' ? 'read' : 'write';
  /** @type {TestlabTargetRefusal[]} */
  const refusals = [];

  if (
    observation !== null &&
    observation !== undefined &&
    (observation.dbConnection !== undefined ||
      observation.pgClient !== undefined ||
      observation.connectionHandle !== undefined)
  ) {
    refusals.push({
      id: TESTLAB_TARGET_REFUSAL_CODES.DB_CONNECTION_FORBIDDEN,
      message:
        'A database connection handle must not be supplied; target verification is pre-connection only.',
    });
    return Object.freeze({ ok: false, refusals: Object.freeze([...refusals]) });
  }

  const target = nonEmptyString(observation?.target);
  if (!target) {
    refusals.push({
      id: TESTLAB_TARGET_REFUSAL_CODES.UNKNOWN_TARGET,
      message: 'target must be explicitly disposable or kind-offscreen-release.',
    });
    return Object.freeze({ ok: false, refusals: Object.freeze([...refusals]) });
  }

  if (observation?.production === true || target === 'production') {
    refusals.push({
      id: TESTLAB_TARGET_REFUSAL_CODES.PRODUCTION_TARGET,
      message: 'Production targets are not allowed for testlab funding.',
    });
  }

  if (!TESTLAB_ALLOWED_TARGETS.includes(target)) {
    refusals.push({
      id: TESTLAB_TARGET_REFUSAL_CODES.INVALID_TARGET,
      message: `target must be one of: ${TESTLAB_ALLOWED_TARGETS.join(', ')}.`,
    });
    return Object.freeze({ ok: false, refusals: Object.freeze([...refusals]) });
  }

  if (target === 'disposable') {
    const runtimeMode = nonEmptyString(observation?.runtimeMode);
    if (runtimeMode !== 'test-container') {
      refusals.push({
        id: TESTLAB_TARGET_REFUSAL_CODES.MISSING_DISPOSABLE_MODE,
        message: 'disposable target requires runtimeMode test-container.',
      });
    }
    verifyDisposableProviderFreeEnv(
      observation?.localEnv ?? {},
      'disposable runtime',
      refusals,
    );
    if (refusals.length > 0) {
      return Object.freeze({
        ok: false,
        refusals: Object.freeze([...refusals]),
      });
    }
    return Object.freeze({ ok: true, target });
  }

  // kind-offscreen-release
  const identity = LAB_OWNED_APP_IDENTITY;
  const cluster = observation?.cluster ?? {};
  const contextName = nonEmptyString(cluster.contextName);
  const clusterName = nonEmptyString(cluster.clusterName);
  const clusterUid = nonEmptyString(cluster.uid);
  const expectedClusterUid = nonEmptyString(observation?.expectedClusterUid);

  if (contextName !== identity.contextName) {
    refusals.push({
      id: TESTLAB_TARGET_REFUSAL_CODES.WRONG_CLUSTER_CONTEXT,
      message: `Cluster context must be ${identity.contextName}.`,
    });
  }
  if (clusterName !== identity.clusterName) {
    refusals.push({
      id: TESTLAB_TARGET_REFUSAL_CODES.WRONG_CLUSTER_NAME,
      message: `Cluster name must be ${identity.clusterName}.`,
    });
  }
  if (!clusterUid) {
    refusals.push({
      id: TESTLAB_TARGET_REFUSAL_CODES.MISSING_CLUSTER_UID,
      message: 'Observed cluster UID is required for kind-offscreen-release.',
    });
  } else if (intent === 'write' && !expectedClusterUid) {
    refusals.push({
      id: TESTLAB_TARGET_REFUSAL_CODES.WRONG_CLUSTER_UID,
      message:
        'expectedClusterUid must be supplied and match the observed cluster UID.',
    });
  } else if (expectedClusterUid && clusterUid !== expectedClusterUid) {
    refusals.push({
      id: TESTLAB_TARGET_REFUSAL_CODES.WRONG_CLUSTER_UID,
      message: 'Observed cluster UID does not match expectedClusterUid.',
    });
  }

  if (intent === 'write' && observation?.operatorGrantAuthorized !== true) {
    refusals.push({
      id: TESTLAB_TARGET_REFUSAL_CODES.OPERATOR_GRANT_REQUIRED,
      message: 'operatorGrantAuthorized must be true for kind-offscreen-release writes.',
    });
  }

  const dbUrl = nonEmptyString(observation?.databaseUrl);
  const dbInstance = observation?.dbInstance ?? null;
  const hasStructuredDb =
    dbInstance !== null &&
    nonEmptyString(dbInstance?.namespace) !== null &&
    nonEmptyString(dbInstance?.name) !== null;

  if (
    observation?.dbInstanceAmbiguous === true ||
    (dbUrl && !hasStructuredDb)
  ) {
    refusals.push({
      id: TESTLAB_TARGET_REFUSAL_CODES.AMBIGUOUS_DB,
      message:
        'DATABASE_URL alone cannot select the lab database; explicit dbInstance identity is required.',
    });
  }

  if (!hasStructuredDb) {
    refusals.push({
      id: TESTLAB_TARGET_REFUSAL_CODES.AMBIGUOUS_DB,
      message:
        'dbInstance namespace and name are required for kind-offscreen-release.',
    });
  } else {
    const ns = nonEmptyString(dbInstance.namespace);
    const name = nonEmptyString(dbInstance.name);
    const kind =
      nonEmptyString(dbInstance.kind) ?? identity.postgresClusterKind;
    if (
      ns !== identity.postgresNamespace ||
      name !== identity.postgresClusterName ||
      kind !== identity.postgresClusterKind
    ) {
      refusals.push({
        id: TESTLAB_TARGET_REFUSAL_CODES.WRONG_DB_INSTANCE,
        message: `dbInstance must identify ${identity.postgresClusterKind}/${identity.postgresClusterName} in ${identity.postgresNamespace}.`,
      });
    }
    const instanceUid = nonEmptyString(dbInstance.uid);
    const expectedDbUid = nonEmptyString(observation?.expectedDbInstanceUid);
    if (!instanceUid) {
      refusals.push({
        id: TESTLAB_TARGET_REFUSAL_CODES.MISSING_DB_INSTANCE_UID,
        message:
          'Observed dbInstance UID is required (not inferred from DATABASE_URL).',
      });
    } else if (intent === 'write' && !expectedDbUid) {
      refusals.push({
        id: TESTLAB_TARGET_REFUSAL_CODES.WRONG_DB_INSTANCE_UID,
        message:
          'expectedDbInstanceUid must be supplied independently for a kind write.',
      });
    } else if (expectedDbUid && instanceUid !== expectedDbUid) {
      refusals.push({
        id: TESTLAB_TARGET_REFUSAL_CODES.WRONG_DB_INSTANCE_UID,
        message:
          'Observed dbInstance UID does not match expectedDbInstanceUid.',
      });
    }
  }

  const ga = observation?.gameAuthority ?? {};
  const gaNs = nonEmptyString(ga.namespace);
  const gaName = nonEmptyString(ga.deploymentName);
  if (
    gaNs !== identity.authorityNamespace ||
    gaName !== identity.gameAuthorityDeployment
  ) {
    refusals.push({
      id: TESTLAB_TARGET_REFUSAL_CODES.WRONG_WORKLOAD_NAMESPACE,
      message: `game-authority must be Deployment/${identity.gameAuthorityDeployment} in ${identity.authorityNamespace}.`,
    });
  } else {
    verifyWorkloadCredentialShape(ga, 'game-authority', refusals);
    verifyProviderFreeWorkloadEnv(ga.env, 'game-authority', refusals);
  }

  const ex = observation?.gameExecutor ?? {};
  const exNs = nonEmptyString(ex.namespace);
  const exName = nonEmptyString(ex.deploymentName);
  if (
    exNs !== identity.workersNamespace ||
    exName !== identity.gameExecutorDeployment
  ) {
    refusals.push({
      id: TESTLAB_TARGET_REFUSAL_CODES.WRONG_WORKLOAD_NAMESPACE,
      message: `game-executor must be Deployment/${identity.gameExecutorDeployment} in ${identity.workersNamespace}.`,
    });
  } else {
    verifyWorkloadCredentialShape(ex, 'game-executor', refusals);
    verifyProviderFreeWorkloadEnv(ex.env, 'game-executor', refusals);
  }

  if (refusals.length > 0) {
    return Object.freeze({ ok: false, refusals: Object.freeze([...refusals]) });
  }
  return Object.freeze({ ok: true, target });
}
