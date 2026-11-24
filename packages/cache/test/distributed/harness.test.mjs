import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CACHE07_POLICY,
  SDK_QUEUE_METRICS_PROOF,
  assertBurstDistinctKeysScenario,
  assertBurstSameKeyScenario,
  assertDisabledParityScenario,
  assertDistinctRevisionScenario,
  assertEvictionScenario,
  assertMalformedEnvelopeScenario,
  assertPauseScenario,
  assertRestartScenario,
  assertSharedHitScenario,
  assertShutdownScenario,
  assertStartupOutageScenario,
  assertSyntheticFailureScenario,
  buildCacheEnvironmentName,
  buildCasePercentiles,
  buildGeneratedRedisEnv,
  buildOwnedContainerCreateArgs,
  buildT02ScenarioMetrics,
  computeNearestRankPercentile,
  createDockerExecutor,
  extractTelemetryOverloadCoalesced,
  forceRemoveOwnedContainer,
  parseDockerPort,
  pauseOwnedRedisClients,
  proofCacheKey,
  rejectSuppliedRedisUrl,
  restartOwnedContainer,
  startOwnedContainer,
  stopOwnedContainer,
  T02_SCENARIO_RUNNERS,
  validateDockerContextEndpoint,
  validateLiveOptIn,
  verifyContainerOwnership,
} from './harness.mjs';

test('validateLiveOptIn refuses without explicit live opt-in', () => {
  const refusal = validateLiveOptIn([], {});
  assert.ok(refusal);
  assert.equal(refusal.status, 'NOT-RUN');

  const missingEnv = validateLiveOptIn(['--live'], {});
  assert.ok(missingEnv);

  assert.equal(
    validateLiveOptIn(['--live'], { CACHE07_ALLOW_DISPOSABLE_REDIS: '1' }),
    null,
  );
});

test('rejectSuppliedRedisUrl rejects external endpoint injection', () => {
  const refusal = rejectSuppliedRedisUrl({ REDIS_URL: 'redis://shared:6379' });
  assert.ok(refusal);
  assert.equal(refusal.status, 'FAIL');
  assert.equal(rejectSuppliedRedisUrl({}), null);
});

test('validateDockerContextEndpoint accepts local sockets and rejects remote tcp', () => {
  assert.deepEqual(validateDockerContextEndpoint('unix:///var/run/docker.sock'), {
    ok: true,
  });
  assert.deepEqual(
    validateDockerContextEndpoint('npipe:////./pipe/docker_engine'),
    { ok: true },
  );
  const remote = validateDockerContextEndpoint('tcp://203.0.113.10:2376');
  assert.equal(remote.ok, false);
  const ssh = validateDockerContextEndpoint('ssh://ubuntu@203.0.113.10');
  assert.equal(ssh.ok, false);
});

test('verifyContainerOwnership enforces id, label, image and port', () => {
  const inspect = {
    Id: 'abcd1234ef567890',
    Config: {
      Image: 'redis:8.2.1-alpine',
      Labels: { 'offscreen.cache07.run': 'run-1' },
    },
    NetworkSettings: {
      Ports: {
        '6379/tcp': [{ HostIp: '127.0.0.1', HostPort: '63791' }],
      },
    },
  };
  const ok = verifyContainerOwnership(inspect, {
    runId: 'run-1',
    containerId: 'abcd1234ef567890',
    hostPort: 63791,
  });
  assert.deepEqual(ok, { ok: true });

  const wrongLabel = verifyContainerOwnership(inspect, {
    runId: 'run-2',
    containerId: 'abcd1234ef567890',
    hostPort: 63791,
  });
  assert.equal(wrongLabel.ok, false);

  const wrongPort = verifyContainerOwnership(inspect, {
    runId: 'run-1',
    containerId: 'abcd1234ef567890',
    hostPort: 12345,
  });
  assert.equal(wrongPort.ok, false);
});

test('computeNearestRankPercentile uses nearest-rank method', () => {
  const samples = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  assert.equal(computeNearestRankPercentile(samples, 0.95), 100);
  assert.equal(computeNearestRankPercentile(samples, 0.5), 50);
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
  assert.equal(
    assertSharedHitScenario({
      valueA: { id: 'a', revision: '1' },
      valueB: { id: 'b', revision: '1' },
      totalOriginLoads: 1,
    }).ok,
    false,
  );

  assert.deepEqual(
    assertDisabledParityScenario({
      value: { id: 'a', revision: '1' },
      enabled: false,
      l2Hits: 0,
    }),
    { ok: true },
  );

  assert.deepEqual(assertDistinctRevisionScenario({ totalOriginLoads: 2 }), {
    ok: true,
  });

  assert.deepEqual(
    assertMalformedEnvelopeScenario({
      value: { id: 'm', revision: '1' },
      originLoads: 1,
    }),
    { ok: true },
  );

  assert.deepEqual(
    assertEvictionScenario({
      evictedKeysDelta: 2,
      absentKeyVerified: true,
      value: { id: 'e', revision: '1' },
    }),
    { ok: true },
  );
});

test('buildGeneratedRedisEnv only exposes the generated loopback endpoint', () => {
  const env = buildGeneratedRedisEnv(65123);
  assert.equal(env.REDIS_URL, 'redis://127.0.0.1:65123');
  assert.equal(env.REDIS_CONNECT_TIMEOUT_MS, '500');
  assert.equal(env.REDIS_OPERATION_TIMEOUT_MS, '100');
});

test('buildOwnedContainerCreateArgs pins docker flags and disables pull', () => {
  const spec = buildOwnedContainerCreateArgs('uuid-1');
  assert.equal(spec.name, 'cache07-uuid-1');
  assert.ok(spec.args.includes('--pull'));
  assert.ok(spec.args.includes('never'));
  assert.ok(spec.args.includes('redis:8.2.1-alpine'));
  assert.ok(spec.args.includes('--cap-drop'));
});

test('proofCacheKey uses cache07-proof namespace/version', () => {
  const key = proofCacheKey('cache07-deadbeef', ['x']);
  assert.match(key, /^cache07-deadbeef:cache07-proof:v1:/);
  assert.equal(CACHE07_POLICY.namespace, 'cache07-proof');
});

test('createDockerExecutor bounds command duration', async () => {
  let observedTimeout = 0;
  const fakeRunner = async (_file, _args, opts = {}) => {
    observedTimeout = opts.timeout ?? 0;
    return { stdout: '', stderr: '' };
  };
  const dockerExec = createDockerExecutor(fakeRunner, { timeoutMs: 2500 });
  await dockerExec('docker', ['version']);
  assert.equal(observedTimeout, 2500);
});

test('forceRemoveOwnedContainer treats inspect failure as successful cleanup', async () => {
  const calls = [];
  const fakeRunner = async (file, args) => {
    calls.push([file, ...args]);
    if (args[0] === 'inspect') {
      throw new Error('No such object');
    }
    return { stdout: '', stderr: '' };
  };
  const result = await forceRemoveOwnedContainer(fakeRunner, 'abcd');
  assert.equal(result.removed, true);
  assert.deepEqual(calls[0], ['docker', 'rm', '-f', 'abcd']);
});

test('parseDockerPort rejects malformed values', () => {
  assert.equal(parseDockerPort('63901'), 63901);
  assert.throws(() => parseDockerPort('not-a-port'), /CouldNotParseDockerPort/);
});

test('T02 scenario assertions pass and fail predictably', () => {
  assert.deepEqual(
    assertStartupOutageScenario({
      originFallbackDuringOutage: true,
      crossProcessHit: true,
      recoveryTimeMs: 1200,
    }),
    { ok: true },
  );
  assert.equal(
    assertStartupOutageScenario({
      originFallbackDuringOutage: true,
      crossProcessHit: false,
      recoveryTimeMs: null,
    }).ok,
    false,
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
    assertBurstSameKeyScenario({
      singleProcessOriginLoads: 1,
      twoProcessTotalOriginLoads: 2,
    }),
    { ok: true },
  );
  assert.equal(
    assertBurstSameKeyScenario({
      singleProcessOriginLoads: 2,
      twoProcessTotalOriginLoads: 1,
    }).ok,
    false,
  );

  assert.deepEqual(assertBurstDistinctKeysScenario({ peakOriginConcurrency: 4 }), {
    ok: true,
  });
  assert.equal(
    assertBurstDistinctKeysScenario({ peakOriginConcurrency: 5 }).ok,
    false,
  );

  assert.deepEqual(
    assertSyntheticFailureScenario({
      firstAttemptFailed: true,
      retrySucceeded: true,
      value: { id: 's', revision: '1' },
    }),
    { ok: true },
  );

  assert.deepEqual(assertShutdownScenario({ closeDurationMs: 120 }), { ok: true });
  assert.equal(assertShutdownScenario({ closeDurationMs: 6000 }).ok, false);
});

test('buildT02ScenarioMetrics reports percentiles and unavailable queue metrics', () => {
  const metrics = buildT02ScenarioMetrics({
    samples: [10, 20, 30, 40, 50],
    originLoads: 2,
    peakOriginConcurrency: 3,
    telemetry: {
      'origin:load:overload': 1,
      'runtime:coalesce:coalesced': 4,
    },
    recoveryTimeMs: 900,
  });
  assert.equal(metrics.sampleCount, 5);
  assert.equal(metrics.p95, 50);
  assert.equal(metrics.originLoads, 2);
  assert.equal(metrics.peakOriginConcurrency, 3);
  assert.equal(metrics.telemetryOverload, 1);
  assert.equal(metrics.telemetryCoalesced, 4);
  assert.equal(metrics.recoveryTimeMs, 900);
  assert.deepEqual(metrics.sdkPendingQueueMetrics, {
    status: 'unavailable',
    proof: SDK_QUEUE_METRICS_PROOF,
  });
});

test('extractTelemetryOverloadCoalesced sums outcome counters', () => {
  const totals = extractTelemetryOverloadCoalesced({
    'origin:load:overload': 2,
    'runtime:coalesce:overload': 1,
    'runtime:coalesce:coalesced': 5,
    'l2:get:hit': 3,
  });
  assert.equal(totals.overload, 3);
  assert.equal(totals.coalesced, 5);
});

test('buildCasePercentiles aligns with suite percentiles', () => {
  const built = buildCasePercentiles([5, 15, 25, 35, 45]);
  assert.equal(built.p95, 45);
  assert.equal(
    computeNearestRankPercentile([5, 15, 25, 35, 45], 0.95),
    built.p95,
  );
});

test('fake docker executor records stop start restart and pause commands', async () => {
  const calls = [];
  const fakeRunner = async (_file, args) => {
    calls.push(args);
    return { stdout: '', stderr: '' };
  };
  await stopOwnedContainer(fakeRunner, 'cid-1');
  await startOwnedContainer(fakeRunner, 'cid-1');
  await restartOwnedContainer(fakeRunner, 'cid-1');
  await pauseOwnedRedisClients(fakeRunner, 'cid-1', 350);
  assert.deepEqual(calls[0], ['stop', 'cid-1']);
  assert.deepEqual(calls[1], ['start', 'cid-1']);
  assert.deepEqual(calls[2], ['restart', 'cid-1']);
  assert.deepEqual(calls[3], [
    'exec',
    'cid-1',
    'redis-cli',
    'CLIENT',
    'PAUSE',
    '350',
    'ALL',
  ]);
});

test('T02_SCENARIO_RUNNERS lists seven live fault scenarios', () => {
  assert.equal(Object.keys(T02_SCENARIO_RUNNERS).length, 7);
  for (const id of [
    'startup-outage',
    'restart',
    'pause',
    'burst-same-key',
    'burst-distinct-keys',
    'synthetic-failure',
    'shutdown',
  ]) {
    assert.equal(typeof T02_SCENARIO_RUNNERS[id], 'function');
  }
});

test('buildCacheEnvironmentName is deterministic for a run id', () => {
  const name = buildCacheEnvironmentName('same-run');
  assert.match(name, /^cache07-[0-9a-f]{8}$/);
  assert.equal(buildCacheEnvironmentName('same-run'), name);
});