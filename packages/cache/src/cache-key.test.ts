import assert from 'node:assert/strict';
import test from 'node:test';

import {
  defineCache,
  makeCacheKey,
  validateCacheDefinition,
} from './core/index.js';
import type { CacheCodec, CacheDefinition } from './core/index.js';

const passthroughCodec: CacheCodec<unknown> = {
  encode(value) {
    return new TextEncoder().encode(String(value));
  },
  decode(bytes) {
    return new TextDecoder().decode(bytes);
  },
};

function validPolicy() {
  return {
    ttlMs: 60_000,
    maxEntryBytes: 4096,
    jitterRatio: 0.1,
    maxActiveKeys: 128,
    maxWaitersPerKey: 8,
    originConcurrency: 4,
    originQueueLimit: 32,
    originQueueTimeoutMs: 5_000,
  } as const;
}

function validDefinition(
  overrides: Partial<CacheDefinition<unknown>> = {},
): CacheDefinition<unknown> {
  return {
    namespace: 'story',
    version: 1,
    consistency: 'expiring',
    codec: passthroughCodec,
    policy: validPolicy(),
    ...overrides,
  };
}

test('tuple collision: different tuples produce different keys; same tuple is stable', () => {
  const base = { environment: 'dev', namespace: 'story', version: 1 } as const;
  const keyA = makeCacheKey(base.environment, base.namespace, base.version, [
    'alpha',
  ]);
  const keyB = makeCacheKey(base.environment, base.namespace, base.version, [
    'beta',
  ]);
  const keyA2 = makeCacheKey(base.environment, base.namespace, base.version, [
    'alpha',
  ]);
  assert.notEqual(keyA, keyB);
  assert.equal(keyA, keyA2);
  assert.match(keyA, /^dev:story:v1:[a-f0-9]{64}$/);
});

test('owner and schema separation: environment, namespace, and version change the key', () => {
  const identity = ['campaign', '42'] as const;
  const baseline = makeCacheKey('dev', 'story', 1, identity);
  assert.notEqual(makeCacheKey('prod', 'story', 1, identity), baseline);
  assert.notEqual(makeCacheKey('dev', 'documents', 1, identity), baseline);
  assert.notEqual(makeCacheKey('dev', 'story', 2, identity), baseline);
});

test('multi-component identity is length-prefixed and order-sensitive', () => {
  const a = makeCacheKey('dev', 'story', 1, ['x', 'y']);
  const b = makeCacheKey('dev', 'story', 1, ['y', 'x']);
  const single = makeCacheKey('dev', 'story', 1, ['xy']);
  assert.notEqual(a, b);
  assert.notEqual(a, single);
});

test('bounds: rejects invalid identity and tokens', () => {
  assert.throws(
    () => makeCacheKey('dev', 'story', 1, []),
    /at least one component/,
  );
  const many = Array.from({ length: 17 }, (_, index) => `c${index}`);
  assert.throws(() => makeCacheKey('dev', 'story', 1, many), /at most 16/);

  const oversized = 'a'.repeat(1025);
  assert.throws(
    () => makeCacheKey('dev', 'story', 1, [oversized]),
    /1–1024 UTF-8 bytes/,
  );

  const parts = Array.from({ length: 16 }, () => 'a'.repeat(257));
  assert.throws(() => makeCacheKey('dev', 'story', 1, parts), /4096 bytes/);

  assert.throws(() => makeCacheKey('DEV', 'story', 1, ['x']), /environment/);
  assert.throws(() => makeCacheKey('dev', 'Story', 1, ['x']), /namespace/);
  assert.throws(
    () => makeCacheKey('dev', 'story', 0, ['x']),
    /positive safe integer/,
  );

  const loneHigh = '\uD800';
  assert.throws(() => makeCacheKey('dev', 'story', 1, [loneHigh]), /unpaired/);
});

test('invalid config: ttl, maxEntryBytes ceiling, and jitter', () => {
  assert.throws(
    () =>
      validateCacheDefinition(
        validDefinition({ policy: { ...validPolicy(), ttlMs: 0 } }),
      ),
    /ttlMs/,
  );
  assert.throws(
    () =>
      validateCacheDefinition(
        validDefinition({
          policy: { ...validPolicy(), maxEntryBytes: 1_048_577 },
        }),
      ),
    /maxEntryBytes/,
  );
  assert.throws(
    () =>
      validateCacheDefinition(
        validDefinition({ policy: { ...validPolicy(), jitterRatio: 1.01 } }),
      ),
    /jitterRatio/,
  );
  assert.throws(
    () =>
      validateCacheDefinition(
        validDefinition({ policy: { ...validPolicy(), jitterRatio: -0.01 } }),
      ),
    /jitterRatio/,
  );
});

test('defineCache returns the same definition after validation', () => {
  const definition = validDefinition();
  assert.equal(defineCache(definition), definition);
});
