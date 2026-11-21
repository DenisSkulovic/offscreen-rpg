import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  disabledReadCache,
  type ReadCache,
  type ReadCacheWrite,
} from '../src/read-cache';

type GetReturn = Awaited<ReturnType<ReadCache['get']>>;
const getReturnsUnknownOrNull: GetReturn extends unknown | null
  ? true
  : never = true;
void getReturnsUnknownOrNull;

async function acceptUnknownValue(
  cache: ReadCache,
  value: unknown,
): Promise<void> {
  await cache.set('proof-key', value, { ttlSeconds: 60, maxBytes: 1024 });
}

function assertWriteBoundsRequired(cache: ReadCache): void {
  // @ts-expect-error ttlSeconds is required on ReadCacheWrite
  void cache.set('k', null, { maxBytes: 1 });
  // @ts-expect-error maxBytes is required on ReadCacheWrite
  void cache.set('k', null, { ttlSeconds: 1 });
}

const _writeShape: ReadCacheWrite = { ttlSeconds: 1, maxBytes: 1 };
void _writeShape;
void assertWriteBoundsRequired;
void acceptUnknownValue;

test('MA02 T01: disabled read cache returns null and set resolves', async () => {
  assert.equal(await disabledReadCache.get('any-key'), null);
  await assert.doesNotReject(() =>
    disabledReadCache.set(
      'any-key',
      { payload: true },
      { ttlSeconds: 30, maxBytes: 512 },
    ),
  );
  await acceptUnknownValue(disabledReadCache, 42);
});
