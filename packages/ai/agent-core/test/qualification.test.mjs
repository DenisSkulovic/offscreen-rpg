import assert from 'node:assert/strict';
import test from 'node:test';
import { validateQualificationEnv } from './qualification.mjs';

const base = {
  E1_QUALIFY: '1',
  POC_TEMPORAL_ADDRESS: '127.0.0.1:7233',
  POC_NAMESPACE: 'offscreen-agent-poc-e1-1127193045-ab12cd',
  PATH: '/usr/bin',
  HOME: '/tmp',
};

test('qualification import does not require a live endpoint', async () => {
  const loaded = await import('./qualification.mjs');
  assert.equal(typeof loaded.createHarness, 'function');
  assert.equal(typeof loaded.main, 'function');
});

test('qualification env refuses missing opt-in, unsafe endpoint, namespace, and credentials', () => {
  assert.equal(validateQualificationEnv({ ...base, E1_QUALIFY: '0' }).ok, false);
  assert.equal(validateQualificationEnv({ ...base, POC_TEMPORAL_ADDRESS: 'temporal:7233' }).ok, false);
  assert.equal(validateQualificationEnv({ ...base, POC_NAMESPACE: 'default' }).ok, false);
  assert.equal(validateQualificationEnv({ ...base, OPENAI_API_KEY: 'present' }).reason, 'credential-refused');
  assert.equal(validateQualificationEnv({ ...base, OTEL_EXPORTER_OTLP_ENDPOINT: 'http://collector' }).reason, 'credential-refused');
  assert.equal(validateQualificationEnv(base).ok, true);
});
