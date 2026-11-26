import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { parseAllDocuments } from 'yaml';
import { runPlatformCommand } from '../common/commands.mjs';
import {
  observeInventory,
  redisTargetFromProfile,
} from './inventory.mjs';

export const REDIS_CONFIG_HASH_ANNOTATION = 'offscreen.rpg/redis-config-sha256';
const REDIS_CONFIG_KEY = 'redis.conf';

const EXPECTED_IMAGE =
  'docker.io/library/redis@sha256:987c376c727652f99625c7d205a1cba3cb2c53b92b0b62aade2bd48ee1593232';
const REDIS_CONTAINER_COMMAND = ['redis-server', '/config/redis.conf'];
const REDIS_VERSION = '8.2.1';
const RUN_ID_RE = /^[0-9a-f]{40}$/;
const PROBE_TIMEOUT_MS = 15_000;
const OBSERVATION_BUDGET_MS = 120_000;
const KUBECTL_READ_TIMEOUT_MS = 15_000;

/** @type {Record<string, string>} */
export const EXPECTED_REDIS_CONFIG_VALUES = {
  maxmemory: '33554432',
  'maxmemory-policy': 'allkeys-lru',
  save: '',
  appendonly: 'no',
  maxclients: '10000',
  'maxmemory-clients': '0',
};

const CONFIG_GET_KEYS = [
  'maxmemory',
  'maxmemory-policy',
  'save',
  'appendonly',
  'maxclients',
  'maxmemory-clients',
];

const RESERVED_DEPLOYMENT = 'redis';
const RESERVED_SERVICE = 'redis';
const RESERVED_CONFIGMAP = 'redis-config';

/**
 * @param {unknown} a
 * @param {unknown} b
 */
function stableEqual(a, b) {
  return isDeepStrictEqual(a, b);
}

// Normalize only the native defaults observed in the installed specimen.
function servicePortsWithDefaults(ports) {
  return Array.isArray(ports)
    ? ports.map((port) => ({ protocol: 'TCP', ...port }))
    : ports;
}

function containerWithDefaults(container) {
  const withDefaults = {
    terminationMessagePath: '/dev/termination-log',
    terminationMessagePolicy: 'File',
    ...container,
  };
  if (Array.isArray(container.ports)) {
    withDefaults.ports = container.ports.map((port) => ({
      protocol: 'TCP',
      ...port,
    }));
  }
  for (const key of ['readinessProbe', 'livenessProbe']) {
    if (container[key] != null) {
      withDefaults[key] = {
        failureThreshold: 3,
        successThreshold: 1,
        ...container[key],
      };
    }
  }
  return withDefaults;
}

function containersWithDefaults(containers) {
  return Array.isArray(containers)
    ? containers.map(containerWithDefaults)
    : containers;
}

function volumesWithDefaults(volumes) {
  return Array.isArray(volumes)
    ? volumes.map((volume) =>
        volume.configMap
          ? {
              ...volume,
              configMap: { defaultMode: 420, ...volume.configMap },
            }
          : volume,
      )
    : volumes;
}

/**
 * @param {object | undefined} data
 */
export function redisConfigSha256(data) {
  const conf = data?.[REDIS_CONFIG_KEY] ?? '';
  return createHash('sha256').update(String(conf)).digest('hex');
}

/**
 * @param {object | undefined} spec
 */
export function serviceShapeCompatible(spec) {
  if (spec?.type !== 'ClusterIP') {
    return false;
  }
  if (
    !stableEqual(spec?.selector, {
      'app.kubernetes.io/name': 'redis',
      'app.kubernetes.io/instance': 'redis',
    })
  ) {
    return false;
  }
  const ports = Array.isArray(spec?.ports) ? spec.ports : [];
  if (ports.length !== 1) {
    return false;
  }
  const port = ports[0];
  return (
    port?.name === 'redis' &&
    port?.protocol === 'TCP' &&
    port?.port === 6379 &&
    port?.targetPort === 'redis'
  );
}

/**
 * @param {object | undefined} deployment
 */
export function deploymentRolloutReady(deployment) {
  if (deployment?.spec?.replicas !== 1) {
    return false;
  }
  const generation = deployment?.metadata?.generation;
  const observed = deployment?.status?.observedGeneration;
  if (
    generation == null ||
    observed == null ||
    Number(observed) < Number(generation)
  ) {
    return false;
  }
  const status = deployment?.status ?? {};
  return (
    status.updatedReplicas === 1 &&
    status.readyReplicas === 1 &&
    status.availableReplicas === 1
  );
}

/**
 * @param {string} manifest
 */
function parseManifestDocuments(manifest) {
  if (!manifest.trim()) {
    throw new Error('empty manifest');
  }
  const docs = parseAllDocuments(manifest);
  /** @type {Record<string, unknown>[]} */
  const out = [];
  for (const doc of docs) {
    if (doc.errors.length > 0) {
      throw new Error('malformed manifest document');
    }
    const value = doc.toJS();
    if (value != null) {
      out.push(value);
    }
  }
  return out;
}

/**
 * @param {Record<string, unknown>[]} manifestDocs
 */
export function buildDesiredProjection(manifestDocs) {
  /** @type {Record<string, Record<string, unknown>>} */
  const byKind = {};
  for (const doc of manifestDocs) {
    const kind = doc.kind;
    const name = /** @type {{ metadata?: { name?: string } }} */ (doc).metadata
      ?.name;
    if (typeof kind !== 'string' || typeof name !== 'string') {
      throw new Error('manifest document identity');
    }
    byKind[`${kind}/${name}`] = doc;
  }
  const configMap = byKind['ConfigMap/redis-config'];
  const deployment = byKind['Deployment/redis'];
  const service = byKind['Service/redis'];
  if (!configMap || !deployment || !service) {
    throw new Error('manifest missing reserved objects');
  }
  const data = /** @type {{ data?: Record<string, string> }} */ (configMap).data;
  return {
    configMap,
    deployment,
    service,
    configSha256: redisConfigSha256(data),
  };
}

/**
 * @param {Record<string, unknown>} deployment
 */
function deploymentTemplateCompatible(deployment) {
  const template = /** @type {{ spec?: Record<string, unknown> }} */ (
    deployment.spec
  )?.template;
  const podSpec = /** @type {Record<string, unknown> | undefined} */ (
    template?.spec
  );
  if (!podSpec) {
    return { ok: false, detail: 'deployment template missing' };
  }
  if (podSpec.automountServiceAccountToken !== false) {
    return { ok: false, detail: 'automountServiceAccountToken must be false' };
  }
  const podSec = /** @type {Record<string, unknown> | undefined} */ (
    podSpec.securityContext
  );
  if (
    podSec?.runAsUser !== 999 ||
    podSec?.runAsGroup !== 1000 ||
    podSec?.runAsNonRoot !== true
  ) {
    return { ok: false, detail: 'pod security context mismatch' };
  }
  if (podSpec.hostNetwork || podSpec.hostPID || podSpec.hostIPC) {
    return { ok: false, detail: 'host namespace exposure' };
  }
  const containers = /** @type {unknown[]} */ (podSpec.containers ?? []);
  if (containers.length !== 1) {
    return { ok: false, detail: 'expected one container' };
  }
  const container = /** @type {Record<string, unknown>} */ (containers[0]);
  if (container.name !== 'redis') {
    return { ok: false, detail: 'container name must be redis' };
  }
  if (container.image !== EXPECTED_IMAGE) {
    return { ok: false, detail: 'container image digest mismatch' };
  }
  if (!stableEqual(container.command, REDIS_CONTAINER_COMMAND)) {
    return { ok: false, detail: 'container command mismatch' };
  }
  if (Array.isArray(container.args) && container.args.length > 0) {
    return { ok: false, detail: 'unexpected container args' };
  }
  if (
    (Array.isArray(container.env) && container.env.length > 0) ||
    (Array.isArray(container.envFrom) && container.envFrom.length > 0)
  ) {
    return { ok: false, detail: 'unexpected env or envFrom' };
  }
  if (
    (Array.isArray(podSpec.initContainers) &&
      podSpec.initContainers.length > 0) ||
    (Array.isArray(podSpec.ephemeralContainers) &&
      podSpec.ephemeralContainers.length > 0)
  ) {
    return { ok: false, detail: 'extra init or ephemeral containers' };
  }
  const cSec = /** @type {Record<string, unknown> | undefined} */ (
    container.securityContext
  );
  if (cSec?.allowPrivilegeEscalation !== false) {
    return { ok: false, detail: 'allowPrivilegeEscalation must be false' };
  }
  const caps = /** @type {{ drop?: unknown[] } | undefined} */ (cSec?.capabilities);
  if (!Array.isArray(caps?.drop) || !caps.drop.includes('ALL')) {
    return { ok: false, detail: 'capabilities must drop ALL' };
  }
  if (cSec?.privileged === true) {
    return { ok: false, detail: 'privileged container' };
  }
  const volumes = /** @type {unknown[]} */ (podSpec.volumes ?? []);
  if (volumes.length !== 2) {
    return { ok: false, detail: 'expected two volumes' };
  }
  /** @type {Record<string, unknown> | undefined} */
  let configVol;
  /** @type {Record<string, unknown> | undefined} */
  let dataVol;
  for (const vol of volumes) {
    const v = /** @type {Record<string, unknown>} */ (vol);
    if (v.name === 'config') {
      configVol = v;
    }
    if (v.name === 'data') {
      dataVol = v;
    }
    if (v.persistentVolumeClaim || v.secret || v.hostPath || v.nfs) {
      return { ok: false, detail: 'forbidden volume type' };
    }
  }
  if (
    !configVol?.configMap ||
    /** @type {{ name?: string }} */ (configVol.configMap).name !==
      RESERVED_CONFIGMAP
  ) {
    return { ok: false, detail: 'config volume source mismatch' };
  }
  const emptyDir = /** @type {{ sizeLimit?: string } | undefined} */ (
    dataVol?.emptyDir
  );
  if (emptyDir?.sizeLimit !== '32Mi') {
    return { ok: false, detail: 'emptyDir sizeLimit must be 32Mi' };
  }

  const annotations = /** @type {Record<string, string> | undefined} */ (
    template?.metadata
  )?.annotations;
  if (
    annotations?.[REDIS_CONFIG_HASH_ANNOTATION] == null ||
    annotations[REDIS_CONFIG_HASH_ANNOTATION] === ''
  ) {
    return { ok: false, detail: 'config hash annotation missing' };
  }
  return { ok: true };
}

/**
 * Pure compatibility projection: live cluster objects vs desired manifest projection.
 *
 * @param {{
 *   namespace?: object,
 *   configMap?: object,
 *   deployment?: object,
 *   service?: object,
 * }} live
 * @param {ReturnType<typeof buildDesiredProjection>} desired
 */
export function assessRedisReadyState(live, desired) {
  if (!live?.deployment || !live?.service || !live?.configMap) {
    return { ok: false, detail: 'reserved objects missing in observation' };
  }
  const liveDeploy = live.deployment;
  const liveSvc = live.service;
  const liveCm = live.configMap;

  if (!serviceShapeCompatible(liveSvc.spec)) {
    return { ok: false, detail: 'service shape incompatible' };
  }
  const desiredSvcSpec = /** @type {{ spec?: object }} */ (desired.service).spec;
  if (
    !stableEqual(
      servicePortsWithDefaults(liveSvc.spec?.ports),
      servicePortsWithDefaults(desiredSvcSpec?.ports),
    ) ||
    liveSvc.spec?.type !== desiredSvcSpec?.type
  ) {
    return { ok: false, detail: 'service spec drift' };
  }

  const desiredData = /** @type {{ data?: Record<string, string> }} */ (
    desired.configMap
  ).data;
  if (!stableEqual(liveCm.data, desiredData)) {
    return { ok: false, detail: 'configmap data mismatch' };
  }

  const templateCheck = deploymentTemplateCompatible(liveDeploy);
  if (!templateCheck.ok) {
    return templateCheck;
  }
  const liveTemplate = liveDeploy.spec?.template;
  const desiredTemplate = /** @type {{ spec?: { template?: object } }} */ (
    desired.deployment
  ).spec?.template;
  if (!stableEqual(
    containersWithDefaults(liveTemplate?.spec?.containers),
    containersWithDefaults(desiredTemplate?.spec?.containers),
  )) {
    return { ok: false, detail: 'live deployment template mismatch' };
  }
  if (!stableEqual(
    volumesWithDefaults(liveTemplate?.spec?.volumes),
    volumesWithDefaults(desiredTemplate?.spec?.volumes),
  )) {
    return { ok: false, detail: 'live volume mismatch' };
  }

  const liveHash = redisConfigSha256(liveCm.data);
  const annotation =
    liveTemplate?.metadata?.annotations?.[REDIS_CONFIG_HASH_ANNOTATION];
  if (annotation !== liveHash || annotation !== desired.configSha256) {
    return { ok: false, detail: 'config hash annotation stale' };
  }

  if (!deploymentRolloutReady(liveDeploy)) {
    return { ok: false, detail: 'deployment rollout not ready' };
  }

  return { ok: true };
}

/**
 * @param {string} stdout
 */
export function parseInfoServerReply(stdout) {
  const text = String(stdout ?? '').replace(/\r\n/g, '\n');
  /** @type {Record<string, string>} */
  const fields = {};
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trimEnd();
    if (line.length === 0 || line.startsWith('#')) {
      continue;
    }
    const colon = line.indexOf(':');
    if (colon < 1) {
      return { ok: false, reason: 'info-malformed-line' };
    }
    const key = line.slice(0, colon);
    const value = line.slice(colon + 1);
    if (key in fields) {
      return { ok: false, reason: `info-duplicate-${key}` };
    }
    fields[key] = value;
  }
  if (fields.redis_version !== REDIS_VERSION) {
    return { ok: false, reason: 'info-version' };
  }
  if (!RUN_ID_RE.test(fields.run_id ?? '')) {
    return { ok: false, reason: 'info-run-id' };
  }
  return { ok: true, runId: fields.run_id, fields };
}

/**
 * @param {string} stdout
 */
export function parsePingReply(stdout) {
  const raw = String(stdout ?? '');
  if (raw.includes('NOAUTH') || raw.includes('ERR')) {
    return { ok: false, reason: 'ping-error' };
  }
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r$/, '');
  if (normalized === 'PONG\n' || normalized === 'PONG') {
    return { ok: true };
  }
  if (normalized.startsWith('PONG') && normalized.length > 5) {
    return { ok: false, reason: 'ping-extra-text' };
  }
  if (normalized === 'OK' || normalized === 'OK\n') {
    return { ok: false, reason: 'ping-false-ok' };
  }
  if (normalized.length === 0) {
    return { ok: false, reason: 'ping-empty' };
  }
  return { ok: false, reason: 'ping-shape' };
}

/**
 * @param {string} stdout
 * @param {string} key
 */
export function parseConfigGetReply(stdout, key) {
  let text = String(stdout ?? '');
  text = text.replace(/\r\n/g, '\n');
  if (text.endsWith('\n')) {
    text = text.slice(0, -1);
  }
  const lines = text.split('\n');
  if (lines.length !== 2) {
    return { ok: false, reason: 'config-get-line-count' };
  }
  if (lines[0] !== key) {
    return { ok: false, reason: 'config-get-key' };
  }
  const expected = EXPECTED_REDIS_CONFIG_VALUES[key];
  if (expected === undefined) {
    return { ok: false, reason: 'config-get-unknown-key' };
  }
  if (lines[1] !== expected) {
    return { ok: false, reason: `config-get-value-${key}` };
  }
  return { ok: true, value: lines[1] };
}

/**
 * @param {ReturnType<typeof runPlatformCommand>} result
 */
function refuseProbeResult(result) {
  if (result.missing) {
    return { ok: false, state: 'unreadable', detail: 'kubectl-missing' };
  }
  if (result.timedOut) {
    return { ok: false, state: 'unreadable', detail: 'probe-timeout' };
  }
  if (result.stderr && result.stderr.trim().length > 0) {
    return { ok: false, state: 'unreadable', detail: 'probe-stderr' };
  }
  if (!result.ok) {
    return { ok: false, state: 'unreadable', detail: 'probe-exit' };
  }
  return null;
}

/**
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 * @param {string} podName
 * @param {string} host
 * @param {string[]} redisCliArgs
 * @param {typeof runPlatformCommand} run
 * @param {number} timeoutMs
 */
function execRedisCli(target, podName, host, redisCliArgs, run, timeoutMs) {
  return run(
    'kubectl',
    [
      '--context',
      target.contextName,
      '-n',
      target.namespace,
      'exec',
      podName,
      '-c',
      'redis',
      '--',
      'redis-cli',
      '-e',
      '--raw',
      '-h',
      host,
      '-p',
      '6379',
      ...redisCliArgs,
    ],
    { timeoutMs },
  );
}

/**
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 * @param {string} podName
 * @param {string} namespace
 * @param {typeof runPlatformCommand} run
 * @param {number} deadline
 */
export function runReadinessProtocol(target, podName, namespace, run, deadline) {
  const serviceHost = `redis.${namespace}.svc`;
  /** @type {string | null} */
  let expectedRunId = null;

  /** @type {{ host: string, kind: 'info' | 'ping' | 'config', key?: string }[]} */
  const sequence = [
    { host: '127.0.0.1', kind: 'info' },
    { host: serviceHost, kind: 'info' },
    { host: serviceHost, kind: 'ping' },
    ...CONFIG_GET_KEYS.map((key) => ({
      host: serviceHost,
      kind: /** @type {'config'} */ ('config'),
      key,
    })),
    { host: serviceHost, kind: 'info' },
    { host: '127.0.0.1', kind: 'info' },
  ];

  /** @type {string[]} */
  const runIds = [];

  for (const step of sequence) {
    const remaining = deadline - Date.now();
    if (remaining < 1) {
      return { ok: false, state: 'unreadable', detail: 'observation-budget' };
    }
    const timeoutMs = Math.min(remaining, PROBE_TIMEOUT_MS);
  const args =
      step.kind === 'ping'
        ? ['PING']
        : step.kind === 'config'
          ? ['CONFIG', 'GET', step.key ?? '']
          : ['INFO', 'server'];
    const result = execRedisCli(
      target,
      podName,
      step.host,
      args,
      run,
      timeoutMs,
    );
    const refused = refuseProbeResult(result);
    if (refused) {
      return refused;
    }
    const stdout = result.stdout ?? '';
    if (step.kind === 'info') {
      const parsed = parseInfoServerReply(stdout);
      if (!parsed.ok) {
        return {
          ok: false,
          state: 'unready',
          detail: parsed.reason ?? 'info-parse',
        };
      }
      runIds.push(parsed.runId ?? '');
      if (expectedRunId == null) {
        expectedRunId = parsed.runId ?? null;
      } else if (parsed.runId !== expectedRunId) {
        return { ok: false, state: 'unready', detail: 'run-id-mismatch' };
      }
    } else if (step.kind === 'ping') {
      const parsed = parsePingReply(stdout);
      if (!parsed.ok) {
        return {
          ok: false,
          state: 'unready',
          detail: parsed.reason ?? 'ping-parse',
        };
      }
    } else {
      const parsed = parseConfigGetReply(stdout, step.key ?? '');
      if (!parsed.ok) {
        return {
          ok: false,
          state: 'unready',
          detail: parsed.reason ?? 'config-parse',
        };
      }
    }
  }
  return { ok: true, state: 'ready', runId: expectedRunId, runIds };
}

/**
 * @param {object | undefined} meta
 */
function metaIdentity(meta) {
  return {
    uid: meta?.uid ?? null,
    resourceVersion: meta?.resourceVersion ?? null,
    deletionTimestamp: meta?.deletionTimestamp ?? null,
  };
}

/**
 * @param {object | undefined} pod
 */
function extractPodIncarnation(pod) {
  const status = pod?.status;
  const container = Array.isArray(status?.containerStatuses)
    ? status.containerStatuses.find((c) => c.name === 'redis')
    : null;
  const startedAt = container?.state?.running?.startedAt;
  return {
    containerID: container?.containerID ?? '',
    imageID: container?.imageID ?? '',
    restartCount: container?.restartCount ?? null,
    startedAt: startedAt ?? null,
    ready: container?.ready === true && status?.conditions?.some(
      (c) => c.type === 'Ready' && c.status === 'True',
    ),
  };
}

/**
 * @param {ReturnType<typeof runPlatformCommand>} result
 * @param {string} label
 */
function readJsonObject(result, label) {
  if (result.missing) {
    return { ok: false, state: 'unreadable', detail: `${label}-missing` };
  }
  if (result.timedOut) {
    return { ok: false, state: 'unreadable', detail: 'timeout' };
  }
  if (result.stderr && result.stderr.trim().length > 0) {
    return { ok: false, state: 'unreadable', detail: `${label}-stderr` };
  }
  if (!result.ok) {
    return { ok: false, state: 'unreadable', detail: label };
  }
  try {
    return { ok: true, object: JSON.parse(result.stdout) };
  } catch {
    return { ok: false, state: 'unreadable', detail: `${label}-json` };
  }
}

/**
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 * @param {typeof runPlatformCommand} run
 * @param {number} deadline
 */
export function captureObservationSnapshot(target, run, deadline) {
  const remainingBudget = () => Math.max(1, Math.min(deadline - Date.now(), KUBECTL_READ_TIMEOUT_MS));

  const ns = run(
    'kubectl',
    [
      '--context',
      target.contextName,
      'get',
      'namespace',
      target.namespace,
      '-o',
      'json',
    ],
    { timeoutMs: remainingBudget() },
  );
  const nsParsed = readJsonObject(ns, 'namespace');
  if (!nsParsed.ok) {
    return nsParsed;
  }

  const kinds = [
    ['configmap', RESERVED_CONFIGMAP],
    ['deployment', RESERVED_DEPLOYMENT],
    ['service', RESERVED_SERVICE],
  ];
  /** @type {Record<string, object>} */
  const objects = {};
  for (const [kind, name] of kinds) {
    const result = run(
      'kubectl',
      [
        '--context',
        target.contextName,
        '-n',
        target.namespace,
        'get',
        kind,
        name,
        '-o',
        'json',
      ],
      { timeoutMs: remainingBudget() },
    );
    const parsed = readJsonObject(result, kind);
    if (!parsed.ok) {
      return parsed;
    }
    objects[kind] = parsed.object;
  }

  const rsList = run(
    'kubectl',
    [
      '--context',
      target.contextName,
      '-n',
      target.namespace,
      'get',
      'replicaset',
      '-l',
      'app.kubernetes.io/name=redis,app.kubernetes.io/instance=redis',
      '-o',
      'json',
    ],
    { timeoutMs: remainingBudget() },
  );
  const rsParsed = readJsonObject(rsList, 'replicaset-list');
  if (!rsParsed.ok) {
    return rsParsed;
  }
  const replicaSets = /** @type {{ items?: object[] }} */ (rsParsed.object).items ?? [];

  const pods = run(
    'kubectl',
    [
      '--context',
      target.contextName,
      '-n',
      target.namespace,
      'get',
      'pods',
      '-l',
      'app.kubernetes.io/name=redis,app.kubernetes.io/instance=redis',
      '-o',
      'json',
    ],
    { timeoutMs: remainingBudget() },
  );
  const podsParsed = readJsonObject(pods, 'pod-list');
  if (!podsParsed.ok) {
    return podsParsed;
  }
  const podItems = /** @type {{ items?: object[] }} */ (podsParsed.object).items ?? [];

  const endpointSlices = run(
    'kubectl',
    [
      '--context',
      target.contextName,
      '-n',
      target.namespace,
      'get',
      'endpointslice',
      '-l',
      `kubernetes.io/service-name=${RESERVED_SERVICE}`,
      '-o',
      'json',
    ],
    { timeoutMs: remainingBudget() },
  );
  const epParsed = readJsonObject(endpointSlices, 'endpointslice-list');
  if (!epParsed.ok) {
    return epParsed;
  }
  const sliceItems =
    /** @type {{ items?: object[] }} */ (epParsed.object).items ?? [];

  return {
    ok: true,
    namespace: nsParsed.object,
    configMap: objects.configmap,
    deployment: objects.deployment,
    service: objects.service,
    replicaSets,
    pods: podItems,
    endpointSlices: sliceItems,
  };
}

/**
 * @param {object[]} endpoints
 * @param {object} service
 * @param {object} pod
 */
export function assessReadyEndpoints(endpoints, service, pod) {
  const serviceUid = service?.metadata?.uid;
  const podUid = pod?.metadata?.uid;
  const podName = pod?.metadata?.name;
  const podIp = pod?.status?.podIP;
  /** @type {object[]} */
  const ready = [];
  for (const slice of endpoints) {
    const ownerRefs = slice?.metadata?.ownerReferences ?? [];
    const ownedByService = ownerRefs.some(
      (ref) => ref.kind === 'Service' && ref.uid === serviceUid,
    );
    if (!ownedByService) {
      continue;
    }
    const epPorts = slice?.ports ?? [];
    const epList = slice?.endpoints ?? [];
    for (const endpoint of epList) {
      const conditions = endpoint?.conditions ?? {};
      const addresses = endpoint?.addresses ?? [];
      const targetRef = endpoint?.targetRef;
      for (const address of addresses) {
        const portOk = epPorts.some(
          (p) =>
            p.name === 'redis' &&
            p.protocol === 'TCP' &&
            p.port === 6379,
        );
        if (
          conditions.ready === true &&
          conditions.serving === true &&
          conditions.terminating !== true &&
          targetRef?.uid === podUid &&
          targetRef?.name === podName &&
          targetRef?.namespace === pod?.metadata?.namespace &&
          address === podIp &&
          portOk
        ) {
          ready.push(endpoint);
        }
      }
    }
  }
  if (ready.length !== 1) {
    return {
      ok: false,
      detail: ready.length === 0 ? 'no ready endpoint' : 'extra endpoint',
    };
  }
  return { ok: true };
}

/**
 * @param {ReturnType<typeof captureObservationSnapshot>} snap
 */
function selectSingletonPod(snap) {
  if (!snap.ok) {
    return { ok: false, state: snap.state, detail: snap.detail };
  }
  if (snap.pods.length !== 1) {
    return { ok: false, state: 'unready', detail: 'pod count not one' };
  }
  const pod = snap.pods[0];
  const incarnation = extractPodIncarnation(pod);
  if (!incarnation.containerID || !incarnation.startedAt) {
    return { ok: false, state: 'unready', detail: 'pod incarnation incomplete' };
  }
  if (!incarnation.ready) {
    return { ok: false, state: 'unready', detail: 'pod not ready' };
  }
  return { ok: true, pod, incarnation };
}

/**
 * @param {ReturnType<typeof captureObservationSnapshot>} before
 * @param {ReturnType<typeof captureObservationSnapshot>} after
 */
export function compareObservationSnapshots(before, after) {
  if (!before.ok || !after.ok) {
    return { ok: false, state: 'unreadable', detail: 'snapshot incomplete' };
  }
  const pairs = [
    ['namespace', before.namespace, after.namespace],
    ['configMap', before.configMap, after.configMap],
    ['deployment', before.deployment, after.deployment],
    ['service', before.service, after.service],
  ];
  for (const [label, a, b] of pairs) {
    const left = metaIdentity(a?.metadata);
    const right = metaIdentity(b?.metadata);
    if (left.uid !== right.uid) {
      return { ok: false, state: 'unstable', detail: `${label} uid churn` };
    }
    if (left.resourceVersion !== right.resourceVersion) {
      return { ok: false, state: 'unstable', detail: `${label} resourceVersion churn` };
    }
    if (left.deletionTimestamp !== right.deletionTimestamp) {
      return { ok: false, state: 'unstable', detail: `${label} deletion churn` };
    }
  }
  const podIds = (pods) =>
    pods.map((p) => metaIdentity(p?.metadata).uid).sort().join(',');
  const rsIds = (items) =>
    items.map((r) => metaIdentity(r?.metadata).uid).sort().join(',');
  const epIds = (items) =>
    items.map((s) => metaIdentity(s?.metadata).uid).sort().join(',');

  if (podIds(before.pods) !== podIds(after.pods)) {
    return { ok: false, state: 'unstable', detail: 'pod membership churn' };
  }
  if (rsIds(before.replicaSets) !== rsIds(after.replicaSets)) {
    return { ok: false, state: 'unstable', detail: 'replicaset membership churn' };
  }
  if (epIds(before.endpointSlices) !== epIds(after.endpointSlices)) {
    return { ok: false, state: 'unstable', detail: 'endpointslice membership churn' };
  }
  for (let i = 0; i < before.pods.length; i += 1) {
    const left = metaIdentity(before.pods[i]?.metadata);
    const right = metaIdentity(after.pods[i]?.metadata);
    if (left.uid === right.uid && left.resourceVersion !== right.resourceVersion) {
      return { ok: false, state: 'unstable', detail: 'pod resourceVersion churn' };
    }
  }
  return { ok: true };
}

/**
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 * @param {ReturnType<typeof buildDesiredProjection>} desired
 * @param {{ run?: typeof runPlatformCommand, deadline?: number }} [deps]
 */
export function observeTargetReady(target, desired, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const deadline = deps.deadline ?? Date.now() + OBSERVATION_BUDGET_MS;

  const before = captureObservationSnapshot(target, run, deadline);
  if (!before.ok) {
    return { state: before.state ?? 'unreadable', detail: before.detail ?? 'snapshot' };
  }
  const compat = assessRedisReadyState(
    {
      namespace: before.namespace,
      configMap: before.configMap,
      deployment: before.deployment,
      service: before.service,
    },
    desired,
  );
  if (!compat.ok) {
    return { state: 'unready', detail: compat.detail ?? 'compatibility' };
  }

  const podPick = selectSingletonPod(before);
  if (!podPick.ok) {
    return { state: podPick.state ?? 'unready', detail: podPick.detail ?? 'pod' };
  }

  const endpoint = assessReadyEndpoints(
    before.endpointSlices,
    before.service,
    podPick.pod,
  );
  if (!endpoint.ok) {
    return { state: 'unready', detail: endpoint.detail ?? 'endpoint' };
  }

  const protocol = runReadinessProtocol(
    target,
    podPick.pod.metadata.name,
    target.namespace,
    run,
    deadline,
  );
  if (!protocol.ok) {
    return { state: protocol.state ?? 'unready', detail: protocol.detail ?? 'protocol' };
  }

  const after = captureObservationSnapshot(target, run, deadline);
  if (!after.ok) {
    return { state: after.state ?? 'unreadable', detail: after.detail ?? 'snapshot-after' };
  }
  const stable = compareObservationSnapshots(before, after);
  if (!stable.ok) {
    return { state: stable.state ?? 'unstable', detail: stable.detail ?? 'unstable' };
  }

  const beforeInc = extractPodIncarnation(podPick.pod);
  const afterPick = selectSingletonPod(after);
  if (!afterPick.ok) {
    return { state: 'unready', detail: 'post-probe pod missing' };
  }
  const afterInc = extractPodIncarnation(afterPick.pod);
  if (beforeInc.containerID !== afterInc.containerID) {
    return { state: 'unready', detail: 'containerID changed during probes' };
  }

  return { state: 'ready', detail: 'compatible-ready' };
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function observeRedisReady(profileId, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  /** @type {import('./inventory.mjs').RedisInventoryTarget} */
  let target;
  try {
    target = redisTargetFromProfile(profileId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, state: 'unreadable', detail: message };
  }

  const inventory = observeInventory(target, { run });
  if (inventory.state !== 'installed') {
    return {
      ok: false,
      state: inventory.state,
      detail: inventory.reason ?? inventory.state,
    };
  }

  const manifestText = inventory.snapshot?.fetchedManifest;
  if (typeof manifestText !== 'string' || manifestText.trim().length === 0) {
    return { ok: false, state: 'unreadable', detail: 'missing-installed-manifest' };
  }

  /** @type {ReturnType<typeof buildDesiredProjection>} */
  let desired;
  try {
    desired = buildDesiredProjection(parseManifestDocuments(manifestText));
  } catch {
    return { ok: false, state: 'unreadable', detail: 'installed-manifest-parse' };
  }

  const observed = observeTargetReady(target, desired, {
    run,
    deadline: Date.now() + OBSERVATION_BUDGET_MS,
  });
  return {
    ok: observed.state === 'ready',
    state: observed.state,
    detail: observed.detail ?? observed.state,
  };
}
