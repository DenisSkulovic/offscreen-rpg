import assert from 'node:assert/strict';
import test from 'node:test';
import {
  readStorytellerWorkerOptions,
  wrapApprovedWorkerProvider,
} from '../dist/storyteller/config.js';
import { offlineExecution } from '@offscreen/storyteller/tasks';

const approvedExecution = {
  mode: 'provider',
  accountId: '00000000-0000-4000-8000-000000000001',
  runId: '00000000-0000-4000-8000-000000000002',
  dispatchReview: { mode: 'hold' },
  policy: {
    version: 'obs00-a.v1',
    route: 'audit:offline',
    model: 'audit/model-not-selected',
    provider: 'Audit',
    priceVersion: 'not-priced',
    inputMicrousdPerMillion: '0',
    outputMicrousdPerMillion: '0',
    maxInputTokens: 100000,
    maxOutputTokens: 2000,
    timeoutMs: 1000,
  },
};

test('OBS00-A: wrapper forwards task and dispatch override unchanged', async () => {
  const calls = [];
  const underlying = async (task, dispatch) => {
    calls.push({ task, dispatch });
    return { kind: 'ok', text: 'mock' };
  };
  const wrapped = wrapApprovedWorkerProvider(underlying, approvedExecution);
  const task = {
    execution: approvedExecution,
    request: { messages: [{ role: 'user', content: 'original' }] },
  };
  const dispatch = {
    request: { messages: [{ role: 'user', content: 'repair-round' }] },
    maxGeneratedTokens: 40,
    outputProtocol: 'json-object-local-validation',
  };
  await wrapped(task, dispatch);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].task, task);
  assert.equal(calls[0].dispatch, dispatch);
  assert.equal(calls[0].dispatch.request.messages[0].content, 'repair-round');
  assert.notEqual(
    JSON.stringify(calls[0].dispatch.request),
    JSON.stringify(task.request),
  );
});

test('OBS00-A: wrapper rejects mismatched worker execution policy before provider', async () => {
  let called = false;
  const wrapped = wrapApprovedWorkerProvider(async () => {
    called = true;
    return { kind: 'ok', text: 'nope' };
  }, approvedExecution);
  await assert.rejects(
    () =>
      wrapped({
        execution: offlineExecution,
        request: { messages: [] },
      }),
    /Execution policy differs/,
  );
  assert.equal(called, false);
});

test('OBS00-A: live worker options omit dispatchAuthority (B still blocked)', () => {
  const options = readStorytellerWorkerOptions({
    STORYTELLER_LIVE_ENABLED: 'true',
    STORYTELLER_EXECUTION_JSON: JSON.stringify(approvedExecution),
    OPENROUTER_API_KEY: 'test-key-not-for-network',
  });
  assert.equal(typeof options.provider, 'function');
  assert.equal('dispatchAuthority' in options, false);
});

test('OBS00-A: offline live flag yields empty options', () => {
  const options = readStorytellerWorkerOptions({
    STORYTELLER_LIVE_ENABLED: 'false',
  });
  assert.deepEqual(options, {});
});
