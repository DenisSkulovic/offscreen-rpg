import { createHash, randomUUID } from 'node:crypto';
import { fork } from 'node:child_process';
import console from 'node:console';
import path from 'node:path';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';
import { URL, fileURLToPath } from 'node:url';
import { makeCacheKey } from '@offscreen/cache/core';

import { runBounded } from '../../../../tools/verification/resources/postgres/docker.mjs';
import {
  CLEANUP_TIMEOUT_MS,
  pauseOwnedRedisClients as pauseOwnedRedisClientsResource,
  RECOVERY_VERIFICATION_PROFILE,
  restartOwnedRedisDockerContainer,
  sanitizeRedisResourcePublicFacts,
  stopStartOwnedRedisDockerContainer,
  waitForRedisPing,
} from '../../../../tools/verification/resources/redis/docker.mjs';
import { VERIFY_RUNTIME_USER } from '../../../../tools/verification/resources/redis/docker-plan.mjs';

import { parseSyntheticValue } from './worker.mjs';

const workerPath = fileURLToPath(new URL('./worker.mjs', import.meta.url));

export const LEGACY_LIVE_VERIFY_COMMAND = 'pnpm verify package cache --live';
export const WORKER_RPC_DEADLINE_MS = 5_000;
export const WORKER_GRACEFUL_EXIT_MS = 5_000;
export const WORKER_TERMINATE_MS = 2_000;
export const WORKER_OUTPUT_DRAIN_BYTES = 64_000;

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
 * @param {string[]} [argv]
 * @param {NodeJS.ProcessEnv} [env]
 */
export function validateLiveOptIn(argv = [], env = {}) {
  void env;
  return refuseLegacyLiveHarnessInvocation(argv);
}

/**
 * @param {string[]} [argv]
 */
export function refuseLegacyLiveHarnessInvocation(argv = []) {
  const legacyAttempt = argv.includes('--live');
  return {
    status: 'NOT-RUN',
    reason: legacyAttempt
      ? 'legacy-harness-live-retired'
      : 'legacy-harness-cli-retired',
    verifyCommand: LEGACY_LIVE_VERIFY_COMMAND,
  };
}

/**
 * @param {NodeJS.ProcessEnv} env
 */
export function rejectSuppliedRedisUrl(env) {
  if (typeof env.REDIS_URL === 'string' && env.REDIS_URL.length > 0) {
    return {
      status: 'FAIL',
      reason: 'supplied-redis-url-rejected',
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
    return {
      ok: false,
      reason: 'Disabled scenario must not report Redis hits',
    };
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
    return {
      ok: false,
      reason: 'Previously populated key still present in Redis',
    };
  }
  parseSyntheticValue(result.value);
  return { ok: true };
}

export const T02_RECOVERY_BUDGET_MS = 25_000;
export const T02_SHUTDOWN_BUDGET_MS = 5_000;
export const SDK_QUEUE_METRICS_PROOF =
  'packages/cache/src/single-flight.test.ts';

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
    return {
      ok: false,
      reason: 'Expected origin fallback during startup outage',
    };
  }
  if (!result.crossProcessHit) {
    return {
      ok: false,
      reason: 'Cross-process cache hit not observed within budget',
    };
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
    return {
      ok: false,
      reason: 'Retry after synthetic failure did not succeed',
    };
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

export class WorkerRpcError extends Error {
  /**
   * @param {string} code
   */
  constructor(code) {
    super(code);
    this.name = 'WorkerRpcError';
    this.code = code;
  }
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
 *   host: string,
 *   port: number,
 *   runtimeUser?: string,
 *   runtimePassword: string,
 *   keyNamespace: string,
 * }} input
 */
export function buildAuthenticatedWorkerRedisEnv(input) {
  const user = encodeURIComponent(input.runtimeUser ?? VERIFY_RUNTIME_USER);
  const pass = encodeURIComponent(input.runtimePassword);
  return {
    REDIS_URL: `redis://${user}:${pass}@${input.host}:${input.port}`,
    REDIS_KEY_PREFIX: input.keyNamespace,
    REDIS_CONNECT_TIMEOUT_MS: String(CACHE07_POLICY.connectTimeoutMs),
    REDIS_OPERATION_TIMEOUT_MS: String(CACHE07_POLICY.operationTimeoutMs),
  };
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

function cleanChildProcessEnv() {
  const env = { ...process.env };
  delete env.REDIS_URL;
  delete env.REDIS_KEY_PREFIX;
  delete env.REDIS_CONNECT_TIMEOUT_MS;
  delete env.REDIS_OPERATION_TIMEOUT_MS;
  delete env.CACHE07_ALLOW_DISPOSABLE_REDIS;
  return env;
}

function drainWorkerStream(stream) {
  if (!stream) return;
  let drained = 0;
  stream.on('data', (chunk) => {
    drained += chunk.length;
    if (drained > WORKER_OUTPUT_DRAIN_BYTES) {
      stream.removeAllListeners('data');
      stream.resume();
    }
  });
}

/**
 * @param {import('node:child_process').ChildProcess} proc
 */
export function createWorkerSession(proc) {
  /** @type {Map<string, {resolve: Function, reject: Function, timer: NodeJS.Timeout}>} */
  const pending = new Map();
  let closed = false;

  function rejectAll(code) {
    for (const [id, entry] of pending.entries()) {
      clearTimeout(entry.timer);
      pending.delete(id);
      entry.reject(new WorkerRpcError(code));
    }
  }

  function onMessage(response) {
    const requestId = String(response?.requestId ?? '');
    const entry = pending.get(requestId);
    if (!entry) return;
    clearTimeout(entry.timer);
    pending.delete(requestId);
    if (response?.ok === false) {
      entry.reject(
        new WorkerRpcError(String(response.outcome ?? 'worker-rpc-rejected')),
      );
      return;
    }
    if (!response || typeof response !== 'object' || response.ok !== true) {
      entry.reject(new WorkerRpcError('worker-rpc-malformed'));
      return;
    }
    entry.resolve(response);
  }

  const onExit = () => rejectAll('worker-exited');
  const onError = () => rejectAll('worker-error');
  const onDisconnect = () => rejectAll('worker-disconnected');

  proc.on('message', onMessage);
  proc.on('exit', onExit);
  proc.on('error', onError);
  proc.on('disconnect', onDisconnect);

  return {
    proc,
    async rpc(message) {
      if (closed) {
        throw new WorkerRpcError('worker-closed');
      }
      const requestId = randomUUID();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(requestId);
          reject(new WorkerRpcError('worker-rpc-timeout'));
        }, WORKER_RPC_DEADLINE_MS);
        timer.unref?.();
        pending.set(requestId, { resolve, reject, timer });
        /** @type {boolean} */
        let sent;
        try {
          sent = Boolean(proc.send({ ...message, requestId }));
        } catch {
          sent = false;
        }
        if (!sent) {
          clearTimeout(timer);
          pending.delete(requestId);
          reject(new WorkerRpcError('worker-send-failed'));
        }
      });
    },
    dispose() {
      if (closed) return;
      closed = true;
      proc.off('message', onMessage);
      proc.off('exit', onExit);
      proc.off('error', onError);
      proc.off('disconnect', onDisconnect);
      rejectAll('worker-closed');
    },
  };
}

export function spawnHarnessWorker() {
  const proc = fork(workerPath, {
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    env: cleanChildProcessEnv(),
  });
  drainWorkerStream(proc.stdout);
  drainWorkerStream(proc.stderr);
  return createWorkerSession(proc);
}

/**
 * @param {ReturnType<typeof createWorkerSession>} session
 */
export async function shutdownHarnessWorker(session) {
  try {
    await session.rpc({ type: 'close' });
  } catch {
    /* proceed to exit wait */
  }
  const proc = session.proc;
  const gracefulExit = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), WORKER_GRACEFUL_EXIT_MS);
    timer.unref?.();
    proc.once('exit', () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
  if (!gracefulExit && proc.exitCode === null) {
    proc.kill('SIGTERM');
    const terminated = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), WORKER_TERMINATE_MS);
      timer.unref?.();
      proc.once('exit', () => {
        clearTimeout(timer);
        resolve(true);
      });
    });
    if (!terminated && proc.exitCode === null) {
      proc.kill('SIGKILL');
      await new Promise((resolve) => {
        proc.once('exit', () => resolve(true));
      });
    }
  }
  session.dispose();
  return { ok: proc.exitCode === 0 };
}

/**
 * @param {ReturnType<typeof createWorkerSession>[]} workers
 */
export async function cleanupWorkerSessions(workers) {
  const outcomes = await Promise.all(
    workers.map(async (session) => {
      try {
        return await shutdownHarnessWorker(session);
      } catch {
        session.dispose();
        return { ok: false };
      }
    }),
  );
  const ok = outcomes.every((outcome) => outcome.ok);
  return { ok, code: ok ? 'cleanup-ok' : 'cleanup-failed' };
}

/**
 * @param {ReturnType<typeof createWorkerSession>} session
 * @param {Record<string, string | undefined>} env
 * @param {string} environment
 * @param {boolean} [disabled]
 */
async function initWorker(session, env, environment, disabled = false) {
  return session.rpc({
    type: 'init',
    env,
    environment,
    disabled,
  });
}

/**
 * @param {object} ctx
 */
async function spawnScenarioWorker(ctx) {
  const session = spawnHarnessWorker();
  ctx.workers.push(session);
  return session;
}

async function reconnectAdminClient(ctx) {
  await disconnectAdminClient(ctx.admin);
  ctx.admin = await ctx.redis.connectAdmin();
  if (
    ctx.admin &&
    typeof ctx.admin.connect === 'function' &&
    !ctx.admin.isOpen
  ) {
    await ctx.admin.connect();
  }
}

/**
 * @param {Record<string, unknown>[]} responses
 */
function mergeStatsDeltaTelemetry(responses) {
  /** @type {Record<string, number>} */
  const telemetry = {};
  for (const response of responses) {
    const delta = /** @type {{ telemetry?: Record<string, number> }} */ (
      response.statsDelta ?? {}
    ).telemetry;
    for (const [key, count] of Object.entries(delta ?? {})) {
      telemetry[key] = (telemetry[key] ?? 0) + count;
    }
  }
  return telemetry;
}

/**
 * @param {{
 *   resource: object,
 *   plan: object,
 *   run: Function,
 *   verificationProfile?: string,
 * }} input
 */
export function createHarnessRedisHandle(input) {
  const { resource, plan, run } = input;
  const verificationProfile =
    input.verificationProfile ?? RECOVERY_VERIFICATION_PROFILE;
  const redisEnv = buildAuthenticatedWorkerRedisEnv({
    host: resource.host,
    port: resource.port,
    runtimeUser: plan.runtimeUser,
    runtimePassword: plan.credentials.runtimePassword,
    keyNamespace: plan.keyNamespace,
  });

  return {
    runId: resource.runId,
    redisEnv,
    publicFacts: sanitizeRedisResourcePublicFacts(resource),
    async connectAdmin() {
      if (!resource.adminObserver?.connectClient) {
        throw new WorkerRpcError('admin-handle-missing');
      }
      const client = await resource.adminObserver.connectClient();
      if (typeof client.on === 'function') {
        client.on('error', () => {});
      }
      return client;
    },
    async disconnectAdmin(client) {
      if (client?.isOpen) {
        await client.close();
      } else if (typeof client?.disconnect === 'function') {
        await client.disconnect().catch(() => {});
      }
    },
    faults: {
      async stop() {
        const stopped = await runBounded(
          'docker',
          ['stop', resource.containerId],
          run,
          CLEANUP_TIMEOUT_MS,
        );
        if (!stopped?.ok) {
          return { ok: false, reason: 'fault-stop-failed' };
        }
        return { ok: true };
      },
      async start() {
        const started = await runBounded(
          'docker',
          ['start', resource.containerId],
          run,
          CLEANUP_TIMEOUT_MS,
        );
        if (!started?.ok) {
          return { ok: false, reason: 'fault-start-failed' };
        }
        const ready = await waitForRedisPing({
          containerId: resource.containerId,
          run,
          deadlineMs: CLEANUP_TIMEOUT_MS,
        });
        if (!ready.ok) {
          return { ok: false, reason: ready.reason ?? 'fault-start-timeout' };
        }
        return { ok: true };
      },
      async stopStart() {
        return stopStartOwnedRedisDockerContainer({
          resource,
          plan,
          verificationProfile,
          run,
        });
      },
      async restart() {
        return restartOwnedRedisDockerContainer({
          resource,
          plan,
          verificationProfile,
          run,
        });
      },
      async pauseClients(pauseMs) {
        return pauseOwnedRedisClientsResource({
          resource,
          plan,
          verificationProfile,
          run,
          pauseMs,
        });
      },
    },
  };
}

/**
 * @param {import('redis').RedisClientType | { isOpen?: boolean, disconnect?: Function, close?: Function } | null} client
 */
export async function disconnectAdminClient(client) {
  if (!client) return;
  if (client.isOpen && typeof client.close === 'function') {
    await client.close();
    return;
  }
  if (typeof client.disconnect === 'function') {
    await client.disconnect().catch(() => {});
  }
}

/** @type {Record<string, (ctx: object) => Promise<object>>} */
export const T01_SCENARIO_RUNNERS = {
  async 'shared-hit'(ctx) {
    const workerA = await spawnScenarioWorker(ctx);
    const workerB = await spawnScenarioWorker(ctx);
    await Promise.all([
      initWorker(workerA, ctx.redisEnv, ctx.environment),
      initWorker(workerB, ctx.redisEnv, ctx.environment),
    ]);
    const identity = ['shared-hit', '1'];
    const readA = await workerA.rpc({ type: 'read', identity });
    const readB = await workerB.rpc({ type: 'read', identity });
    const verdict = assertSharedHitScenario({
      valueA: readA.value,
      valueB: readB.value,
      totalOriginLoads: Number(readA.originLoads) + Number(readB.originLoads),
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
    const worker = await spawnScenarioWorker(ctx);
    const init = await initWorker(worker, {}, ctx.environment, true);
    const identity = ['disabled-parity', '1'];
    const read = await worker.rpc({ type: 'read', identity });
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
    const workerA = await spawnScenarioWorker(ctx);
    const workerB = await spawnScenarioWorker(ctx);
    await Promise.all([
      initWorker(workerA, ctx.redisEnv, ctx.environment),
      initWorker(workerB, ctx.redisEnv, ctx.environment),
    ]);
    const readA = await workerA.rpc({
      type: 'read',
      identity: ['distinct', 'rev-a'],
    });
    const readB = await workerB.rpc({
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
    const worker = await spawnScenarioWorker(ctx);
    await initWorker(worker, ctx.redisEnv, ctx.environment);
    const identity = ['malformed', '1'];
    const key = proofCacheKey(ctx.environment, identity);
    await ctx.admin.set(key, '{not-a-valid-envelope');
    await worker.rpc({ type: 'reset-stats' });
    const read = await worker.rpc({ type: 'read', identity });
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
    const worker = await spawnScenarioWorker(ctx);
    await initWorker(worker, ctx.redisEnv, ctx.environment);
    const baselineEvicted = await parseEvictedKeys(ctx.admin);
    /** @type {Map<string, readonly string[]>} */
    const keyToIdentity = new Map();
    for (let i = 0; i < 64; i += 1) {
      const identity = /** @type {const} */ ([`evict-${i}`, '1']);
      keyToIdentity.set(proofCacheKey(ctx.environment, identity), identity);
      await worker.rpc({ type: 'read', identity });
    }
    let evictedKeys = await parseEvictedKeys(ctx.admin);
    let writeCount = 64;
    while (evictedKeys <= baselineEvicted && writeCount < 128) {
      const identity = /** @type {const} */ ([`evict-${writeCount}`, '1']);
      keyToIdentity.set(proofCacheKey(ctx.environment, identity), identity);
      await worker.rpc({ type: 'read', identity });
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
      await worker.rpc({ type: 'reset-stats' });
      const read = await worker.rpc({
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
    const stopped = await ctx.redis.faults.stop();
    if (!stopped.ok) {
      return {
        id: 'startup-outage',
        status: 'FAIL',
        reason: 'fault-stop-failed',
      };
    }
    const workerA = await spawnScenarioWorker(ctx);
    await initWorker(workerA, ctx.redisEnv, ctx.environment);
    const identity = ['startup-outage', '1'];
    const outageRead = await workerA.rpc({ type: 'read', identity });
    samples.push(Number(outageRead.durationMs));
    const originFallbackDuringOutage = Number(outageRead.originLoads) >= 1;
    parseSyntheticValue(outageRead.value);

    const recovered = await ctx.redis.faults.start();
    if (!recovered.ok) {
      return {
        id: 'startup-outage',
        status: 'FAIL',
        reason: 'fault-start-failed',
      };
    }
    await reconnectAdminClient(ctx);
    await new Promise((resolve) => setTimeout(resolve, 200));

    const workerB = await spawnScenarioWorker(ctx);
    await initWorker(workerB, ctx.redisEnv, ctx.environment);

    const recoveryStarted = Date.now();
    let crossProcessHit = false;
    let recoveryTimeMs = null;
    while (Date.now() - recoveryStarted < T02_RECOVERY_BUDGET_MS) {
      const warm = await workerA.rpc({ type: 'read', identity });
      samples.push(Number(warm.durationMs));
      await workerB.rpc({ type: 'reset-stats' });
      const remoteRead = await workerB.rpc({ type: 'read', identity });
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
    const workerA = await spawnScenarioWorker(ctx);
    const workerB = await spawnScenarioWorker(ctx);
    await Promise.all([
      initWorker(workerA, ctx.redisEnv, ctx.environment),
      initWorker(workerB, ctx.redisEnv, ctx.environment),
    ]);
    const identity = ['restart', '1'];
    const warm = await workerA.rpc({ type: 'read', identity });
    samples.push(Number(warm.durationMs));
    parseSyntheticValue(warm.value);

    const restarted = await ctx.redis.faults.restart();
    if (!restarted.ok) {
      return { id: 'restart', status: 'FAIL', reason: 'fault-restart-failed' };
    }
    await reconnectAdminClient(ctx);
    await new Promise((resolve) => setTimeout(resolve, 200));

    await workerA.rpc({ type: 'reset-stats' });
    const afterRestart = await workerA.rpc({ type: 'read', identity });
    samples.push(Number(afterRestart.durationMs));
    await workerB.rpc({ type: 'reset-stats' });
    const shared = await workerB.rpc({ type: 'read', identity });
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
    const telemetry = mergeStatsDeltaTelemetry([afterRestart, shared]);
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
    const worker = await spawnScenarioWorker(ctx);
    await initWorker(worker, ctx.redisEnv, ctx.environment);
    const identity = ['pause', '1'];
    const warm = await worker.rpc({ type: 'read', identity });
    samples.push(Number(warm.durationMs));
    await worker.rpc({ type: 'reset-stats' });
    const paused = await ctx.redis.faults.pauseClients(350);
    if (!paused.ok) {
      return { id: 'pause', status: 'FAIL', reason: 'fault-pause-failed' };
    }
    const duringPause = await worker.rpc({ type: 'read', identity });
    samples.push(Number(duringPause.durationMs));
    parseSyntheticValue(duringPause.value);
    await new Promise((resolve) => setTimeout(resolve, 450));
    await worker.rpc({ type: 'reset-stats' });
    const afterPause = await worker.rpc({ type: 'read', identity });
    samples.push(Number(afterPause.durationMs));
    const l2Hits = Number(afterPause.telemetry?.['l2:get:hit'] ?? 0);
    const verdict = assertPauseScenario({
      value: duringPause.value,
      recoveredAfterPause:
        l2Hits > 0 || parseSyntheticValue(afterPause.value).id === identity[0],
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
    const worker = await spawnScenarioWorker(ctx);
    await initWorker(worker, ctx.redisEnv, ctx.environment);
    const singleIdentity = ['burst-same', '1'];
    await worker.rpc({ type: 'reset-stats' });
    const singleBurst = await worker.rpc({
      type: 'burst',
      count: 32,
      sameKey: true,
      identity: singleIdentity,
      delayMs: 15,
    });
    samples.push(Number(singleBurst.durationMs));
    const singleProcessOriginLoads = Number(singleBurst.originLoads);

    const workerA = await spawnScenarioWorker(ctx);
    const workerB = await spawnScenarioWorker(ctx);
    await Promise.all([
      initWorker(workerA, ctx.redisEnv, ctx.environment),
      initWorker(workerB, ctx.redisEnv, ctx.environment),
    ]);
    const dualIdentity = ['burst-same-2p', '1'];
    await Promise.all([
      workerA.rpc({ type: 'reset-stats' }),
      workerB.rpc({ type: 'reset-stats' }),
    ]);
    const [burstA, burstB] = await Promise.all([
      workerA.rpc({
        type: 'burst',
        count: 16,
        sameKey: true,
        identity: dualIdentity,
        delayMs: 20,
      }),
      workerB.rpc({
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
    const telemetry = mergeStatsDeltaTelemetry([singleBurst, burstA, burstB]);
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
    const worker = await spawnScenarioWorker(ctx);
    await initWorker(worker, ctx.redisEnv, ctx.environment);
    await worker.rpc({ type: 'reset-stats' });
    const delayMs = 40;
    const settled = await Promise.allSettled(
      Array.from({ length: 64 }, (_unused, index) =>
        worker.rpc({
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
        for (const [key, count] of Object.entries(
          outcome.value.statsDelta?.telemetry ?? {},
        )) {
          telemetry[key] = (telemetry[key] ?? 0) + count;
        }
      } else if (
        outcome.reason instanceof WorkerRpcError &&
        outcome.reason.code === 'origin-failed'
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
    const worker = await spawnScenarioWorker(ctx);
    await initWorker(worker, ctx.redisEnv, ctx.environment);
    const identity = ['synthetic-failure', '1'];
    await worker.rpc({ type: 'reset-stats' });
    let firstAttemptFailed = false;
    try {
      await worker.rpc({
        type: 'read',
        identity,
        failWith: 'SyntheticOriginFailure',
      });
    } catch {
      firstAttemptFailed = true;
    }
    const retry = await worker.rpc({ type: 'read', identity });
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
    const worker = await spawnScenarioWorker(ctx);
    await initWorker(worker, ctx.redisEnv, ctx.environment);
    await worker.rpc({ type: 'read', identity: ['shutdown', '1'] });
    const closeStarted = Date.now();
    await worker.rpc({ type: 'close' });
    const closeDurationMs = Date.now() - closeStarted;
    samples.push(closeDurationMs);
    const shutdownOutcome = await shutdownHarnessWorker(worker);
    ctx.workers = ctx.workers.filter((entry) => entry !== worker);
    const verdict = assertShutdownScenario({ closeDurationMs });
    return {
      id: 'shutdown',
      status: verdict.ok && shutdownOutcome.ok ? 'PASS' : 'FAIL',
      ...(verdict.ok ? {} : { reason: verdict.reason }),
      ...buildT02ScenarioMetrics({
        samples,
        originLoads: 0,
        peakOriginConcurrency: 0,
        telemetry: {},
      }),
      closeDurationMs,
      workerExited: Boolean(shutdownOutcome.ok),
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
 * @param {object} redisHandle
 * @param {string} scenarioId
 * @param {'t01' | 't02'} wave
 * @param {AbortSignal} [signal]
 */
export async function runIsolatedScenario(
  redisHandle,
  scenarioId,
  wave,
  signal,
) {
  /** @type {ReturnType<typeof createWorkerSession>[]} */
  const workers = [];
  let admin = null;
  const environment = buildCacheEnvironmentName(
    `${redisHandle.runId}:${scenarioId}:${randomUUID()}`,
  );
  /** @type {{ id: string, status: string, reason?: string, cleanup?: object }} */
  let scenarioResult;
  /** @type {{ ok: boolean, code?: string }} */
  let cleanup;

  try {
    if (signal?.aborted) {
      return { id: scenarioId, status: 'FAIL', reason: 'suite-interrupted' };
    }
    admin = await redisHandle.connectAdmin();
    if (admin && typeof admin.connect === 'function' && !admin.isOpen) {
      await admin.connect();
    }
    const ctx = {
      redisEnv: redisHandle.redisEnv,
      environment,
      admin,
      redis: redisHandle,
      workers,
    };
    scenarioResult = await runScenario(scenarioId, ctx, wave);
  } catch {
    scenarioResult = {
      id: scenarioId,
      status: 'FAIL',
      reason: 'scenario-exception',
    };
  } finally {
    cleanup = await cleanupWorkerSessions(workers);
    await redisHandle.disconnectAdmin(admin);
    if (!cleanup.ok) {
      scenarioResult = {
        id: scenarioId,
        status: 'FAIL',
        reason: 'cleanup-failed',
        cleanup,
      };
    }
  }
  return scenarioResult;
}

/**
 * @param {object} redisHandle
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function runHarnessSuite(redisHandle, options = {}) {
  const started = Date.now();
  const signal = options.signal;
  const t01 = [];
  const t02 = [];
  let cleanupOk = true;

  for (const scenarioId of Object.keys(T01_SCENARIO_RUNNERS)) {
    if (signal?.aborted) {
      t01.push({ id: scenarioId, status: 'FAIL', reason: 'suite-interrupted' });
      continue;
    }
    const result = await runIsolatedScenario(
      redisHandle,
      scenarioId,
      't01',
      signal,
    );
    if (result.reason === 'cleanup-failed') cleanupOk = false;
    t01.push(result);
  }
  for (const scenarioId of Object.keys(T02_SCENARIO_RUNNERS)) {
    if (signal?.aborted) {
      t02.push({ id: scenarioId, status: 'FAIL', reason: 'suite-interrupted' });
      continue;
    }
    const result = await runIsolatedScenario(
      redisHandle,
      scenarioId,
      't02',
      signal,
    );
    if (result.reason === 'cleanup-failed') cleanupOk = false;
    t02.push(result);
  }

  const all = [...t01, ...t02];
  const samples = all
    .flatMap((item) => item.samples ?? [])
    .sort((a, b) => a - b);
  const scenarioFail = all.some((item) => item.status === 'FAIL');
  const status = !cleanupOk ? 'FAIL' : scenarioFail ? 'FAIL' : 'PASS';

  return redactLiveResult({
    tier: 'live',
    status,
    runId: redisHandle.runId,
    elapsedMs: Date.now() - started,
    publicFacts: redisHandle.publicFacts,
    t01,
    t02,
    percentiles: {
      p95: computeNearestRankPercentile(samples, 0.95),
      p99: computeNearestRankPercentile(samples, 0.99),
      sampleCount: samples.length,
    },
    cleanup: { ok: cleanupOk },
  });
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
 * @param {unknown} payload
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

function runLiveCli() {
  const refusal = refuseLegacyLiveHarnessInvocation(process.argv);
  console.log(JSON.stringify(redactLiveResult(refusal)));
  process.exit(2);
}

const modulePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const isMain = invokedPath.length > 0 && modulePath === invokedPath;

if (isMain) {
  runLiveCli();
}

/**
 * @param {ReturnType<typeof createWorkerSession>} session
 * @param {Record<string, unknown>} message
 */
export function rpc(session, message) {
  return session.rpc(message);
}

/** Harness does not own container removal authority. */
export function assertHarnessDoesNotRemoveContainers() {
  return { ok: true, reason: 'harness-resource-ownership-absent' };
}
