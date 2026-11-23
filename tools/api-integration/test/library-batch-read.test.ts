import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createPinnedLibraryNavigation,
  LibraryNavigationError,
} from '@offscreen/story-engine/storyteller/library-navigation';
import {
  LibraryBatchReadError,
  readLibraryDocumentsBatch,
} from '@offscreen/story-engine/storyteller/library-batch-read';

const storyId = '11111111-1111-4111-8111-111111111111';
const rootHash = 'ab'.repeat(32);

type Visibility = 'player-known' | 'storyteller-private' | 'developer-private';

function entry(
  index: number,
  path: string,
  visibility: Visibility = 'player-known',
) {
  return {
    documentId: `22222222-2222-4222-8222-${index.toString(16).padStart(12, '0')}`,
    revision: 3,
    path,
    objectHash: `cd${index.toString(16).padStart(2, '0')}`.padEnd(64, 'e'),
    kind: 'lore',
    authority: 'canon',
    visibility,
  };
}

function harness(options?: {
  entries?: ReturnType<typeof entry>[];
  bodies?: Record<string, string>;
  authorize?: () => Promise<{ privateDocuments: boolean } | null>;
  corruptHash?: string;
  revision?: number;
}) {
  const entries = options?.entries ?? [];
  const reads = { manifest: 0, body: 0, authorize: 0 };
  const navigation = createPinnedLibraryNavigation({
    storyId,
    rootHash,
    rootRevision: 4,
    authorize:
      options?.authorize ??
      (async () => {
        reads.authorize += 1;
        return { privateDocuments: false };
      }),
    reader: {
      async readManifest() {
        reads.manifest += 1;
        return {
          campaignId: storyId,
          revision: options?.revision ?? 4,
          entries,
        };
      },
      async readDocument(objectHash: string) {
        reads.body += 1;
        const match = entries.find((item) => item.objectHash === objectHash);
        if (match === undefined) {
          throw new Error('missing object');
        }
        return {
          envelope: {
            documentId: match.documentId,
            revision: objectHash === options?.corruptHash ? 99 : match.revision,
            kind: match.kind,
            authority: match.authority,
            visibility: match.visibility,
          },
          body: options?.bodies?.[match.path] ?? `body:${match.path}`,
        };
      },
      async readSourcePassage() {
        throw new Error('passages are out of scope');
      },
    },
  });
  return { navigation, reads };
}

describe('readLibraryDocumentsBatch', () => {
  it('returns eight documents in order with the navigator citations', async () => {
    const entries = Array.from({ length: 8 }, (_, index) =>
      entry(index, `lore/note-${index}.md`),
    );
    const { navigation, reads } = harness({ entries });
    const result = await readLibraryDocumentsBatch({
      navigation,
      paths: entries.map((item) => item.path),
      characters: 64,
    });
    assert.equal(result.length, 8);
    assert.equal(reads.authorize, 8);
    assert.equal(reads.body, 8);
    result.forEach((item, index) => {
      const source = entries[index];
      assert.ok(source);
      assert.equal(item.status, 'read');
      if (item.status !== 'read' || source === undefined) {
        return;
      }
      assert.equal(item.path, source.path);
      assert.equal(item.rootHash, rootHash);
      assert.equal(item.rootRevision, 4);
      assert.equal(item.documentId, source.documentId);
      assert.equal(item.revision, source.revision);
      assert.equal(item.objectHash, source.objectHash);
      assert.equal(item.content, `body:${source.path}`);
      assert.equal(item.nextOffset, null);
      assert.equal(item.totalCharacters, item.content.length);
    });
  });

  it('makes a private file and a missing file the same unavailable row', async () => {
    const visible = entry(1, 'lore/visible.md');
    const hidden = entry(2, 'lore/hidden.md', 'developer-private');
    const { navigation, reads } = harness({ entries: [visible, hidden] });
    const result = await readLibraryDocumentsBatch({
      navigation,
      paths: [visible.path, hidden.path, 'lore/absent.md'],
      characters: 32,
    });
    assert.deepEqual(result, [
      {
        status: 'read',
        path: visible.path,
        rootHash,
        rootRevision: 4,
        documentId: visible.documentId,
        revision: visible.revision,
        objectHash: visible.objectHash,
        content: 'body:lore/visible.md',
        nextOffset: null,
        totalCharacters: 'body:lore/visible.md'.length,
      },
      { status: 'unavailable', path: hidden.path },
      { status: 'unavailable', path: 'lore/absent.md' },
    ]);
    assert.deepEqual(Object.keys(result[1] ?? {}), ['status', 'path']);
    assert.deepEqual(Object.keys(result[2] ?? {}), ['status', 'path']);
    assert.equal(result[1]?.status, 'unavailable');
    assert.equal(result[2]?.status, 'unavailable');
    assert.equal(reads.body, 1);
  });

  it('refuses duplicate paths, a ninth path, and an oversized character budget before any read', async () => {
    const visible = entry(1, 'lore/visible.md');
    const { navigation, reads } = harness({ entries: [visible] });
    await assert.rejects(
      () =>
        readLibraryDocumentsBatch({
          navigation,
          paths: [visible.path, visible.path],
        }),
      (error: unknown) =>
        error instanceof LibraryBatchReadError &&
        error.code === 'invalid-request',
    );
    await assert.rejects(
      () =>
        readLibraryDocumentsBatch({
          navigation,
          paths: Array.from({ length: 9 }, (_, index) => `lore/${index}.md`),
        }),
      (error: unknown) =>
        error instanceof LibraryBatchReadError &&
        error.code === 'invalid-request',
    );
    await assert.rejects(
      () =>
        readLibraryDocumentsBatch({
          navigation,
          paths: ['../lore/visible.md'],
          characters: 4097,
        }),
      (error: unknown) =>
        error instanceof LibraryBatchReadError &&
        error.code === 'invalid-request',
    );
    await assert.rejects(
      () =>
        readLibraryDocumentsBatch({
          navigation,
          paths: ['../lore/visible.md'],
          characters: 16,
        }),
      (error: unknown) =>
        error instanceof LibraryNavigationError &&
        error.code === 'invalid-path',
    );
    assert.equal(reads.manifest, 0);
    assert.equal(reads.body, 0);
    assert.equal(reads.authorize, 0);
  });

  it('aborts the batch when authorization is revoked on the second path', async () => {
    const entries = [entry(1, 'lore/one.md'), entry(2, 'lore/two.md')];
    let calls = 0;
    const { navigation, reads } = harness({
      entries,
      authorize: async () => {
        calls += 1;
        reads.authorize += 1;
        return calls === 1 ? { privateDocuments: false } : null;
      },
    });
    await assert.rejects(
      () =>
        readLibraryDocumentsBatch({
          navigation,
          paths: entries.map((item) => item.path),
          characters: 16,
        }),
      (error: unknown) =>
        error instanceof LibraryNavigationError &&
        error.code === 'not-authorized',
    );
    assert.equal(reads.body, 1);
    assert.equal(reads.authorize, 2);
  });

  it('aborts on a corrupt third document and on a stale root', async () => {
    const entries = [
      entry(1, 'lore/one.md'),
      entry(2, 'lore/two.md'),
      entry(3, 'lore/three.md'),
    ];
    const corrupt = harness({
      entries,
      corruptHash: entries[2]?.objectHash,
    });
    await assert.rejects(
      () =>
        readLibraryDocumentsBatch({
          navigation: corrupt.navigation,
          paths: entries.map((item) => item.path),
          characters: 16,
        }),
      (error: unknown) =>
        error instanceof LibraryNavigationError &&
        error.code === 'corrupt-source',
    );
    assert.equal(corrupt.reads.body, 3);
    const stale = harness({ entries, revision: 1 });
    await assert.rejects(
      () =>
        readLibraryDocumentsBatch({
          navigation: stale.navigation,
          paths: ['lore/one.md'],
          characters: 16,
        }),
      (error: unknown) =>
        error instanceof LibraryNavigationError && error.code === 'stale-root',
    );
    assert.equal(stale.reads.body, 0);
  });

  it('rejects the whole batch when Unicode content pushes the JSON past 32 KiB', async () => {
    const entries = [
      entry(1, 'lore/wide.md'),
      entry(2, 'lore/wider.md'),
      entry(3, 'lore/next.md'),
    ];
    const wide = '😀'.repeat(4096);
    const { navigation, reads } = harness({
      entries,
      bodies: {
        'lore/wide.md': wide,
        'lore/wider.md': wide,
        'lore/next.md': 'ok',
      },
    });
    await assert.rejects(
      () =>
        readLibraryDocumentsBatch({
          navigation,
          paths: ['lore/wide.md', 'lore/wider.md', 'lore/next.md'],
          characters: 4096,
        }),
      (error: unknown) =>
        error instanceof LibraryBatchReadError &&
        error.code === 'budget-exceeded',
    );
    assert.equal(reads.body, 2);
    assert.equal(Buffer.byteLength(wide, 'utf8'), 16_384);
  });

  it('keeps nextOffset when the requested window is shorter than the document', async () => {
    const source = entry(1, 'lore/long.md');
    const { navigation } = harness({
      entries: [source],
      bodies: { 'lore/long.md': 'abcdef' },
    });
    const [item] = await readLibraryDocumentsBatch({
      navigation,
      paths: [source.path],
      characters: 2,
    });
    assert.equal(item?.status, 'read');
    if (item?.status !== 'read') {
      return;
    }
    assert.equal(item.content, 'ab');
    assert.equal(item.nextOffset, 2);
    assert.equal(item.totalCharacters, 6);
  });
});
