import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  OFFSCREEN_WRITER_PROVIDER_MODEL_ENV,
  OFFSCREEN_WRITER_PROVIDER_POLICY_VERSION_ENV,
  readWriterProviderAuthorizationPolicy,
  WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED,
  WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB,
} from '@offscreen/storyteller/providers/writer-provider-authorization-policy';
import {
  OFFSCREEN_WRITER_EXECUTION_MODE_ENV,
  readWriterRoundBootstrapMode,
  writerRoundModelPolicyForBootstrap,
} from '../src/writer-round-lab-policy';

const providerEnv = {
  [OFFSCREEN_WRITER_EXECUTION_MODE_ENV]: WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED,
  [OFFSCREEN_WRITER_PROVIDER_MODEL_ENV]: 'openai/gpt-4o-mini',
  [OFFSCREEN_WRITER_PROVIDER_POLICY_VERSION_ENV]: 'wr11.bootstrap.v1',
};

test('provider-authorized GA bootstrap policy matches shared parser', () => {
  assert.equal(readWriterRoundBootstrapMode(providerEnv), 'provider-authorized');
  const policy = writerRoundModelPolicyForBootstrap('provider-authorized', providerEnv);
  const shared = readWriterProviderAuthorizationPolicy(providerEnv);
  assert.deepEqual(policy, shared.policy);
});

test('scripted lab GA rejects provider pin env mix', () => {
  assert.throws(
    () =>
      readWriterRoundBootstrapMode({
        [OFFSCREEN_WRITER_EXECUTION_MODE_ENV]: WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB,
        [OFFSCREEN_WRITER_PROVIDER_MODEL_ENV]: 'openai/gpt-4o-mini',
      }),
    /cannot be combined/,
  );
});