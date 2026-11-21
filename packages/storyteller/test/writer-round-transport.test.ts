import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import {
  prepareWriterRoundWire,
  type PreparedProviderWire,
} from '../src/providers/openrouter.js';
import {
  createWriterRoundTransport,
  type WriterRoundModelPolicy,
} from '../src/providers/writer-round-transport.js';

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: { kind: { type: 'string' } },
  required: ['kind'],
  additionalProperties: false,
};

const basePolicy: WriterRoundModelPolicy = {
  model: 'anthropic/claude-3.5-sonnet',
  provider: 'Anthropic',
  priceVersion: 'p3b-test.v1',
  inputMicrousdPerMillion: '3000000',
  outputMicrousdPerMillion: '15000000',
  maxInputTokens: 8192,
  maxOutputTokens: 1024,
  maxModelRounds: 3,
  maxMicrousd: 500_000n,
  timeoutMs: 30_000,
};

function buildWire(): PreparedProviderWire {
  return prepareWriterRoundWire({
    model: basePolicy.model,
    provider: basePolicy.provider,
    messages: [{ role: 'user', content: 'Round one.' }],
    outputSchema: OUTPUT_SCHEMA,
    maxGeneratedTokens: basePolicy.maxOutputTokens,
    maxSerializedRequestBytes: 48_000,
    maxInputTokens: basePolicy.maxInputTokens,
  });
}

function mutateWire(
  wire: PreparedProviderWire,
  mutator: (body: Record<string, unknown>) => void,
): PreparedProviderWire {
  const body = JSON.parse(wire.serialized) as Record<string, unknown>;
  mutator(body);
  const serialized = JSON.stringify(body);
  return {
    version: 'openrouter-wire.v1',
    serialized,
    sha256: createHash('sha256').update(serialized, 'utf8').digest('hex'),
    serializedBytes: Buffer.byteLength(serialized, 'utf8'),
  };
}

function successEnvelope(content: string, cost: string | number) {
  return {
    id: 'gen_test_001',
    model: basePolicy.model,
    usage: {
      cost,
      prompt_tokens: 120,
      completion_tokens: 40,
      total_tokens: 160,
    },
    choices: [
      {
        finish_reason: 'stop',
        message: { content, refusal: null },
      },
    ],
  };
}

test('delivered: nonzero usage, one fetch with exact wire body', async () => {
  const wire = buildWire();
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const content = JSON.stringify({ kind: 'final' });
  const transport = createWriterRoundTransport({
    capturedWire: wire,
    pinnedModelPolicy: basePolicy,
    outputSchema: OUTPUT_SCHEMA,
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(
        JSON.stringify(successEnvelope(content, '0.001234')),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      );
    },
  });
  const result = await transport();
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(calls[0]?.init?.method, 'POST');
  assert.equal(calls[0]?.init?.body, wire.serialized);
  assert.equal(result.kind, 'delivered');
  if (result.kind !== 'delivered') return;
  assert.equal(result.serializedResponse, content);
  assert.equal(result.usage.reportedCostMicrousd, 1234n);
  assert.equal(result.usage.promptTokens, 120);
  assert.equal(result.exactWireSha256, wire.sha256);
});

test('wire mismatch does not call fetch', async () => {
  const wire = mutateWire(buildWire(), (body) => {
    body['model'] = 'wrong/model';
  });
  let called = false;
  const transport = createWriterRoundTransport({
    capturedWire: wire,
    pinnedModelPolicy: basePolicy,
    outputSchema: OUTPUT_SCHEMA,
    fetchImpl: async () => {
      called = true;
      return new Response('{}', { status: 200 });
    },
  });
  const result = await transport();
  assert.equal(called, false);
  assert.equal(result.kind, 'failed');
  if (result.kind !== 'failed') return;
  assert.equal(result.failureCode, 'wire_rejected');
  assert.equal(result.sent, false);
  assert.equal(result.exactWireSha256, null);
});

test('malformed output still returns usage', async () => {
  const wire = buildWire();
  const transport = createWriterRoundTransport({
    capturedWire: wire,
    pinnedModelPolicy: basePolicy,
    outputSchema: OUTPUT_SCHEMA,
    fetchImpl: async () =>
      new Response(JSON.stringify(successEnvelope('plain text', '0.0005')), {
        status: 200,
      }),
  });
  const result = await transport();
  assert.equal(result.kind, 'failed');
  if (result.kind !== 'failed') return;
  assert.equal(result.failureCode, 'malformed_output');
  assert.equal(result.sent, true);
  assert.equal(result.usage.reportedCostMicrousd, 500n);
});

test('lost response => unknown; one fetch per invocation', async () => {
  const wire = buildWire();
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    throw new Error('network lost');
  };
  const transport = createWriterRoundTransport({
    capturedWire: wire,
    pinnedModelPolicy: basePolicy,
    outputSchema: OUTPUT_SCHEMA,
    fetchImpl,
  });
  const first = await transport();
  assert.equal(calls, 1);
  assert.equal(first.kind, 'unknown');
  if (first.kind === 'unknown') {
    assert.equal(first.telemetry.finishReason, 'lost-response');
    assert.equal(first.exactWireSha256, wire.sha256);
  }
  const second = await transport();
  assert.equal(calls, 2);
  assert.equal(second.kind, 'unknown');
});

test('over_budget when cost above maxMicrousd', async () => {
  const wire = buildWire();
  const transport = createWriterRoundTransport({
    capturedWire: wire,
    pinnedModelPolicy: { ...basePolicy, maxMicrousd: 100n },
    outputSchema: OUTPUT_SCHEMA,
    fetchImpl: async () =>
      new Response(
        JSON.stringify(
          successEnvelope(JSON.stringify({ kind: 'final' }), '0.01'),
        ),
        { status: 200 },
      ),
  });
  const result = await transport();
  assert.equal(result.kind, 'failed');
  if (result.kind !== 'failed') return;
  assert.equal(result.failureCode, 'over_budget');
  assert.equal(result.sent, true);
});

test('allow_fallbacks true => wire_rejected, fetch not called', async () => {
  const wire = mutateWire(buildWire(), (body) => {
    const provider = body['provider'] as Record<string, unknown>;
    provider['allow_fallbacks'] = true;
  });
  let called = false;
  const transport = createWriterRoundTransport({
    capturedWire: wire,
    pinnedModelPolicy: basePolicy,
    outputSchema: OUTPUT_SCHEMA,
    fetchImpl: async () => {
      called = true;
      return new Response('{}', { status: 200 });
    },
  });
  const result = await transport();
  assert.equal(called, false);
  assert.equal(result.kind, 'failed');
  if (result.kind !== 'failed') return;
  assert.equal(result.failureCode, 'wire_rejected');
});
