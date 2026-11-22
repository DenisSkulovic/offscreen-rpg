import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  computeTurn03DistributedPocProofOverall,
  createEmptyTurn03DistributedPocProofReport,
  isTurn03GatePassAdmissible,
  TURN03_MANDATORY_GATE_IDS,
  TURN03_NEGATIVE_MATRIX_CASE_IDS,
} from './report.mjs';
import { runTurn03ColdTrace } from './run.mjs';

/** @returns {import('./preflight.mjs').runTurn03Preflight extends (...args: any) => Promise<infer R> ? R : never} */
function readyPreflight() {
  return {
    contextName: 'kind-offscreen-lab',
    clusterName: 'offscreen-lab',
    images: {},
    checks: {
      contextPresent: true,
      clusterPresent: true,
      imagesPresent: true,
      gatewayPresent: true,
      postgresSecretPresent: true,
      objectStorePresent: true,
      temporalPresent: true,
      oauthEnvPresent: true,
    },
    missing: [],
    blockedReason: null,
    sourceSha: 'sha-adversarial',
    imageDigests: {},
    runAllowed: false,
  };
}

/**
 * @param {Record<string, 'PASS' | 'FAIL' | 'NOT-RUN'>} [overrides]
 */
function allPassMatrix(overrides = {}) {
  /** @type {Record<string, 'PASS' | 'FAIL' | 'NOT-RUN'>} */
  const matrix = {};
  for (const caseId of TURN03_NEGATIVE_MATRIX_CASE_IDS) {
    matrix[caseId] = overrides[caseId] ?? 'PASS';
  }
  return matrix;
}

const minimalHttp = async (method, path) => {
  if (method === 'POST' && path === '/stories') {
    return { storyId: 'adv-story' };
  }
  if (method === 'POST' && path.endsWith('/candidates/start')) {
    return { candidateId: 'c', generationId: 'g' };
  }
  if (method === 'GET' && path.endsWith('/scenes/1')) {
    return { checkpointId: 'cp1', passageId: 'p1', rootHash: 'r1' };
  }
  if (method === 'POST' && path.endsWith('/commands')) {
    return { commandId: 'cmd', attemptId: 'att' };
  }
  if (method === 'GET' && path.startsWith('/executor/outbox/')) {
    return { workflowId: 'wf' };
  }
  if (method === 'POST' && path === '/game-authority/scenes/2/commit') {
    return { ok: true };
  }
  if (method === 'GET' && path.endsWith('/events')) {
    return {};
  }
  if (method === 'GET' && path.endsWith('/scenes/2')) {
    return {
      checkpointId: 'cp2',
      passageId: 'p2',
      rootHash: 'r2',
      future: 'parent-future',
    };
  }
  if (method === 'POST' && path.endsWith('/forks')) {
    return { forkStoryId: 'fork', forkRoot: 'fork-root' };
  }
  if (method === 'GET' && path.endsWith('/future')) {
    return { future: path.includes('fork') ? 'child-future' : 'parent-future' };
  }
  throw new Error(`unexpected: ${method} ${path}`);
};

describe('TURN03 T03 adversarial negative matrix', () => {
  it('full report always has eight gates in mandatory order', async () => {
    const report = await runTurn03ColdTrace({
      preflight: readyPreflight(),
      http: minimalHttp,
      runDisposableKind: true,
      negativeMatrixProbe: () => allPassMatrix(),
    });

    assert.equal(report.gates.length, 8);
    assert.deepEqual(
      report.gates.map((g) => g.id),
      [...TURN03_MANDATORY_GATE_IDS],
    );
    assert.notEqual(report.overall, 'PASS');
  });

  it('injected probe FAIL case => matrix FAIL, gate FAIL, overall FAIL', async () => {
    const report = await runTurn03ColdTrace({
      preflight: readyPreflight(),
      http: minimalHttp,
      runDisposableKind: true,
      negativeMatrixProbe: () =>
        allPassMatrix({ 'stale-root-rejected': 'FAIL' }),
    });

    const matrixGate = report.gates.find(
      (g) => g.id === 'recovery-negative-matrix',
    );
    assert.ok(matrixGate);
    assert.equal(matrixGate.status, 'FAIL');
    assert.equal(
      matrixGate.evidence?.matrix?.['stale-root-rejected'],
      'FAIL',
    );
    assert.equal(report.overall, 'FAIL');
    assert.equal(
      computeTurn03DistributedPocProofOverall(report.gates),
      'FAIL',
    );
  });

  it('all matrix cases PASS locally still leaves overall NOT-RUN (no mocked PASS)', async () => {
    const report = await runTurn03ColdTrace({
      preflight: readyPreflight(),
      http: minimalHttp,
      runDisposableKind: true,
      negativeMatrixProbe: () => allPassMatrix(),
    });

    const matrixGate = report.gates.find(
      (g) => g.id === 'recovery-negative-matrix',
    );
    assert.ok(matrixGate);
    assert.equal(matrixGate.status, 'NOT-RUN');
    assert.ok(
      TURN03_NEGATIVE_MATRIX_CASE_IDS.every(
        (id) => matrixGate.evidence?.matrix?.[id] === 'PASS',
      ),
    );
    assert.equal(report.overall, 'NOT-RUN');
    assert.ok(report.gates.every((gate) => gate.status !== 'PASS'));
  });

  it('without runDisposableKind every matrix case is NOT-RUN', async () => {
    const report = await runTurn03ColdTrace({
      preflight: readyPreflight(),
      negativeMatrixProbe: () => allPassMatrix(),
    });

    const matrixGate = report.gates.find(
      (g) => g.id === 'recovery-negative-matrix',
    );
    assert.ok(matrixGate);
    assert.equal(matrixGate.status, 'NOT-RUN');
    assert.ok(
      TURN03_NEGATIVE_MATRIX_CASE_IDS.every(
        (id) => matrixGate.evidence?.matrix?.[id] === 'NOT-RUN',
      ),
    );
    assert.equal(report.overall, 'NOT-RUN');
  });

  it('inadmissible kind-cross-pod PASS => overall FAIL via helper', () => {
    const report = createEmptyTurn03DistributedPocProofReport();
    report.gates = report.gates.map((gate) => {
      if (gate.id === 'cluster-real-app') {
        return {
          id: gate.id,
          status: 'PASS',
          evidence: { tier: 'local', mocked: false, summary: 'bad tier' },
        };
      }
      if (gate.id === 'candidate-start' || gate.id === 'auth-ssr') {
        return {
          id: gate.id,
          status: 'PASS',
          evidence: { tier: 'local', summary: 'ok' },
        };
      }
      return { ...gate, status: 'NOT-RUN', evidence: null };
    });

    assert.equal(isTurn03GatePassAdmissible(report.gates[0]), false);
    assert.equal(computeTurn03DistributedPocProofOverall(report.gates), 'FAIL');
  });
});