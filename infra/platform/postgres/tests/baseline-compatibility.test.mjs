import test from 'node:test';
import assert from 'node:assert/strict';
import { assessClusterSpec, expectedClusterSpec, parseQuantity, firstMismatch } from '../bootstrap/compatibility.mjs';

test('both trusted specimens are compatible, preserving explicit topology', () => {
  for (const profile of ['dev', 'release']) {
    const spec = expectedClusterSpec(profile);
    assert.deepEqual(assessClusterSpec(profile, spec), { ok: true, instances: 1 });
    spec.instances = 2;
    assert.deepEqual(assessClusterSpec(profile, spec), { ok: true, instances: 2 });
    assert.equal(assessClusterSpec(profile, spec, { exactInstances: true }).ok, false);
    for (const count of [0, -1, 1.5, '2', NaN, Infinity]) {
      spec.instances = count;
      assert.equal(assessClusterSpec(profile, spec).ok, false);
    }
  }
});

test('security drift and omitted defaults refuse with exact path', () => {
  const cases = [
    [s => { s.enableSuperuserAccess = true; }, '/spec/enableSuperuserAccess'],
    [s => { delete s.enableSuperuserAccess; }, '/spec/enableSuperuserAccess'],
    [s => { s.postgresql.pg_hba = ['host all all 0.0.0.0/0 trust']; }, '/spec/postgresql/pg_hba'],
    [s => { s.plugins = [{ name: 'unexpected' }]; }, '/spec/plugins'],
    [s => { s.storage.storageClass = 'foreign'; }, '/spec/storage/storageClass'],
    [s => { s.postgresql.parameters.max_connections = 100; }, '/spec/postgresql/parameters/max_connections'],
  ];
  for (const [mutate, path] of cases) {
    const spec = expectedClusterSpec('dev');
    mutate(spec);
    assert.deepEqual(assessClusterSpec('dev', spec), { ok: false, path });
  }
});

test('quantity normalization is exact and limited to known fields', () => {
  const spec = expectedClusterSpec('dev');
  spec.resources.limits.memory = '1024Mi';
  spec.resources.requests.cpu = '0.1';
  assert.equal(assessClusterSpec('dev', spec).ok, true);
  spec.resources.limits.memory = '1025Mi';
  assert.equal(assessClusterSpec('dev', spec).ok, false);
  assert.equal(parseQuantity('1e1000000'), null);
  assert.equal(parseQuantity(1024), null);
});

test('object order is immaterial, array order and missing keys are not', () => {
  assert.equal(firstMismatch({ a: 1, b: 2 }, { b: 2, a: 1 }), null);
  assert.equal(firstMismatch({ a: [1, 2] }, { a: [2, 1] }), '/a/0');
  assert.equal(firstMismatch({ a: null }, {}), '/a');
});

test('fresh admission requires both exact ACL hooks; historical observation remains compatible', () => {
  for (const profile of ['dev', 'release']) {
    const fresh = expectedClusterSpec(profile);
    const old = expectedClusterSpec(profile, { historical: true });
    const options = { exactInstances: true, freshAdmission: true };
    assert.equal(assessClusterSpec(profile, fresh, options).ok, true);
    assert.equal(assessClusterSpec(profile, old, options).ok, false);
    assert.equal(assessClusterSpec(profile, old).ok, true);
    for (const hook of ['postInitSQL', 'postInitApplicationSQL']) {
      const missing = structuredClone(fresh);
      delete missing.bootstrap.initdb[hook];
      assert.equal(assessClusterSpec(profile, missing).ok, false);
      assert.equal(assessClusterSpec(profile, missing, options).ok, false);
      const tampered = structuredClone(fresh);
      tampered.bootstrap.initdb[hook].push('SELECT 1;');
      assert.equal(assessClusterSpec(profile, tampered).ok, false);
    }
    old.enableSuperuserAccess = true;
    assert.equal(assessClusterSpec(profile, old).ok, false);
  }
});
