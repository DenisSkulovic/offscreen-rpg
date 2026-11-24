import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveDevTemporalTenant, ensureDevTemporalTenant, parseTemporalDescribe } from '../src/adapters/dev-temporal-tenant.mjs';

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
  foreign.identity = () => ({ context: 'kind-offscreen-release', namespace: 'offscreen-dev-temporal', owner: 'offscreen-dev', image: 'docker.io/temporalio/server:1.32.2' });
  assert.equal((await ensureDevTemporalTenant({ slotId: 'dev-1', authorizeLive: TOKEN, adapter: foreign })).refusals[0].id, 'wrong-binding');
  const conflict = adapter();
  conflict.state.set('offscreen-dev-2', { id: 'kept', retentionSeconds: 3600 });
  assert.equal((await ensureDevTemporalTenant({ slotId: 'dev-2', authorizeLive: TOKEN, adapter: conflict })).refusals[0].id, 'retention-conflict');
  assert.equal((await ensureDevTemporalTenant({ slotId: 'dev-1', authorizeLive: 'no', adapter: adapter() })).refusals[0].id, 'ensure-not-authorized');
});

test('describe distinguishes json visibility, parse failure and a single create', async () => {
  const parsed = parseTemporalDescribe('noise {"namespaceInfo":{"id":"d9f8f0d7-27e6-455c-b820-127cceab82ec","name":"offscreen-dev-6"},"config":{"workflowExecutionRetentionTtl":"86400s"}}\nextra', 0);
  assert.equal(parsed.id, 'd9f8f0d7-27e6-455c-b820-127cceab82ec');
  assert.equal(parsed.retentionSeconds, 86400);
  assert.equal(parseTemporalDescribe('not found', 1).status, 'absent');
  assert.equal(parseTemporalDescribe('boom', 1).status, 'command-failed');
  assert.equal(parseTemporalDescribe('no id here', 0).status, 'malformed-output');
  const store = adapter();
  let describes = 0;
  store.describe = async (name) => {
    describes += 1;
    if (describes < 3) return null;
    return store.state.get(name) ?? null;
  };
  let creates = 0;
  const original = store.create;
  store.create = async (names) => { creates += 1; await original(names); };
  store.wait = async () => {};
  const result = await ensureDevTemporalTenant({ slotId: 'dev-6', authorizeLive: TOKEN, adapter: store });
  assert.equal(result.ok, true);
  assert.equal(creates, 1);
  const broken = adapter();
  broken.describe = async () => ({ failure: 'malformed-output', detail: 'namespace id missing' });
  assert.equal((await ensureDevTemporalTenant({ slotId: 'dev-6', authorizeLive: TOKEN, adapter: broken })).refusals[0].id, 'malformed-output');
  const failed = adapter();
  failed.create = async () => { throw new Error('secret output'); };
  assert.equal((await ensureDevTemporalTenant({ slotId: 'dev-3', authorizeLive: TOKEN, adapter: failed })).refusals[0].detail, 'temporal namespace create failed');
});
