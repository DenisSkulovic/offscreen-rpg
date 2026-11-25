import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compactConfig } from '../config.mjs';
import { compactResources, OWNER_KEY } from '../deployment.mjs';
import { classifySchema, inspectionJob, initializationJob } from '../schema.mjs';
import { ensureTemporal } from '../lifecycle.mjs';

test('isolated profiles never target legacy databases or namespaces', () => {
  for (const profile of ['dev', 'release']) {
    const c = compactConfig(profile);
    assert.match(c.namespace, /-next$/);
    assert.match(c.endpoint, /-rw\./);
    assert.equal(c.execution.database, 'temporal_next');
    assert.equal(c.visibility.database, 'temporal_next_visibility');
    const resources = compactResources(c);
    assert.deepEqual(resources.map((r) => r.kind), ['ConfigMap', 'Service', 'Deployment']);
    assert.ok(resources.every((r) => r.metadata.labels[OWNER_KEY] === c.owner));
    assert.ok(resources.every((r) => r.metadata.namespace === c.namespace));
    assert.ok(!JSON.stringify(resources).includes('temporal-postgres'));
  }
  assert.throws(() => compactConfig('production'));
});

test('schema classifier refuses unknown, older, newer and multi-row evidence', () => {
  assert.equal(classifySchema('empty', '1.19'), 'empty');
  assert.equal(classifySchema('version:1.19', '1.19'), 'compatible');
  for (const output of ['', 'partial', 'version:1.18', 'version:1.20', 'version:1.19\n1.19']) {
    assert.equal(classifySchema(output, '1.19'), 'incompatible');
  }
});

test('schema jobs use stable endpoint and never create databases', () => {
  const c = compactConfig('dev');
  for (const store of [c.execution, c.visibility]) {
    const probe = inspectionJob(c, store, 'test-probe');
    const init = initializationJob(c, store, 'test-init');
    for (const object of [probe, init]) {
      const container = object.spec.template.spec.containers[0];
      assert.equal(container.env.find((e) => e.name === 'PGHOST').value, c.endpoint);
      assert.equal(container.env.find((e) => e.name === 'PGDATABASE').value, store.database);
      assert.equal(object.spec.backoffLimit, 0);
      assert.equal(object.spec.template.spec.automountServiceAccountToken, false);
    }
    assert.match(init.spec.template.spec.containers[0].command[2], /setup-schema/);
    assert.doesNotMatch(init.spec.template.spec.containers[0].command[2], /--db "\$PGDATABASE" create/);
  }
});

test('incompatible visibility stops all deployment mutations', async () => {
  const c = compactConfig('dev');
  const applied = [];
  let logs = 0;
  const kube = {
    assertTarget() {}, requireNamespace() {}, read() { return null; },
    command(args) {
      if (args[0] === 'logs') return ++logs === 1 ? 'version:1.19' : 'partial';
      return '';
    },
    apply(object) { applied.push(object); },
  };
  await assert.rejects(ensureTemporal(c, kube), /both Temporal schemas/);
  assert.deepEqual(applied, []);
});

test('foreign resource stops before even creating inspection jobs', async () => {
  const c = compactConfig('dev');
  const kube = {
    assertTarget() {}, requireNamespace() {},
    read() { return {}; },
    requireOwned() { throw new Error('foreign'); },
    command() { assert.fail('must not run command'); },
    apply() { assert.fail('must not apply'); },
  };
  await assert.rejects(ensureTemporal(c, kube), /foreign/);
});

test('compatible stores reconcile and verify generation', async () => {
  const c = compactConfig('dev');
  let logs = 0;
  const applied = [];
  const kube = {
    assertTarget() {}, requireNamespace() {}, requireOwned() {},
    read(kind) {
      return applied.length && kind === 'Deployment'
        ? { metadata: { generation: 2 }, status: { observedGeneration: 2, readyReplicas: 1, updatedReplicas: 1 } } : null;
    },
    command(args) {
      return args[0] === 'logs' ? (++logs === 1 ? 'version:1.19' : 'version:1.14') : '';
    },
    apply(object) { applied.push(object.kind); },
  };
  const result = await ensureTemporal(c, kube);
  assert.equal(result.ready, true);
  assert.deepEqual(applied, ['ConfigMap', 'Service', 'Deployment']);
});
