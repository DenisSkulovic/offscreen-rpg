import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  hashStorytellerTaskCustodyResult,
  parseStorytellerTaskCustodyClaimRequest,
  parseStorytellerTaskCustodyEvidenceRequest,
  parseStorytellerTaskCustodyJsonBody,
  parseStorytellerTaskCustodySaveResultRequest,
  pinnedStorytellerRootSchema,
  routeStorytellerTaskCustody,
  storytellerTaskCustodyBodyByteLimit,
  storytellerTaskCustodyClaimRequestSchema,
  storytellerTaskCustodyClaimResponseSchema,
  storytellerTaskCustodyContractVersion,
  storytellerTaskCustodyEvidencePath,
  storytellerTaskCustodyEvidenceRequestSchema,
  storytellerTaskCustodyEvidenceResponseSchema,
  storytellerTaskCustodyFetchResponseSchema,
  storytellerTaskCustodyReadSavedPath,
  storytellerTaskCustodySaveResultPath,
  storytellerTaskCustodySaveResultRequestSchema,
  storytellerTaskCustodySaveResultResponseSchema,
  storytellerTaskCustodyTaskPath,
} from '../src/storyteller-task-custody';

const root = 'ab'.repeat(32);

test('custody versioned paths honor internal/v1 generation id segment', () => {
  const generationId = randomUUID();
  assert.equal(
    storytellerTaskCustodyTaskPath(generationId),
    `/internal/v1/storyteller-generations/${generationId}/task`,
  );
  const route = routeStorytellerTaskCustody(
    'GET',
    storytellerTaskCustodyTaskPath(generationId),
  );
  assert.deepEqual(route, { kind: 'task', generationId });
  assert.deepEqual(
    routeStorytellerTaskCustody(
      'PUT',
      storytellerTaskCustodySaveResultPath(generationId),
    ),
    { kind: 'save-result', generationId },
  );
  assert.deepEqual(
    routeStorytellerTaskCustody(
      'GET',
      storytellerTaskCustodyReadSavedPath(generationId),
    ),
    { kind: 'read-saved', generationId },
  );
  assert.equal(
    routeStorytellerTaskCustody('GET', '/internal/v1/stories/bad').kind,
    'absent',
  );
  assert.equal(
    routeStorytellerTaskCustody(
      'GET',
      `/internal/v1/storyteller-generations/not-a-uuid/task`,
    ).kind,
    'invalid',
  );
});

test('claim and save request schemas reject worker-supplied ownerId', () => {
  const claim = {
    schemaVersion: storytellerTaskCustodyContractVersion,
    pinnedRoot: root,
  };
  assert.equal(storytellerTaskCustodyClaimRequestSchema.safeParse(claim).success, true);
  assert.equal(
    storytellerTaskCustodyClaimRequestSchema.safeParse({
      ...claim,
      ownerId: 'owner-a',
    }).success,
    false,
  );
  const save = {
    schemaVersion: storytellerTaskCustodyContractVersion,
    pinnedRoot: root,
    resultHash: createHash('sha256').update('x').digest('hex'),
    result: { scene: { next: { kind: 'hold' } } },
  };
  assert.equal(
    storytellerTaskCustodySaveResultRequestSchema.safeParse(save).success,
    true,
  );
  assert.equal(
    storytellerTaskCustodySaveResultRequestSchema.safeParse({
      ...save,
      generationId: randomUUID(),
    }).success,
    false,
  );
});

test('pinned root accepts a 64-hex hash or null only', () => {
  assert.equal(pinnedStorytellerRootSchema.safeParse(root).success, true);
  assert.equal(pinnedStorytellerRootSchema.safeParse(null).success, true);
  assert.equal(pinnedStorytellerRootSchema.safeParse('too-short').success, false);
});

test('json body parser refuses oversized and malformed payloads before shape validation', () => {
  const oversized = `{"schemaVersion":${JSON.stringify(
    storytellerTaskCustodyContractVersion,
  )},"pinnedRoot":${JSON.stringify(root)}${' '.repeat(
    storytellerTaskCustodyBodyByteLimit,
  )}}`;
  const oversizedBody = parseStorytellerTaskCustodyJsonBody(oversized);
  assert.equal(oversizedBody.ok, false);
  if (!oversizedBody.ok) {
    assert.equal(oversizedBody.reason, 'oversized-body');
  }
  const badJson = parseStorytellerTaskCustodyClaimRequest('{not-json');
  assert.equal(badJson.ok, false);
  if (!badJson.ok) {
    assert.equal(badJson.reason, 'invalid-json');
  }
  const wrongVersion = parseStorytellerTaskCustodyClaimRequest(
    JSON.stringify({ schemaVersion: 'wrong', pinnedRoot: root }),
  );
  assert.equal(wrongVersion.ok, false);
  if (!wrongVersion.ok) {
    assert.equal(wrongVersion.reason, 'invalid-shape');
  }
});

test('bounded claim parser accepts a versioned pinned root body', () => {
  const body = JSON.stringify({
    schemaVersion: storytellerTaskCustodyContractVersion,
    pinnedRoot: root,
  });
  const parsed = parseStorytellerTaskCustodyClaimRequest(body);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.value.pinnedRoot, root);
  }
});

test('save parser enforces result hash shape and stable canonical digest', () => {
  const result = { alpha: 1, nested: { z: 9, a: 2 } };
  const resultHash = hashStorytellerTaskCustodyResult(result);
  const body = JSON.stringify({
    schemaVersion: storytellerTaskCustodyContractVersion,
    pinnedRoot: null,
    resultHash,
    result,
  });
  const parsed = parseStorytellerTaskCustodySaveResultRequest(body);
  assert.equal(parsed.ok, true);
  const permuted = {
    nested: { a: 2, z: 9 },
    alpha: 1,
  };
  assert.equal(
    hashStorytellerTaskCustodyResult(permuted),
    hashStorytellerTaskCustodyResult(result),
  );
  const badHash = parseStorytellerTaskCustodySaveResultRequest(
    JSON.stringify({
      schemaVersion: storytellerTaskCustodyContractVersion,
      pinnedRoot: null,
      resultHash: 'not-a-digest',
      result: {},
    }),
  );
  assert.equal(badHash.ok, false);
  if (!badHash.ok) {
    assert.equal(badHash.reason, 'invalid-shape');
  }
});

test('response unions match execution custody outcomes', () => {
  const generationId = randomUUID();
  const attemptId = randomUUID();
  const resultHash = 'cd'.repeat(32);
  assert.equal(
    storytellerTaskCustodyFetchResponseSchema.safeParse({
      status: 'ready',
      generationId,
      ownerId: 'owner-from-db',
      pinnedRoot: root,
      task: { task: 'opening' },
    }).success,
    true,
  );
  assert.equal(
    storytellerTaskCustodyFetchResponseSchema.safeParse({
      status: 'refused',
      reason: 'unknown-generation',
    }).success,
    true,
  );
  assert.equal(
    storytellerTaskCustodyClaimResponseSchema.safeParse({
      status: 'claimed',
      generationId,
      attemptId,
      created: false,
    }).success,
    true,
  );
  assert.equal(
    storytellerTaskCustodyClaimResponseSchema.safeParse({
      status: 'refused',
      reason: 'root-mismatch',
    }).success,
    true,
  );
  assert.equal(
    storytellerTaskCustodySaveResultResponseSchema.safeParse({
      status: 'conflict',
      reason: 'result-hash',
      generationId,
      attemptId,
      resultHash,
    }).success,
    true,
  );
});

test('POST evidence path routes to evidence; GET evidence path is absent', () => {
  const generationId = randomUUID();
  const evidencePath = storytellerTaskCustodyEvidencePath(generationId);
  assert.equal(
    evidencePath,
    `/internal/v1/storyteller-generations/${generationId}/evidence`,
  );
  assert.deepEqual(
    routeStorytellerTaskCustody('POST', evidencePath),
    { kind: 'evidence', generationId },
  );
  assert.deepEqual(
    routeStorytellerTaskCustody('GET', evidencePath),
    { kind: 'absent' },
  );
});

test('evidence request schema rejects ownerId and more than eight handles', () => {
  const storyId = randomUUID();
  const baseRequest = {
    schemaVersion: storytellerTaskCustodyContractVersion,
    storyId,
    rootHash: root,
    rootRevision: 1,
    handles: [randomUUID()],
  };
  assert.equal(
    storytellerTaskCustodyEvidenceRequestSchema.safeParse(baseRequest).success,
    true,
  );
  assert.equal(
    storytellerTaskCustodyEvidenceRequestSchema.safeParse({
      ...baseRequest,
      ownerId: 'owner-a',
    }).success,
    false,
  );
  const nineHandles = Array.from({ length: 9 }, () => randomUUID());
  assert.equal(
    storytellerTaskCustodyEvidenceRequestSchema.safeParse({
      ...baseRequest,
      handles: nineHandles,
    }).success,
    false,
  );
});

test('valid evidence request parses through bounded parser', () => {
  const storyId = randomUUID();
  const handle = randomUUID();
  const body = JSON.stringify({
    schemaVersion: storytellerTaskCustodyContractVersion,
    storyId,
    rootHash: root,
    rootRevision: 2,
    handles: [handle],
  });
  const parsed = parseStorytellerTaskCustodyEvidenceRequest(body);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.value.storyId, storyId);
    assert.equal(parsed.value.rootHash, root);
    assert.deepEqual(parsed.value.handles, [handle]);
  }
});

test('evidence response refused root-mismatch parses', () => {
  assert.equal(
    storytellerTaskCustodyEvidenceResponseSchema.safeParse({
      status: 'refused',
      reason: 'root-mismatch',
    }).success,
    true,
  );
});