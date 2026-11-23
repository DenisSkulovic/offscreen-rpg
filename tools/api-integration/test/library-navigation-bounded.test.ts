import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyLibraryBatch,
  createEmptyLibraryIndex,
  type LibraryIndex,
} from '@offscreen/documents';
import {
  createPinnedLibraryNavigation,
  LibraryNavigationError,
} from '@offscreen/story-engine/storyteller/library-navigation';

const storyId = '11111111-1111-4111-8111-111111111111';
const rootHash = 'ab'.repeat(32);
const objectHash = 'cd'.repeat(32);

function id(index: number) {
  return `22222222-2222-4222-8222-${index.toString(16).padStart(12, '0')}`;
}

function manifestEntry(
  index: number,
  path: string,
  visibility: 'player-known' | 'storyteller-private' | 'developer-private',
) {
  return {
    documentId: id(index),
    revision: 1,
    path,
    objectHash,
    kind: 'lore' as const,
    authority: 'canon' as const,
    visibility,
  };
}

function libraryFrom(
  entries: ReturnType<typeof manifestEntry>[],
): LibraryIndex {
  return applyLibraryBatch(
    createEmptyLibraryIndex(),
    entries.map((entry) => ({ op: 'create' as const, entry })),
  );
}

function navigationFor(
  library: LibraryIndex,
  options?: {
    authorized?: { privateDocuments: boolean } | null;
    root?: unknown;
    missingNode?: boolean;
  },
) {
  const reads = { root: 0, node: 0, manifest: 0, authorize: 0 };
  const nodes = new Map(library.store);
  const reader = {
    async readManifest() {
      reads.manifest += 1;
      throw new Error('v2 navigation must not read a v1 manifest');
    },
    async readLibraryRoot() {
      reads.root += 1;
      if (options?.root !== undefined) {
        return options.root as never;
      }
      return library.root;
    },
    async readLibraryNode(hash: string) {
      reads.node += 1;
      if (options?.missingNode) {
        throw new Error('missing node');
      }
      const node = nodes.get(hash);
      if (node === undefined) {
        throw new Error(`missing node ${hash}`);
      }
      return node;
    },
    async readDocument() {
      throw new Error('body reads are out of scope');
    },
    async readSourcePassage() {
      throw new Error('body reads are out of scope');
    },
  };
  const navigation = createPinnedLibraryNavigation({
    reader,
    storyId,
    rootHash,
    rootRevision: 4,
    authorize: async () => {
      reads.authorize += 1;
      return options?.authorized === undefined
        ? { privateDocuments: false }
        : options.authorized;
    },
  });
  return { navigation, reads };
}

function expectCode(code: LibraryNavigationError['code']) {
  return (error: unknown) =>
    error instanceof LibraryNavigationError && error.code === code;
}

describe('bounded story library navigation', () => {
  it('pages a v2 root past 128 entries and continues past 512', async () => {
    const entries = Array.from({ length: 513 }, (_, index) =>
      manifestEntry(
        index + 1,
        `lore/scene-${String(index + 1).padStart(4, '0')}.md`,
        'player-known',
      ),
    );
    const { navigation } = navigationFor(libraryFrom(entries));
    const first = await navigation.browse({ pageSize: 128 });
    assert.equal(first.entries.length, 128);
    assert.equal(first.entries[0]?.path, 'lore/scene-0001.md');
    assert.equal(first.entries.at(-1)?.path, 'lore/scene-0128.md');
    assert.equal(first.nextAfter, 'lore/scene-0128.md');
    const second = await navigation.browse({
      pageSize: 128,
      ...(first.nextAfter === null ? {} : { after: first.nextAfter }),
    });
    assert.equal(second.entries[0]?.path, 'lore/scene-0129.md');
    const found = await navigation.find({
      query: 'scene-0200.md',
      pageSize: 1,
    });
    assert.deepEqual(
      found.hints.map((hint) => hint.path),
      ['lore/scene-0200.md'],
    );
    let after: string | undefined;
    const seen: string[] = [];
    do {
      const page = await navigation.browse({
        pageSize: 128,
        ...(after === undefined ? {} : { after }),
      });
      seen.push(...page.entries.map((entry) => entry.path));
      after = page.nextAfter ?? undefined;
    } while (after !== undefined);
    assert.equal(seen.length, 513);
    assert.equal(seen.at(-1), 'lore/scene-0513.md');
  });

  it('returns an empty page and a continuation after 512 private entries', async () => {
    const entries = Array.from({ length: 512 }, (_, index) =>
      manifestEntry(
        index + 1,
        `hidden/${String(index + 1).padStart(4, '0')}.md`,
        'developer-private',
      ),
    );
    entries.push(manifestEntry(600, 'lore/visible.md', 'player-known'));
    const { navigation } = navigationFor(libraryFrom(entries));
    const empty = await navigation.browse({ pageSize: 32 });
    assert.deepEqual(empty.entries, []);
    assert.ok(empty.nextAfter);
    assert.equal(JSON.stringify(empty).includes('hidden/'), false);
    const later = await navigation.browse({
      pageSize: 32,
      ...(empty.nextAfter === null ? {} : { after: empty.nextAfter }),
    });
    assert.deepEqual(
      later.entries.map((entry) => entry.path),
      ['lore/visible.md'],
    );
    assert.equal(JSON.stringify(later).includes('hidden/'), false);
  });

  it('keeps one find budget and does not leak hidden paths', async () => {
    const entries = Array.from({ length: 512 }, (_, index) =>
      manifestEntry(
        index + 1,
        `hidden/${String(index + 1).padStart(4, '0')}.md`,
        'storyteller-private',
      ),
    );
    entries.push(manifestEntry(700, 'lore/needle.md', 'player-known'));
    const { navigation, reads } = navigationFor(libraryFrom(entries));
    const first = await navigation.find({ query: 'needle', pageSize: 8 });
    assert.deepEqual(first.hints, []);
    assert.ok(first.nextAfter);
    assert.equal(JSON.stringify(first).includes('hidden/'), false);
    const second = await navigation.find({
      query: 'needle',
      pageSize: 8,
      ...(first.nextAfter === null ? {} : { after: first.nextAfter }),
    });
    assert.deepEqual(
      second.hints.map((hint) => hint.path),
      ['lore/needle.md'],
    );
    assert.equal(reads.manifest, 0);
    assert.ok(reads.authorize >= 2);
  });

  it('rejects a denied caller before storage and a corrupt v2 root', async () => {
    const library = libraryFrom([
      manifestEntry(1, 'lore/scene.md', 'player-known'),
    ]);
    const denied = navigationFor(library, { authorized: null });
    await assert.rejects(
      () => denied.navigation.browse(),
      expectCode('not-authorized'),
    );
    assert.equal(denied.reads.root, 0);
    assert.equal(denied.reads.node, 0);
    const corrupt = navigationFor(library, {
      root: { format: 'offscreen.library-root.v2', campaignId: storyId },
    });
    await assert.rejects(
      () => corrupt.navigation.browse(),
      expectCode('corrupt-source'),
    );
    assert.equal(corrupt.reads.manifest, 0);
    const broken = navigationFor(library, { missingNode: true });
    await assert.rejects(
      () => broken.navigation.open({ path: 'lore/scene.md' }),
      expectCode('corrupt-source'),
    );
  });

  it('keeps v1 sorted pages, stale roots, and hash membership', async () => {
    const entries = [
      manifestEntry(2, 'lore/b.md', 'player-known'),
      manifestEntry(1, 'lore/a.md', 'player-known'),
      manifestEntry(3, 'private/c.md', 'developer-private'),
    ];
    const reads = { manifest: 0 };
    const navigation = createPinnedLibraryNavigation({
      storyId,
      rootHash,
      rootRevision: 4,
      authorize: async () => ({ privateDocuments: false }),
      reader: {
        async readManifest() {
          reads.manifest += 1;
          return { campaignId: storyId, revision: 4, entries };
        },
        async readDocument(hash: string) {
          const entry = entries.find((item) => item.objectHash === hash);
          if (entry === undefined) {
            throw new Error('missing');
          }
          return {
            envelope: entry,
            body: 'Ashlander road.',
          };
        },
        async readSourcePassage() {
          throw new Error('unused');
        },
      },
    });
    const page = await navigation.browse();
    assert.deepEqual(
      page.entries.map((entry) => entry.path),
      ['lore/a.md', 'lore/b.md'],
    );
    assert.equal(JSON.stringify(page).includes('private/'), false);
    const stale = createPinnedLibraryNavigation({
      storyId,
      rootHash,
      rootRevision: 4,
      authorize: async () => ({ privateDocuments: false }),
      reader: {
        async readManifest() {
          return { campaignId: storyId, revision: 9, entries };
        },
        async readDocument() {
          throw new Error('unread');
        },
        async readSourcePassage() {
          throw new Error('unread');
        },
      },
    });
    await assert.rejects(() => stale.browse(), expectCode('stale-root'));
    const read = await navigation.readByObjectHash({ objectHash });
    assert.equal(read.path, 'lore/b.md');
    assert.equal(read.content, 'Ashlander road.');
  });
});
