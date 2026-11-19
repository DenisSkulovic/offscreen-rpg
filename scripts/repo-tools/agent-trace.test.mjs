import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { summarizeAgentTrace } from './agent-trace.mjs';

const withUsage = [
  '{"type":"assistant","timestampMs":0}',
  '{"type":"tool_call","name":"read","path":"packages/application/src/storyteller/budget.ts","bytes":120}',
  '{"type":"tool_call","name":"read","path":"scripts/repo-tools/wiki-change-guard.mjs","bytes":40}',
  '{"type":"tool_call","name":"read","path":"packages/application/src/storyteller/budget.ts","bytes":120}',
  '{"type":"tool_call","name":"search"}',
  '{"type":"tool_call","name":"edit","timestampMs":30}',
  '{"type":"result","usage":{"input_tokens":11,"cache_read_tokens":7,"output_tokens":3}}',
].join('\n');

test('a trace counts a repeated source read and keeps reported usage', () => {
  const result = summarizeAgentTrace(withUsage);
  assert.equal(result.ok, true);
  assert.equal(result.summary.modelTurns, 1);
  assert.equal(result.summary.toolCalls.read, 3);
  assert.equal(result.summary.toolCalls.search, 1);
  assert.equal(result.summary.files.distinct, 2);
  assert.equal(result.summary.files.repeatedReads, 1);
  assert.equal(result.summary.files.bytesDelivered, 280);
  assert.equal(result.summary.diagnosticsReads, 1);
  assert.equal(result.summary.sourceOwnerReads, 2);
  assert.equal(result.summary.navigationBeforeFirstEdit, 4);
  assert.equal(result.summary.firstEditLatencyMs, 30);
  assert.deepEqual(result.summary.tokens, {
    input: 11,
    cachedInput: 7,
    output: 3,
  });
});

test('a result with no usage leaves token fields null', () => {
  const result = summarizeAgentTrace(
    '{"type":"tool_call","name":"read","path":"packages/application/src/storyteller/budget.ts"}\n{"type":"result"}\n',
  );
  assert.equal(result.ok, true);
  assert.deepEqual(result.summary.tokens, {
    input: null,
    cachedInput: null,
    output: null,
  });
  assert.equal(result.summary.files.bytesDelivered, null);
  assert.equal(JSON.stringify(result.summary).includes('"input":0'), false);
});

test('an unknown event fails closed and does not report zero tokens', () => {
  const result = summarizeAgentTrace('{"type":"mystery"}\n');
  assert.equal(result.ok, false);
  assert.equal(result.error, 'unclassified');
  assert.equal(Object.hasOwn(result, 'summary'), false);
  const child = spawnSync(process.execPath, ['scripts/repo-tools/agent-trace.mjs'], {
    input: '{"type":"mystery"}\n',
    encoding: 'utf8',
    cwd: new URL('../..', import.meta.url),
  });
  assert.equal(child.status, 2);
  assert.match(child.stderr, /unclassified/);
  assert.equal(child.stdout.includes('"input":0'), false);
});
