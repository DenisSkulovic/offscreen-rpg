import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  forbidBroadDatabaseOnExecutor,
  readExecutionWorkerConfig,
} from '../src/bootstrap/config';
import { storytellerExecuteTaskQueue } from '@offscreen/workflows/contracts';

test('executor bootstrap rejects broad database credentials', () => {
  assert.throws(
    () =>
      forbidBroadDatabaseOnExecutor({
        DATABASE_URL: 'postgres://writer@127.0.0.1/app',
      }),
    /refused broad database env: DATABASE_URL/,
  );
});

test('execution worker config requires executor custody credentials only', () => {
  const config = readExecutionWorkerConfig({
    TEMPORAL_ADDRESS: '127.0.0.1:7233',
    GAME_AUTHORITY_ORIGIN: 'http://127.0.0.1:9911',
    GAME_AUTHORITY_EXECUTOR_TOKEN: '0123456789abcdef',
  });
  assert.equal(config.custody.origin, 'http://127.0.0.1:9911');
  assert.equal(storytellerExecuteTaskQueue, 'storyteller-execute-v1');
});