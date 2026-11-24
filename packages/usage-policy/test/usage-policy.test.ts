import assert from 'node:assert/strict';
import { test } from 'node:test';
import { usageLimitOverrideSchema } from '../src/usage-policy.js';

const fixture = { maxMicrousdPerOperation: '0' } as const;

test('usageLimitOverrideSchema accepts string zero microusd ceiling', () => {
  assert.doesNotThrow(() => usageLimitOverrideSchema.parse(fixture));
});

test('usageLimitOverrideSchema rejects unknown keys', () => {
  assert.throws(() =>
    usageLimitOverrideSchema.parse({ ...fixture, extra: true }),
  );
});

test('usageLimitOverrideSchema rejects negative microusd string', () => {
  assert.throws(() =>
    usageLimitOverrideSchema.parse({ maxMicrousdPerOperation: '-1' }),
  );
});

test('usageLimitOverrideSchema rejects numeric zero microusd', () => {
  assert.throws(() =>
    usageLimitOverrideSchema.parse({ maxMicrousdPerOperation: 0 }),
  );
});