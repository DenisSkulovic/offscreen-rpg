import assert from 'node:assert/strict';
import test from 'node:test';
import { assertReadOnlyCatalogSql, collectDevSqlCatalog, DEV_SQL_CATALOG_QUERIES } from './dev-sql-catalog-probe.mjs';

test('catalog probe SQL is select-only', () => {
  assert.equal(DEV_SQL_CATALOG_QUERIES.length, 5);
  assertReadOnlyCatalogSql();
  assert.throws(() => assertReadOnlyCatalogSql(['REVOKE CONNECT ON DATABASE dev FROM PUBLIC']), { code: 'catalog-probe-not-readonly' });
});

test('catalog probe passes only the fixed kubectl exec', () => {
  const calls = [];
  const result = collectDevSqlCatalog({
    run(file, args) {
      calls.push([file, args]);
      return 'datname|owner\ndev|dev\n(1 row)\n';
    },
  });
  assert.equal(calls.length, 5);
  assert.equal(calls[0][0], 'kubectl');
  assert.equal(calls[0][1].includes('REVOKE'), false);
  assert.equal(result.readOnly, true);
  assert.equal(result.pod, 'dev-pg-1');
});
