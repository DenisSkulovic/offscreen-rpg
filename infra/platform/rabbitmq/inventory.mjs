import {
  assertPlatformTarget,
  readPlatformObject,
  runPlatformCommand,
  PLATFORM_COMMAND_TIMEOUT_MS,
} from '../common/commands.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import {
  loadVendorBundle,
  NATIVE_DESIGN_LABEL,
  NATIVE_DESIGN_VALUE,
} from './vendor-bundles.mjs';

export const LEGACY_MESSAGING_NAMESPACE = 'messaging';
export const LEGACY_BROKER_NAME = 'lab-broker';
export const BROKER_NAME = 'rabbitmq';
export const CERT_MANAGER_NAMESPACE = 'cert-manager';
export const OPERATOR_NAMESPACE = 'rabbitmq-system';

const KUBECTL_TIMEOUT_MS = 10_000;
const LIST_TIMEOUT_MS = PLATFORM_COMMAND_TIMEOUT_MS;

/** @typedef {'dev' | 'release'} RabbitmqProfileId */

/**
 * @typedef {{
 *   profileId: RabbitmqProfileId,
 *   contextName: string,
 *   brokerNamespace: string,
 *   brokerName: string,
 *   storageClass: string,
 *   ownerLabel: string,
 *   ownerValue: string,
 *   ownerKey: string,
 * }} RabbitmqInventoryTarget
 */

/** @typedef {(command: string, args: string[], options?: { input?: string, timeoutMs?: number }) => ReturnType<typeof runPlatformCommand>} PlatformRun */

/** @type {Readonly<Record<string, { resource: string, group: string, version: string, namespaced: true, crd: string, listResource: string }>>} */
export const CUSTOM_API_MAP = Object.freeze({
  Certificate: Object.freeze({
    resource: 'certificates.cert-manager.io',
    group: 'cert-manager.io',
    version: 'v1',
    namespaced: true,
    crd: 'certificates.cert-manager.io',
    listResource: 'certificates.cert-manager.io',
  }),
  Issuer: Object.freeze({
    resource: 'issuers.cert-manager.io',
    group: 'cert-manager.io',
    version: 'v1',
    namespaced: true,
    crd: 'issuers.cert-manager.io',
    listResource: 'issuers.cert-manager.io',
  }),
  RabbitmqCluster: Object.freeze({
    resource: 'rabbitmqclusters.rabbitmq.com',
    group: 'rabbitmq.com',
    version: 'v1beta1',
    namespaced: true,
    crd: 'rabbitmqclusters.rabbitmq.com',
    listResource: 'rabbitmqclusters.rabbitmq.com',
  }),
});

/** @type {Readonly<Record<string, string>>} */
const BUILTIN_QUALIFIED_RESOURCES = Object.freeze({
  Namespace: 'namespace',
  ServiceAccount: 'serviceaccount',
  Service: 'service',
  Deployment: 'deployments.apps',
  ClusterRole: 'clusterroles.rbac.authorization.k8s.io',
  ClusterRoleBinding: 'clusterrolebindings.rbac.authorization.k8s.io',
  Role: 'roles.rbac.authorization.k8s.io',
  RoleBinding: 'rolebindings.rbac.authorization.k8s.io',
  CustomResourceDefinition: 'customresourcedefinitions.apiextensions.k8s.io',
  MutatingWebhookConfiguration:
    'mutatingwebhookconfigurations.admissionregistration.k8s.io',
  ValidatingWebhookConfiguration:
    'validatingwebhookconfigurations.admissionregistration.k8s.io',
});

/**
 * @param {object} object
 */
export function vendorObjectToIdentity(object) {
  const kind = object.kind;
  const name = object.metadata?.name;
  if (typeof kind !== 'string' || typeof name !== 'string') {
    throw new Error('vendor object missing kind or name');
  }
  const custom = CUSTOM_API_MAP[kind];
  if (custom) {
    return {
      kind,
      apiVersion: object.apiVersion,
      name,
      namespace: object.metadata?.namespace,
      resource: custom.resource,
      clusterScoped: !object.metadata?.namespace,
      customKind: kind,
    };
  }
  const resource = BUILTIN_QUALIFIED_RESOURCES[kind];
  if (!resource) {
    throw new Error(`unsupported inventory kind: ${kind}`);
  }
  const clusterScoped =
    resource === 'namespace' ? false : !object.metadata?.namespace;
  return {
    kind,
    apiVersion: object.apiVersion,
    name,
    namespace: object.metadata?.namespace,
    resource,
    clusterScoped:
      clusterScoped ||
      [
        'clusterroles.rbac.authorization.k8s.io',
        'clusterrolebindings.rbac.authorization.k8s.io',
        'customresourcedefinitions.apiextensions.k8s.io',
        'mutatingwebhookconfigurations.admissionregistration.k8s.io',
        'validatingwebhookconfigurations.admissionregistration.k8s.io',
      ].includes(resource),
    customKind: null,
  };
}

let cachedVendorIdentities = null;

export function expectedVendorIdentities() {
  if (cachedVendorIdentities) {
    return cachedVendorIdentities;
  }
  const cert = loadVendorBundle('cert-manager');
  const operator = loadVendorBundle('cluster-operator');
  const identities = [...cert.objects, ...operator.objects].map(
    vendorObjectToIdentity,
  );
  cachedVendorIdentities = Object.freeze(identities);
  return cachedVendorIdentities;
}

/**
 * @param {RabbitmqProfileId} profileId
 */
export function rabbitmqTargetFromProfile(profileId) {
  if (profileId !== 'dev' && profileId !== 'release') {
    throw new Error(`unsupported platform profile: ${profileId}`);
  }
  const profile = readPlatformProfile(profileId);
  const brokerNamespace = profile.namespaces.rabbitmq;
  if (typeof brokerNamespace !== 'string' || brokerNamespace.length === 0) {
    throw new Error(`rabbitmq namespace missing for profile ${profileId}`);
  }
  const ownerKey =
    profileId === 'dev'
      ? `${profile.ownerLabel}/owner`
      : `${profile.ownerLabel}/lab`;
  return {
    profileId,
    contextName: profile.contextName,
    brokerNamespace,
    brokerName: BROKER_NAME,
    storageClass: profile.storageClass,
    ownerLabel: profile.ownerLabel,
    ownerValue: profile.ownerValue,
    ownerKey,
  };
}

/**
 * @param {ReturnType<typeof runPlatformCommand>} result
 */
function kubectlFailureStatus(result) {
  if (result.status != null) {
    return result.status;
  }
  const match = String(result.stderr ?? '').match(
    /(?:^|\s)(404|403|401|500)(?:\s|$)/,
  );
  return match ? Number.parseInt(match[1], 10) : null;
}

/**
 * @param {RabbitmqInventoryTarget} target
 * @param {string} group
 * @param {string} version
 * @param {PlatformRun} run
 */
export function discoverApiVersion(target, group, version, run) {
  const rawPath = `/apis/${group}/${version}`;
  const result = run(
    'kubectl',
    [
      '--context',
      target.contextName,
      `--request-timeout=${KUBECTL_TIMEOUT_MS / 1000}s`,
      'get',
      '--raw',
      rawPath,
    ],
    { timeoutMs: LIST_TIMEOUT_MS },
  );
  if (result.missing) {
    return { state: 'unknown', reason: 'kubectl-missing' };
  }
  if (result.timedOut) {
    return { state: 'unknown', reason: 'discovery-timeout' };
  }
  if (result.ok) {
    try {
      const body = JSON.parse(result.stdout);
      const resources = Array.isArray(body?.resources) ? body.resources : [];
      return { state: 'present', resources };
    } catch {
      return { state: 'unknown', reason: 'discovery-malformed' };
    }
  }
  const httpStatus = kubectlFailureStatus(result);
  if (httpStatus === 404) {
    return { state: 'absent' };
  }
  if (httpStatus === 403 || httpStatus === 401) {
    return { state: 'unknown', reason: 'discovery-denied' };
  }
  return { state: 'unknown', reason: 'discovery-failed' };
}

/**
 * @param {RabbitmqProfileId} profileId
 * @param {string} crdName
 * @param {{ run?: PlatformRun, readObject?: typeof readPlatformObject }} deps
 */
export function readCrdState(profileId, crdName, deps = {}) {
  const readObject = deps.readObject ?? readPlatformObject;
  const result = readObject(
    {
      profileId,
      resource: 'customresourcedefinitions.apiextensions.k8s.io',
      name: crdName,
    },
    deps.run ? { run: deps.run } : {},
  );
  if (result.state === 'unreadable') {
    return { state: 'unknown', reason: 'crd-unreadable' };
  }
  if (result.state === 'absent') {
    return { state: 'absent' };
  }
  const conditions = result.object?.status?.conditions;
  const established = Array.isArray(conditions)
    ? conditions.some(
        (entry) => entry?.type === 'Established' && entry?.status === 'True',
      )
    : false;
  if (!established) {
    return { state: 'unestablished', object: result.object };
  }
  const versions = result.object?.spec?.versions;
  const served = Array.isArray(versions)
    ? versions.some((entry) => entry?.served === true)
    : false;
  if (!served) {
    return { state: 'unestablished', object: result.object };
  }
  return { state: 'established', object: result.object };
}

/**
 * @param {string} customKind
 * @param {RabbitmqInventoryTarget} target
 * @param {{ run?: PlatformRun, readObject?: typeof readPlatformObject }} deps
 */
export function resolveCustomApiGate(customKind, target, deps = {}) {
  const spec = CUSTOM_API_MAP[customKind];
  if (!spec) {
    return { state: 'unsupported' };
  }
  const run = deps.run ?? runPlatformCommand;
  const crd = readCrdState(target.profileId, spec.crd, deps);
  const discovery = discoverApiVersion(target, spec.group, spec.version, run);
  if (discovery.state === 'unknown') {
    return {
      state: 'unknown',
      reason: discovery.reason ?? 'discovery-unknown',
    };
  }
  if (crd.state === 'unknown') {
    return { state: 'unknown', reason: crd.reason ?? 'crd-unknown' };
  }
  if (crd.state === 'unestablished') {
    if (discovery.state === 'present') {
      return { state: 'unknown', reason: 'inconsistent-crd-discovery' };
    }
    return { state: 'unknown', reason: 'crd-unestablished' };
  }
  if (crd.state === 'established') {
    if (discovery.state === 'absent') {
      return { state: 'unknown', reason: 'inconsistent-crd-discovery' };
    }
    const hasResource = discovery.resources?.some(
      (entry) => entry?.name === spec.listResource.split('.')[0],
    );
    if (!hasResource) {
      return { state: 'unknown', reason: 'inconsistent-crd-discovery' };
    }
    return { state: 'available', spec };
  }
  // CRD absent
  if (discovery.state === 'present') {
    const hasResource = discovery.resources?.some(
      (entry) => entry?.name === spec.listResource.split('.')[0],
    );
    if (hasResource) {
      return { state: 'unknown', reason: 'inconsistent-crd-discovery' };
    }
  }
  if (discovery.state === 'absent') {
    return { state: 'absent_by_prerequisite', spec };
  }
  const hasResource = discovery.resources?.some(
    (entry) => entry?.name === spec.listResource.split('.')[0],
  );
  if (hasResource) {
    return { state: 'unknown', reason: 'inconsistent-crd-discovery' };
  }
  return { state: 'absent_by_prerequisite', spec };
}

/**
 * @param {ReturnType<typeof vendorObjectToIdentity>} identity
 * @param {RabbitmqInventoryTarget} target
 * @param {{ run?: PlatformRun, readObject?: typeof readPlatformObject, customGate?: ReturnType<typeof resolveCustomApiGate> }} deps
 */
export function readInventoryIdentity(identity, target, deps = {}) {
  const readObject = deps.readObject ?? readPlatformObject;
  const run = deps.run ?? runPlatformCommand;
  if (identity.customKind) {
    const gate =
      deps.customGate ??
      resolveCustomApiGate(identity.customKind, target, { run, readObject });
    if (gate.state === 'unknown') {
      return {
        state: 'unreadable',
        reason: gate.reason ?? 'custom-api-unknown',
      };
    }
    if (gate.state === 'absent_by_prerequisite') {
      return { state: 'absent_by_prerequisite' };
    }
  }
  const readSpec = {
    profileId: target.profileId,
    resource: identity.resource,
    name: identity.name,
    namespace: identity.clusterScoped ? undefined : identity.namespace,
  };
  return readObject(readSpec, run ? { run } : {});
}

/**
 * @param {RabbitmqInventoryTarget} target
 * @param {PlatformRun} run
 */
function kubectlJsonList(run, target, args) {
  const result = run(
    'kubectl',
    [
      '--context',
      target.contextName,
      `--request-timeout=${KUBECTL_TIMEOUT_MS / 1000}s`,
      ...args,
    ],
    { timeoutMs: LIST_TIMEOUT_MS },
  );
  if (result.missing) {
    return { state: 'unreadable', reason: 'kubectl-missing' };
  }
  if (result.timedOut) {
    return { state: 'unreadable', reason: 'timeout' };
  }
  if (!result.ok) {
    return { state: 'unreadable', reason: 'kubectl-list-failed' };
  }
  try {
    return { state: 'ok', body: JSON.parse(result.stdout) };
  } catch {
    return { state: 'unreadable', reason: 'malformed-list-json' };
  }
}

/**
 * @param {RabbitmqInventoryTarget} target
 * @param {PlatformRun} run
 */
export function listAllRabbitmqClusters(
  target,
  run,
  readObject = readPlatformObject,
) {
  const gate = resolveCustomApiGate('RabbitmqCluster', target, {
    run,
    readObject,
  });
  if (gate.state === 'unknown') {
    return { state: 'unreadable', reason: gate.reason };
  }
  if (gate.state === 'absent_by_prerequisite') {
    return { state: 'ok', items: [] };
  }
  const listed = kubectlJsonList(run, target, [
    'get',
    'rabbitmqclusters.rabbitmq.com',
    '-A',
    '-o',
    'json',
  ]);
  if (listed.state !== 'ok') {
    return listed;
  }
  const items = Array.isArray(listed.body?.items) ? listed.body.items : [];
  return { state: 'ok', items };
}

/**
 * @param {RabbitmqInventoryTarget} target
 * @param {PlatformRun} run
 */
function listPersistentVolumes(target, run) {
  return kubectlJsonList(run, target, ['get', 'pv', '-o', 'json']);
}

/**
 * @param {unknown} object
 */
function namespaceTerminating(object) {
  return typeof object?.metadata?.deletionTimestamp === 'string';
}

/**
 * @param {RabbitmqInventoryTarget} target
 * @param {{ run?: PlatformRun, readObject?: typeof readPlatformObject, assertTarget?: typeof assertPlatformTarget, skipTargetAssert?: boolean }} deps
 */
export function observeRabbitmqInventory(target, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const readObject = deps.readObject ?? readPlatformObject;
  if (deps.skipTargetAssert !== true) {
    const assertTarget = deps.assertTarget ?? assertPlatformTarget;
    try {
      assertTarget(target.profileId, { run });
    } catch (error) {
      return {
        state: 'unreadable',
        reason: 'target-assert-failed',
        detail: error instanceof Error ? error.message : 'target assert failed',
      };
    }
  }

  const legacyNs = readObject(
    {
      profileId: target.profileId,
      resource: 'namespace',
      name: LEGACY_MESSAGING_NAMESPACE,
    },
    { run },
  );
  if (legacyNs.state === 'unreadable') {
    return { state: 'unreadable', reason: 'legacy-namespace-unreadable' };
  }
  if (legacyNs.state === 'present') {
    return { state: 'legacy_occupied', reason: 'legacy-messaging-namespace' };
  }

  const clusters = listAllRabbitmqClusters(target, run, readObject);
  if (clusters.state !== 'ok') {
    return { state: 'unreadable', reason: clusters.reason ?? 'cluster-list' };
  }
  for (const item of clusters.items) {
    const ns = item?.metadata?.namespace;
    const name = item?.metadata?.name;
    if (ns === LEGACY_MESSAGING_NAMESPACE) {
      return { state: 'legacy_occupied', reason: 'legacy-messaging-cr' };
    }
    if (ns !== target.brokerNamespace || name !== target.brokerName) {
      return { state: 'foreign', reason: 'foreign-rabbitmq-cluster' };
    }
  }

  const pvs = listPersistentVolumes(target, run);
  if (pvs.state !== 'ok') {
    return { state: 'unreadable', reason: pvs.reason ?? 'pv-list' };
  }
  const pvItems = Array.isArray(pvs.body?.items) ? pvs.body.items : [];
  for (const pv of pvItems) {
    const ref = pv?.spec?.claimRef;
    if (!ref) {
      continue;
    }
    if (ref.namespace === LEGACY_MESSAGING_NAMESPACE) {
      return { state: 'legacy_occupied', reason: 'legacy-pv-claimref' };
    }
    if (
      ref.namespace === target.brokerNamespace &&
      ref.name &&
      ref.name !== `${target.brokerName}-server`
    ) {
      const legacyPattern =
        ref.name.startsWith(LEGACY_BROKER_NAME) ||
        ref.name.startsWith('lab-broker');
      if (legacyPattern) {
        return { state: 'legacy_occupied', reason: 'legacy-pv-claimref' };
      }
    }
  }

  /** @type {Record<string, ReturnType<typeof readInventoryIdentity>>} */
  const identityReads = {};
  let presentCount = 0;
  let absentCount = 0;
  let prerequisiteAbsentCount = 0;

  for (const identity of expectedVendorIdentities()) {
    const key = `${identity.kind}/${identity.namespace ?? '-'}/${identity.name}`;
    const read = readInventoryIdentity(identity, target, { run, readObject });
    identityReads[key] = read;
    if (read.state === 'unreadable') {
      return {
        state: 'unreadable',
        reason: read.reason ?? 'identity-unreadable',
        identity: key,
      };
    }
    if (read.state === 'absent_by_prerequisite') {
      prerequisiteAbsentCount += 1;
      absentCount += 1;
    } else if (read.state === 'absent') {
      absentCount += 1;
    } else if (read.state === 'present') {
      if (namespaceTerminating(read.object)) {
        return {
          state: 'partial',
          reason: 'identity-terminating',
          identity: key,
        };
      }
      presentCount += 1;
    }
  }

  const designNamespaces = [
    CERT_MANAGER_NAMESPACE,
    OPERATOR_NAMESPACE,
    target.brokerNamespace,
  ];
  for (const nsName of designNamespaces) {
    const nsRead = readObject(
      {
        profileId: target.profileId,
        resource: 'namespace',
        name: nsName,
      },
      { run },
    );
    if (nsRead.state === 'unreadable') {
      return { state: 'unreadable', reason: 'design-namespace-unreadable' };
    }
    if (nsRead.state === 'present') {
      presentCount += 1;
      const marker = nsRead.object?.metadata?.labels?.[NATIVE_DESIGN_LABEL];
      if (marker && marker !== NATIVE_DESIGN_VALUE) {
        return {
          state: 'partial',
          reason: 'design-marker-mismatch',
          namespace: nsName,
        };
      }
      if (namespaceTerminating(nsRead.object)) {
        return {
          state: 'partial',
          reason: 'design-namespace-terminating',
          namespace: nsName,
        };
      }
    } else {
      absentCount += 1;
    }
  }

  const brokerGate = resolveCustomApiGate('RabbitmqCluster', target, {
    run,
    readObject,
  });
  if (brokerGate.state === 'unknown') {
    return {
      state: 'unreadable',
      reason: brokerGate.reason ?? 'broker-api-unknown',
    };
  }
  /** @type {ReturnType<typeof readPlatformObject> | { state: 'absent_by_prerequisite' }} */
  let targetBroker;
  if (brokerGate.state === 'available') {
    targetBroker = readObject(
      {
        profileId: target.profileId,
        resource: CUSTOM_API_MAP.RabbitmqCluster.resource,
        name: target.brokerName,
        namespace: target.brokerNamespace,
      },
      { run },
    );
    if (targetBroker.state === 'unreadable') {
      return { state: 'unreadable', reason: 'target-broker-unreadable' };
    }
  } else {
    targetBroker = { state: 'absent_by_prerequisite' };
    absentCount += 1;
  }

  const totalExpected =
    expectedVendorIdentities().length + designNamespaces.length + 1;
  const effectiveAbsent = absentCount + prerequisiteAbsentCount;

  if (presentCount === 0 && effectiveAbsent >= totalExpected) {
    return {
      state: 'absent',
      reason: 'fresh-absent',
      identityReads,
      targetBroker,
    };
  }

  if (presentCount > 0 && presentCount < totalExpected) {
    return {
      state: 'partial',
      reason: 'partial-identity-set',
      identityReads,
      targetBroker,
    };
  }

  if (
    presentCount === totalExpected &&
    targetBroker.state === 'present' &&
    !namespaceTerminating(targetBroker.object)
  ) {
    const marker = targetBroker.object?.metadata?.labels?.[NATIVE_DESIGN_LABEL];
    if (marker !== NATIVE_DESIGN_VALUE) {
      return {
        state: 'partial',
        reason: 'target-marker-mismatch',
        targetBroker,
      };
    }
    return {
      state: 'recognized',
      reason: 'recognized-install',
      identityReads,
      targetBroker,
    };
  }

  if (presentCount === totalExpected && targetBroker.state !== 'present') {
    return {
      state: 'partial',
      reason: 'target-broker-absent',
      identityReads,
      targetBroker,
    };
  }

  return {
    state: 'partial',
    reason: 'partial-identity-set',
    identityReads,
    targetBroker,
  };
}
