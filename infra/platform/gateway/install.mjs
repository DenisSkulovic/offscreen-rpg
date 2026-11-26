import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { parse, parseAllDocuments } from 'yaml';
import {
  assertPlatformTarget,
  readPlatformObject,
  runPlatformCommand,
} from '../common/commands.mjs';
import { verifyManifestBytes } from '../common/pins.mjs';
import { readPlatformProfile } from '../common/profile.mjs';

const moduleDir = dirname(fileURLToPath(import.meta.url));

export const HELM_RELEASE = 'lab-gateway';
export const HELM_NAMESPACE = 'gateway-system';
export const GATEWAY_CLASS_NAME = 'lab-traefik';
export const LAB_EDGE_NAMESPACE = 'lab-edge';
export const GATEWAY_NAME = 'lab-edge';
export const FIELD_MANAGER = 'offscreen-gateway-api';
export const IMAGE_DIGEST =
  'sha256:a6c0194dda77bcb804824580f36fa7edc56e315b1acfe933366c8b52844a78a4';
export const CONTROLLER_NAME = 'traefik.io/gateway-controller';

export const GATEWAY_CRD_NAMES = [
  'backendtlspolicies.gateway.networking.k8s.io',
  'gatewayclasses.gateway.networking.k8s.io',
  'gateways.gateway.networking.k8s.io',
  'grpcroutes.gateway.networking.k8s.io',
  'httproutes.gateway.networking.k8s.io',
  'listenersets.gateway.networking.k8s.io',
  'referencegrants.gateway.networking.k8s.io',
  'tcproutes.gateway.networking.k8s.io',
  'tlsroutes.gateway.networking.k8s.io',
  'udproutes.gateway.networking.k8s.io',
];

export const ADMISSION_POLICY = 'safe-upgrades.gateway.networking.k8s.io';

const BUNDLE_IDENTITIES = [
  ...GATEWAY_CRD_NAMES.map((name) => ({
    kind: 'CustomResourceDefinition',
    name,
    resource: 'customresourcedefinition',
  })),
  {
    kind: 'ValidatingAdmissionPolicy',
    name: ADMISSION_POLICY,
    resource: 'validatingadmissionpolicy',
  },
  {
    kind: 'ValidatingAdmissionPolicyBinding',
    name: ADMISSION_POLICY,
    resource: 'validatingadmissionpolicybinding',
  },
];

const HELM_OWNED_IDENTITIES = [
  {
    kind: 'ServiceAccount',
    name: 'lab-gateway-traefik',
    namespace: HELM_NAMESPACE,
  },
  { kind: 'ClusterRole', name: 'lab-gateway-traefik-gateway-system' },
  { kind: 'ClusterRoleBinding', name: 'lab-gateway-traefik-gateway-system' },
  { kind: 'Service', name: 'lab-gateway-traefik', namespace: HELM_NAMESPACE },
  {
    kind: 'Deployment',
    name: 'lab-gateway-traefik',
    namespace: HELM_NAMESPACE,
  },
  { kind: 'GatewayClass', name: GATEWAY_CLASS_NAME },
];

/**
 * @param {string} context
 * @param {string} resource
 * @param {string} name
 * @param {typeof runPlatformCommand} run
 */
function readClusterJson(context, resource, name, run) {
  const result = run('kubectl', [
    '--context',
    context,
    'get',
    resource,
    name,
    '--ignore-not-found',
    '-o',
    'json',
  ]);
  if (result.timedOut) {
    return { state: 'unreadable', reason: 'kubectl timed out' };
  }
  if (result.missing) {
    return { state: 'unreadable', reason: 'kubectl missing' };
  }
  if (!result.ok) {
    return { state: 'unreadable', reason: 'kubectl get failed' };
  }
  const trimmed = (result.stdout ?? '').trim();
  if (!trimmed) {
    return { state: 'absent' };
  }
  try {
    return { state: 'present', object: JSON.parse(trimmed) };
  } catch {
    return { state: 'unreadable', reason: 'malformed json' };
  }
}

/**
 * @param {{ pinsPath?: string, gatewayRoot?: string }} [options]
 */
export function loadVerifiedPins(options = {}) {
  const root = options.gatewayRoot ?? moduleDir;
  const pinsPath = options.pinsPath ?? join(root, 'pins.yaml');
  let pins;
  try {
    pins = JSON.parse(readFileSync(pinsPath, 'utf8'));
  } catch {
    throw new Error('pins unreadable');
  }
  const chartPath = join(root, pins.chart.archive);
  const manifestPath = join(root, pins.gatewayApi.manifest);
  verifyManifestBytes(readFileSync(chartPath), pins.chart.sha256);
  verifyManifestBytes(readFileSync(manifestPath), pins.gatewayApi.sha256);
  return { pins, root, chartPath, manifestPath };
}

/**
 * @param {string} manifestPath
 */
export function parseGatewayApiBundle(manifestPath) {
  const docs = parseAllDocuments(readFileSync(manifestPath, 'utf8'))
    .map((doc) => {
      if (doc.errors.length) {
        throw new Error('gateway api bundle malformed');
      }
      return doc.toJS();
    })
    .filter((doc) => doc !== null && typeof doc === 'object');

  const byKey = new Map();
  for (const doc of docs) {
    const kind = doc.kind;
    const name = doc.metadata?.name;
    if (typeof kind !== 'string' || typeof name !== 'string') {
      throw new Error('gateway api bundle object missing kind or name');
    }
    const key = `${kind}/${name}`;
    if (byKey.has(key)) {
      throw new Error('gateway api bundle duplicate identity');
    }
    byKey.set(key, doc);
  }

  /** @type {typeof BUNDLE_IDENTITIES} */
  const expectedKeys = new Set(
    BUNDLE_IDENTITIES.map((id) => `${id.kind}/${id.name}`),
  );
  for (const key of byKey.keys()) {
    if (!expectedKeys.has(key)) {
      throw new Error('gateway api bundle unexpected object');
    }
  }
  if (byKey.size !== 12) {
    throw new Error('gateway api bundle identity count mismatch');
  }

  return [...BUNDLE_IDENTITIES].map((id) => byKey.get(`${id.kind}/${id.name}`));
}

/**
 * @param {string} context
 * @param {typeof runPlatformCommand} run
 */
function listGatewayGroupCrds(context, run) {
  const result = run('kubectl', [
    '--context',
    context,
    'get',
    'customresourcedefinitions',
    '-o',
    'json',
  ]);
  if (result.timedOut) {
    return { state: 'unreadable', reason: 'crd inventory timed out' };
  }
  if (!result.ok) {
    return { state: 'unreadable', reason: 'crd inventory failed' };
  }
  try {
    const body = JSON.parse(result.stdout);
    const items = Array.isArray(body.items) ? body.items : [];
    return {
      state: 'ok',
      names: items
        .filter((item) => item?.spec?.group === 'gateway.networking.k8s.io')
        .map((item) => item.metadata?.name)
        .filter((name) => typeof name === 'string'),
    };
  } catch {
    return { state: 'unreadable', reason: 'crd inventory malformed' };
  }
}

/**
 * @param {object} bundleDoc
 * @param {object} live
 */
function assertBundleAnnotations(bundleDoc, live) {
  const annotations = bundleDoc.metadata?.annotations ?? {};
  for (const [key, value] of Object.entries(annotations)) {
    if (
      key === 'gateway.networking.k8s.io/bundle-version' ||
      key === 'gateway.networking.k8s.io/channel'
    ) {
      if (live.metadata?.annotations?.[key] !== value) {
        throw new Error(`bundle annotation mismatch: ${key}`);
      }
    }
  }
}

/**
 * @param {object} crd
 */
function assertCrdEstablished(crd) {
  if (crd.metadata?.deletionTimestamp) {
    throw new Error('crd deletion in progress');
  }
  const conditions = Array.isArray(crd.status?.conditions)
    ? crd.status.conditions
    : [];
  const established = conditions.some(
    (c) => c.type === 'Established' && c.status === 'True',
  );
  const namesAccepted = conditions.some(
    (c) => c.type === 'NamesAccepted' && c.status === 'True',
  );
  if (!established || !namesAccepted) {
    throw new Error('crd status not established');
  }
  const versions = Array.isArray(crd.spec?.versions) ? crd.spec.versions : [];
  const stored = Array.isArray(crd.status?.storedVersions)
    ? crd.status.storedVersions
    : [];
  const storageVersions = versions
    .filter((v) => v.storage)
    .map((v) => v.name)
    .filter(Boolean);
  if (storageVersions.length !== 1) {
    throw new Error('crd storage version invalid');
  }
  const storage = storageVersions[0];
  if (!stored.includes(storage)) {
    throw new Error('crd storedVersions missing storage version');
  }
  for (const storedVersion of stored) {
    if (!versions.some((v) => v.name === storedVersion)) {
      throw new Error('crd stored version not declared');
    }
  }
}

/**
 * @param {object} bundleDoc
 * @param {object} live
 * @param {string} context
 * @param {typeof runPlatformCommand} run
 */
function compareBundleObject(bundleDoc, live, context, run) {
  if (live.metadata?.deletionTimestamp) {
    throw new Error('live object deletion in progress');
  }
  assertBundleAnnotations(bundleDoc, live);
  const upstream = structuredClone(bundleDoc);
  upstream.metadata = {
    ...bundleDoc.metadata,
    resourceVersion: live.metadata?.resourceVersion,
  };
  const dry = run(
    'kubectl',
    [
      '--context',
      context,
      'replace',
      '--dry-run=server',
      '-f',
      '-',
      '-o',
      'json',
    ],
    { input: JSON.stringify(upstream) },
  );
  if (dry.timedOut) {
    throw new Error('dry-run replace timed out');
  }
  if (!dry.ok) {
    throw new Error('dry-run replace failed');
  }
  let normalized;
  try {
    normalized = JSON.parse(dry.stdout);
  } catch {
    throw new Error('dry-run replace malformed');
  }
  if (!isDeepStrictEqual(live.spec, normalized.spec)) {
    throw new Error('bundle spec drift');
  }
  if (bundleDoc.kind === 'CustomResourceDefinition') {
    assertCrdEstablished(live);
  }
}

/**
 * @param {string} context
 * @param {typeof runPlatformCommand} run
 */
function assertLoopbackExposure(context, profile, run) {
  const docker = run('docker', [
    'ps',
    '--filter',
    `name=${profile.clusterName}`,
    '--format',
    '{{.Names}} {{.Ports}}',
  ]);
  if (docker.timedOut) {
    throw new Error('docker ps timed out');
  }
  if (docker.missing) {
    throw new Error('docker ps missing');
  }
  if (!docker.ok) {
    throw new Error('docker ps failed');
  }
  for (const line of docker.stdout.split('\n')) {
    if (/0\.0\.0\.0:|\[::\]:/.test(line)) {
      throw new Error('non-loopback published container port');
    }
  }
  const services = run('kubectl', [
    '--context',
    context,
    'get',
    'svc',
    '-A',
    '--no-headers',
  ]);
  if (services.timedOut) {
    throw new Error('service inventory timed out');
  }
  if (!services.ok) {
    throw new Error('service inventory failed');
  }
  for (const line of services.stdout.split('\n')) {
    const cols = line.trim().split(/\s+/);
    if (
      cols.length >= 3 &&
      (cols[2] === 'NodePort' || cols[2] === 'LoadBalancer')
    ) {
      throw new Error('NodePort or LoadBalancer Service refused');
    }
  }
}

/**
 * @param {object} metadata
 */
function helmOwned(metadata) {
  const labels = metadata?.labels ?? {};
  const annotations = metadata?.annotations ?? {};
  return (
    labels['app.kubernetes.io/managed-by'] === 'Helm' &&
    annotations['meta.helm.sh/release-name'] === HELM_RELEASE &&
    annotations['meta.helm.sh/release-namespace'] === HELM_NAMESPACE
  );
}

/**
 * @param {string} context
 * @param {typeof runPlatformCommand} run
 */
function readHelmRelease(context, run) {
  const list = run('helm', [
    'list',
    '--namespace',
    HELM_NAMESPACE,
    '--kube-context',
    context,
    '-o',
    'json',
  ]);
  if (list.timedOut) {
    return { state: 'unreadable', reason: 'helm list timed out' };
  }
  if (!list.ok) {
    return { state: 'unreadable', reason: 'helm list failed' };
  }
  try {
    const releases = JSON.parse(list.stdout);
    const found = releases.find((entry) => entry.name === HELM_RELEASE);
    if (!found) return { state: 'absent' };
    return { state: 'present', release: found };
  } catch {
    return { state: 'unreadable', reason: 'helm list malformed' };
  }
}

/**
 * @param {object} metadata
 * @param {string} label
 */
function objectGeneration(metadata, label) {
  const generation = metadata?.generation;
  if (generation === undefined || generation === null) {
    throw new Error(`readiness: ${label} generation missing`);
  }
  return generation;
}

/**
 * @param {object} condition
 * @param {string} type
 * @param {string | number} generation
 */
export function conditionTrue(condition, type, generation) {
  if (condition?.type !== type || condition.status !== 'True') {
    return false;
  }
  if (generation === undefined || generation === null) {
    return false;
  }
  if (
    condition.observedGeneration === undefined ||
    condition.observedGeneration === null
  ) {
    return false;
  }
  return String(condition.observedGeneration) === String(generation);
}

/**
 * @param {object[]} conditions
 * @param {string} type
 * @param {string | number} generation
 */
function hasConditionTrue(conditions, type, generation) {
  return (conditions ?? []).some((c) => conditionTrue(c, type, generation));
}

/**
 * @param {string} context
 * @param {typeof runPlatformCommand} run
 * @returns {{ ok: true } | { ok: false, detail: string }}
 */
function checkGatewayReadiness(context, run) {
  try {
    assessReadiness(context, run);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const detail = message.startsWith('readiness: ')
      ? message.slice('readiness: '.length)
      : message;
    return { ok: false, detail };
  }
}

/**
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 * @returns {{ state: 'not-installed' | 'unreadable' | 'not-ready' | 'installed', detail?: string }}
 */
export function observeGatewayStatus(deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const profile = readPlatformProfile('release');
  const context = profile.contextName;

  const gatewayClass = readClusterJson(
    context,
    'gatewayclass',
    GATEWAY_CLASS_NAME,
    run,
  );
  const deployment = readPlatformObject(
    {
      profileId: 'release',
      resource: 'deployment',
      name: 'lab-gateway-traefik',
      namespace: HELM_NAMESPACE,
    },
    { run },
  );
  const service = readPlatformObject(
    {
      profileId: 'release',
      resource: 'service',
      name: 'lab-gateway-traefik',
      namespace: HELM_NAMESPACE,
    },
    { run },
  );
  const gateway = readPlatformObject(
    {
      profileId: 'release',
      resource: 'gateway',
      name: GATEWAY_NAME,
      namespace: LAB_EDGE_NAMESPACE,
    },
    { run },
  );

  const observations = [gatewayClass, deployment, service, gateway];
  if (observations.some((item) => item.state === 'unreadable')) {
    return { state: 'unreadable' };
  }
  if (observations.every((item) => item.state === 'absent')) {
    return { state: 'not-installed' };
  }
  if (observations.some((item) => item.state === 'absent')) {
    return { state: 'not-ready' };
  }

  const readiness = checkGatewayReadiness(context, run);
  if (readiness.ok) {
    return { state: 'installed' };
  }
  return { state: 'not-ready', detail: readiness.detail };
}

/**
 * @param {string} context
 * @param {typeof runPlatformCommand} run
 */
function assessReadiness(context, run) {
  const gatewayClass = readClusterJson(
    context,
    'gatewayclass',
    GATEWAY_CLASS_NAME,
    run,
  );
  if (gatewayClass.state !== 'present') {
    throw new Error('readiness: gatewayclass unreadable');
  }
  const gc = gatewayClass.object;
  const gcGen = objectGeneration(gc.metadata, 'gatewayclass');
  if (gc.spec?.controllerName !== CONTROLLER_NAME) {
    throw new Error('readiness: controller mismatch');
  }
  if (!hasConditionTrue(gc.status?.conditions, 'Accepted', gcGen)) {
    throw new Error('readiness: gatewayclass not accepted');
  }

  const deployment = readPlatformObject(
    {
      profileId: 'release',
      resource: 'deployment',
      name: 'lab-gateway-traefik',
      namespace: HELM_NAMESPACE,
    },
    { run },
  );
  if (deployment.state !== 'present') {
    throw new Error('readiness: deployment unreadable');
  }
  const dep = deployment.object;
  const depGen = objectGeneration(dep.metadata, 'deployment');
  const status = dep.status ?? {};
  if (status.observedGeneration !== depGen) {
    throw new Error('readiness: deployment generation stale');
  }
  const desired = dep.spec?.replicas ?? 1;
  for (const field of [
    'updatedReplicas',
    'availableReplicas',
    'readyReplicas',
  ]) {
    if ((status[field] ?? 0) < desired) {
      throw new Error(`readiness: deployment ${field} low`);
    }
  }
  const image = dep.spec?.template?.spec?.containers?.[0]?.image ?? '';
  if (!image.includes(IMAGE_DIGEST)) {
    throw new Error('readiness: deployment image mismatch');
  }

  const service = readPlatformObject(
    {
      profileId: 'release',
      resource: 'service',
      name: 'lab-gateway-traefik',
      namespace: HELM_NAMESPACE,
    },
    { run },
  );
  if (service.state !== 'present') {
    throw new Error('readiness: service unreadable');
  }
  const svc = service.object;
  if (svc.spec?.type !== 'ClusterIP') {
    throw new Error('readiness: service type mismatch');
  }
  const ports = svc.spec?.ports ?? [];
  if (
    ports.length !== 1 ||
    ports[0].port !== 80 ||
    ports[0].name !== 'web' ||
    ports[0].targetPort !== 'web'
  ) {
    throw new Error('readiness: service port mismatch');
  }

  const gateway = readPlatformObject(
    {
      profileId: 'release',
      resource: 'gateway',
      name: GATEWAY_NAME,
      namespace: LAB_EDGE_NAMESPACE,
    },
    { run },
  );
  if (gateway.state !== 'present') {
    throw new Error('readiness: gateway unreadable');
  }
  const gw = gateway.object;
  const gwGen = objectGeneration(gw.metadata, 'gateway');
  if (gw.spec?.gatewayClassName !== GATEWAY_CLASS_NAME) {
    throw new Error('readiness: gateway class mismatch');
  }
  const listener = (gw.spec?.listeners ?? []).find((l) => l.name === 'web');
  if (!listener || listener.port !== 8000 || listener.protocol !== 'HTTP') {
    throw new Error('readiness: gateway listener mismatch');
  }
  if (
    !hasConditionTrue(gw.status?.conditions, 'Accepted', gwGen) ||
    !hasConditionTrue(gw.status?.conditions, 'Programmed', gwGen)
  ) {
    throw new Error('readiness: gateway conditions stale');
  }
  const listenerStatus = (gw.status?.listeners ?? []).find(
    (l) => l.name === 'web',
  );
  const listenerConditions = listenerStatus?.conditions ?? [];
  for (const type of ['Accepted', 'ResolvedRefs', 'Programmed']) {
    if (!hasConditionTrue(listenerConditions, type, gwGen)) {
      throw new Error(`readiness: listener ${type} stale`);
    }
  }
}

/** @typedef {{ kind: 'absent' } | { kind: 'present', uid: string, resourceVersion: string }} WriteSnapshot */

/**
 * @param {ReturnType<typeof readClusterJson> | ReturnType<typeof readPlatformObject>} read
 */
function snapshotForWrite(read) {
  if (read.state === 'unreadable') {
    throw new Error('write snapshot unreadable');
  }
  if (read.state === 'absent') {
    return { kind: 'absent' };
  }
  const uid = read.object?.metadata?.uid;
  const resourceVersion = read.object?.metadata?.resourceVersion;
  if (typeof uid !== 'string' || typeof resourceVersion !== 'string') {
    throw new Error('write snapshot missing uid or resourceVersion');
  }
  return { kind: 'present', uid, resourceVersion };
}

/**
 * @param {Array<{ label: string, snapshot: WriteSnapshot, read: () => ReturnType<typeof readClusterJson> | ReturnType<typeof readPlatformObject> | ReturnType<typeof readHelmRelease> }>} checks
 */
function refuseWriteDrift(checks) {
  for (const { label, snapshot, read } of checks) {
    const fresh = read();
    if ('state' in fresh && fresh.state === 'unreadable') {
      throw new Error(`${label}: unreadable before write`);
    }
    if (snapshot.kind === 'absent') {
      if ('state' in fresh && fresh.state === 'present') {
        throw new Error(`${label}: appeared before write`);
      }
      continue;
    }
    if (!('state' in fresh) || fresh.state !== 'present') {
      throw new Error(`${label}: vanished before write`);
    }
    const uid = fresh.object?.metadata?.uid;
    const resourceVersion = fresh.object?.metadata?.resourceVersion;
    if (uid !== snapshot.uid || resourceVersion !== snapshot.resourceVersion) {
      throw new Error(`${label}: uid or resourceVersion drift before write`);
    }
  }
}

/**
 * @param {string[]} args
 */
export function kubectlMutationKind(args) {
  const verbs = new Set([
    'apply',
    'create',
    'delete',
    'patch',
    'replace',
    'label',
  ]);
  let dryRun = false;
  for (const arg of args) {
    if (arg.startsWith('--dry-run')) {
      dryRun = true;
    }
  }
  for (const arg of args) {
    if (verbs.has(arg)) {
      if (arg === 'replace' && dryRun) {
        continue;
      }
      return arg;
    }
  }
  return null;
}

/**
 * @param {{
 *   run?: typeof runPlatformCommand,
 *   loadPinsFn?: typeof loadVerifiedPins,
 *   parseBundleFn?: typeof parseGatewayApiBundle,
 *   gatewayRoot?: string,
 * }} [deps]
 */
export function ensureGatewayInstall(deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const gatewayRoot = deps.gatewayRoot ?? moduleDir;
  const loadPinsFn = deps.loadPinsFn ?? loadVerifiedPins;
  const parseBundleFn = deps.parseBundleFn ?? parseGatewayApiBundle;
  let mutated = false;
  let stage = 'verify-pins';

  const fail = (message) => ({
    ok: false,
    mutated,
    stage,
    error: message,
  });

  let pinsArtifacts;
  try {
    pinsArtifacts = loadPinsFn({ gatewayRoot });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'pin verification failed';
    return fail(message);
  }

  let bundleDocs;
  try {
    bundleDocs = parseBundleFn(pinsArtifacts.manifestPath);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'bundle parse failed';
    return fail(message);
  }

  stage = 'assert-platform-target';
  let target;
  try {
    target = assertPlatformTarget('release', { run });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'target refused';
    return fail(message);
  }
  const profile = readPlatformProfile('release');
  const context = target.contextName;

  stage = 'loopback-before';
  try {
    assertLoopbackExposure(context, profile, run);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'loopback refused';
    return fail(message);
  }

  stage = 'namespace-preflight';
  const labNsEarly = readPlatformObject(
    { profileId: 'release', resource: 'namespace', name: LAB_EDGE_NAMESPACE },
    { run },
  );
  if (labNsEarly.state === 'unreadable') {
    return fail('lab-edge namespace unreadable');
  }
  if (
    labNsEarly.state === 'present' &&
    labNsEarly.object?.metadata?.labels?.['offscreen.rpg/lab'] !== 'disposable'
  ) {
    return fail('lab-edge namespace foreign');
  }

  stage = 'bundle-inventory';
  const crdInventory = listGatewayGroupCrds(context, run);
  if (crdInventory.state === 'unreadable') {
    return fail(crdInventory.reason ?? 'crd inventory unreadable');
  }
  const liveBundle = new Map();
  for (const identity of BUNDLE_IDENTITIES) {
    const read = readClusterJson(
      context,
      identity.resource,
      identity.name,
      run,
    );
    if (read.state === 'unreadable') {
      return fail(`${identity.name}: ${read.reason}`);
    }
    liveBundle.set(`${identity.kind}/${identity.name}`, read.state);
  }

  const expectedCrdSet = new Set(GATEWAY_CRD_NAMES);
  const extraCrd = crdInventory.names.find((name) => !expectedCrdSet.has(name));
  if (extraCrd) {
    return fail(`extra gateway crd: ${extraCrd}`);
  }

  const presentCount = [...liveBundle.values()].filter(
    (s) => s === 'present',
  ).length;
  const bundleMode =
    presentCount === 0 ? 'absent' : presentCount === 12 ? 'present' : 'mixed';
  if (bundleMode === 'mixed') {
    return fail('partial gateway api bundle');
  }

  stage = 'bundle-ensure';
  if (bundleMode === 'absent') {
    try {
      refuseWriteDrift(
        BUNDLE_IDENTITIES.map((identity) => ({
          label: identity.name,
          snapshot: { kind: 'absent' },
          read: () =>
            readClusterJson(context, identity.resource, identity.name, run),
        })),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'bundle write drift';
      return fail(message);
    }
    const apply = run(
      'kubectl',
      [
        '--context',
        context,
        'apply',
        '--server-side',
        `--field-manager=${FIELD_MANAGER}`,
        '-f',
        pinsArtifacts.manifestPath,
      ],
      { timeoutMs: 120_000 },
    );
    if (!apply.ok) {
      return fail('bundle apply failed');
    }
    mutated = true;
    for (const crdName of GATEWAY_CRD_NAMES) {
      const wait = run(
        'kubectl',
        [
          '--context',
          context,
          'wait',
          '--for=condition=Established',
          `crd/${crdName}`,
          '--timeout=180s',
        ],
        { timeoutMs: 190_000 },
      );
      if (!wait.ok) {
        return fail(`crd wait failed: ${crdName}`);
      }
    }
    for (const identity of BUNDLE_IDENTITIES) {
      const read = readClusterJson(
        context,
        identity.resource,
        identity.name,
        run,
      );
      if (read.state !== 'present') {
        return fail(`bundle verify missing: ${identity.name}`);
      }
    }
  } else {
    for (const identity of BUNDLE_IDENTITIES) {
      const read = readClusterJson(
        context,
        identity.resource,
        identity.name,
        run,
      );
      if (read.state !== 'present') {
        return fail(`bundle object missing: ${identity.name}`);
      }
      const bundleDoc = bundleDocs.find(
        (doc) =>
          doc.kind === identity.kind && doc.metadata?.name === identity.name,
      );
      try {
        compareBundleObject(bundleDoc, read.object, context, run);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'bundle drift';
        return fail(message);
      }
    }
  }

  stage = 'helm-classify';
  const helmRelease = readHelmRelease(context, run);
  if (helmRelease.state === 'unreadable') {
    return fail(helmRelease.reason ?? 'helm release unreadable');
  }

  const expectedGateway = parse(
    readFileSync(join(gatewayRoot, 'gateway.yaml'), 'utf8'),
  );

  if (helmRelease.state === 'absent') {
    for (const id of HELM_OWNED_IDENTITIES) {
      const resource = id.kind.toLowerCase();
      const read =
        id.namespace != null
          ? readPlatformObject(
              {
                profileId: 'release',
                resource,
                name: id.name,
                namespace: id.namespace,
              },
              { run },
            )
          : readClusterJson(context, resource, id.name, run);
      if (read.state === 'unreadable') {
        return fail(`preflight unreadable: ${id.kind}/${id.name}`);
      }
      if (read.state === 'present') {
        return fail(`preflight conflict: ${id.kind}/${id.name}`);
      }
    }

    const ns = readPlatformObject(
      { profileId: 'release', resource: 'namespace', name: HELM_NAMESPACE },
      { run },
    );
    if (ns.state === 'unreadable') {
      return fail('gateway-system namespace unreadable');
    }
    if (ns.state === 'present') {
      const list = run('kubectl', [
        '--context',
        context,
        'get',
        'all',
        '-n',
        HELM_NAMESPACE,
        '--ignore-not-found',
        '-o',
        'name',
      ]);
      if (!list.ok) {
        return fail('gateway-system inventory failed');
      }
      if (list.stdout.trim()) {
        return fail('gateway-system namespace not empty-compatible');
      }
    }

    stage = 'helm-install';
    /** @type {Array<{ label: string, snapshot: WriteSnapshot, read: () => unknown }>} */
    const helmWriteChecks = [
      {
        label: HELM_RELEASE,
        snapshot: { kind: 'absent' },
        read: () => readHelmRelease(context, run),
      },
    ];
    for (const id of HELM_OWNED_IDENTITIES) {
      const resource = id.kind.toLowerCase();
      helmWriteChecks.push({
        label: `${id.kind}/${id.name}`,
        snapshot: { kind: 'absent' },
        read: () =>
          id.namespace != null
            ? readPlatformObject(
                {
                  profileId: 'release',
                  resource,
                  name: id.name,
                  namespace: id.namespace,
                },
                { run },
              )
            : readClusterJson(context, resource, id.name, run),
      });
    }
    let gatewaySystemSnapshot;
    try {
      gatewaySystemSnapshot = snapshotForWrite(ns);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'gateway-system snapshot failed';
      return fail(message);
    }
    helmWriteChecks.push({
      label: 'namespace/gateway-system',
      snapshot: gatewaySystemSnapshot,
      read: () =>
        readPlatformObject(
          { profileId: 'release', resource: 'namespace', name: HELM_NAMESPACE },
          { run },
        ),
    });
    try {
      refuseWriteDrift(helmWriteChecks);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'helm write drift';
      return fail(message);
    }
    const upgrade = run(
      'helm',
      [
        'upgrade',
        '--install',
        HELM_RELEASE,
        pinsArtifacts.chartPath,
        '--namespace',
        HELM_NAMESPACE,
        '--create-namespace',
        '--kube-context',
        context,
        '--skip-crds',
        '--reset-values',
        '-f',
        join(gatewayRoot, 'values.yaml'),
        '--wait',
        '--timeout',
        '240s',
      ],
      { timeoutMs: 250_000 },
    );
    if (!upgrade.ok) {
      return fail('helm install failed');
    }
    mutated = true;

    stage = 'lab-edge';
    const labNs = readPlatformObject(
      { profileId: 'release', resource: 'namespace', name: LAB_EDGE_NAMESPACE },
      { run },
    );
    if (labNs.state === 'unreadable') {
      return fail('lab-edge namespace unreadable');
    }
    if (labNs.state === 'absent') {
      try {
        refuseWriteDrift([
          {
            label: LAB_EDGE_NAMESPACE,
            snapshot: { kind: 'absent' },
            read: () =>
              readPlatformObject(
                {
                  profileId: 'release',
                  resource: 'namespace',
                  name: LAB_EDGE_NAMESPACE,
                },
                { run },
              ),
          },
        ]);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'lab-edge write drift';
        return fail(message);
      }
      const create = run(
        'kubectl',
        ['--context', context, 'create', '-f', '-'],
        {
          input: JSON.stringify({
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: {
              name: LAB_EDGE_NAMESPACE,
              labels: { 'offscreen.rpg/lab': 'disposable' },
            },
          }),
        },
      );
      if (!create.ok) {
        return fail('lab-edge namespace create failed');
      }
      mutated = true;
    } else if (
      labNs.object?.metadata?.labels?.['offscreen.rpg/lab'] !== 'disposable'
    ) {
      return fail('lab-edge namespace foreign');
    }

    const gw = readPlatformObject(
      {
        profileId: 'release',
        resource: 'gateway',
        name: GATEWAY_NAME,
        namespace: LAB_EDGE_NAMESPACE,
      },
      { run },
    );
    if (gw.state === 'unreadable') {
      return fail('gateway unreadable');
    }
    if (gw.state === 'absent') {
      try {
        refuseWriteDrift([
          {
            label: GATEWAY_NAME,
            snapshot: { kind: 'absent' },
            read: () =>
              readPlatformObject(
                {
                  profileId: 'release',
                  resource: 'gateway',
                  name: GATEWAY_NAME,
                  namespace: LAB_EDGE_NAMESPACE,
                },
                { run },
              ),
          },
        ]);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'gateway write drift';
        return fail(message);
      }
      const applyGw = run('kubectl', [
        '--context',
        context,
        'apply',
        '-f',
        join(gatewayRoot, 'gateway.yaml'),
      ]);
      if (!applyGw.ok) {
        return fail('gateway apply failed');
      }
      mutated = true;
    } else if (gw.state === 'present') {
      if (gw.object.metadata?.deletionTimestamp) {
        return fail('gateway deletion in progress');
      }
      if (!isDeepStrictEqual(gw.object.spec, expectedGateway.spec)) {
        return fail('gateway spec mismatch');
      }
    }
  } else {
    const rel = helmRelease.release;
    const expectedChart = `traefik-${pinsArtifacts.pins.chart.version}`;
    if (
      rel.status !== 'deployed' ||
      !String(rel.chart ?? '').startsWith(expectedChart)
    ) {
      return fail('foreign or drifted helm release');
    }
    if (rel.namespace !== HELM_NAMESPACE) {
      return fail('helm release namespace mismatch');
    }
    for (const id of HELM_OWNED_IDENTITIES) {
      const resource = id.kind.toLowerCase();
      const read =
        id.namespace != null
          ? readPlatformObject(
              {
                profileId: 'release',
                resource,
                name: id.name,
                namespace: id.namespace,
              },
              { run },
            )
          : readClusterJson(context, resource, id.name, run);
      if (read.state !== 'present') {
        return fail(`owned object missing: ${id.kind}/${id.name}`);
      }
      if (!helmOwned(read.object.metadata)) {
        return fail(`foreign helm ownership: ${id.kind}/${id.name}`);
      }
    }

    const labNs = readPlatformObject(
      { profileId: 'release', resource: 'namespace', name: LAB_EDGE_NAMESPACE },
      { run },
    );
    if (labNs.state === 'unreadable') {
      return fail('lab-edge namespace unreadable');
    }
    if (labNs.state === 'present') {
      if (
        labNs.object?.metadata?.labels?.['offscreen.rpg/lab'] !== 'disposable'
      ) {
        return fail('lab-edge namespace foreign');
      }
    }

    const gw = readPlatformObject(
      {
        profileId: 'release',
        resource: 'gateway',
        name: GATEWAY_NAME,
        namespace: LAB_EDGE_NAMESPACE,
      },
      { run },
    );
    if (gw.state === 'unreadable') {
      return fail('gateway unreadable');
    }
    if (gw.state === 'present') {
      if (gw.object.metadata?.deletionTimestamp) {
        return fail('gateway deletion in progress');
      }
      if (!isDeepStrictEqual(gw.object.spec, expectedGateway.spec)) {
        return fail('gateway spec mismatch');
      }
    } else {
      return fail('gateway absent on reuse path');
    }
  }

  stage = 'readiness';
  try {
    assertLoopbackExposure(context, profile, run);
    assessReadiness(context, run);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'readiness failed';
    return fail(message);
  }

  return { ok: true, mutated, stage: 'ready' };
}

function main() {
  const result = ensureGatewayInstall();
  if (!result.ok) {
    console.error(
      `Gateway install refused at ${result.stage}: ${result.error}`,
    );
    process.exit(1);
  }
  console.log(
    `Gateway install is ready on context ${readPlatformProfile('release').contextName}.`,
  );
  process.exit(0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
