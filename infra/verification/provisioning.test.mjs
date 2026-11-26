import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RABBITMQ_PROVISIONING_GROUP_MS,
  buildProvisioningChecks,
  evaluateRabbitmqProvisioningEnsure,
} from './provisioning.mjs';
import { executeChecks } from './diagnostic-engine.mjs';

test('postgres failure blocks temporal but not independent installers', async () => {
  const rows = await executeChecks(
    buildProvisioningChecks('release', {
      run: async (_, args) => ({
        code: args.includes('up') && args.includes('postgres') ? 1 : 0,
        stdout: JSON.stringify({ status: 'PASS' }),
        stderr: '',
      }),
    }),
  );
  const byId = Object.fromEntries(rows.map((row) => [row.id, row.status]));
  assert.equal(byId['release:ensure:postgres'], 'FAIL');
  assert.equal(byId['release:ensure:temporal'], 'BLOCKED');
  assert.equal(byId['release:observe:object-storage'], 'PASS');
  assert.equal(byId['release:observe:observability'], 'PASS');
});
test('default release provisioning excludes rabbitmq ensure', () => {
  const ids = buildProvisioningChecks('release').map((row) => row.id);
  assert.equal(ids.includes('release:ensure:rabbitmq'), false);
  assert.equal(ids.includes('release:observe:rabbitmq'), false);
});

test('--rabbitmq opt-in adds bounded rabbitmq ensure', () => {
  const checks = buildProvisioningChecks('release', { rabbitmq: true });
  const ensure = checks.find((row) => row.id === 'release:ensure:rabbitmq');
  assert.ok(ensure);
  assert.equal(ensure.requires.includes('release:cluster'), true);
});

test('rabbitmq provisioning timeout uses the 1050s group budget only', async () => {
  /** @type {number | undefined} */
  let ensureTimeout;
  const checks = buildProvisioningChecks('release', {
    rabbitmq: true,
    run: async (_command, _args, options) => {
      ensureTimeout = options.timeoutMs;
      return {
        code: 0,
        stdout: JSON.stringify({ ok: true, receipt: { phases: [] } }),
        stderr: '',
      };
    },
  });
  const ensure = checks.find((row) => row.id === 'release:ensure:rabbitmq');
  await ensure.run();
  assert.equal(ensureTimeout, RABBITMQ_PROVISIONING_GROUP_MS);
});

test('lost rabbitmq provisioning output is possible mutation not pass', () => {
  const result = evaluateRabbitmqProvisioningEnsure({
    code: 0,
    stdout: '',
    stderr: '',
    reason: null,
    signal: null,
  });
  assert.equal(result.status, 'FAIL');
  assert.equal(result.reason, 'possible-mutation');
});

test('failed cluster observation blocks every mutation even with zero subprocess exit', async () => {
  let calls = 0;
  const rows = await executeChecks(
    buildProvisioningChecks('dev', {
      run: async () => {
        calls++;
        return { code: 0, stdout: '{"status":"FAIL"}', stderr: '' };
      },
    }),
  );
  assert.equal(calls, 1);
  assert.equal(rows[0].status, 'FAIL');
  assert.ok(rows.slice(1).every((row) => row.status === 'BLOCKED'));
});
