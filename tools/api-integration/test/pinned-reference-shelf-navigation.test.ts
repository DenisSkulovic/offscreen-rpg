import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  hashCanonicalJson,
  type CanonicalDocument,
  type RulePackageManifest,
  type WorldPackageManifest,
} from '@offscreen/documents';
import { createPinnedReferenceShelfNavigation } from '@offscreen/story-engine/storyteller/pinned-reference-shelf-navigation';

const hash = 'ab'.repeat(32);
const otherHash = 'cd'.repeat(32);
const worldA = '11111111-1111-4111-8111-111111111111';
const worldB = '22222222-2222-4222-8222-222222222222';
const ruleSetId = '33333333-3333-4333-8333-333333333333';
const operationId = '44444444-4444-4444-8444-444444444444';

function id(index: number) {
  return `55555555-5555-4555-8555-${index.toString(16).padStart(12, '0')}`;
}

function entry(
  index: number,
  path: string,
  visibility: 'player-known' | 'storyteller-private' | 'developer-private',
  objectHash = hash,
): WorldPackageManifest['entries'][number] {
  return {
    documentId: id(index),
    revision: 1,
    path,
    objectHash,
    kind: path.endsWith('orientation.md') ? 'orientation' : 'lore',
    authority: 'canon',
    visibility,
    sourceBytes: 12,
    sections: [],
  };
}

function worldManifest(
  worldId: string,
  entries: WorldPackageManifest['entries'],
): WorldPackageManifest {
  return {
    format: 'offscreen.world-package-manifest.v1',
    worldId,
    title: 'World',
    revision: 3,
    previousRootHash: otherHash,
    authorOperationId: operationId,
    orientationDocumentId: entries[0]?.documentId ?? id(1),
    entries,
  };
}

function documentFor(
  entryRow: WorldPackageManifest['entries'][number],
  body: string,
): CanonicalDocument {
  return {
    format: 'offscreen.document.v1',
    envelope: {
      documentId: entryRow.documentId,
      kind: entryRow.kind,
      schemaVersion: 1,
      revision: entryRow.revision,
      authority: entryRow.authority,
      visibility: entryRow.visibility,
      sources: [],
    },
    title: 'Cited',
    body,
  };
}

function shelf(options?: {
  deny?: boolean;
  privateDocuments?: boolean;
  accessVersion?: string;
  worlds?: Record<string, WorldPackageManifest>;
  rules?: RulePackageManifest | null;
  onRead?: (method: string) => void;
}) {
  const calls: string[] = [];
  const worlds = options?.worlds ?? {
    [hash]: worldManifest(worldA, [
      entry(1, 'orientation.md', 'player-known'),
      entry(2, 'lore.md', 'player-known'),
      entry(3, 'secret.md', 'storyteller-private'),
      entry(4, 'dev.md', 'developer-private'),
    ]),
    [otherHash]: worldManifest(worldB, [
      entry(8, 'orientation.md', 'player-known'),
      entry(9, 'lore.md', 'player-known'),
    ]),
  };
  const rules = options?.rules === undefined ? ruleManifest() : options.rules;
  let accessVersion = options?.accessVersion ?? 'grant-1';
  let privateDocuments = options?.privateDocuments ?? false;
  let deny = options?.deny ?? false;
  const navigation = createPinnedReferenceShelfNavigation({
    worlds: [
      { worldId: worldA, rootHash: hash, revision: 3, mount: 'vvardenfell' },
      { worldId: worldB, rootHash: otherHash, revision: 3, mount: 'solstheim' },
    ],
    rules: rules
      ? {
          ruleSetId,
          rootHash: hash,
          revision: 2,
          engine: { adapterId: 'morrowind', adapterVersion: 1 },
        }
      : null,
    authorize: async () => {
      calls.push('authorize');
      if (deny) {return null;}
      return { privateDocuments, accessVersion };
    },
    reader: {
      async readWorldPackageManifest(rootHash) {
        calls.push(`world:${rootHash}`);
        options?.onRead?.('world');
        const manifest = worlds[rootHash];
        if (!manifest) {throw new Error('missing');}
        return manifest;
      },
      async readRulePackageManifest(rootHash) {
        calls.push(`rules:${rootHash}`);
        options?.onRead?.('rules');
        if (!rules || rootHash !== hash) {throw new Error('missing');}
        return rules;
      },
      async readDocument(objectHash) {
        calls.push(`document:${objectHash}`);
        options?.onRead?.('document');
        return { unexpected: objectHash };
      },
    },
  });
  return {
    navigation,
    calls,
    setAccess(next: {
      deny?: boolean;
      privateDocuments?: boolean;
      accessVersion?: string;
    }) {
      deny = next.deny ?? false;
      privateDocuments = next.privateDocuments ?? false;
      accessVersion = next.accessVersion ?? accessVersion;
    },
  };
}

function ruleManifest(): RulePackageManifest {
  return {
    format: 'offscreen.rule-package-manifest.v1',
    ruleSetId,
    title: 'Rules',
    revision: 2,
    previousRootHash: otherHash,
    authorOperationId: operationId,
    orientationDocumentId: id(20),
    engine: { adapterId: 'morrowind', adapterVersion: 1 },
    license: {
      name: 'Example',
      source: 'https://example.com/rules',
      attribution: 'Fixture',
    },
    entries: [
      {
        documentId: id(20),
        revision: 1,
        path: 'orientation.md',
        objectHash: hash,
        kind: 'orientation',
        authority: 'source',
        visibility: 'player-known',
        sourceBytes: 4,
        topics: ['core'],
        sections: [],
      },
      {
        documentId: id(21),
        revision: 4,
        path: 'lore.md',
        objectHash: hash,
        kind: 'rule-reference',
        authority: 'source',
        visibility: 'player-known',
        sourceBytes: 4,
        topics: ['core'],
        sections: [],
      },
    ],
  };
}

describe('pinned reference shelf navigation', () => {
  it('keeps the same path distinct across world mounts and rules', async () => {
    const { navigation } = shelf();
    const first = await navigation.browse({ mount: 'vvardenfell' });
    const second = await navigation.browse({ mount: 'solstheim' });
    const rules = await navigation.findPath({
      mount: 'rules',
      query: 'lore.md',
    });
    assert.deepEqual(
      first.entries.map((entry) => entry.path),
      ['lore.md', 'orientation.md'],
    );
    assert.deepEqual(
      second.entries.map((entry) => entry.path),
      ['lore.md', 'orientation.md'],
    );
    assert.equal(first.entries[0]?.documentId, id(2));
    assert.equal(second.entries[0]?.documentId, id(9));
    assert.equal(rules.entries[0]?.documentId, id(21));
    assert.equal(JSON.stringify(first).includes('secret.md'), false);
    assert.equal(JSON.stringify(first).includes('dev.md'), false);
  });

  it('does not read storage when authorization is denied or revoked', async () => {
    const opened = shelf({ deny: true });
    await assert.rejects(
      () => opened.navigation.browse({ mount: 'vvardenfell' }),
      /not-authorized/,
    );
    assert.deepEqual(opened.calls, ['authorize']);
    const live = shelf({ privateDocuments: true });
    const granted = await live.navigation.browse({ mount: 'vvardenfell' });
    assert.equal(
      granted.entries.some((entry) => entry.path === 'secret.md'),
      true,
    );
    live.setAccess({ deny: true });
    await assert.rejects(
      () => live.navigation.read({ mount: 'vvardenfell', path: 'secret.md' }),
      /not-authorized/,
    );
    assert.equal(
      live.calls.some((call) => call.startsWith('document:')),
      false,
    );
  });

  it('rejects a forged cursor, a stale manifest, and a bad mount before listing', async () => {
    const { navigation } = shelf();
    const page = await navigation.browse({ mount: 'vvardenfell', pageSize: 1 });
    const cursor = page.nextCursor;
    assert.ok(cursor);
    const forged = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    forged.rootHash = otherHash;
    const token = Buffer.from(JSON.stringify(forged)).toString('base64url');
    await assert.rejects(
      () => navigation.browse({ mount: 'vvardenfell', cursor: token }),
      /invalid-cursor/,
    );
    await assert.rejects(
      () => navigation.browse({ mount: 'akavir' }),
      /invalid-mount/,
    );
    await assert.rejects(
      () =>
        navigation.browse({ mount: 'vvardenfell', rootHash: hash } as never),
      /Unrecognized|unrecognized/,
    );
    const stale = shelf({
      worlds: {
        [hash]: worldManifest('99999999-9999-4999-8999-999999999999', [
          entry(1, 'orientation.md', 'player-known'),
        ]),
        [otherHash]: worldManifest(worldB, [
          entry(8, 'orientation.md', 'player-known'),
        ]),
      },
    });
    await assert.rejects(
      () => stale.navigation.browse({ mount: 'vvardenfell' }),
      /stale-source/,
    );
  });

  it('pages 129 visible entries and continues after 512 private entries', async () => {
    const many = [entry(1, 'orientation.md', 'player-known')];
    for (let index = 2; index <= 130; index += 1)
      {many.push(entry(index, `visible/${index}.md`, 'player-known'));}
    const { navigation } = shelf({
      worlds: {
        [hash]: worldManifest(worldA, many),
        [otherHash]: worldManifest(worldB, [
          entry(8, 'orientation.md', 'player-known'),
        ]),
      },
    });
    const first = await navigation.browse({
      mount: 'vvardenfell',
      prefix: 'visible/',
    });
    assert.equal(first.entries.length, 128);
    assert.ok(first.nextCursor);
    const second = await navigation.browse({
      mount: 'vvardenfell',
      prefix: 'visible/',
      cursor: first.nextCursor ?? '',
    });
    assert.equal(second.entries.length, 1);

    const sparse = [entry(1, 'aaa-orientation.md', 'developer-private')];
    for (let index = 2; index <= 512; index += 1) {
      sparse.push(
        entry(
          index,
          `hidden/${String(index).padStart(4, '0')}.md`,
          'developer-private',
        ),
      );
    }
    sparse.push(entry(600, 'zzz-visible.md', 'player-known'));
    const hidden = shelf({
      worlds: {
        [hash]: worldManifest(worldA, sparse),
        [otherHash]: worldManifest(worldB, [
          entry(8, 'orientation.md', 'player-known'),
        ]),
      },
    });
    const empty = await hidden.navigation.browse({ mount: 'vvardenfell' });
    assert.equal(empty.entries.length, 0);
    assert.ok(empty.nextCursor);
    assert.equal(JSON.stringify(empty).includes('hidden/'), false);
    const later = await hidden.navigation.browse({
      mount: 'vvardenfell',
      cursor: empty.nextCursor ?? '',
    });
    assert.deepEqual(
      later.entries.map((entry) => entry.path),
      ['zzz-visible.md'],
    );
  });

  it('cites an accepted markdown document and rejects a corrupt envelope', async () => {
    const row = entry(2, 'lore.md', 'player-known');
    const body = 'The ashlands keep their own names.';
    const document = documentFor(row, body);
    const objectHash = hashCanonicalJson(document);
    row.objectHash = objectHash;
    const manifest = worldManifest(worldA, [
      entry(1, 'orientation.md', 'player-known'),
      row,
    ]);
    let documentReads = 0;
    const navigation = createPinnedReferenceShelfNavigation({
      worlds: [
        { worldId: worldA, rootHash: hash, revision: 3, mount: 'vvardenfell' },
      ],
      rules: null,
      authorize: async () => ({
        privateDocuments: false,
        accessVersion: 'grant-1',
      }),
      reader: {
        async readWorldPackageManifest() {
          return manifest;
        },
        async readRulePackageManifest() {
          throw new Error('rules unused');
        },
        async readDocument() {
          documentReads += 1;
          return document;
        },
      },
    });
    const read = await navigation.read({
      mount: 'vvardenfell',
      path: 'lore.md',
    });
    assert.equal(read.text, body);
    assert.equal(read.cite.mount, 'vvardenfell');
    assert.equal(read.cite.worldId, worldA);
    assert.equal(read.cite.rootHash, hash);
    assert.equal(read.cite.documentId, row.documentId);
    assert.equal(read.cite.objectHash, objectHash);
    await assert.rejects(
      () => navigation.read({ mount: 'vvardenfell', path: 'dev.md' }),
      /not-found/,
    );
    assert.equal(documentReads, 1);
    document.envelope.kind = 'identity';
    await assert.rejects(
      () => navigation.read({ mount: 'vvardenfell', path: 'lore.md' }),
      /corrupt-source/,
    );
  });

  it('caps a read at 16384 codepoints and 64 KiB', async () => {
    const row = entry(2, 'lore.md', 'player-known');
    const document = documentFor(row, 'é'.repeat(20_000));
    row.objectHash = hashCanonicalJson(document);
    const navigation = createPinnedReferenceShelfNavigation({
      worlds: [
        { worldId: worldA, rootHash: hash, revision: 3, mount: 'vvardenfell' },
      ],
      authorize: async () => ({
        privateDocuments: false,
        accessVersion: 'grant-1',
      }),
      reader: {
        async readWorldPackageManifest() {
          return worldManifest(worldA, [
            entry(1, 'orientation.md', 'player-known'),
            row,
          ]);
        },
        async readRulePackageManifest() {
          throw new Error('unused');
        },
        async readDocument() {
          return document;
        },
      },
    });
    const read = await navigation.read({
      mount: 'vvardenfell',
      path: 'lore.md',
    });
    assert.equal(Array.from(read.text).length, 16_384);
    assert.equal(read.truncated, true);
    assert.ok(Buffer.byteLength(read.text) <= 64 * 1024);
    await assert.rejects(
      () => navigation.read({ mount: 'vvardenfell', path: 'notes.json' }),
      /Invalid|invalid-input|expected/,
    );
  });
});
