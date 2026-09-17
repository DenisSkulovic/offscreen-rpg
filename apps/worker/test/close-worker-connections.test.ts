import assert from 'node:assert/strict';
import { test } from 'node:test';
import { closeWorkerConnections } from '../src/close-worker-connections';

test('native close failure still closes the client connection', async () => {
  const closed: string[] = [];
  await assert.rejects(
    closeWorkerConnections({
      native: {
        async close() {
          closed.push('native');
          throw new Error('native close failed');
        },
      },
      connection: {
        async close() {
          closed.push('connection');
        },
      },
    }),
    { message: 'native close failed' },
  );
  assert.deepEqual(closed, ['native', 'connection']);
});

test('both connection close failures are reported together', async () => {
  await assert.rejects(
    closeWorkerConnections({
      native: {
        async close() {
          throw new Error('native close failed');
        },
      },
      connection: {
        async close() {
          throw new Error('connection close failed');
        },
      },
    }),
    (error: unknown) => {
      assert.ok(error instanceof AggregateError);
      assert.equal(error.message, 'Worker connection cleanup failed');
      assert.deepEqual(
        error.errors.map((item) =>
          item instanceof Error ? item.message : String(item),
        ),
        ['native close failed', 'connection close failed'],
      );
      return true;
    },
  );
});

test('missing native connection still closes the client connection', async () => {
  let closed = false;
  await closeWorkerConnections({
    native: undefined,
    connection: {
      async close() {
        closed = true;
      },
    },
  });
  assert.equal(closed, true);
});
