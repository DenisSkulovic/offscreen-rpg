import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureBaseline } from '../bootstrap/ensure.mjs';

test('unauthorized ensure refuses before every command and closes custody', () => {
  let closed = 0;
  const result = ensureBaseline('dev', { custody: {
    run() { assert.fail('unauthorized command'); },
    acquire() { assert.fail('unauthorized lock'); },
    close() { closed++; },
  } });
  assert.equal(result.ok, false);
  assert.equal(result.outcome, 'refused');
  assert.equal(result.mutated, false);
  assert.deepEqual(result.confirmedMutations, []);
  assert.equal(closed, 1);
});

test('missing or invalid artifact fails before any external command', () => {
  let closed = 0;
  const result = ensureBaseline('release', {
    authorized: true, operatorManifestPath: '/dev/null',
    custody: { run() { assert.fail('unverified artifact command'); }, close() { closed++; } },
  });
  assert.equal(result.ok, false);
  assert.equal(result.stage, 'preflight');
  assert.equal(result.mutated, false);
  assert.equal(closed, 1);
});
