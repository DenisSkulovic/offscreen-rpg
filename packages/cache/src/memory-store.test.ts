import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryStore, createWeightedLru } from './memory/index.js';

const OVERHEAD = 128;

function liveEntry(
  payload: string,
  observedAtMs: number,
  expiresAtMs: number,
): {
  bytes: Uint8Array;
  observedAtMs: number;
  expiresAtMs: number;
} {
  return {
    bytes: new TextEncoder().encode(payload),
    observedAtMs,
    expiresAtMs,
  };
}

type TagBuffer = { data: number[]; tag: string };

test('createWeightedLru: mutation isolation via copy on get and set', () => {
  const lru = createWeightedLru<TagBuffer>({
    maxBytes: 10_000,
    maxEntries: 100,
    weight: (v) => v.data.length,
    copy: (v) => ({ data: [...v.data], tag: v.tag }),
  });

  const original = { data: [1, 2, 3], tag: 'a' };
  assert.equal(lru.set('k', original), true);
  original.data.push(99);

  const hit = lru.get('k');
  assert.ok(hit);
  assert.deepEqual(hit!.data, [1, 2, 3]);
  hit!.data.push(100);

  const again = lru.get('k');
  assert.deepEqual(again!.data, [1, 2, 3]);
});

test('createWeightedLru: evicts least-recently-used entries for bytes and count', () => {
  const unitCost = OVERHEAD + 2;
  const lru = createWeightedLru<string>({
    maxBytes: unitCost * 2,
    maxEntries: 10,
    weight: (v) => v.length,
    copy: (v) => v,
  });

  assert.equal(lru.set('a', 'aa'), true);
  assert.equal(lru.set('b', 'bb'), true);
  assert.equal(lru.set('c', 'cc'), true);

  assert.equal(lru.get('a'), undefined);
  assert.equal(lru.get('b'), 'bb');
  assert.equal(lru.get('c'), 'cc');
});

test('createMemoryStore: removes expired entries before evicting live ones on set', async () => {
  const clockMs = { now: 1_000 };
  const clock = () => clockMs.now;
  const maxBytes = OVERHEAD + 4 + OVERHEAD + 4;
  const store = createMemoryStore({ maxBytes, maxEntries: 2, clock });

  await store.set('stale', liveEntry('dead', 100, 500));
  clockMs.now = 2_000;

  const fresh1 = liveEntry('one', 1_500, 9_000);
  const write = await store.set('live', fresh1);
  assert.equal(write.kind, 'stored');

  const stale = await store.get('stale');
  assert.equal(stale.kind, 'miss');

  const live = await store.get('live');
  assert.equal(live.kind, 'hit');
});

test('createMemoryStore: admits payload that exactly fills remaining byte budget', async () => {
  const clock = () => 1_000;
  const payloadLen = 50;
  const maxBytes = OVERHEAD + payloadLen;
  const store = createMemoryStore({ maxBytes, maxEntries: 4, clock });

  const entry = liveEntry('x'.repeat(payloadLen), 100, 5_000);
  const write = await store.set('exact', entry);
  assert.equal(write.kind, 'stored');

  const hit = await store.get('exact');
  assert.equal(hit.kind, 'hit');
  if (hit.kind === 'hit') {
    assert.equal(hit.entry.bytes.length, payloadLen);
  }
});

test('createMemoryStore: many tiny entries stop at maxEntries while bytes remain', async () => {
  const clock = () => 1_000;
  const store = createMemoryStore({
    maxBytes: 100_000,
    maxEntries: 3,
    clock,
  });

  for (const key of ['k1', 'k2', 'k3']) {
    const w = await store.set(key, liveEntry('z', 100, 9_000));
    assert.equal(w.kind, 'stored');
  }

  const fourth = await store.set('k4', liveEntry('z', 100, 9_000));
  assert.equal(fourth.kind, 'stored');

  const missOld = await store.get('k1');
  assert.equal(missOld.kind, 'miss');
  const stillThere = await store.get('k3');
  assert.equal(stillThere.kind, 'hit');
});

test('createMemoryStore: oversize write is skipped and does not evict neighbors', async () => {
  const clock = () => 1_000;
  const neighborPayload = 10;
  const maxBytes = OVERHEAD + neighborPayload + 1;
  const store = createMemoryStore({ maxBytes, maxEntries: 4, clock });

  await store.set(
    'neighbor',
    liveEntry('n'.repeat(neighborPayload), 100, 9_000),
  );

  const tooBig = liveEntry('huge', 100, 9_000);
  tooBig.bytes = new Uint8Array(maxBytes - OVERHEAD + 1);
  const skipped = await store.set('big', tooBig);
  assert.equal(skipped.kind, 'skipped');
  if (skipped.kind === 'skipped') {
    assert.equal(skipped.reason, 'oversize');
  }

  const neighbor = await store.get('neighbor');
  assert.equal(neighbor.kind, 'hit');
});

test('createMemoryStore: expired set is skipped and not stored', async () => {
  const clock = () => 5_000;
  const store = createMemoryStore({ maxBytes: 4_096, maxEntries: 8, clock });

  const expired = liveEntry('late', 100, 4_000);
  const write = await store.set('expired-key', expired);
  assert.equal(write.kind, 'skipped');
  if (write.kind === 'skipped') {
    assert.equal(write.reason, 'expired');
  }

  const lookup = await store.get('expired-key');
  assert.equal(lookup.kind, 'miss');
});

test('createWeightedLru: invalid weight rejects without evicting neighbors', () => {
  const lru = createWeightedLru<{ w: number }>({
    maxBytes: 10_000,
    maxEntries: 10,
    weight: (v) => v.w,
    copy: (v) => ({ w: v.w }),
  });

  assert.equal(lru.set('keep', { w: 10 }), true);
  assert.equal(lru.set('bad', { w: 1.5 as unknown as number }), false);
  assert.equal(lru.get('keep')?.w, 10);
});

test('createMemoryStore: get copies bytes so caller mutation does not affect stored value', async () => {
  const clock = () => 1_000;
  const store = createMemoryStore({ maxBytes: 4_096, maxEntries: 8, clock });

  const bytes = new Uint8Array([1, 2, 3]);
  await store.set('buf', {
    bytes,
    observedAtMs: 100,
    expiresAtMs: 9_000,
  });

  const hit = await store.get('buf');
  assert.equal(hit.kind, 'hit');
  if (hit.kind === 'hit') {
    hit.entry.bytes[0] = 99;
  }

  const again = await store.get('buf');
  assert.equal(again.kind, 'hit');
  if (again.kind === 'hit') {
    assert.deepEqual([...again.entry.bytes], [1, 2, 3]);
  }
});
