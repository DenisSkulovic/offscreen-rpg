import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  collectLiveGameEvidence,
  stripSensitiveFields,
} from '../live-game-driver.mjs';
import { assessLiveGameOracle } from '../live-oracle.mjs';

const STORY_ID = '44444444-4444-4444-8444-444444444444';
const OWNER_ID = '55555555-5555-4555-8555-555555555555';
const ROOT_HASH = 'live-root-eee';
const CHECKPOINT_HASH = 'live-checkpoint-fff';
const OPERATION_ID = '66666666-6666-4666-8666-666666666666';
const PASSAGE_ID = 'passage-live-1';

function baseAssertions() {
  return {
    storyId: STORY_ID,
    ownerId: OWNER_ID,
    frozenOperationIds: [OPERATION_ID],
    expectedRevision: 2,
    expectedRootHash: ROOT_HASH,
    expectedRootRevision: 2,
    expectedCheckpointHashes: [CHECKPOINT_HASH],
    executionMode: 'scripted',
    parentFuturePassageIds: ['parent-future-live'],
    childPassageIds: [PASSAGE_ID],
  };
}

function healthyAdapters(overrides = {}) {
  return {
    httpGet: async () => ({
      status: 200,
      body: {
        revision: 2,
        storyId: STORY_ID,
        ownerId: OWNER_ID,
        passageIds: [PASSAGE_ID],
        authorization: 'must-not-appear',
        cookie: 'must-not-appear',
        promptText: 'must-not-appear',
      },
    }),
    sqlQuery: async (name) => {
      if (name === 'story') {
        return [{ revision: 2, rootHash: ROOT_HASH, rootRevision: 2 }];
      }
      if (name === 'passages') {
        return [
          {
            id: PASSAGE_ID,
            operationId: OPERATION_ID,
            storyId: STORY_ID,
            checkpointHash: CHECKPOINT_HASH,
            canonRootHash: ROOT_HASH,
            canonRootRevision: 2,
          },
        ];
      }
      if (name === 'operations') {
        return [
          {
            id: OPERATION_ID,
            storyId: STORY_ID,
            revision: 1,
            status: 'committed',
          },
        ];
      }
      return [];
    },
    readPrivateObject: async (key) => ({
      present: true,
      digest: `digest-${key}`,
    }),
    ...overrides,
  };
}

describe('live-game-driver', () => {
  test('strips sensitive authorization/cookie/prompt fields from HTTP body', () => {
    const cleaned = stripSensitiveFields({
      revision: 2,
      bearerToken: 'secret',
      nested: { cookie: 'secret', ok: true },
    });
    assert.deepEqual(cleaned, { revision: 2, nested: { ok: true } });
  });

  test('collectLiveGameEvidence returns BLOCKED when adapters missing', async () => {
    const result = await collectLiveGameEvidence({
      adapters: { httpGet: async () => ({ status: 200, body: {} }) },
      paths: { storyOperation: '/ga/stories/x' },
      ids: { storyId: STORY_ID, ownerId: OWNER_ID, operationId: OPERATION_ID },
    });
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.reason, 'live-adapters-missing');
    assert.equal(result.evidence, null);
  });
});

describe('assessLiveGameOracle', () => {
  test('passes one committed effect, one passage, zero provider dispatch', async () => {
    const collected = await collectLiveGameEvidence({
      adapters: healthyAdapters(),
      paths: { storyOperation: '/ga/stories/' + STORY_ID },
      ids: {
        storyId: STORY_ID,
        ownerId: OWNER_ID,
        operationId: OPERATION_ID,
        passageId: PASSAGE_ID,
        rootObjectKey: ROOT_HASH,
        checkpointObjectKey: CHECKPOINT_HASH,
      },
      assertions: baseAssertions(),
    });

    assert.equal(collected.status, 'OK');
    const assessed = assessLiveGameOracle(collected);
    assert.equal(assessed.pass, true);
    assert.deepEqual(assessed.violations, []);
    const serialized = JSON.stringify(collected.evidence);
    assert.doesNotMatch(serialized, /must-not-appear/);
    assert.doesNotMatch(serialized, /authorization|bearer|cookie|promptText/i);
  });

  test('fails duplicate committed effect for the same operation id', async () => {
    const collected = await collectLiveGameEvidence({
      adapters: healthyAdapters({
        sqlQuery: async (name) => {
          if (name === 'story') {
            return [{ revision: 2, rootHash: ROOT_HASH, rootRevision: 2 }];
          }
          if (name === 'passages') {
            return [
              {
                id: PASSAGE_ID,
                operationId: OPERATION_ID,
                storyId: STORY_ID,
                checkpointHash: CHECKPOINT_HASH,
                canonRootHash: ROOT_HASH,
                canonRootRevision: 2,
              },
              {
                id: 'passage-live-dup',
                operationId: OPERATION_ID,
                storyId: STORY_ID,
                checkpointHash: CHECKPOINT_HASH,
                canonRootHash: ROOT_HASH,
                canonRootRevision: 2,
              },
            ];
          }
          if (name === 'operations') {
            return [
              {
                id: OPERATION_ID,
                storyId: STORY_ID,
                revision: 1,
                status: 'committed',
              },
              {
                id: OPERATION_ID,
                storyId: STORY_ID,
                revision: 2,
                status: 'committed',
              },
            ];
          }
          return [];
        },
      }),
      paths: { storyOperation: '/ga/stories/' + STORY_ID },
      ids: {
        storyId: STORY_ID,
        ownerId: OWNER_ID,
        operationId: OPERATION_ID,
        passageId: PASSAGE_ID,
        rootObjectKey: ROOT_HASH,
        checkpointObjectKey: CHECKPOINT_HASH,
      },
      assertions: baseAssertions(),
    });

    const assessed = assessLiveGameOracle(collected);
    assert.equal(assessed.pass, false);
    assert.ok(
      assessed.violations.some((v) =>
        [
          'duplicate_passage_for_operation',
          'duplicate_committed_operation',
          'duplicate_applied_effect_for_operation',
          'frozen_operation_duplicate_effect',
        ].includes(v),
      ),
    );
  });

  test('missing adapters are BLOCKED and oracle does not pass', async () => {
    const blocked = await collectLiveGameEvidence({
      adapters: {},
      paths: { storyOperation: '/ga/stories/' + STORY_ID },
      ids: { storyId: STORY_ID, ownerId: OWNER_ID, operationId: OPERATION_ID },
    });
    assert.equal(blocked.status, 'BLOCKED');
    const assessed = assessLiveGameOracle(blocked);
    assert.equal(assessed.pass, false);
    assert.ok(assessed.violations.includes('live-adapters-missing'));
  });
});
