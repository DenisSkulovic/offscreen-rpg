import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  LocalDocumentStore,
  applyLibraryBatch,
  canonicalDocumentSchema,
  createEmptyLibraryIndex,
  documentManifestSchema,
  hashCanonicalJson,
} from '@offscreen/documents';
import { resolveOwnedLibraryDocument } from '../../../packages/story-engine/dist/stories/documents.js';
import { StoryError } from '../../../packages/story-engine/dist/stories/errors.js';

async function stageV2Document(storage, args) {
  const document = canonicalDocumentSchema.parse({
    format: 'offscreen.document.v1',
    envelope: {
      documentId: args.documentId,
      schemaVersion: 1,
      revision: args.revision ?? 1,
      kind: 'lore',
      authority: 'canon',
      visibility: 'player-known',
      sources: [],
    },
    title: args.title ?? 'Note',
    body: args.body,
  });
  const objectHash = await storage.putDocument(document);
  let library = createEmptyLibraryIndex();
  library = applyLibraryBatch(library, [
    {
      op: 'create',
      entry: {
        documentId: args.documentId,
        revision: args.revision ?? 1,
        path: args.path,
        objectHash,
        kind: 'lore',
        authority: 'canon',
        visibility: 'player-known',
      },
    },
  ]);
  for (const [hash, node] of library.store.entries()) {
    await storage.putLibraryNode(node);
  }
  const rootHash = await storage.putLibraryRoot(library.root);
  return { rootHash, objectHash, document };
}

test('resolveOwnedLibraryDocument returns v2 provenance for indexed documents', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'offscreen-v2-read-'));
  const storage = new LocalDocumentStore(rootDir);
  const documentId = randomUUID();
  const { rootHash, objectHash, document } = await stageV2Document(storage, {
    documentId,
    path: 'lore/note.md',
    body: 'A sealed note.',
  });
  const resolved = await resolveOwnedLibraryDocument(storage, {
    rootHash,
    documentId,
  });
  assert.notEqual(resolved, 'v1-fallback');
  assert.equal(resolved.rootHash, rootHash);
  assert.equal(resolved.documentId, documentId);
  assert.equal(resolved.objectHash, objectHash);
  assert.equal(resolved.path, 'lore/note.md');
  assert.equal(resolved.document.body, document.body);
});

test('resolveOwnedLibraryDocument reports missing IDs and bad objects', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'offscreen-v2-read-miss-'));
  const storage = new LocalDocumentStore(rootDir);
  const documentId = randomUUID();
  const { rootHash } = await stageV2Document(storage, {
    documentId,
    path: 'lore/missing.md',
    body: 'Absent from ID trie.',
  });
  await assert.rejects(
    () =>
      resolveOwnedLibraryDocument(storage, {
        rootHash,
        documentId: randomUUID(),
      }),
    (error) => error instanceof StoryError && error.code === 'not_found',
  );
  let library = createEmptyLibraryIndex();
  const otherId = randomUUID();
  const wrongBody = canonicalDocumentSchema.parse({
    format: 'offscreen.document.v1',
    envelope: {
      documentId: otherId,
      schemaVersion: 1,
      revision: 1,
      kind: 'lore',
      authority: 'canon',
      visibility: 'player-known',
      sources: [],
    },
    title: 'Mismatch',
    body: 'Different identity.',
  });
  const objectHash = await storage.putDocument(wrongBody);
  library = applyLibraryBatch(library, [
    {
      op: 'create',
      entry: {
        documentId,
        revision: 1,
        path: 'lore/mismatch.md',
        objectHash,
        kind: 'lore',
        authority: 'canon',
        visibility: 'player-known',
      },
    },
  ]);
  for (const [, node] of library.store.entries()) {
    await storage.putLibraryNode(node);
  }
  const corruptRoot = await storage.putLibraryRoot(library.root);
  await assert.rejects(
    () =>
      resolveOwnedLibraryDocument(storage, {
        rootHash: corruptRoot,
        documentId,
      }),
    /Document object does not match/,
  );
});

test('resolveOwnedLibraryDocument falls back for v1 manifest roots', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'offscreen-v1-fallback-'));
  const storage = new LocalDocumentStore(rootDir);
  const campaignId = randomUUID();
  const documentId = randomUUID();
  const document = canonicalDocumentSchema.parse({
    format: 'offscreen.document.v1',
    envelope: {
      documentId,
      schemaVersion: 1,
      revision: 1,
      kind: 'lore',
      authority: 'canon',
      visibility: 'player-known',
      sources: [],
    },
    title: 'History',
    body: 'Older root format.',
  });
  const objectHash = await storage.putDocument(document);
  const manifest = documentManifestSchema.parse({
    format: 'offscreen.manifest.v1',
    campaignId,
    revision: 1,
    previousRootHash: null,
    authorOperationId: randomUUID(),
    entries: [
      {
        documentId,
        revision: 1,
        path: 'lore/history.md',
        objectHash,
        kind: 'lore',
        authority: 'canon',
        visibility: 'player-known',
      },
    ],
  });
  const rootHash = await storage.putManifest(manifest);
  const resolved = await resolveOwnedLibraryDocument(storage, {
    rootHash,
    documentId,
  });
  assert.equal(resolved, 'v1-fallback');
});