import test from 'node:test';
import assert from 'node:assert/strict';
import { previewBaselineEnsure } from '../bootstrap/preview.mjs';

const plan = { readOnly: true, refusals: [] };
const cold = { operator: 'absent', namespace: 'absent', cluster: 'absent' };
const pin = { sha256: 'a'.repeat(64) };
const preview = (state, options = { authorize: true }) =>
  previewBaselineEnsure(plan, { pin, fullAssessment: state }, options);

test('cold intent is create-only and never claims a mutation', () => {
  const result = preview(cold);
  assert.equal(result.ok, true);
  assert.equal(result.readOnly, true);
  assert.equal(result.mutated, false);
  assert.deepEqual(result.actions.map(a => a.op),
    ['apply-operator', 'create-namespace', 'create-cluster', 'wait-cluster-ready']);
});

test('unreadable, partial, missing and conflicting states refuse', () => {
  for (const state of [undefined, {}, { ...cold, operator: 'partial' },
    { ...cold, cluster: 'unreadable' }, { ...cold, cluster: 'ready' }]) {
    const result = preview(state);
    assert.equal(result.ok, false);
    assert.deepEqual(result.actions, []);
  }
});

test('authorization and digest are exact', () => {
  for (const options of [{ authorize: 'true' }, { authorize: true, operatorManifestSha256: '' }]) {
    const result = preview(cold, options);
    assert.equal(result.ok, false);
    assert.deepEqual(result.actions, []);
  }
});
