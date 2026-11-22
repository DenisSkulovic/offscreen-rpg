import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  OFFSCREEN_WRITER_PROVIDER_MODEL_ENV,
  OFFSCREEN_WRITER_PROVIDER_POLICY_VERSION_ENV,
  readWriterProviderAuthorizationPolicy,
  WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED,
} from '@offscreen/storyteller/providers/writer-provider-authorization-policy';
import {
  OFFSCREEN_WRITER_EXECUTION_MODE_ENV,
  readWorkerContinuationAdmission,
} from '../src/bootstrap/config';

const providerEnv = {
  [OFFSCREEN_WRITER_EXECUTION_MODE_ENV]: WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED,
  [OFFSCREEN_WRITER_PROVIDER_MODEL_ENV]: 'openai/gpt-4o-mini',
  [OFFSCREEN_WRITER_PROVIDER_POLICY_VERSION_ENV]: 'wr11.bootstrap.v1',
};

test('provider-authorized SQL worker admission matches shared parser', () => {
  const admission = readWorkerContinuationAdmission(providerEnv);
  const shared = readWriterProviderAuthorizationPolicy(providerEnv);
  assert.deepEqual(admission, shared.admission);
});

test('default env does not admit provider on SQL worker', () => {
  const admission = readWorkerContinuationAdmission({});
  assert.deepEqual(admission, { mode: 'scripted' });
});