import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

import { bytesCodec, jsonCodec } from './codecs/index.js';
import { createDisabledStore, createFakeStore } from './core/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function nullableStringParse(value: unknown): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  throw new Error('expected string or null');
}

test('jsonCodec: JSON null round-trip is distinct from a store miss', async () => {
  const codec = jsonCodec(nullableStringParse);
  const clock = () => 1_000;
  const store = createFakeStore(clock);
  const key = 'null-key';

  const miss = await store.get(key);
  assert.equal(miss.kind, 'miss');

  const encodedNull = codec.encode(null);
  const expiresAtMs = 5_000;
  const write = await store.set(key, {
    bytes: encodedNull,
    observedAtMs: 500,
    expiresAtMs,
  });
  assert.equal(write.kind, 'stored');

  const hit = await store.get(key);
  assert.equal(hit.kind, 'hit');
  if (hit.kind !== 'hit') {
    return;
  }
  assert.equal(codec.decode(hit.entry.bytes), null);
});

test('jsonCodec: malformed JSON throws on decode', () => {
  const codec = jsonCodec((value: unknown) => value);
  const garbage = new TextEncoder().encode('{not-json');
  assert.throws(() => codec.decode(garbage), /malformed JSON/i);
});

test('jsonCodec: schema parse failure throws on decode', () => {
  const codec = jsonCodec((value: unknown) => {
    if (typeof value === 'number') {
      return value;
    }
    throw new Error('expected number');
  });
  const bytes = new TextEncoder().encode(JSON.stringify('text'));
  assert.throws(() => codec.decode(bytes), /expected number/);
});

test('createFakeStore: oversize write is skipped and does not become a hit', async () => {
  const clock = () => 1_000;
  const store = createFakeStore(clock);
  const key = 'big';
  const oversize = new Uint8Array(1_048_577);

  const write = await store.set(key, {
    bytes: oversize,
    observedAtMs: 100,
    expiresAtMs: 9_000,
  });
  assert.equal(write.kind, 'skipped');
  if (write.kind === 'skipped') {
    assert.equal(write.reason, 'oversize');
  }

  const lookup = await store.get(key);
  assert.equal(lookup.kind, 'miss');
});

test('bytesCodec: encode and decode copy bytes so mutations do not alias storage', async () => {
  const codec = bytesCodec();
  const clock = () => 2_000;
  const store = createFakeStore(clock);
  const source = new Uint8Array([1, 2, 3, 4]);

  const encoded = codec.encode(source);
  source[0] = 99;
  assert.deepEqual(Array.from(encoded), [1, 2, 3, 4]);

  const key = 'bytes-key';
  await store.set(key, {
    bytes: encoded,
    observedAtMs: 100,
    expiresAtMs: 10_000,
  });

  const hit = await store.get(key);
  assert.equal(hit.kind, 'hit');
  if (hit.kind !== 'hit') {
    return;
  }

  const decoded = codec.decode(hit.entry.bytes);
  decoded[1] = 88;
  assert.equal(hit.entry.bytes[1], 2);

  const hitAgain = await store.get(key);
  assert.equal(hitAgain.kind, 'hit');
  if (hitAgain.kind !== 'hit') {
    return;
  }
  assert.equal(hitAgain.entry.bytes[1], 2);
});

test('createDisabledStore: get and set always bypass with reason disabled', async () => {
  const store = createDisabledStore();
  const get = await store.get('any');
  assert.deepEqual(get, { kind: 'bypass', reason: 'disabled' });

  const set = await store.set('any', {
    bytes: new Uint8Array([0]),
    observedAtMs: 1,
    expiresAtMs: 9_999,
  });
  assert.deepEqual(set, { kind: 'bypass', reason: 'disabled' });
});

test('core sources do not reference the redis package', () => {
  const coreDir = join(__dirname, 'core');
  for (const fileName of readdirSync(coreDir)) {
    if (!fileName.endsWith('.ts')) {
      continue;
    }
    const text = readFileSync(join(coreDir, fileName), 'utf8');
    assert.doesNotMatch(text, /\bfrom\s+['"]redis['"]/);
    assert.doesNotMatch(text, /\bimport\s*\(\s*['"]redis['"]\s*\)/);
  }
});

test('dist/core loads without importing redis', async () => {
  const distCore = join(__dirname, '..', 'dist', 'core', 'index.js');
  const loaded = await import(pathToFileURL(distCore).href);
  assert.ok(loaded.createFakeStore);
  assert.ok(loaded.jsonCodec === undefined);
});
