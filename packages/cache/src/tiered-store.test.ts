import assert from 'node:assert/strict';
import test from 'node:test';

import { createFakeStore } from './core/test-stores.js';
import { createMemoryStore, createTieredStore } from './memory/index.js';
import type { CacheEntry, CacheStore } from './core/cache-store.js';

function liveEntry(
  payload: string,
  observedAtMs: number,
  expiresAtMs: number,
): CacheEntry {
  return {
    bytes: new TextEncoder().encode(payload),
    observedAtMs,
    expiresAtMs,
  };
}

function throwingStore(side: 'get' | 'set' | 'both'): CacheStore {
  return {
    async get() {
      if (side === 'get' || side === 'both') {
        throw new Error('l2 get failed');
      }
      return { kind: 'miss' };
    },
    async set() {
      if (side === 'set' || side === 'both') {
        throw new Error('l2 set failed');
      }
      return { kind: 'stored' };
    },
  };
}

test('createTieredStore: L2 live hit promotes to L1 with same expiry metadata', async () => {
  const clockMs = { now: 10_000 };
  const clock = () => clockMs.now;
  const observedAtMs = 9_000;
  const expiresAtMs = 13_000;

  const l1 = createFakeStore(clock);
  const l2 = createFakeStore(clock);
  const tiered = createTieredStore({ l1, l2, clock });

  await l2.set('k', liveEntry('payload', observedAtMs, expiresAtMs));

  const hit = await tiered.get('k');
  assert.equal(hit.kind, 'hit');
  if (hit.kind === 'hit') {
    assert.equal(hit.entry.expiresAtMs, expiresAtMs);
    assert.equal(hit.entry.observedAtMs, observedAtMs);
    assert.equal(new TextDecoder().decode(hit.entry.bytes), 'payload');
  }

  const l1Only = await l1.get('k');
  assert.equal(l1Only.kind, 'hit');
  if (l1Only.kind === 'hit' && hit.kind === 'hit') {
    assert.equal(l1Only.entry.expiresAtMs, expiresAtMs);
    assert.equal(l1Only.entry.observedAtMs, observedAtMs);
    hit.entry.bytes[0] = hit.entry.bytes[0]! ^ 0xff;
    const l1Again = await l1.get('k');
    assert.equal(l1Again.kind, 'hit');
    if (l1Again.kind === 'hit') {
      assert.notEqual(l1Again.entry.bytes[0], hit.entry.bytes[0]);
    }
  }
});

test('createTieredStore: degraded L2 does not break L1 get/set', async () => {
  const clock = () => 1_000;
  const l1 = createMemoryStore({ maxBytes: 8_192, maxEntries: 16, clock });
  const l2 = throwingStore('both');
  const tiered = createTieredStore({ l1, l2, clock });

  const entry = liveEntry('local', 100, 9_000);
  const write = await tiered.set('local-key', entry);
  assert.equal(write.kind, 'stored');

  const hit = await tiered.get('local-key');
  assert.equal(hit.kind, 'hit');
  if (hit.kind === 'hit') {
    assert.equal(new TextDecoder().decode(hit.entry.bytes), 'local');
  }
});

test('createTieredStore: L1 set throw still writes L2', async () => {
  const clock = () => 1_000;
  const l1 = throwingStore('set');
  const l2 = createFakeStore(clock);
  const tiered = createTieredStore({ l1, l2, clock });

  const entry = liveEntry('remote', 100, 9_000);
  const write = await tiered.set('k', entry);
  assert.equal(write.kind, 'stored');

  const l2Hit = await l2.get('k');
  assert.equal(l2Hit.kind, 'hit');
});

test('createTieredStore: expired L2 entry is not promoted or returned as hit', async () => {
  const clockMs = { now: 5_000 };
  const clock = () => clockMs.now;
  const l1 = createFakeStore(clock);
  const stale = liveEntry('old', 100, 4_000);
  const l2: CacheStore = {
    async get(key: string) {
      if (key === 'stale') {
        return { kind: 'hit', entry: stale };
      }
      return { kind: 'miss' };
    },
    async set() {
      return { kind: 'stored' };
    },
  };
  const tiered = createTieredStore({ l1, l2, clock });

  const lookup = await tiered.get('stale');
  assert.equal(lookup.kind, 'bypass');
  if (lookup.kind === 'bypass') {
    assert.equal(lookup.reason, 'expired');
  }

  const l1Miss = await l1.get('stale');
  assert.equal(l1Miss.kind, 'miss');
});
