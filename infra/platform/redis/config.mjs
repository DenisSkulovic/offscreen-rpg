import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { URL, fileURLToPath } from 'node:url';
import { parse, parseAllDocuments, stringify } from 'yaml';
import { runPlatformCommand } from '../common/commands.mjs';
import { readPlatformProfile } from '../common/profile.mjs';

const REDIS_MODULE_ROOT = fileURLToPath(new URL('./', import.meta.url));
const SOURCE_CHART_ROOT = join(REDIS_MODULE_ROOT, 'chart');
const HELM_TIMEOUT_MS = 30_000;
const REQUIRED_HELM_SHORT_VERSION = 'v3.22.1';
const RELEASE_NAME = 'redis';

/** Fault-only smoke image; rejected on ordinary render/install paths. */
export const FAULT_ONLY_REDIS_IMAGE =
  'docker.io/library/redis@sha256:0000000000000000000000000000000000000000000000000000000000000000';

/**
 * @param {unknown} image
 */
export function assertOrdinaryRedisImage(image) {
  if (image === FAULT_ONLY_REDIS_IMAGE) {
    throw new Error(
      'refused: fault-only redis image pin is not valid for ordinary render/install',
    );
  }
}

/** @typedef {'dev' | 'release'} RedisProfileId */

/** @typedef {(command: string, args: string[], options?: { input?: string, timeoutMs?: number }) => ReturnType<typeof runPlatformCommand>} PlatformRun */

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
    throw new Error('helm is not available');
  }
  const short = (result.stdout ?? '').trim().split(/\r?\n/)[0] ?? '';
  if (!short.startsWith(REQUIRED_HELM_SHORT_VERSION)) {
    throw new Error(`unsupported helm version: ${short || 'unknown'}`);
  }
  return short;
}

/** @param {RedisProfileId} profileId */
function profileValuesFileName(profileId) {
  return profileId === 'dev' ? 'development.yaml' : 'release.yaml';
}

/** Plain JSON clone. Chart values are YAML data, not host objects. */
function clonePlain(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * @param {Record<string, unknown>} base
 * @param {Record<string, unknown>} overlay
 */
function mergeHelmValues(base, overlay) {
  /** @param {unknown} left @param {unknown} right */
  function merge(left, right) {
    if (
      left &&
      right &&
      typeof left === 'object' &&
      typeof right === 'object' &&
      !Array.isArray(left) &&
      !Array.isArray(right)
    ) {
      /** @type {Record<string, unknown>} */
      const out = { .../** @type {Record<string, unknown>} */ (left) };
      for (const [key, value] of Object.entries(
        /** @type {Record<string, unknown>} */ (right),
      )) {
        out[key] = key in out ? merge(out[key], value) : clonePlain(value);
      }
      return out;
    }
    return clonePlain(right);
  }
  return /** @type {Record<string, unknown>} */ (merge(base, overlay));
}

/**
 * @param {Record<string, unknown>} merged
 */
function captureMergedValuesSnapshot(merged) {
  const owner = merged.owner;
  if (
    !owner ||
    typeof owner !== 'object' ||
    Array.isArray(owner) ||
    typeof (/** @type {{ key?: unknown, value?: unknown }} */ (owner).key) !==
      'string' ||
    typeof (/** @type {{ key?: unknown, value?: unknown }} */ (owner).value) !==
      'string'
  ) {
    throw new Error('merged redis values missing owner');
  }
  const redis = merged.redis;
  if (
    !redis ||
    typeof redis !== 'object' ||
    Array.isArray(redis) ||
    typeof (
      /** @type {{ maxmemoryMiB?: unknown, evictionPolicy?: unknown }} */ (
        redis
      ).maxmemoryMiB
    ) !== 'number' ||
    typeof (
      /** @type {{ maxmemoryMiB?: unknown, evictionPolicy?: unknown }} */ (
        redis
      ).evictionPolicy
    ) !== 'string'
  ) {
    throw new Error('merged redis values missing redis policy');
  }
  if (typeof merged.image !== 'string') {
    throw new Error('merged redis values missing image');
  }
  if (
    !merged.resources ||
    typeof merged.resources !== 'object' ||
    Array.isArray(merged.resources)
  ) {
    throw new Error('merged redis values missing resources');
  }
  return {
    image: merged.image,
    redis: {
      maxmemoryMiB: redis.maxmemoryMiB,
      evictionPolicy: redis.evictionPolicy,
    },
    resources: clonePlain(merged.resources),
    owner: {
      key: owner.key,
      value: owner.value,
    },
  };
}

/**
 * @param {string} chartRoot
 * @param {RedisProfileId} profileId
 */
function readMergedValuesData(chartRoot, profileId) {
  const base = parse(readFileSync(join(chartRoot, 'values.yaml'), 'utf8'));
  const overlay = parse(
    readFileSync(
      join(chartRoot, 'profiles', profileValuesFileName(profileId)),
      'utf8',
    ),
  );
  if (
    !base ||
    typeof base !== 'object' ||
    Array.isArray(base) ||
    !overlay ||
    typeof overlay !== 'object' ||
    Array.isArray(overlay)
  ) {
    throw new Error('redis chart values are malformed');
  }
  return mergeHelmValues(
    /** @type {Record<string, unknown>} */ (base),
    /** @type {Record<string, unknown>} */ (overlay),
  );
}

function readMergedValues(chartRoot, profileId) {
  const merged = readMergedValuesData(chartRoot, profileId);
  assertOrdinaryRedisImage(merged.image);
  captureMergedValuesSnapshot(merged);
  return clonePlain(merged);
}

/**
 * @param {PlatformRun} run
 */
function defaultHelmRun(command, args, options = {}) {
  assertRedisHelmRunnerEnv();
  if (command !== 'helm') {
    return runPlatformCommand(command, args, options);
  }
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

/**
 * @param {string} chartRoot
 * @param {RedisProfileId} profileId
 * @param {string} namespace
 */
function lintArgv(chartRoot, profileId, namespace) {
  return [
    'lint',
    chartRoot,
    '-f',
    join(chartRoot, 'values.yaml'),
    '-f',
    join(chartRoot, 'profiles', profileValuesFileName(profileId)),
    '--namespace',
    namespace,
  ];
}

/**
 * @param {string} chartRoot
 * @param {RedisProfileId} profileId
 * @param {string} namespace
 */
function templateArgv(chartRoot, profileId, namespace) {
  return [
    'template',
    RELEASE_NAME,
    chartRoot,
    '--namespace',
    namespace,
    '-f',
    join(chartRoot, 'values.yaml'),
    '-f',
    join(chartRoot, 'profiles', profileValuesFileName(profileId)),
  ];
}

/**
 * @param {PlatformRun} run
 * @param {RedisProfileId} profileId
 * @param {string} namespace
 */
export function prepareValidatedChartCopy(run, profileId, namespace) {
  const chartRoot = mkdtempSync(join(tmpdir(), 'offscreen-redis-chart-'));
  try {
    cpSync(SOURCE_CHART_ROOT, chartRoot, { recursive: true });
  } catch (error) {
    rmSync(chartRoot, { recursive: true, force: true });
    throw error;
  }
  const lint = run('helm', lintArgv(chartRoot, profileId, namespace), {
    timeoutMs: HELM_TIMEOUT_MS,
  });
  if (!lint.ok || lint.timedOut || lint.missing) {
    rmSync(chartRoot, { recursive: true, force: true });
    const detail = (lint.stderr || lint.stdout || 'helm lint failed').trim();
    throw new Error(`redis chart validation failed: ${detail}`);
  }
  assertOrdinaryRedisImage(readMergedValues(chartRoot, profileId).image);
  return {
    chartRoot,
    dispose() {
      rmSync(chartRoot, { recursive: true, force: true });
    },
  };
}

/**
 * Smoke-failure only: validated chart copy with fault image digest substituted.
 *
 * @param {PlatformRun} run
 * @param {RedisProfileId} profileId
 * @param {string} namespace
 */
export function prepareFaultValidatedChartCopy(run, profileId, namespace) {
  const chartRoot = mkdtempSync(join(tmpdir(), 'offscreen-redis-fault-chart-'));
  try {
    cpSync(SOURCE_CHART_ROOT, chartRoot, { recursive: true });
  } catch (error) {
    rmSync(chartRoot, { recursive: true, force: true });
    throw error;
  }

  const valuesPath = join(chartRoot, 'values.yaml');
  const baseValues = parse(readFileSync(valuesPath, 'utf8'));
  if (
    !baseValues ||
    typeof baseValues !== 'object' ||
    Array.isArray(baseValues)
  ) {
    rmSync(chartRoot, { recursive: true, force: true });
    throw new Error('redis chart values are malformed');
  }
  /** @type {Record<string, unknown>} */
  const valuesRecord = /** @type {Record<string, unknown>} */ (baseValues);
  valuesRecord.image = FAULT_ONLY_REDIS_IMAGE;
  writeFileSync(valuesPath, stringify(valuesRecord));

  const merged = readMergedValuesData(chartRoot, profileId);
  if (merged.image !== FAULT_ONLY_REDIS_IMAGE) {
    rmSync(chartRoot, { recursive: true, force: true });
    throw new Error(
      'refused: fault chart merge did not retain fault image pin',
    );
  }
  captureMergedValuesSnapshot(merged);

  const lint = run('helm', lintArgv(chartRoot, profileId, namespace), {
    timeoutMs: HELM_TIMEOUT_MS,
  });
  if (!lint.ok || lint.timedOut || lint.missing) {
    rmSync(chartRoot, { recursive: true, force: true });
    const detail = (lint.stderr || lint.stdout || 'helm lint failed').trim();
    throw new Error(`redis fault chart validation failed: ${detail}`);
  }

  const rendered = run('helm', templateArgv(chartRoot, profileId, namespace), {
    timeoutMs: HELM_TIMEOUT_MS,
  });
  if (!rendered.ok || rendered.timedOut || rendered.missing) {
    rmSync(chartRoot, { recursive: true, force: true });
    const detail = (
      rendered.stderr ||
      rendered.stdout ||
      'helm template failed'
    ).trim();
    throw new Error(`redis fault helm template failed: ${detail}`);
  }

  const documents = parseRenderedRedisDocuments(rendered.stdout);
  const containers =
    /** @type {{ spec?: { template?: { spec?: { containers?: { image?: string }[] } } } }} */ (
      documents.deployment
    ).spec?.template?.spec?.containers;
  const image = containers?.[0]?.image;
  if (image !== FAULT_ONLY_REDIS_IMAGE) {
    rmSync(chartRoot, { recursive: true, force: true });
    throw new Error('refused: fault chart render image mismatch');
  }

  return {
    chartRoot,
    dispose() {
      rmSync(chartRoot, { recursive: true, force: true });
    },
  };
}

/**
 * @param {string} output
 */
function parseRenderedRedisDocuments(output) {
  if (!output.trim()) {
    throw new Error('helm template produced empty output');
  }
  /** @type {import('yaml').Document<unknown>[]} */
  let documents;
  try {
    documents = parseAllDocuments(output);
  } catch {
    throw new Error('malformed helm template output');
  }
  /** @type {Record<string, unknown>[]} */
  const objects = [];
  for (const document of documents) {
    if (document.errors.length > 0) {
      throw new Error('malformed helm template output');
    }
    const value = document.toJS();
    if (value != null) {
      objects.push(value);
    }
  }
  if (objects.length !== 3) {
    throw new Error('redis render must produce exactly three documents');
  }
  /** @type {Record<string, Record<string, unknown>>} */
  const byKind = {};
  for (const object of objects) {
    const kind = object.kind;
    const name = /** @type {{ metadata?: { name?: string } }} */ (object)
      .metadata?.name;
    if (typeof kind !== 'string' || typeof name !== 'string') {
      throw new Error('malformed helm template output');
    }
    byKind[`${kind}/${name}`] = object;
  }
  const configMap = byKind['ConfigMap/redis-config'];
  const deployment = byKind['Deployment/redis'];
  const service = byKind['Service/redis'];
  if (!configMap || !deployment || !service) {
    throw new Error('redis render missing required documents');
  }
  return { configMap, deployment, service };
}

/**
 * @param {RedisProfileId} profileId
 * @param {{ namespace: string }} target
 * @param {PlatformRun} run
 */
export function renderRedisChartForTarget(profileId, target, run) {
  if (profileId !== 'dev' && profileId !== 'release') {
    throw new Error(`unsupported platform profile: ${profileId}`);
  }
  if (typeof target.namespace !== 'string' || target.namespace.length === 0) {
    throw new Error('redis render target namespace is required');
  }
  assertRedisHelmRunnerEnv();
  assertHelmVersion(run);
  const prepared = prepareValidatedChartCopy(run, profileId, target.namespace);
  try {
    const rendered = run(
      'helm',
      templateArgv(prepared.chartRoot, profileId, target.namespace),
      { timeoutMs: HELM_TIMEOUT_MS },
    );
    if (!rendered.ok || rendered.timedOut || rendered.missing) {
      const detail = (
        rendered.stderr ||
        rendered.stdout ||
        'helm template failed'
      ).trim();
      throw new Error(`redis helm template failed: ${detail}`);
    }
    const documents = parseRenderedRedisDocuments(rendered.stdout);
    const values = readMergedValues(prepared.chartRoot, profileId);
    return { ...documents, values };
  } finally {
    prepared.dispose();
  }
}

/**
 * @param {RedisProfileId} profileId
 * @param {{ run?: PlatformRun }} [deps]
 */
export function lintRedisChart(profileId, { run = defaultHelmRun } = {}) {
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
  assertRedisHelmRunnerEnv();
  assertHelmVersion(run);
  const prepared = prepareValidatedChartCopy(run, profileId, namespace);
  prepared.dispose();
  return { ok: true };
}

/**
 * @param {RedisProfileId} profileId
 * @param {{ run?: PlatformRun }} [deps]
 */
export function renderRedisChart(profileId, { run = defaultHelmRun } = {}) {
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
  return renderRedisChartForTarget(profileId, { namespace }, run);
}
