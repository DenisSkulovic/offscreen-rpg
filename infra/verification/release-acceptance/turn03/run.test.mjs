import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assertNoFakePass,
  computeTurn03DistributedPocProofOverall,
  isTurn03GatePassAdmissible,
} from './report.mjs';
import { runTurn03ColdTrace } from './run.mjs';

const HASH_1 = 'a'.repeat(64);
const HASH_2 = 'b'.repeat(64);
const ROOT_1 = 'c'.repeat(64);
const ROOT_2 = 'd'.repeat(64);

const IDENTITY = Object.freeze({
  draftId: '11111111-1111-4111-8111-111111111111',
  generationId: '22222222-2222-4222-8222-222222222222',
  storyId: '33333333-3333-4333-8333-333333333333',
  operationId: '44444444-4444-4444-8444-444444444444',
  forkId: '55555555-5555-4555-8555-555555555555',
  sourcePins: { start: { rootHash: ROOT_1 } },
  campaign: { campaignId: 'harbor-watch' },
  draft: { title: 'Harbor watch', premise: 'Orientation only' },
});

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
    sourceSha: 'sha-preflight-abc',
    imageDigests: { 'offscreen-lab-app-release-api:turn02': 'digest-api' },
    runAllowed: false,
  };
}

/**
 * @param {{
 *   omitCheckpoint?: boolean,
 *   openingPending?: boolean,
 *   scene2Pending?: boolean,
 *   authStatus?: number,
 *   omitChildLineage?: boolean,
 * }} [opts]
 */
function buildHttpStub(opts = {}) {
  /** @type {Array<{ method: string, path: string, body?: unknown }>} */
  const calls = [];
  let sleeps = 0;
  const scene1 = {
    id: IDENTITY.storyId,
    revision: 1,
    current: {
      id: '66666666-6666-4666-8666-666666666666',
      interaction: {
        id: '77777777-7777-4777-8777-777777777777',
        specification: { options: [{ id: 'ask-balmora' }] },
      },
    },
  };

  const http = async (method, path, body) => {
    calls.push(body === undefined ? { method, path } : { method, path, body });
    if (opts.authStatus != null && path.endsWith('/start')) {
      return { status: opts.authStatus, body: { error: 'denied' } };
    }
    if (method === 'PUT' && path === `/api/drafts/${IDENTITY.draftId}`) {
      return { status: 200, body: { revision: 1 } };
    }
    if (
      method === 'PUT' &&
      path === `/api/drafts/${IDENTITY.draftId}/openings/${IDENTITY.generationId}`
    ) {
      return { status: 202, body: {} };
    }
    if (method === 'GET' && path === `/api/drafts/${IDENTITY.draftId}/openings/latest`) {
      return {
        status: 200,
        body: {
          preview: {
            id: IDENTITY.generationId,
            state: opts.openingPending ? 'pending' : 'succeeded',
          },
        },
      };
    }
    if (method === 'PUT' && path === `/api/stories/${IDENTITY.storyId}/start`) {
      return { status: 200, body: scene1 };
    }
    if (method === 'GET' && path === `/api/stories/${IDENTITY.storyId}/scenes/1`) {
      return {
        status: 200,
        body: {
          ...scene1,
          checkpointHash: opts.omitCheckpoint ? undefined : HASH_1,
          canon: { rootHash: ROOT_1 },
          canRespond: false,
        },
      };
    }
    if (
      method === 'PUT' &&
      path === `/api/stories/${IDENTITY.storyId}/resolutions/${IDENTITY.operationId}`
    ) {
      return { status: 202, body: {} };
    }
    if (path.endsWith('/receipt')) {
      return {
        status: 200,
        body: {
          operationId: IDENTITY.operationId,
          state: opts.scene2Pending ? 'processing' : 'settled',
        },
      };
    }
    if (method === 'GET' && path === `/api/stories/${IDENTITY.storyId}`) {
      return {
        status: 200,
        body: opts.scene2Pending
          ? scene1
          : {
              id: IDENTITY.storyId,
              revision: 2,
              current: { id: '88888888-8888-4888-8888-888888888888', interaction: null },
            },
      };
    }
    if (method === 'GET' && path === `/api/stories/${IDENTITY.storyId}/scenes/2`) {
      return {
        status: 200,
        body: {
          id: IDENTITY.storyId,
          revision: 2,
          current: { id: '88888888-8888-4888-8888-888888888888', interaction: null },
          checkpointHash: HASH_2,
          canon: { rootHash: ROOT_2 },
        },
      };
    }
    if (
      method === 'PUT' &&
      path === `/api/stories/${IDENTITY.storyId}/forks/${IDENTITY.forkId}`
    ) {
      return { status: 200, body: { id: IDENTITY.forkId } };
    }
    if (method === 'GET' && path === `/api/stories/${IDENTITY.forkId}`) {
      return {
        status: 200,
        body: {
          id: IDENTITY.forkId,
          revision: 1,
          current: { id: scene1.current.id, interaction: null },
          lineage: opts.omitChildLineage
            ? null
            : {
                sourceStoryId: IDENTITY.storyId,
                sourcePassageId: scene1.current.id,
              },
        },
      };
    }
    throw new Error(`unexpected http call: ${method} ${path}`);
  };

  return {
    http,
    calls,
    noteSleep: async () => {
      sleeps += 1;
    },
    sleepCount: () => sleeps,
  };
}

describe('TURN03 R1 public route trace', () => {
  it('positive: real methods and frozen bodies; overall is not PASS', async () => {
    const { http, calls } = buildHttpStub();
    const report = await runTurn03ColdTrace({
      preflight: readyPreflight(),
      http,
      identity: IDENTITY,
      runDisposableKind: true,
      poll: { maxAttempts: 2, sleep: async () => {} },
    });

    assert.deepEqual(
      calls.map((call) => `${call.method} ${call.path}`),
      [
        `PUT /api/drafts/${IDENTITY.draftId}`,
        `PUT /api/drafts/${IDENTITY.draftId}/openings/${IDENTITY.generationId}`,
        `GET /api/drafts/${IDENTITY.draftId}/openings/latest`,
        `PUT /api/stories/${IDENTITY.storyId}/start`,
        `GET /api/stories/${IDENTITY.storyId}/scenes/1`,
        `PUT /api/stories/${IDENTITY.storyId}/resolutions/${IDENTITY.operationId}`,
        `GET /api/stories/${IDENTITY.storyId}/resolutions/${IDENTITY.operationId}/receipt`,
        `GET /api/stories/${IDENTITY.storyId}`,
        `GET /api/stories/${IDENTITY.storyId}/scenes/2`,
        `PUT /api/stories/${IDENTITY.storyId}/forks/${IDENTITY.forkId}`,
        `GET /api/stories/${IDENTITY.forkId}`,
        `GET /api/stories/${IDENTITY.storyId}`,
      ],
    );
    assert.equal(calls[0].body.expectedRevision, 0);
    assert.equal(calls[1].body.expectedRevision, 1);
    assert.equal(calls[3].body.candidateId, IDENTITY.generationId);
    assert.equal(calls[5].body.submission.answer.kind, 'choice.v1');
    assert.equal(calls[5].body.submission.answer.optionId, 'ask-balmora');
    assert.equal(calls[9].body.sourceCheckpointHash, HASH_1);
    assert.equal(calls[9].body.sourcePassageId, '66666666-6666-4666-8666-666666666666');
    assert.equal(
      calls.filter((call) => call.path.includes('/resolutions/')).length,
      2,
    );
    assert.equal(report.trace.storyId, IDENTITY.storyId);
    assert.equal(report.trace.generationId, IDENTITY.generationId);
    assert.equal(report.trace.scene1Checkpoint, HASH_1);
    assert.equal(report.trace.scene2Checkpoint, HASH_2);
    assert.equal(report.trace.scene1Root, ROOT_1);
    assert.equal(report.trace.scene2Root, ROOT_2);
    assert.notEqual(report.overall, 'PASS');
    assert.ok(report.gates.every((gate) => gate.status !== 'PASS'));
    assert.ok(
      report.gates.every(
        (gate) => gate.evidence == null || gate.evidence.mocked === true,
      ),
    );
    assertNoFakePass(report);
  });

  it('negative: opening stays 202-pending and is not resent', async () => {
    const stub = buildHttpStub({ openingPending: true });
    const report = await runTurn03ColdTrace({
      preflight: readyPreflight(),
      http: stub.http,
      identity: IDENTITY,
      runDisposableKind: true,
      poll: { maxAttempts: 2, sleep: stub.noteSleep },
    });
    assert.equal(report.overall, 'BLOCKED');
    assert.equal(stub.sleepCount(), 1);
    assert.equal(
      stub.calls.filter((call) => call.method === 'PUT' && call.path.includes('/openings/'))
        .length,
      1,
    );
    assert.equal(
      stub.calls.some((call) => call.path.includes('/start')),
      false,
    );
  });

  it('negative: missing scene1 checkpoint does not submit the fork', async () => {
    const stub = buildHttpStub({ omitCheckpoint: true });
    const report = await runTurn03ColdTrace({
      preflight: readyPreflight(),
      http: stub.http,
      identity: IDENTITY,
      runDisposableKind: true,
    });
    const forkGate = report.gates.find(
      (gate) => gate.id === 'historical-fork-independent-continuation',
    );
    assert.equal(forkGate?.status, 'FAIL');
    assert.equal(report.trace.scene1Checkpoint, null);
    assert.equal(
      stub.calls.some((call) => call.path.includes('/forks/')),
      false,
    );
    assert.notEqual(report.overall, 'PASS');
    assert.equal(
      computeTurn03DistributedPocProofOverall(report.gates),
      report.overall,
    );
    for (const gate of report.gates) {
      if (gate.status === 'PASS') {
        assert.equal(isTurn03GatePassAdmissible(gate), false);
      }
    }
    assertNoFakePass(report);
  });

  it('negative: scene2 receipt stays processing and the operation is not replaced', async () => {
    const stub = buildHttpStub({ scene2Pending: true });
    const report = await runTurn03ColdTrace({
      preflight: readyPreflight(),
      http: stub.http,
      identity: IDENTITY,
      runDisposableKind: true,
      poll: { maxAttempts: 2, sleep: stub.noteSleep },
    });
    assert.equal(report.overall, 'BLOCKED');
    assert.equal(
      stub.calls.filter(
        (call) =>
          call.method === 'PUT' &&
          call.path ===
            `/api/stories/${IDENTITY.storyId}/resolutions/${IDENTITY.operationId}`,
      ).length,
      1,
    );
    assert.equal(stub.calls.some((call) => call.path.includes('/forks/')), false);
  });

  it('negative: wrong-owner 401 aborts before later writes', async () => {
    const stub = buildHttpStub({ authStatus: 401 });
    const report = await runTurn03ColdTrace({
      preflight: readyPreflight(),
      http: stub.http,
      identity: IDENTITY,
      runDisposableKind: true,
    });
    assert.equal(report.gates.find((gate) => gate.id === 'candidate-start')?.status, 'FAIL');
    assert.equal(
      stub.calls.some((call) => call.path.includes('/resolutions/')),
      false,
    );
    assert.notEqual(report.overall, 'PASS');
  });

  it('negative: child without scene1 lineage fails the fork gate and stays mocked', async () => {
    const { http } = buildHttpStub({ omitChildLineage: true });
    const report = await runTurn03ColdTrace({
      preflight: readyPreflight(),
      http,
      identity: IDENTITY,
      runDisposableKind: true,
    });
    const forkGate = report.gates.find(
      (gate) => gate.id === 'historical-fork-independent-continuation',
    );
    assert.equal(forkGate?.status, 'FAIL');
    assert.equal(forkGate?.evidence?.mocked, true);
    assert.ok(report.gates.every((gate) => gate.status !== 'PASS'));
  });

  it('without runDisposableKind, http is never called', async () => {
    let called = false;
    const http = async () => {
      called = true;
      return { status: 200, body: {} };
    };
    const blocked = await runTurn03ColdTrace({
      preflight: {
        ...readyPreflight(),
        missing: ['oauthEnv'],
        checks: { ...readyPreflight().checks, oauthEnvPresent: false },
      },
      http,
      identity: IDENTITY,
      runDisposableKind: false,
    });
    assert.equal(blocked.overall, 'BLOCKED');
    assert.equal(called, false);

    const idle = await runTurn03ColdTrace({
      preflight: readyPreflight(),
      http,
      identity: IDENTITY,
      runDisposableKind: false,
    });
    assert.equal(idle.overall, 'NOT-RUN');
    assert.equal(called, false);
  });
});
