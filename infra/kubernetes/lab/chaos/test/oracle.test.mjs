import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { ORACLE_SCHEMA, assertOraclePass, readOnlyOracle } from '../oracle.mjs';

const STORY_ID = '11111111-1111-4111-8111-111111111111';
const OWNER_ID = '22222222-2222-4222-8222-222222222222';
const ROOT_HASH = 'root-hash-aaa';
const CHECKPOINT_HASH = 'checkpoint-hash-bbb';
const OPERATION_ID = '33333333-3333-4333-8333-333333333333';

function healthySnapshots() {
  return {
    assertions: {
      storyId: STORY_ID,
      ownerId: OWNER_ID,
      frozenOperationIds: [OPERATION_ID],
      expectedRevision: 2,
      expectedRootHash: ROOT_HASH,
      expectedRootRevision: 2,
      expectedCheckpointHashes: [CHECKPOINT_HASH],
      executionMode: 'scripted',
      parentFuturePassageIds: ['parent-future-passage'],
      childPassageIds: ['passage-1'],
    },
    sql: {
      story: { revision: 2, rootHash: ROOT_HASH, rootRevision: 2 },
      passages: [
        {
          id: 'passage-1',
          operationId: OPERATION_ID,
          storyId: STORY_ID,
          checkpointHash: CHECKPOINT_HASH,
          canonRootHash: ROOT_HASH,
          canonRootRevision: 2,
        },
      ],
      operations: [
        {
          id: OPERATION_ID,
          storyId: STORY_ID,
          revision: 1,
          status: 'committed',
        },
      ],
    },
    store: {
      roots: { [ROOT_HASH]: { revision: 2, campaignId: STORY_ID } },
      checkpoints: {
        [CHECKPOINT_HASH]: {
          format: 'offscreen.scene-checkpoint.v1',
          storyId: STORY_ID,
        },
      },
    },
    http: {
      revision: 2,
      storyId: STORY_ID,
      ownerId: OWNER_ID,
      passageIds: ['passage-1'],
    },
    telemetry: {
      modelDispatchAttempts: 0,
      forbiddenProviderInvoked: false,
      billableUsageRecords: 0,
    },
  };
}

describe('readOnlyOracle', () => {
  test('passes aligned SQL, store, HTTP, and zero provider telemetry', () => {
    const input = healthySnapshots();
    const result = readOnlyOracle(input);
    assert.equal(result.schema, ORACLE_SCHEMA);
    assert.equal(result.status, 'pass');
    assert.deepEqual(result.violations, []);
    assertOraclePass(result);
  });

  test('fails on duplicate passage for the same operation', () => {
    const input = healthySnapshots();
    input.sql.passages.push({
      id: 'passage-dup',
      operationId: OPERATION_ID,
      storyId: STORY_ID,
      checkpointHash: CHECKPOINT_HASH,
      canonRootHash: ROOT_HASH,
      canonRootRevision: 2,
    });
    const result = readOnlyOracle(input);
    assert.equal(result.status, 'fail');
    assert.ok(result.violations.includes('duplicate_passage_for_operation'));
  });

  test('fails when canon root object is missing', () => {
    const input = healthySnapshots();
    input.store.roots = {};
    const result = readOnlyOracle(input);
    assert.equal(result.status, 'fail');
    assert.ok(result.violations.includes('missing_canon_root_object'));
  });

  test('fails when forbidden provider spy was invoked', () => {
    const input = healthySnapshots();
    input.telemetry.forbiddenProviderInvoked = true;
    input.telemetry.modelDispatchAttempts = 1;
    const result = readOnlyOracle(input);
    assert.equal(result.status, 'fail');
    assert.ok(result.violations.includes('forbidden_provider_invoked'));
    assert.ok(result.violations.includes('model_dispatch_attempts_nonzero'));
  });

  test('fails on branch leak of parent-future passage ids', () => {
    const input = healthySnapshots();
    input.assertions.childPassageIds = ['parent-future-passage'];
    const result = readOnlyOracle(input);
    assert.equal(result.status, 'fail');
    assert.ok(result.violations.includes('branch_leak_parent_future'));
  });
});