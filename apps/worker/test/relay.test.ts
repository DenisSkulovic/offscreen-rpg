import { test } from 'node:test';
import assert from 'node:assert/strict';
import { relayOne } from '../src/relay';

test('a send with an uncertain acknowledgement retains the notice for the same operation', async () => {
  const notice = {
    id: 'notice',
    topic: 'topic',
    operationId: 'operation',
    leaseId: 'lease',
  };
  const starts: string[] = [];
  let acknowledged = 0;
  const outbox = {
    claim: async () => notice,
    acknowledge: async () => {
      acknowledged++;
    },
  };
  await assert.rejects(
    relayOne(outbox, ['topic'], async (n) => {
      starts.push(n.operationId);
      throw new Error('Acknowledgement lost after acceptance');
    }),
  );
  assert.equal(acknowledged, 0);
  await relayOne(outbox, ['topic'], async (n) => {
    starts.push(n.operationId);
  });
  assert.deepEqual(starts, ['operation', 'operation']);
  assert.equal(acknowledged, 1);
});
