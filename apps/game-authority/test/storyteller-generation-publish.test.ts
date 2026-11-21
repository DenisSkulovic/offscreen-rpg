import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { StoryError } from '@offscreen/application/stories';
import {
  storytellerGenerationPublishPath,
  storytellerTaskCustodyVersionHeader,
} from '@offscreen/contracts/storyteller-task-custody';
import type {
  StorytellerPublicationSeam,
  StorytellerTaskCustodySeam,
} from '../src/application';
import { startGameAuthorityServer } from '../src/server';

const storyToken = 'test-story-service-credential';
const executorToken = 'test-executor-only-credential';
const controlToken = 'test-control-only-credential';
const generationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const unknownGenerationId = '99999999-9999-4999-8999-999999999999';
const storyId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const attemptId = randomUUID();
const resultHash = 'ab'.repeat(32);
const passageId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function noopSeam() {
  return {
    async read() {
      return { storyId, view: 'snapshot' };
    },
    async startFromCandidate() {
      throw new Error('unexpected start');
    },
    async admitResolution() {
      return { receiptId: 'receipt-1' };
    },
    async fork() {
      throw new StoryError('not_found');
    },
    async putLaunch() {
      throw new StoryError('not_found');
    },
    async getLaunch() {
      throw new StoryError('not_found');
    },
  };
}

function memoryCustody(): StorytellerTaskCustodySeam {
  return {
    async fetchCommittedGeneration() {
      return { status: 'ready' as const, generationId, ownerId: 'owner', pinnedRoot: null, task: {} };
    },
    async claimGeneration() {
      return { status: 'claimed' as const, generationId, attemptId, created: true };
    },
    async saveValidatedResult() {
      return { status: 'saved' as const, generationId, attemptId, resultHash, result: {} };
    },
    async readValidatedResult() {
      return { status: 'saved' as const, generationId, attemptId, resultHash, result: {} };
    },
  };
}

function memoryPublication(
  impl: Partial<StorytellerPublicationSeam> = {},
): StorytellerPublicationSeam & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async publishSavedGeneration(id) {
      calls.push(id);
      if (impl.publishSavedGeneration) {
        return impl.publishSavedGeneration(id);
      }
      return {
        status: 'published',
        generationId: id,
        attemptId,
        resultHash,
        passageId,
      };
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

test('control credential publishes by generation id only', async () => {
  const publication = memoryPublication();
  const server = await startGameAuthorityServer({
    seam: noopSeam(),
    custody: memoryCustody(),
    publication,
    token: storyToken,
    executorToken,
    controlToken,
    timeoutMs: 1000,
  });
  try {
    const response = await call(
      server.origin,
      storytellerGenerationPublishPath(generationId),
      { method: 'POST', token: controlToken },
    );
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      status: string;
      generationId: string;
      passageId?: string;
    };
    assert.equal(body.status, 'published');
    assert.equal(body.generationId, generationId);
    assert.equal(body.passageId, passageId);
    assert.equal(
      response.headers.get(storytellerTaskCustodyVersionHeader),
      'storyteller.generation-custody.v1',
    );
    assert.deepEqual(publication.calls, [generationId]);
  } finally {
    await server.close();
  }
});

test('executor and story credentials cannot call publish', async () => {
  const server = await startGameAuthorityServer({
    seam: noopSeam(),
    custody: memoryCustody(),
    publication: memoryPublication(),
    token: storyToken,
    executorToken,
    controlToken,
    timeoutMs: 1000,
  });
  try {
    const path = storytellerGenerationPublishPath(generationId);
    const denied = await Promise.all([
      call(server.origin, path, { method: 'POST', token: executorToken }),
      call(server.origin, path, {
        method: 'POST',
        token: storyToken,
      }),
      call(server.origin, path, { method: 'POST' }),
    ]);
    for (const response of denied) {
      assert.equal(response.status, 401);
    }
  } finally {
    await server.close();
  }
});

test('publish rejects authority-bearing request bodies', async () => {
  const publication = memoryPublication();
  const server = await startGameAuthorityServer({
    seam: noopSeam(),
    custody: memoryCustody(),
    publication,
    token: storyToken,
    executorToken,
    controlToken,
    timeoutMs: 1000,
  });
  try {
    const response = await call(
      server.origin,
      storytellerGenerationPublishPath(generationId),
      {
        method: 'POST',
        token: controlToken,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          storyId,
          currentRoot: 'ff'.repeat(32),
          result: { scene: { content: { paragraphs: ['forged'] } } },
        }),
      },
    );
    assert.equal(response.status, 400);
    assert.equal(publication.calls.length, 0);
  } finally {
    await server.close();
  }
});

test('unknown generation returns not_found without story leakage', async () => {
  const publication = memoryPublication({
    async publishSavedGeneration(id) {
      return { status: 'refused', reason: 'unknown-generation' };
    },
  });
  const server = await startGameAuthorityServer({
    seam: noopSeam(),
    custody: memoryCustody(),
    publication,
    token: storyToken,
    executorToken,
    controlToken,
    timeoutMs: 1000,
  });
  try {
    const response = await call(
      server.origin,
      storytellerGenerationPublishPath(unknownGenerationId),
      { method: 'POST', token: controlToken },
    );
    assert.equal(response.status, 404);
    const body = (await response.json()) as { code: string; reason?: string };
    assert.equal(body.code, 'not_found');
    assert.equal(body.reason, undefined);
  } finally {
    await server.close();
  }
});

test('blocked adoption surfaces as blocked without publishing', async () => {
  const publication = memoryPublication({
    async publishSavedGeneration(id) {
      return {
        status: 'blocked',
        generationId: id,
        reason: 'result-mismatch',
      };
    },
  });
  const server = await startGameAuthorityServer({
    seam: noopSeam(),
    custody: memoryCustody(),
    publication,
    token: storyToken,
    executorToken,
    controlToken,
    timeoutMs: 1000,
  });
  try {
    const response = await call(
      server.origin,
      storytellerGenerationPublishPath(generationId),
      { method: 'POST', token: controlToken },
    );
    assert.equal(response.status, 200);
    const body = (await response.json()) as { status: string; reason?: string };
    assert.equal(body.status, 'blocked');
    assert.equal(body.reason, 'result-mismatch');
    assert.deepEqual(publication.calls, [generationId]);
  } finally {
    await server.close();
  }
});

test('second publish returns already_published with the same passage id', async () => {
  let calls = 0;
  const publication = memoryPublication({
    async publishSavedGeneration(id) {
      calls += 1;
      return {
        status: calls === 1 ? 'published' : 'already_published',
        generationId: id,
        attemptId,
        resultHash,
        passageId,
      };
    },
  });
  const server = await startGameAuthorityServer({
    seam: noopSeam(),
    custody: memoryCustody(),
    publication,
    token: storyToken,
    executorToken,
    controlToken,
    timeoutMs: 1000,
  });
  try {
    const path = storytellerGenerationPublishPath(generationId);
    const first = await call(server.origin, path, {
      method: 'POST',
      token: controlToken,
    });
    const second = await call(server.origin, path, {
      method: 'POST',
      token: controlToken,
    });
    const firstBody = (await first.json()) as {
      status: string;
      passageId?: string;
    };
    const secondBody = (await second.json()) as {
      status: string;
      passageId?: string;
    };
    assert.equal(firstBody.status, 'published');
    assert.equal(secondBody.status, 'already_published');
    assert.equal(firstBody.passageId, passageId);
    assert.equal(secondBody.passageId, passageId);
  } finally {
    await server.close();
  }
});