import assert from 'node:assert/strict';
import test from 'node:test';
import { objectStoreReadinessFromNativeState } from '../src/application/dev-shared-core-readiness.mjs';

test('objectStoreReadinessFromNativeState admits only native-noop', () => {
  const cases = [
    ['native-noop', true],
    ['refused', false],
    ['absent', false],
    ['unknown', false],
  ];
  for (const [state, ok] of cases) {
    const result = objectStoreReadinessFromNativeState({
      state,
      reason: `${state} detail`,
    });
    assert.equal(result.ok, ok);
    assert.equal(result.detail, `${state} detail`);
  }
});
