import assert from 'node:assert/strict';
import { test } from 'node:test';
import { StoryError } from '@offscreen/application/stories';
import { gameAuthoritySeamVersion } from '@offscreen/contracts/game-authority';
import {
  createRemoteStorySeam,
  storySeamFor,
} from '../dist/src/modules/stories/game-authority-client.js';

const token = 'nest-service-credential-ok';
const storyId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const forkStoryId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const candidateId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const sourcePassageId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const sourceCheckpointHash = `${'a'.repeat(64)}`;
const ownerId = 'owner-a';
const authority = {
  mode: 'distributed',
  origin: 'http://127.0.0.1:9',
  token,
  timeoutMs: 1000,
};

function withFetch(stub) {
  const original = globalThis.fetch;
  globalThis.fetch = stub;
  return () => {
    globalThis.fetch = original;
  };
}

test('distributed startFromCandidate uses private PUT with actor and startStory body', async () => {
  const snapshot = { storyId, view: 'started-snapshot' };
  const calls = [];
  const restore = withFetch(async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(snapshot), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
  try {
    const seam = createRemoteStorySeam(authority);
    const result = await seam.startFromCandidate({
      ownerId,
      storyId,
      candidateId,
      expectedDraftRevision: 1,
    });
    assert.deepEqual(result, snapshot);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].init.method, 'PUT');
    assert.equal(
      calls[0].url,
      `${authority.origin}/internal/v1/stories/${storyId}/start`,
    );
    assert.equal(calls[0].init.headers['x-offscreen-actor-id'], ownerId);
    assert.equal(
      calls[0].init.headers['x-offscreen-game-authority-version'],
      gameAuthoritySeamVersion,
    );
    assert.equal(calls[0].init.headers.authorization, `Bearer ${token}`);
    assert.deepEqual(JSON.parse(calls[0].init.body), {
      candidateId,
      expectedDraftRevision: 1,
    });
  } finally {
    restore();
  }
});

test('distributed fork uses private PUT with actor and forkStory body without ownerId', async () => {
  const snapshot = { storyId: forkStoryId, view: 'forked-snapshot' };
  const calls = [];
  const restore = withFetch(async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(snapshot), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
  try {
    const seam = createRemoteStorySeam(authority);
    const result = await seam.fork({
      ownerId,
      sourceStoryId: storyId,
      forkStoryId,
      expectedRevision: 1,
      sourcePassageId,
      sourceCheckpointHash,
    });
    assert.deepEqual(result, snapshot);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].init.method, 'PUT');
    assert.equal(
      calls[0].url,
      `${authority.origin}/internal/v1/stories/${storyId}/forks/${forkStoryId}`,
    );
    assert.equal(calls[0].init.headers['x-offscreen-actor-id'], ownerId);
    assert.equal(calls[0].init.headers.authorization, `Bearer ${token}`);
    const body = JSON.parse(calls[0].init.body);
    assert.deepEqual(body, {
      expectedRevision: 1,
      sourcePassageId,
      sourceCheckpointHash,
    });
    assert.equal(body.ownerId, undefined);
  } finally {
    restore();
  }
});

test('embedded mode delegates fork to the in-process writer', async () => {
  let remoteCalls = 0;
  const restore = withFetch(async () => {
    remoteCalls += 1;
    return new Response('{}', { status: 200 });
  });
  const local = {
    async read() {
      return { source: 'local-read' };
    },
    async startFromCandidate() {
      return { source: 'local-start' };
    },
    async fork(args) {
      return { source: 'local-fork', forkStoryId: args.forkStoryId };
    },
    async admitResolution() {
      return { source: 'local-admit' };
    },
  };
  try {
    const seam = storySeamFor(local, { mode: 'embedded' });
    const snapshot = await seam.fork({
      ownerId,
      sourceStoryId: storyId,
      forkStoryId,
      expectedRevision: 1,
    });
    assert.deepEqual(snapshot, { source: 'local-fork', forkStoryId });
    assert.equal(remoteCalls, 0);
  } finally {
    restore();
  }
});

test('distributed fork fails closed without calling the local writer', async () => {
  const restore = withFetch(async () => {
    throw new Error('ECONNREFUSED');
  });
  const local = {
    calls: 0,
    async read() {},
    async startFromCandidate() {},
    async fork() {
      this.calls += 1;
      return { source: 'local' };
    },
    async admitResolution() {},
  };
  try {
    const seam = storySeamFor(local, authority);
    await assert.rejects(
      () =>
        seam.fork({
          ownerId,
          sourceStoryId: storyId,
          forkStoryId,
          expectedRevision: 1,
        }),
      (error) => error instanceof StoryError && error.code === 'unavailable',
    );
    assert.equal(local.calls, 0);
  } finally {
    restore();
  }
});

test('GA invalid checkpoint hash maps to StoryError invalid with reason', async () => {
  const restore = withFetch(async () =>
    new Response(
      JSON.stringify({ code: 'invalid', reason: 'checkpoint_hash_mismatch' }),
      { status: 400 },
    ),
  );
  try {
    const seam = createRemoteStorySeam(authority);
    await assert.rejects(
      () =>
        seam.fork({
          ownerId,
          sourceStoryId: storyId,
          forkStoryId,
          expectedRevision: 1,
          sourceCheckpointHash,
        }),
      (error) =>
        error instanceof StoryError &&
        error.code === 'invalid' &&
        error.reason === 'checkpoint_hash_mismatch',
    );
  } finally {
    restore();
  }
});

test('GA fork conflict maps to StoryError conflict', async () => {
  const restore = withFetch(async () =>
    new Response(JSON.stringify({ code: 'conflict' }), { status: 409 }),
  );
  try {
    const seam = createRemoteStorySeam(authority);
    await assert.rejects(
      () =>
        seam.fork({
          ownerId,
          sourceStoryId: storyId,
          forkStoryId,
          expectedRevision: 1,
        }),
      (error) => error instanceof StoryError && error.code === 'conflict',
    );
  } finally {
    restore();
  }
});

test('embedded mode delegates startFromCandidate to the in-process writer', async () => {
  let remoteCalls = 0;
  const restore = withFetch(async () => {
    remoteCalls += 1;
    return new Response('{}', { status: 200 });
  });
  const local = {
    async read() {
      return { source: 'local-read' };
    },
    async startFromCandidate(args) {
      return { source: 'local-start', storyId: args.storyId };
    },
    async fork() {
      return { source: 'local-fork' };
    },
    async admitResolution() {
      return { source: 'local-admit' };
    },
  };
  try {
    const seam = storySeamFor(local, { mode: 'embedded' });
    const snapshot = await seam.startFromCandidate({
      ownerId,
      storyId,
      candidateId,
      expectedDraftRevision: 2,
    });
    assert.deepEqual(snapshot, { source: 'local-start', storyId });
    assert.equal(remoteCalls, 0);
  } finally {
    restore();
  }
});

test('distributed startFromCandidate fails closed without calling the local writer', async () => {
  const cases = [
    {
      name: 'unavailable',
      fetch: async () => {
        throw new Error('ECONNREFUSED');
      },
      expected: 'unavailable',
    },
    {
      name: 'conflict',
      fetch: async () =>
        new Response(JSON.stringify({ code: 'conflict' }), { status: 409 }),
      expected: 'conflict',
    },
  ];
  for (const scenario of cases) {
    const restore = withFetch(scenario.fetch);
    const local = {
      calls: 0,
      async read() {},
      async startFromCandidate() {
        this.calls += 1;
        return { source: 'local' };
      },
      async fork() {},
      async admitResolution() {},
    };
    try {
      const seam = storySeamFor(local, authority);
      await assert.rejects(
        () =>
          seam.startFromCandidate({
            ownerId,
            storyId,
            candidateId,
            expectedDraftRevision: 1,
          }),
        (error) =>
          error instanceof StoryError && error.code === scenario.expected,
      );
      assert.equal(local.calls, 0, scenario.name);
    } finally {
      restore();
    }
  }
});