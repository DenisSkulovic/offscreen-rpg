import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { join } from 'node:path';
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
import type {
  WriterRoundTransportResult,
  PreparedWriterRoundTransport,
} from '@offscreen/storyteller/providers/writer-round-transport';
import { createWriterRoundPrivateClient } from '../src/custody/writer-round-private-client';
import { executePreparedWriterRound } from '../src/activities/writer-round-provider-execution';

const executorToken = 'test-executor-only-credential';
const SAMPLE_PROVIDER_KEY = 'sk-or-fake-provider-secret-WR10TEST';
const missionId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const contextId = missionId;
const attemptId = randomUUID();

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
    wire: ReturnType<typeof buildWire>,
  ) => { status: number; body: unknown; drop?: boolean },
) {
  const wire = buildWire();
  const state: MockState = {
    prepareCalls: 0,
    submitCalls: 0,
    statusCalls: 0,
  };
  const server = createServer(
    async (request: IncomingMessage, response: ServerResponse) => {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      const chunks: Buffer[] = [];
      for await (const chunk of request) {
        chunks.push(Buffer.from(chunk));
      }
      const raw = Buffer.concat(chunks).toString('utf8');
      const auth = request.headers.authorization;
      const outcome = handler(request.method ?? 'GET', url.pathname, raw, auth, state, wire);
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
  return {
    wire,
    state,
    origin: `http://127.0.0.1:${port}`,
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

function countingTransport(
  counter: { invokes: number },
  deliveredContent: string,
): (input: Parameters<typeof import('@offscreen/storyteller/providers/writer-round-transport').prepareWriterRoundTransport>[0]) => PreparedWriterRoundTransport {
  return (input) => ({
    preflight: () => ({ kind: 'ready', wireSha256: input.capturedWire.sha256 }),
    invoke: async (): Promise<WriterRoundTransportResult> => {
      counter.invokes += 1;
      return {
        kind: 'delivered',
        serializedResponse: deliveredContent,
        usage: {
          reportedCostMicrousd: 1000n,
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
          reasoningTokens: null,
          cachedTokens: null,
          cacheWriteTokens: null,
        },
        telemetry: {
          durationMs: 12,
          httpStatus: 200,
          providerId: 'gen_wr10',
          reportedModel: basePolicy.model,
          finishReason: 'stop',
        },
        exactWireSha256: input.capturedWire.sha256,
      };
    },
  });
}

async function runRound(deliveredContent: string, submitBodyChecks?: (body: unknown) => void) {
  const counter = { invokes: 0 };
  const mock = await startMockAuthority((method, pathname, raw, auth, state, wire) => {
    if (auth !== bearer(executorToken)) {
      return { status: 401, body: { code: 'unauthorized' } };
    }
    if (method === 'POST' && pathname === writerRoundPrivatePreparePath(missionId, 1)) {
      state.prepareCalls += 1;
      return {
        status: 200,
        body: {
          status: 'ready',
          missionId,
          contextId,
          ordinal: 1,
          attemptId,
          requestSha256: wire.sha256,
          wire,
          modelPolicy: basePolicy,
        },
      };
    }
    if (
      method === 'PUT' &&
      pathname === writerRoundPrivateOutcomePath(missionId, 1, attemptId)
    ) {
      state.submitCalls += 1;
      if (submitBodyChecks) {
        submitBodyChecks(JSON.parse(raw));
      }
      return { status: 200, body: { status: 'delivered', resultCasHash: 'e'.repeat(64) } };
    }
    return { status: 404, body: { code: 'not_found' } };
  });
  const custody = createWriterRoundPrivateClient({
    origin: mock.origin,
    executorToken,
    timeoutMs: 500,
  });
  try {
    const result = await executePreparedWriterRound(
      {
        missionId,
        ordinal: 1,
        contextId,
        attemptId,
        expectedRevision: 1,
      },
      {
        custody,
        apiKey: SAMPLE_PROVIDER_KEY,
        outputSchema: { type: 'object' },
        fetchImpl: fetch,
        prepareTransport: countingTransport(counter, deliveredContent),
      },
    );
    return { result, counter, state: mock.state };
  } finally {
    await mock.close();
  }
}

test('tool-shaped invoke submits delivered outcome once via PUT', async () => {
  const toolPayload = JSON.stringify({
    kind: 'tool-calls',
    calls: [{ tool: 'library.read', input: {} }],
  });
  const { result, counter, state } = await runRound(toolPayload, (body) => {
    const typed = body as {
      outcome: { kind: string; serializedResponse?: string };
    };
    assert.equal(typed.outcome.kind, 'delivered');
    assert.equal(typed.outcome.serializedResponse, toolPayload);
  });
  assert.equal(counter.invokes, 1);
  assert.equal(state.prepareCalls, 1);
  assert.equal(state.submitCalls, 1);
  assert.equal(result.status, 'delivered');
});

test('final-shaped invoke submits delivered outcome once via PUT', async () => {
  const finalPayload = JSON.stringify({
    kind: 'final',
    proposal: { version: 'writer-scene-proposal.v1' },
  });
  const { result, counter, state } = await runRound(finalPayload);
  assert.equal(counter.invokes, 1);
  assert.equal(state.submitCalls, 1);
  assert.equal(result.status, 'delivered');
});

test('missing provider key reports failed unsent without invoke', async () => {
  const mock = await startMockAuthority((method, pathname, raw, auth, state, wire) => {
    if (auth !== bearer(executorToken)) {
      return { status: 401, body: { code: 'unauthorized' } };
    }
    if (method === 'POST' && pathname === writerRoundPrivatePreparePath(missionId, 1)) {
      state.prepareCalls += 1;
      return {
        status: 200,
        body: {
          status: 'ready',
          missionId,
          contextId,
          ordinal: 1,
          attemptId,
          requestSha256: wire.sha256,
          wire,
          modelPolicy: basePolicy,
        },
      };
    }
    if (
      method === 'PUT' &&
      pathname === writerRoundPrivateOutcomePath(missionId, 1, attemptId)
    ) {
      state.submitCalls += 1;
      const body = JSON.parse(raw) as { outcome: { kind: string; sent?: boolean } };
      assert.equal(body.outcome.kind, 'failed');
      assert.equal(body.outcome.sent, false);
      return { status: 200, body: { status: 'failed', reason: 'unsent' } };
    }
    return { status: 404, body: { code: 'not_found' } };
  });
  const custody = createWriterRoundPrivateClient({
    origin: mock.origin,
    executorToken,
    timeoutMs: 500,
  });
  try {
    await executePreparedWriterRound(
      {
        missionId,
        ordinal: 1,
        contextId,
        attemptId,
        expectedRevision: 1,
      },
      {
        custody,
        apiKey: undefined,
        outputSchema: { type: 'object', properties: { kind: { type: 'string' } } },
        fetchImpl: fetch,
      },
    );
    assert.equal(mock.state.submitCalls, 1);
  } finally {
    await mock.close();
  }
});

test('wrong wire pins reject before invoke', async () => {
  const counter = { invokes: 0 };
  const mock = await startMockAuthority((method, pathname, _raw, auth, state, wire) => {
    if (auth !== bearer(executorToken)) {
      return { status: 401, body: { code: 'unauthorized' } };
    }
    if (method === 'POST' && pathname === writerRoundPrivatePreparePath(missionId, 1)) {
      state.prepareCalls += 1;
      return {
        status: 200,
        body: {
          status: 'ready',
          missionId,
          contextId,
          ordinal: 1,
          attemptId,
          requestSha256: 'f'.repeat(64),
          wire,
          modelPolicy: basePolicy,
        },
      };
    }
    return { status: 404, body: { code: 'not_found' } };
  });
  const custody = createWriterRoundPrivateClient({
    origin: mock.origin,
    executorToken,
    timeoutMs: 500,
  });
  try {
    await assert.rejects(
      () =>
        executePreparedWriterRound(
          {
            missionId,
            ordinal: 1,
            contextId,
            attemptId,
            expectedRevision: 1,
          },
          {
            custody,
            apiKey: SAMPLE_PROVIDER_KEY,
            outputSchema: {},
            fetchImpl: fetch,
            prepareTransport: countingTransport(counter, '{}'),
          },
        ),
      (error: unknown) => {
        const message = String(error);
        assert.equal(message.includes(SAMPLE_PROVIDER_KEY), false);
        assert.equal(counter.invokes, 0);
        return true;
      },
    );
  } finally {
    await mock.close();
  }
});

test('lost PUT after possible send reconciles via GET without resend', async () => {
  const counter = { invokes: 0 };
  const mock = await startMockAuthority((method, pathname, _raw, auth, state, wire) => {
    if (auth !== bearer(executorToken)) {
      return { status: 401, body: { code: 'unauthorized' } };
    }
    if (method === 'POST' && pathname === writerRoundPrivatePreparePath(missionId, 1)) {
      state.prepareCalls += 1;
      return {
        status: 200,
        body: {
          status: 'ready',
          missionId,
          contextId,
          ordinal: 1,
          attemptId,
          requestSha256: wire.sha256,
          wire,
          modelPolicy: basePolicy,
        },
      };
    }
    if (
      method === 'PUT' &&
      pathname === writerRoundPrivateOutcomePath(missionId, 1, attemptId)
    ) {
      state.submitCalls += 1;
      return { drop: true, status: 200, body: {} };
    }
    if (method === 'GET' && pathname === writerRoundPrivateStatusPath(missionId, 1)) {
      state.statusCalls += 1;
      return {
        status: 200,
        body: {
          status: 'settled',
          attemptId,
          responseSha256: 'a'.repeat(64),
        },
      };
    }
    return { status: 404, body: { code: 'not_found' } };
  });
  const custody = createWriterRoundPrivateClient({
    origin: mock.origin,
    executorToken,
    timeoutMs: 500,
  });
  try {
    const result = await executePreparedWriterRound(
      {
        missionId,
        ordinal: 1,
        contextId,
        attemptId,
        expectedRevision: 1,
      },
      {
        custody,
        apiKey: SAMPLE_PROVIDER_KEY,
        outputSchema: {},
        fetchImpl: fetch,
        prepareTransport: countingTransport(counter, JSON.stringify({ kind: 'final' })),
      },
    );
    assert.equal(counter.invokes, 1);
    assert.equal(mock.state.prepareCalls, 1);
    assert.equal(mock.state.submitCalls, 1);
    assert.equal(mock.state.statusCalls, 1);
    assert.equal(result.status, 'delivered');
  } finally {
    await mock.close();
  }
});

test('unknown transport outcome submits unknown kind', async () => {
  const counter = { invokes: 0 };
  const mock = await startMockAuthority((method, pathname, raw, auth, state, wire) => {
    if (auth !== bearer(executorToken)) {
      return { status: 401, body: { code: 'unauthorized' } };
    }
    if (method === 'POST' && pathname === writerRoundPrivatePreparePath(missionId, 1)) {
      state.prepareCalls += 1;
      return {
        status: 200,
        body: {
          status: 'ready',
          missionId,
          contextId,
          ordinal: 1,
          attemptId,
          requestSha256: wire.sha256,
          wire,
          modelPolicy: basePolicy,
        },
      };
    }
    if (
      method === 'PUT' &&
      pathname === writerRoundPrivateOutcomePath(missionId, 1, attemptId)
    ) {
      state.submitCalls += 1;
      const body = JSON.parse(raw) as { outcome: { kind: string } };
      assert.equal(body.outcome.kind, 'unknown');
      return { status: 200, body: { status: 'uncertain' } };
    }
    return { status: 404, body: { code: 'not_found' } };
  });
  const custody = createWriterRoundPrivateClient({
    origin: mock.origin,
    executorToken,
    timeoutMs: 500,
  });
  try {
    await executePreparedWriterRound(
      {
        missionId,
        ordinal: 1,
        contextId,
        attemptId,
        expectedRevision: 1,
      },
      {
        custody,
        apiKey: SAMPLE_PROVIDER_KEY,
        outputSchema: {},
        fetchImpl: fetch,
        prepareTransport: (input) => ({
          preflight: () => ({ kind: 'ready', wireSha256: input.capturedWire.sha256 }),
          invoke: async () => {
            counter.invokes += 1;
            return {
              kind: 'unknown',
              telemetry: {
                durationMs: 5,
                httpStatus: null,
                providerId: null,
                reportedModel: null,
                finishReason: 'lost-response',
              },
              exactWireSha256: input.capturedWire.sha256,
            };
          },
        }),
      },
    );
    assert.equal(counter.invokes, 1);
    assert.equal(mock.state.submitCalls, 1);
  } finally {
    await mock.close();
  }
});

test('adapter module does not import database or DocumentStore', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/activities/writer-round-provider-execution.ts'),
    'utf8',
  );
  assert.equal(/@offscreen\/db/.test(source), false);
  assert.equal(/@offscreen\/documents/.test(source), false);
  assert.equal(/DocumentStore/.test(source), false);
  assert.equal(/drizzle/.test(source), false);
});