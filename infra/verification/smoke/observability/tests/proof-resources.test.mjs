import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createProofResources } from '../proof-resources.mjs';

function session() {
  return {
    evidenceDir: mkdtempSync(join(tmpdir(), 'obs-proof-res-')),
    deadline: 1_000_000,
  };
}

test('create records UID before the next object and never deletes the namespace', async () => {
  const calls = [];
  let podUid = 'pod-uid-1';
  const resources = createProofResources(session(), {
    api: async (call) => {
      calls.push(`${call.method} ${call.path}`);
      if (call.method === 'POST' && call.path === '/api/v1/namespaces') {
        return { kind: 'Namespace', metadata: { name: call.body.metadata.name, uid: 'ns-uid' } };
      }
      if (call.method === 'POST' && call.path.endsWith('/configmaps')) {
        return { kind: 'ConfigMap', metadata: { name: call.body.metadata.name, uid: 'cm-uid' } };
      }
      if (call.method === 'POST' && call.path.endsWith('/pods')) {
        return { kind: 'Pod', metadata: { name: call.body.metadata.name, uid: podUid } };
      }
      if (call.method === 'GET' && call.path.includes('/pods/')) {
        if (calls.filter((entry) => entry.startsWith('DELETE')).length > 0) {
          return { code: 404, reason: 'NotFound' };
        }
        return { metadata: { uid: podUid } };
      }
      if (call.method === 'GET' && call.path.endsWith('/pods')) {
        return { items: [] };
      }
      if (call.method === 'DELETE') return { code: 200 };
      throw new Error(`unexpected ${call.method} ${call.path}`);
    },
  });
  const createdNs = await resources.createNamespace();
  assert.equal(createdNs.uid, 'ns-uid');
  assert.equal(resources.ledger.namespace.state, 'known-present');
  const cm = await resources.createConfigMap({
    metadata: { name: `obs-proof-cm-${'a'.repeat(32)}` },
  });
  assert.equal(cm.uid, 'cm-uid');
  const podName = `obs-proof-pod-${'b'.repeat(32)}`;
  const pod = await resources.createPod({ metadata: { name: podName } });
  assert.equal(pod.uid, 'pod-uid-1');
  const replaced = { ...resources };
  podUid = 'pod-uid-2';
  const finish = await resources.finishPod({ deadline: 10 });
  assert.equal(finish.ok, false);
  assert.equal(finish.reasonCode, 'pod-replaced');
  assert.equal(
    calls.some((entry) => entry.startsWith('DELETE') && entry.includes('/namespaces/obs-proof-') && !entry.includes('/pods/') && !entry.includes('/configmaps/')),
    false,
  );
  void replaced;
});

test('foreign ConfigMap consumer keeps the ConfigMap and the namespace', async () => {
  const resources = createProofResources(session(), {
    api: async (call) => {
      if (call.method === 'POST' && call.path === '/api/v1/namespaces') {
        return { kind: 'Namespace', metadata: { name: call.body.metadata.name, uid: 'ns-uid' } };
      }
      if (call.method === 'POST' && call.path.endsWith('/configmaps')) {
        return { kind: 'ConfigMap', metadata: { name: call.body.metadata.name, uid: 'cm-uid' } };
      }
      if (call.method === 'GET' && call.path.endsWith('/pods')) {
        return {
          items: [
            {
              metadata: { name: 'foreign' },
              spec: { volumes: [{ configMap: { name: 'obs-proof-cm-foreign' } }] },
            },
          ],
        };
      }
      throw new Error(`unexpected ${call.method} ${call.path}`);
    },
  });
  await resources.createNamespace();
  await resources.createConfigMap({
    metadata: { name: `obs-proof-cm-${'c'.repeat(32)}` },
  });
  const cleanup = await resources.cleanup({ deadline: 10 });
  assert.equal(cleanup.ok, false);
  assert.equal(cleanup.reasonCode, 'foreign-consumer');
  assert.equal(cleanup.namespaceDisposition, 'retained-owner-cleanup');
  assert.equal(
    resources.ledger.objects.find((entry) => entry.kind === 'ConfigMap').state,
    'known-present',
  );
});

test('unknown create stops and does not adopt a second name', async () => {
  const names = [];
  const resources = createProofResources(session(), {
    api: async (call) => {
      names.push(call.body?.metadata?.name);
      throw new Error('timeout');
    },
  });
  const first = await resources.createNamespace();
  const second = await resources.createNamespace();
  assert.equal(first.ok, false);
  assert.equal(first.reasonCode, 'create-unknown');
  assert.equal(second.reasonCode, 'create-unknown');
  assert.equal(names.length, 1);
  assert.equal(resources.ledger.namespace.uid, null);
});
