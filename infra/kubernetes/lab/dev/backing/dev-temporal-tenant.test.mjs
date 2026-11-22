import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveDevTemporalTenant, ensureDevTemporalTenant } from './dev-temporal-tenant.mjs';

const TOKEN = 'kind-offscreen-dev-temporal-tenant-live';

function adapter() {
  const state = new Map([['default', { id: 'default-id', retentionSeconds: 86400 }]]);
  return {
    state,
    identity: () => ({
      context: 'kind-offscreen-dev',
      namespace: 'offscreen-dev-temporal',
      owner: 'offscreen-dev',
      image: 'docker.io/temporalio/server:1.32.2',
    }),
    async describe(name) {
      return state.get(name) ?? null;
    },
    async create(names) {
      state.set(names.temporalNamespace, { id: `id-${names.temporalNamespace}`, retentionSeconds: names.retentionSeconds });
    },
  };
}

test('slot namespace matches the app namespace and keeps shared queues', () => {
  const names = deriveDevTemporalTenant('dev-1');
  assert.equal(names.temporalNamespace, 'offscreen-dev-1');
  assert.equal(names.kubernetesNamespace, 'offscreen-dev-temporal');
  assert.deepEqual(names.taskQueues, ['storyteller-execute-v1', 'control']);
  assert.equal(names.retentionSeconds, 86400);
});

test('ensure creates once and leaves default untouched', async () => {
  const store = adapter();
  const first = await ensureDevTemporalTenant({ slotId: 'dev-1', authorizeLive: TOKEN, adapter: store });
  const again = await ensureDevTemporalTenant({ slotId: 'dev-1', authorizeLive: TOKEN, adapter: store });
  assert.equal(first.ok && again.ok, true);
  assert.equal(first.mutated, true);
  assert.equal(again.mutated, false);
  assert.equal(again.id, first.id);
  assert.equal(store.state.get('default').id, 'default-id');
});

test('wrong cluster, retention conflict and missing authorization stop', async () => {
  const foreign = adapter();
  foreign.identity = () => ({ context: 'kind-offscreen-lab', namespace: 'offscreen-dev-temporal', owner: 'offscreen-dev', image: 'docker.io/temporalio/server:1.32.2' });
  assert.equal((await ensureDevTemporalTenant({ slotId: 'dev-1', authorizeLive: TOKEN, adapter: foreign })).refusals[0].id, 'wrong-binding');
  const conflict = adapter();
  conflict.state.set('offscreen-dev-2', { id: 'kept', retentionSeconds: 3600 });
  assert.equal((await ensureDevTemporalTenant({ slotId: 'dev-2', authorizeLive: TOKEN, adapter: conflict })).refusals[0].id, 'retention-conflict');
  assert.equal((await ensureDevTemporalTenant({ slotId: 'dev-1', authorizeLive: 'no', adapter: adapter() })).refusals[0].id, 'ensure-not-authorized');
});
