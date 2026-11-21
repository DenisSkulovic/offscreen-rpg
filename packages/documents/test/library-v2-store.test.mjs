import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import {
  DocumentStorageError,
  LocalDocumentStore,
  S3DocumentStore,
  hashCanonicalJson,
  libraryNodeV2Schema,
  libraryRootV2Schema,
} from '../dist/index.js';

const HASH = 'a'.repeat(64);
const OTHER_HASH = 'b'.repeat(64);

function canonicalLibraryNode() {
  return libraryNodeV2Schema.parse({
    format: 'offscreen.library-node.v2',
    value: {
      documentId: '00000000-0000-4000-8000-000000000001',
      path: 'lore/note.md',
    },
    children: [
      { nibble: '0', hash: HASH },
      { nibble: 'f', hash: OTHER_HASH },
    ],
  });
}

function canonicalLibraryRoot() {
  return libraryRootV2Schema.parse({
    format: 'offscreen.library-root.v2',
    pathsRootHash: HASH,
    idsRootHash: OTHER_HASH,
  });
}

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
      throw new Error(`unexpected ${name}`);
    },
  };
  return { objects, client };
}

async function assertLibraryV2RoundTrip(store, objects, rootDir) {
  const node = canonicalLibraryNode();
  const root = canonicalLibraryRoot();
  const nodeHash = await store.putLibraryNode(node);
  const rootHash = await store.putLibraryRoot(root);
  assert.equal(nodeHash, hashCanonicalJson(node));
  assert.equal(rootHash, hashCanonicalJson(root));
  assert.deepEqual(await store.readLibraryNode(nodeHash), node);
  assert.deepEqual(await store.readLibraryRoot(rootHash), root);

  await assert.rejects(
    () => store.readLibraryNode('cd'.repeat(32)),
    (error) => error instanceof DocumentStorageError && error.code === 'missing',
  );

  if (rootDir) {
    const path = join(
      rootDir,
      'objects',
      'sha256',
      nodeHash.slice(0, 2),
      `${nodeHash}.json`,
    );
    const original = await readFile(path, 'utf8');
    await writeFile(path, '{"format":"tampered"}\n');
    await assert.rejects(
      () => store.readLibraryNode(nodeHash),
      (error) => error instanceof DocumentStorageError && error.code === 'corrupt',
    );
    await assert.rejects(
      () => store.putLibraryNode(node),
      (error) => error instanceof DocumentStorageError && error.code === 'corrupt',
    );
    assert.notEqual(await readFile(path, 'utf8'), original);
    return;
  }

  const [key] = [...objects.keys()];
  objects.set(key, '{"format":"tampered"}\n');
  await assert.rejects(
    () => store.readLibraryNode(nodeHash),
    (error) => error instanceof DocumentStorageError && error.code === 'corrupt',
  );
  await assert.rejects(
    () => store.putLibraryNode(node),
    (error) => error instanceof DocumentStorageError && error.code === 'corrupt',
  );
}

test('local library v2 round-trips and rejects missing or corrupt hashes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-library-v2-'));
  const store = new LocalDocumentStore(root);
  await assertLibraryV2RoundTrip(store, null, root);
});

test('mock S3 library v2 round-trips and rejects missing or corrupt hashes', async () => {
  const memory = memoryS3();
  const store = new S3DocumentStore({
    bucket: 'offscreen-cas',
    region: 'us-east-1',
    prefix: `library-v2/${randomUUID()}`,
    client: memory.client,
  });
  await assertLibraryV2RoundTrip(store, memory.objects, null);
});