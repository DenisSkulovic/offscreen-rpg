import assert from 'node:assert/strict';
import test from 'node:test';
import { enqueue as enqueueApplication } from '../dist/outbox/index.js';
import { enqueue as enqueueDb } from '@offscreen/db/outbox';

test('MA05B: application outbox enqueue is the same function as @offscreen/db/outbox', () => {
  assert.equal(enqueueApplication, enqueueDb);
});
