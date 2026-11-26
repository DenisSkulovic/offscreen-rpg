import assert from 'node:assert/strict';
import process from 'node:process';
import test from 'node:test';
import {
  ensureRabbitmqInstall,
  planRabbitmqInstall,
  rabbitmqInstallResult,
  runRabbitmqInstallLifecycle,
} from '../install.mjs';

test('plan refuses context mismatch before inventory IO', () => {
  const result = planRabbitmqInstall('dev', 'kind-offscreen-release', {
    skipTargetAssert: true,
    run: () => {
      throw new Error('inventory IO should not run');
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.mutation, 'none');
  assert.equal(result.reasonCode, 'context-mismatch');
});

test('ensure refuses missing authorization before lock', () => {
  const prior = process.env.OFFSCREEN_RABBITMQ_ENSURE;
  delete process.env.OFFSCREEN_RABBITMQ_ENSURE;
  try {
    const result = ensureRabbitmqInstall('dev', 'kind-offscreen-dev');
    assert.equal(result.ok, false);
    assert.equal(result.reasonCode, 'ensure-not-authorized');
    assert.equal(result.mutation, 'none');
    assert.equal(result.state, 'refused');
  } finally {
    if (prior === undefined) delete process.env.OFFSCREEN_RABBITMQ_ENSURE;
    else process.env.OFFSCREEN_RABBITMQ_ENSURE = prior;
  }
});

test('lifecycle plan command stays read-only', () => {
  const code = runRabbitmqInstallLifecycle(
    ['plan', 'dev', 'kind-offscreen-release'],
    {
      skipTargetAssert: true,
      run: () => {
        throw new Error('plan must not touch cluster');
      },
    },
  );
  assert.equal(code, 2);
});

test('typed receipt preserves refusal versus possible mutation', () => {
  const refusal = rabbitmqInstallResult(
    false,
    'dev',
    'authorization',
    'refused',
    'none',
    'ensure-not-authorized',
  );
  assert.equal(refusal.mutation, 'none');
  const uncertain = rabbitmqInstallResult(
    false,
    'dev',
    'launcher',
    'failed',
    'possible',
    'worker-receipt-missing',
  );
  assert.equal(uncertain.mutation, 'possible');
});
