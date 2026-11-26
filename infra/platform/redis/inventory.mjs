import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { isDeepStrictEqual } from 'node:util';
import { URL, fileURLToPath } from 'node:url';
import { parse, parseAllDocuments } from 'yaml';
import {
  runPlatformCommand,
  PLATFORM_COMMAND_TIMEOUT_MS,
} from '../common/commands.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import { renderRedisChartForTarget } from './config.mjs';

const REDIS_MODULE_ROOT = fileURLToPath(new URL('./', import.meta.url));
const CHART_META = parse(
  readFileSync(join(REDIS_MODULE_ROOT, 'chart', 'Chart.yaml'), 'utf8'),
);
const EXPECTED_CHART_ID = `${CHART_META.name}-${CHART_META.version}`;
const HELM_TIMEOUT_MS = 30_000;
const KUBECTL_LIST_TIMEOUT_MS = 15_000;
const KUBECTL_READ_TIMEOUT_MS = 15_000;
const REQUIRED_HELM_SHORT_VERSION = 'v3.22.1';
const HELM_RELEASE_PREFIX = 'sh.helm.release.v1.redis.';
const EXPECTED_RELEASE_SECRET = `${HELM_RELEASE_PREFIX}v1`;
const RELEASE_NAME = 'redis';
const RESERVED_DEPLOYMENT = 'redis';
const RESERVED_SERVICE = 'redis';
const RESERVED_CONFIGMAP = 'redis-config';

const REFUSED_RUNNER_ENV_KEYS = [
  'HELM_DRIVER',
  'KUBECONFIG',
  'KUBERNETES_SERVICE_HOST',
  'KUBERNETES_SERVICE_PORT',
  'HTTPS_PROXY',
  'HTTP_PROXY',
  'ALL_PROXY',
  'NO_PROXY',
  'HELM_KUBEAPISERVER',
  'HELM_KUBETOKEN',
  'HELM_BEARER_TOKEN',
  'AWS_ROLE_ARN',
  'AWS_WEB_IDENTITY_TOKEN_FILE',
];

const RESOURCE_NAME = /^[a-z0-9][a-z0-9.\-/]*$/;
const NAME_LINE = /^(secret|configmap)\/([^/]+)$/;

/** kubectl -o name qualified prefixes for reserved live objects. */
const RESOURCE_IDENTITY = {
  deployment: {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    qualifiedPrefix: 'deployment.apps',
  },
  service: {
    apiVersion: 'v1',
    kind: 'Service',
    qualifiedPrefix: 'service',
  },
  configmap: {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    qualifiedPrefix: 'configmap',
  },
};

/** @typedef {'dev' | 'release'} RedisProfileId */

/**
 * @typedef {{
 *   profileId: RedisProfileId,
 *   contextName: string,
 *   namespace: string,
 *   ownerKey: string,
 *   ownerValue: string,
 *   release: 'redis',
 * }} RedisInventoryTarget
 */

/** @typedef {(command: string, args: string[], options?: { input?: string, timeoutMs?: number }) => ReturnType<typeof runPlatformCommand>} PlatformRun */

function assertRedisHelmRunnerEnv() {
  for (const key of REFUSED_RUNNER_ENV_KEYS) {
    const value = process.env[key];
    if (value != null && String(value).length > 0) {
      throw new Error(`redis helm runner env refused: ${key}`);
    }
  }
}

/**
 * @param {PlatformRun} run
 */
function assertHelmVersion(run) {
  const result = run('helm', ['version', '--short'], { timeoutMs: 5_000 });
  if (!result.ok || result.timedOut || result.missing) {
    return { ok: false, reason: 'helm-unavailable' };
  }
  const short = (result.stdout ?? '').trim().split(/\r?\n/)[0] ?? '';
  if (!short.startsWith(REQUIRED_HELM_SHORT_VERSION)) {
    return { ok: false, reason: 'unsupported-helm' };
  }
  return { ok: true, short };
}

/**
 * @param {RedisProfileId} profileId
 */
export function redisTargetFromProfile(profileId) {
  if (profileId !== 'dev' && profileId !== 'release') {
    throw new Error(`unsupported platform profile: ${profileId}`);
  }
  const profile = readPlatformProfile(profileId);
  const namespace = profile.namespaces.redis;
  if (typeof namespace !== 'string' || namespace.length === 0) {
    throw new Error(
      `redis namespace is not configured for profile ${profileId}`,
    );
  }
  const ownerKey =
    profileId === 'dev'
      ? `${profile.ownerLabel}/owner`
      : `${profile.ownerLabel}/lab`;
  return {
    profileId,
    contextName: profile.contextName,
    namespace,
    ownerKey,
    ownerValue: profile.ownerValue,
    release: 'redis',
  };
}

/**
 * @param {unknown} target
 * @returns {target is RedisInventoryTarget}
 */
function validateTarget(target) {
  if (!target || typeof target !== 'object') {
    throw new Error('inventory target is required');
  }
  const t = /** @type {Record<string, unknown>} */ (target);
  if (t.profileId !== 'dev' && t.profileId !== 'release') {
    throw new Error('inventory target profileId is invalid');
  }
  if (typeof t.contextName !== 'string' || t.contextName.length === 0) {
    throw new Error('inventory target contextName is invalid');
  }
  if (typeof t.namespace !== 'string' || t.namespace.length === 0) {
    throw new Error('inventory target namespace is invalid');
  }
  if (typeof t.ownerKey !== 'string' || t.ownerKey.length === 0) {
    throw new Error('inventory target ownerKey is invalid');
  }
  if (typeof t.ownerValue !== 'string' || t.ownerValue.length === 0) {
    throw new Error('inventory target ownerValue is invalid');
  }
  if (t.release !== 'redis') {
    throw new Error('inventory target release must be redis');
  }
  return true;
}

/**
 * @param {ReturnType<typeof runPlatformCommand>} result
 * @param {string} failureLabel
 */
function refuseCommandResult(result, failureLabel) {
  if (result.missing) {
    return { state: 'unreadable', reason: `${failureLabel}-missing` };
  }
  if (result.timedOut) {
    return { state: 'unreadable', reason: 'timeout' };
  }
  if (result.stderr && result.stderr.trim().length > 0) {
    return { state: 'unreadable', reason: `${failureLabel}-stderr` };
  }
  if (!result.ok) {
    return { state: 'unreadable', reason: failureLabel };
  }
  return null;
}

/**
 * @param {PlatformRun} run
 * @param {RedisInventoryTarget} target
 * @param {string} resource
 * @param {string | undefined} labelSelector
 */
function kubectlListNames(run, target, resource, labelSelector) {
  /** @type {string[]} */
  const args = [
    '--context',
    target.contextName,
    '-n',
    target.namespace,
    '--request-timeout=10s',
    'get',
    resource,
    '-o',
    'name',
  ];
  if (labelSelector) {
    args.push('-l', labelSelector);
  }
  const result = run('kubectl', args, { timeoutMs: KUBECTL_LIST_TIMEOUT_MS });
  const refused = refuseCommandResult(result, `kubectl-list-${resource}`);
  if (refused) {
    return refused;
  }
  const lines = result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  /** @type {string[]} */
  const names = [];
  const seen = new Set();
  for (const line of lines) {
    const match = NAME_LINE.exec(line);
    if (!match || match[1] !== resource) {
      return { state: 'unreadable', reason: 'malformed-list-line' };
    }
    const name = match[2];
    if (!RESOURCE_NAME.test(name)) {
      return { state: 'unreadable', reason: 'invalid-resource-name' };
    }
    if (seen.has(name)) {
      return { state: 'unreadable', reason: 'duplicate-name' };
    }
    seen.add(name);
    names.push(name);
  }
  return { state: 'ok', names };
}

/**
 * @param {PlatformRun} run
 * @param {RedisInventoryTarget} target
 */
function observeNamespace(run, target) {
  const result = run(
    'kubectl',
    [
      '--context',
      target.contextName,
      'get',
      'namespace',
      target.namespace,
      '--request-timeout=10s',
      '--ignore-not-found',
      '-o',
      'json',
    ],
    { timeoutMs: KUBECTL_READ_TIMEOUT_MS },
  );
  if (result.missing) {
    return { kind: 'unreadable', reason: 'kubectl-missing' };
  }
  if (result.timedOut) {
    return { kind: 'unreadable', reason: 'timeout' };
  }
  if (result.stderr && result.stderr.trim().length > 0) {
    return { kind: 'unreadable', reason: 'namespace-stderr' };
  }
  if (!result.ok) {
    return { kind: 'unreadable', reason: 'namespace-get' };
  }
  const trimmed = result.stdout.trim();
  // Successful kubectl with empty stdout means the namespace is absent.
  if (trimmed.length === 0) {
    return { kind: 'absent' };
  }
  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { kind: 'unreadable', reason: 'malformed-namespace-json' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { kind: 'unreadable', reason: 'malformed-namespace-json' };
  }
  const ns =
    /** @type {{ apiVersion?: unknown, kind?: unknown, metadata?: { name?: unknown } }} */ (
      parsed
    );
  if (ns.apiVersion !== 'v1' || ns.kind !== 'Namespace') {
    return { kind: 'unreadable', reason: 'namespace-shape' };
  }
  if (ns.metadata?.name !== target.namespace) {
    return { kind: 'unreadable', reason: 'namespace-shape' };
  }
  return { kind: 'present' };
}

/**
 * @param {string} name
 * @param {boolean} fromLabelQuery
 */
function isSecretCandidateName(name, fromLabelQuery) {
  if (name.startsWith(HELM_RELEASE_PREFIX)) {
    return true;
  }
  if (!fromLabelQuery) {
    return false;
  }
  if (name.startsWith('sh.helm.release.v1.')) {
    return true;
  }
  return name === 'redis' || name.includes('redis');
}

/**
 * @param {string} name
 * @param {boolean} fromLabelQuery
 */
function isConfigMapCandidateName(name, fromLabelQuery) {
  if (name.startsWith(HELM_RELEASE_PREFIX)) {
    return true;
  }
  if (!fromLabelQuery) {
    return false;
  }
  return name === 'redis' || name.startsWith('sh.helm.release.v1.');
}

/**
 * @param {PlatformRun} run
 * @param {RedisInventoryTarget} target
 */
function helmCommonArgs(target) {
  return ['--kube-context', target.contextName, '-n', target.namespace];
}

/**
 * @param {PlatformRun} run
 * @param {RedisInventoryTarget} target
 */
function fetchHelmList(run, target) {
  const args = [
    'list',
    '--all',
    '--filter',
    '^redis$',
    '--max',
    '2',
    '-o',
    'json',
    ...helmCommonArgs(target),
  ];
  const result = run('helm', args, { timeoutMs: HELM_TIMEOUT_MS });
  const refused = refuseCommandResult(result, 'helm-list');
  if (refused) {
    return refused;
  }
  const trimmed = result.stdout.trim();
  if (trimmed.length === 0) {
    return { state: 'unreadable', reason: 'helm-list-empty-output' };
  }
  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { state: 'unreadable', reason: 'helm-list-json' };
  }
  if (!Array.isArray(parsed)) {
    return { state: 'unreadable', reason: 'helm-list-not-array' };
  }
  /** @type {Array<{ name: string, namespace: string, revision: number, status: string, chart: string }>} */
  const rows = [];
  const seen = new Set();
  for (const row of parsed) {
    if (!row || typeof row !== 'object') {
      return { state: 'unreadable', reason: 'helm-list-row' };
    }
    const entry = /** @type {Record<string, unknown>} */ (row);
    const name = entry.name;
    const ns = entry.namespace;
    const revisionRaw = entry.revision;
    const status = entry.status;
    const chart = entry.chart;
    if (typeof name !== 'string' || typeof ns !== 'string') {
      return { state: 'unreadable', reason: 'helm-list-row' };
    }
    if (name !== RELEASE_NAME || ns !== target.namespace) {
      return { state: 'unreadable', reason: 'helm-list-unexpected-row' };
    }
    if (seen.has(name)) {
      return { state: 'unreadable', reason: 'duplicate-helm-list' };
    }
    seen.add(name);
    const revision = Number.parseInt(String(revisionRaw), 10);
    if (!Number.isFinite(revision)) {
      return { state: 'unreadable', reason: 'helm-list-revision' };
    }
    if (typeof status !== 'string' || typeof chart !== 'string') {
      return { state: 'unreadable', reason: 'helm-list-status' };
    }
    rows.push({ name, namespace: ns, revision, status, chart });
  }
  return { state: 'ok', rows };
}

/**
 * @param {PlatformRun} run
 * @param {RedisInventoryTarget} target
 * @param {string} resource
 * @param {string} name
 */
function readObjectMeta(run, target, resource, name) {
  const result = run(
    'kubectl',
    [
      '--context',
      target.contextName,
      '-n',
      target.namespace,
      '--request-timeout=10s',
      'get',
      resource,
      name,
      '-o',
      'jsonpath={.metadata.labels}',
    ],
    { timeoutMs: KUBECTL_READ_TIMEOUT_MS },
  );
  const refused = refuseCommandResult(result, `kubectl-meta-${resource}`);
  if (refused) {
    return refused;
  }
  const trimmed = result.stdout.trim();
  if (trimmed.length === 0) {
    return { state: 'ok', labels: {} };
  }
  /** @type {Record<string, string>} */
  let labels;
  try {
    labels = JSON.parse(trimmed);
  } catch {
    return { state: 'unreadable', reason: 'malformed-labels' };
  }
  if (!labels || typeof labels !== 'object' || Array.isArray(labels)) {
    return { state: 'unreadable', reason: 'malformed-labels' };
  }
  return {
    state: 'ok',
    labels: /** @type {Record<string, string>} */ (labels),
  };
}

/**
 * @param {PlatformRun} run
 * @param {RedisInventoryTarget} target
 * @param {string} resource
 * @param {string} name
 */
function readObjectPresence(run, target, resource, name) {
  const identity =
    RESOURCE_IDENTITY[/** @type {keyof typeof RESOURCE_IDENTITY} */ (resource)];
  if (!identity) {
    return { state: 'unreadable', reason: `unsupported-resource-${resource}` };
  }
  const result = run(
    'kubectl',
    [
      '--context',
      target.contextName,
      '-n',
      target.namespace,
      '--request-timeout=10s',
      'get',
      resource,
      name,
      '--ignore-not-found',
      '-o',
      'json',
    ],
    { timeoutMs: KUBECTL_READ_TIMEOUT_MS },
  );
  if (result.timedOut) {
    return { state: 'unreadable', reason: 'timeout' };
  }
  if (result.missing) {
    return { state: 'unreadable', reason: `kubectl-${resource}-missing` };
  }
  if (result.stderr && result.stderr.trim().length > 0) {
    return { state: 'unreadable', reason: `kubectl-${resource}-stderr` };
  }
  if (!result.ok) {
    return { state: 'unreadable', reason: `kubectl-${resource}` };
  }
  const trimmed = result.stdout.trim();
  if (trimmed.length === 0) {
    return { state: 'absent' };
  }
  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { state: 'unreadable', reason: 'malformed-object-json' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { state: 'unreadable', reason: 'malformed-object-json' };
  }
  const object =
    /** @type {{ apiVersion?: unknown, kind?: unknown, metadata?: { name?: unknown, namespace?: unknown } }} */ (
      parsed
    );
  if (
    object.apiVersion !== identity.apiVersion ||
    object.kind !== identity.kind
  ) {
    return { state: 'unreadable', reason: 'identity-mismatch' };
  }
  if (
    object.metadata?.name !== name ||
    object.metadata?.namespace !== target.namespace
  ) {
    return { state: 'unreadable', reason: 'name-mismatch' };
  }
  return {
    state: 'present',
    qualifiedName: `${identity.qualifiedPrefix}/${name}`,
  };
}

/**
 * @param {PlatformRun} run
 * @param {RedisInventoryTarget} target
 */
function readDeploymentSelectors(run, target) {
  const presence = readObjectPresence(
    run,
    target,
    'deployment',
    RESERVED_DEPLOYMENT,
  );
  if (presence.state !== 'present') {
    return presence;
  }
  const labelsResult = run(
    'kubectl',
    [
      '--context',
      target.contextName,
      '-n',
      target.namespace,
      '--request-timeout=10s',
      'get',
      'deployment',
      RESERVED_DEPLOYMENT,
      '-o',
      'jsonpath={.spec.selector.matchLabels}',
    ],
    { timeoutMs: KUBECTL_READ_TIMEOUT_MS },
  );
  const refused = refuseCommandResult(labelsResult, 'deployment-selector');
  if (refused) {
    return refused;
  }
  /** @type {Record<string, string>} */
  let selectors = {};
  if (labelsResult.stdout.trim()) {
    try {
      selectors = JSON.parse(labelsResult.stdout);
    } catch {
      return { state: 'unreadable', reason: 'deployment-selector-json' };
    }
  }
  const ownerMeta = readObjectMeta(
    run,
    target,
    'deployment',
    RESERVED_DEPLOYMENT,
  );
  if (ownerMeta.state !== 'ok') {
    return ownerMeta;
  }
  return {
    state: 'present',
    selectors,
    labels: ownerMeta.labels,
  };
}

/**
 * @param {PlatformRun} run
 * @param {RedisInventoryTarget} target
 */
function readServiceShape(run, target) {
  const presence = readObjectPresence(run, target, 'service', RESERVED_SERVICE);
  if (presence.state !== 'present') {
    return presence;
  }
  const selectorResult = run(
    'kubectl',
    [
      '--context',
      target.contextName,
      '-n',
      target.namespace,
      '--request-timeout=10s',
      'get',
      'service',
      RESERVED_SERVICE,
      '-o',
      'jsonpath={.spec.selector}',
    ],
    { timeoutMs: KUBECTL_READ_TIMEOUT_MS },
  );
  const refused = refuseCommandResult(selectorResult, 'service-selector');
  if (refused) {
    return refused;
  }
  /** @type {Record<string, string>} */
  let selectors = {};
  if (selectorResult.stdout.trim()) {
    try {
      selectors = JSON.parse(selectorResult.stdout);
    } catch {
      return { state: 'unreadable', reason: 'service-selector-json' };
    }
  }
  const ownerMeta = readObjectMeta(run, target, 'service', RESERVED_SERVICE);
  if (ownerMeta.state !== 'ok') {
    return ownerMeta;
  }
  return { state: 'present', selectors, labels: ownerMeta.labels };
}

/**
 * @param {PlatformRun} run
 * @param {RedisInventoryTarget} target
 */
function readEndpointsPresence(run, target) {
  const result = run(
    'kubectl',
    [
      '--context',
      target.contextName,
      '-n',
      target.namespace,
      '--request-timeout=10s',
      'get',
      'endpointslices.discovery.k8s.io',
      '-l',
      `kubernetes.io/service-name=${RESERVED_SERVICE}`,
      '-o',
      'json',
    ],
    { timeoutMs: KUBECTL_READ_TIMEOUT_MS },
  );
  const refused = refuseCommandResult(result, 'endpoints');
  if (refused) {
    return refused;
  }
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch (error) {
    return { state: 'unreadable', reason: 'malformed-endpoints-json', error };
  }
  if (
    !parsed ||
    parsed.kind !== 'List' ||
    parsed.apiVersion !== 'v1' ||
    !Array.isArray(parsed.items)
  ) {
    return { state: 'unreadable', reason: 'endpoints-identity' };
  }
  const names = new Set();
  for (const slice of parsed.items) {
    const name = slice?.metadata?.name;
    if (
      slice?.kind !== 'EndpointSlice' ||
      slice?.apiVersion !== 'discovery.k8s.io/v1' ||
      slice?.metadata?.namespace !== target.namespace ||
      slice?.metadata?.labels?.['kubernetes.io/service-name'] !== RESERVED_SERVICE ||
      typeof name !== 'string' ||
      !RESOURCE_NAME.test(name) ||
      names.has(name) ||
      !Array.isArray(slice.endpoints)
    ) {
      return { state: 'unreadable', reason: 'endpoints-name-mismatch' };
    }
    names.add(name);
  }
  // Even an empty matching slice is residue, not proof of fresh absence.
  return { state: names.size === 0 ? 'absent' : 'present' };
}

/**
 * @param {PlatformRun} run
 */
function defaultInventoryRun(command, args, options = {}) {
  assertRedisHelmRunnerEnv();
  if (command === 'helm') {
    const result = spawnSync(command, args, {
      encoding: 'utf8',
      input: options.input,
      timeout: options.timeoutMs ?? HELM_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        LANG: process.env.LANG,
        HELM_DRIVER: 'secret',
      },
    });
    const timedOut =
      result.error?.code === 'ETIMEDOUT' || result.signal === 'SIGTERM';
    const missing = result.error?.code === 'ENOENT';
    const status = result.status ?? null;
    return {
      ok: !timedOut && !missing && !result.error && status === 0,
      status,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      timedOut,
      missing,
    };
  }
  return runPlatformCommand(command, args, {
    timeoutMs: options.timeoutMs ?? PLATFORM_COMMAND_TIMEOUT_MS,
    input: options.input,
  });
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
 * @param {Record<string, unknown>[]} got
 * @param {{ configMap: Record<string, unknown>, deployment: Record<string, unknown>, service: Record<string, unknown> }} want
 */
function manifestsCompatible(got, want) {
  /** @type {Record<string, Record<string, unknown>>} */
  const byKind = {};
  for (const doc of got) {
    const kind = doc.kind;
    const name = /** @type {{ metadata?: { name?: string } }} */ (doc).metadata
      ?.name;
    if (typeof kind !== 'string' || typeof name !== 'string') {
      return false;
    }
    byKind[`${kind}/${name}`] = doc;
  }
  const configMap = byKind['ConfigMap/redis-config'];
  const deployment = byKind['Deployment/redis'];
  const service = byKind['Service/redis'];
  if (!configMap || !deployment || !service) {
    return false;
  }
  return (
    isDeepStrictEqual(configMap, want.configMap) &&
    isDeepStrictEqual(deployment, want.deployment) &&
    isDeepStrictEqual(service, want.service)
  );
}

/**
 * @param {PlatformRun} run
 * @param {RedisInventoryTarget} target
 */
function fetchHelmManifestValues(run, target) {
  const manifest = run(
    'helm',
    ['get', 'manifest', RELEASE_NAME, ...helmCommonArgs(target)],
    { timeoutMs: HELM_TIMEOUT_MS },
  );
  const manifestRefused = refuseCommandResult(manifest, 'helm-get-manifest');
  if (manifestRefused) {
    return manifestRefused;
  }
  const values = run(
    'helm',
    [
      'get',
      'values',
      RELEASE_NAME,
      '--all',
      '-o',
      'json',
      ...helmCommonArgs(target),
    ],
    { timeoutMs: HELM_TIMEOUT_MS },
  );
  const valuesRefused = refuseCommandResult(values, 'helm-get-values');
  if (valuesRefused) {
    return valuesRefused;
  }
  const history = run(
    'helm',
    [
      'history',
      RELEASE_NAME,
      '--max',
      '2',
      '-o',
      'json',
      ...helmCommonArgs(target),
    ],
    { timeoutMs: HELM_TIMEOUT_MS },
  );
  const historyRefused = refuseCommandResult(history, 'helm-history');
  if (historyRefused) {
    return historyRefused;
  }
  /** @type {unknown} */
  let valuesParsed;
  try {
    valuesParsed = JSON.parse(values.stdout);
  } catch {
    return { state: 'unreadable', reason: 'helm-values-json' };
  }
  if (
    !valuesParsed ||
    typeof valuesParsed !== 'object' ||
    Array.isArray(valuesParsed)
  ) {
    return { state: 'unreadable', reason: 'helm-values-shape' };
  }
  /** @type {unknown} */
  let historyParsed;
  try {
    historyParsed = JSON.parse(history.stdout);
  } catch {
    return { state: 'unreadable', reason: 'helm-history-json' };
  }
  if (!Array.isArray(historyParsed)) {
    return { state: 'unreadable', reason: 'helm-history-not-array' };
  }
  if (historyParsed.length !== 1) {
    return { state: 'unreadable', reason: 'helm-history-count' };
  }
  const historyRow = /** @type {{ revision?: unknown, status?: unknown }} */ (
    historyParsed[0]
  );
  const historyRevision = Number.parseInt(String(historyRow.revision), 10);
  if (!Number.isFinite(historyRevision) || historyRevision !== 1) {
    return { state: 'unreadable', reason: 'helm-history-revision' };
  }
  /** @type {Record<string, unknown>[]} */
  let manifestDocs;
  try {
    manifestDocs = parseManifestDocuments(manifest.stdout);
  } catch {
    return { state: 'unreadable', reason: 'helm-manifest-parse' };
  }
  if (manifestDocs.length !== 3) {
    return { state: 'unreadable', reason: 'helm-manifest-count' };
  }
  return {
    state: 'ok',
    manifest: manifest.stdout,
    manifestDocs,
    values: /** @type {Record<string, unknown>} */ (valuesParsed),
  };
}

/**
 * @param {RedisInventoryTarget} target
 * @param {{ run?: PlatformRun }} [deps]
 */
export function observeInventory(target, deps = {}) {
  validateTarget(target);
  const run = deps.run ?? defaultInventoryRun;

  try {
    assertRedisHelmRunnerEnv();
  } catch {
    return { state: 'unreadable', reason: 'runner-env', snapshot: {} };
  }

  const helmVersion = assertHelmVersion(run);
  if (!helmVersion.ok) {
    return { state: 'unreadable', reason: helmVersion.reason, snapshot: {} };
  }

  const namespaceState = observeNamespace(run, target);
  if (namespaceState.kind === 'unreadable') {
    return {
      state: 'unreadable',
      reason: namespaceState.reason,
      snapshot: {},
    };
  }
  if (namespaceState.kind === 'absent') {
    const recheck = observeNamespace(run, target);
    if (recheck.kind === 'present') {
      return { state: 'unreadable', reason: 'namespace-race', snapshot: {} };
    }
    if (recheck.kind === 'unreadable') {
      return {
        state: 'unreadable',
        reason: recheck.reason ?? 'namespace-recheck',
        snapshot: {},
      };
    }
    return {
      state: 'absent',
      reason: 'namespace-missing',
      snapshot: { namespace: target.namespace },
    };
  }

  const secretAll = kubectlListNames(run, target, 'secret', undefined);
  if (secretAll.state !== 'ok') {
    return { state: secretAll.state, reason: secretAll.reason, snapshot: {} };
  }
  const secretLabel = kubectlListNames(run, target, 'secret', 'name=redis');
  if (secretLabel.state !== 'ok') {
    return {
      state: secretLabel.state,
      reason: secretLabel.reason,
      snapshot: {},
    };
  }
  const configAll = kubectlListNames(run, target, 'configmap', undefined);
  if (configAll.state !== 'ok') {
    return { state: configAll.state, reason: configAll.reason, snapshot: {} };
  }
  const configLabel = kubectlListNames(run, target, 'configmap', 'name=redis');
  if (configLabel.state !== 'ok') {
    return {
      state: configLabel.state,
      reason: configLabel.reason,
      snapshot: {},
    };
  }

  const helmList = fetchHelmList(run, target);
  if (helmList.state !== 'ok') {
    return { state: helmList.state, reason: helmList.reason, snapshot: {} };
  }

  const secretNames = new Set([...secretAll.names, ...secretLabel.names]);
  /** @type {string[]} */
  const secretCandidates = [];
  for (const name of secretNames) {
    const fromLabel = secretLabel.names.includes(name);
    if (isSecretCandidateName(name, fromLabel)) {
      secretCandidates.push(name);
    }
  }

  const configNames = new Set([...configAll.names, ...configLabel.names]);
  /** @type {string[]} */
  const configMapCandidates = [];
  for (const name of configNames) {
    const fromLabel = configLabel.names.includes(name);
    if (isConfigMapCandidateName(name, fromLabel)) {
      configMapCandidates.push(name);
    }
  }

  const deployment = readDeploymentSelectors(run, target);
  if (deployment.state === 'unreadable') {
    return { state: 'unreadable', reason: deployment.reason, snapshot: {} };
  }
  const service = readServiceShape(run, target);
  if (service.state === 'unreadable') {
    return { state: 'unreadable', reason: service.reason, snapshot: {} };
  }
  const configMapPresence = readObjectPresence(
    run,
    target,
    'configmap',
    RESERVED_CONFIGMAP,
  );
  if (configMapPresence.state === 'unreadable') {
    return {
      state: 'unreadable',
      reason: configMapPresence.reason,
      snapshot: {},
    };
  }
  const endpoints = readEndpointsPresence(run, target);
  if (endpoints.state === 'unreadable') {
    return {
      state: 'unreadable',
      reason: endpoints.reason,
      snapshot: {},
    };
  }

  /** @type {Record<string, string>} */
  let configMapLabels = {};
  if (configMapPresence.state === 'present') {
    const configMeta = readObjectMeta(
      run,
      target,
      'configmap',
      RESERVED_CONFIGMAP,
    );
    if (configMeta.state !== 'ok') {
      return {
        state: 'unreadable',
        reason: configMeta.reason,
        snapshot: {},
      };
    }
    configMapLabels = configMeta.labels;
  }

  const hasReservedLive =
    deployment.state === 'present' ||
    service.state === 'present' ||
    configMapPresence.state === 'present';

  const snapshot = {
    reservedNames: {
      deployment: RESERVED_DEPLOYMENT,
      service: RESERVED_SERVICE,
      configMap: RESERVED_CONFIGMAP,
    },
    selectors: {
      old: { app: 'redis' },
      new: {
        'app.kubernetes.io/name': 'redis',
        'app.kubernetes.io/instance': 'redis',
      },
    },
    live: {
      deployment: deployment.state === 'present' ? deployment : null,
      service: service.state === 'present' ? service : null,
      configMap:
        configMapPresence.state === 'present'
          ? { labels: configMapLabels }
          : null,
    },
    endpoints: { present: endpoints.state === 'present' },
    storage: {
      secretCandidates: [...secretCandidates],
      configMapCandidates: [...configMapCandidates],
    },
    nativeReleaseRecords: helmList.rows,
    fetchedManifest: null,
    fetchedValues: null,
  };

  const nativeRows = helmList.rows;

  if (configMapCandidates.length > 0) {
    const hasHelmNameLabel = configMapCandidates.some((name) =>
      configLabel.names.includes(name),
    );
    return {
      state: 'partial',
      reason: hasHelmNameLabel ? 'unsupported-driver' : 'unsupported-driver',
      snapshot,
    };
  }

  const malformedSecrets = secretCandidates.filter(
    (name) =>
      name.startsWith(HELM_RELEASE_PREFIX) && name !== EXPECTED_RELEASE_SECRET,
  );
  if (malformedSecrets.length > 0) {
    return { state: 'partial', reason: 'malformed-record', snapshot };
  }

  const candidateSecrets = secretCandidates.length;
  const exactReleaseSecret = secretCandidates.includes(EXPECTED_RELEASE_SECRET);

  if (candidateSecrets > 0 && nativeRows.length === 0) {
    return { state: 'partial', reason: 'hidden-record', snapshot };
  }

  if (
    nativeRows.length !== 1 ||
    nativeRows[0].revision !== 1 ||
    nativeRows[0].status !== 'deployed'
  ) {
    if (nativeRows.length > 0 || candidateSecrets > 0) {
      return { state: 'partial', reason: 'unexpected-revision', snapshot };
    }
  }

  if (secretCandidates.length > 0) {
    for (const name of secretCandidates) {
      const meta = readObjectMeta(run, target, 'secret', name);
      if (meta.state !== 'ok') {
        return { state: 'unreadable', reason: meta.reason, snapshot };
      }
      const labels = meta.labels;
      const owner = labels.owner;
      const helmName = labels.name;
      const hasPrefix = name.startsWith(HELM_RELEASE_PREFIX);
      if (hasPrefix && helmName !== RELEASE_NAME) {
        return { state: 'partial', reason: 'key-label-mismatch', snapshot };
      }
      if (helmName === RELEASE_NAME && owner !== 'helm' && hasPrefix) {
        return { state: 'partial', reason: 'key-label-mismatch', snapshot };
      }
      if (
        secretLabel.names.includes(name) &&
        !hasPrefix &&
        helmName &&
        helmName !== RELEASE_NAME
      ) {
        return { state: 'partial', reason: 'key-label-mismatch', snapshot };
      }
    }
  }

  const reservedPresent = {
    deployment: deployment.state === 'present',
    service: service.state === 'present',
    configMap: configMapPresence.state === 'present',
  };

  for (const kind of ['deployment', 'service', 'configMap']) {
    if (!reservedPresent[kind]) {
      continue;
    }
    const labels =
      kind === 'deployment'
        ? deployment.labels
        : kind === 'service'
          ? service.labels
          : configMapLabels;
    if (labels[target.ownerKey] !== target.ownerValue) {
      return { state: 'foreign', reason: 'owner-mismatch', snapshot };
    }
  }

  const usesOldSelector =
    (deployment.state === 'present' &&
      deployment.selectors.app === 'redis' &&
      deployment.selectors['app.kubernetes.io/name'] == null) ||
    (service.state === 'present' &&
      service.selectors.app === 'redis' &&
      service.selectors['app.kubernetes.io/name'] == null);

  if (usesOldSelector && !exactReleaseSecret) {
    return { state: 'legacy', reason: 'old-selector', snapshot };
  }

  if (
    candidateSecrets === 0 &&
    configMapCandidates.length === 0 &&
    nativeRows.length === 0 &&
    !hasReservedLive
  ) {
    if (endpoints.state === 'present') {
      return { state: 'partial', reason: 'endpoint-residue', snapshot };
    }
    return { state: 'absent', reason: 'empty', snapshot };
  }

  const canProbeInstalled =
    exactReleaseSecret &&
    candidateSecrets === 1 &&
    configMapCandidates.length === 0 &&
    nativeRows.length === 1 &&
    nativeRows[0].revision === 1 &&
    nativeRows[0].status === 'deployed' &&
    reservedPresent.deployment &&
    reservedPresent.service &&
    reservedPresent.configMap;

  if (!canProbeInstalled) {
    const storageSaysRelease =
      exactReleaseSecret &&
      nativeRows.length === 1 &&
      nativeRows[0].status === 'deployed';
    const liveCount =
      Number(reservedPresent.deployment) +
      Number(reservedPresent.service) +
      Number(reservedPresent.configMap);
    if (storageSaysRelease && liveCount > 0 && liveCount < 3) {
      return { state: 'partial', reason: 'matching-orphan', snapshot };
    }
    if (candidateSecrets > 0 || nativeRows.length > 0) {
      return { state: 'partial', reason: 'unexpected-revision', snapshot };
    }
    return { state: 'partial', reason: 'matching-orphan', snapshot };
  }

  if (nativeRows[0].chart !== EXPECTED_CHART_ID) {
    return { state: 'drift', reason: 'manifest-mismatch', snapshot };
  }

  const helmPayload = fetchHelmManifestValues(run, target);
  if (helmPayload.state !== 'ok') {
    return { state: 'unreadable', reason: helmPayload.reason, snapshot };
  }

  let rendered;
  try {
    rendered = renderRedisChartForTarget(
      target.profileId,
      { namespace: target.namespace },
      run,
    );
  } catch {
    return { state: 'unreadable', reason: 'render-failed', snapshot };
  }

  const valuesEqual = isDeepStrictEqual(helmPayload.values, rendered.values);
  const manifestEqual = manifestsCompatible(helmPayload.manifestDocs, rendered);
  snapshot.fetchedManifest = helmPayload.manifest;
  snapshot.fetchedValues = helmPayload.values;

  const allReservedPresent =
    reservedPresent.deployment &&
    reservedPresent.service &&
    reservedPresent.configMap;

  if (!valuesEqual || !manifestEqual) {
    return { state: 'drift', reason: 'manifest-mismatch', snapshot };
  }

  if (!allReservedPresent) {
    return { state: 'drift', reason: 'manifest-mismatch', snapshot };
  }

  const deploymentSelectors = deployment.selectors;
  const newOk =
    deploymentSelectors['app.kubernetes.io/name'] === 'redis' &&
    deploymentSelectors['app.kubernetes.io/instance'] === 'redis';

  if (!newOk) {
    return { state: 'partial', reason: 'unexpected-revision', snapshot };
  }

  return { state: 'installed', reason: 'compatible', snapshot };
}
