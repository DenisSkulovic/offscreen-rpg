import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  writerSceneRoundControlContractVersion,
  writerSceneRoundControlVersionHeader,
  writerSceneRoundFinalizePath,
  writerSceneRoundPlanPath,
  writerSceneRoundStatePath,
} from '@offscreen/contracts/writer-scene-round-control';
import type { WriterRoundSeam } from '../src/application';
import { startGameAuthorityServer } from '../src/server';

const storyToken = 'test-story-service-credential';
const executorToken = 'test-executor-only-credential';
const controlToken = 'test-control-only-credential';
const missionId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

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
  planCalls: number;
  finalizeCalls: number;
  stateCalls: number;
} {
  let planCalls = 0;
  let finalizeCalls = 0;
  let stateCalls = 0;
  const contextId = missionId;
  return {
    get planCalls() {
      return planCalls;
    },
    get finalizeCalls() {
      return finalizeCalls;
    },
    get stateCalls() {
      return stateCalls;
    },
    async prepareRound() {
      return { status: 'held' as const, reason: 'unexpected' };
    },
    async submitOutcome() {
      return { status: 'uncertain' as const };
    },
    async getStatus() {
      return { status: 'dispatched' as const };
    },
    async planRound() {
      planCalls += 1;
      return {
        missionId,
        contextId,
        ordinal: 1,
        expectedRevision: 2,
        model: 'scripted-offline',
      };
    },
    async readMissionState() {
      stateCalls += 1;
      return { status: 'pending' as const };
    },
    async finalizeRound() {
      finalizeCalls += 1;
      return { status: 'published' as const };
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

test('control bearer reaches plan and finalize', async () => {
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
    const planned = await call(
      server.origin,
      writerSceneRoundPlanPath(missionId),
      { method: 'POST', token: controlToken },
    );
    assert.equal(planned.status, 200);
    const planBody = (await planned.json()) as { model: string };
    assert.equal(planBody.model, 'scripted-offline');
    assert.equal(writerRounds.planCalls, 1);
    assert.equal(
      planned.headers.get(writerSceneRoundControlVersionHeader),
      writerSceneRoundControlContractVersion,
    );

    const finalized = await call(
      server.origin,
      writerSceneRoundFinalizePath(missionId),
      { method: 'POST', token: controlToken },
    );
    assert.equal(finalized.status, 200);
    assert.equal(writerRounds.finalizeCalls, 1);
  } finally {
    await server.close();
  }
});

test('executor and story bearers are denied on writer scene round control', async () => {
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
    const executorDenied = await call(
      server.origin,
      writerSceneRoundPlanPath(missionId),
      { method: 'POST', token: executorToken },
    );
    assert.equal(executorDenied.status, 401);
    const storyDenied = await call(
      server.origin,
      writerSceneRoundStatePath(missionId),
      { method: 'GET', token: storyToken },
    );
    assert.equal(storyDenied.status, 401);
    assert.equal(writerRounds.planCalls, 0);
    assert.equal(writerRounds.stateCalls, 0);
  } finally {
    await server.close();
  }
});

test('writer scene round control routes refuse unavailable when seam is absent', async () => {
  const server = await startGameAuthorityServer({
    seam: noopSeam(),
    token: storyToken,
    executorToken,
    controlToken,
    timeoutMs: 1000,
  });
  try {
    const denied = await call(
      server.origin,
      writerSceneRoundPlanPath(missionId),
      { method: 'POST', token: controlToken },
    );
    assert.equal(denied.status, 503);
  } finally {
    await server.close();
  }
});