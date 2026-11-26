import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureBaseline, acknowledgeOperatorApply } from '../bootstrap/ensure.mjs';

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

test('operator apply must acknowledge every unique pinned identity', () => {
  const objects = ['a', 'b'].map(name => ({ apiVersion: 'v1', kind: 'Namespace',
    metadata: { name, uid: name + '-uid' } }));
  const inventory = objects.map(object => ({ id: 'v1/Namespace//' + object.metadata.name }));
  const receipt = items => ({ ok: true, stdout: JSON.stringify({ kind: 'List', items }) });
  assert.equal(acknowledgeOperatorApply(receipt(objects), inventory), true);
  assert.equal(acknowledgeOperatorApply(receipt(objects.slice(0, 1)), inventory), false);
  assert.equal(acknowledgeOperatorApply(receipt([objects[0], objects[0]]), inventory), false);
  assert.equal(acknowledgeOperatorApply(receipt([objects[0], { ...objects[1], metadata: { name: 'b' } }]), inventory), false);
  assert.equal(acknowledgeOperatorApply({ ok: false, stdout: receipt(objects).stdout }, inventory), false);
  assert.equal(acknowledgeOperatorApply({ ok: true, stdout: 'success' }, inventory), false);
});
