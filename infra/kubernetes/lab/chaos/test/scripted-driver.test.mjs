import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  LIVE_SCRIPTED_DRIVER,
  OFFLINE_SCRIPTED_EXECUTION,
  assertScriptedExecution,
  createBoundedFixtureAdapter,
  createForbiddenProviderSpy,
  freezeScriptedOperation,
  pickScriptedOption,
  readChaosStorytellerExecution,
  runScriptedDriverRound,
} from '../scripted-driver.mjs';
import { unitScriptedOpeningResult } from './fixture-adapter.mjs';

const STORY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ROOT_HASH = 'root-driver-ccc';
const CHECKPOINT_HASH = 'checkpoint-driver-ddd';

describe('scripted-driver', () => {
  test('readChaosStorytellerExecution stays offline when live flag absent', () => {
    const execution = readChaosStorytellerExecution({});
    assert.equal(execution.refused, false);
    assert.deepEqual(execution, {
      ...OFFLINE_SCRIPTED_EXECUTION,
      refused: false,
    });
  });

  test('refuses live execution policy', () => {
    const execution = readChaosStorytellerExecution({
      STORYTELLER_LIVE_ENABLED: 'true',
      STORYTELLER_EXECUTION_JSON: JSON.stringify({
        mode: 'provider',
        accountId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        runId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        dispatchReview: { mode: 'off' },
        policy: {},
      }),
    });
    assert.equal(execution.refused, true);
    assert.equal(execution.reason, 'live_execution_forbidden_in_chaos');
  });

  test('forbidden provider spy throws before network semantics', async () => {
    const spy = createForbiddenProviderSpy();
    await assert.rejects(() => spy.provider({ task: 'opening' }), /forbidden_provider/);
    assert.equal(spy.snapshot().modelDispatchAttempts, 1);
    assert.equal(spy.snapshot().forbiddenProviderInvoked, true);
  });

  test('runScriptedDriverRound commits one passage with oracle pass', async () => {
    const spy = createForbiddenProviderSpy();
    assertScriptedExecution(OFFLINE_SCRIPTED_EXECUTION);
    const visibleOptionIds = ['wait', 'take-cover', 'scout'];
    const seed = 'chaos-round-opening';
    const optionId = pickScriptedOption(seed, visibleOptionIds);

    const operationId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    const frozen = freezeScriptedOperation({
      operationId,
      optionId,
      storyId: STORY_ID,
      passageId: 'passage-opening-1',
      expectedRevision: 2,
    });

    const fixtureAdapter = createBoundedFixtureAdapter({
      generateResult: unitScriptedOpeningResult,
      delayMs: 0,
    });

    const store = {
      roots: { [ROOT_HASH]: { revision: 2, campaignId: STORY_ID } },
      checkpoints: {
        [CHECKPOINT_HASH]: {
          format: 'offscreen.scene-checkpoint.v1',
          storyId: STORY_ID,
        },
      },
    };

    const initialState = {
      story: { revision: 1, rootHash: ROOT_HASH, rootRevision: 2 },
      passages: [],
      operations: [],
    };

    const round = await runScriptedDriverRound({
      seed,
      frozen,
      visibleOptionIds,
      forbiddenSpy: spy,
      fixtureAdapter,
      ownerId: OWNER_ID,
      store,
      initialState,
      applyCommittedPassage: ({ frozen: fr, optionId: picked }) => ({
        story: { revision: fr.expectedRevision, rootHash: ROOT_HASH, rootRevision: 2 },
        passages: [
          {
            id: 'passage-opening-1',
            operationId: fr.operationId,
            storyId: fr.storyId,
            checkpointHash: CHECKPOINT_HASH,
            canonRootHash: ROOT_HASH,
            canonRootRevision: 2,
          },
        ],
        operations: [
          {
            id: fr.operationId,
            storyId: fr.storyId,
            revision: 1,
            status: 'committed',
          },
        ],
      }),
    });

    assert.equal(round.status, 'pass');
    assert.equal(round.optionId, optionId);
    assert.equal(round.oracle.status, 'pass');
    assert.equal(round.telemetry.modelDispatchAttempts, 0);
    assert.equal(round.live.status, LIVE_SCRIPTED_DRIVER.status);
    assert.match(round.live.reason, /no-test-identity/);
  });

  test('provider spy invocation fails oracle on replayed probe', async () => {
    const spy = createForbiddenProviderSpy();
    await assert.rejects(() => spy.provider({}), /forbidden_provider/);
    const { readOnlyOracle } = await import('../oracle.mjs');
    const result = readOnlyOracle({
      assertions: {
        storyId: STORY_ID,
        ownerId: OWNER_ID,
        executionMode: 'scripted',
      },
      sql: {
        story: { revision: 1, rootHash: ROOT_HASH, rootRevision: 2 },
        passages: [],
        operations: [],
      },
      store: {
        roots: { [ROOT_HASH]: { revision: 2 } },
        checkpoints: {},
      },
      telemetry: spy.snapshot(),
    });
    assert.equal(result.status, 'fail');
  });
});