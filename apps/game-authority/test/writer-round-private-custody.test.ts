import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  writerRoundPrivateCustodyBodyByteLimit,
  writerRoundPrivateCustodyContractVersion,
  writerRoundPrivateCustodyVersionHeader,
  writerRoundPrivatePreparePath,
} from '@offscreen/game-authority-protocol/writer-round-private-custody';
import type { WriterRoundSeam } from '../src/application';
import { startGameAuthorityServer } from '../src/server';

const storyToken = 'test-story-service-credential';
const executorToken = 'test-executor-only-credential';
const controlToken = 'test-control-only-credential';
const missionId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const contextId = missionId;
const attemptId = randomUUID();

function noopSeam() {
  return {
    async read() {
      return {};
    },
    async startFromCandidate() {
      throw new Error('unexpected');
    },
    async admitResolution() {
      return {};
    },
    async fork() {
      throw new Error('unexpected');
    },
    async putLaunch() {
      throw new Error('unexpected');
    },
    async getLaunch() {
      throw new Error('unexpected');
    },
  };
}

function memoryWriterRounds(): WriterRoundSeam & {
  prepareCalls: number;
  submitCalls: number;
} {
  let prepareCalls = 0;
  let submitCalls = 0;
  return {
    get prepareCalls() {
      return prepareCalls;
    },
    get submitCalls() {
      return submitCalls;
    },
    async prepareRound() {
      prepareCalls += 1;
      return {
        status: 'ready' as const,
        missionId,
        contextId,
        ordinal: 1,
        attemptId,
        requestSha256: 'a'.repeat(64),
        wire: {
          version: 'openrouter-wire.v1' as const,
          serialized: '{"messages":[]}',
          sha256: 'b'.repeat(64),
          serializedBytes: 15,
        },
        modelPolicy: {
          model: 'anthropic/claude-3.5-sonnet',
          provider: 'Anthropic',
          priceVersion: 'wr10.v1',
          inputMicrousdPerMillion: '1000000',
          outputMicrousdPerMillion: '2000000',
          maxInputTokens: 1024,
          maxOutputTokens: 256,
          maxModelRounds: 2,
          timeoutMs: 30_000,
          maxMicrousd: '5000',
        },
      };
    },
    async submitOutcome() {
      submitCalls += 1;
      return { status: 'uncertain' as const };
    },
    async getStatus() {
      return { status: 'dispatched' as const, attemptId };
    },
    async planRound() {
      throw new Error('unexpected control plan');
    },
    async readMissionState() {
      return { status: 'pending' as const };
    },
    async finalizeRound() {
      throw new Error('unexpected control finalize');
    },
  };
}

async function call(
  origin: string,
  path: string,
  init: RequestInit & { token?: string } = {},
) {
  const headers = new Headers(init.headers);
  if (init.token !== undefined) {
    headers.set('authorization', `Bearer ${init.token}`);
  }
  return fetch(new URL(path, origin), { ...init, headers });
}

test('executor bearer reaches writer-round private prepare', async () => {
  const writerRounds = memoryWriterRounds();
  const server = await startGameAuthorityServer({
    seam: noopSeam(),
    writerRounds,
    token: storyToken,
    executorToken,
    controlToken,
    timeoutMs: 1000,
  });
  try {
    const prepared = await call(
      server.origin,
      writerRoundPrivatePreparePath(missionId, 1),
      {
        method: 'POST',
        token: executorToken,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          schemaVersion: writerRoundPrivateCustodyContractVersion,
          contextId,
          attemptId,
          expectedRevision: 1,
        }),
      },
    );
    assert.equal(prepared.status, 200);
    const body = (await prepared.json()) as { status: string };
    assert.equal(body.status, 'ready');
    assert.equal(writerRounds.prepareCalls, 1);
    assert.equal(
      prepared.headers.get(writerRoundPrivateCustodyVersionHeader),
      writerRoundPrivateCustodyContractVersion,
    );
  } finally {
    await server.close();
  }
});

test('story and control bearers are denied without invoking seam', async () => {
  const writerRounds = memoryWriterRounds();
  const server = await startGameAuthorityServer({
    seam: noopSeam(),
    writerRounds,
    token: storyToken,
    executorToken,
    controlToken,
    timeoutMs: 1000,
  });
  try {
    const storyDenied = await call(
      server.origin,
      writerRoundPrivatePreparePath(missionId, 1),
      {
        method: 'POST',
        token: storyToken,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          schemaVersion: writerRoundPrivateCustodyContractVersion,
          contextId,
          attemptId,
          expectedRevision: 1,
        }),
      },
    );
    assert.equal(storyDenied.status, 401);
    const controlDenied = await call(
      server.origin,
      writerRoundPrivatePreparePath(missionId, 1),
      {
        method: 'POST',
        token: controlToken,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          schemaVersion: writerRoundPrivateCustodyContractVersion,
          contextId,
          attemptId,
          expectedRevision: 1,
        }),
      },
    );
    assert.equal(controlDenied.status, 401);
    assert.equal(writerRounds.prepareCalls, 0);
  } finally {
    await server.close();
  }
});

test('malformed and oversize prepare bodies are denied without seam calls', async () => {
  const writerRounds = memoryWriterRounds();
  const server = await startGameAuthorityServer({
    seam: noopSeam(),
    writerRounds,
    token: storyToken,
    executorToken,
    timeoutMs: 1000,
  });
  try {
    const malformed = await call(
      server.origin,
      writerRoundPrivatePreparePath(missionId, 1),
      {
        method: 'POST',
        token: executorToken,
        headers: { 'content-type': 'application/json' },
        body: '{',
      },
    );
    assert.equal(malformed.status, 400);
    const oversize = await call(
      server.origin,
      writerRoundPrivatePreparePath(missionId, 1),
      {
        method: 'POST',
        token: executorToken,
        headers: { 'content-type': 'application/json' },
        body: 'x'.repeat(writerRoundPrivateCustodyBodyByteLimit + 1),
      },
    );
    assert.equal(oversize.status, 400);
    assert.equal(writerRounds.prepareCalls, 0);
  } finally {
    await server.close();
  }
});

test('writer-round routes refuse unavailable when seam is absent', async () => {
  const server = await startGameAuthorityServer({
    seam: noopSeam(),
    token: storyToken,
    executorToken,
    timeoutMs: 1000,
  });
  try {
    const denied = await call(
      server.origin,
      writerRoundPrivatePreparePath(missionId, 1),
      {
        method: 'POST',
        token: executorToken,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          schemaVersion: writerRoundPrivateCustodyContractVersion,
          contextId,
          attemptId,
          expectedRevision: 1,
        }),
      },
    );
    assert.equal(denied.status, 503);
  } finally {
    await server.close();
  }
});