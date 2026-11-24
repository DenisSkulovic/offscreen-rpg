import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { test } from 'node:test';
import {
  storytellerTaskCustodyContractVersion,
  storytellerTaskCustodyVersionHeader,
} from '@offscreen/game-authority-protocol/storyteller-task-custody';
import { createStorytellerDistributedControlActivities } from '../src/activities/storyteller-distributed-control';
import {
  readControlWorkerConfig,
  forbidBroadDatabaseOnControl,
} from '../src/bootstrap/config';
import { createStorytellerPublicationClient } from '../src/custody/storyteller-publication-client';

const generationId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const controlToken = 'test-control-only-credential';
const attemptId = randomUUID();
const resultHash = '12'.repeat(32);

function bearer(token: string) {
  return `Bearer ${token}`;
}

async function startMockPublishAuthority(
  handler: (
    method: string,
    pathname: string,
    auth: string | undefined,
  ) => { status: number; body: unknown },
) {
  const server = createServer(
    async (request: IncomingMessage, response: ServerResponse) => {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      const chunks: Buffer[] = [];
      for await (const chunk of request) {
        chunks.push(Buffer.from(chunk));
      }
      const outcome = handler(
        request.method ?? 'GET',
        url.pathname,
        request.headers.authorization,
      );
      const payload = JSON.stringify(outcome.body);
      response.writeHead(outcome.status, {
        'content-type': 'application/json; charset=utf-8',
        [storytellerTaskCustodyVersionHeader]:
          storytellerTaskCustodyContractVersion,
        'content-length': Buffer.byteLength(payload),
      });
      response.end(payload);
    },
  );
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = address && typeof address === 'object' ? address.port : 0;
  const client = createStorytellerPublicationClient({
    origin: `http://127.0.0.1:${port}`,
    controlToken,
    timeoutMs: 500,
  });
  return {
    client,
    async close() {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}

test('publishSavedStoryteller resolves when Game Authority returns published', async () => {
  const mock = await startMockPublishAuthority((method, pathname, auth) => {
    assert.equal(method, 'POST');
    assert.ok(pathname.endsWith('/publish'));
    assert.equal(auth, bearer(controlToken));
    return {
      status: 200,
      body: {
        status: 'published',
        generationId,
        attemptId,
        resultHash,
        passageId: randomUUID(),
      },
    };
  });
  const activities = createStorytellerDistributedControlActivities(mock.client);
  try {
    await activities.publishSavedStoryteller(generationId);
  } finally {
    await mock.close();
  }
});

test('publishSavedStoryteller resolves on already_published duplicate', async () => {
  const mock = await startMockPublishAuthority(() => ({
    status: 200,
    body: {
      status: 'already_published',
      generationId,
      attemptId,
      resultHash,
    },
  }));
  const activities = createStorytellerDistributedControlActivities(mock.client);
  try {
    await activities.publishSavedStoryteller(generationId);
  } finally {
    await mock.close();
  }
});

test('publishSavedStoryteller retries when publication transport is unavailable', async () => {
  const hanging = createServer((_request, response) => {
    response.socket?.resume();
  });
  await new Promise<void>((resolve) => hanging.listen(0, '127.0.0.1', resolve));
  const address = hanging.address();
  const port = address && typeof address === 'object' ? address.port : 0;
  const client = createStorytellerPublicationClient({
    origin: `http://127.0.0.1:${port}`,
    controlToken,
    timeoutMs: 50,
  });
  const activities = createStorytellerDistributedControlActivities(client);
  try {
    await assert.rejects(
      () => activities.publishSavedStoryteller(generationId),
      {
        name: 'ApplicationFailure',
        type: 'PublicationUnavailable',
        nonRetryable: false,
      },
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      hanging.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('publishSavedStoryteller waits when the consequence has not settled', async () => {
  const mock = await startMockPublishAuthority(() => ({
    status: 200,
    body: {
      status: 'blocked',
      generationId,
      reason: 'pending-consequence-not-settled',
    },
  }));
  const activities = createStorytellerDistributedControlActivities(mock.client);
  try {
    await assert.rejects(
      () => activities.publishSavedStoryteller(generationId),
      {
        name: 'ApplicationFailure',
        type: 'PublicationPendingSettlement',
        nonRetryable: false,
      },
    );
  } finally {
    await mock.close();
  }
});

test('publishSavedStoryteller stays non-retryable for other blocked reasons', async () => {
  const mock = await startMockPublishAuthority(() => ({
    status: 200,
    body: {
      status: 'blocked',
      generationId,
      reason: 'publication-blocked',
    },
  }));
  const activities = createStorytellerDistributedControlActivities(mock.client);
  try {
    await assert.rejects(
      () => activities.publishSavedStoryteller(generationId),
      {
        name: 'ApplicationFailure',
        type: 'PublicationBlocked',
        nonRetryable: true,
      },
    );
  } finally {
    await mock.close();
  }
});

test('publishSavedStoryteller fails non-retryably on unauthorized', async () => {
  const mock = await startMockPublishAuthority(() => ({
    status: 401,
    body: { code: 'unauthorized' },
  }));
  const activities = createStorytellerDistributedControlActivities(mock.client);
  try {
    await assert.rejects(
      () => activities.publishSavedStoryteller(generationId),
      {
        name: 'ApplicationFailure',
        type: 'PublicationTransport',
        nonRetryable: true,
      },
    );
  } finally {
    await mock.close();
  }
});

test('control activity module does not import local publication bridge', () => {
  const activityPath = resolve(
    __dirname,
    '../../src/activities/storyteller-distributed-control.ts',
  );
  const source = readFileSync(activityPath, 'utf8');
  assert.doesNotMatch(source, /publishStorytellerResult/);
  assert.doesNotMatch(source, /createStorytellerGenerationAdoption/);
  assert.doesNotMatch(source, /@offscreen\/db/);
});

test('readControlWorkerConfig rejects broad database env and accepts GA-only control env', () => {
  const gaOrigin = 'http://127.0.0.1:7355';
  assert.throws(() =>
    readControlWorkerConfig({
      TEMPORAL_ADDRESS: '127.0.0.1:7233',
      TEMPORAL_NAMESPACE: 'default',
      GAME_AUTHORITY_ORIGIN: gaOrigin,
      GAME_AUTHORITY_CONTROL_TOKEN: controlToken,
      DATABASE_URL: 'postgres://user:pass@127.0.0.1/offscreen_auth_test',
    }),
  );
  try {
    forbidBroadDatabaseOnControl({
      DATABASE_URL: 'postgres://example',
    });
    assert.fail('forbidBroadDatabaseOnControl should throw');
  } catch (error) {
    assert.ok(error instanceof Error);
    assert.match(error.message, /DATABASE_URL/);
  }
  const config = readControlWorkerConfig({
    TEMPORAL_ADDRESS: '127.0.0.1:7233',
    TEMPORAL_NAMESPACE: 'default',
    GAME_AUTHORITY_ORIGIN: gaOrigin,
    GAME_AUTHORITY_CONTROL_TOKEN: controlToken,
  });
  assert.equal(config.publication.origin, gaOrigin);
  assert.equal(config.publication.controlToken, controlToken);
  assert.ok(!('database' in config));
  assert.ok(!('DATABASE_URL' in config));
});
