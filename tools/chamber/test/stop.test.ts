import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stopChamberResources } from '../src/stop.js';

test('browser close failure still stops runtime, web, app and database', async () => {
  const closed: string[] = [];
  await assert.rejects(
    stopChamberResources({
      browser: {
        async close() {
          closed.push('browser');
          throw new Error('browser close failed');
        },
      },
      runtime: {
        async stop() {
          closed.push('runtime');
        },
      },
      web: {
        exitCode: null,
        kill() {
          closed.push('web');
        },
      },
      webExit: Promise.resolve('exited'),
      app: {
        async close() {
          closed.push('app');
        },
      },
      database: {
        async close() {
          closed.push('database');
        },
      },
    }),
    { message: 'browser close failed' },
  );
  assert.deepEqual(closed, ['browser', 'runtime', 'web', 'app', 'database']);
});

test('multiple cleanup failures are reported together', async () => {
  await assert.rejects(
    stopChamberResources({
      browser: {
        async close() {
          throw new Error('browser close failed');
        },
      },
      runtime: {
        async stop() {
          throw new Error('runtime stop failed');
        },
      },
      web: undefined,
      webExit: undefined,
      app: {
        async close() {
          throw new Error('app close failed');
        },
      },
      database: {
        async close() {
          throw new Error('database close failed');
        },
      },
    }),
    (error: unknown) => {
      assert.ok(error instanceof AggregateError);
      assert.equal(error.message, 'Chamber resource cleanup failed');
      assert.deepEqual(
        error.errors.map((item) =>
          item instanceof Error ? item.message : String(item),
        ),
        [
          'browser close failed',
          'runtime stop failed',
          'app close failed',
          'database close failed',
        ],
      );
      return true;
    },
  );
});
