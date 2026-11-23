import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adminErrorV1Schema } from '../src/admin.js';

const fixture = {
  version: 1 as const,
  code: 'not_authorized' as const,
  requestId: 'proof',
};

test('adminErrorV1Schema accepts canonical admin error', () => {
  assert.deepEqual(adminErrorV1Schema.parse(fixture), fixture);
});

test('adminErrorV1Schema rejects unknown keys (strict object)', () => {
  assert.throws(() =>
    adminErrorV1Schema.parse({ ...fixture, extra: true }),
  );
});