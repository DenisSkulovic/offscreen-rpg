import assert from 'node:assert/strict';
import test from 'node:test';
import { describeTemporalNamespace, createTemporalNamespace, parseTemporalDescribe } from '../namespaces.mjs';

const body = JSON.stringify({
  namespaceInfo: { id: 'namespace-id', name: 'offscreen-dev-1' },
  config: { workflowExecutionRetentionTtl: '86400s' },
});

test('describe verifies the expected namespace identity and retention', () => {
  const calls = [];
  const result = describeTemporalNamespace('dev', 'offscreen-dev-1', {
    run(command, args) {
      calls.push({ command, args });
      return { ok: true, status: 0, stdout: body };
    },
  });
  assert.deepEqual(result, { status: 'ready', id: 'namespace-id', retentionSeconds: 86400 });
  assert.equal(calls.length, 1);
  assert.ok(calls[0].args.includes('deploy/temporal-admintools'));
  assert.ok(calls[0].args.includes('kind-offscreen-dev'));
  assert.equal(parseTemporalDescribe(body, 0, 'offscreen-dev-2').status, 'malformed-output');
});

test('transport failure and generic not-found errors are not namespace absence', () => {
  for (const failure of [
    { ok: false, status: 1, stderr: 'pods "temporal-admintools" not found' },
    { ok: false, status: null, timedOut: true, stderr: 'NamespaceNotFound' },
  ]) {
    assert.equal(describeTemporalNamespace('dev', 'offscreen-dev-1', { run: () => failure }).status, 'command-failed');
  }
  assert.equal(parseTemporalDescribe('Namespace offscreen-dev-1 is not found', 1, 'offscreen-dev-1').status, 'absent');
  assert.equal(parseTemporalDescribe('Namespace offscreen-dev-2 is not found', 1, 'offscreen-dev-1').status, 'command-failed');
});

test('namespace registration refuses invalid inputs before invoking commands', () => {
  const run = () => assert.fail('invalid namespace input must not run commands');
  assert.throws(() => createTemporalNamespace('dev', '--namespace', 1, { run }), /invalid/);
  assert.throws(() => createTemporalNamespace('release', 'default', 0, { run }), /invalid/);
});

test('registration tolerates only explicit same-name already-exists race', () => {
  const run = (command, args) => {
    assert.equal(command, 'kubectl');
    assert.ok(args.includes('kind-offscreen-release'));
    assert.ok(args.includes('3d'));
    return { ok: false, status: 1, stderr: 'Namespace default already exists' };
  };
  assert.doesNotThrow(() => createTemporalNamespace('release', 'default', 3, { run }));
  assert.throws(() => createTemporalNamespace('release', 'default', 3, {
    run: () => ({ ok: false, status: 1, stderr: 'pods already exists' }),
  }), /create failed/);
});
