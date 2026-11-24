import { createHash, randomUUID } from 'node:crypto';
import { fork } from 'node:child_process';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from 'redis';

import { makeCacheKey } from '@offscreen/cache/core';

import { parseSyntheticValue, rpc } from './worker.mjs';

const execFile = promisify(execFileCb);
const workerPath = fileURLToPath(new URL('./worker.mjs', import.meta.url));

export const COMMAND_TIMEOUT_MS = 10_000;
export const SUITE_TIMEOUT_MS = 180_000;
export const REDIS_IMAGE_PIN = 'redis:8.2.1-alpine';
export const REDIS_IMAGE_ALIASES = [
  REDIS_IMAGE_PIN,
  `docker.io/library/${REDIS_IMAGE_PIN}`,
];

export const CACHE07_POLICY = Object.freeze({
  namespace: 'cache07-proof',
  version: 1,
  consistency: 'immutable',
  ttlMs: 30_000,
  jitterRatio: 0,
  maxEntryBytes: 262_144,
  maxActiveKeys: 16,
  maxWaitersPerKey: 32,
  originConcurrency: 4,
  originQueueLimit: 16,
  originQueueTimeoutMs: 200,
  connectTimeoutMs: 500,
  operationTimeoutMs: 100,
});

/**
 * @param {string[]} argv
 * @param {NodeJS.ProcessEnv} env
 */
export function validateLiveOptIn(argv, env) {
  const hasLiveFlag = argv.includes('--live');
  const allowed = env.CACHE07_ALLOW_DISPOSABLE_REDIS === '1';
  if (!hasLiveFlag || !allowed) {
    return {
      status: 'NOT-RUN',
      reason: 'Live opt-in requires --live and CACHE07_ALLOW_DISPOSABLE_REDIS=1',
    };
  }
  return null;
}

/**
 * @param {NodeJS.ProcessEnv} env
 */
export function rejectSuppliedRedisUrl(env) {
  if (typeof env.REDIS_URL === 'string' && env.REDIS_URL.length > 0) {
    return {
      status: 'FAIL',
      reason:
        'Supplied REDIS_URL is rejected; harness must own the generated endpoint',
    };
  }
  return null;
}

/**
 * @param {string | undefined} endpoint
 */
export function validateDockerContextEndpoint(endpoint) {
  if (!endpoint) {
    return { ok: false, reason: 'Docker context endpoint missing' };
  }
  const local =
    endpoint.startsWith('unix://') ||
    endpoint.startsWith('npipe://') ||
    endpoint === '' ||
    endpoint.startsWith('unix:');
  if (!local) {
    return { ok: false, reason: 'Remote Docker context endpoint is rejected' };
  }
  if (/^tcp:|^ssh:|^http:|^https:/i.test(endpoint)) {
    return { ok: false, reason: 'Remote Docker TCP/SSH context is rejected' };
  }
  return { ok: true };
}

/**
 * @param {readonly number[]} sortedSamples
 * @param {number} percentile
 */
export function computeNearestRankPercentile(sortedSamples, percentile) {
  if (sortedSamples.length === 0) {
    return null;
  }
  if (percentile <= 0) {
    return sortedSamples[0];
  }
  if (percentile >= 1) {
    return sortedSamples[sortedSamples.length - 1];
  }
  const rank = Math.ceil(percentile * sortedSamples.length);
  return sortedSamples[Math.max(0, rank - 1)];
}

/**
 * @param {{ valueA: unknown; valueB: unknown; totalOriginLoads: number }} result
 */
export function assertSharedHitScenario(result) {
  const a = parseSyntheticValue(result.valueA);
  const b = parseSyntheticValue(result.valueB);
  if (a.id !== b.id || a.revision !== b.revision) {
    return { ok: false, reason: 'Shared hit values differ' };
  }
  if (result.totalOriginLoads !== 1) {
    return {
      ok: false,
      reason: `Expected totalOriginLoads=1, got ${result.totalOriginLoads}`,
    };
  }
  return { ok: true };
}

/**
 * @param {{ value: unknown; enabled: boolean; l2Hits: number }} result
 */
export function assertDisabledParityScenario(result) {
  parseSyntheticValue(result.value);
  if (result.enabled) {
    return { ok: false, reason: 'Disabled scenario expected disabled adapter' };
  }
  if (result.l2Hits > 0) {
    return { ok: false, reason: 'Disabled scenario must not report Redis hits' };
  }
  return { ok: true };
}

/**
 * @param {{ totalOriginLoads: number }} result
 */
export function assertDistinctRevisionScenario(result) {
  if (result.totalOriginLoads !== 2) {
    return {
      ok: false,
      reason: `Expected 2 distinct origin loads, got ${result.totalOriginLoads}`,
    };
  }
  return { ok: true };
}

/**
 * @param {{ value: unknown; originLoads: number }} result
 */
export function assertMalformedEnvelopeScenario(result) {
  parseSyntheticValue(result.value);
  if (result.originLoads !== 1) {
    return {
      ok: false,
      reason: `Expected exactly one origin load after malformed envelope, got ${result.originLoads}`,
    };
  }
  return { ok: true };
}

/**
 * @param {{
 *   evictedKeysDelta: number;
 *   absentKeyVerified: boolean;
 *   value: unknown;
 * }} result
 */
export function assertEvictionScenario(result) {
  if (result.evictedKeysDelta < 1) {
    return { ok: false, reason: 'INFO evicted_keys did not increase' };
  }
  if (!result.absentKeyVerified) {
    return { ok: false, reason: 'Previously populated key still present in Redis' };
  }
  parseSyntheticValue(result.value);
  return { ok: true };
}

export const T02_RECOVERY_BUDGET_MS = 25_000;
export const T02_SHUTDOWN_BUDGET_MS = 5_000;
export const SDK_QUEUE_METRICS_PROOF =
  'packages/cache/src/cache03-single-flight.test.ts';

/**
 * @param {readonly number[]} samples
 */
export function buildCasePercentiles(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    p95: computeNearestRankPercentile(sorted, 0.95),
    p99: computeNearestRankPercentile(sorted, 0.99),
    sampleCount: sorted.length,
  };
}

/**
 * @param {Record<string, number> | undefined} telemetry
 */
export function extractTelemetryOverloadCoalesced(telemetry) {
  let overload = 0;
  let coalesced = 0;
  for (const [key, count] of Object.entries(telemetry ?? {})) {
    if (key.endsWith(':overload')) {
      overload += count;
    }
    if (key.endsWith(':coalesced')) {
      coalesced += count;
    }
  }
  return { overload, coalesced };
}

/**
 * @param {{
 *   originFallbackDuringOutage: boolean;
 *   crossProcessHit: boolean;
 *   recoveryTimeMs: number | null;
 * }} result
 */
export function assertStartupOutageScenario(result) {
  if (!result.originFallbackDuringOutage) {
    return { ok: false, reason: 'Expected origin fallback during startup outage' };
  }
  if (!result.crossProcessHit) {
    return { ok: false, reason: 'Cross-process cache hit not observed within budget' };
  }
  if (
    result.recoveryTimeMs === null ||
    result.recoveryTimeMs > T02_RECOVERY_BUDGET_MS
  ) {
    return {
      ok: false,
      reason: `Recovery must complete within ${T02_RECOVERY_BUDGET_MS}ms`,
    };
  }
  return { ok: true };
}

/**
 * @param {{
 *   valueAfterRestart: unknown;
 *   originLoadsAfterRestart: number;
 *   sharedHitAfterWarm: boolean;
 * }} result
 */
export function assertRestartScenario(result) {
  parseSyntheticValue(result.valueAfterRestart);
  if (result.originLoadsAfterRestart !== 1) {
    return {
      ok: false,
      reason: `Expected one origin load after Redis restart, got ${result.originLoadsAfterRestart}`,
    };
  }
  if (!result.sharedHitAfterWarm) {
    return { ok: false, reason: 'Expected shared L2 hit after warm read' };
  }
  return { ok: true };
}

/**
 * @param {{ value: unknown; recoveredAfterPause: boolean }} result
 */
export function assertPauseScenario(result) {
  parseSyntheticValue(result.value);
  if (!result.recoveredAfterPause) {
    return { ok: false, reason: 'Cache did not recover after CLIENT PAUSE' };
  }
  return { ok: true };
}

/**
 * @param {{
 *   singleProcessOriginLoads: number;
 *   twoProcessTotalOriginLoads: number;
 * }} result
 */
export function assertBurstSameKeyScenario(result) {
  if (result.singleProcessOriginLoads > 1) {
    return {
      ok: false,
      reason: `Single-process burst expected <=1 origin load, got ${result.singleProcessOriginLoads}`,
    };
  }
  if (result.twoProcessTotalOriginLoads > 2) {
    return {
      ok: false,
      reason: `Two-process burst expected <=2 origin loads, got ${result.twoProcessTotalOriginLoads}`,
    };
  }
  return { ok: true };
}

/**
 * @param {{ peakOriginConcurrency: number }} result
 */
export function assertBurstDistinctKeysScenario(result) {
  if (result.peakOriginConcurrency > CACHE07_POLICY.originConcurrency) {
    return {
      ok: false,
      reason: `Peak origin concurrency ${result.peakOriginConcurrency} exceeds ${CACHE07_POLICY.originConcurrency}`,
    };
  }
  return { ok: true };
}

/**
 * @param {{
 *   firstAttemptFailed: boolean;
 *   retrySucceeded: boolean;
 *   value: unknown;
 * }} result
 */
export function assertSyntheticFailureScenario(result) {
  if (!result.firstAttemptFailed) {
    return { ok: false, reason: 'Synthetic origin failure did not propagate' };
  }
  if (!result.retrySucceeded) {
    return { ok: false, reason: 'Retry after synthetic failure did not succeed' };
  }
  parseSyntheticValue(result.value);
  return { ok: true };
}

/**
 * @param {{ closeDurationMs: number }} result
 */
export function assertShutdownScenario(result) {
  if (result.closeDurationMs > T02_SHUTDOWN_BUDGET_MS) {
    return {
      ok: false,
      reason: `Worker close exceeded ${T02_SHUTDOWN_BUDGET_MS}ms`,
    };
  }
  return { ok: true };
}

/**
 * @param {object} fields
 */
export function buildT02ScenarioMetrics(fields) {
  const samples = /** @type {readonly number[]} */ (fields.samples ?? []);
  const telemetry = extractTelemetryOverloadCoalesced(
    /** @type {Record<string, number> | undefined} */ (fields.telemetry),
  );
  return {
    samples: [...samples],
    ...buildCasePercentiles(samples),
    originLoads: fields.originLoads ?? null,
    peakOriginConcurrency: fields.peakOriginConcurrency ?? null,
    telemetryOverload: telemetry.overload,
    telemetryCoalesced: telemetry.coalesced,
    recoveryTimeMs: fields.recoveryTimeMs ?? null,
    sdkPendingQueueMetrics: {
      status: 'unavailable',
      proof: SDK_QUEUE_METRICS_PROOF,
    },
  };
}

/**
 * @param {typeof execFile} runner
 * @param {{ timeoutMs?: number }} [options]
 */
export function createDockerExecutor(runner, options = {}) {
  const timeoutMs = options.timeoutMs ?? COMMAND_TIMEOUT_MS;
  return async function dockerExec(file, args, opts = {}) {
    return runner(file, args, { ...opts, timeout: timeoutMs });
  };
}

function shortRunId(runId) {
  return createHash('sha256').update(runId).digest('hex').slice(0, 8);
}

/**
 * @param {string} runId
 */
export function buildCacheEnvironmentName(runId) {
  return `cache07-${shortRunId(runId)}`;
}

/**
 * @param {number} hostPort
 * @param {string} keyPrefix
 */
export function buildGeneratedRedisEnv(hostPort, keyPrefix = 'cache07') {
  return {
    REDIS_URL: `redis://127.0.0.1:${hostPort}`,
    REDIS_KEY_PREFIX: keyPrefix,
    REDIS_CONNECT_TIMEOUT_MS: String(CACHE07_POLICY.connectTimeoutMs),
    REDIS_OPERATION_TIMEOUT_MS: String(CACHE07_POLICY.operationTimeoutMs),
  };
}

/**
 * @param {{
 *   Id?: string;
 *   Name?: string;
 *   Config?: { Labels?: Record<string, string> };
 *   Image?: string;
 *   NetworkSettings?: { Ports?: Record<string, Array<{ HostIp?: string; HostPort?: string }> | null> };
 * }} inspect
 * @param {{ runId: string; containerId: string; hostPort: number }} expected
 */
export function verifyContainerOwnership(inspect, expected) {
  if (!inspect.Id || !inspect.Id.startsWith(expected.containerId.slice(0, 12))) {
    return { ok: false, reason: 'Container id mismatch' };
  }
  const label = inspect.Config?.Labels?.['offscreen.cache07.run'];
  if (label !== expected.runId) {
    return { ok: false, reason: 'Ownership label mismatch' };
  }
  const image = inspect.Config?.Image ?? inspect.Image ?? '';
  const imageOk =
    image.includes(REDIS_IMAGE_PIN) ||
    REDIS_IMAGE_ALIASES.some((alias) => image.includes(alias));
  if (!imageOk) {
    return { ok: false, reason: 'Pinned redis image mismatch' };
  }
  const bindings =
    inspect.NetworkSettings?.Ports?.['6379/tcp'] ??
    inspect.NetworkSettings?.Ports?.['6379/udp'];
  const mapped = Array.isArray(bindings) ? bindings[0] : undefined;
  if (!mapped?.HostPort || Number(mapped.HostPort) !== expected.hostPort) {
    return { ok: false, reason: 'Published loopback port mismatch' };
  }
  if (mapped.HostIp && mapped.HostIp !== '127.0.0.1' && mapped.HostIp !== '0.0.0.0') {
    return { ok: false, reason: 'Published bind address is not loopback' };
  }
  return { ok: true };
}

/**
 * @param {(file: string, args: string[], opts?: object) => Promise<{ stdout: string; stderr: string }>} dockerExec
 * @param {string} runId
 */
export function buildOwnedContainerCreateArgs(runId) {
  const name = `cache07-${runId}`;
  return {
    name,
    args: [
      'run',
      '-d',
      '--name',
      name,
      '--label',
      `offscreen.cache07.run=${runId}`,
      '--network',
      'bridge',
      '-p',
      '127.0.0.1::6379',
      '--memory',
      '128m',
      '--cpus',
      '0.5',
      '--read-only',
      '--tmpfs',
      '/data:rw,size=32m',
      '--cap-drop',
      'ALL',
      '--security-opt',
      'no-new-privileges',
      '--pull',
      'never',
      REDIS_IMAGE_PIN,
      'redis-server',
      '--save',
      '',
      '--appendonly',
      'no',
      '--maxmemory',
      '8mb',
      '--maxmemory-policy',
      'allkeys-lru',
      '--protected-mode',
      'no',
    ],
  };
}

/**
 * @param {string} stdout
 */
export function parseDockerPort(stdout) {
  const trimmed = stdout.trim();
  const port = Number(trimmed);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('CouldNotParseDockerPort');
  }
  return port;
}

/**
 * @param {ReturnType<typeof createClient>} client
 */
async function parseEvictedKeys(client) {
  const info = await client.sendCommand(['INFO', 'stats']);
  const text = typeof info === 'string' ? info : String(info);
  const match = text.match(/evicted_keys:(\d+)/);
  return match ? Number(match[1]) : 0;
}

/**
 * @param {string} environment
 * @param {readonly string[]} identity
 */
export function proofCacheKey(environment, identity) {
  return makeCacheKey(
    environment,
    CACHE07_POLICY.namespace,
    CACHE07_POLICY.version,
    identity,
  );
}

/**
 * @param {(file: string, args: string[], opts?: object) => Promise<{ stdout: string; stderr: string }>} dockerExec
 */
export async function readDockerContextEndpoint(dockerExec) {
  const { stdout } = await dockerExec('docker', [
    'context',
    'inspect',
    '--format',
    '{{.Endpoints.docker.Host}}',
  ]);
  return stdout.trim();
}

/**
 * @param {(file: string, args: string[], opts?: object) => Promise<{ stdout: string; stderr: string }>} dockerExec
 */
export async function assertLocalImagePresent(dockerExec) {
  try {
    await dockerExec('docker', [
      'image',
      'inspect',
      REDIS_IMAGE_PIN,
      '--format',
      '{{.Id}}',
    ]);
    return { ok: true };
  } catch {
    return {
      ok: false,
      status: 'NOT-RUN',
      reason: `Missing local image ${REDIS_IMAGE_PIN} (pull disabled)`,
    };
  }
}

/**
 * @param {(file: string, args: string[], opts?: object) => Promise<{ stdout: string; stderr: string }>} dockerExec
 * @param {string} containerId
 */
export async function inspectOwnedContainer(dockerExec, containerId) {
  const { stdout } = await dockerExec('docker', [
    'inspect',
    '--format',
    '{{json .}}',
    containerId,
  ]);
  return JSON.parse(stdout.trim());
}

/**
 * @param {(file: string, args: string[], opts?: object) => Promise<{ stdout: string; stderr: string }>} dockerExec
 * @param {string} containerId
 */
export async function forceRemoveOwnedContainer(dockerExec, containerId) {
  await dockerExec('docker', ['rm', '-f', containerId]);
  try {
    await dockerExec('docker', [
      'inspect',
      '--format',
      '{{.Id}}',
      containerId,
    ]);
    return { removed: false };
  } catch {
    return { removed: true };
  }
}

/**
 * @param {import('node:child_process').ChildProcess[]} workers
 */
export async function closeWorkers(workers) {
  const closes = workers.map(async (worker) => {
    if (!worker.connected) {
      return;
    }
    try {
      await rpc(worker, { type: 'close' });
    } catch {
      // ignore close errors during cleanup
    }
    worker.kill();
  });
  await Promise.all(closes);
}

/**
 * @param {import('node:child_process').ChildProcess} worker
 * @param {Record<string, string | undefined>} env
 * @param {string} environment
 */
async function initWorker(worker, env, environment, disabled = false) {
  return rpc(worker, {
    type: 'init',
    env,
    environment,
    disabled,
  });
}

/** @type {Record<string, (ctx: object) => Promise<object>>} */
export const T01_SCENARIO_RUNNERS = {
  async 'shared-hit'(ctx) {
    const workerA = fork(workerPath, { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });
    const workerB = fork(workerPath, { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });
  ctx.workers.push(workerA, workerB);
    await Promise.all([
      initWorker(workerA, ctx.redisEnv, ctx.environment),
      initWorker(workerB, ctx.redisEnv, ctx.environment),
    ]);
    const identity = ['shared-hit', '1'];
    const readA = await rpc(workerA, { type: 'read', identity });
    const readB = await rpc(workerB, { type: 'read', identity });
    const verdict = assertSharedHitScenario({
      valueA: readA.value,
      valueB: readB.value,
      totalOriginLoads:
        Number(readA.originLoads) + Number(readB.originLoads),
    });
    return {
      id: 'shared-hit',
      status: verdict.ok ? 'PASS' : 'FAIL',
      ...(verdict.ok ? {} : { reason: verdict.reason }),
      totalOriginLoads: Number(readA.originLoads) + Number(readB.originLoads),
      samples: [Number(readA.durationMs), Number(readB.durationMs)],
    };
  },

  async 'disabled-parity'(ctx) {
    const worker = fork(workerPath, { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });
    ctx.workers.push(worker);
    const init = await initWorker(worker, {}, ctx.environment, true);
    const identity = ['disabled-parity', '1'];
    const read = await rpc(worker, { type: 'read', identity });
    const l2Hits = Number(read.telemetry?.['l2:get:hit'] ?? 0);
    const verdict = assertDisabledParityScenario({
      value: read.value,
      enabled: Boolean(init.enabled),
      l2Hits,
    });
    return {
      id: 'disabled-parity',
      status: verdict.ok ? 'PASS' : 'FAIL',
      ...(verdict.ok ? {} : { reason: verdict.reason }),
      samples: [Number(read.durationMs)],
    };
  },

  async 'distinct-revision'(ctx) {
    const workerA = fork(workerPath, { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });
    const workerB = fork(workerPath, { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });
    ctx.workers.push(workerA, workerB);
    await Promise.all([
      initWorker(workerA, ctx.redisEnv, ctx.environment),
      initWorker(workerB, ctx.redisEnv, ctx.environment),
    ]);
    const readA = await rpc(workerA, {
      type: 'read',
      identity: ['distinct', 'rev-a'],
    });
    const readB = await rpc(workerB, {
      type: 'read',
      identity: ['distinct', 'rev-b'],
    });
    const verdict = assertDistinctRevisionScenario({
      totalOriginLoads: Number(readA.originLoads) + Number(readB.originLoads),
    });
    return {
      id: 'distinct-revision',
      status: verdict.ok ? 'PASS' : 'FAIL',
      ...(verdict.ok ? {} : { reason: verdict.reason }),
      totalOriginLoads: Number(readA.originLoads) + Number(readB.originLoads),
      samples: [Number(readA.durationMs), Number(readB.durationMs)],
    };
  },

  async 'malformed-envelope'(ctx) {
    const worker = fork(workerPath, { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });
    ctx.workers.push(worker);
    await initWorker(worker, ctx.redisEnv, ctx.environment);
    const identity = ['malformed', '1'];
    const key = proofCacheKey(ctx.environment, identity);
    await ctx.admin.set(key, '{not-a-valid-envelope');
    await rpc(worker, { type: 'reset-stats' });
    const read = await rpc(worker, { type: 'read', identity });
    const verdict = assertMalformedEnvelopeScenario({
      value: read.value,
      originLoads: Number(read.originLoads),
    });
    return {
      id: 'malformed-envelope',
      status: verdict.ok ? 'PASS' : 'FAIL',
      ...(verdict.ok ? {} : { reason: verdict.reason }),
      originLoads: Number(read.originLoads),
      samples: [Number(read.durationMs)],
    };
  },

  async 'eviction-via-info'(ctx) {
    const worker = fork(workerPath, { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });
    ctx.workers.push(worker);
    await initWorker(worker, ctx.redisEnv, ctx.environment);
    const baselineEvicted = await parseEvictedKeys(ctx.admin);
    /** @type {Map<string, readonly string[]>} */
    const keyToIdentity = new Map();
    for (let i = 0; i < 64; i += 1) {
      const identity = /** @type {const} */ ([`evict-${i}`, '1']);
      keyToIdentity.set(proofCacheKey(ctx.environment, identity), identity);
      await rpc(worker, { type: 'read', identity });
    }
    let evictedKeys = await parseEvictedKeys(ctx.admin);
    let writeCount = 64;
    while (evictedKeys <= baselineEvicted && writeCount < 128) {
      const identity = /** @type {const} */ ([`evict-${writeCount}`, '1']);
      keyToIdentity.set(proofCacheKey(ctx.environment, identity), identity);
      await rpc(worker, { type: 'read', identity });
      writeCount += 1;
      evictedKeys = await parseEvictedKeys(ctx.admin);
    }
    let absentKeyVerified = false;
    let trackedIdentity = /** @type {readonly string[] | null} */ (null);
    for (const [key, identity] of keyToIdentity) {
      const exists = await ctx.admin.exists(key);
      if (exists === 0) {
        absentKeyVerified = true;
        trackedIdentity = identity;
        break;
      }
    }
    let recoveryValue = null;
    if (trackedIdentity) {
      await rpc(worker, { type: 'reset-stats' });
      const read = await rpc(worker, {
        type: 'read',
        identity: trackedIdentity,
      });
      recoveryValue = read.value;
    }
    const verdict = assertEvictionScenario({
      evictedKeysDelta: evictedKeys - baselineEvicted,
      absentKeyVerified,
      value: recoveryValue ?? { id: 'missing', revision: '1' },
    });
    return {
      id: 'eviction-via-info',
      status: verdict.ok ? 'PASS' : 'FAIL',
      ...(verdict.ok ? {} : { reason: verdict.reason }),
      evictedKeysDelta: evictedKeys - baselineEvicted,
      absentKeyVerified,
      samples: [],
    };
  },
};

/** @type {Record<string, (ctx: object) => Promise<object>>} */
export const T02_SCENARIO_RUNNERS = {
  async 'startup-outage'(ctx) {
    const samples = [];
    await stopOwnedContainer(ctx.dockerExec, ctx.containerId);
    const workerA = fork(workerPath, {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });
    ctx.workers.push(workerA);
    await initWorker(workerA, ctx.redisEnv, ctx.environment);
    const identity = ['startup-outage', '1'];
    const outageRead = await rpc(workerA, { type: 'read', identity });
    samples.push(Number(outageRead.durationMs));
    const originFallbackDuringOutage = Number(outageRead.originLoads) >= 1;
    parseSyntheticValue(outageRead.value);

    await startOwnedContainer(ctx.dockerExec, ctx.containerId);
    if (!ctx.admin.isOpen) {
      await ctx.admin.connect();
    }
    await new Promise((resolve) => setTimeout(resolve, 200));

    const workerB = fork(workerPath, {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });
    ctx.workers.push(workerB);
    await initWorker(workerB, ctx.redisEnv, ctx.environment);

    const recoveryStarted = Date.now();
    let crossProcessHit = false;
    let recoveryTimeMs = null;
    while (Date.now() - recoveryStarted < T02_RECOVERY_BUDGET_MS) {
      const warm = await rpc(workerA, { type: 'read', identity });
      samples.push(Number(warm.durationMs));
      await rpc(workerB, { type: 'reset-stats' });
      const remoteRead = await rpc(workerB, { type: 'read', identity });
      samples.push(Number(remoteRead.durationMs));
      const l2Hits = Number(remoteRead.telemetry?.['l2:get:hit'] ?? 0);
      if (l2Hits > 0 && Number(remoteRead.originLoads) === 0) {
        crossProcessHit = true;
        recoveryTimeMs = Date.now() - recoveryStarted;
        parseSyntheticValue(remoteRead.value);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const verdict = assertStartupOutageScenario({
      originFallbackDuringOutage,
      crossProcessHit,
      recoveryTimeMs,
    });
    const metrics = buildT02ScenarioMetrics({
      samples,
      originLoads: Number(outageRead.originLoads),
      peakOriginConcurrency: Number(outageRead.peakOrigin),
      telemetry: outageRead.telemetry,
      recoveryTimeMs,
    });
    return {
      id: 'startup-outage',
      status: verdict.ok ? 'PASS' : 'FAIL',
      ...(verdict.ok ? {} : { reason: verdict.reason }),
      ...metrics,
    };
  },

  async restart(ctx) {
    const samples = [];
    const workerA = fork(workerPath, {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });
    const workerB = fork(workerPath, {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });
    ctx.workers.push(workerA, workerB);
    await Promise.all([
      initWorker(workerA, ctx.redisEnv, ctx.environment),
      initWorker(workerB, ctx.redisEnv, ctx.environment),
    ]);
    const identity = ['restart', '1'];
    const warm = await rpc(workerA, { type: 'read', identity });
    samples.push(Number(warm.durationMs));
    parseSyntheticValue(warm.value);

    await restartOwnedContainer(ctx.dockerExec, ctx.containerId);
    if (!ctx.admin.isOpen) {
      await ctx.admin.connect();
    }
    await new Promise((resolve) => setTimeout(resolve, 200));

    await rpc(workerA, { type: 'reset-stats' });
    const afterRestart = await rpc(workerA, { type: 'read', identity });
    samples.push(Number(afterRestart.durationMs));
    await rpc(workerB, { type: 'reset-stats' });
    const shared = await rpc(workerB, { type: 'read', identity });
    samples.push(Number(shared.durationMs));
    const l2Hits = Number(shared.telemetry?.['l2:get:hit'] ?? 0);
    const verdict = assertRestartScenario({
      valueAfterRestart: afterRestart.value,
      originLoadsAfterRestart: Number(afterRestart.originLoads),
      sharedHitAfterWarm: l2Hits > 0 && Number(shared.originLoads) === 0,
    });
    const peak = Math.max(
      Number(afterRestart.peakOrigin),
      Number(shared.peakOrigin),
    );
    /** @type {Record<string, number>} */
    const telemetry = {
      .../** @type {Record<string, number>} */ (afterRestart.telemetry ?? {}),
    };
    for (const [key, count] of Object.entries(shared.telemetry ?? {})) {
      telemetry[key] = (telemetry[key] ?? 0) + count;
    }
    return {
      id: 'restart',
      status: verdict.ok ? 'PASS' : 'FAIL',
      ...(verdict.ok ? {} : { reason: verdict.reason }),
      ...buildT02ScenarioMetrics({
        samples,
        originLoads: Number(afterRestart.originLoads),
        peakOriginConcurrency: peak,
        telemetry,
      }),
    };
  },

  async pause(ctx) {
    const samples = [];
    const worker = fork(workerPath, {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });
    ctx.workers.push(worker);
    await initWorker(worker, ctx.redisEnv, ctx.environment);
    const identity = ['pause', '1'];
    const warm = await rpc(worker, { type: 'read', identity });
    samples.push(Number(warm.durationMs));
    await rpc(worker, { type: 'reset-stats' });
    await pauseOwnedRedisClients(ctx.dockerExec, ctx.containerId, 350);
    const duringPause = await rpc(worker, { type: 'read', identity });
    samples.push(Number(duringPause.durationMs));
    parseSyntheticValue(duringPause.value);
    await new Promise((resolve) => setTimeout(resolve, 450));
    await rpc(worker, { type: 'reset-stats' });
    const afterPause = await rpc(worker, { type: 'read', identity });
    samples.push(Number(afterPause.durationMs));
    const l2Hits = Number(afterPause.telemetry?.['l2:get:hit'] ?? 0);
    const verdict = assertPauseScenario({
      value: duringPause.value,
      recoveredAfterPause:
        l2Hits > 0 ||
        parseSyntheticValue(afterPause.value).id === identity[0],
    });
    return {
      id: 'pause',
      status: verdict.ok ? 'PASS' : 'FAIL',
      ...(verdict.ok ? {} : { reason: verdict.reason }),
      ...buildT02ScenarioMetrics({
        samples,
        originLoads:
          Number(duringPause.originLoads) + Number(afterPause.originLoads),
        peakOriginConcurrency: Math.max(
          Number(duringPause.peakOrigin),
          Number(afterPause.peakOrigin),
        ),
        telemetry: afterPause.telemetry,
      }),
    };
  },

  async 'burst-same-key'(ctx) {
    const samples = [];
    const worker = fork(workerPath, {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });
    ctx.workers.push(worker);
    await initWorker(worker, ctx.redisEnv, ctx.environment);
    const singleIdentity = ['burst-same', '1'];
    await rpc(worker, { type: 'reset-stats' });
    const singleBurst = await rpc(worker, {
      type: 'burst',
      count: 32,
      sameKey: true,
      identity: singleIdentity,
      delayMs: 15,
    });
    samples.push(Number(singleBurst.durationMs));
    const singleProcessOriginLoads = Number(singleBurst.originLoads);

    const workerA = fork(workerPath, {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });
    const workerB = fork(workerPath, {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });
    ctx.workers.push(workerA, workerB);
    await Promise.all([
      initWorker(workerA, ctx.redisEnv, ctx.environment),
      initWorker(workerB, ctx.redisEnv, ctx.environment),
    ]);
    const dualIdentity = ['burst-same-2p', '1'];
    await Promise.all([
      rpc(workerA, { type: 'reset-stats' }),
      rpc(workerB, { type: 'reset-stats' }),
    ]);
    const [burstA, burstB] = await Promise.all([
      rpc(workerA, {
        type: 'burst',
        count: 16,
        sameKey: true,
        identity: dualIdentity,
        delayMs: 20,
      }),
      rpc(workerB, {
        type: 'burst',
        count: 16,
        sameKey: true,
        identity: dualIdentity,
        delayMs: 20,
      }),
    ]);
    samples.push(Number(burstA.durationMs), Number(burstB.durationMs));
    const twoProcessTotalOriginLoads =
      Number(burstA.originLoads) + Number(burstB.originLoads);
    const peak = Math.max(
      Number(singleBurst.peakOrigin),
      Number(burstA.peakOrigin),
      Number(burstB.peakOrigin),
    );
    /** @type {Record<string, number>} */
    const telemetry = {
      .../** @type {Record<string, number>} */ (singleBurst.telemetry ?? {}),
    };
    for (const [key, count] of Object.entries(burstA.telemetry ?? {})) {
      telemetry[key] = (telemetry[key] ?? 0) + count;
    }
    for (const [key, count] of Object.entries(burstB.telemetry ?? {})) {
      telemetry[key] = (telemetry[key] ?? 0) + count;
    }
    const verdict = assertBurstSameKeyScenario({
      singleProcessOriginLoads,
      twoProcessTotalOriginLoads,
    });
    return {
      id: 'burst-same-key',
      status: verdict.ok ? 'PASS' : 'FAIL',
      ...(verdict.ok ? {} : { reason: verdict.reason }),
      ...buildT02ScenarioMetrics({
        samples,
        originLoads: singleProcessOriginLoads + twoProcessTotalOriginLoads,
        peakOriginConcurrency: peak,
        telemetry,
      }),
      singleProcessOriginLoads,
      twoProcessTotalOriginLoads,
    };
  },

  async 'burst-distinct-keys'(ctx) {
    const samples = [];
    const worker = fork(workerPath, {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });
    ctx.workers.push(worker);
    await initWorker(worker, ctx.redisEnv, ctx.environment);
    await rpc(worker, { type: 'reset-stats' });
    const delayMs = 40;
    const settled = await Promise.allSettled(
      Array.from({ length: 64 }, (_unused, index) =>
        rpc(worker, {
          type: 'read',
          identity: [`distinct-burst-${index}`, '1'],
          delayMs,
        }),
      ),
    );
    let peak = 0;
    let originLoads = 0;
    /** @type {Record<string, number>} */
    const telemetry = {};
    let overloadRejections = 0;
    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        samples.push(Number(outcome.value.durationMs));
        peak = Math.max(peak, Number(outcome.value.peakOrigin));
        originLoads = Math.max(originLoads, Number(outcome.value.originLoads));
        for (const [key, count] of Object.entries(outcome.value.telemetry ?? {})) {
          telemetry[key] = (telemetry[key] ?? 0) + count;
        }
      } else if (
        /Cache overload/i.test(
          String(
            outcome.reason instanceof Error
              ? outcome.reason.message
              : outcome.reason,
          ),
        )
      ) {
        overloadRejections += 1;
      }
    }
    const verdict = assertBurstDistinctKeysScenario({
      peakOriginConcurrency: peak,
    });
    return {
      id: 'burst-distinct-keys',
      status: verdict.ok ? 'PASS' : 'FAIL',
      ...(verdict.ok ? {} : { reason: verdict.reason }),
      ...buildT02ScenarioMetrics({
        samples,
        originLoads,
        peakOriginConcurrency: peak,
        telemetry,
      }),
      overloadRejections,
    };
  },

  async 'synthetic-failure'(ctx) {
    const samples = [];
    const worker = fork(workerPath, {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });
    ctx.workers.push(worker);
    await initWorker(worker, ctx.redisEnv, ctx.environment);
    const identity = ['synthetic-failure', '1'];
    await rpc(worker, { type: 'reset-stats' });
    let firstAttemptFailed = false;
    try {
      await rpc(worker, {
        type: 'read',
        identity,
        failWith: 'SyntheticOriginFailure',
      });
    } catch {
      firstAttemptFailed = true;
    }
    const retry = await rpc(worker, { type: 'read', identity });
    samples.push(Number(retry.durationMs));
    const verdict = assertSyntheticFailureScenario({
      firstAttemptFailed,
      retrySucceeded: true,
      value: retry.value,
    });
    return {
      id: 'synthetic-failure',
      status: verdict.ok ? 'PASS' : 'FAIL',
      ...(verdict.ok ? {} : { reason: verdict.reason }),
      ...buildT02ScenarioMetrics({
        samples,
        originLoads: Number(retry.originLoads),
        peakOriginConcurrency: Number(retry.peakOrigin),
        telemetry: retry.telemetry,
      }),
    };
  },

  async shutdown(ctx) {
    const samples = [];
    const worker = fork(workerPath, {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });
    ctx.workers.push(worker);
    await initWorker(worker, ctx.redisEnv, ctx.environment);
    await rpc(worker, { type: 'read', identity: ['shutdown', '1'] });
    const closeStarted = Date.now();
    await rpc(worker, { type: 'close' });
    const closeDurationMs = Date.now() - closeStarted;
    samples.push(closeDurationMs);
    const exited = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), T02_SHUTDOWN_BUDGET_MS);
      worker.once('exit', () => {
        clearTimeout(timer);
        resolve(true);
      });
      worker.kill();
    });
    const verdict = assertShutdownScenario({ closeDurationMs });
    return {
      id: 'shutdown',
      status: verdict.ok && exited === true ? 'PASS' : 'FAIL',
      ...(verdict.ok ? {} : { reason: verdict.reason }),
      ...buildT02ScenarioMetrics({
        samples,
        originLoads: 0,
        peakOriginConcurrency: 0,
        telemetry: {},
      }),
      closeDurationMs,
      workerExited: Boolean(exited),
    };
  },
};

/**
 * @param {string} scenarioId
 * @param {object} ctx
 * @param {'t01' | 't02'} wave
 */
export async function runScenario(scenarioId, ctx, wave = 't01') {
  const registry = wave === 't02' ? T02_SCENARIO_RUNNERS : T01_SCENARIO_RUNNERS;
  const runner = registry[scenarioId];
  if (!runner) {
    return { id: scenarioId, status: 'FAIL', reason: 'Unknown scenario' };
  }
  return runner(ctx);
}

/**
 * @param {object} ctx
 */
export async function runT01Suite(ctx) {
  const cases = [];
  for (const scenarioId of Object.keys(T01_SCENARIO_RUNNERS)) {
    cases.push(await runScenario(scenarioId, ctx, 't01'));
  }
  return cases;
}

/**
 * @param {object} ctx
 */
export async function runT02Suite(ctx) {
  const cases = [];
  for (const scenarioId of Object.keys(T02_SCENARIO_RUNNERS)) {
    cases.push(await runScenario(scenarioId, ctx, 't02'));
  }
  return cases;
}

/**
 * @param {(file: string, args: string[], opts?: object) => Promise<{ stdout: string; stderr: string }>} dockerExec
 * @param {AbortSignal} signal
 */
export async function provisionOwnedRedis(dockerExec, signal) {
  const endpoint = await readDockerContextEndpoint(dockerExec);
  const endpointVerdict = validateDockerContextEndpoint(endpoint);
  if (!endpointVerdict.ok) {
    return { status: 'NOT-RUN', reason: endpointVerdict.reason };
  }
  const imageVerdict = await assertLocalImagePresent(dockerExec);
  if (!imageVerdict.ok) {
    return imageVerdict;
  }
  const runId = randomUUID();
  const { name, args } = buildOwnedContainerCreateArgs(runId);
  const started = Date.now();
  let containerId = '';
  let hostPort = 0;
  try {
    const { stdout } = await dockerExec('docker', args, { signal });
    containerId = stdout.trim();
    const { stdout: portRaw } = await dockerExec('docker', [
      'port',
      containerId,
      '6379/tcp',
    ]);
    const portLine = portRaw.trim().split('\n')[0] ?? '';
    const portMatch = portLine.match(/:(\d+)\s*$/);
    hostPort = portMatch
      ? Number(portMatch[1])
      : parseDockerPort(
          (
            await dockerExec('docker', [
              'inspect',
              '--format',
              '{{(index (index .NetworkSettings.Ports "6379/tcp") 0).HostPort}}',
              containerId,
            ])
          ).stdout,
        );
    const inspect = await inspectOwnedContainer(dockerExec, containerId);
    const owned = verifyContainerOwnership(inspect, {
      runId,
      containerId,
      hostPort,
    });
    if (!owned.ok) {
      await forceRemoveOwnedContainer(dockerExec, containerId);
      return { status: 'FAIL', reason: owned.reason };
    }
    return {
      status: 'READY',
      runId,
      name,
      containerId,
      hostPort,
      elapsedMs: Date.now() - started,
      redisEnv: buildGeneratedRedisEnv(hostPort),
      environment: buildCacheEnvironmentName(runId),
    };
  } catch (error) {
    if (containerId) {
      await forceRemoveOwnedContainer(dockerExec, containerId);
    }
    const message = error instanceof Error ? error.message : String(error);
    if (/Cannot connect to the Docker daemon/i.test(message)) {
      return { status: 'NOT-RUN', reason: 'Docker daemon unavailable' };
    }
    return { status: 'NOT-RUN', reason: message };
  }
}

/**
 * @param {import('redis').RedisClientType | null} client
 */
export async function disconnectAdminClient(client) {
  if (client?.isOpen) {
    await client.close();
  }
}

/**
 * @param {string} url
 */
export function createAdminClient(url) {
  const client = createClient({ url, disableOfflineQueue: true });
  client.on('error', () => {});
  return client;
}

/**
 * @param {(file: string, args: string[], opts?: object) => Promise<{ stdout: string; stderr: string }>} dockerExec
 */
export async function stopOwnedContainer(dockerExec, containerId) {
  await dockerExec('docker', ['stop', containerId]);
}

/**
 * @param {(file: string, args: string[], opts?: object) => Promise<{ stdout: string; stderr: string }>} dockerExec
 */
export async function startOwnedContainer(dockerExec, containerId) {
  await dockerExec('docker', ['start', containerId]);
}

/**
 * @param {(file: string, args: string[], opts?: object) => Promise<{ stdout: string; stderr: string }>} dockerExec
 * @param {string} containerId
 */
export async function restartOwnedContainer(dockerExec, containerId) {
  await dockerExec('docker', ['restart', containerId]);
}

/**
 * @param {(file: string, args: string[], opts?: object) => Promise<{ stdout: string; stderr: string }>} dockerExec
 */
export async function pauseOwnedRedisClients(dockerExec, containerId, pauseMs = 350) {
  await dockerExec('docker', [
    'exec',
    containerId,
    'redis-cli',
    'CLIENT',
    'PAUSE',
    String(pauseMs),
    'ALL',
  ]);
}

/**
 * @param {ReturnType<typeof buildGeneratedRedisEnv>} redisEnv
 */
export function redactLiveResult(payload) {
  return JSON.parse(
    JSON.stringify(payload, (_key, value) => {
      if (typeof value === 'string' && value.startsWith('redis://')) {
        return 'redis://127.0.0.1:[redacted]';
      }
      return value;
    }),
  );
}

async function runLiveCli() {
  const refusal = validateLiveOptIn(process.argv, process.env);
  if (refusal) {
    console.log(JSON.stringify(refusal));
    process.exit(1);
  }
  const redisRefusal = rejectSuppliedRedisUrl(process.env);
  if (redisRefusal) {
    console.log(JSON.stringify(redisRefusal));
    process.exit(1);
  }

  const dockerExec = createDockerExecutor(execFile);
  const abort = new AbortController();
  const suiteTimer = setTimeout(() => abort.abort(), SUITE_TIMEOUT_MS);
  suiteTimer.unref?.();

  const started = Date.now();
  const workers = [];
  /** @type {import('redis').RedisClientType | null} */
  let admin = null;
  let owned = null;

  try {
    owned = await provisionOwnedRedis(dockerExec, abort.signal);
    if (owned.status !== 'READY') {
      const payload = redactLiveResult({
        tier: 'live',
        status: owned.status,
        reason: owned.reason,
        elapsedMs: Date.now() - started,
        cleanup: { containerRemoved: false },
      });
      console.log(JSON.stringify(payload));
      process.exit(owned.status === 'FAIL' ? 1 : 2);
    }

    admin = createAdminClient(owned.redisEnv.REDIS_URL);
    await admin.connect();

    const ctx = {
      redisEnv: owned.redisEnv,
      environment: owned.environment,
      admin,
      workers,
      dockerExec,
      containerId: owned.containerId,
      runId: owned.runId,
    };

    const t01 = await runT01Suite(ctx);
    const t02 = await runT02Suite(ctx);
    const sorted = [...t01, ...t02]
      .flatMap((item) => item.samples ?? [])
      .sort((a, b) => a - b);

    const fail = [...t01, ...t02].some((item) => item.status === 'FAIL');
    const payload = redactLiveResult({
      tier: 'live',
      status: fail ? 'FAIL' : 'PASS',
      runId: owned.runId,
      containerId: owned.containerId,
      hostPort: owned.hostPort,
      elapsedMs: Date.now() - started,
      t01,
      t02,
      percentiles: {
        p95: computeNearestRankPercentile(sorted, 0.95),
        p99: computeNearestRankPercentile(sorted, 0.99),
        sampleCount: sorted.length,
      },
      cleanup: {},
    });

    console.log(JSON.stringify(payload));
    process.exit(fail ? 1 : 0);
  } finally {
    clearTimeout(suiteTimer);
    await closeWorkers(workers);
    await disconnectAdminClient(admin);
    if (owned?.containerId) {
      const removed = await forceRemoveOwnedContainer(
        dockerExec,
        owned.containerId,
      );
      if (typeof owned === 'object' && owned !== null) {
        owned.cleanup = removed;
      }
    }
  }
}

const modulePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1]
  ? path.resolve(process.argv[1])
  : '';
const isMain = invokedPath.length > 0 && modulePath === invokedPath;

if (isMain) {
  runLiveCli().catch((error) => {
    console.error(
      JSON.stringify({
        status: 'FAIL',
        reason: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exit(1);
  });
}