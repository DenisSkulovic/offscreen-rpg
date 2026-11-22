import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  forbidBroadDatabaseOnExecutor,
  OFFSCREEN_WRITER_EXECUTION_MODE_ENV,
  readExecutionWorkerConfig,
  WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB,
} from '../src/bootstrap/config';
import { prepareWriterRoundTransport } from '@offscreen/storyteller/providers/writer-round-transport';
import { storytellerExecuteTaskQueue } from '@offscreen/workflows/contracts';
import { prepareScriptedOfflineLabWriterRoundTransport } from '../src/custody/scripted-offline-lab-writer-round-transport';

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
  assert.equal(config.writerRound.privateCustody.origin, 'http://127.0.0.1:9911');
  assert.equal(config.writerRound.mode, 'provider-default');
  assert.equal(config.writerRound.prepareTransport, prepareWriterRoundTransport);
  assert.equal(storytellerExecuteTaskQueue, 'storyteller-execute-v1');
});

test('scripted lab execution worker config avoids fake transport when mode missing', () => {
  const config = readExecutionWorkerConfig({
    TEMPORAL_ADDRESS: '127.0.0.1:7233',
    GAME_AUTHORITY_ORIGIN: 'http://127.0.0.1:9911',
    GAME_AUTHORITY_EXECUTOR_TOKEN: '0123456789abcdef',
  });
  assert.notEqual(
    config.writerRound.prepareTransport,
    prepareScriptedOfflineLabWriterRoundTransport,
  );
});

test('scripted lab execution worker config selects fake transport only when exact', () => {
  const config = readExecutionWorkerConfig({
    TEMPORAL_ADDRESS: '127.0.0.1:7233',
    GAME_AUTHORITY_ORIGIN: 'http://127.0.0.1:9911',
    GAME_AUTHORITY_EXECUTOR_TOKEN: '0123456789abcdef',
    [OFFSCREEN_WRITER_EXECUTION_MODE_ENV]: WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB,
  });
  assert.equal(
    config.writerRound.prepareTransport,
    prepareScriptedOfflineLabWriterRoundTransport,
  );
});