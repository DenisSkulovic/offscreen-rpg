import {
  runPlatformCommand,
  PLATFORM_COMMAND_TIMEOUT_MS,
} from '../common/commands.mjs';
import {
  BROKER_NAME,
  observeRabbitmqInventory,
  rabbitmqTargetFromProfile,
} from './inventory.mjs';
import {
  BROKER_IMAGE_PIN,
  NATIVE_DESIGN_LABEL,
  NATIVE_DESIGN_VALUE,
} from './vendor-bundles.mjs';

const KUBECTL_TIMEOUT_MS = 10_000;
const READ_TIMEOUT_MS = PLATFORM_COMMAND_TIMEOUT_MS;

const EXPECTED_SERVICE_PORTS = Object.freeze([
  { port: 5672, name: 'amqp' },
  { port: 15672, name: 'management' },
  { port: 15692, name: 'prometheus' },
]);

const EXPECTED_RESOURCES = Object.freeze({
  requests: { cpu: '200m', memory: '1Gi' },
  limits: { cpu: '500m', memory: '1Gi' },
});

/** @typedef {(command: string, args: string[], options?: { input?: string, timeoutMs?: number }) => ReturnType<typeof runPlatformCommand>} PlatformRun */

/**
 * @param {unknown} value
 */
export function isGenericallyEmpty(value) {
  if (value == null) {
    return true;
  }
  if (value === false) {
    return false;
  }
  if (typeof value === 'string') {
    return value.length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === 'object') {
    const entries = Object.values(value);
    return (
      entries.length === 0 ||
      entries.every((entry) => isGenericallyEmpty(entry))
    );
  }
  return false;
}

/**
 * @param {unknown} quantity
 */
export function quantityCompatible(quantity, expected) {
  if (typeof quantity !== 'string' || typeof expected !== 'string') {
    return false;
  }
  return quantity === expected;
}

/**
 * @param {object | undefined} spec
 */
export function brokerSpecForbiddenFieldsAcceptable(spec) {
  if (!spec || typeof spec !== 'object') {
    return { ok: false, reason: 'missing-spec' };
  }
  if (!isGenericallyEmpty(spec.override)) {
    return { ok: false, reason: 'forbidden-override' };
  }
  const rabbitmq = spec.rabbitmq ?? {};
  if (
    !isGenericallyEmpty(rabbitmq.additionalConfig) ||
    !isGenericallyEmpty(rabbitmq.advancedConfig) ||
    !isGenericallyEmpty(rabbitmq.envConfig) ||
    !isGenericallyEmpty(rabbitmq.additionalPlugins)
  ) {
    return { ok: false, reason: 'forbidden-override' };
  }
  const secretBackend = spec.secretBackend ?? {};
  const externalSecret = secretBackend.externalSecret ?? {};
  if (
    typeof externalSecret.name === 'string' &&
    externalSecret.name.length > 0
  ) {
    return { ok: false, reason: 'forbidden-override' };
  }
  if (!isGenericallyEmpty(secretBackend.vault)) {
    return { ok: false, reason: 'forbidden-override' };
  }
  const tls = spec.tls;
  if (!isGenericallyEmpty(tls)) {
    if (tls?.enabled === false) {
      // explicit false allowed
    } else if (
      !isGenericallyEmpty(tls?.secretName) ||
      !isGenericallyEmpty(tls?.caSecretName)
    ) {
      return { ok: false, reason: 'forbidden-override' };
    } else if (tls?.enabled !== false) {
      return { ok: false, reason: 'forbidden-override' };
    }
  }
  const service = spec.service ?? {};
  if (
    !isGenericallyEmpty(service.annotations) ||
    !isGenericallyEmpty(service.labels)
  ) {
    return { ok: false, reason: 'forbidden-override' };
  }
  if (!isGenericallyEmpty(spec.persistence?.emptyDir)) {
    return { ok: false, reason: 'forbidden-override' };
  }
  return { ok: true };
}

/**
 * @param {object | undefined} spec
 * @param {string} storageClass
 */
export function brokerSpecShapeAcceptable(spec, storageClass) {
  if (spec?.replicas !== 1) {
    return { ok: false, reason: 'wrong-replicas' };
  }
  if (spec?.image !== BROKER_IMAGE_PIN) {
    return { ok: false, reason: 'wrong-image' };
  }
  if (spec?.service?.type !== 'ClusterIP') {
    return { ok: false, reason: 'external-exposure' };
  }
  if (spec?.persistence?.storageClassName !== storageClass) {
    return { ok: false, reason: 'wrong-storage' };
  }
  if (spec?.persistence?.storage !== '5Gi') {
    return { ok: false, reason: 'wrong-storage' };
  }
  const resources = spec?.resources ?? {};
  if (
    !quantityCompatible(
      resources.requests?.cpu,
      EXPECTED_RESOURCES.requests.cpu,
    ) ||
    !quantityCompatible(
      resources.requests?.memory,
      EXPECTED_RESOURCES.requests.memory,
    ) ||
    !quantityCompatible(resources.limits?.cpu, EXPECTED_RESOURCES.limits.cpu) ||
    !quantityCompatible(
      resources.limits?.memory,
      EXPECTED_RESOURCES.limits.memory,
    )
  ) {
    return { ok: false, reason: 'wrong-resources' };
  }
  return { ok: true };
}

/**
 * @param {object | undefined} object
 */
function conditionTrue(object, type) {
  const conditions = Array.isArray(object?.status?.conditions)
    ? object.status.conditions
    : [];
  return conditions.some(
    (entry) => entry?.type === type && entry?.status === 'True',
  );
}

/**
 * @param {PlatformRun} run
 * @param {import('./inventory.mjs').RabbitmqInventoryTarget} target
 * @param {string[]} args
 */
function kubectlGetJson(run, target, args) {
  const result = run(
    'kubectl',
    [
      '--context',
      target.contextName,
      `--request-timeout=${KUBECTL_TIMEOUT_MS / 1000}s`,
      ...args,
    ],
    { timeoutMs: READ_TIMEOUT_MS },
  );
  if (result.missing || result.timedOut || !result.ok) {
    return { state: 'unreadable' };
  }
  try {
    return { state: 'ok', body: JSON.parse(result.stdout) };
  } catch {
    return { state: 'unreadable' };
  }
}

/**
 * @param {import('./inventory.mjs').RabbitmqInventoryTarget} target
 * @param {object} broker
 * @param {PlatformRun} run
 */
function readBrokerService(target, broker, run) {
  const serviceRef = broker?.status?.defaultUser?.serviceReference ?? {};
  const serviceName =
    typeof serviceRef.name === 'string' ? serviceRef.name : target.brokerName;
  const serviceNamespace =
    typeof serviceRef.namespace === 'string'
      ? serviceRef.namespace
      : target.brokerNamespace;
  if (serviceNamespace !== target.brokerNamespace) {
    return { ok: false, reason: 'service-reference-namespace' };
  }
  const svc = kubectlGetJson(run, target, [
    'get',
    'service',
    serviceName,
    '-n',
    serviceNamespace,
    '-o',
    'json',
  ]);
  if (svc.state !== 'ok') {
    return { ok: false, reason: 'service-unreadable' };
  }
  const spec = svc.body?.spec ?? {};
  if (spec.type !== 'ClusterIP') {
    return { ok: false, reason: 'external-exposure' };
  }
  if (Array.isArray(spec.externalIPs) && spec.externalIPs.length > 0) {
    return { ok: false, reason: 'external-exposure' };
  }
  const ports = Array.isArray(spec.ports) ? spec.ports : [];
  for (const expected of EXPECTED_SERVICE_PORTS) {
    const found = ports.find((entry) => entry?.port === expected.port);
    if (!found) {
      return { ok: false, reason: 'service-port-missing' };
    }
  }
  for (const port of ports) {
    if (port?.nodePort != null) {
      return { ok: false, reason: 'external-exposure' };
    }
  }
  return { ok: true, service: svc.body, serviceName, serviceNamespace };
}

/**
 * @param {import('./inventory.mjs').RabbitmqInventoryTarget} target
 * @param {object} service
 * @param {string} readyPodUid
 * @param {string} podIP
 * @param {PlatformRun} run
 */
function validateBrokerEndpointSlice(target, service, readyPodUid, podIP, run) {
  const serviceName = service?.metadata?.name;
  const serviceUid = service?.metadata?.uid;
  const listed = kubectlGetJson(run, target, [
    'get',
    'endpointslice',
    '-n',
    target.brokerNamespace,
    '-l',
    `kubernetes.io/service-name=${serviceName}`,
    '-o',
    'json',
  ]);
  if (listed.state !== 'ok') {
    return { ok: false, reason: 'endpointslice-unreadable' };
  }
  const items = Array.isArray(listed.body?.items) ? listed.body.items : [];
  /** @type {object[]} */
  const readyMatching = [];
  /** @type {object[]} */
  const readyForeign = [];
  for (const slice of items) {
    const endpoints = Array.isArray(slice?.endpoints) ? slice.endpoints : [];
    for (const endpoint of endpoints) {
      if (
        endpoint?.conditions?.ready !== true ||
        endpoint?.conditions?.terminating === true
      ) {
        continue;
      }
      const targetRef = endpoint?.targetRef ?? {};
      const match =
        targetRef.kind === 'Pod' &&
        targetRef.namespace === target.brokerNamespace &&
        targetRef.uid === readyPodUid;
      const addressMatch = Array.isArray(endpoint.addresses)
        ? endpoint.addresses.includes(podIP)
        : false;
      if (match && addressMatch) {
        readyMatching.push(endpoint);
      } else {
        readyForeign.push(endpoint);
      }
    }
    const owners = Array.isArray(slice?.metadata?.ownerReferences)
      ? slice.metadata.ownerReferences
      : [];
    const serviceOwner = owners.find(
      (entry) => entry?.kind === 'Service' && entry?.uid === serviceUid,
    );
    if (!serviceOwner && owners.length > 0) {
      // tolerate slices without ownerRefs when targetRef matches
    }
  }
  if (readyMatching.length < 1) {
    return { ok: false, reason: 'wrong-endpoint' };
  }
  if (readyForeign.length > 0) {
    return { ok: false, reason: 'wrong-endpoint' };
  }
  return { ok: true };
}

/**
 * @param {import('./inventory.mjs').RabbitmqInventoryTarget} target
 * @param {object} broker
 * @param {PlatformRun} run
 */
function readCredentialKeyNames(target, broker, run) {
  const secretRef = broker?.status?.defaultUser?.secretReference ?? {};
  const secretName = secretRef.name;
  const secretNamespace =
    typeof secretRef.namespace === 'string'
      ? secretRef.namespace
      : target.brokerNamespace;
  if (typeof secretName !== 'string' || secretName.length === 0) {
    return { ok: false, reason: 'missing-credential-key' };
  }
  if (secretNamespace !== target.brokerNamespace) {
    return { ok: false, reason: 'missing-credential-key' };
  }
  const secret = kubectlGetJson(run, target, [
    'get',
    'secret',
    secretName,
    '-n',
    secretNamespace,
    '-o',
    'json',
  ]);
  if (secret.state !== 'ok') {
    return { ok: false, reason: 'missing-credential-key' };
  }
  const data = secret.body?.data ?? {};
  const usernameKey = secretRef.usernameKey ?? 'username';
  const passwordKey = secretRef.passwordKey ?? 'password';
  const keys = Object.keys(data);
  if (
    typeof data[usernameKey] !== 'string' ||
    data[usernameKey].length === 0 ||
    typeof data[passwordKey] !== 'string' ||
    data[passwordKey].length === 0
  ) {
    return { ok: false, reason: 'missing-credential-key' };
  }
  return {
    ok: true,
    keyNames: keys,
    mappedKeys: { usernameKey, passwordKey },
  };
}

/**
 * @param {import('./inventory.mjs').RabbitmqInventoryTarget} target
 * @param {object} broker
 * @param {PlatformRun} run
 */
function readOwnedWorkloadChain(target, broker, run) {
  const crUid = broker?.metadata?.uid;
  const namespace = target.brokerNamespace;
  const statefulSets = kubectlGetJson(run, target, [
    'get',
    'statefulset.apps',
    '-n',
    namespace,
    '-o',
    'json',
  ]);
  if (statefulSets.state !== 'ok') {
    return { ok: false, reason: 'statefulset-unreadable' };
  }
  const stsItems = Array.isArray(statefulSets.body?.items)
    ? statefulSets.body.items
    : [];
  const ownedSts = stsItems.find((item) => {
    const refs = Array.isArray(item?.metadata?.ownerReferences)
      ? item.metadata.ownerReferences
      : [];
    return refs.some(
      (entry) =>
        entry?.kind === 'RabbitmqCluster' &&
        entry?.uid === crUid &&
        entry?.controller === true,
    );
  });
  if (!ownedSts) {
    return { ok: false, reason: 'statefulset-missing' };
  }
  const generation = ownedSts?.metadata?.generation;
  const observed = ownedSts?.status?.observedGeneration;
  if (
    generation == null ||
    observed == null ||
    Number(observed) < Number(generation)
  ) {
    return { ok: false, reason: 'stale-readiness' };
  }
  const status = ownedSts?.status ?? {};
  if (
    status.replicas !== 1 ||
    status.readyReplicas !== 1 ||
    status.currentReplicas !== 1 ||
    status.updatedReplicas !== 1 ||
    status.currentRevision !== status.updateRevision
  ) {
    return { ok: false, reason: 'stale-readiness' };
  }
  const stsUid = ownedSts?.metadata?.uid;
  const pods = kubectlGetJson(run, target, [
    'get',
    'pod',
    '-n',
    namespace,
    '-o',
    'json',
  ]);
  if (pods.state !== 'ok') {
    return { ok: false, reason: 'pod-unreadable' };
  }
  const podItems = Array.isArray(pods.body?.items) ? pods.body.items : [];
  const brokerPod = podItems.find((pod) => {
    const refs = Array.isArray(pod?.metadata?.ownerReferences)
      ? pod.metadata.ownerReferences
      : [];
    return refs.some(
      (entry) =>
        entry?.kind === 'StatefulSet' &&
        entry?.uid === stsUid &&
        entry?.controller === true,
    );
  });
  if (!brokerPod) {
    return { ok: false, reason: 'broker-pod-missing' };
  }
  const ready = Array.isArray(brokerPod?.status?.conditions)
    ? brokerPod.status.conditions.some(
        (entry) => entry?.type === 'Ready' && entry?.status === 'True',
      )
    : false;
  if (!ready) {
    return { ok: false, reason: 'stale-readiness' };
  }
  const container = brokerPod?.spec?.containers?.[0];
  if (container?.image !== BROKER_IMAGE_PIN) {
    return { ok: false, reason: 'wrong-image' };
  }
  const podUid = brokerPod?.metadata?.uid;
  const podIPs = Array.isArray(brokerPod?.status?.podIPs)
    ? brokerPod.status.podIPs.map((entry) => entry?.ip).filter(Boolean)
    : [];
  const podIP = podIPs[0] ?? brokerPod?.status?.podIP;
  if (typeof podIP !== 'string' || podIP.length === 0) {
    return { ok: false, reason: 'wrong-endpoint' };
  }

  const resolvedClaim = (brokerPod?.spec?.volumes ?? [])
    .map((volume) => volume?.persistentVolumeClaim?.claimName)
    .find((name) => typeof name === 'string' && name.length > 0);
  let pvc = null;
  if (typeof resolvedClaim === 'string') {
    const pvcRead = kubectlGetJson(run, target, [
      'get',
      'pvc',
      resolvedClaim,
      '-n',
      namespace,
      '-o',
      'json',
    ]);
    if (pvcRead.state !== 'ok') {
      return { ok: false, reason: 'wrong-storage' };
    }
    pvc = pvcRead.body;
    const sc = pvc?.spec?.storageClassName;
    const size = pvc?.spec?.resources?.requests?.storage;
    if (sc !== target.storageClass) {
      return { ok: false, reason: 'wrong-storage' };
    }
    if (typeof size === 'string' && !size.endsWith('Gi')) {
      return { ok: false, reason: 'wrong-storage' };
    }
    if (typeof size === 'string') {
      const numeric = Number.parseFloat(size);
      if (!Number.isFinite(numeric) || numeric < 5) {
        return { ok: false, reason: 'wrong-storage' };
      }
    }
    const pvName = pvc?.spec?.volumeName;
    if (typeof pvName === 'string') {
      const pvRead = kubectlGetJson(run, target, [
        'get',
        'pv',
        pvName,
        '-o',
        'json',
      ]);
      if (pvRead.state !== 'ok') {
        return { ok: false, reason: 'wrong-storage' };
      }
      const ref = pvRead.body?.spec?.claimRef;
      if (
        ref?.namespace !== namespace ||
        ref?.name !== pvc?.metadata?.name ||
        ref?.uid !== pvc?.metadata?.uid
      ) {
        return { ok: false, reason: 'wrong-storage' };
      }
    }
  }

  return { ok: true, ownedSts, brokerPod, podUid, podIP, pvc };
}

/**
 * @param {import('./inventory.mjs').RabbitmqInventoryTarget} target
 * @param {object} broker
 * @param {PlatformRun} run
 */
export function observeRabbitmqStructural(target, broker, run) {
  if (broker?.metadata?.name !== target.brokerName) {
    return { ok: false, reason: 'wrong-cr-identity' };
  }
  if (broker?.metadata?.namespace !== target.brokerNamespace) {
    return { ok: false, reason: 'wrong-cr-identity' };
  }
  if (broker?.metadata?.labels?.[NATIVE_DESIGN_LABEL] !== NATIVE_DESIGN_VALUE) {
    return { ok: false, reason: 'design-marker-mismatch' };
  }
  const observedGen = broker?.status?.observedGeneration;
  const gen = broker?.metadata?.generation;
  if (
    observedGen == null ||
    gen == null ||
    Number(observedGen) !== Number(gen)
  ) {
    return { ok: false, reason: 'stale-readiness' };
  }
  if (!conditionTrue(broker, 'AllReplicasReady')) {
    return { ok: false, reason: 'stale-readiness' };
  }
  if (!conditionTrue(broker, 'ReconcileSuccess')) {
    return { ok: false, reason: 'stale-readiness' };
  }
  const specShape = brokerSpecShapeAcceptable(
    broker?.spec,
    target.storageClass,
  );
  if (!specShape.ok) {
    return { ok: false, reason: specShape.reason ?? 'spec-shape' };
  }
  const forbidden = brokerSpecForbiddenFieldsAcceptable(broker?.spec);
  if (!forbidden.ok) {
    return { ok: false, reason: forbidden.reason ?? 'forbidden-override' };
  }
  const serviceResult = readBrokerService(target, broker, run);
  if (!serviceResult.ok) {
    return { ok: false, reason: serviceResult.reason ?? 'service' };
  }
  const workload = readOwnedWorkloadChain(target, broker, run);
  if (!workload.ok) {
    return { ok: false, reason: workload.reason ?? 'workload' };
  }
  const endpoint = validateBrokerEndpointSlice(
    target,
    serviceResult.service,
    workload.podUid,
    workload.podIP,
    run,
  );
  if (!endpoint.ok) {
    return { ok: false, reason: endpoint.reason ?? 'wrong-endpoint' };
  }
  const credentials = readCredentialKeyNames(target, broker, run);
  if (!credentials.ok) {
    return {
      ok: false,
      reason: credentials.reason ?? 'missing-credential-key',
    };
  }
  return {
    ok: true,
    credentialKeyNames: credentials.keyNames,
    mappedKeys: credentials.mappedKeys,
    serviceName: serviceResult.serviceName,
  };
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {{ run?: PlatformRun, readObject?: typeof import('../common/commands.mjs').readPlatformObject, inventory?: ReturnType<typeof observeRabbitmqInventory>, skipTargetAssert?: boolean }} deps
 */
export function observeRabbitmqReady(profileId, deps = {}) {
  const target = rabbitmqTargetFromProfile(profileId);
  const run = deps.run ?? runPlatformCommand;
  const inventory =
    deps.inventory ??
    observeRabbitmqInventory(target, {
      run,
      readObject: deps.readObject,
      skipTargetAssert: deps.skipTargetAssert,
    });
  if (inventory.state === 'legacy_occupied') {
    return { ok: false, state: inventory.state, reason: inventory.reason };
  }
  if (inventory.state === 'foreign') {
    return { ok: false, state: inventory.state, reason: inventory.reason };
  }
  if (inventory.state === 'partial') {
    return { ok: false, state: inventory.state, reason: inventory.reason };
  }
  if (inventory.state === 'unreadable') {
    return { ok: false, state: inventory.state, reason: inventory.reason };
  }
  if (inventory.state !== 'recognized') {
    return {
      ok: false,
      state: inventory.state,
      reason: inventory.reason ?? 'not-recognized',
    };
  }
  const broker = inventory.targetBroker?.object;
  if (!broker) {
    return { ok: false, state: 'partial', reason: 'target-broker-missing' };
  }
  const structural = observeRabbitmqStructural(target, broker, run);
  if (!structural.ok) {
    return {
      ok: false,
      state: 'recognized',
      reason: structural.reason ?? 'structural-refusal',
    };
  }
  return {
    ok: true,
    state: 'ready',
    reason: 'structural-ready',
    profileId,
    brokerName: BROKER_NAME,
    credentialKeyNames: structural.credentialKeyNames,
    mappedKeys: structural.mappedKeys,
    serviceName: structural.serviceName,
  };
}
