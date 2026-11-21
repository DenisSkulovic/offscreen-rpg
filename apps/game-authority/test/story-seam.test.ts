import assert from 'node:assert/strict';
import { test } from 'node:test';
import { StoryError } from '@offscreen/story-engine/stories';
import {
  createGameAuthoritySeam,
  gameAuthorityWriters,
} from '../src/application';
import { startGameAuthorityServer } from '../src/server';

const token = 'test-service-credential';
const storyId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const forkStoryId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const operationId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const forkBody = {
  expectedRevision: 1,
  sourceCheckpointHash:
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
};
const ownerId = 'owner-a';
const resolutionBody = {
  expectedRevision: 1,
  submission: {
    interactionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    answer: { kind: 'choice.v1', optionId: 'go' },
  },
};

function receiptSeam() {
  const receipts = new Map<
    string,
    { body: string; snapshot: { operationId: string; receiptId: string } }
  >();
  let inserts = 0;
  let forkCalls = 0;
  const forkCallArgs: Array<{
    ownerId: string;
    sourceStoryId: string;
    forkStoryId: string;
    body: unknown;
  }> = [];
  return {
    inserts: () => inserts,
    forkCalls: () => forkCalls,
    forkCallArgs: () => forkCallArgs,
    async read(args: { ownerId: string; storyId: string }) {
      if (args.ownerId !== ownerId || args.storyId !== storyId) {
        throw new StoryError('not_found');
      }
      return { storyId: args.storyId, view: 'snapshot' };
    },
    async startFromCandidate() {
      throw new StoryError('not_found');
    },
    async fork(args: {
      ownerId: string;
      sourceStoryId: string;
      forkStoryId: string;
      body: unknown;
    }) {
      forkCalls += 1;
      forkCallArgs.push({ ...args, body: structuredClone(args.body) });
      if (args.ownerId !== ownerId || args.sourceStoryId !== storyId) {
        throw new StoryError('not_found');
      }
      return { storyId: args.forkStoryId, view: 'forked-snapshot' };
    },
    async putLaunch() {
      throw new StoryError('not_found');
    },
    async getLaunch() {
      throw new StoryError('not_found');
    },
    async admitResolution(args: {
      ownerId: string;
      storyId: string;
      operationId: string;
      body: unknown;
    }) {
      if (args.ownerId !== ownerId || args.storyId !== storyId) {
        throw new StoryError('not_found');
      }
      const key = `${args.storyId}:${args.operationId}`;
      const body = JSON.stringify(args.body);
      const existing = receipts.get(key);
      if (existing) {
        if (existing.body !== body) throw new StoryError('conflict');
        return existing.snapshot;
      }
      inserts += 1;
      const snapshot = { operationId: args.operationId, receiptId: 'receipt-1' };
      receipts.set(key, { body, snapshot });
      return snapshot;
    },
  };
}

async function call(
  origin: string,
  path: string,
  init: RequestInit & { token?: string; actor?: string } = {},
) {
  const headers = new Headers(init.headers);
  if (init.token !== undefined) headers.set('authorization', `Bearer ${init.token}`);
  if (init.actor !== undefined) headers.set('x-offscreen-actor-id', init.actor);
  return fetch(new URL(path, origin), { ...init, headers });
}

test('the seam imports the existing story writers and does not admit twice', () => {
  assert.equal(typeof createGameAuthoritySeam, 'function');
  assert.equal(typeof gameAuthorityWriters.createStoryResolution, 'function');
  assert.equal(typeof gameAuthorityWriters.lockOwnedStory, 'function');
});

test('forged credential, wrong owner, and a duplicate operation id', async () => {
  const seam = receiptSeam();
  const server = await startGameAuthorityServer({
    seam,
    token,
    timeoutMs: 1000,
  });
  try {
    const forged = await call(
      server.origin,
      `/internal/v1/stories/${storyId}`,
      { token: 'forged-credential-value', actor: ownerId },
    );
    assert.equal(forged.status, 401);

    const wrongOwner = await call(
      server.origin,
      `/internal/v1/stories/${storyId}/resolutions/${operationId}`,
      {
        method: 'PUT',
        token,
        actor: 'owner-b',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(resolutionBody),
      },
    );
    assert.equal(wrongOwner.status, 404);
    assert.equal(seam.inserts(), 0);

    const first = await call(
      server.origin,
      `/internal/v1/stories/${storyId}/resolutions/${operationId}`,
      {
        method: 'PUT',
        token,
        actor: ownerId,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(resolutionBody),
      },
    );
    assert.equal(first.status, 202);
    const firstBody = await first.json();
    const replay = await call(
      server.origin,
      `/internal/v1/stories/${storyId}/resolutions/${operationId}`,
      {
        method: 'PUT',
        token,
        actor: ownerId,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(resolutionBody),
      },
    );
    assert.equal(replay.status, 202);
    assert.deepEqual(await replay.json(), firstBody);
    assert.equal(seam.inserts(), 1);

    const conflict = await call(
      server.origin,
      `/internal/v1/stories/${storyId}/resolutions/${operationId}`,
      {
        method: 'PUT',
        token,
        actor: ownerId,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...resolutionBody,
          submission: {
            ...resolutionBody.submission,
            answer: { kind: 'choice.v1', optionId: 'stop' },
          },
        }),
      },
    );
    assert.equal(conflict.status, 409);
    assert.equal(seam.inserts(), 1);

    const snapshot = await call(server.origin, `/internal/v1/stories/${storyId}`, {
      token,
      actor: ownerId,
    });
    assert.equal(snapshot.status, 200);

    const playerRoute = await call(
      server.origin,
      `/api/stories/${storyId}`,
      { token, actor: ownerId },
    );
    assert.equal(playerRoute.status, 404);
    const ownerInBody = await call(
      server.origin,
      `/internal/v1/stories/${storyId}/resolutions/${operationId}`,
      {
        method: 'PUT',
        token,
        actor: ownerId,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...resolutionBody, ownerId }),
      },
    );
    assert.equal(ownerInBody.status, 400);
  } finally {
    await server.close();
  }
});

test('authorized fork calls the seam once per request', async () => {
  const seam = receiptSeam();
  const server = await startGameAuthorityServer({
    seam,
    token,
    timeoutMs: 1000,
  });
  try {
    const path = `/internal/v1/stories/${storyId}/forks/${forkStoryId}`;
    const first = await call(server.origin, path, {
      method: 'PUT',
      token,
      actor: ownerId,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(forkBody),
    });
    assert.equal(first.status, 200);
    assert.deepEqual(await first.json(), {
      storyId: forkStoryId,
      view: 'forked-snapshot',
    });
    assert.equal(seam.forkCalls(), 1);

    const second = await call(server.origin, path, {
      method: 'PUT',
      token,
      actor: ownerId,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(forkBody),
    });
    assert.equal(second.status, 200);
    assert.equal(seam.forkCalls(), 2);
    const calls = seam.forkCallArgs();
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0], calls[1]);
  } finally {
    await server.close();
  }
});

test('fork rejects bad auth, malformed body, and maps seam errors', async () => {
  const seam = receiptSeam();
  const server = await startGameAuthorityServer({
    seam,
    token,
    timeoutMs: 1000,
  });
  const path = `/internal/v1/stories/${storyId}/forks/${forkStoryId}`;
  try {
    const forged = await call(server.origin, path, {
      method: 'PUT',
      token: 'forged-credential-value',
      actor: ownerId,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(forkBody),
    });
    assert.equal(forged.status, 401);
    assert.equal(seam.forkCalls(), 0);

    const missingActor = await call(server.origin, path, {
      method: 'PUT',
      token,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(forkBody),
    });
    assert.equal(missingActor.status, 401);
    assert.equal(seam.forkCalls(), 0);

    const badRevision = await call(server.origin, path, {
      method: 'PUT',
      token,
      actor: ownerId,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sourceCheckpointHash: forkBody.sourceCheckpointHash }),
    });
    assert.equal(badRevision.status, 400);
    assert.equal(seam.forkCalls(), 0);

    const badHash = await call(server.origin, path, {
      method: 'PUT',
      token,
      actor: ownerId,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        expectedRevision: 1,
        sourceCheckpointHash: 'not-a-valid-checkpoint-hash',
      }),
    });
    assert.equal(badHash.status, 400);
    assert.equal(seam.forkCalls(), 0);
  } finally {
    await server.close();
  }

  let conflictForkCalls = 0;
  const conflictServer = await startGameAuthorityServer({
    token,
    timeoutMs: 1000,
    seam: {
      async read() {
        throw new StoryError('not_found');
      },
      async startFromCandidate() {
        throw new StoryError('not_found');
      },
      async fork() {
        conflictForkCalls += 1;
        throw new StoryError('conflict');
      },
      async putLaunch() {
        throw new StoryError('not_found');
      },
      async getLaunch() {
        throw new StoryError('not_found');
      },
      async admitResolution() {
        throw new StoryError('not_found');
      },
    },
  });
  try {
    const conflict = await call(conflictServer.origin, path, {
      method: 'PUT',
      token,
      actor: ownerId,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(forkBody),
    });
    assert.equal(conflict.status, 409);
    assert.equal(conflictForkCalls, 1);
  } finally {
    await conflictServer.close();
  }

  let hashMismatchForkCalls = 0;
  const invalidServer = await startGameAuthorityServer({
    token,
    timeoutMs: 1000,
    seam: {
      async read() {
        throw new StoryError('not_found');
      },
      async startFromCandidate() {
        throw new StoryError('not_found');
      },
      async fork() {
        hashMismatchForkCalls += 1;
        throw new StoryError('invalid', 'checkpoint_hash_mismatch');
      },
      async putLaunch() {
        throw new StoryError('not_found');
      },
      async getLaunch() {
        throw new StoryError('not_found');
      },
      async admitResolution() {
        throw new StoryError('not_found');
      },
    },
  });
  try {
    const invalid = await call(invalidServer.origin, path, {
      method: 'PUT',
      token,
      actor: ownerId,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(forkBody),
    });
    assert.equal(invalid.status, 400);
    assert.equal(hashMismatchForkCalls, 1);
  } finally {
    await invalidServer.close();
  }
});

test('a slow admission becomes unavailable and does not invent a receipt', async () => {
  let release: () => void = () => {};
  let inserts = 0;
  const server = await startGameAuthorityServer({
    token,
    timeoutMs: 30,
    seam: {
      async read() {
        throw new StoryError('not_found');
      },
      async startFromCandidate() {
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
      admitResolution() {
        inserts += 1;
        return new Promise((resolve) => {
          release = () => resolve({ receiptId: 'late' });
        });
      },
    },
  });
  try {
    const response = await call(
      server.origin,
      `/internal/v1/stories/${storyId}/resolutions/${operationId}`,
      {
        method: 'PUT',
        token,
        actor: ownerId,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(resolutionBody),
      },
    );
    assert.equal(response.status, 503);
    assert.equal(inserts, 1);
  } finally {
    release();
    await server.close();
  }
});
