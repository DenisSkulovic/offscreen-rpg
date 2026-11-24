import assert from 'node:assert/strict';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  storytellerTaskCustodyContractVersion,
  storytellerTaskCustodyVersionHeader,
} from '@offscreen/game-authority-protocol/storyteller-task-custody';
import {
  createStorytellerTaskCustodyClient,
  hashStorytellerTaskCustodyResult,
  StorytellerTaskCustodyTransportError,
  type StorytellerTaskCustodyClientConfig,
} from '../src/custody/storyteller-task-custody-client';

const generationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const root = 'ab'.repeat(32);
const executorToken = 'test-executor-only-credential';
const attemptId = randomUUID();

type MockState = {
  claimCalls: number;
  claimGenerationIds: string[];
};

async function startMockAuthority(
  handler: (
    method: string,
    pathname: string,
    body: string,
    auth: string | undefined,
    state: MockState,
  ) => { status: number; body: unknown },
) {
  const state: MockState = { claimCalls: 0, claimGenerationIds: [] };
  const server = createServer(
    async (request: IncomingMessage, response: ServerResponse) => {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      const chunks: Buffer[] = [];
      for await (const chunk of request) {
        chunks.push(Buffer.from(chunk));
      }
      const raw = Buffer.concat(chunks).toString('utf8');
      const auth = request.headers.authorization;
      const outcome = handler(request.method ?? 'GET', url.pathname, raw, auth, state);
      const payload = JSON.stringify(outcome.body);
      response.writeHead(outcome.status, {
        'content-type': 'application/json; charset=utf-8',
        [storytellerTaskCustodyVersionHeader]: storytellerTaskCustodyContractVersion,
        'content-length': Buffer.byteLength(payload),
      });
      response.end(payload);
    },
  );
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = address && typeof address === 'object' ? address.port : 0;
  const config: StorytellerTaskCustodyClientConfig = {
    origin: `http://127.0.0.1:${port}`,
    executorToken,
    timeoutMs: 500,
  };
  return {
    config,
    state,
    async close() {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}

function bearer(token: string) {
  return `Bearer ${token}`;
}

test('fetch, claim, save, and readSaved follow executor custody contract', async () => {
  const saved = { scene: 'opening' };
  const savedHash = hashStorytellerTaskCustodyResult(saved);
  const mock = await startMockAuthority((method, pathname, raw, auth) => {
    if (auth !== bearer(executorToken)) {
      return { status: 401, body: { code: 'unauthorized' } };
    }
    if (method === 'GET' && pathname.endsWith('/task')) {
      return {
        status: 200,
        body: {
          status: 'ready',
          generationId,
          ownerId: 'owner-trusted',
          pinnedRoot: root,
          task: { kind: 'opening' },
        },
      };
    }
    if (method === 'PUT' && pathname.endsWith('/claim')) {
      const body = JSON.parse(raw) as { pinnedRoot: string };
      if (body.pinnedRoot !== root) {
        return {
          status: 200,
          body: { status: 'refused', reason: 'root-mismatch' },
        };
      }
      return {
        status: 200,
        body: {
          status: 'claimed',
          generationId,
          attemptId,
          created: true,
        },
      };
    }
    if (method === 'PUT' && pathname.endsWith('/result')) {
      const body = JSON.parse(raw) as { resultHash: string; result: unknown };
      return {
        status: 200,
        body: {
          status: 'saved',
          generationId,
          attemptId,
          resultHash: body.resultHash,
          result: body.result,
        },
      };
    }
    if (method === 'GET' && pathname.endsWith('/saved-result')) {
      return {
        status: 200,
        body: {
          status: 'saved',
          generationId,
          attemptId,
          resultHash: savedHash,
          result: saved,
        },
      };
    }
    return { status: 404, body: { code: 'not_found' } };
  });
  const client = createStorytellerTaskCustodyClient(mock.config);
  try {
    const task = await client.fetchTask(generationId);
    assert.equal(task.status, 'ready');
    assert.equal(task.pinnedRoot, root);

    const claimed = await client.claim(generationId, root);
    assert.equal(claimed.status, 'claimed');
    assert.equal(claimed.attemptId, attemptId);

    const stored = await client.save(generationId, root, savedHash, saved);
    assert.equal(stored.status, 'saved');
    assert.equal(stored.resultHash, savedHash);

    const readBack = await client.readSaved(generationId);
    assert.equal(readBack.status, 'saved');
    assert.deepEqual(readBack.result, saved);
  } finally {
    await mock.close();
  }
});

test('rejected executor token is unauthorized without a follow-up claim', async () => {
  const mock = await startMockAuthority((method, pathname, _raw, auth, state) => {
    if (method === 'PUT' && pathname.endsWith('/claim')) {
      state.claimCalls += 1;
      state.claimGenerationIds.push(pathname);
    }
    if (auth !== bearer(executorToken)) {
      return { status: 401, body: { code: 'unauthorized' } };
    }
    return { status: 200, body: { status: 'ready', generationId, pinnedRoot: root, ownerId: 'o', task: {} } };
  });
  const client = createStorytellerTaskCustodyClient({
    ...mock.config,
    executorToken: 'wrong-executor-credential',
  });
  try {
    await assert.rejects(
      () => client.claim(generationId, root),
      (error: unknown) => {
        assert.ok(error instanceof StorytellerTaskCustodyTransportError);
        assert.equal(error.code, 'unauthorized');
        return true;
      },
    );
    assert.equal(mock.state.claimCalls, 1);
    const secondId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    await assert.rejects(
      () => client.claim(secondId, root),
      (error: unknown) => {
        assert.ok(error instanceof StorytellerTaskCustodyTransportError);
        assert.equal(error.code, 'unauthorized');
        return true;
      },
    );
    assert.equal(mock.state.claimCalls, 2);
    assert.deepEqual(mock.state.claimGenerationIds, [
      `/internal/v1/storyteller-generations/${generationId}/claim`,
      `/internal/v1/storyteller-generations/${secondId}/claim`,
    ]);
  } finally {
    await mock.close();
  }
});

test('root mismatch returns refused and does not issue a second claim for the same generation', async () => {
  const wrongRoot = 'cd'.repeat(32);
  const mock = await startMockAuthority((method, pathname, raw, auth, state) => {
    if (auth !== bearer(executorToken)) {
      return { status: 401, body: { code: 'unauthorized' } };
    }
    if (method === 'PUT' && pathname.endsWith('/claim')) {
      state.claimCalls += 1;
      const body = JSON.parse(raw) as { pinnedRoot: string };
      if (body.pinnedRoot !== root) {
        return {
          status: 200,
          body: { status: 'refused', reason: 'root-mismatch' },
        };
      }
      return {
        status: 200,
        body: { status: 'claimed', generationId, attemptId, created: true },
      };
    }
    return { status: 404, body: { code: 'not_found' } };
  });
  const client = createStorytellerTaskCustodyClient(mock.config);
  try {
    const outcome = await client.claim(generationId, wrongRoot);
    assert.equal(outcome.status, 'refused');
    assert.equal(outcome.reason, 'root-mismatch');
    assert.equal(mock.state.claimCalls, 1);
    const again = await client.claim(generationId, wrongRoot);
    assert.equal(again.status, 'refused');
    assert.equal(mock.state.claimCalls, 2);
  } finally {
    await mock.close();
  }
});

test('malformed JSON and transport timeouts surface as unavailable', async () => {
  const slow = await startMockAuthority(() => ({
    status: 200,
    body: 'not-json',
  }));
  const slowClient = createStorytellerTaskCustodyClient(slow.config);
  try {
    await assert.rejects(
      () => slowClient.fetchTask(generationId),
      (error: unknown) => {
        assert.ok(error instanceof StorytellerTaskCustodyTransportError);
        assert.equal(error.code, 'unavailable');
        return true;
      },
    );
  } finally {
    await slow.close();
  }

  const hanging = createServer((_request, response) => {
    /* never respond */
    response.socket?.resume();
  });
  await new Promise<void>((resolve) => hanging.listen(0, '127.0.0.1', resolve));
  const address = hanging.address();
  const port = address && typeof address === 'object' ? address.port : 0;
  const client = createStorytellerTaskCustodyClient({
    origin: `http://127.0.0.1:${port}`,
    executorToken,
    timeoutMs: 50,
  });
  try {
    await assert.rejects(
      () => client.fetchTask(generationId),
      (error: unknown) => {
        assert.ok(error instanceof StorytellerTaskCustodyTransportError);
        assert.equal(error.code, 'unavailable');
        return true;
      },
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      hanging.close((error) => (error ? reject(error) : resolve())),
    );
  }
});