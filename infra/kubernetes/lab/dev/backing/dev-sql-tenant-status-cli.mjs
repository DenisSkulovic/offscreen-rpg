#!/usr/bin/env node
import { collectDevSqlTenantInventory, planDevSqlTenants, statusDevSqlTenants } from './dev-sql-tenant-status.mjs';

const command = process.argv[2] ?? 'plan';
const injected = process.env.OFFSCREEN_DEV_SQL_PROBE;
const injectedForTest = process.env.OFFSCREEN_DEV_SQL_PROBE_MODE === 'test';

if (command === 'ensure') {
  process.stderr.write('refusing live SQL tenant ensure: tenant mutation is not authorized\n');
  process.exitCode = 2;
} else if (command !== 'plan' && command !== 'status') {
  process.stderr.write('usage: dev-sql-tenant-status-cli.mjs <plan|status>\n');
  process.exitCode = 2;
} else if (injected && !injectedForTest) {
  process.stderr.write('refusing injected SQL probe outside tests\n');
  process.exitCode = 2;
} else {
  const probe = injectedForTest ? JSON.parse(injected) : collectDevSqlTenantInventory();
  const result = command === 'plan' ? planDevSqlTenants(probe) : statusDevSqlTenants(probe);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (result.refusals.length > 0) process.exitCode = 2;
}
