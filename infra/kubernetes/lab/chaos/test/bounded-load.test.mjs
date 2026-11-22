import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { computeObservedP95Ms, runBoundedLoad } from '../bounded-load.mjs';
import { buildK8s10Report, K8S10_GAME_CHAOS_SCHEMA } from '../report.mjs';

function okCommand(overrides = {}) {
  return async () => ({
    accepted: true,
    latencyMs: 12,
    queueDepth: 1,
    statusCode: 200,
    operationId: 'op-11111111-1111-4111-8111-111111111111',
    ...overrides,
  });
}

describe('runBoundedLoad', () => {
  test('caps 4 identities at 9 commands with refusedOverflow', async () => {
    const executed = [];
    const result = await runBoundedLoad({
      identities: ['a', 'b', 'c', 'd'],
      actionsPerIdentity: 3,
      memoryKib: 300_000,
      command: async (identity, actionIndex) => {
        executed.push(`${identity}:${actionIndex}`);
        return {
          accepted: true,
          latencyMs: 5,
          queueDepth: 0,
          statusCode: 200,
          operationId: `op-${identity}-${actionIndex}`,
        };
      },
    });

    assert.equal(result.plannedCommands, 9);
    assert.equal(executed.length, 9);
    assert.equal(result.refusedOverflow, 3);
    assert.notEqual(executed.length, 10);
    assert.equal(result.multiOwner, 'RUN');
  });

  test('one identity runs serially with multiOwner NOT-RUN', async () => {
    const order = [];
    const result = await runBoundedLoad({
      identities: ['solo'],
      actionsPerIdentity: 2,
      memoryKib: 300_000,
      command: async (identity, actionIndex) => {
        order.push(actionIndex);
        return {
          accepted: true,
          latencyMs: 3,
          queueDepth: 1,
          statusCode: 200,
          operationId: `op-${actionIndex}`,
        };
      },
    });

    assert.equal(result.multiOwner, 'NOT-RUN');
    assert.equal(result.executedCommands, 2);
    assert.equal(result.commands.length, 2);
    assert.deepEqual(order, [0, 1]);
    assert.equal(result.status, 'PASS');
  });

  test('low memory aborts with zero executed commands', async () => {
    const result = await runBoundedLoad({
      identities: ['a', 'b'],
      actionsPerIdentity: 3,
      memoryKib: 200_000,
      command: okCommand(),
    });

    assert.equal(result.status, 'ABORT');
    assert.equal(result.reason, 'low-memory');
    assert.equal(result.executedCommands, 0);
    assert.deepEqual(result.commands, []);
  });

  test('provider spy invocation yields FAIL provider-dispatch', async () => {
    const opts = {
      identities: ['a'],
      actionsPerIdentity: 1,
      memoryKib: 300_000,
      providerSpy: () => {},
      command: async () => {
        opts.providerSpy();
        return {
          accepted: true,
          latencyMs: 1,
          queueDepth: 0,
          statusCode: 200,
          operationId: 'op-1',
        };
      },
    };
    const result = await runBoundedLoad(opts);
    assert.equal(result.status, 'FAIL');
    assert.equal(result.reason, 'provider-dispatch');
    assert.equal(result.providerSpyInvocations, 1);
  });

  test('window timeout after 60s injected clock is not PASS', async () => {
    let current = 0;
    let call = 0;
    const result = await runBoundedLoad({
      identities: ['a'],
      actionsPerIdentity: 3,
      windowMs: 60_000,
      memoryKib: 300_000,
      now: () => current,
      command: async () => {
        call += 1;
        if (call === 1) {
          current = 1;
          return {
            accepted: true,
            latencyMs: 5,
            queueDepth: 0,
            statusCode: 200,
            operationId: 'op-1',
          };
        }
        current = 60_001;
        return {
          accepted: true,
          latencyMs: 5,
          queueDepth: 0,
          statusCode: 200,
          operationId: 'op-2',
        };
      },
    });

    assert.notEqual(result.status, 'PASS');
    assert.ok(result.timedOut >= 1);
    assert.equal(result.reason, 'window-timeout');
  });

  test('observedP95Ms is computed without threshold assertion', () => {
    const p95 = computeObservedP95Ms([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    assert.equal(typeof p95, 'number');
    assert.ok(p95 >= 90);
  });

  test('duplicateEffect fails closed', async () => {
    const result = await runBoundedLoad({
      identities: ['a'],
      actionsPerIdentity: 1,
      memoryKib: 300_000,
      command: async () => ({
        accepted: true,
        latencyMs: 1,
        queueDepth: 0,
        statusCode: 200,
        duplicateEffect: true,
        operationId: 'op-dup',
      }),
    });
    assert.equal(result.status, 'FAIL');
    assert.equal(result.reason, 'duplicate-effect');
  });

  test('status 500 fails closed', async () => {
    const result = await runBoundedLoad({
      identities: ['a'],
      actionsPerIdentity: 1,
      memoryKib: 300_000,
      command: async () => ({
        accepted: true,
        latencyMs: 1,
        queueDepth: 0,
        statusCode: 503,
        operationId: 'op-err',
      }),
    });
    assert.equal(result.status, 'FAIL');
    assert.equal(result.reason, 'server-error');
  });

  test('409 is recorded as conflict without hidden pass failure alone', async () => {
    const result = await runBoundedLoad({
      identities: ['a'],
      actionsPerIdentity: 1,
      memoryKib: 300_000,
      command: async () => ({
        accepted: true,
        latencyMs: 4,
        queueDepth: 2,
        statusCode: 409,
        operationId: 'op-held',
        held: true,
      }),
    });
    assert.equal(result.conflicts409, 1);
    assert.equal(result.status, 'PASS');
  });
});

describe('buildK8s10Report', () => {
  test('schema field is exact and NOT-RUN when live eligibility false', () => {
    const report = buildK8s10Report({
      sourceSha: 'sha',
      turn03ProofId: 'proof-1',
      releaseRefSha: 'release-sha',
      clusterUid: 'cluster-1',
      liveEligibility: { eligible: false, reason: 'turn03-proof-missing' },
      latencySamples: [1, 2, 3],
    });

    assert.equal(report.schema, K8S10_GAME_CHAOS_SCHEMA);
    assert.equal(report.schema, 'offscreen.k8s10-game-chaos.v1');
    assert.equal(report.outcome, 'NOT-RUN');
    assert.deepEqual(report.latencySamples, []);
  });

  test('strips authorization-like fields from nested event payloads', () => {
    const report = buildK8s10Report({
      liveEligibility: { eligible: true },
      sourceSha: 'sha',
      turn03ProofId: 'proof-2',
      releaseRefSha: 'release-sha',
      clusterUid: 'cluster-2',
      events: [
        {
          type: 'sample',
          authorization: 'must-not-remain',
          cookie: 'must-not-remain',
          summary: 'ok',
        },
      ],
      pods: [
        {
          name: 'worker-1',
          uid: 'pod-uid-1',
          imageDigest: 'sha256:abc',
          phase: 'Running',
        },
      ],
      oracleDigests: ['digest-a'],
      faultIntent: { kind: 'bounded-load' },
      storyOperationIds: ['op-1'],
      latencySamples: [7, 8],
      outcome: 'PASS',
      cleanup: { status: 'complete' },
    });

    const event = report.events[0];
    assert.equal('authorization' in event, false);
    assert.equal('cookie' in event, false);
    assert.equal(event.summary, 'ok');
    assert.match(report.oracleDigests[0], /^redacted:/);
  });

  test('blocks secret-like cookie text in story fields', () => {
    const blocked = buildK8s10Report({
      liveEligibility: { eligible: true },
      blockOnSecretMaterial: false,
      faultIntent: { summary: 'session=super-secret-cookie-value' },
      sourceSha: 'sha',
      turn03ProofId: 'proof-3',
      releaseRefSha: 'release-sha',
      clusterUid: 'cluster-3',
      latencySamples: [],
      outcome: 'PASS',
    });
    assert.equal(blocked.outcome, 'BLOCKED');
    assert.throws(
      () =>
        buildK8s10Report({
          liveEligibility: { eligible: true },
          events: [{ summary: 'Bearer eyJhbGciOiJIUzI1NiJ9' }],
          sourceSha: 'sha',
          turn03ProofId: 'proof-4',
        }),
      /secret-material/,
    );
  });
});
