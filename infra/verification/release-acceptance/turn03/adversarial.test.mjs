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
    contextName: 'kind-offscreen-release',
    clusterName: 'offscreen-release',
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

const adversarialIdentity = {
  draftId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  generationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  storyId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  operationId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  forkId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  sourcePins: { start: { rootHash: 'e'.repeat(64) } },
  campaign: { campaignId: 'harbor-watch' },
  draft: { title: 'Harbor watch' },
};

const minimalHttp = async (method, path) => {
  const story = adversarialIdentity.storyId;
  const passage = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  if (method === 'PUT' && path === `/api/drafts/${adversarialIdentity.draftId}`) {
    return { status: 200, body: {} };
  }
  if (method === 'PUT' && path.includes('/openings/')) {
    return { status: 202, body: {} };
  }
  if (method === 'GET' && path.endsWith('/openings/latest')) {
    return {
      status: 200,
      body: { preview: { id: adversarialIdentity.generationId, state: 'succeeded' } },
    };
  }
  if (method === 'PUT' && path.endsWith('/start')) {
    return {
      status: 200,
      body: {
        id: story,
        revision: 1,
        current: {
          id: passage,
          interaction: { id: '99999999-9999-4999-8999-999999999999', specification: { options: [{ id: 'ask' }] } },
        },
      },
    };
  }
  if (method === 'GET' && path.endsWith('/scenes/1')) {
    return {
      status: 200,
      body: {
        revision: 1,
        current: { id: passage, interaction: null },
        checkpointHash: 'a'.repeat(64),
        canon: { rootHash: 'b'.repeat(64) },
      },
    };
  }
  if (method === 'PUT' && path.includes('/resolutions/')) {
    return { status: 202, body: {} };
  }
  if (path.endsWith('/receipt')) {
    return { status: 200, body: { operationId: adversarialIdentity.operationId, state: 'settled' } };
  }
  if (method === 'GET' && path === `/api/stories/${story}`) {
    return {
      status: 200,
      body: { id: story, revision: 2, current: { id: '12121212-1212-4121-8121-121212121212', interaction: null } },
    };
  }
  if (method === 'GET' && path.endsWith('/scenes/2')) {
    return {
      status: 200,
      body: {
        revision: 2,
        current: { id: '12121212-1212-4121-8121-121212121212', interaction: null },
        checkpointHash: 'c'.repeat(64),
        canon: { rootHash: 'd'.repeat(64) },
      },
    };
  }
  if (method === 'PUT' && path.includes('/forks/')) {
    return { status: 200, body: {} };
  }
  if (method === 'GET' && path === `/api/stories/${adversarialIdentity.forkId}`) {
    return {
      status: 200,
      body: {
        id: adversarialIdentity.forkId,
        revision: 1,
        current: { id: passage, interaction: null },
        lineage: { sourceStoryId: story, sourcePassageId: passage },
      },
    };
  }
  throw new Error(`unexpected: ${method} ${path}`);
};

describe('TURN03 T03 adversarial negative matrix', () => {
  it('full report always has eight gates in mandatory order', async () => {
    const report = await runTurn03ColdTrace({
      preflight: readyPreflight(),
      http: minimalHttp,
      identity: adversarialIdentity,
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
      identity: adversarialIdentity,
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
      identity: adversarialIdentity,
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