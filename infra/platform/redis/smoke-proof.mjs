import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout } from 'node:timers';
import { URL, fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';

import { runPlatformCommand } from '../common/commands.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import { observeInventory } from './inventory.mjs';
import { parseInfoServerReply, parsePingReply } from './readiness.mjs';

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
export const FLUSH_SENTINEL_KEY = 'offscreen:redis-proof:flush-sentinel';

const TTL_SECONDS = 4;
const TTL_POLL_MS = 250;
const TTL_POLL_BUDGET_MS = 10_000;
const ENDPOINT_CLEAR_MS = 60_000;
const ROLLOUT_WAIT_MS = 180_000;
const KUBECTL_READ_MS = 15_000;
const REDIS_EXEC_MS = 15_000;
const CLEANUP_RESERVE_MS = 180_000;
const NAMESPACE_ABSENT_BUDGET_MS = 120_000;
const ENDPOINT_RECOVERY_MS = 180_000;

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
  `deployment.apps/${DEPLOYMENT_NAME}`,
  `service/${SERVICE_NAME}`,
  `endpoints/${SERVICE_NAME}`,
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
  if (execResult.missing || execResult.timedOut) {
    // Kubectl exec timeout/API failure is not a Redis transport outage.
    return { kind: 'api-exec-failure', reason: 'exec-transport' };
  }
  const stderr = String(execResult.stderr ?? '');
  const combined = `${stderr}\n${stdout}`;
  if (
    combined.includes('Connection refused') ||
    combined.includes('Could not connect') ||
    combined.includes('Name or service not known')
  ) {
    return { kind: 'transport-outage', reason: 'ping-transport-failure' };
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
    if (item.startsWith('event/') || item.startsWith('event.events.k8s.io/') || item.startsWith('events.')) {
      continue;
    }
    if (item.startsWith('replicaset.apps/')) {
      continue;
    }
    if (item.startsWith('endpointslice.discovery.k8s.io/')) {
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
 * @param {'dev' | 'release'} profileId
 */
export function proofNonceLabelKey(profileId) {
  return profileId === 'dev'
    ? 'offscreen.dev/redis-proof'
    : 'offscreen.rpg/redis-proof';
}

/**
 * @param {(command: string, args: string[], options?: object) => ReturnType<typeof runPlatformCommand>} runner
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 */
async function listNamespacedResourceTypes(runner, target) {
  const result = runner(
    'kubectl',
    [
      '--context',
      target.contextName,
      'api-resources',
      '--namespaced=true',
      '--verbs=list',
      '-o',
      'name',
    ],
    { timeoutMs: KUBECTL_READ_MS },
  );
  const resolved = await Promise.resolve(result);
  if (!resolved.ok || (resolved.stderr ?? '').trim().length > 0) {
    return { ok: false, reason: 'api-resources-discovery' };
  }
  const types = (resolved.stdout ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (types.length === 0) {
    return { ok: false, reason: 'api-resources-empty' };
  }
  return { ok: true, types };
}

/**
 * @param {(command: string, args: string[], options?: object) => ReturnType<typeof runPlatformCommand>} runner
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 * @param {string[]} types
 */
async function listNamespacedInventory(runner, target, types) {
  /** @type {string[]} */
  const lines = [];
  for (const type of types) {
    const result = runner(
      'kubectl',
      [...kubectlScopeArgs(target, 'get'), type, '-o', 'name'],
      { timeoutMs: KUBECTL_READ_MS },
    );
    const resolved = await Promise.resolve(result);
    if (!resolved.ok) {
      return { ok: false, reason: 'inventory-type-list-failed', type };
    }
    const stderr = (resolved.stderr ?? '').trim();
    const knownEndpointsWarning =
      type === 'endpoints' &&
      stderr === 'Warning: v1 Endpoints is deprecated in v1.33+; use discovery.k8s.io/v1 EndpointSlice';
    if (stderr.length > 0 && !knownEndpointsWarning) {
      return { ok: false, reason: 'inventory-type-list-stderr', type };
    }
    const chunk = (resolved.stdout ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    lines.push(...chunk);
  }
  return { ok: true, lines };
}

/**
 * @param {(command: string, args: string[], options?: object) => ReturnType<typeof runPlatformCommand>} runner
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 * @param {{ uid: string }} identity
 * @param {string} proofNonce
 * @param {'dev' | 'release'} profileId
 */
async function readAndVerifyNamespaceIdentity(
  runner,
  target,
  identity,
  proofNonce,
  profileId,
) {
  const result = runner(
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
  const resolved = await Promise.resolve(result);
  if (!resolved.ok) {
    return { ok: false, reason: 'namespace-identity-unreadable' };
  }
  let body;
  try {
    body = JSON.parse(resolved.stdout ?? '');
  } catch {
    return { ok: false, reason: 'namespace-identity-json' };
  }
  const uid = body?.metadata?.uid;
  const resourceVersion = body?.metadata?.resourceVersion;
  const nonce = body?.metadata?.labels?.[proofNonceLabelKey(profileId)];
  if (typeof uid !== 'string' || typeof resourceVersion !== 'string') {
    return { ok: false, reason: 'namespace-identity-shape' };
  }
  if (uid !== identity.uid) {
    return { ok: false, reason: 'namespace-uid-recreated' };
  }
  if (nonce !== proofNonce) {
    return { ok: false, reason: 'namespace-nonce-mismatch' };
  }
  return { ok: true, uid, resourceVersion };
}

/**
 * @param {(command: string, args: string[], options?: object) => ReturnType<typeof runPlatformCommand>} runner
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 * @param {string} deploymentUid
 * @param {string} serverPodName
 */
async function verifyWorkloadOwnerChain(
  runner,
  target,
  deploymentUid,
  serverPodName,
) {
  const rsResult = runner(
    'kubectl',
    [...kubectlScopeArgs(target, 'get'), 'replicasets.apps', '-o', 'json'],
    { timeoutMs: KUBECTL_READ_MS },
  );
  const rsResolved = await Promise.resolve(rsResult);
  if (!rsResolved.ok) {
    return { ok: false, reason: 'replicaset-list-failed' };
  }
  let rsBody;
  try {
    rsBody = JSON.parse(rsResolved.stdout ?? '');
  } catch {
    return { ok: false, reason: 'replicaset-json' };
  }
  const rsItems = Array.isArray(rsBody?.items) ? rsBody.items : [];
  const ownedRs = rsItems.filter((rs) =>
    (rs?.metadata?.ownerReferences ?? []).some(
      (ref) =>
        ref?.kind === 'Deployment' &&
        ref?.uid === deploymentUid &&
        ref?.controller === true,
    ),
  );
  if (ownedRs.length !== 1) {
    return { ok: false, reason: 'replicaset-owner-count' };
  }
  const rsUid = ownedRs[0]?.metadata?.uid;
  const podResult = runner(
    'kubectl',
    [...kubectlScopeArgs(target, 'get'), 'pod', serverPodName, '-o', 'json'],
    { timeoutMs: KUBECTL_READ_MS },
  );
  const podResolved = await Promise.resolve(podResult);
  if (!podResolved.ok) {
    return { ok: false, reason: 'server-pod-get-failed' };
  }
  let podBody;
  try {
    podBody = JSON.parse(podResolved.stdout ?? '');
  } catch {
    return { ok: false, reason: 'server-pod-json' };
  }
  const podOwners = podBody?.metadata?.ownerReferences ?? [];
  const ownedByRs = podOwners.some(
    (ref) => ref?.kind === 'ReplicaSet' && ref?.uid === rsUid,
  );
  if (!ownedByRs) {
    return { ok: false, reason: 'server-pod-owner-chain' };
  }
  return { ok: true, rsUid, podUid: podBody?.metadata?.uid ?? '' };
}

/**
 * @param {(command: string, args: string[], options?: object) => ReturnType<typeof runPlatformCommand>} runner
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 * @param {string} expectedUid
 */
async function readClientPodReady(runner, target, expectedUid) {
  const result = runner(
    'kubectl',
    [...kubectlScopeArgs(target, 'get'), 'pod', CLIENT_POD_NAME, '-o', 'json'],
    { timeoutMs: KUBECTL_READ_MS },
  );
  const resolved = await Promise.resolve(result);
  if (!resolved.ok) {
    return { ok: false, reason: 'client-pod-unreadable' };
  }
  let body;
  try {
    body = JSON.parse(resolved.stdout ?? '');
  } catch {
    return { ok: false, reason: 'client-pod-json' };
  }
  const uid = body?.metadata?.uid;
  if (uid !== expectedUid) {
    return { ok: false, reason: 'client-pod-uid-mismatch' };
  }
  const conditions = Array.isArray(body?.status?.conditions)
    ? body.status.conditions
    : [];
  const ready = conditions.find((c) => c?.type === 'Ready');
  if (ready?.status !== 'True') {
    return { ok: false, reason: 'client-pod-not-ready' };
  }
  return { ok: true };
}

/**
 * @param {(command: string, args: string[], options?: object) => ReturnType<typeof runPlatformCommand>} runner
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 * @param {string} serverPodUid
 * @param {string} serverPodIp
 */
async function readSingletonEndpoint(
  runner,
  target,
  serverPodUid,
  serverPodIp,
) {
  const result = runner(
    'kubectl',
    [
      ...kubectlScopeArgs(target, 'get'),
      'endpointslices.discovery.k8s.io',
      '-l',
      'kubernetes.io/service-name=redis',
      '-o',
      'json',
    ],
    { timeoutMs: KUBECTL_READ_MS },
  );
  const resolved = await Promise.resolve(result);
  if (!resolved.ok) {
    return { ok: false, state: 'unreadable', reason: 'endpoints-api-failure' };
  }
  if ((resolved.stderr ?? '').trim().length > 0) {
    return { ok: false, state: 'unreadable', reason: 'endpoints-stderr' };
  }
  const trimmed = (resolved.stdout ?? '').trim();
  if (trimmed.length === 0) {
    return { ok: false, state: 'unreadable', reason: 'endpoints-json' };
  }
  let body;
  try {
    body = JSON.parse(trimmed);
  } catch {
    return { ok: false, state: 'unreadable', reason: 'endpoints-json' };
  }
  if (body?.apiVersion !== 'v1' || body?.kind !== 'List' || !Array.isArray(body.items)) {
    return { ok: false, state: 'unreadable', reason: 'endpoints-list-shape' };
  }
  /** @type {Array<{ uid?: string, ip: string }>} */
  const addresses = [];
  for (const slice of body.items) {
    if (
      slice?.apiVersion !== 'discovery.k8s.io/v1' ||
      slice?.kind !== 'EndpointSlice' ||
      slice?.metadata?.namespace !== target.namespace ||
      slice?.metadata?.labels?.['kubernetes.io/service-name'] !== SERVICE_NAME ||
      slice?.addressType !== 'IPv4' ||
      !Array.isArray(slice.endpoints)
    ) {
      return { ok: false, state: 'unreadable', reason: 'endpoints-slice-shape' };
    }
    for (const entry of slice.endpoints) {
      if (!Array.isArray(entry?.addresses) || entry.addresses.length !== 1 ||
          entry.targetRef?.kind !== 'Pod' || entry.targetRef?.namespace !== target.namespace ||
          typeof entry.targetRef?.uid !== 'string' ||
          typeof entry.conditions?.ready !== 'boolean') {
        return { ok: false, state: 'unreadable', reason: 'endpoint-entry-shape' };
      }
      if (entry.conditions.ready !== true || entry.conditions.terminating === true) continue;
      if (entry.conditions.serving !== true ||
          !Array.isArray(slice.ports) || slice.ports.length !== 1 ||
          slice.ports[0]?.name !== 'redis' || slice.ports[0]?.port !== 6379 ||
          slice.ports[0]?.protocol !== 'TCP') {
        return { ok: false, state: 'unreadable', reason: 'endpoint-ready-shape' };
      }
      addresses.push({ uid: entry.targetRef.uid, ip: entry.addresses[0] });
    }
  }
  if (addresses.length === 0) {
    return { ok: true, state: 'absent', count: 0 };
  }
  if (addresses.length !== 1) {
    return { ok: false, state: 'unreadable', reason: 'endpoint-count' };
  }
  const only = addresses[0];
  if (only.uid !== serverPodUid || only.ip !== serverPodIp) {
    return {
      ok: false,
      state: 'unreadable',
      reason: 'endpoint-identity-mismatch',
    };
  }
  return { ok: true, state: 'ready', count: 1 };
}

/**
 * @param {(command: string, args: string[], options?: object) => ReturnType<typeof runPlatformCommand>} runner
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 * @param {string} serverPodName
 */
async function readServerPodReady(runner, target, serverPodName) {
  const result = runner(
    'kubectl',
    [...kubectlScopeArgs(target, 'get'), 'pod', serverPodName, '-o', 'json'],
    { timeoutMs: KUBECTL_READ_MS },
  );
  const resolved = await Promise.resolve(result);
  if (!resolved.ok) {
    return { ok: false, reason: 'server-pod-unreadable' };
  }
  let body;
  try {
    body = JSON.parse(resolved.stdout ?? '');
  } catch {
    return { ok: false, reason: 'server-pod-json' };
  }
  const conditions = Array.isArray(body?.status?.conditions)
    ? body.status.conditions
    : [];
  const ready = conditions.find((c) => c?.type === 'Ready');
  if (ready?.status !== 'True') {
    return { ok: false, reason: 'server-pod-not-ready' };
  }
  const uid = body?.metadata?.uid;
  const podIP = body?.status?.podIP;
  if (
    typeof uid !== 'string' ||
    typeof podIP !== 'string' ||
    podIP.length === 0
  ) {
    return { ok: false, reason: 'server-pod-identity' };
  }
  const containers = Array.isArray(body?.status?.containerStatuses)
    ? body.status.containerStatuses
    : [];
  const redisContainer = containers.find((c) => c?.name === REDIS_CONTAINER);
  const containerID = redisContainer?.containerID;
  if (typeof containerID !== 'string' || containerID.length === 0) {
    return { ok: false, reason: 'server-container-id' };
  }
  return { ok: true, uid, podIP, containerID };
}

/**
 * @param {(command: string, args: string[], options?: object) => ReturnType<typeof runPlatformCommand>} runner
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 * @param {string} serverPodName
 */
async function waitForEndpointRecovery(
  runner,
  target,
  serverPodName,
  budgetMs,
) {
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) {
    const server = await readServerPodReady(runner, target, serverPodName);
    if (!server.ok) {
      if (server.reason !== 'server-pod-not-ready') return { ok: false, reason: server.reason ?? 'server-not-ready' };
      await new Promise((resolve) => setTimeout(resolve, 500));
      continue;
    }
    const endpoint = await readSingletonEndpoint(
      runner,
      target,
      server.uid,
      server.podIP,
    );
    if (!endpoint.ok) return { ok: false, reason: endpoint.reason };
    if (endpoint.state === 'ready') {
      return { ok: true, server };
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return { ok: false, reason: 'endpoint-recovery-timeout' };
}

/**
 * @param {(command: string, args: string[], options?: object) => ReturnType<typeof runPlatformCommand>} runner
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 */
async function verifyNamespaceAbsent(runner, target, budgetMs) {
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) {
    const result = runner(
      'kubectl',
      [
        '--context',
        target.contextName,
        'get',
        'namespace',
        target.namespace,
        '--ignore-not-found',
        '-o',
        'json',
      ],
      { timeoutMs: Math.max(1, Math.min(KUBECTL_READ_MS, deadline - Date.now())) },
    );
    const resolved = await Promise.resolve(result);
    if (!resolved.ok || resolved.timedOut || resolved.missing || (resolved.stderr ?? '').trim()) {
      return {
        ok: false,
        uncertain: true,
        reason: 'namespace-absent-unreadable',
      };
    }
    const trimmed = (resolved.stdout ?? '').trim();
    if (trimmed.length === 0) {
      return { ok: true, absent: true };
    }
    try {
      const body = JSON.parse(trimmed);
      if (body?.metadata?.deletionTimestamp) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
    } catch {
      return { ok: false, uncertain: true, reason: 'namespace-absent-json' };
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return {
    ok: false,
    absent: false,
    uncertain: false,
    reason: 'namespace-still-present',
  };
}

/**
 * Verified disposable-namespace cleanup (T08c); also used by refusal fixtures (T08d).
 *
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 * @param {'dev' | 'release'} profileId
 * @param {{
 *   run: (command: string, args: string[], options?: object) => ReturnType<typeof runPlatformCommand>,
 *   runWrite: (command: 'helm' | 'kubectl', args: string[], options?: object) => Promise<unknown>,
 *   remainingMs: () => number,
 *   namespaceIdentity: { uid: string, resourceVersion?: string },
 *   proofNonce?: string,
 * }} deps
 */
export async function runVerifiedSmokeNamespaceCleanup(
  target,
  profileId,
  deps,
) {
  const { run, runWrite, remainingMs, namespaceIdentity, proofNonce } = deps;
  const writeRun = async (command, args, options) =>
    /** @type {ReturnType<typeof runPlatformCommand>} */ (
      await Promise.resolve(runWrite(command, args, options))
    );

  if (remainingMs() < CLEANUP_RESERVE_MS) {
    return { ok: false, detail: 'proof-cleanup-budget', retainReceipt: true };
  }

  const namespaceBeforeDelete = await readAndVerifyNamespaceIdentity(
    run,
    target,
    namespaceIdentity,
    proofNonce,
    profileId,
  );
  if (!namespaceBeforeDelete.ok) {
    return {
      ok: false,
      detail: namespaceBeforeDelete.reason ?? 'proof-namespace-identity',
      retainReceipt: true,
    };
  }

  const resourceTypes = await listNamespacedResourceTypes(run, target);
  if (!resourceTypes.ok) {
    return {
      ok: false,
      detail: resourceTypes.reason ?? 'proof-inventory-discovery',
      retainReceipt: true,
    };
  }
  const inventoryListed = await listNamespacedInventory(
    run,
    target,
    resourceTypes.types,
  );
  if (!inventoryListed.ok) {
    return {
      ok: false,
      detail: inventoryListed.type
        ? `${inventoryListed.reason}:${inventoryListed.type}`
        : inventoryListed.reason ?? 'proof-inventory-list',
      retainReceipt: true,
    };
  }
  const inventoryCheck = validateCleanupInventory(inventoryListed.lines);
  if (!inventoryCheck.ok) {
    return {
      ok: false,
      detail: inventoryCheck.reason ?? 'proof-inventory-unexpected',
      retainReceipt: true,
    };
  }

  const deleteBody = {
    apiVersion: 'v1',
    kind: 'DeleteOptions',
    preconditions: {
      uid: namespaceIdentity.uid,
      resourceVersion: namespaceBeforeDelete.resourceVersion,
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
    return {
      ok: false,
      detail: 'proof-namespace-delete-unclear',
      retainReceipt: true,
    };
  }

  const absence = await verifyNamespaceAbsent(
    run,
    target,
    Math.max(0, Math.min(NAMESPACE_ABSENT_BUDGET_MS, remainingMs())),
  );
  if (!absence.ok) {
    if (absence.uncertain) {
      return {
        ok: false,
        detail: absence.reason ?? 'proof-namespace-absent-uncertain',
        retainReceipt: true,
      };
    }
    return {
      ok: false,
      detail: absence.reason ?? 'proof-namespace-still-present',
      retainReceipt: true,
    };
  }

  return { ok: true, detail: 'verified-namespace-cleanup' };
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
export function execClientRedisCli(
  target,
  podName,
  host,
  redisCliArgs,
  runner,
  timeoutMs,
) {
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
  const result = runner(
    'kubectl',
    [
      ...kubectlScopeArgs(target, 'get'),
      'deployment',
      DEPLOYMENT_NAME,
      '-o',
      'json',
    ],
    { timeoutMs: KUBECTL_READ_MS },
  );
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
  return {
    ok: true,
    uid,
    resourceVersion,
    replicas: body?.spec?.replicas ?? null,
  };
}

/**
 * @param {(command: string, args: string[], options?: object) => ReturnType<typeof runPlatformCommand>} runner
 * @param {import('./inventory.mjs').RedisInventoryTarget} target
 * @param {string} kind
 * @param {string} name
 */
async function readObjectIdentity(runner, target, kind, name) {
  const result = runner(
    'kubectl',
    [...kubectlScopeArgs(target, 'get'), kind, name, '-o', 'json'],
    { timeoutMs: KUBECTL_READ_MS },
  );
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
  const result = runner(
    'kubectl',
    [
      ...kubectlScopeArgs(target, 'get'),
      'pods',
      '-l',
      'app.kubernetes.io/name=redis,app.kubernetes.io/instance=redis',
      '-o',
      'json',
    ],
    { timeoutMs: KUBECTL_READ_MS },
  );
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
  if (!Array.isArray(body?.items) || body.items.some((pod) => !pod?.metadata?.name || !pod?.metadata?.uid)) {
    return { ok: false, reason: 'pods-list-shape' };
  }
  const items = body.items;
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
 *   namespaceIdentity?: { uid: string, resourceVersion?: string },
 *   proofNonce?: string,
 *   foreignContextInventoryEqual?: boolean,
 *   volumePreservationVerified?: boolean,
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
    return {
      ok: false,
      detail: 'proof-write-runner-missing',
      state: 'refused',
    };
  }

  const remainingMs = deps.remainingMs ?? (() => Number.POSITIVE_INFINITY);
  const serviceHost = `redis.${target.namespace}.svc`;
  const namespaceIdentity = deps.namespaceIdentity;
  const proofNonce = deps.proofNonce;
  if (!namespaceIdentity?.uid || typeof proofNonce !== 'string') {
    return {
      ok: false,
      detail: 'proof-namespace-identity-missing',
      state: 'refused',
    };
  }

  const observeInventoryFn = deps.observeInventory ?? observeInventory;
  const inventory = observeInventoryFn(target, { run: readRun });
  if (inventory.state !== 'installed') {
    return {
      ok: false,
      detail: 'proof-inventory-not-installed',
      state: 'refused',
    };
  }

  const redisPods = await listRedisServerPods(readRun, target);
  if (!redisPods.ok || redisPods.pods.length !== 1) {
    return { ok: false, detail: 'proof-redis-pod-count', state: 'refused' };
  }
  const serverPod = redisPods.pods[0].name;

  const preDeployment = await readDeploymentIdentity(readRun, target);
  const preService = await readObjectIdentity(
    readRun,
    target,
    'service',
    SERVICE_NAME,
  );
  const preConfigMap = await readObjectIdentity(
    readRun,
    target,
    'configmap',
    CONFIGMAP_NAME,
  );
  if (!preDeployment.ok || !preService.ok || !preConfigMap.ok) {
    return { ok: false, detail: 'proof-identity-read', state: 'refused' };
  }

  const namespaceBeforeClient = await readAndVerifyNamespaceIdentity(
    readRun,
    target,
    namespaceIdentity,
    proofNonce,
    profileId,
  );
  if (!namespaceBeforeClient.ok) {
    return {
      ok: false,
      detail: namespaceBeforeClient.reason ?? 'proof-namespace-identity',
      state: 'refused',
    };
  }

  const ownerBeforeClient = await verifyWorkloadOwnerChain(
    readRun,
    target,
    preDeployment.uid,
    serverPod,
  );
  if (!ownerBeforeClient.ok) {
    return {
      ok: false,
      detail: ownerBeforeClient.reason ?? 'proof-owner-chain',
      state: 'refused',
    };
  }

  const clientManifest = renderClientPodManifest(target.namespace);
  const createClient = await writeRun(
    'kubectl',
    [...kubectlScopeArgs(target, 'create'), '-f', '-', '-o', 'json'],
    { input: clientManifest, timeoutMs: KUBECTL_READ_MS },
  );
  if (
    !createClient.ok ||
    createClient.status == null ||
    createClient.timedOut
  ) {
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

  const clientList = await readRun(
    'kubectl',
    [
      ...kubectlScopeArgs(target, 'get'),
      'pods',
      '-l',
      'app=redis-client',
      '-o',
      'name',
    ],
    { timeoutMs: KUBECTL_READ_MS },
  );
  const clientLines = (clientList.stdout ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (!clientList.ok || clientLines.length !== 1) {
    return { ok: false, detail: 'client-count-refused', state: 'refused' };
  }

  const clientDeadline = Date.now() + Math.max(0, Math.min(60_000, remainingMs() - CLEANUP_RESERVE_MS));
  let clientReady = { ok: false, reason: 'client-pod-not-ready' };
  while (Date.now() < clientDeadline) {
    clientReady = await readClientPodReady(readRun, target, clientUid);
    if (clientReady.ok || clientReady.reason !== 'client-pod-not-ready') break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!clientReady.ok) {
    return {
      ok: false,
      detail: clientReady.reason ?? 'proof-client-not-ready',
      state: 'refused',
    };
  }

  const serverReady = await readServerPodReady(readRun, target, serverPod);
  if (!serverReady.ok) {
    return {
      ok: false,
      detail: serverReady.reason ?? 'proof-server-not-ready',
      state: 'refused',
    };
  }
  const preContainerID = serverReady.containerID;

  const endpointReady = await readSingletonEndpoint(
    readRun,
    target,
    serverReady.uid,
    serverReady.podIP,
  );
  if (!endpointReady.ok || endpointReady.state !== 'ready') {
    return {
      ok: false,
      detail: endpointReady.reason ?? 'proof-endpoint-not-ready',
      state: 'refused',
    };
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
  const fenceBeforeSet = await readAndVerifyNamespaceIdentity(
    readRun,
    target,
    namespaceIdentity,
    proofNonce,
    profileId,
  );
  if (!fenceBeforeSet.ok) {
    return {
      ok: false,
      detail: fenceBeforeSet.reason ?? 'proof-namespace-fence',
      state: 'refused',
    };
  }
  const setTtl = await writeRun(
    'kubectl',
    [
      ...kubectlScopeArgs(target, 'exec'),
      CLIENT_POD_NAME,
      '-c',
      REDIS_CONTAINER,
      '--',
      'redis-cli',
      '-e',
      '--raw',
      '-h',
      serviceHost,
      '-p',
      '6379',
      'SET',
      TTL_KEY,
      ttlValue,
      'EX',
      String(TTL_SECONDS),
    ],
    { timeoutMs: REDIS_EXEC_MS },
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
    return {
      ok: false,
      detail: flushRefusal.reason ?? 'flush-refused',
      state: 'refused',
    };
  }

  const fenceBeforeFlush = await readAndVerifyNamespaceIdentity(
    readRun,
    target,
    namespaceIdentity,
    proofNonce,
    profileId,
  );
  if (!fenceBeforeFlush.ok) {
    return {
      ok: false,
      detail: fenceBeforeFlush.reason ?? 'proof-namespace-fence',
      state: 'refused',
    };
  }
  const ownerBeforeFlush = await verifyWorkloadOwnerChain(
    readRun,
    target,
    preDeployment.uid,
    serverPod,
  );
  if (!ownerBeforeFlush.ok) {
    return {
      ok: false,
      detail: ownerBeforeFlush.reason ?? 'proof-owner-chain',
      state: 'refused',
    };
  }

  const sentinelSet = await writeRun(
    'kubectl',
    [
      ...kubectlScopeArgs(target, 'exec'),
      CLIENT_POD_NAME,
      '-c',
      REDIS_CONTAINER,
      '--',
      'redis-cli',
      '-e',
      '--raw',
      '-h',
      serviceHost,
      '-p',
      '6379',
      'SET',
      FLUSH_SENTINEL_KEY,
      'flush-sentinel',
    ],
    { timeoutMs: REDIS_EXEC_MS },
  );
  const sentinelSetParsed = parseRedisOkReply(sentinelSet.stdout ?? '');
  if (!sentinelSet.ok || !sentinelSetParsed.ok) {
    return { ok: false, detail: 'proof-flush-sentinel-set', state: 'refused' };
  }

  const localRunId = await readServerRunId(readRun, target, serverPod);
  const serviceInfo = await execClientRedisCli(
    target,
    CLIENT_POD_NAME,
    serviceHost,
    ['INFO', 'server'],
    readRun,
    REDIS_EXEC_MS,
  );
  const serviceInfoParsed = parseInfoServerReply(serviceInfo.stdout ?? '');
  if (
    !localRunId.ok ||
    !serviceInfo.ok ||
    !serviceInfoParsed.ok ||
    localRunId.runId !== serviceInfoParsed.runId
  ) {
    return { ok: false, detail: 'proof-run-id-agreement', state: 'refused' };
  }
  if (localRunId.runId !== preRunId.runId) {
    return { ok: false, detail: 'proof-flush-run-id', state: 'refused' };
  }

  const flush = await writeRun(
    'kubectl',
    [
      ...kubectlScopeArgs(target, 'exec'),
      serverPod,
      '-c',
      REDIS_CONTAINER,
      '--',
      'redis-cli',
      '-e',
      '--raw',
      '-h',
      '127.0.0.1',
      '-p',
      '6379',
      'FLUSHALL',
    ],
    { timeoutMs: REDIS_EXEC_MS },
  );
  const flushParsed = parseRedisOkReply(flush.stdout ?? '');
  if (!flush.ok || !flushParsed.ok) {
    return { ok: false, detail: 'proof-flushall', state: 'refused' };
  }

  const sentinelExists = await execClientRedisCli(
    target,
    CLIENT_POD_NAME,
    serviceHost,
    ['EXISTS', FLUSH_SENTINEL_KEY],
    readRun,
    REDIS_EXEC_MS,
  );
  const sentinelExistsParsed = parseExistsReply(sentinelExists.stdout ?? '');
  if (
    !sentinelExists.ok ||
    !sentinelExistsParsed.ok ||
    sentinelExistsParsed.value !== 0
  ) {
    return {
      ok: false,
      detail: 'proof-flush-sentinel-missing',
      state: 'refused',
    };
  }

  const markerSet = await writeRun(
    'kubectl',
    [
      ...kubectlScopeArgs(target, 'exec'),
      CLIENT_POD_NAME,
      '-c',
      REDIS_CONTAINER,
      '--',
      'redis-cli',
      '-e',
      '--raw',
      '-h',
      serviceHost,
      '-p',
      '6379',
      'SET',
      RESTART_MARKER_KEY,
      'marker',
    ],
    { timeoutMs: REDIS_EXEC_MS },
  );
  const markerParsed = parseRedisOkReply(markerSet.stdout ?? '');
  if (!markerSet.ok || !markerParsed.ok) {
    return { ok: false, detail: 'proof-restart-marker-set', state: 'refused' };
  }

  const outageDeployment = await readDeploymentIdentity(readRun, target);
  if (!outageDeployment.ok || outageDeployment.uid !== preDeployment.uid) {
    return { ok: false, detail: 'proof-scale-identity', state: 'refused' };
  }

  const fenceBeforeScale = await readAndVerifyNamespaceIdentity(
    readRun,
    target,
    namespaceIdentity,
    proofNonce,
    profileId,
  );
  if (!fenceBeforeScale.ok) {
    return {
      ok: false,
      detail: fenceBeforeScale.reason ?? 'proof-namespace-fence',
      state: 'refused',
    };
  }
  const ownerBeforeScale = await verifyWorkloadOwnerChain(
    readRun,
    target,
    preDeployment.uid,
    serverPod,
  );
  if (!ownerBeforeScale.ok) {
    return {
      ok: false,
      detail: ownerBeforeScale.reason ?? 'proof-owner-chain',
      state: 'refused',
    };
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
    Math.max(0, Math.min(ENDPOINT_CLEAR_MS, remainingMs() - CLEANUP_RESERVE_MS)),
  );
  if (!noPods.ok) {
    return { ok: false, detail: 'proof-scale-zero-pods', state: 'refused' };
  }

  const zeroDeadline = Date.now() + Math.max(0, Math.min(ENDPOINT_CLEAR_MS, remainingMs() - CLEANUP_RESERVE_MS));
  let zeroEndpoints = { ok: false, reason: 'proof-endpoints-not-zero', state: 'unreadable', count: -1 };
  while (Date.now() < zeroDeadline) {
    zeroEndpoints = await readSingletonEndpoint(readRun, target, serverReady.uid, serverReady.podIP);
    if (!zeroEndpoints.ok || zeroEndpoints.state === 'absent') break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!zeroEndpoints.ok) {
    return {
      ok: false,
      detail: zeroEndpoints.reason ?? 'proof-endpoints-unreadable',
      state: 'refused',
    };
  }
  if (zeroEndpoints.state !== 'absent' || zeroEndpoints.count !== 0) {
    return { ok: false, detail: 'proof-endpoints-not-zero', state: 'refused' };
  }

  const outagePing = await execClientRedisCli(
    target,
    CLIENT_POD_NAME,
    serviceHost,
    ['PING'],
    readRun,
    REDIS_EXEC_MS,
  );
  const outageClass = classifyScaleZeroOutage(
    outagePing,
    outagePing.stdout ?? '',
  );
  if (outageClass.kind === 'api-exec-failure') {
    return {
      ok: false,
      detail: 'proof-outage-exec-not-transport',
      state: 'refused',
    };
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
    return {
      ok: false,
      detail: 'proof-scale-zero-deployment',
      state: 'refused',
    };
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
    Math.max(0, Math.min(ROLLOUT_WAIT_MS, remainingMs() - CLEANUP_RESERVE_MS)),
  );
  if (!onePod.ok) {
    return { ok: false, detail: 'proof-scale-up-pods', state: 'refused' };
  }
  const newServerPod = onePod.pods[0].name;
  if (onePod.pods[0].uid === redisPods.pods[0].uid) {
    return { ok: false, detail: 'proof-pod-uid-unchanged', state: 'refused' };
  }

  const recovered = await waitForEndpointRecovery(
    readRun,
    target,
    newServerPod,
    Math.max(0, Math.min(ENDPOINT_RECOVERY_MS, remainingMs() - CLEANUP_RESERVE_MS)),
  );
  if (!recovered.ok) {
    return {
      ok: false,
      detail: recovered.reason ?? 'proof-endpoint-recovery',
      state: 'refused',
    };
  }
  if (
    recovered.server.containerID === preContainerID ||
    recovered.server.uid === redisPods.pods[0].uid
  ) {
    return {
      ok: false,
      detail: 'proof-container-id-unchanged',
      state: 'refused',
    };
  }

  const postService = await readObjectIdentity(
    readRun,
    target,
    'service',
    SERVICE_NAME,
  );
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
  if (
    !markerExists.ok ||
    !markerExistsParsed.ok ||
    markerExistsParsed.value !== 0
  ) {
    return {
      ok: false,
      detail: 'proof-restart-marker-missing',
      state: 'refused',
    };
  }

  const postClient = await readClientPodReady(readRun, target, clientUid);
  if (!postClient.ok) return { ok: false, detail: postClient.reason, state: 'refused' };
  const recoveryInfo = await execClientRedisCli(target, CLIENT_POD_NAME, serviceHost, ['INFO', 'server'], readRun, REDIS_EXEC_MS);
  const recoveryInfoParsed = parseInfoServerReply(recoveryInfo.stdout ?? '');
  if (!recoveryInfo.ok || (recoveryInfo.stderr ?? '').trim() || !recoveryInfoParsed.ok || recoveryInfoParsed.runId !== newRunId.runId) {
    return { ok: false, detail: 'proof-recovery-run-id-agreement', state: 'refused' };
  }
  const recoverySet = await writeRun('kubectl', [
    ...kubectlScopeArgs(target, 'exec'), CLIENT_POD_NAME, '-c', REDIS_CONTAINER,
    '--', 'redis-cli', '-e', '--raw', '-h', serviceHost, '-p', '6379',
    'SET', TTL_KEY, ttlValue, 'EX', String(TTL_SECONDS),
  ], { timeoutMs: REDIS_EXEC_MS });
  if (!recoverySet.ok || (recoverySet.stderr ?? '').trim() || !parseRedisOkReply(recoverySet.stdout ?? '').ok) {
    return { ok: false, detail: 'proof-recovery-set', state: 'refused' };
  }
  const recoveryGet = await execClientRedisCli(target, CLIENT_POD_NAME, serviceHost, ['GET', TTL_KEY], readRun, REDIS_EXEC_MS);
  if (!recoveryGet.ok || (recoveryGet.stderr ?? '').trim() || parseRedisBulkReply(recoveryGet.stdout ?? '').value !== ttlValue) {
    return { ok: false, detail: 'proof-recovery-get', state: 'refused' };
  }

  const helmRevision = await readHelmRevision(readRun, target);
  if (!helmRevision.ok) {
    return { ok: false, detail: 'proof-helm-revision', state: 'refused' };
  }

  const cleanup = await runVerifiedSmokeNamespaceCleanup(target, profileId, {
    run: readRun,
    runWrite: writeRun,
    remainingMs,
    namespaceIdentity,
    proofNonce,
  });
  if (!cleanup.ok) {
    return {
      ok: false,
      detail: cleanup.detail,
      state: 'refused',
      ...(cleanup.retainReceipt ? { retainReceipt: true } : {}),
    };
  }

  const baselineMetadata = {
    profileId,
    contextName: target.contextName,
    namespace: target.namespace,
    namespaceUid: namespaceIdentity.uid,
    proofNonce,
  };

  return {
    ok: true,
    detail: 'smoke-proof-complete',
    state: 'installed',
    clientUid,
    preserved: {
      deploymentUid: preDeployment.uid,
      serviceUid: preService.uid,
      configMapUid: preConfigMap.uid,
      helmRevision: EXPECTED_HELM_REVISIONS,
    },
    runIds: { before: preRunId.runId, after: newRunId.runId },
    receipt: {
      baselineMetadata,
      foreignContextInventoryEqual: deps.foreignContextInventoryEqual ?? null,
      volumePreservationVerified: deps.volumePreservationVerified ?? null,
    },
  };
}
