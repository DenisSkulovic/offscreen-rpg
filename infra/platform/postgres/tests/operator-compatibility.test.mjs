import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOperatorArtifact, expectedOperatorObject, assessOperatorObject, assessOperatorInventory } from '../bootstrap/operator.mjs';

test('pinned artifact rejects tampered bytes before parsing', () => {
  assert.throws(() => loadOperatorArtifact({ bytes: Buffer.from('not the artifact') }), /checksum mismatch/);
});

const vendor = { apiVersion: 'rbac.authorization.k8s.io/v1', kind: 'ClusterRole',
  metadata: { name: 'cnpg-manager' }, rules: [{ apiGroups: [''], resources: ['pods'], verbs: ['get'] }] };
const live = () => ({ ...structuredClone(vendor), metadata: { name: 'cnpg-manager', uid: 'role-uid', resourceVersion: '1' } });

test('RBAC comparison permits only measured server metadata', () => {
  assert.equal(assessOperatorObject(vendor, live()).ok, true);
  const drift = live();
  drift.rules[0].verbs.push('*');
  assert.equal(assessOperatorObject(vendor, drift).ok, false);
  const extra = live();
  extra.metadata.annotations = { unexpected: 'yes' };
  assert.equal(assessOperatorObject(vendor, extra).ok, false);
  const terminating = live();
  terminating.metadata.deletionTimestamp = '2026-11-26T00:00:00Z';
  assert.equal(assessOperatorObject(vendor, terminating).ok, false);
});

test('absence, partial inventory and unreadability remain distinct', () => {
  const inventory = [{ id: 'a', object: vendor }, { id: 'b', object: vendor }];
  const absent = { state: 'absent' };
  const present = { state: 'present', object: live() };
  assert.equal(assessOperatorInventory(inventory, new Map([['a', absent], ['b', absent]])).state, 'absent');
  assert.equal(assessOperatorInventory(inventory, new Map([['a', present], ['b', absent]])).state, 'partial');
  assert.equal(assessOperatorInventory(inventory, new Map([['a', present]])).state, 'unknown');
});

test('measured namespace defaults do not overwrite authored fields', () => {
  const ns = { apiVersion: 'v1', kind: 'Namespace', metadata: { name: 'cnpg-system' } };
  const expected = expectedOperatorObject(ns);
  assert.deepEqual(expected.spec, { finalizers: ['kubernetes'] });
  assert.equal(expected.metadata.labels['kubernetes.io/metadata.name'], 'cnpg-system');
  assert.throws(() => expectedOperatorObject({ ...ns, spec: {} }), /conflicts/);
});
