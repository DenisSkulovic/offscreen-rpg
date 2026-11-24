import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProvisioningChecks } from './provisioning.mjs';
import { executeChecks } from './diagnostic-engine.mjs';

test('postgres failure blocks temporal but not independent installers', async () => {
  const rows = await executeChecks(buildProvisioningChecks('release', { run: async (_, args) => ({
    code: args.includes('up') && args.includes('postgres') ? 1 : 0,
    stdout: JSON.stringify({ status: 'PASS' }), stderr: '',
  }) }));
  const byId = Object.fromEntries(rows.map(row => [row.id, row.status]));
  assert.equal(byId['release:ensure:postgres'], 'FAIL');
  assert.equal(byId['release:ensure:temporal'], 'BLOCKED');
  assert.equal(byId['release:observe:object-storage'], 'PASS');
  assert.equal(byId['release:observe:observability'], 'PASS');
});
test('failed cluster observation blocks every mutation even with zero subprocess exit', async () => {
  let calls = 0;
  const rows = await executeChecks(buildProvisioningChecks('dev', { run: async () => {
    calls++; return { code: 0, stdout: '{"status":"FAIL"}', stderr: '' };
  } }));
  assert.equal(calls, 1);
  assert.equal(rows[0].status, 'FAIL');
  assert.ok(rows.slice(1).every(row => row.status === 'BLOCKED'));
});
