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
export const SCENARIO_BUDGET_MS = 60_000;
export const RECOVERY_PROBE_RPC_MS = 2_000;
export const MAX_CONCURRENT_WORKERS = 2;
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
export function monotonicNow() {
  return performance.now();
}

/**
 * Duration a nested operation may use. It cannot exceed the remaining
 * enclosing deadline.
 *
 * @param {number | null | undefined} deadlineMs
 * @param {number} requestedMs
 */
export function operationTimeoutMs(deadlineMs, requestedMs, now = monotonicNow()) {
  if (deadlineMs == null) {
    return requestedMs;
  }
  return Math.min(requestedMs, Math.max(0, deadlineMs - now));
}

/**
 * @param {number | null | undefined} deadlineMs
 * @param {number} requestedMs
 */
export function requireOperationTimeout(deadlineMs, requestedMs, now = monotonicNow()) {
  const timeoutMs = operationTimeoutMs(deadlineMs, requestedMs, now);
  if (timeoutMs <= 0) {
    throw new Error('ScenarioDeadlineExpired');
  }
  return timeoutMs;
}

export function createDockerExecutor(runner, options = {}) {
  const timeoutMs = options.timeoutMs ?? COMMAND_TIMEOUT_MS;
  return async function dockerExec(file, args, opts = {}) {
    const requested = typeof opts.timeout === 'number' ? opts.timeout : timeoutMs;
    const timeout = requireOperationTimeout(opts.deadlineMs, requested);
    const { deadlineMs: _deadline, ...rest } = opts;
    return runner(file, args, { ...rest, timeout });
  };
}

/**
 * @param {string[]} argv
 */
export function parseScenarioSelection(argv) {
  const index = argv.indexOf('--scenario');
  if (index === -1) {
    return { scenario: null, wave: null };
  }
  const name = argv[index + 1];
  if (!name || name.startsWith('--')) {
    return { error: 'Missing scenario name' };
  }
  if (Object.hasOwn(T02_SCENARIO_RUNNERS, name)) {
    return { scenario: name, wave: /** @type {const} */ ('t02') };
  }
  if (Object.hasOwn(T01_SCENARIO_RUNNERS, name)) {
    return { scenario: name, wave: /** @type {const} */ ('t01') };
  }
  return { error: `Unknown scenario: ${name}` };
}

/**
 * @param {string} status
 * @param {{ workers: { errors: string[] }, admin: { closed?: boolean }, container: { removed?: boolean } }} cleanup
 */
export function liveExitCode(status, cleanup) {
  if (status === 'NOT-RUN') {
    return 2;
  }
  const dirty =
    cleanup.workers.errors.length > 0 ||
    cleanup.admin.closed === false ||
    cleanup.container.removed !== true;
  if (dirty || status !== 'PASS') {
    return 1;
  }
  return 0;
}

/**
 * @param {string} phase
 * @param {string} [detail]
 */
export function writeProgress(phase, detail = '') {
  const suffix = detail.length > 0 ? ` ${detail}` : '';
  console.error(`cache07 ${phase}${suffix}`);
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
  if (mapped.HostIp !== '127.0.0.1' && mapped.HostIp !== '::1') {
    return { ok: false, reason: 'Published bind address is not loopback' };
  }
  return { ok: true };
}

/**
 * @param {(file: string, args: string[], opts?: object) => Promise<{ stdout: string; stderr: string }>} dockerExec
 * @param {string} runId
 */
export function buildOwnedContainerCreateArgs(runId, hostPort) {
  const name = `cache07-${runId}`;
  const publish =
    typeof hostPort === 'number' ? `127.0.0.1:${hostPort}:6379` : '127.0.0.1::6379';
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
      publish,
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
export async function inspectOwnedContainer(dockerExec, containerId, deadlineMs) {
  const { stdout } = await dockerExec(
    'docker',
    ['inspect', '--format', '{{json .}}', containerId],
    {
      deadlineMs,
      timeout: requireOperationTimeout(deadlineMs, COMMAND_TIMEOUT_MS),
    },
  );
  return JSON.parse(stdout.trim());
}

/**
 * @param {(file: string, args: string[], opts?: object) => Promise<{ stdout: string; stderr: string }>} dockerExec
 * @param {string} containerId
 */
export async function forceRemoveOwnedContainer(dockerExec, containerId, expected) {
  let inspect;
  try {
    inspect = await inspectOwnedContainer(dockerExec, containerId);
  } catch (error) {
    return {
      removed: false,
      reason: `Ownership inspect failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  if (expected) {
    const ownership = verifyContainerOwnership(inspect, {
      runId: expected.runId,
      containerId,
      hostPort: expected.hostPort,
    });
    if (!ownership.ok) {
      return { removed: false, reason: ownership.reason };
    }
  }
  try {
    await dockerExec('docker', ['rm', '-f', containerId]);
  } catch (error) {
    return {
      removed: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
  try {
    await dockerExec('docker', ['inspect', '--format', '{{.Id}}', containerId]);
    return { removed: false, reason: 'Container still present after removal' };
  } catch (error) {
    const text = `${error instanceof Error ? error.message : String(error)}`;
    if (/no such|not found/i.test(text)) {
      return { removed: true };
    }
    return {
      removed: false,
      reason: `Removal was not verified: ${text}`,
    };
  }
}

/**
 * @param {import('node:child_process').ChildProcess[]} workers
 */
export function liveWorkerCount(workers) {
  return workers.filter((worker) => worker.exitCode === null && !worker.killed).length;
}

/**
 * @param {{ workers: import('node:child_process').ChildProcess[] }} ctx
 */
export function openWorker(ctx) {
  if (liveWorkerCount(ctx.workers) >= MAX_CONCURRENT_WORKERS) {
    throw new Error('WorkerConcurrencyExceeded');
  }
  const worker = fork(workerPath, { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });
  ctx.workers.push(worker);
  return worker;
}

/**
 * @param {object} ctx
 * @param {import('node:child_process').ChildProcess} worker
 * @param {Record<string, unknown>} message
 * @param {number} [capMs]
 */
function activeDeadline(ctx) {
  if (ctx.recoveryDeadlineMs == null) {
    return ctx.deadlineMs;
  }
  if (ctx.deadlineMs == null) {
    return ctx.recoveryDeadlineMs;
  }
  return Math.min(ctx.deadlineMs, ctx.recoveryDeadlineMs);
}

function callWorker(ctx, worker, message, capMs = 15_000) {
  return rpc(
    worker,
    message,
    requireOperationTimeout(activeDeadline(ctx), capMs),
  );
}

function beginRecovery(ctx) {
  const now = monotonicNow();
  ctx.recoveryDeadlineMs =
    now + requireOperationTimeout(ctx.deadlineMs, T02_RECOVERY_BUDGET_MS, now);
  writeProgress('recovery-start', ctx.scenarioId ?? '');
  return ctx.recoveryDeadlineMs;
}

/**
 * Scenario-owned workers are closed before the caller continues, including
 * when the scenario throws.
 *
 * @param {object} ctx
 * @param {(ctx: object) => Promise<object>} fn
 */
export async function withScenarioIsolation(ctx, fn) {
  const previous = ctx.workers;
  const owned = [];
  const savedDeadline = ctx.deadlineMs;
  const now = monotonicNow();
  const parentRemain =
    savedDeadline == null ? SCENARIO_BUDGET_MS : Math.max(0, savedDeadline - now);
  ctx.workers = owned;
  ctx.deadlineMs = now + Math.min(parentRemain, SCENARIO_BUDGET_MS);
  try {
    return await fn(ctx);
  } finally {
    await closeWorkers(owned);
    ctx.workers = previous ?? [];
    ctx.deadlineMs = savedDeadline;
  }
}

/**
 * Resolves even when the child already exited before the listener was attached.
 *
 * @param {import('node:child_process').ChildProcess} worker
 * @param {number} timeoutMs
 */
function waitForWorkerExit(worker, timeoutMs) {
  return new Promise((resolve) => {
    const finish = (value) => {
      clearTimeout(timer);
      worker.off('exit', onExit);
      resolve(value);
    };
    const onExit = () => finish(true);
    const timer = setTimeout(() => finish(worker.exitCode !== null), timeoutMs);
    worker.on('exit', onExit);
    if (worker.exitCode !== null) {
      finish(true);
    }
  });
}

/**
 * @param {import('node:child_process').ChildProcess[]} workers
 */
export async function closeWorkers(workers) {
  /** @type {string[]} */
  const errors = [];
  for (const worker of workers) {
    try {
      if (worker.connected && worker.exitCode === null) {
        await rpc(worker, { type: 'close' }, 2_000);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      if (worker.exitCode === null) {
        worker.kill('SIGTERM');
      }
    }
    if (worker.exitCode === null) {
      const exited = await waitForWorkerExit(worker, 2_000);
      if (!exited) {
        worker.kill('SIGKILL');
        errors.push('WorkerForcedKill');
        await waitForWorkerExit(worker, 500);
      }
    }
  }
  return { errors };
}

/**
 * @param {import('node:child_process').ChildProcess} worker
 * @param {Record<string, string | undefined>} env
 * @param {string} environment
 */
async function initWorker(ctx, worker, env, environment, disabled = false) {
  return callWorker(ctx, worker, {
    type: 'init',
    env,
    environment,
    disabled,
  });
}

/** @type {Record<string, (ctx: object) => Promise<object>>} */
export const T01_SCENARIO_RUNNERS = {
  async 'shared-hit'(ctx) {
    const workerA = openWorker(ctx);
    const workerB = openWorker(ctx);
    await Promise.all([
      initWorker(ctx, workerA, ctx.redisEnv, ctx.environment),
      initWorker(ctx, workerB, ctx.redisEnv, ctx.environment),
    ]);
    const identity = ['shared-hit', '1'];
    const readA = await callWorker(ctx, workerA, { type: 'read', identity });
    const readB = await callWorker(ctx, workerB, { type: 'read', identity });
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
    const worker = openWorker(ctx);
    const init = await initWorker(ctx, worker, {}, ctx.environment, true);
    const identity = ['disabled-parity', '1'];
    const read = await callWorker(ctx, worker, { type: 'read', identity });
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
    const workerA = openWorker(ctx);
    const workerB = openWorker(ctx);
    await Promise.all([
      initWorker(ctx, workerA, ctx.redisEnv, ctx.environment),
      initWorker(ctx, workerB, ctx.redisEnv, ctx.environment),
    ]);
    const readA = await callWorker(ctx, workerA, {
      type: 'read',
      identity: ['distinct', 'rev-a'],
    });
    const readB = await callWorker(ctx, workerB, {
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
    const worker = openWorker(ctx);
    await initWorker(ctx, worker, ctx.redisEnv, ctx.environment);
    const identity = ['malformed', '1'];
    const key = proofCacheKey(ctx.environment, identity);
    await ctx.admin.set(key, '{not-a-valid-envelope');
    await callWorker(ctx, worker, { type: 'reset-stats' });
    const read = await callWorker(ctx, worker, { type: 'read', identity });
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
    const worker = openWorker(ctx);
    await initWorker(ctx, worker, ctx.redisEnv, ctx.environment);
    const baselineEvicted = await parseEvictedKeys(ctx.admin);
    /** @type {Map<string, readonly string[]>} */
    const keyToIdentity = new Map();
    for (let i = 0; i < 64; i += 1) {
      const identity = /** @type {const} */ ([`evict-${i}`, '1']);
      keyToIdentity.set(proofCacheKey(ctx.environment, identity), identity);
      await callWorker(ctx, worker, { type: 'read', identity, padBytes: 200_000 });
    }
    let evictedKeys = await parseEvictedKeys(ctx.admin);
    let writeCount = 64;
    while (evictedKeys <= baselineEvicted && writeCount < 128) {
      const identity = /** @type {const} */ ([`evict-${writeCount}`, '1']);
      keyToIdentity.set(proofCacheKey(ctx.environment, identity), identity);
      await callWorker(ctx, worker, { type: 'read', identity, padBytes: 200_000 });
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
      await callWorker(ctx, worker, { type: 'reset-stats' });
      const read = await callWorker(ctx, worker, {
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
    await stopOwnedContainer(ctx.dockerExec, ctx.containerId, activeDeadline(ctx));
    const workerA = openWorker(ctx);
    await initWorker(ctx, workerA, ctx.redisEnv, ctx.environment);
    const identity = ['startup-outage', '1'];
    const outageRead = await callWorker(ctx, workerA, { type: 'read', identity });
    samples.push(Number(outageRead.durationMs));
    const originFallbackDuringOutage = Number(outageRead.originLoads) >= 1;
    parseSyntheticValue(outageRead.value);

    await startOwnedContainer(ctx.dockerExec, ctx.containerId, activeDeadline(ctx));

    const workerB = openWorker(ctx);
    await initWorker(ctx, workerB, ctx.redisEnv, ctx.environment);

    const recoveryDeadlineMs = beginRecovery(ctx);
    const recoveryStarted = Date.now();
    let crossProcessHit = false;
    let recoveryTimeMs = null;
    while (monotonicNow() < recoveryDeadlineMs) {
      const warm = await callWorker(ctx, workerA, { type: 'read', identity }, RECOVERY_PROBE_RPC_MS);
      samples.push(Number(warm.durationMs));
      await callWorker(ctx, workerB, { type: 'reset-stats' }, RECOVERY_PROBE_RPC_MS);
      const remoteRead = await callWorker(ctx, workerB, { type: 'read', identity }, RECOVERY_PROBE_RPC_MS);
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

    ctx.recoveryDeadlineMs = null;
    writeProgress('recovery-end', 'startup-outage');
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
    const workerA = openWorker(ctx);
    const workerB = openWorker(ctx);
    await Promise.all([
      initWorker(ctx, workerA, ctx.redisEnv, ctx.environment),
      initWorker(ctx, workerB, ctx.redisEnv, ctx.environment),
    ]);
    const identity = ['restart', '1'];
    const warm = await callWorker(ctx, workerA, { type: 'read', identity });
    samples.push(Number(warm.durationMs));
    parseSyntheticValue(warm.value);

    await stopOwnedContainer(ctx.dockerExec, ctx.containerId, activeDeadline(ctx));
    await startOwnedContainer(ctx.dockerExec, ctx.containerId, activeDeadline(ctx));
    const recoveryDeadlineMs = beginRecovery(ctx);
    const recoveryStarted = Date.now();
    let reason = 'Recovery budget exhausted';
    /** @type {Record<string, unknown> | null} */
    let forward = null;
    /** @type {Record<string, unknown> | null} */
    let reverse = null;
    /** @type {Record<string, unknown> | null} */
    let rebuilt = null;

    while (monotonicNow() < recoveryDeadlineMs && !forward) {
      try {
        const inspect = await inspectOwnedContainer(
          ctx.dockerExec,
          ctx.containerId,
          activeDeadline(ctx),
        );
        const ownership = verifyContainerOwnership(inspect, {
          runId: ctx.runId,
          containerId: ctx.containerId,
          hostPort: ctx.hostPort,
        });
        if (!ownership.ok) {
          reason = ownership.reason ?? 'Ownership check failed';
          break;
        }
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 200));
        continue;
      }
      const probe = [`restart-forward-${Date.now()}`, '1'];
      await callWorker(ctx, workerA, { type: 'reset-stats' }, RECOVERY_PROBE_RPC_MS);
      let warm;
      try {
        warm = await callWorker(
          ctx,
          workerA,
          { type: 'read', identity: probe },
          RECOVERY_PROBE_RPC_MS,
        );
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 200));
        continue;
      }
      samples.push(Number(warm.durationMs));
      const stored = Number(warm.telemetry?.['l2:set:stored'] ?? 0);
      if (Number(warm.originLoads) !== 1 || stored < 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        continue;
      }
      await callWorker(ctx, workerB, { type: 'reset-stats' }, RECOVERY_PROBE_RPC_MS);
      try {
        const shared = await callWorker(
          ctx,
          workerB,
          {
            type: 'read',
            identity: probe,
            failWith: 'OriginMustNotRun',
          },
          RECOVERY_PROBE_RPC_MS,
        );
        samples.push(Number(shared.durationMs));
        const hit = Number(shared.telemetry?.['l2:get:hit'] ?? 0) > 0;
        const same =
          parseSyntheticValue(shared.value).id === probe[0] &&
          Number(shared.originLoads) === 0;
        if (hit && same) {
          forward = shared;
        }
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    while (forward && monotonicNow() < recoveryDeadlineMs && !reverse) {
      const probe = [`restart-reverse-${Date.now()}`, '1'];
      await callWorker(ctx, workerB, { type: 'reset-stats' }, RECOVERY_PROBE_RPC_MS);
      let warm;
      try {
        warm = await callWorker(
          ctx,
          workerB,
          { type: 'read', identity: probe },
          RECOVERY_PROBE_RPC_MS,
        );
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 200));
        continue;
      }
      if (
        Number(warm.originLoads) !== 1 ||
        Number(warm.telemetry?.['l2:set:stored'] ?? 0) < 1
      ) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        continue;
      }
      await callWorker(ctx, workerA, { type: 'reset-stats' }, RECOVERY_PROBE_RPC_MS);
      try {
        const shared = await callWorker(
          ctx,
          workerA,
          {
            type: 'read',
            identity: probe,
            failWith: 'OriginMustNotRun',
          },
          RECOVERY_PROBE_RPC_MS,
        );
        if (
          Number(shared.telemetry?.['l2:get:hit'] ?? 0) > 0 &&
          Number(shared.originLoads) === 0
        ) {
          reverse = shared;
        }
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    ctx.recoveryDeadlineMs = null;
    writeProgress('recovery-end', 'restart');
    if (forward && reverse) {
      await callWorker(ctx, workerA, { type: 'reset-stats' });
      rebuilt = await callWorker(ctx, workerA, { type: 'read', identity });
      samples.push(Number(rebuilt.durationMs));
    }

    const recoveryTimeMs = forward && reverse ? Date.now() - recoveryStarted : null;
    const verdict =
      forward && reverse && rebuilt && Number(rebuilt.originLoads) === 1
        ? assertRestartScenario({
            valueAfterRestart: rebuilt.value,
            originLoadsAfterRestart: 1,
            sharedHitAfterWarm: true,
          })
        : { ok: false, reason };
    return {
      id: 'restart',
      status: verdict.ok ? 'PASS' : 'FAIL',
      ...(verdict.ok ? {} : { reason: verdict.reason }),
      ...buildT02ScenarioMetrics({
        samples,
        originLoads: Number(rebuilt?.originLoads ?? 0),
        peakOriginConcurrency: Number(rebuilt?.peakOrigin ?? 0),
        telemetry: /** @type {Record<string, number>} */ (rebuilt?.telemetry ?? {}),
        recoveryTimeMs,
      }),
    };
  },

  async pause(ctx) {
    const samples = [];
    const worker = openWorker(ctx);
    await initWorker(ctx, worker, ctx.redisEnv, ctx.environment);
    const identity = ['pause', '1'];
    const warm = await callWorker(ctx, worker, { type: 'read', identity });
    samples.push(Number(warm.durationMs));
    await callWorker(ctx, worker, { type: 'reset-stats' });
    await pauseOwnedRedisClients(ctx.dockerExec, ctx.containerId, 350, activeDeadline(ctx));
    const duringPause = await callWorker(ctx, worker, { type: 'read', identity });
    samples.push(Number(duringPause.durationMs));
    parseSyntheticValue(duringPause.value);
    await new Promise((resolve) => setTimeout(resolve, 450));
    await callWorker(ctx, worker, { type: 'reset-stats' });
    const afterPause = await callWorker(ctx, worker, { type: 'read', identity });
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
    const worker = openWorker(ctx);
    await initWorker(ctx, worker, ctx.redisEnv, ctx.environment);
    const singleIdentity = ['burst-same', '1'];
    await callWorker(ctx, worker, { type: 'reset-stats' });
    const singleBurst = await callWorker(ctx, worker, {
      type: 'burst',
      count: 32,
      sameKey: true,
      identity: singleIdentity,
      delayMs: 15,
    });
    samples.push(Number(singleBurst.durationMs));
    const singleProcessOriginLoads = Number(singleBurst.originLoads);
    await closeWorkers([worker]);
    const closedIndex = ctx.workers.indexOf(worker);
    if (closedIndex >= 0) {
      ctx.workers.splice(closedIndex, 1);
    }

    const workerA = openWorker(ctx);
    const workerB = openWorker(ctx);
    await Promise.all([
      initWorker(ctx, workerA, ctx.redisEnv, ctx.environment),
      initWorker(ctx, workerB, ctx.redisEnv, ctx.environment),
    ]);
    const dualIdentity = ['burst-same-2p', '1'];
    await Promise.all([
      callWorker(ctx, workerA, { type: 'reset-stats' }),
      callWorker(ctx, workerB, { type: 'reset-stats' }),
    ]);
    const [burstA, burstB] = await Promise.all([
      callWorker(ctx, workerA, {
        type: 'burst',
        count: 16,
        sameKey: true,
        identity: dualIdentity,
        delayMs: 20,
      }),
      callWorker(ctx, workerB, {
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
    const worker = openWorker(ctx);
    await initWorker(ctx, worker, ctx.redisEnv, ctx.environment);
    await callWorker(ctx, worker, { type: 'reset-stats' });
    const delayMs = 40;
    const settled = await Promise.allSettled(
      Array.from({ length: 64 }, (_unused, index) =>
        callWorker(ctx, worker, {
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
    const worker = openWorker(ctx);
    await initWorker(ctx, worker, ctx.redisEnv, ctx.environment);
    const identity = ['synthetic-failure', '1'];
    await callWorker(ctx, worker, { type: 'reset-stats' });
    let firstAttemptFailed = false;
    try {
      await callWorker(ctx, worker, {
        type: 'read',
        identity,
        failWith: 'SyntheticOriginFailure',
      });
    } catch {
      firstAttemptFailed = true;
    }
    const retry = await callWorker(ctx, worker, { type: 'read', identity });
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
    const worker = openWorker(ctx);
    await initWorker(ctx, worker, ctx.redisEnv, ctx.environment);
    await callWorker(ctx, worker, { type: 'read', identity: ['shutdown', '1'] });
    const closeStarted = Date.now();
    await callWorker(ctx, worker, { type: 'close' });
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
  writeProgress('scenario-start', scenarioId);
  try {
    return await withScenarioIsolation(ctx, async (isolated) => {
      isolated.scenarioId = scenarioId;
      return runner(isolated);
    });
  } finally {
    writeProgress('scenario-end', scenarioId);
  }
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
  let hostPort = await reserveLoopbackPort();
  const { name, args } = buildOwnedContainerCreateArgs(runId, hostPort);
  const started = Date.now();
  let containerId = '';
  try {
    const { stdout } = await dockerExec('docker', args, { signal });
    containerId = stdout.trim().split('\n').at(-1)?.trim() ?? '';
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
  if (!client) {
    return;
  }
  try {
    if (client.isOpen) {
      await client.close();
    }
  } finally {
    try {
      client.destroy?.();
    } catch {
      // The failed client must not stay open for a later replacement.
    }
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
export async function stopOwnedContainer(dockerExec, containerId, deadlineMs) {
  await dockerExec('docker', ['stop', containerId], {
    deadlineMs,
    timeout: requireOperationTimeout(deadlineMs, COMMAND_TIMEOUT_MS),
  });
}

/**
 * @param {(file: string, args: string[], opts?: object) => Promise<{ stdout: string; stderr: string }>} dockerExec
 */
export async function startOwnedContainer(dockerExec, containerId, deadlineMs) {
  await dockerExec('docker', ['start', containerId], {
    deadlineMs,
    timeout: requireOperationTimeout(deadlineMs, COMMAND_TIMEOUT_MS),
  });
}

/**
 * @param {(file: string, args: string[], opts?: object) => Promise<{ stdout: string; stderr: string }>} dockerExec
 * @param {string} containerId
 */
export async function restartOwnedContainer(dockerExec, containerId, deadlineMs) {
  await dockerExec('docker', ['restart', containerId], {
    deadlineMs,
    timeout: requireOperationTimeout(deadlineMs, COMMAND_TIMEOUT_MS),
  });
}

/**
 * @param {(file: string, args: string[], opts?: object) => Promise<{ stdout: string; stderr: string }>} dockerExec
 */
export async function pauseOwnedRedisClients(
  dockerExec,
  containerId,
  pauseMs = 350,
  deadlineMs,
) {
  await dockerExec(
    'docker',
    ['exec', containerId, 'redis-cli', 'CLIENT', 'PAUSE', String(pauseMs), 'ALL'],
    {
      deadlineMs,
      timeout: requireOperationTimeout(deadlineMs, COMMAND_TIMEOUT_MS),
    },
  );
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

async function reserveLoopbackPort() {
  const net = await import('node:net');
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function runLiveCli() {
  const refusal = validateLiveOptIn(process.argv, process.env);
  if (refusal) {
    console.log(JSON.stringify(refusal));
    process.exitCode = 1;
    return;
  }
  const redisRefusal = rejectSuppliedRedisUrl(process.env);
  if (redisRefusal) {
    console.log(JSON.stringify(redisRefusal));
    process.exitCode = 1;
    return;
  }

  const suiteDeadlineMs = monotonicNow() + SUITE_TIMEOUT_MS;
  const rawDockerExec = createDockerExecutor(execFile);
  const dockerExec = (file, args, opts = {}) =>
    rawDockerExec(file, args, { deadlineMs: suiteDeadlineMs, ...opts });
  const selection = parseScenarioSelection(process.argv);
  if (selection.error) {
    console.log(JSON.stringify({ status: 'FAIL', reason: selection.error }));
    process.exitCode = 1;
    return;
  }
  const abort = new AbortController();
  const suiteTimer = setTimeout(() => abort.abort(), SUITE_TIMEOUT_MS);
  suiteTimer.unref?.();

  const started = Date.now();
  let exitCode = 1;
  const workers = [];
  /** @type {import('redis').RedisClientType | null} */
  let admin = null;
  let owned = null;
  /** @type {Record<string, unknown>} */
  let liveBody = {
    tier: 'live',
    status: 'FAIL',
    elapsedMs: 0,
  };

  try {
    owned = await provisionOwnedRedis(dockerExec, abort.signal);
    if (owned.status !== 'READY') {
      exitCode = owned.status === 'FAIL' ? 1 : 2;
      liveBody = {
        tier: 'live',
        status: owned.status,
        reason: owned.reason,
        elapsedMs: Date.now() - started,
      };
    } else {

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
      hostPort: owned.hostPort,
      deadlineMs: suiteDeadlineMs,
    };

    const t01 = selection.scenario
      ? selection.wave === 't01'
        ? [await runScenario(selection.scenario, ctx, 't01')]
        : []
      : await runT01Suite(ctx);
    const t02 = selection.scenario
      ? selection.wave === 't02'
        ? [await runScenario(selection.scenario, ctx, 't02')]
        : []
      : await runT02Suite(ctx);
    const sorted = [...t01, ...t02]
      .flatMap((item) => item.samples ?? [])
      .sort((a, b) => a - b);

    const fail = [...t01, ...t02].some((item) => item.status === 'FAIL');
    exitCode = fail ? 1 : 0;
    liveBody = {
      tier: 'live',
      status: fail ? 'FAIL' : 'PASS',
      runId: owned.runId,
      containerId: owned.containerId,
      hostPort: owned.hostPort,
      elapsedMs: Date.now() - started,
      ...(selection.scenario ? { scenario: selection.scenario } : {}),
      t01,
      t02,
      percentiles: {
        p95: computeNearestRankPercentile(sorted, 0.95),
        p99: computeNearestRankPercentile(sorted, 0.99),
        sampleCount: sorted.length,
      },
    };
    }
  } catch (error) {
    exitCode = 1;
    liveBody = {
      tier: 'live',
      status: 'FAIL',
      reason: error instanceof Error ? error.message : String(error),
      elapsedMs: Date.now() - started,
    };
  } finally {
    clearTimeout(suiteTimer);
    const workerCleanup = await closeWorkers(workers).catch((error) => ({
      errors: [error instanceof Error ? error.message : String(error)],
    }));
    const adminCleanup = await disconnectAdminClient(admin)
      .then(() => ({ closed: true }))
      .catch((error) => ({
        closed: false,
        reason: error instanceof Error ? error.message : String(error),
      }));
    const containerCleanup = owned?.containerId
      ? await forceRemoveOwnedContainer(dockerExec, owned.containerId, {
          runId: owned.runId,
          hostPort: owned.hostPort,
        }).catch((error) => ({
          removed: false,
          reason: error instanceof Error ? error.message : String(error),
        }))
      : { removed: true };
    if (
      workerCleanup.errors.length > 0 ||
      adminCleanup.closed === false ||
      containerCleanup.removed !== true
    ) {
      exitCode = exitCode === 2 ? 2 : 1;
    }
    const payload = redactLiveResult({
      ...liveBody,
      elapsedMs: Date.now() - started,
      cleanup: {
        workers: workerCleanup,
        admin: adminCleanup,
        container: containerCleanup,
      },
    });
    console.log(JSON.stringify(payload));
    process.exitCode = exitCode;
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
    process.exitCode = 1;
  });
}