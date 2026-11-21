import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HttpException } from '@nestjs/common';
import { StoryError } from '@offscreen/story-engine/stories';
import { startGameAuthorityServer } from '@offscreen/game-authority/server';
import { StoriesController } from '../dist/src/modules/stories/controller.js';
import {
  readStoryAuthorityConfig,
  storySeamFor,
} from '../dist/src/modules/stories/game-authority-client.js';

const token = 'nest-service-credential';
const storyId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const forkStoryId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const candidateId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const operationId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const forkBody = {
  expectedRevision: 1,
  sourcePassageId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  sourceCheckpointHash: `${'a'.repeat(64)}`,
};
const ownerId = 'owner-a';
const startBody = {
  candidateId,
  expectedDraftRevision: 1,
};
const request = { headers: { cookie: 'session=player' } };
const resolutionBody = {
  expectedRevision: 1,
  submission: {
    interactionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    answer: { kind: 'choice.v1', optionId: 'go' },
  },
};

const identity = {
  async requireUser() {
    return { id: ownerId, name: 'Ada', email: 'ada@example.com' };
  },
};

function receiptSeam() {
  const receipts = new Map();
  let inserts = 0;
  let startCalls = 0;
  let forkCalls = 0;
  const seenActors = [];
  return {
    inserts: () => inserts,
    startCalls: () => startCalls,
    forkCalls: () => forkCalls,
    seenActors,
    async read(args) {
      seenActors.push(args.ownerId);
      if (args.ownerId !== ownerId || args.storyId !== storyId) {
        throw new StoryError('not_found');
      }
      return { storyId: args.storyId, view: 'snapshot' };
    },
    async admitResolution(args) {
      seenActors.push(args.ownerId);
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
      const snapshot = {
        operationId: args.operationId,
        receiptId: 'receipt-1',
      };
      receipts.set(key, { body, snapshot });
      return snapshot;
    },
    async startFromCandidate(args) {
      seenActors.push(args.ownerId);
      if (args.ownerId !== ownerId || args.storyId !== storyId) {
        throw new StoryError('not_found');
      }
      if (args.candidateId !== candidateId) {
        throw new StoryError('invalid');
      }
      startCalls += 1;
      return { storyId: args.storyId, view: 'started' };
    },
    async fork(args) {
      seenActors.push(args.ownerId);
      if (args.ownerId !== ownerId || args.sourceStoryId !== storyId) {
        throw new StoryError('not_found');
      }
      forkCalls += 1;
      return { storyId: args.forkStoryId, view: 'forked' };
    },
  };
}

function localStories() {
  const calls = { read: 0, admit: 0, start: 0, fork: 0 };
  return {
    calls,
    async read() {
      calls.read += 1;
      return { source: 'compose-read' };
    },
    async startFromCandidate() {
      calls.start += 1;
      return { source: 'compose-start', storyId, view: 'started-local' };
    },
    async fork() {
      calls.fork += 1;
      return { source: 'compose-fork', storyId: forkStoryId, view: 'forked-local' };
    },
    async admitResolution() {
      calls.admit += 1;
      return { source: 'compose-admit', receiptId: 'local-receipt' };
    },
  };
}

test('distributed mode calls Game Authority and leaves the Nest writer idle', async () => {
  const seam = receiptSeam();
  const server = await startGameAuthorityServer({
    seam,
    token,
    timeoutMs: 1000,
  });
  const local = localStories();
  const controller = new StoriesController(
    identity,
    local,
    null,
    storySeamFor(local, {
      mode: 'distributed',
      origin: server.origin,
      token,
      timeoutMs: 1000,
    }),
  );
  try {
    const snapshot = await controller.read(request, storyId);
    assert.deepEqual(snapshot, { storyId, view: 'snapshot' });
    const first = await controller.admitResolution(
      request,
      storyId,
      operationId,
      resolutionBody,
    );
    const replay = await controller.admitResolution(
      request,
      storyId,
      operationId,
      resolutionBody,
    );
    assert.deepEqual(replay, first);
    assert.equal(first.receiptId, 'receipt-1');
    assert.equal(seam.inserts(), 1);
    assert.equal(local.calls.read, 0);
    assert.equal(local.calls.admit, 0);
    assert.deepEqual(seam.seenActors, [ownerId, ownerId, ownerId]);

    await assert.rejects(
      () =>
        controller.admitResolution(request, storyId, operationId, {
          ...resolutionBody,
          submission: {
            ...resolutionBody.submission,
            answer: { kind: 'choice.v1', optionId: 'stop' },
          },
        }),
      (error) => error instanceof HttpException && error.getStatus() === 409,
    );
    assert.equal(seam.inserts(), 1);
    assert.equal(local.calls.admit, 0);
  } finally {
    await server.close();
  }
});

test('embedded mode keeps the in-process writer and does not call Game Authority', async () => {
  let remoteCalls = 0;
  const server = await startGameAuthorityServer({
    token,
    timeoutMs: 1000,
    seam: {
      async read() {
        remoteCalls += 1;
        return { source: 'remote' };
      },
      async startFromCandidate() {
        remoteCalls += 1;
        return { source: 'remote' };
      },
      async fork() {
        remoteCalls += 1;
        return { source: 'remote' };
      },
      async admitResolution() {
        remoteCalls += 1;
        return { source: 'remote' };
      },
    },
  });
  const local = localStories();
  const controller = new StoriesController(
    identity,
    local,
    null,
    storySeamFor(local, { mode: 'embedded' }),
  );
  try {
    const admitted = await controller.admitResolution(
      request,
      storyId,
      operationId,
      resolutionBody,
    );
    assert.equal(admitted.receiptId, 'local-receipt');
    assert.equal(local.calls.admit, 1);
    assert.equal(remoteCalls, 0);
    assert.deepEqual(readStoryAuthorityConfig({}), { mode: 'embedded' });
    assert.throws(
      () => readStoryAuthorityConfig({ GAME_AUTHORITY_MODE: 'compose' }),
      (error) => {
        assert.match(error.message, /GAME_AUTHORITY_MODE/);
        return true;
      },
    );
    assert.throws(
      () =>
        readStoryAuthorityConfig(
          { OFFSCREEN_DOCUMENT_STORE: 's3' },
          { requireExplicitMode: true },
        ),
      (error) => {
        assert.match(error.message, /GAME_AUTHORITY_MODE/);
        return true;
      },
    );
    const secret = 'super-secret-token-value';
    assert.throws(
      () =>
        readStoryAuthorityConfig({
          GAME_AUTHORITY_MODE: 'distributed',
          GAME_AUTHORITY_SERVICE_TOKEN: secret,
        }),
      (error) => {
        assert.equal(error.message.includes(secret), false);
        assert.match(error.message, /GAME_AUTHORITY_ORIGIN/);
        return true;
      },
    );
  } finally {
    await server.close();
  }
});

test('distributed mode routes start to Game Authority and leaves the Nest writer idle', async () => {
  const seam = receiptSeam();
  const server = await startGameAuthorityServer({
    seam,
    token,
    timeoutMs: 1000,
  });
  const local = localStories();
  const controller = new StoriesController(
    identity,
    local,
    null,
    storySeamFor(local, {
      mode: 'distributed',
      origin: server.origin,
      token,
      timeoutMs: 1000,
    }),
  );
  try {
    const started = await controller.startFromCandidate(
      request,
      storyId,
      startBody,
    );
    assert.deepEqual(started, { storyId, view: 'started' });
    assert.equal(seam.startCalls(), 1);
    assert.equal(local.calls.start, 0);
    assert.deepEqual(seam.seenActors, [ownerId]);
  } finally {
    await server.close();
  }
});

test('embedded mode keeps in-process start and does not call Game Authority', async () => {
  let remoteCalls = 0;
  const server = await startGameAuthorityServer({
    token,
    timeoutMs: 1000,
    seam: {
      async read() {
        remoteCalls += 1;
        return { source: 'remote' };
      },
      async startFromCandidate() {
        remoteCalls += 1;
        return { source: 'remote' };
      },
      async fork() {
        remoteCalls += 1;
        return { source: 'remote' };
      },
      async admitResolution() {
        remoteCalls += 1;
        return { source: 'remote' };
      },
    },
  });
  const local = localStories();
  const controller = new StoriesController(
    identity,
    local,
    null,
    storySeamFor(local, { mode: 'embedded' }),
  );
  try {
    const started = await controller.startFromCandidate(
      request,
      storyId,
      startBody,
    );
    assert.deepEqual(started, {
      source: 'compose-start',
      storyId,
      view: 'started-local',
    });
    assert.equal(local.calls.start, 1);
    assert.equal(remoteCalls, 0);
  } finally {
    await server.close();
  }
});

test('distributed start does not fall back to local stories when Game Authority is down', async () => {
  const local = localStories();
  const controller = new StoriesController(
    identity,
    local,
    null,
    storySeamFor(local, {
      mode: 'distributed',
      origin: 'http://127.0.0.1:1',
      token: '0123456789abcdef',
      timeoutMs: 100,
    }),
  );
  await assert.rejects(
    () => controller.startFromCandidate(request, storyId, startBody),
    (error) => error instanceof HttpException && error.getStatus() === 503,
  );
  assert.equal(local.calls.start, 0);
});

test('distributed admitResolution does not fall back to local stories when Game Authority is down', async () => {
  const local = localStories();
  const controller = new StoriesController(
    identity,
    local,
    null,
    storySeamFor(local, {
      mode: 'distributed',
      origin: 'http://127.0.0.1:1',
      token: '0123456789abcdef',
      timeoutMs: 100,
    }),
  );
  await assert.rejects(
    () =>
      controller.admitResolution(
        request,
        storyId,
        operationId,
        resolutionBody,
      ),
    (error) => {
      assert.ok(error instanceof HttpException);
      assert.equal(error.getStatus(), 503);
      const body = error.getResponse();
      assert.equal(body?.code, 'unavailable');
      return true;
    },
  );
  assert.equal(local.calls.read, 0);
  assert.equal(local.calls.admit, 0);
  assert.equal(local.calls.start, 0);
  assert.equal(local.calls.fork, 0);
});

test('distributed mode routes fork to Game Authority and leaves the Nest writer idle', async () => {
  const seam = receiptSeam();
  const server = await startGameAuthorityServer({
    seam,
    token,
    timeoutMs: 1000,
  });
  const local = localStories();
  const controller = new StoriesController(
    identity,
    local,
    null,
    storySeamFor(local, {
      mode: 'distributed',
      origin: server.origin,
      token,
      timeoutMs: 1000,
    }),
  );
  try {
    const forked = await controller.fork(
      request,
      storyId,
      forkStoryId,
      forkBody,
    );
    assert.deepEqual(forked, { storyId: forkStoryId, view: 'forked' });
    assert.equal(seam.forkCalls(), 1);
    assert.equal(local.calls.fork, 0);
    assert.deepEqual(seam.seenActors, [ownerId]);
  } finally {
    await server.close();
  }
});

test('embedded mode keeps in-process fork and does not call Game Authority', async () => {
  let remoteCalls = 0;
  const server = await startGameAuthorityServer({
    token,
    timeoutMs: 1000,
    seam: {
      async read() {
        remoteCalls += 1;
        return { source: 'remote' };
      },
      async startFromCandidate() {
        remoteCalls += 1;
        return { source: 'remote' };
      },
      async fork() {
        remoteCalls += 1;
        return { source: 'remote' };
      },
      async admitResolution() {
        remoteCalls += 1;
        return { source: 'remote' };
      },
    },
  });
  const local = localStories();
  const controller = new StoriesController(
    identity,
    local,
    null,
    storySeamFor(local, { mode: 'embedded' }),
  );
  try {
    const forked = await controller.fork(
      request,
      storyId,
      forkStoryId,
      forkBody,
    );
    assert.deepEqual(forked, {
      source: 'compose-fork',
      storyId: forkStoryId,
      view: 'forked-local',
    });
    assert.equal(local.calls.fork, 1);
    assert.equal(remoteCalls, 0);
  } finally {
    await server.close();
  }
});

test('distributed fork does not fall back to local stories when Game Authority is down', async () => {
  const local = localStories();
  const controller = new StoriesController(
    identity,
    local,
    null,
    storySeamFor(local, {
      mode: 'distributed',
      origin: 'http://127.0.0.1:1',
      token: '0123456789abcdef',
      timeoutMs: 100,
    }),
  );
  await assert.rejects(
    () => controller.fork(request, storyId, forkStoryId, forkBody),
    (error) => error instanceof HttpException && error.getStatus() === 503,
  );
  assert.equal(local.calls.fork, 0);
});
