import assert from 'node:assert/strict';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  writerRoundPrivateCustodyContractVersion,
  writerRoundPrivateCustodyVersionHeader,
  writerRoundPrivatePreparePath,
  writerRoundPrivateOutcomePath,
  writerRoundPrivateStatusPath,
} from '@offscreen/game-authority-protocol/writer-round-private-custody';
import { prepareWriterRoundWire } from '@offscreen/storyteller/providers/openrouter';
import {
  createWriterRoundPrivateClient,
  WriterRoundPrivateTransportError,
  type WriterRoundPrivateClientConfig,
} from '../src/custody/writer-round-private-client';

const executorToken = 'test-executor-only-credential';
const missionId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const contextId = missionId;
const attemptId = randomUUID();
const SAMPLE_PROVIDER_KEY = 'sk-or-fake-provider-secret-WR10TEST';

const basePolicy = {
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
};

function buildWire() {
  return prepareWriterRoundWire({
    model: basePolicy.model,
    provider: basePolicy.provider,
    messages: [{ role: 'user', content: 'Round one.' }],
    outputSchema: { type: 'object' },
    maxGeneratedTokens: basePolicy.maxOutputTokens,
    maxSerializedRequestBytes: 48_000,
    maxInputTokens: basePolicy.maxInputTokens,
  });
}

type MockState = {
  prepareCalls: number;
  submitCalls: number;
  statusCalls: number;
};

async function startMockAuthority(
  handler: (
    method: string,
    pathname: string,
    body: string,
    auth: string | undefined,
    state: MockState,
  ) => { status: number; body: unknown; drop?: boolean },
) {
  const state: MockState = { prepareCalls: 0, submitCalls: 0, statusCalls: 0 };
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
      if (outcome.drop) {
        response.destroy();
        return;
      }
      const payload = JSON.stringify(outcome.body);
      response.writeHead(outcome.status, {
        'content-type': 'application/json; charset=utf-8',
        [writerRoundPrivateCustodyVersionHeader]: writerRoundPrivateCustodyContractVersion,
        'content-length': Buffer.byteLength(payload),
      });
      response.end(payload);
    },
  );
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = address && typeof address === 'object' ? address.port : 0;
  const config: WriterRoundPrivateClientConfig = {
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

function readyPrepareBody(wire: ReturnType<typeof buildWire>) {
  return {
    status: 'ready',
    missionId,
    contextId,
    ordinal: 1,
    attemptId,
    requestSha256: wire.sha256,
    wire,
    modelPolicy: basePolicy,
  };
}

test('prepare, submitOutcome, and getStatus follow private writer-round contract', async () => {
  const wire = buildWire();
  const mock = await startMockAuthority((method, pathname, _raw, auth, state) => {
    if (auth !== bearer(executorToken)) {
      return { status: 401, body: { code: 'unauthorized' } };
    }
    if (method === 'POST' && pathname === writerRoundPrivatePreparePath(missionId, 1)) {
      state.prepareCalls += 1;
      return { status: 200, body: readyPrepareBody(wire) };
    }
    if (
      method === 'PUT' &&
      pathname === writerRoundPrivateOutcomePath(missionId, 1, attemptId)
    ) {
      state.submitCalls += 1;
      return { status: 200, body: { status: 'delivered', resultCasHash: 'd'.repeat(64) } };
    }
    if (method === 'GET' && pathname === writerRoundPrivateStatusPath(missionId, 1)) {
      state.statusCalls += 1;
      return {
        status: 200,
        body: { status: 'settled', attemptId, responseSha256: 'd'.repeat(64) },
      };
    }
    return { status: 404, body: { code: 'not_found' } };
  });
  const client = createWriterRoundPrivateClient(mock.config);
  try {
    const prepared = await client.prepare(missionId, 1, {
      contextId,
      attemptId,
      expectedRevision: 1,
    });
    assert.equal(prepared.status, 'ready');
    const submitted = await client.submitOutcome(missionId, 1, attemptId, {
      requestSha256: wire.sha256,
      outcome: {
        kind: 'failed',
        sent: false,
        failureCode: 'wire_rejected',
      },
    });
    assert.equal(submitted.status, 'delivered');
    const status = await client.getStatus(missionId, 1);
    assert.equal(status.status, 'settled');
    assert.equal(mock.state.prepareCalls, 1);
    assert.equal(mock.state.submitCalls, 1);
  } finally {
    await mock.close();
  }
});

test('rejected executor token is unauthorized without leaking secrets', async () => {
  const mock = await startMockAuthority((_method, _pathname, _raw, auth) => {
    if (auth !== bearer(executorToken)) {
      return { status: 401, body: { code: 'unauthorized' } };
    }
    return { status: 200, body: { status: 'uncertain' } };
  });
  const client = createWriterRoundPrivateClient({
    ...mock.config,
    executorToken: SAMPLE_PROVIDER_KEY,
  });
  try {
    await assert.rejects(
      () =>
        client.prepare(missionId, 1, {
          contextId,
          attemptId,
          expectedRevision: 1,
        }),
      (error: unknown) => {
        assert.ok(error instanceof WriterRoundPrivateTransportError);
        assert.equal(error.code, 'unauthorized');
        assert.equal(String(error.message).includes(SAMPLE_PROVIDER_KEY), false);
        return true;
      },
    );
  } finally {
    await mock.close();
  }
});

test('version header mismatch and malformed JSON surface as unavailable', async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end('not-json');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = address && typeof address === 'object' ? address.port : 0;
  const client = createWriterRoundPrivateClient({
    origin: `http://127.0.0.1:${port}`,
    executorToken,
    timeoutMs: 500,
  });
  try {
    await assert.rejects(
      () => client.getStatus(missionId, 1),
      (error: unknown) => {
        assert.ok(error instanceof WriterRoundPrivateTransportError);
        assert.equal(error.code, 'unavailable');
        return true;
      },
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});