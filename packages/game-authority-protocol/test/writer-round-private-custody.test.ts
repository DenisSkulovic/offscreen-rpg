import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  parseWriterRoundPrivateJsonBody,
  parseWriterRoundPrivatePrepareRequest,
  preparedWriterRoundWireIsSelfConsistent,
  routeWriterRoundPrivateCustody,
  writerRoundCanonicalMicrousdSchema,
  writerRoundModelPolicyWireSchema,
  writerRoundPrivateCustodyBodyByteLimit,
  writerRoundPrivateCustodyContractVersion,
  writerRoundPrivateMaxWireBytes,
  writerRoundPrivateOutcomePath,
  writerRoundPrivatePreparePath,
  writerRoundPrivatePrepareRequestSchema,
  writerRoundPrivateStatusPath,
} from '../src/writer-round-private-custody';

const missionId = randomUUID();
const attemptId = randomUUID();
const contextId = randomUUID();

test('writer-round private paths and routing', () => {
  assert.equal(
    writerRoundPrivatePreparePath(missionId, 1),
    `/internal/v1/writer-rounds/${missionId}/1/prepare`,
  );
  assert.equal(
    writerRoundPrivateOutcomePath(missionId, 2, attemptId),
    `/internal/v1/writer-rounds/${missionId}/2/outcomes/${attemptId}`,
  );
  assert.equal(
    writerRoundPrivateStatusPath(missionId, 3),
    `/internal/v1/writer-rounds/${missionId}/3/status`,
  );
  assert.deepEqual(
    routeWriterRoundPrivateCustody(
      'POST',
      writerRoundPrivatePreparePath(missionId, 1),
    ),
    { kind: 'prepare', missionId, ordinal: 1 },
  );
  assert.deepEqual(
    routeWriterRoundPrivateCustody(
      'PUT',
      writerRoundPrivateOutcomePath(missionId, 1, attemptId),
    ),
    { kind: 'submit-outcome', missionId, ordinal: 1, attemptId },
  );
  assert.equal(
    routeWriterRoundPrivateCustody(
      'GET',
      `/internal/v1/storyteller-generations/${missionId}/task`,
    ).kind,
    'absent',
  );
});

test('prepare schema rejects caller-supplied price and bigint microusd', () => {
  const body = {
    schemaVersion: writerRoundPrivateCustodyContractVersion,
    contextId,
    attemptId,
    expectedRevision: 1,
    maxMicrousd: 99,
  };
  assert.equal(writerRoundPrivatePrepareRequestSchema.safeParse(body).success, false);

  const policy = {
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
  assert.equal(writerRoundModelPolicyWireSchema.safeParse(policy).success, true);
  assert.equal(
    writerRoundModelPolicyWireSchema.safeParse({
      ...policy,
      maxMicrousd: 5000n,
    }).success,
    false,
  );
  assert.equal(writerRoundCanonicalMicrousdSchema.safeParse('1e3').success, false);
});

test('bounded JSON parse rejects oversize and malformed bodies', () => {
  const oversize = 'x'.repeat(writerRoundPrivateCustodyBodyByteLimit + 1);
  assert.deepEqual(parseWriterRoundPrivateJsonBody(oversize), {
    ok: false,
    reason: 'oversized-body',
  });
  assert.deepEqual(parseWriterRoundPrivateJsonBody('{'), {
    ok: false,
    reason: 'invalid-json',
  });
  const parsed = parseWriterRoundPrivatePrepareRequest(
    JSON.stringify({
      schemaVersion: writerRoundPrivateCustodyContractVersion,
      contextId,
      attemptId,
      expectedRevision: 1,
    }),
  );
  assert.equal(parsed.ok, true);
});

test('prepared wire self-consistency enforces utf8 byte length', () => {
  const serialized = '{"model":"x"}';
  const wire = {
    version: 'openrouter-wire.v1' as const,
    serialized,
    sha256: createHash('sha256').update(serialized).digest('hex'),
    serializedBytes: serialized.length + 5,
  };
  assert.equal(preparedWriterRoundWireIsSelfConsistent(wire), false);
  assert.equal(
    writerRoundPrivateMaxWireBytes,
    32_768,
  );
});