import assert from 'node:assert/strict';
import test from 'node:test';
import process from 'node:process';
import { executeChecks, runCommand, commandOutcome, diagnosticExcerpt } from './diagnostic-engine.mjs';
import { ADDITIONAL_PLATFORM_TESTS, buildDiagnosticChecks } from './diagnostic.mjs';
import {
  REPO_ROOT,
  SOURCE_SUITE_DEFINITIONS,
  resolveSuiteFiles,
} from './verify.mjs';

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


test('monitoring diagnostic checks discover python fixtures and tag MON-07', () => {
  const checks = buildDiagnosticChecks({
    repoRoot: '/fixture',
    definitions: [],
    resolveFiles: () => [],
    parseCounts: () => ({ complete: false }),
  });
  const python = checks.find((check) => check.id === 'source:monitoring-python');
  assert.ok(python);
  assert.deepEqual(python.command.slice(0, 4), [
    'python3',
    '-m',
    'unittest',
    'discover',
  ]);
  assert.match(python.command.join(' '), /infra\/monitoring\/tests/);
  assert.match(python.command.join(' '), /test_\*\.py/);
  const operation = checks.filter(
    (check) => check.id === 'source:infra/monitoring/tests/operation-event.test.mjs',
  );
  assert.equal(operation.length, 1);
  assert.equal(operation[0].capability, 'MON-07');
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

test('source suite definitions do not duplicate additional platform Redis render test', () => {
  const checks = buildDiagnosticChecks({
    repoRoot: REPO_ROOT,
    definitions: SOURCE_SUITE_DEFINITIONS,
    resolveFiles: resolveSuiteFiles,
    parseCounts: () => ({ complete: false }),
  });
  const renderFile = 'infra/platform/redis/tests/render.test.mjs';
  const renderChecks = checks.filter((check) => check.id === `source:${renderFile}`);
  assert.equal(renderChecks.length, 1);
  for (const { file } of ADDITIONAL_PLATFORM_TESTS) {
    if (file === renderFile) {
      continue;
    }
    const overlapping = SOURCE_SUITE_DEFINITIONS.flatMap((definition) =>
      resolveSuiteFiles(REPO_ROOT, definition),
    ).includes(file);
    if (overlapping) {
      const matching = checks.filter((check) => check.id === `source:${file}`);
      assert.equal(matching.length, 1, `duplicate diagnostic schedule: ${file}`);
    }
  }
});
