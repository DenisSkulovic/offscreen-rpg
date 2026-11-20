import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPinnedLibraryNavigation, LibraryNavigationError } from '../dist/storyteller/library-navigation.js';

const root = 'a'.repeat(64);
const laterRoot = 'b'.repeat(64);
const storyId = 'story-parent';

function entry(path, kind = 'lore', visibility = 'player-known', revision = 1) {
  return {
    documentId: 'doc:' + path, revision, path, objectHash: path + ':' + revision,
    kind, authority: visibility === 'storyteller-private' ? 'noncanonical' : 'canon',
    visibility,
  };
}

function fixture({ authorized = { privateDocuments: true }, initial = [], next = [] } = {}) {
  const roots = new Map([
    [root, { campaignId: storyId, revision: 1, entries: initial }],
    [laterRoot, { campaignId: storyId, revision: 2, entries: next }],
  ]);
  const objects = new Map();
  for (const e of [...initial, ...next]) {
    objects.set(e.objectHash, {
      envelope: {
        documentId: e.documentId, revision: e.revision, kind: e.kind,
        authority: e.authority, visibility: e.visibility,
      },
      body: 'Evidence for ' + e.path + ' at revision ' + e.revision + '.',
    });
  }
  const calls = { manifest: 0, body: 0, passage: 0, authorize: 0 };
  const reader = {
    async readManifest(hash) { calls.manifest++; return roots.get(hash); },
    async readDocument(hash) { calls.body++; return objects.get(hash); },
    async readSourcePassage(hash) {
      calls.passage++;
      const e = objects.get(hash);
      return { envelope: e.envelope, content: { paragraphs: [e.body] } };
    },
  };
  const authorize = async () => { calls.authorize++; return authorized; };
  const desk = createPinnedLibraryNavigation({ reader, storyId, rootHash: root, rootRevision: 1, authorize });
  return { desk, reader, calls, roots, objects, authorize };
}

function expectCode(code) {
  return (error) => error instanceof LibraryNavigationError && error.code === code;
}

test('pinned browse pages metadata without reading bodies or history', async () => {
  const initial = Array.from({ length: 200 }, (_, i) => entry('sources/passages/' + String(i + 1).padStart(4, '0') + '.md', 'source-passage'));
  const { desk, calls } = fixture({ initial });
  let after;
  const all = [];
  do {
    const page = await desk.browse({ prefix: 'sources/passages/', pageSize: 17, after });
    all.push(...page.entries);
    after = page.nextAfter ?? undefined;
  } while (after !== undefined);
  assert.equal(all.length, 200);
  assert.equal(all[0].path, 'sources/passages/0001.md');
  assert.equal(all.at(-1).path, 'sources/passages/0200.md');
  assert.equal(calls.body, 0);
  assert.equal(calls.passage, 0);
  assert.equal(calls.manifest, 12);
  const source = await desk.open({ path: 'sources/passages/0007.md', characters: 8 });
  assert.equal(source.content, 'Evidence');
  assert.equal(source.objectHash, 'sources/passages/0007.md:1');
  assert.ok(source.nextOffset > 0);
  assert.equal(calls.passage, 1);
});

test('player cannot discover private or developer documents', async () => {
  const { desk } = fixture({ authorized: { privateDocuments: false }, initial: [
    entry('characters/mira.md'), entry('private/possible-return.md', 'private-possibility', 'storyteller-private'),
    entry('developer/hidden.md', 'lore', 'developer-private'),
  ] });
  const page = await desk.browse();
  assert.deepEqual(page.entries.map((e) => e.path), ['characters/mira.md']);
  await assert.rejects(() => desk.open({ path: 'private/possible-return.md' }), expectCode('not-found'));
  await assert.rejects(() => desk.open({ path: 'developer/hidden.md' }), expectCode('not-found'));
});

test('Storyteller may inspect private possibilities but never developer files', async () => {
  const { desk } = fixture({ initial: [
    entry('private/possible-return.md', 'private-possibility', 'storyteller-private'),
    entry('developer/hidden.md', 'lore', 'developer-private'),
  ] });
  const page = await desk.browse();
  assert.deepEqual(page.entries.map((e) => e.path), ['private/possible-return.md']);
  const read = await desk.open({ path: 'private/possible-return.md' });
  assert.equal(read.authority, 'noncanonical');
  await assert.rejects(() => desk.open({ path: 'developer/hidden.md' }), expectCode('not-found'));
});

test('authorization is checked before reading even the manifest', async () => {
  const { desk, calls } = fixture({ authorized: null, initial: [entry('story.md')] });
  await assert.rejects(() => desk.browse(), expectCode('not-authorized'));
  await assert.rejects(() => desk.open({ path: 'story.md' }), expectCode('not-authorized'));
  assert.equal(calls.manifest, 0);
  assert.equal(calls.body, 0);
});

test('root mismatch fails closed and cannot read bodies', async () => {
  const f = fixture({ initial: [entry('story.md')] });
  f.roots.set(root, { ...f.roots.get(root), revision: 2 });
  await assert.rejects(() => f.desk.browse(), expectCode('stale-root'));
  await assert.rejects(() => f.desk.open({ path: 'story.md' }), expectCode('stale-root'));
  assert.equal(f.calls.body, 0);
});

test('old captured root stays on old content even after branch changes', async () => {
  const old = entry('people/mira.md');
  const changed = entry('people/mira.md', 'lore', 'player-known', 2);
  const { desk, reader, authorize } = fixture({ initial: [old], next: [changed] });
  const past = await desk.open({ path: 'people/mira.md' });
  const futureDesk = createPinnedLibraryNavigation({ reader, storyId, rootHash: laterRoot, rootRevision: 2, authorize });
  const future = await futureDesk.open({ path: 'people/mira.md' });
  assert.equal(past.revision, 1);
  assert.equal(future.revision, 2);
  assert.notEqual(past.objectHash, future.objectHash);
  assert.equal((await desk.open({ path: 'people/mira.md' })).revision, 1);
});

test('invalid paths, paging and duplicate path metadata fail closed', async () => {
  const e = entry('people/mira.md');
  const f = fixture({ initial: [e] });
  await assert.rejects(() => f.desk.open({ path: '../people/mira.md' }), expectCode('invalid-path'));
  await assert.rejects(() => f.desk.browse({ prefix: '../' }), expectCode('invalid-path'));
  await assert.rejects(() => f.desk.browse({ pageSize: 0 }), expectCode('invalid-page'));
  await assert.rejects(() => f.desk.browse({ prefix: 'people/', after: 'other/a.md' }), expectCode('invalid-path'));
  f.roots.set(root, { ...f.roots.get(root), entries: [e, e] });
  await assert.rejects(() => f.desk.browse(), expectCode('corrupt-source'));
});

test('source envelope mismatching the manifest fails closed', async () => {
  const e = entry('people/mira.md');
  const f = fixture({ initial: [e] });
  f.objects.set(e.objectHash, {
    envelope: { documentId: 'some-other-doc', revision: 1, kind: 'lore', authority: 'canon', visibility: 'player-known' },
    body: 'wrong content',
  });
  await assert.rejects(() => f.desk.open({ path: e.path }), expectCode('corrupt-source'));
});

test('read pagination uses Unicode code points and exact identity', async () => {
  const e = entry('lore/unicode.md');
  const f = fixture({ initial: [e] });
  f.objects.set(e.objectHash, {
    envelope: { documentId: e.documentId, revision: 1, kind: 'lore', authority: 'canon', visibility: 'player-known' },
    body: '🪐Galaxy',
  });
  const first = await f.desk.open({ path: e.path, characters: 1 });
  assert.equal(first.content, '🪐');
  assert.equal(first.nextOffset, 1);
  const next = await f.desk.open({ path: e.path, offset: first.nextOffset, characters: 6 });
  assert.equal(next.content, 'Galaxy');
  assert.equal(next.nextOffset, null);
});
