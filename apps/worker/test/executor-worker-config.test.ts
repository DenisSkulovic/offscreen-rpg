import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  OFFSCREEN_WRITER_PROVIDER_MODEL_ENV,
  OFFSCREEN_WRITER_PROVIDER_POLICY_VERSION_ENV,
} from '@offscreen/storyteller/providers/writer-provider-authorization-policy';
import {
  bindDevSlotTemporalNamespace,
  forbidBroadDatabaseOnExecutor,
  OFFSCREEN_WRITER_EXECUTION_MODE_ENV,
  readExecutionWorkerConfig,
  WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED,
  WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB,
} from '../src/bootstrap/config';
import { prepareWriterRoundTransport } from '@offscreen/storyteller/providers/writer-round-transport';
import { storytellerExecuteTaskQueue } from '@offscreen/workflows/contracts';
import { prepareScriptedOfflineLabWriterRoundTransport } from '../src/custody/scripted-offline-lab-writer-round-transport';

test('a dev slot cannot fall back to the default Temporal namespace', () => {
  assert.throws(
    () => bindDevSlotTemporalNamespace({ OFFSCREEN_DEV_SLOT: 'dev-1' }, 'default'),
    /offscreen-dev-1/,
  );
  assert.equal(
    bindDevSlotTemporalNamespace({ OFFSCREEN_DEV_SLOT: 'dev-1', TEMPORAL_NAMESPACE: 'offscreen-dev-1' }, 'offscreen-dev-1'),
    'offscreen-dev-1',
  );
  const config = readExecutionWorkerConfig({
    OFFSCREEN_DEV_SLOT: 'dev-2',
    TEMPORAL_NAMESPACE: 'offscreen-dev-2',
    TEMPORAL_ADDRESS: '127.0.0.1:7233',
    GAME_AUTHORITY_ORIGIN: 'http://127.0.0.1:9911',
    GAME_AUTHORITY_EXECUTOR_TOKEN: '0123456789abcdef',
  });
  assert.equal(config.namespace, 'offscreen-dev-2');
});

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

test('provider-authorized execution config requires OPENROUTER_API_KEY', () => {
  assert.throws(
    () =>
      readExecutionWorkerConfig({
        TEMPORAL_ADDRESS: '127.0.0.1:7233',
        GAME_AUTHORITY_ORIGIN: 'http://127.0.0.1:9911',
        GAME_AUTHORITY_EXECUTOR_TOKEN: '0123456789abcdef',
        [OFFSCREEN_WRITER_EXECUTION_MODE_ENV]: WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED,
        [OFFSCREEN_WRITER_PROVIDER_MODEL_ENV]: 'openai/gpt-4o-mini',
        [OFFSCREEN_WRITER_PROVIDER_POLICY_VERSION_ENV]: 'wr11.bootstrap.v1',
      }),
    /provider-authorized requires OPENROUTER_API_KEY/,
  );
});

test('provider-authorized execution config uses real transport when key present', () => {
  const config = readExecutionWorkerConfig({
    TEMPORAL_ADDRESS: '127.0.0.1:7233',
    GAME_AUTHORITY_ORIGIN: 'http://127.0.0.1:9911',
    GAME_AUTHORITY_EXECUTOR_TOKEN: '0123456789abcdef',
    [OFFSCREEN_WRITER_EXECUTION_MODE_ENV]: WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED,
    [OFFSCREEN_WRITER_PROVIDER_MODEL_ENV]: 'openai/gpt-4o-mini',
    [OFFSCREEN_WRITER_PROVIDER_POLICY_VERSION_ENV]: 'wr11.bootstrap.v1',
    OPENROUTER_API_KEY: 'sk-or-test-key',
  });
  assert.equal(config.writerRound.mode, WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED);
  assert.equal(config.writerRound.prepareTransport, prepareWriterRoundTransport);
  assert.equal(config.writerRound.apiKey, 'sk-or-test-key');
});

test('scripted lab execution config rejects provider key mix', () => {
  assert.throws(
    () =>
      readExecutionWorkerConfig({
        TEMPORAL_ADDRESS: '127.0.0.1:7233',
        GAME_AUTHORITY_ORIGIN: 'http://127.0.0.1:9911',
        GAME_AUTHORITY_EXECUTOR_TOKEN: '0123456789abcdef',
        [OFFSCREEN_WRITER_EXECUTION_MODE_ENV]: WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB,
        OPENROUTER_API_KEY: 'sk-or-should-not-mix',
      }),
    /cannot be combined with OPENROUTER_API_KEY/,
  );
});