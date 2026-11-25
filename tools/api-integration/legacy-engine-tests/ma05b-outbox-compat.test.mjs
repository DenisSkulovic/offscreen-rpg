import assert from 'node:assert/strict';
import test from 'node:test';
import { enqueue } from '@offscreen/outbox/enqueue';
import { createOutbox } from '@offscreen/outbox/relay';

test('MA05B: @offscreen/outbox/enqueue enqueue is a callable function', () => {
  assert.equal(typeof enqueue, 'function');
  assert.equal(enqueue.name, 'enqueue');
});

test('MA05B: @offscreen/outbox/relay createOutbox is a callable function', () => {
  assert.equal(typeof createOutbox, 'function');
  assert.equal(createOutbox.name, 'createOutbox');
});

test('MA05B negative: enqueue is not createOutbox', () => {
  assert.notEqual(enqueue, createOutbox);
});