import assert from 'node:assert/strict';
import test from 'node:test';
import { DEV_CLUSTER_NAME } from '../../../../../scripts/repo-tools/dev-worktree-allocator.mjs';
import { assertDevSqlTenantBinding, deriveDevSqlTenant, renderDevSqlTenant } from './dev-sql-tenant-contract.mjs';

test('slot ids map to closed SQL tenants without passwords in the manifest', () => {
  for (const slotId of ['dev-1', 'dev-2', 'dev-100']) {
    const rendered = renderDevSqlTenant(slotId);
    const again = renderDevSqlTenant(slotId);
    assert.equal(again.manifest, rendered.manifest);
    assert.equal(rendered.names.database, `dev_${slotId.slice(4)}`);
    assert.match(rendered.manifest, new RegExp(`username: ${rendered.names.migrationRole}`));
    assert.match(rendered.manifest, new RegExp(`username: ${rendered.names.runtimeRole}`));
    assert.match(rendered.manifest, /type: kubernetes.io\/basic-auth/);
    assert.match(rendered.manifest, /allowConnections: false/);
    assert.match(rendered.manifest, /databaseReclaimPolicy: retain/);
    assert.match(rendered.manifest, new RegExp(`owner: ${rendered.names.migrationRole}`));
    assert.match(rendered.manifest, /connectionLimit: 8/);
    assert.match(rendered.manifest, /connectionLimit: 2/);
    assert.doesNotMatch(rendered.manifest, /password:/);
    assert.doesNotMatch(rendered.names.database, /-/);
  }
});

test('invalid slot ids and overflow are refused', () => {
  assert.throws(() => deriveDevSqlTenant('dev-01'), /not dev-/);
  assert.throws(() => deriveDevSqlTenant('dev-1-extra'), /not dev-/);
  assert.throws(() => deriveDevSqlTenant(`dev-${'1'.repeat(60)}`), /exceeds 63/);
});

test('the owner record must match the slot, namespace and cluster', () => {
  const names = deriveDevSqlTenant('dev-2');
  assertDevSqlTenantBinding({ slotId: 'dev-2', namespace: 'offscreen-dev-2', cluster: DEV_CLUSTER_NAME }, 'dev-2');
  assert.throws(() => assertDevSqlTenantBinding({ slotId: 'dev-2', namespace: 'offscreen-dev-9', cluster: DEV_CLUSTER_NAME }, 'dev-2'), /does not match/);
  assert.equal(names.appNamespace, 'offscreen-dev-2');
});
