import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assertNoFakePass,
  computeTurn03DistributedPocProofOverall,
  isTurn03GatePassAdmissible,
} from './report.mjs';
import { runTurn03ColdTrace } from './run.mjs';

const TRACE_IDS = Object.freeze({
  storyId: 'story-trace-001',
  candidateId: 'candidate-trace-002',
  generationId: 'generation-trace-003',
  workflowId: 'workflow-trace-004',
  attemptId: 'attempt-trace-005',
  passage1: 'passage1-trace-006',
  passage2: 'passage2-trace-007',
  scene1Checkpoint: 'checkpoint1-trace-008',
  scene2Checkpoint: 'checkpoint2-trace-009',
  scene1Root: 'root1-trace-00a',
  scene2Root: 'root2-trace-00b',
  forkRoot: 'fork-root-trace-00c',
  forkStoryId: 'fork-story-trace-00d',
  commandId: 'command-trace-00e',
  parentFuture: 'future-parent-trace-00e',
  forkFuture: 'future-fork-trace-00f',
});

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
    sourceSha: 'sha-preflight-abc',
    imageDigests: { 'offscreen-lab-app-release-api:turn02': 'digest-api' },
    runAllowed: false,
  };
}

/**
 * @param {{ omitScene1Checkpoint?: boolean, omitForkProof?: boolean }} [opts]
 */
function buildPositiveHttpStub(opts = {}) {
  /** @type {Array<{ method: string, path: string, body?: unknown }>} */
  const calls = [];

  const http = async (method, path, body) => {
    calls.push(body === undefined ? { method, path } : { method, path, body });
    const id = TRACE_IDS;

    if (method === 'POST' && path === '/stories') {
      return { storyId: id.storyId };
    }
    if (method === 'POST' && path === `/stories/${id.storyId}/candidates/start`) {
      return { candidateId: id.candidateId, generationId: id.generationId };
    }
    if (method === 'GET' && path === `/stories/${id.storyId}/scenes/1`) {
      if (opts.omitScene1Checkpoint) {
        return {
          passageId: id.passage1,
          rootHash: id.scene1Root,
        };
      }
      return {
        checkpointId: id.scene1Checkpoint,
        passageId: id.passage1,
        rootHash: id.scene1Root,
      };
    }
    if (method === 'POST' && path === `/stories/${id.storyId}/commands`) {
      return { commandId: id.commandId, attemptId: id.attemptId };
    }
    if (method === 'GET' && path === `/executor/outbox/${id.commandId}`) {
      return { workflowId: id.workflowId };
    }
    if (method === 'POST' && path === '/game-authority/scenes/2/commit') {
      return { ok: true };
    }
    if (method === 'GET' && path === `/stories/${id.storyId}/events`) {
      return { sse: 'hint' };
    }
    if (method === 'GET' && path === `/stories/${id.storyId}/scenes/2`) {
      return {
        checkpointId: id.scene2Checkpoint,
        passageId: id.passage2,
        rootHash: id.scene2Root,
        future: id.parentFuture,
      };
    }
    if (method === 'POST' && path === `/stories/${id.storyId}/forks`) {
      if (opts.omitForkProof) {
        return { storyId: id.forkStoryId };
      }
      return { forkStoryId: id.forkStoryId, forkRoot: id.forkRoot };
    }
    if (method === 'GET' && path === `/stories/${id.forkStoryId}/future`) {
      if (opts.omitForkProof) {
        return { future: id.parentFuture };
      }
      return { future: id.forkFuture };
    }
    if (method === 'GET' && path === `/stories/${id.storyId}/future`) {
      return { future: id.parentFuture };
    }
    throw new Error(`unexpected http call: ${method} ${path}`);
  };

  return { http, calls };
}

describe('TURN03 T02 runTurn03ColdTrace', () => {
  it('positive: injected http maps distinct trace IDs; overall is not PASS', async () => {
    const { http } = buildPositiveHttpStub();
    const report = await runTurn03ColdTrace({
      preflight: readyPreflight(),
      http,
      runDisposableKind: true,
    });

    assert.equal(report.trace.storyId, TRACE_IDS.storyId);
    assert.equal(report.trace.candidateId, TRACE_IDS.candidateId);
    assert.equal(report.trace.generationId, TRACE_IDS.generationId);
    assert.equal(report.trace.workflowId, TRACE_IDS.workflowId);
    assert.equal(report.trace.attemptId, TRACE_IDS.attemptId);
    assert.equal(report.trace.passage1, TRACE_IDS.passage1);
    assert.equal(report.trace.passage2, TRACE_IDS.passage2);
    assert.equal(report.trace.scene1Checkpoint, TRACE_IDS.scene1Checkpoint);
    assert.equal(report.trace.scene2Checkpoint, TRACE_IDS.scene2Checkpoint);
    assert.equal(report.trace.scene1Root, TRACE_IDS.scene1Root);
    assert.equal(report.trace.scene2Root, TRACE_IDS.scene2Root);
    assert.equal(report.trace.forkRoot, TRACE_IDS.forkRoot);

    assert.notEqual(report.overall, 'PASS');
    assert.ok(report.gates.every((gate) => gate.status !== 'PASS'));
    assert.ok(
      report.gates.every(
        (gate) =>
          gate.evidence == null ||
          gate.evidence.tier !== 'kind-cross-pod' ||
          gate.evidence.mocked === true,
      ),
    );
    assertNoFakePass(report);
  });

  it('negative: missing scene1 checkpoint and fork proof => overall FAIL or NOT-RUN; no admissible PASS', async () => {
    const { http } = buildPositiveHttpStub({
      omitScene1Checkpoint: true,
      omitForkProof: true,
    });
    const report = await runTurn03ColdTrace({
      preflight: readyPreflight(),
      http,
      runDisposableKind: true,
    });

    assert.ok(report.overall === 'FAIL' || report.overall === 'NOT-RUN');
    assert.notEqual(report.overall, 'PASS');

    const forkGate = report.gates.find(
      (g) => g.id === 'historical-fork-independent-continuation',
    );
    assert.ok(forkGate);
    assert.notEqual(forkGate.status, 'PASS');

    for (const gate of report.gates) {
      if (gate.status === 'PASS') {
        assert.equal(isTurn03GatePassAdmissible(gate), false);
      }
    }

    assert.equal(report.trace.scene1Checkpoint, null);
    assert.equal(report.trace.forkRoot, null);
    assert.equal(
      computeTurn03DistributedPocProofOverall(report.gates),
      report.overall,
    );
    assertNoFakePass(report);
  });

  it('without runDisposableKind, http is never called', async () => {
    let called = false;
    const http = async () => {
      called = true;
      return {};
    };

    const blocked = await runTurn03ColdTrace({
      preflight: {
        ...readyPreflight(),
        missing: ['oauthEnv'],
        checks: { ...readyPreflight().checks, oauthEnvPresent: false },
      },
      http,
      runDisposableKind: false,
    });
    assert.equal(blocked.overall, 'BLOCKED');
    assert.equal(called, false);

    const idle = await runTurn03ColdTrace({
      preflight: readyPreflight(),
      http,
      runDisposableKind: false,
    });
    assert.equal(idle.overall, 'NOT-RUN');
    assert.equal(idle.sourceSha, 'sha-preflight-abc');
    assert.deepEqual(idle.imageDigests, readyPreflight().imageDigests);
    assert.equal(called, false);

    const implicit = await runTurn03ColdTrace({
      preflight: readyPreflight(),
      http,
    });
    assert.equal(implicit.overall, 'NOT-RUN');
    assert.equal(called, false);
  });
});