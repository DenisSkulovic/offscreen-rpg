import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CACHE07_POLICY,
  LEGACY_LIVE_VERIFY_COMMAND,
  SDK_QUEUE_METRICS_PROOF,
  WORKER_RPC_DEADLINE_MS,
  WorkerRpcError,
  assertBurstDistinctKeysScenario,
  assertBurstSameKeyScenario,
  assertDisabledParityScenario,
  assertDistinctRevisionScenario,
  assertEvictionScenario,
  assertHarnessDoesNotRemoveContainers,
  assertMalformedEnvelopeScenario,
  assertPauseScenario,
  assertRestartScenario,
  assertSharedHitScenario,
  assertShutdownScenario,
  assertStartupOutageScenario,
  assertSyntheticFailureScenario,
  buildAuthenticatedWorkerRedisEnv,
  buildCacheEnvironmentName,
  buildCasePercentiles,
  buildGeneratedRedisEnv,
  buildT02ScenarioMetrics,
  cleanupWorkerSessions,
  computeNearestRankPercentile,
  createHarnessRedisHandle,
  createWorkerSession,
  extractTelemetryOverloadCoalesced,
  proofCacheKey,
  redactLiveResult,
  refuseLegacyLiveHarnessInvocation,
  rejectSuppliedRedisUrl,
  rpc,
  runIsolatedScenario,
  shutdownHarnessWorker,
  spawnHarnessWorker,
  T02_SCENARIO_RUNNERS,
  validateDockerContextEndpoint,
  validateLiveOptIn,
} from './harness.mjs';

const workerPath = fileURLToPath(new URL('./worker.mjs', import.meta.url));

test('legacy live harness invocation always refuses before side effects', () => {
  const missingFlag = validateLiveOptIn([], {});
  assert.equal(missingFlag.status, 'NOT-RUN');
  assert.equal(missingFlag.verifyCommand, LEGACY_LIVE_VERIFY_COMMAND);

  const withEnv = validateLiveOptIn(['--live'], {
    CACHE07_ALLOW_DISPOSABLE_REDIS: '1',
  });
  assert.equal(withEnv.status, 'NOT-RUN');
  assert.equal(withEnv.reason, 'legacy-harness-live-retired');
  assert.deepEqual(refuseLegacyLiveHarnessInvocation(['--live']), withEnv);
});

test('rejectSuppliedRedisUrl rejects external endpoint injection', () => {
  const refusal = rejectSuppliedRedisUrl({ REDIS_URL: 'redis://shared:6379' });
  assert.ok(refusal);
  assert.equal(refusal.status, 'FAIL');
  assert.equal(refusal.reason, 'supplied-redis-url-rejected');
  assert.equal(rejectSuppliedRedisUrl({}), null);
});

test('validateDockerContextEndpoint accepts local sockets and rejects remote tcp', () => {
  assert.deepEqual(
    validateDockerContextEndpoint('unix:///var/run/docker.sock'),
    {
      ok: true,
    },
  );
  const remote = validateDockerContextEndpoint('tcp://203.0.113.10:2376');
  assert.equal(remote.ok, false);
});

test('computeNearestRankPercentile uses nearest-rank method', () => {
  const samples = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  assert.equal(computeNearestRankPercentile(samples, 0.95), 100);
  assert.equal(computeNearestRankPercentile([], 0.95), null);
});

test('T01 scenario assertions pass and fail predictably', () => {
  assert.deepEqual(
    assertSharedHitScenario({
      valueA: { id: 'a', revision: '1' },
      valueB: { id: 'a', revision: '1' },
      totalOriginLoads: 1,
    }),
    { ok: true },
  );
  assert.deepEqual(assertDistinctRevisionScenario({ totalOriginLoads: 2 }), {
    ok: true,
  });
  assert.deepEqual(
    assertEvictionScenario({
      evictedKeysDelta: 2,
      absentKeyVerified: true,
      value: { id: 'e', revision: '1' },
    }),
    { ok: true },
  );
});

test('buildGeneratedRedisEnv only exposes loopback endpoint shape', () => {
  const env = buildGeneratedRedisEnv(65123);
  assert.equal(env.REDIS_URL, 'redis://127.0.0.1:65123');
});

test('buildAuthenticatedWorkerRedisEnv encodes credentials without reporting them', () => {
  const env = buildAuthenticatedWorkerRedisEnv({
    host: '127.0.0.1',
    port: 65000,
    runtimePassword: 'secret',
    keyNamespace: 'offscreen:verify:run',
  });
  assert.match(env.REDIS_URL, /^redis:\/\//);
  assert.equal(env.REDIS_KEY_PREFIX, 'offscreen:verify:run');
  const redacted = redactLiveResult({ nested: env.REDIS_URL });
  assert.equal(redacted.nested, 'redis://127.0.0.1:[redacted]');
});

test('proofCacheKey uses cache07-proof namespace/version', () => {
  const key = proofCacheKey('cache07-deadbeef', ['x']);
  assert.match(key, /^cache07-deadbeef:cache07-proof:v1:/);
  assert.equal(CACHE07_POLICY.namespace, 'cache07-proof');
});

test('harness does not expose resource removal authority', () => {
  const verdict = assertHarnessDoesNotRemoveContainers();
  assert.equal(verdict.ok, true);
  assert.match(String(verdict.reason), /ownership-absent/);
});

function createFakeWorkerProcess() {
  /** @type {Record<string, Function>} */
  const listeners = {};
  let sentRequestId = '';
  return {
    listeners,
    proc: {
      on(event, handler) {
        listeners[event] = handler;
      },
      off(event, handler) {
        if (listeners[event] === handler) {
          delete listeners[event];
        }
      },
      once(event, handler) {
        listeners[event] = handler;
      },
      send(message) {
        sentRequestId = String(message.requestId ?? '');
        return true;
      },
      kill(signal) {
        this.killed = true;
        this.signalCode = signal ?? 'SIGTERM';
        if (this.exitCode == null) {
          this.exitCode = 1;
        }
        listeners.exit?.();
      },
      exitCode: null,
      signalCode: null,
      killed: false,
      stdout: null,
      stderr: null,
    },
    getSentRequestId() {
      return sentRequestId;
    },
  };
}

test('worker RPC rejects malformed and partial responses', async () => {
  const fake = createFakeWorkerProcess();
  const session = createWorkerSession(fake.proc);
  const pending = session.rpc({ type: 'init', env: {}, environment: 'x' });
  fake.listeners.message?.({
    requestId: fake.getSentRequestId(),
    partial: true,
  });
  await assert.rejects(pending, (error) => {
    assert.ok(error instanceof WorkerRpcError);
    assert.equal(error.code, 'worker-rpc-malformed');
    return true;
  });
  session.dispose();
});

test('worker RPC rejects explicit worker failures', async () => {
  const fake = createFakeWorkerProcess();
  const session = createWorkerSession(fake.proc);
  const pending = session.rpc({ type: 'read', identity: ['a', '1'] });
  fake.listeners.message?.({
    requestId: fake.getSentRequestId(),
    ok: false,
    outcome: 'worker-not-initialized',
  });
  await assert.rejects(pending, (error) => {
    assert.ok(error instanceof WorkerRpcError);
    assert.equal(error.code, 'worker-not-initialized');
    return true;
  });
  session.dispose();
});

test(
  'worker RPC rejects hung child via deadline',
  { timeout: 10_000 },
  async () => {
    const fake = createFakeWorkerProcess();
    const session = createWorkerSession(fake.proc);
    const started = Date.now();
    await assert.rejects(
      session.rpc({ type: 'init', env: {}, environment: 'x' }),
      (error) => {
        assert.ok(error instanceof WorkerRpcError);
        assert.equal(error.code, 'worker-rpc-timeout');
        return true;
      },
    );
    const elapsed = Date.now() - started;
    // Allow modest scheduler jitter around the 5s RPC deadline.
    assert.ok(elapsed >= WORKER_RPC_DEADLINE_MS - 250);
    assert.ok(elapsed <= WORKER_RPC_DEADLINE_MS + 1_000);
    session.dispose();
  },
);

test('worker session rejects all pending after exit', async () => {
  const proc = fork(workerPath, {
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    env: { ...process.env, WORKER_TEST_EXIT: '1' },
  });
  const session = createWorkerSession(proc);
  const pending = session.rpc({ type: 'read', identity: ['x'] });
  proc.kill('SIGKILL');
  await assert.rejects(pending, (error) =>
    ['worker-exited', 'worker-disconnected', 'worker-closed'].includes(
      /** @type {WorkerRpcError} */ (error).code,
    ),
  );
  session.dispose();
});

test('cleanup failure is not treated as pass', async () => {
  const fake = createFakeWorkerProcess();
  const originalSend = fake.proc.send;
  fake.proc.send = (message) => {
    originalSend(message);
    if (message.type === 'close') {
      queueMicrotask(() => {
        fake.listeners.message?.({
          requestId: message.requestId,
          ok: true,
          closed: true,
        });
      });
    }
    return true;
  };
  const session = createWorkerSession(fake.proc);
  const outcome = await cleanupWorkerSessions([session]);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.code, 'cleanup-failed');
  session.dispose();
});

test('suite interruption returns typed scenario failure', async () => {
  const controller = new AbortController();
  controller.abort();
  const fakeHandle = {
    runId: 'run-interrupted',
    redisEnv: {},
    publicFacts: { kind: 'redis-docker', runId: 'run-interrupted' },
    async connectAdmin() {
      return { isOpen: false };
    },
    async disconnectAdmin() {},
    faults: {
      stop: async () => ({ ok: true }),
      start: async () => ({ ok: true }),
      stopStart: async () => ({ ok: true }),
      restart: async () => ({ ok: true }),
      pauseClients: async () => ({ ok: true }),
    },
  };

  const outcome = await runIsolatedScenario(
    fakeHandle,
    'disabled-parity',
    't01',
    controller.signal,
  );
  assert.equal(outcome.reason, 'suite-interrupted');
});

test('createHarnessRedisHandle wires runner-owned faults without docker removal', () => {
  const calls = [];
  const handle = createHarnessRedisHandle({
    resource: {
      runId: 'run-1',
      host: '127.0.0.1',
      port: 6501,
      containerId: 'abcabcabcabc123456789abc',
      adminObserver: {
        connectClient: async () => ({ isOpen: true, close: async () => {} }),
      },
    },
    plan: {
      runId: 'run-1',
      runtimeUser: 'verify_runtime',
      keyNamespace: 'offscreen:verify:run-1',
      credentials: { runtimePassword: 'runtime-pass' },
    },
    run: (...args) => {
      calls.push(args);
      return { ok: true, stdout: '', stderr: '' };
    },
  });
  assert.equal(handle.runId, 'run-1');
  assert.equal(handle.redisEnv.REDIS_KEY_PREFIX, 'offscreen:verify:run-1');
  assert.doesNotMatch(JSON.stringify(handle.publicFacts), /runtime-pass/);
  assert.equal(typeof handle.faults.stop, 'function');
  assert.equal(typeof handle.faults.restart, 'function');
});

test('rpc accepts session responses with final stats', async () => {
  const worker = spawnHarnessWorker();
  await rpc(worker, {
    type: 'init',
    env: {},
    environment: buildCacheEnvironmentName('rpc-proof'),
    disabled: true,
  });
  const response = await rpc(worker, {
    type: 'read',
    identity: ['rpc', '1'],
  });
  assert.equal(response.ok, true);
  assert.equal(typeof response.statsDelta, 'object');
  assert.equal(typeof response.durationMs, 'number');
  await shutdownHarnessWorker(worker);
});

test('T02 scenario assertions and metrics helpers stay stable', () => {
  assert.deepEqual(
    assertStartupOutageScenario({
      originFallbackDuringOutage: true,
      crossProcessHit: true,
      recoveryTimeMs: 1200,
    }),
    { ok: true },
  );
  assert.deepEqual(assertShutdownScenario({ closeDurationMs: 120 }), {
    ok: true,
  });
  const metrics = buildT02ScenarioMetrics({
    samples: [10, 20, 30, 40, 50],
    originLoads: 2,
    peakOriginConcurrency: 3,
    telemetry: { 'origin:load:overload': 1, 'runtime:coalesce:coalesced': 4 },
    recoveryTimeMs: 900,
  });
  assert.equal(metrics.sampleCount, 5);
  assert.deepEqual(metrics.sdkPendingQueueMetrics, {
    status: 'unavailable',
    proof: SDK_QUEUE_METRICS_PROOF,
  });
  const totals = extractTelemetryOverloadCoalesced({
    'origin:load:overload': 2,
    'runtime:coalesce:coalesced': 5,
  });
  assert.equal(totals.overload, 2);
  assert.equal(totals.coalesced, 5);
  const built = buildCasePercentiles([5, 15, 25, 35, 45]);
  assert.equal(built.p95, 45);
});

test('T02_SCENARIO_RUNNERS lists seven live fault scenarios', () => {
  assert.equal(Object.keys(T02_SCENARIO_RUNNERS).length, 7);
});

test('synthetic failure and burst scenarios still assert predictably', () => {
  assert.deepEqual(
    assertSyntheticFailureScenario({
      firstAttemptFailed: true,
      retrySucceeded: true,
      value: { id: 's', revision: '1' },
    }),
    { ok: true },
  );
  assert.deepEqual(
    assertBurstSameKeyScenario({
      singleProcessOriginLoads: 1,
      twoProcessTotalOriginLoads: 2,
    }),
    { ok: true },
  );
  assert.deepEqual(
    assertBurstDistinctKeysScenario({ peakOriginConcurrency: 4 }),
    {
      ok: true,
    },
  );
  assert.deepEqual(
    assertDisabledParityScenario({
      value: { id: 'a', revision: '1' },
      enabled: false,
      l2Hits: 0,
    }),
    { ok: true },
  );
  assert.deepEqual(
    assertRestartScenario({
      valueAfterRestart: { id: 'r', revision: '1' },
      originLoadsAfterRestart: 1,
      sharedHitAfterWarm: true,
    }),
    { ok: true },
  );
  assert.deepEqual(
    assertPauseScenario({
      value: { id: 'p', revision: '1' },
      recoveredAfterPause: true,
    }),
    { ok: true },
  );
  assert.deepEqual(
    assertMalformedEnvelopeScenario({
      value: { id: 'm', revision: '1' },
      originLoads: 1,
    }),
    { ok: true },
  );
});

test('buildCacheEnvironmentName is deterministic for a run id', () => {
  const name = buildCacheEnvironmentName('same-run');
  assert.match(name, /^cache07-[0-9a-f]{8}$/);
  assert.equal(buildCacheEnvironmentName('same-run'), name);
});
