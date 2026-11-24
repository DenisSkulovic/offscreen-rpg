import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import {
  LocalDocumentStore,
  S3DocumentStore,
  canonicalDocumentSchema,
  DocumentStorageError,
  createDocumentImmutableReadCache,
  documentReadKind,
  makeCacheKey,
  CACHE_NAMESPACE,
  CACHE_VERSION,
  packEnvelope,
  sha256,
  canonicalJson,
} from '../dist/index.js';

function memoryS3() {
  const objects = new Map();
  const client = {
    async send(command) {
      const name = command.constructor.name;
      const key = command.input.Key;
      if (name === 'PutObjectCommand') {
        if (command.input.IfNoneMatch === '*' && objects.has(key)) {
          const error = new Error('PreconditionFailed');
          error.name = 'PreconditionFailed';
          error.$metadata = { httpStatusCode: 412 };
          throw error;
        }
        objects.set(key, command.input.Body);
        return {};
      }
      if (name === 'GetObjectCommand') {
        if (!objects.has(key)) {
          const error = new Error('NoSuchKey');
          error.name = 'NoSuchKey';
          error.$metadata = { httpStatusCode: 404 };
          throw error;
        }
        return { Body: objects.get(key) };
      }
      if (name === 'HeadObjectCommand') {
        return {
          ContentLength: objects.has(key) ? objects.get(key).length : 0,
        };
      }
      throw new Error(`unexpected ${name}`);
    },
  };
  return { objects, client };
}

function sampleDocument() {
  return canonicalDocumentSchema.parse({
    format: 'offscreen.document.v1',
    envelope: {
      documentId: randomUUID(),
      kind: 'lore',
      schemaVersion: 1,
      revision: 1,
      authority: 'canon',
      visibility: 'player-known',
      sources: [],
    },
    title: 'Cache proof',
    body: 'Immutable read decorator',
  });
}

test('readValidated reuses cache and loads origin once', async () => {
  const cache = createDocumentImmutableReadCache();
  let originLoads = 0;
  const document = sampleDocument();
  const bytes = canonicalJson(document);
  const hash = sha256(bytes);

  const first = await cache.readValidated(
    hash,
    documentReadKind.canonicalDocument,
    canonicalDocumentSchema,
    async () => {
      originLoads += 1;
      return bytes;
    },
  );
  const second = await cache.readValidated(
    hash,
    documentReadKind.canonicalDocument,
    canonicalDocumentSchema,
    async () => {
      originLoads += 1;
      return bytes;
    },
  );

  assert.deepEqual(first, document);
  assert.deepEqual(second, document);
  assert.equal(originLoads, 1);
});

test('corrupt cached bytes reload origin once', async () => {
  const cache = createDocumentImmutableReadCache({ clock: () => 5_000 });
  const document = sampleDocument();
  const bytes = canonicalJson(document);
  const hash = sha256(bytes);
  let originLoads = 0;

  await cache.readValidated(
    hash,
    documentReadKind.canonicalDocument,
    canonicalDocumentSchema,
    async () => {
      originLoads += 1;
      return bytes;
    },
  );

  const identity = [hash, documentReadKind.canonicalDocument];
  const key = makeCacheKey(
    cache.environment,
    CACHE_NAMESPACE,
    CACHE_VERSION,
    identity,
  );
  const corruptPayload = canonicalJson({ ...document, title: 'tampered' });
  const corruptEnvelope = packEnvelope(
    hash,
    documentReadKind.canonicalDocument,
    corruptPayload,
  );
  await cache.cacheStore.set(key, {
    bytes: corruptEnvelope,
    observedAtMs: 5_000,
    expiresAtMs: 5_000 + 60_000,
  });

  const reloaded = await cache.readValidated(
    hash,
    documentReadKind.canonicalDocument,
    canonicalDocumentSchema,
    async () => {
      originLoads += 1;
      return bytes;
    },
  );

  assert.deepEqual(reloaded, document);
  assert.equal(originLoads, 2);
});

test('cache absent uses direct origin on every readValidated', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-doc-cache-off-'));
  try {
    const store = new LocalDocumentStore(root);
    const document = sampleDocument();
    const hash = await store.putDocument(document);
    assert.deepEqual(await store.readDocument(hash), document);
    assert.deepEqual(await store.readDocument(hash), document);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('corrupt origin bytes are not cached; valid origin load can succeed afterward', async () => {
  const cache = createDocumentImmutableReadCache({ clock: () => 2_000 });
  const document = sampleDocument();
  const validBytes = canonicalJson(document);
  const hash = sha256(validBytes);
  const corruptBytes = canonicalJson({ ...document, title: 'hash mismatch' });
  let originLoads = 0;

  await assert.rejects(
    () =>
      cache.readValidated(
        hash,
        documentReadKind.canonicalDocument,
        canonicalDocumentSchema,
        async () => {
          originLoads += 1;
          return corruptBytes;
        },
      ),
    (error) =>
      error instanceof DocumentStorageError && error.code === 'corrupt',
  );

  const key = makeCacheKey(cache.environment, CACHE_NAMESPACE, CACHE_VERSION, [
    hash,
    documentReadKind.canonicalDocument,
  ]);
  const beforeValid = await cache.cacheStore.get(key);
  assert.notEqual(beforeValid.kind, 'hit');

  const parsed = await cache.readValidated(
    hash,
    documentReadKind.canonicalDocument,
    canonicalDocumentSchema,
    async () => {
      originLoads += 1;
      return validBytes;
    },
  );
  assert.deepEqual(parsed, document);

  await cache.readValidated(
    hash,
    documentReadKind.canonicalDocument,
    canonicalDocumentSchema,
    async () => {
      originLoads += 1;
      return validBytes;
    },
  );
  assert.equal(originLoads, 2);
});

test('corrupt origin schema bytes are not cached', async () => {
  const cache = createDocumentImmutableReadCache();
  const invalidBytes = '{"format":"offscreen.document.v1","envelope":{}}\n';
  const hash = sha256(invalidBytes);
  let originLoads = 0;

  await assert.rejects(
    () =>
      cache.readValidated(
        hash,
        documentReadKind.canonicalDocument,
        canonicalDocumentSchema,
        async () => {
          originLoads += 1;
          return invalidBytes;
        },
      ),
    (error) =>
      error instanceof DocumentStorageError && error.code === 'corrupt',
  );

  const key = makeCacheKey(cache.environment, CACHE_NAMESPACE, CACHE_VERSION, [
    hash,
    documentReadKind.canonicalDocument,
  ]);
  const lookup = await cache.cacheStore.get(key);
  assert.notEqual(lookup.kind, 'hit');
  assert.equal(originLoads, 1);
});

test('write verification still reads storage when cache is warm', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-doc-cache-verify-'));
  const cache = createDocumentImmutableReadCache();
  const store = new LocalDocumentStore(root, { immutableReadCache: cache });
  const document = sampleDocument();
  const hash = await store.putDocument(document);

  assert.deepEqual(await store.readDocument(hash), document);

  const objectPath = join(
    root,
    'objects',
    'sha256',
    hash.slice(0, 2),
    `${hash}.json`,
  );
  await writeFile(objectPath, '{"format":"tampered"}\n', 'utf8');

  await assert.rejects(
    () => store.putDocument(document),
    (error) =>
      error instanceof DocumentStorageError && error.code === 'corrupt',
  );
});

test('S3 putValidated readRaw bypasses warm readValidated cache', async () => {
  const memory = memoryS3();
  const cache = createDocumentImmutableReadCache();
  const store = new S3DocumentStore({
    bucket: 'offscreen-cas',
    region: 'us-east-1',
    prefix: `cache-readraw/${randomUUID()}`,
    client: memory.client,
    immutableReadCache: cache,
  });
  const document = sampleDocument();
  const hash = await store.putDocument(document);

  assert.deepEqual(await store.readDocument(hash), document);

  const objectKey = [...memory.objects.keys()][0];
  memory.objects.set(objectKey, Buffer.from('{"format":"tampered"}\n', 'utf8'));

  await assert.rejects(
    () => store.putDocument(document),
    (error) =>
      error instanceof DocumentStorageError && error.code === 'corrupt',
  );

  assert.deepEqual(await store.readDocument(hash), document);
});
