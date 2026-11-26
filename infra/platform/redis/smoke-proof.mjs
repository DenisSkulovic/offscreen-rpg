import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout } from 'node:timers';
import { URL, fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';

import { runPlatformCommand } from '../common/commands.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import { observeInventory } from './inventory.mjs';
import {
  parseInfoServerReply,
  parsePingReply,
} from './readiness.mjs';

const REDIS_MODULE_ROOT = fileURLToPath(new URL('./', import.meta.url));
const CLIENT_TEMPLATE_PATH = join(
  REDIS_MODULE_ROOT,
  '../../verification/smoke/redis/client.yaml',
);

export const SMOKE_NAMESPACE_PATTERN = /^offscreen-redis-proof-[0-9a-f]{32}$/;
const EXPECTED_HELM_REVISIONS = 1;
const CLIENT_POD_NAME = 'redis-client';
const REDIS_CONTAINER = 'redis';
const DEPLOYMENT_NAME = 'redis';
const SERVICE_NAME = 'redis';
const CONFIGMAP_NAME = 'redis-config';
const HELM_RELEASE_SECRET = 'sh.helm.release.v1.redis.v1';

export const TTL_KEY = 'offscreen:redis-proof:ttl';
export const RESTART_MARKER_KEY = 'offscreen:redis-proof:restart';

const TTL_SECONDS = 4;
const TTL_POLL_MS = 250;
const TTL_POLL_BUDGET_MS = 10_000;
const ENDPOINT_CLEAR_MS = 60_000;
const ROLLOUT_WAIT_MS = 180_000;
const KUBECTL_READ_MS = 15_000;
const REDIS_EXEC_MS = 15_000;
const CLEANUP_RESERVE_MS = 180_000;

/** @type {Set<string>} */
export const CANONICAL_FLUSH_REFUSED_NAMESPACES = new Set([
  'lab-a',
  'offscreen-dev-redis',
]);

const DOCUMENTED_NAMESPACE_DEFAULTS = new Set([
  'configmap/kube-root-ca.crt',
  'serviceaccount/default',
]);

const OWNED_STATIC_OBJECTS = [
  `deployment/${DEPLOYMENT_NAME}`,
  `service/${SERVICE_NAME}`,
  `configmap/${CONFIGMAP_NAME}`,
  `pod/${CLIENT_POD_NAME}`,
  `secret/${HELM_RELEASE_SECRET}`,
];

/**
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 * @param {string} verb
 */
function kubectlScopeArgs(target, verb) {
  return ['--context', target.contextName, '-n', target.namespace, verb];
}

/**
 * @param {string} namespace
 */
export function refuseFlushallUnlessProofNamespace(namespace) {
  if (CANONICAL_FLUSH_REFUSED_NAMESPACES.has(namespace)) {
    return { ok: false, reason: 'flushall-canonical-refused' };
  }
  if (!SMOKE_NAMESPACE_PATTERN.test(namespace)) {
    return { ok: false, reason: 'flushall-namespace-refused' };
  }
  return { ok: true };
}

/**
 * @param {string} stdout
 */
export function normalizeRedisStdout(stdout) {
  let text = String(stdout ?? '').replace(/\r\n/g, '\n');
  if (text.endsWith('\n')) {
    text = text.slice(0, -1);
  }
  return text;
}

/**
 * @param {string} stdout
 */
export function parseRedisOkReply(stdout) {
  const text = normalizeRedisStdout(stdout);
  if (text.includes('ERR') || text.includes('NOAUTH')) {
    return { ok: false, reason: 'redis-error' };
  }
  if (text === 'OK') {
    return { ok: true };
  }
  return { ok: false, reason: 'redis-ok-shape' };
}

/**
 * @param {string} stdout
 */
export function parseRedisBulkReply(stdout) {
  const text = normalizeRedisStdout(stdout);
  if (text.includes('ERR') || text.includes('NOAUTH')) {
    return { ok: false, reason: 'redis-error' };
  }
  return { ok: true, value: text };
}

/**
 * @param {string} stdout
 */
export function parseTtlReply(stdout) {
  const text = normalizeRedisStdout(stdout);
  if (text.includes('ERR') || text.includes('NOAUTH')) {
    return { ok: false, reason: 'redis-error' };
  }
  if (!/^-?\d+$/.test(text)) {
    return { ok: false, reason: 'ttl-shape' };
  }
  const value = Number(text);
  if (value < 1 || value > TTL_SECONDS) {
    return { ok: false, reason: 'ttl-range' };
  }
  return { ok: true, value };
}

/**
 * @param {string} stdout
 */
export function parseExistsReply(stdout) {
  const text = normalizeRedisStdout(stdout);
  if (text.includes('ERR') || text.includes('NOAUTH')) {
    return { ok: false, reason: 'redis-error' };
  }
  if (text !== '0' && text !== '1') {
    return { ok: false, reason: 'exists-shape' };
  }
  return { ok: true, value: Number(text) };
}

/**
 * @param {ReturnType<typeof runPlatformCommand>} execResult
 * @param {string} stdout
 */
export function classifyScaleZeroOutage(execResult, stdout) {
  const stderr = String(execResult.stderr ?? '');
  const combined = `${stderr}\n${stdout}`;
  if (
    combined.includes('Connection refused') ||
    combined.includes('Could not connect') ||
    combined.includes('Name or service not known') ||
    combined.includes('timed out')
  ) {
    return { kind: 'transport-outage', reason: 'ping-transport-failure' };
  }
  if (execResult.missing || execResult.timedOut) {
    return { kind: 'api-exec-failure', reason: 'exec-transport' };
  }
  if (!execResult.ok) {
    return { kind: 'api-exec-failure', reason: 'exec-exit' };
  }
  if (stderr.trim().length > 0) {
    return { kind: 'api-exec-failure', reason: 'exec-stderr' };
  }
  const ping = parsePingReply(stdout);
  if (ping.ok) {
    return { kind: 'unexpected-pong', reason: 'still-reachable' };
  }
  return { kind: 'ambiguous', reason: ping.reason ?? 'ping-shape' };
}

/**
 * @param {string[]} listed
 */
export function validateCleanupInventory(listed) {
  /** @type {string[]} */
  const normalized = [];
  for (const line of listed) {
    const trimmed = String(line ?? '').trim();
    if (trimmed.length === 0) {
      continue;
    }
    normalized.push(trimmed);
  }

  /** @type {string[]} */
  const unexpected = [];
  /** @type {Set<string>} */
  const seen = new Set();
  let redisServerPodCount = 0;

  for (const item of normalized) {
    if (seen.has(item)) {
      continue;
    }
    seen.add(item);

    if (DOCUMENTED_NAMESPACE_DEFAULTS.has(item)) {
      continue;
    }
    if (OWNED_STATIC_OBJECTS.includes(item)) {
      continue;
    }
    if (item.startsWith('event/')) {
      continue;
    }
    if (item.startsWith('pod/') && item !== `pod/${CLIENT_POD_NAME}`) {
      redisServerPodCount += 1;
      if (redisServerPodCount > 1) {
        unexpected.push(item);
      }
      continue;
    }
    unexpected.push(item);
  }

  if (unexpected.length > 0) {
    return { ok: false, reason: 'unexpected-inventory', unexpected };
  }
  return { ok: true };
}

/**
 * @param {string} namespace
 */
export function renderClientPodManifest(namespace) {
  const template = parse(readFileSync(CLIENT_TEMPLATE_PATH, 'utf8'));
  if (!template || typeof template !== 'object') {
    throw new Error('client template malformed');
  }
  template.metadata = {
    ...(template.metadata ?? {}),
    name: CLIENT_POD_NAME,
    namespace,
  };
  return stringify(template);
}

/**
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 * @param {string} podName
 * @param {string} host
 * @param {string[]} redisCliArgs
 * @param {(command: string, args: string[], options?: object) => ReturnType<typeof runPlatformCommand>} runner
 * @param {number} timeoutMs
 */
function execClientRedisCli(target, podName, host, redisCliArgs, runner, timeoutMs) {
  return runner(
    'kubectl',
    [
      ...kubectlScopeArgs(target, 'exec'),
      podName,
      '-c',
      REDIS_CONTAINER,
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
 * @param {string[]} redisCliArgs
 * @param {typeof execClientRedisCli extends (...args: infer A) => unknown ? (target: A[0], podName: string, host: string, redisCliArgs: string[], runner: A[4], timeoutMs: number) => ReturnType<typeof runPlatformCommand> : never} runner
 */
function execServerRedisCli(target, podName, redisCliArgs, runner) {
  const host = '127.0.0.1';
  return execClientRedisCli(
    target,
    podName,
    host,
    redisCliArgs,
    runner,
    REDIS_EXEC_MS,
  );
}

/**
 * @param {(command: string, args: string[], options?: object) => ReturnType<typeof runPlatformCommand>} runner
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 */
async function readDeploymentIdentity(runner, target) {
  const result = runner('kubectl', [
    ...kubectlScopeArgs(target, 'get'),
    'deployment',
    DEPLOYMENT_NAME,
    '-o',
    'json',
  ], { timeoutMs: KUBECTL_READ_MS });
  const resolved = await Promise.resolve(result);
  if (!resolved.ok) {
    return { ok: false, reason: 'deployment-get-failed' };
  }
  let body;
  try {
    body = JSON.parse(resolved.stdout ?? '');
  } catch {
    return { ok: false, reason: 'deployment-json' };
  }
  const uid = body?.metadata?.uid;
  const resourceVersion = body?.metadata?.resourceVersion;
  if (typeof uid !== 'string' || typeof resourceVersion !== 'string') {
    return { ok: false, reason: 'deployment-identity' };
  }
  return { ok: true, uid, resourceVersion, replicas: body?.spec?.replicas ?? null };
}

/**
 * @param {(command: string, args: string[], options?: object) => ReturnType<typeof runPlatformCommand>} runner
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 * @param {string} kind
 * @param {string} name
 */
async function readObjectIdentity(runner, target, kind, name) {
  const result = runner('kubectl', [
    ...kubectlScopeArgs(target, 'get'),
    kind,
    name,
    '-o',
    'json',
  ], { timeoutMs: KUBECTL_READ_MS });
  const resolved = await Promise.resolve(result);
  if (!resolved.ok) {
    return { ok: false, reason: `${kind}-get-failed` };
  }
  let body;
  try {
    body = JSON.parse(resolved.stdout ?? '');
  } catch {
    return { ok: false, reason: `${kind}-json` };
  }
  const uid = body?.metadata?.uid;
  const resourceVersion = body?.metadata?.resourceVersion;
  if (typeof uid !== 'string' || typeof resourceVersion !== 'string') {
    return { ok: false, reason: `${kind}-identity` };
  }
  return { ok: true, uid, resourceVersion };
}

/**
 * @param {(command: string, args: string[], options?: object) => ReturnType<typeof runPlatformCommand>} runner
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 */
async function listRedisServerPods(runner, target) {
  const result = runner('kubectl', [
    ...kubectlScopeArgs(target, 'get'),
    'pods',
    '-l',
    'app.kubernetes.io/name=redis,app.kubernetes.io/instance=redis',
    '-o',
    'json',
  ], { timeoutMs: KUBECTL_READ_MS });
  const resolved = await Promise.resolve(result);
  if (!resolved.ok) {
    return { ok: false, reason: 'pods-list-failed' };
  }
  let body;
  try {
    body = JSON.parse(resolved.stdout ?? '');
  } catch {
    return { ok: false, reason: 'pods-json' };
  }
  const items = Array.isArray(body?.items) ? body.items : [];
  return {
    ok: true,
    pods: items.map((pod) => ({
      name: pod?.metadata?.name ?? '',
      uid: pod?.metadata?.uid ?? '',
    })),
  };
}

/**
 * @param {(command: string, args: string[], options?: object) => ReturnType<typeof runPlatformCommand>} runner
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 * @param {(pods: { name: string, uid: string }[]) => boolean} predicate
 * @param {number} budgetMs
 */
async function waitForPods(runner, target, predicate, budgetMs) {
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) {
    const listed = await listRedisServerPods(runner, target);
    if (!listed.ok) {
      return { ok: false, reason: listed.reason ?? 'pods-wait' };
    }
    if (predicate(listed.pods)) {
      return { ok: true, pods: listed.pods };
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return { ok: false, reason: 'pods-wait-timeout' };
}

/**
 * @param {(command: string, args: string[], options?: object) => ReturnType<typeof runPlatformCommand>} runner
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 */
async function readServerRunId(runner, target, podName) {
  const result = execServerRedisCli(
    target,
    podName,
    ['INFO', 'server'],
    runner,
  );
  const resolved = await Promise.resolve(result);
  if (!resolved.ok || (resolved.stderr ?? '').trim().length > 0) {
    return { ok: false, reason: 'info-exec' };
  }
  const parsed = parseInfoServerReply(resolved.stdout ?? '');
  if (!parsed.ok) {
    return { ok: false, reason: parsed.reason ?? 'info-parse' };
  }
  return { ok: true, runId: parsed.runId ?? '' };
}

/**
 * @param {(command: string, args: string[], options?: object) => ReturnType<typeof runPlatformCommand>} runner
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 */
async function readHelmRevision(runner, target) {
  const result = runner(
    'helm',
    [
      'history',
      'redis',
      '--max',
      '2',
      '-n',
      target.namespace,
      '--kube-context',
      target.contextName,
      '-o',
      'json',
    ],
    { timeoutMs: KUBECTL_READ_MS },
  );
  const resolved = await Promise.resolve(result);
  if (!resolved.ok) {
    return { ok: false, reason: 'helm-history' };
  }
  let rows;
  try {
    rows = JSON.parse(resolved.stdout ?? '[]');
  } catch {
    return { ok: false, reason: 'helm-history-json' };
  }
  if (!Array.isArray(rows)) {
    return { ok: false, reason: 'helm-history-shape' };
  }
  if (rows.length !== EXPECTED_HELM_REVISIONS) {
    return { ok: false, reason: 'helm-revision-count' };
  }
  const revision = rows[0]?.revision;
  if (revision !== 1) {
    return { ok: false, reason: 'helm-revision-value' };
  }
  return { ok: true };
}

/**
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 * @param {'dev' | 'release'} profileId
 * @param {{
 *   run?: (command: string, args: string[], options?: object) => ReturnType<typeof runPlatformCommand>,
 *   runWrite?: (command: 'helm' | 'kubectl', args: string[], options?: object) => Promise<ReturnType<typeof runPlatformCommand>> | ReturnType<typeof runPlatformCommand>,
 *   remainingMs?: () => number,
 *   observeInventory?: typeof observeInventory,
 * }} deps
 */
export async function runRedisSmokeProof(target, profileId, deps = {}) {
  readPlatformProfile(profileId);
  if (!SMOKE_NAMESPACE_PATTERN.test(target.namespace)) {
    return { ok: false, detail: 'proof-namespace-invalid', state: 'refused' };
  }

  const readRun = deps.run ?? runPlatformCommand;
  const writeRun = deps.runWrite;
  if (typeof writeRun !== 'function') {
    return { ok: false, detail: 'proof-write-runner-missing', state: 'refused' };
  }

  const remainingMs = deps.remainingMs ?? (() => Number.POSITIVE_INFINITY);
  const serviceHost = `redis.${target.namespace}.svc`;

  const observeInventoryFn = deps.observeInventory ?? observeInventory;
  const inventory = observeInventoryFn(target, { run: readRun });
  if (inventory.state !== 'installed') {
    return { ok: false, detail: 'proof-inventory-not-installed', state: 'refused' };
  }

  const redisPods = await listRedisServerPods(readRun, target);
  if (!redisPods.ok || redisPods.pods.length !== 1) {
    return { ok: false, detail: 'proof-redis-pod-count', state: 'refused' };
  }
  const serverPod = redisPods.pods[0].name;

  const preDeployment = await readDeploymentIdentity(readRun, target);
  const preService = await readObjectIdentity(readRun, target, 'service', SERVICE_NAME);
  const preConfigMap = await readObjectIdentity(
    readRun,
    target,
    'configmap',
    CONFIGMAP_NAME,
  );
  if (!preDeployment.ok || !preService.ok || !preConfigMap.ok) {
    return { ok: false, detail: 'proof-identity-read', state: 'refused' };
  }

  const clientManifest = renderClientPodManifest(target.namespace);
  const createClient = await writeRun(
    'kubectl',
    [...kubectlScopeArgs(target, 'create'), '-f', '-', '-o', 'json'],
    { input: clientManifest, timeoutMs: KUBECTL_READ_MS },
  );
  if (!createClient.ok || createClient.status == null || createClient.timedOut) {
    return { ok: false, detail: 'client-create-unclear', state: 'refused' };
  }
  let clientBody;
  try {
    clientBody = JSON.parse(createClient.stdout ?? '');
  } catch {
    return { ok: false, detail: 'client-create-json', state: 'refused' };
  }
  const clientUid = clientBody?.metadata?.uid;
  if (typeof clientUid !== 'string') {
    return { ok: false, detail: 'client-uid-missing', state: 'refused' };
  }

  const clientList = await readRun('kubectl', [
    ...kubectlScopeArgs(target, 'get'),
    'pods',
    '-l',
    'app=redis-client',
    '-o',
    'name',
  ], { timeoutMs: KUBECTL_READ_MS });
  const clientLines = (clientList.stdout ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (!clientList.ok || clientLines.length !== 1) {
    return { ok: false, detail: 'client-count-refused', state: 'refused' };
  }

  const ping0 = await execClientRedisCli(
    target,
    CLIENT_POD_NAME,
    serviceHost,
    ['PING'],
    readRun,
    REDIS_EXEC_MS,
  );
  const ping0Parsed = parsePingReply(ping0.stdout ?? '');
  if (!ping0.ok || !ping0Parsed.ok) {
    return { ok: false, detail: 'proof-initial-ping', state: 'refused' };
  }

  const preRunId = await readServerRunId(readRun, target, serverPod);
  if (!preRunId.ok) {
    return { ok: false, detail: 'proof-initial-run-id', state: 'refused' };
  }

  const ttlValue = `proof-${clientUid.slice(0, 8)}`;
  const setTtl = await execClientRedisCli(
    target,
    CLIENT_POD_NAME,
    serviceHost,
    ['SET', TTL_KEY, ttlValue, 'EX', String(TTL_SECONDS)],
    readRun,
    REDIS_EXEC_MS,
  );
  const setParsed = parseRedisOkReply(setTtl.stdout ?? '');
  if (!setTtl.ok || !setParsed.ok) {
    return { ok: false, detail: 'proof-set-ttl', state: 'refused' };
  }

  const getTtl = await execClientRedisCli(
    target,
    CLIENT_POD_NAME,
    serviceHost,
    ['GET', TTL_KEY],
    readRun,
    REDIS_EXEC_MS,
  );
  const getParsed = parseRedisBulkReply(getTtl.stdout ?? '');
  if (!getTtl.ok || !getParsed.ok || getParsed.value !== ttlValue) {
    return { ok: false, detail: 'proof-get-ttl', state: 'refused' };
  }

  const ttlReply = await execClientRedisCli(
    target,
    CLIENT_POD_NAME,
    serviceHost,
    ['TTL', TTL_KEY],
    readRun,
    REDIS_EXEC_MS,
  );
  const ttlParsed = parseTtlReply(ttlReply.stdout ?? '');
  if (!ttlReply.ok || !ttlParsed.ok) {
    return { ok: false, detail: 'proof-ttl-range', state: 'refused' };
  }

  const existsDeadline = Date.now() + TTL_POLL_BUDGET_MS;
  let expired = false;
  while (Date.now() < existsDeadline) {
    const exists = await execClientRedisCli(
      target,
      CLIENT_POD_NAME,
      serviceHost,
      ['EXISTS', TTL_KEY],
      readRun,
      REDIS_EXEC_MS,
    );
    const existsParsed = parseExistsReply(exists.stdout ?? '');
    if (!exists.ok || !existsParsed.ok) {
      return { ok: false, detail: 'proof-exists-error', state: 'refused' };
    }
    if (existsParsed.value === 0) {
      expired = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, TTL_POLL_MS));
  }
  if (!expired) {
    return { ok: false, detail: 'proof-ttl-expiry', state: 'refused' };
  }

  const flushRefusal = refuseFlushallUnlessProofNamespace(target.namespace);
  if (!flushRefusal.ok) {
    return { ok: false, detail: flushRefusal.reason ?? 'flush-refused', state: 'refused' };
  }
  const runIdBeforeFlush = await readServerRunId(readRun, target, serverPod);
  if (!runIdBeforeFlush.ok || runIdBeforeFlush.runId !== preRunId.runId) {
    return { ok: false, detail: 'proof-flush-run-id', state: 'refused' };
  }

  const flush = await execServerRedisCli(
    target,
    serverPod,
    ['FLUSHALL'],
    readRun,
  );
  const flushParsed = parseRedisOkReply(flush.stdout ?? '');
  if (!flush.ok || !flushParsed.ok) {
    return { ok: false, detail: 'proof-flushall', state: 'refused' };
  }

  const markerSet = await execClientRedisCli(
    target,
    CLIENT_POD_NAME,
    serviceHost,
    ['SET', RESTART_MARKER_KEY, 'marker'],
    readRun,
    REDIS_EXEC_MS,
  );
  const markerParsed = parseRedisOkReply(markerSet.stdout ?? '');
  if (!markerSet.ok || !markerParsed.ok) {
    return { ok: false, detail: 'proof-restart-marker-set', state: 'refused' };
  }

  const outageDeployment = await readDeploymentIdentity(readRun, target);
  if (!outageDeployment.ok || outageDeployment.uid !== preDeployment.uid) {
    return { ok: false, detail: 'proof-scale-identity', state: 'refused' };
  }

  const scaleDown = await writeRun(
    'kubectl',
    [
      ...kubectlScopeArgs(target, 'scale'),
      'deployment',
      DEPLOYMENT_NAME,
      `--current-replicas=1`,
      `--resource-version=${outageDeployment.resourceVersion}`,
      '--replicas=0',
    ],
    { timeoutMs: KUBECTL_READ_MS },
  );
  if (!scaleDown.ok || scaleDown.status == null || scaleDown.timedOut) {
    return { ok: false, detail: 'proof-scale-down-unclear', state: 'refused' };
  }

  const noPods = await waitForPods(
    readRun,
    target,
    (pods) => pods.length === 0,
    ENDPOINT_CLEAR_MS,
  );
  if (!noPods.ok) {
    return { ok: false, detail: 'proof-scale-zero-pods', state: 'refused' };
  }

  const outagePing = await execClientRedisCli(
    target,
    CLIENT_POD_NAME,
    serviceHost,
    ['PING'],
    readRun,
    REDIS_EXEC_MS,
  );
  const outageClass = classifyScaleZeroOutage(outagePing, outagePing.stdout ?? '');
  if (outageClass.kind === 'api-exec-failure') {
    return { ok: false, detail: 'proof-outage-exec-not-transport', state: 'refused' };
  }
  if (outageClass.kind !== 'transport-outage') {
    return {
      ok: false,
      detail: outageClass.reason ?? 'proof-outage-not-observed',
      state: 'refused',
    };
  }

  const freshDeployment = await readDeploymentIdentity(readRun, target);
  if (
    !freshDeployment.ok ||
    freshDeployment.uid !== preDeployment.uid ||
    freshDeployment.replicas !== 0
  ) {
    return { ok: false, detail: 'proof-scale-zero-deployment', state: 'refused' };
  }

  const scaleUp = await writeRun(
    'kubectl',
    [
      ...kubectlScopeArgs(target, 'scale'),
      'deployment',
      DEPLOYMENT_NAME,
      '--current-replicas=0',
      `--resource-version=${freshDeployment.resourceVersion}`,
      '--replicas=1',
    ],
    { timeoutMs: KUBECTL_READ_MS },
  );
  if (!scaleUp.ok || scaleUp.status == null || scaleUp.timedOut) {
    return { ok: false, detail: 'proof-scale-up-unclear', state: 'refused' };
  }

  const onePod = await waitForPods(
    readRun,
    target,
    (pods) => pods.length === 1,
    ROLLOUT_WAIT_MS,
  );
  if (!onePod.ok) {
    return { ok: false, detail: 'proof-scale-up-pods', state: 'refused' };
  }
  const newServerPod = onePod.pods[0].name;
  if (onePod.pods[0].uid === redisPods.pods[0].uid) {
    return { ok: false, detail: 'proof-pod-uid-unchanged', state: 'refused' };
  }

  const postService = await readObjectIdentity(readRun, target, 'service', SERVICE_NAME);
  const postConfigMap = await readObjectIdentity(
    readRun,
    target,
    'configmap',
    CONFIGMAP_NAME,
  );
  const postDeployment = await readDeploymentIdentity(readRun, target);
  if (
    !postService.ok ||
    !postConfigMap.ok ||
    !postDeployment.ok ||
    postService.uid !== preService.uid ||
    postConfigMap.uid !== preConfigMap.uid ||
    postDeployment.uid !== preDeployment.uid
  ) {
    return { ok: false, detail: 'proof-resource-uids', state: 'refused' };
  }

  const newRunId = await readServerRunId(readRun, target, newServerPod);
  if (!newRunId.ok || newRunId.runId === preRunId.runId) {
    return { ok: false, detail: 'proof-new-run-id', state: 'refused' };
  }

  const recoveryPing = await execClientRedisCli(
    target,
    CLIENT_POD_NAME,
    serviceHost,
    ['PING'],
    readRun,
    REDIS_EXEC_MS,
  );
  const recoveryParsed = parsePingReply(recoveryPing.stdout ?? '');
  if (!recoveryPing.ok || !recoveryParsed.ok) {
    return { ok: false, detail: 'proof-recovery-ping', state: 'refused' };
  }

  const markerExists = await execClientRedisCli(
    target,
    CLIENT_POD_NAME,
    serviceHost,
    ['EXISTS', RESTART_MARKER_KEY],
    readRun,
    REDIS_EXEC_MS,
  );
  const markerExistsParsed = parseExistsReply(markerExists.stdout ?? '');
  if (!markerExists.ok || !markerExistsParsed.ok || markerExistsParsed.value !== 0) {
    return { ok: false, detail: 'proof-restart-marker-missing', state: 'refused' };
  }

  const helmRevision = await readHelmRevision(readRun, target);
  if (!helmRevision.ok) {
    return { ok: false, detail: 'proof-helm-revision', state: 'refused' };
  }

  if (remainingMs() < CLEANUP_RESERVE_MS) {
    return { ok: false, detail: 'proof-cleanup-budget', state: 'refused' };
  }

  const namespaceMeta = await readRun(
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
    { timeoutMs: KUBECTL_READ_MS },
  );
  if (!namespaceMeta.ok) {
    return { ok: false, detail: 'proof-namespace-meta', state: 'refused' };
  }
  let namespaceBody;
  try {
    namespaceBody = JSON.parse(namespaceMeta.stdout ?? '');
  } catch {
    return { ok: false, detail: 'proof-namespace-json', state: 'refused' };
  }
  const namespaceUid = namespaceBody?.metadata?.uid;
  const namespaceResourceVersion = namespaceBody?.metadata?.resourceVersion;
  if (
    typeof namespaceUid !== 'string' ||
    typeof namespaceResourceVersion !== 'string'
  ) {
    return { ok: false, detail: 'proof-namespace-identity', state: 'refused' };
  }

  const inventoryList = await readRun('kubectl', [
    ...kubectlScopeArgs(target, 'get'),
    'all,configmap,secret,serviceaccount',
    '-o',
    'name',
  ], { timeoutMs: KUBECTL_READ_MS });
  if (!inventoryList.ok) {
    return { ok: false, detail: 'proof-inventory-list', state: 'refused' };
  }
  const inventoryLines = (inventoryList.stdout ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const inventoryCheck = validateCleanupInventory(inventoryLines);
  if (!inventoryCheck.ok) {
    return {
      ok: false,
      detail: inventoryCheck.reason ?? 'proof-inventory-unexpected',
      state: 'refused',
    };
  }

  const deleteBody = {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: {
      name: target.namespace,
      uid: namespaceUid,
      resourceVersion: namespaceResourceVersion,
    },
  };
  const deleteNs = await writeRun(
    'kubectl',
    [
      '--context',
      target.contextName,
      'delete',
      '--raw',
      `/api/v1/namespaces/${target.namespace}`,
      '-f',
      '-',
    ],
    {
      input: `${JSON.stringify(deleteBody)}\n`,
      timeoutMs: KUBECTL_READ_MS,
    },
  );
  if (!deleteNs.ok || deleteNs.status == null || deleteNs.timedOut) {
    return { ok: false, detail: 'proof-namespace-delete-unclear', state: 'refused' };
  }

  return {
    ok: true,
    detail: 'smoke-proof-complete',
    state: 'installed',
    clientUid,
    preserved: {
      deploymentUid: preDeployment.uid,
      serviceUid: preService.uid,
      configMapUid: preConfigMap.uid,
    },
    runIds: { before: preRunId.runId, after: newRunId.runId },
  };
}