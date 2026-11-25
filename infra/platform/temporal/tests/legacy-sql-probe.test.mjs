import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TEMPORAL_AUTHENTICATED_SQL_QUERY,
  probeLegacyTemporalSql,
} from '../legacy-sql-probe.mjs';
import { TEMPORAL_SQL_SCHEMA_VERSION_QUERY } from '../schema-policy.mjs';

test('authenticated phase succeeds when postgres returns exact 1', () => {
  const calls = [];
  const result = probeLegacyTemporalSql(({ database, query }) => {
    calls.push({ database, query });
    return { ok: true, stdout: '1\n' };
  }, 'authenticated');
  assert.equal(result.ok, true);
  assert.deepEqual(result.refusals, []);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].database, 'postgres');
  assert.equal(calls[0].query, TEMPORAL_AUTHENTICATED_SQL_QUERY);
  assert.equal('stdout' in result, false);
  assert.equal('stderr' in result, false);
});

test('schema phase succeeds when both stores return exact t', () => {
  const calls = [];
  const result = probeLegacyTemporalSql(({ database, query }) => {
    calls.push({ database, query });
    return { ok: true, stdout: 't' };
  }, 'schema');
  assert.equal(result.ok, true);
  assert.deepEqual(result.refusals, []);
  assert.deepEqual(
    calls.map((item) => item.database),
    ['temporal', 'temporal_visibility'],
  );
  for (const call of calls) {
    assert.equal(call.query, TEMPORAL_SQL_SCHEMA_VERSION_QUERY);
  }
});

test('missing exec fails closed', () => {
  const result = probeLegacyTemporalSql(undefined, 'authenticated');
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0]?.id, 'sql-exec-missing');
});

test('failed exec callback fails closed', () => {
  const result = probeLegacyTemporalSql(() => ({ ok: false }), 'authenticated');
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0]?.id, 'sql-exec-failed');
});

test('throwing exec callback fails closed', () => {
  const result = probeLegacyTemporalSql(() => {
    throw new Error('boom');
  }, 'authenticated');
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0]?.id, 'sql-exec-threw');
});

test('wrong authenticated output fails closed', () => {
  const result = probeLegacyTemporalSql(
    () => ({ ok: true, stdout: '0' }),
    'authenticated',
  );
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0]?.id, 'sql-output-wrong');
});

test('schema one-sided fail when visibility store is wrong', () => {
  let callCount = 0;
  const result = probeLegacyTemporalSql(({ database }) => {
    callCount += 1;
    if (database === 'temporal') return { ok: true, stdout: 't' };
    return { ok: true, stdout: 'f' };
  }, 'schema');
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0]?.id, 'schema-version-missing');
  assert.equal(callCount, 2);
});

test('schema fails when first store exec returns not ok', () => {
  let callCount = 0;
  const result = probeLegacyTemporalSql(() => {
    callCount += 1;
    return { ok: false };
  }, 'schema');
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0]?.id, 'sql-exec-failed');
  assert.equal(callCount, 1);
});
