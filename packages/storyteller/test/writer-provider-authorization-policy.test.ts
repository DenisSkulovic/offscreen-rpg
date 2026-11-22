import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  OFFSCREEN_WRITER_EXECUTION_MODE_ENV,
  OFFSCREEN_WRITER_PROVIDER_MODEL_ENV,
  OFFSCREEN_WRITER_PROVIDER_POLICY_VERSION_ENV,
  assertScriptedOfflineLabNotMixedWithProviderPin,
  readWriterProviderAuthorizationPolicy,
  WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED,
  WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB,
} from '../src/providers/writer-provider-authorization-policy.js';

const providerEnv = {
  [OFFSCREEN_WRITER_PROVIDER_MODEL_ENV]: 'openai/gpt-4o-mini',
  [OFFSCREEN_WRITER_PROVIDER_POLICY_VERSION_ENV]: 'wr11.bootstrap.v1',
};

test('provider-authorized policy uses env model and policy version', () => {
  const parsed = readWriterProviderAuthorizationPolicy(providerEnv);
  assert.equal(parsed.policy.model, 'openai/gpt-4o-mini');
  assert.equal(parsed.policy.priceVersion, 'wr11.bootstrap.v1');
  assert.equal(parsed.policy.provider, 'OpenAI');
  assert.equal(parsed.policy.maxMicrousd, 250_000n);
  assert.deepEqual(parsed.admission, {
    mode: 'provider',
    model: 'openai/gpt-4o-mini',
    policyVersion: 'wr11.bootstrap.v1',
  });
});

test('provider-authorized policy rejects missing pin env', () => {
  assert.throws(
    () => readWriterProviderAuthorizationPolicy({}),
    /OFFSCREEN_WRITER_PROVIDER_MODEL/,
  );
  assert.throws(
    () =>
      readWriterProviderAuthorizationPolicy({
        [OFFSCREEN_WRITER_PROVIDER_MODEL_ENV]: 'openai/gpt-4o-mini',
      }),
    /OFFSCREEN_WRITER_PROVIDER_POLICY_VERSION/,
  );
});

test('scripted lab rejects mixed provider pin env', () => {
  assert.throws(
    () =>
      assertScriptedOfflineLabNotMixedWithProviderPin({
        [OFFSCREEN_WRITER_EXECUTION_MODE_ENV]:
          WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB,
        ...providerEnv,
      }),
    /cannot be combined/,
  );
  assert.doesNotThrow(() =>
    assertScriptedOfflineLabNotMixedWithProviderPin({
      [OFFSCREEN_WRITER_EXECUTION_MODE_ENV]:
        WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB,
    }),
  );
});

test('provider-authorized mode constant is stable', () => {
  assert.equal(WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED, 'provider-authorized');
});