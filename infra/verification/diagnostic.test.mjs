import assert from 'node:assert/strict';
import test from 'node:test';
import process from 'node:process';
import { executeChecks, runCommand, commandOutcome, diagnosticExcerpt } from './diagnostic-engine.mjs';
import { ADDITIONAL_PLATFORM_TESTS, buildDiagnosticChecks } from './diagnostic.mjs';

test('failure, exception and dependency refusal do not stop independent checks', async () => {
  const calls = [];
  const rows = await executeChecks([
    { id: 'a', tier: 'SOURCE', run: () => { throw new Error('boom'); } },
    { id: 'b', tier: 'SOURCE', requires: ['a'], run: () => { throw new Error('must not run'); } },
    { id: 'c', tier: 'SOURCE', run: () => ({ status: 'PASS' }) },
    { id: 'd', tier: 'SOURCE', run: () => undefined },
  ], { onResult: row => calls.push(row.id) });
  assert.deepEqual(rows.map(row => row.status), ['FAIL', 'BLOCKED', 'PASS', 'FAIL']);
  assert.deepEqual(calls, ['a', 'b', 'c', 'd']);
});
test('missing and nonzero commands cannot pass', async () => {
  assert.equal(commandOutcome(await runCommand('offscreen-nonexistent-executable-fixture', [])).status, 'BLOCKED');
  const failed = await runCommand(process.execPath, ['-e', 'console.error("fixture failure");process.exit(3)']);
  assert.equal(commandOutcome(failed).status, 'FAIL');
  assert.match(commandOutcome(failed).detail, /fixture failure/);
});
test('real child timeout is failure', async () => {
  const result = await runCommand(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { timeoutMs: 100 });
  assert.equal(result.reason, 'timeout');
  assert.equal(commandOutcome(result).status, 'FAIL');
});
test('private diagnostic excerpt excludes common credential-bearing lines', () => {
  assert.equal(diagnosticExcerpt('failure\npassword=abc\nnext'), 'failure\nnext');
});
test('live cluster failure blocks only its own service observations', async () => {
  const called = [];
  const checks = buildDiagnosticChecks({ repoRoot: '/fixture', definitions: [], resolveFiles: () => [], parseCounts: () => ({ complete: false }),
    run: async (_command, args) => {
      called.push(args.join(' '));
      const status = args.includes('dev') ? 'FAIL' : 'PASS';
      return { code: 0, stdout: JSON.stringify({ status }), stderr: '' };
    }
  }).filter(check => check.id.startsWith('live:'));
  const rows = await executeChecks(checks);
  assert.equal(rows.find(row => row.id === 'live:dev:postgres').status, 'BLOCKED');
  assert.equal(rows.find(row => row.id === 'live:release:postgres').status, 'PASS');
  assert.ok(!called.some(line => line.includes('dev postgres')));
});


test('additional platform tests are explicitly scheduled with Helm prerequisites', () => {
  const checks = buildDiagnosticChecks({ repoRoot: '/fixture', definitions: [], resolveFiles: () => [], parseCounts: () => ({ complete: false }) });
  for (const { file, requiresHelm } of ADDITIONAL_PLATFORM_TESTS) {
    const matching = checks.filter(check => check.id === 'source:' + file);
    assert.equal(matching.length, 1);
    assert.deepEqual(matching[0].requires, requiresHelm ? ['host.helm'] : []);
    assert.ok(matching[0].command.includes('--test-reporter=tap'));
  }
});
