import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  applyLibraryBatch,
  canonicalDocumentSchema,
  createEmptyLibraryIndex,
  hashCanonicalJson,
} from '@offscreen/documents';
import {
  createPinnedLibraryNavigation,
  LibraryNavigationError,
} from '../dist/storyteller/library-navigation.js';

const storyId = randomUUID();
const rootHash = 'c'.repeat(64);
const otherRootHash = 'd'.repeat(64);

function buildV2Library({ count = 200, visibility = 'player-known', includePrivate = false } = {}) {
  let library = createEmptyLibraryIndex();
  const objects = new Map();
  const operations = [];
  for (let index = 1; index <= count; index += 1) {
    const documentId = randomUUID();
    const path = `lore/scene-${String(index).padStart(3, '0')}.md`;
    const document = canonicalDocumentSchema.parse({
      format: 'offscreen.document.v1',
      envelope: {
        documentId,
        schemaVersion: 1,
        revision: 1,
        kind: 'lore',
        authority: 'canon',
        visibility,
        sources: [],
      },
      title: `Scene ${index}`,
      body: `Ledger for ${path}`,
    });
    const objectHash = hashCanonicalJson(document);
    objects.set(objectHash, {
      envelope: document.envelope,
      body: document.body,
    });
    operations.push({
      op: 'create',
      entry: {
        documentId,
        revision: 1,
        path,
        objectHash,
        kind: 'lore',
        authority: 'canon',
        visibility,
      },
    });
  }
  if (includePrivate) {
    const documentId = randomUUID();
    const path = 'private/ledger.md';
    const document = canonicalDocumentSchema.parse({
      format: 'offscreen.document.v1',
      envelope: {
        documentId,
        schemaVersion: 1,
        revision: 1,
        kind: 'lore',
        authority: 'noncanonical',
        visibility: 'storyteller-private',
        sources: [],
      },
      title: 'Private ledger',
      body: 'Hidden draft.',
    });
    const objectHash = hashCanonicalJson(document);
    objects.set(objectHash, {
      envelope: document.envelope,
      body: document.body,
    });
    operations.push({
      op: 'create',
      entry: {
        documentId,
        revision: 1,
        path,
        objectHash,
        kind: 'lore',
        authority: 'noncanonical',
        visibility: 'storyteller-private',
      },
    });
  }
  library = applyLibraryBatch(library, operations);
  const nodes = new Map(library.store);
  const roots = new Map([[rootHash, library.root]]);
  const calls = { manifest: 0, body: 0 };
  const reader = {
    async readManifest() {
      calls.manifest += 1;
      throw new Error('readManifest must not be called for v2 navigation');
    },
    async readLibraryRoot(hash) {
      const root = roots.get(hash);
      if (root === undefined) throw new Error('missing root');
      return root;
    },
    async readLibraryNode(hash) {
      const node = nodes.get(hash);
      if (node === undefined) throw new Error(`missing node ${hash}`);
      return node;
    },
    async readDocument(hash) {
      calls.body += 1;
      return objects.get(hash);
    },
    async readSourcePassage(hash) {
      calls.body += 1;
      const value = objects.get(hash);
      return { envelope: value.envelope, content: { paragraphs: [value.body] } };
    },
  };
  return { reader, calls, authorize: async () => ({ privateDocuments: false }), library };
}

function expectCode(code) {
  return (error) => error instanceof LibraryNavigationError && error.code === code;
}

test('v2 browse pages 200 lore paths without readManifest', async () => {
  const { reader, calls, authorize } = buildV2Library({ count: 200 });
  const desk = createPinnedLibraryNavigation({
    reader,
    storyId,
    rootHash,
    rootRevision: 0,
    authorize,
  });
  let after;
  const all = [];
  do {
    const page = await desk.browse({ prefix: 'lore/', pageSize: 32, after });
    all.push(...page.entries);
    after = page.nextAfter ?? undefined;
  } while (after !== undefined);
  assert.equal(all.length, 200);
  assert.deepEqual(
    all.map((entry) => entry.path),
    all.map((entry) => entry.path).slice().sort(),
  );
  assert.equal(all[0].path, 'lore/scene-001.md');
  assert.equal(all.at(-1).path, 'lore/scene-200.md');
  assert.equal(calls.manifest, 0);
  assert.equal(calls.body, 0);
});

test('v2 navigation fails closed on authorization and stale cursor', async () => {
  const { reader } = buildV2Library({ count: 1 });
  const desk = createPinnedLibraryNavigation({
    reader,
    storyId,
    rootHash,
    rootRevision: 0,
    authorize: async () => null,
  });
  await assert.rejects(() => desk.browse(), expectCode('not-authorized'));
  const openDesk = createPinnedLibraryNavigation({
    reader,
    storyId,
    rootHash,
    rootRevision: 0,
    authorize: async () => ({ privateDocuments: false }),
  });
  await assert.rejects(
    () =>
      openDesk.browse({
        cursor: { rootHash: otherRootHash, prefix: 'lore/', after: undefined },
      }),
    expectCode('stale-root'),
  );
});

test('v2 browse hides storyteller-private documents before body reads', async () => {
  const { reader, calls, authorize } = buildV2Library({
    count: 2,
    includePrivate: true,
  });
  const desk = createPinnedLibraryNavigation({
    reader,
    storyId,
    rootHash,
    rootRevision: 0,
    authorize,
  });
  const page = await desk.browse({ prefix: 'lore/' });
  assert.equal(page.entries.length, 2);
  await assert.rejects(() => desk.open({ path: 'private/ledger.md' }), expectCode('not-found'));
  assert.equal(calls.body, 0);
});

test('v2 open rejects mismatched stored envelopes', async () => {
  const { reader, library } = buildV2Library({ count: 1 });
  const entry = await (async () => {
    let after;
    const desk = createPinnedLibraryNavigation({
      reader,
      storyId,
      rootHash,
      rootRevision: 0,
      authorize: async () => ({ privateDocuments: true }),
    });
    const page = await desk.browse();
    return page.entries[0];
  })();
  reader.readDocument = async () => ({
    envelope: {
      documentId: randomUUID(),
      revision: 1,
      kind: 'lore',
      authority: 'canon',
      visibility: 'player-known',
    },
    body: 'wrong',
  });
  const desk = createPinnedLibraryNavigation({
    reader,
    storyId,
    rootHash,
    rootRevision: 0,
    authorize: async () => ({ privateDocuments: true }),
  });
  await assert.rejects(() => desk.open({ path: entry.path }), expectCode('corrupt-source'));
  assert.equal(library.root.format, 'offscreen.library-root.v2');
});