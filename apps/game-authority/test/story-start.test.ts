import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { StoryError } from '@offscreen/story-engine/stories';
import type { GameAuthoritySeam } from '../src/application';
import { startGameAuthorityServer } from '../src/server';

const storyToken = 'test-story-service-credential';
const executorToken = 'test-executor-only-credential';
const storyId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const candidateId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ownerId = 'owner-a';

function startSeam(): GameAuthoritySeam & { startCalls: number } {
  let startCalls = 0;
  const committed = { storyId, view: 'started-snapshot' };
  return {
    get startCalls() {
      return startCalls;
    },
    async read(args: { ownerId: string; storyId: string }) {
      if (args.ownerId !== ownerId || args.storyId !== storyId) {
        throw new StoryError('not_found');
      }
      return { storyId: args.storyId, view: 'pre-start' };
    },
    async startFromCandidate(args: {
      ownerId: string;
      storyId: string;
      candidateId: string;
      expectedDraftRevision: number;
    }) {
      if (args.ownerId !== ownerId || args.storyId !== storyId) {
        throw new StoryError('not_found');
      }
      if (args.candidateId !== candidateId) {
        throw new StoryError('invalid');
      }
      if (args.expectedDraftRevision !== 1) {
        throw new StoryError('conflict');
      }
      startCalls += 1;
      return committed;
    },
    async admitResolution() {
      throw new StoryError('not_found');
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

async function call(
  origin: string,
  path: string,
  init: RequestInit & { token?: string; actor?: string } = {},
) {
  const headers = new Headers(init.headers);
  if (init.token !== undefined) {
    headers.set('authorization', `Bearer ${init.token}`);
  }
  if (init.actor !== undefined) {
    headers.set('x-offscreen-actor-id', init.actor);
  }
  return fetch(new URL(path, origin), { ...init, headers });
}

test('valid owner and supported candidate commits start once', async () => {
  const seam = startSeam();
  const server = await startGameAuthorityServer({
    seam,
    token: storyToken,
    timeoutMs: 1000,
  });
  try {
    const response = await call(
      server.origin,
      `/internal/v1/stories/${storyId}/start`,
      {
        method: 'PUT',
        token: storyToken,
        actor: ownerId,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          expectedDraftRevision: 1,
        }),
      },
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body, { storyId, view: 'started-snapshot' });
    assert.equal(seam.startCalls, 1);

    const replay = await call(
      server.origin,
      `/internal/v1/stories/${storyId}/start`,
      {
        method: 'PUT',
        token: storyToken,
        actor: ownerId,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          expectedDraftRevision: 1,
        }),
      },
    );
    assert.equal(replay.status, 200);
    assert.equal(seam.startCalls, 2);
  } finally {
    await server.close();
  }
});

test('start rejects forged credential, wrong owner, stale revision, and corrupt candidate', async () => {
  const seam = startSeam();
  const server = await startGameAuthorityServer({
    seam,
    token: storyToken,
    timeoutMs: 1000,
  });
  try {
    const forged = await call(
      server.origin,
      `/internal/v1/stories/${storyId}/start`,
      {
        method: 'PUT',
        token: 'forged-credential-value',
        actor: ownerId,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          expectedDraftRevision: 1,
        }),
      },
    );
    assert.equal(forged.status, 401);
    assert.equal(seam.startCalls, 0);

    const wrongOwner = await call(
      server.origin,
      `/internal/v1/stories/${storyId}/start`,
      {
        method: 'PUT',
        token: storyToken,
        actor: 'owner-b',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          expectedDraftRevision: 1,
        }),
      },
    );
    assert.equal(wrongOwner.status, 404);
    assert.equal(seam.startCalls, 0);

    const staleRevision = await call(
      server.origin,
      `/internal/v1/stories/${storyId}/start`,
      {
        method: 'PUT',
        token: storyToken,
        actor: ownerId,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          expectedDraftRevision: 2,
        }),
      },
    );
    assert.equal(staleRevision.status, 409);
    assert.equal(seam.startCalls, 0);

    const corruptCandidate = await call(
      server.origin,
      `/internal/v1/stories/${storyId}/start`,
      {
        method: 'PUT',
        token: storyToken,
        actor: ownerId,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          candidateId: randomUUID(),
          expectedDraftRevision: 1,
        }),
      },
    );
    assert.equal(corruptCandidate.status, 400);
    assert.equal(seam.startCalls, 0);

    const invalidBody = await call(
      server.origin,
      `/internal/v1/stories/${storyId}/start`,
      {
        method: 'PUT',
        token: storyToken,
        actor: ownerId,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ expectedDraftRevision: 1 }),
      },
    );
    assert.equal(invalidBody.status, 400);
    assert.equal(seam.startCalls, 0);
  } finally {
    await server.close();
  }
});

test('executor credential cannot call private start', async () => {
  const seam = startSeam();
  const server = await startGameAuthorityServer({
    seam,
    token: storyToken,
    executorToken,
    timeoutMs: 1000,
  });
  try {
    const denied = await call(
      server.origin,
      `/internal/v1/stories/${storyId}/start`,
      {
        method: 'PUT',
        token: executorToken,
        actor: ownerId,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          expectedDraftRevision: 1,
        }),
      },
    );
    assert.equal(denied.status, 401);
    assert.equal(seam.startCalls, 0);
  } finally {
    await server.close();
  }
});