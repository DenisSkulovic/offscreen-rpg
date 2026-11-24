import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectDevSqlTenantInventory, statusDevSqlTenants } from '../src/adapters/dev-sql-tenant-status.mjs';

test('inventory omits secret data and status refuses a foreign tenant resource', () => {
  const probe = collectDevSqlTenantInventory({
    run(_command, args) {
      if (args.includes('current-context')) return { ok: true, stdout: 'kind-offscreen-release\n' };
      return {
        ok: true,
        stdout: JSON.stringify({
          items: [{
            kind: 'Secret',
            type: 'kubernetes.io/basic-auth',
            metadata: { name: 'dev-1-run-auth', uid: 'sec', labels: { 'offscreen.dev/owner': 'offscreen-dev', 'offscreen.dev/slot': 'dev-1' } },
            data: { password: 'c2VjcmV0' },
          }, {
            kind: 'Database',
            metadata: { name: 'dev-2', uid: 'db' },
          }],
        }),
      };
    },
  });
  assert.equal(JSON.stringify(probe).includes('c2VjcmV0'), false);
  assert.equal(probe.sqlCatalog, 'not-authorized');
  assert.equal(probe.currentContext, 'kind-offscreen-release');
  const status = statusDevSqlTenants(probe);
  assert.equal(status.readOnly, true);
  assert.equal(status.refusals.some((item) => item.id === 'foreign-resource'), true);
});

test('the CLI refuses ensure and injected probes', () => {
  const script = join(dirname(fileURLToPath(import.meta.url)), '../src/adapters/dev-sql-tenant-status-cli.mjs');
  const ensure = spawnSync(process.execPath, [script, 'ensure'], { encoding: 'utf8' });
  assert.equal(ensure.status, 2);
  assert.match(ensure.stderr, /not authorized/);
  const injected = spawnSync(process.execPath, [script, 'plan'], {
    encoding: 'utf8',
    env: { ...process.env, OFFSCREEN_DEV_SQL_PROBE: '{}' },
  });
  assert.equal(injected.status, 2);
});
