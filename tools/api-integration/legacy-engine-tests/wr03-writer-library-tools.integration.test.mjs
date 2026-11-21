import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  applyLibraryBatch,
  canonicalDocumentSchema,
  createEmptyLibraryIndex,
  hashCanonicalJson,
} from '@offscreen/documents';
import { writerMissionCaptureSchema } from '@offscreen/storyteller/tasks';
import {
  createWriterLibraryToolExecutor,
} from '../../../packages/story-engine/dist/storyteller/writer-library-tools.js';

const storyId = randomUUID();
const rootHash = 'c'.repeat(64);
const siblingRootHash = 'd'.repeat(64);
const skillHash = 'e'.repeat(64);
const passageHash = 'f'.repeat(64);
const passagePath = 'sources/scene-018-passage.md';

function buildWriterLibraryFixture() {
  let library = createEmptyLibraryIndex();
  const objects = new Map();
  const operations = [];
  let scene001Hash;
  let scene002Hash;

  for (let index = 1; index <= 200; index += 1) {
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
        visibility: 'player-known',
        sources: [],
      },
      title: `Scene ${index}`,
      body: `Ledger for ${path}`,
    });
    const objectHash = hashCanonicalJson(document);
    if (index === 1) scene001Hash = objectHash;
    if (index === 2) scene002Hash = objectHash;
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
        visibility: 'player-known',
      },
    });
  }

  const passageId = randomUUID();
  const passageDoc = canonicalDocumentSchema.parse({
    format: 'offscreen.document.v1',
    envelope: {
      documentId: passageId,
      schemaVersion: 1,
      revision: 1,
      kind: 'source-passage',
      authority: 'canon',
      visibility: 'player-known',
      sources: [],
    },
    title: 'Scene 18 promise',
    body: 'The courier swore the cargo would reach Vivec.',
  });
  objects.set(passageHash, {
    envelope: passageDoc.envelope,
    body: passageDoc.body,
  });
  operations.push({
    op: 'create',
    entry: {
      documentId: passageId,
      revision: 1,
      path: passagePath,
      objectHash: passageHash,
      kind: 'source-passage',
      authority: 'canon',
      visibility: 'player-known',
    },
  });

  const privateId = randomUUID();
  const privatePath = 'private/ledger.md';
  const privateDoc = canonicalDocumentSchema.parse({
    format: 'offscreen.document.v1',
    envelope: {
      documentId: privateId,
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
  const privateHash = hashCanonicalJson(privateDoc);
  objects.set(privateHash, {
    envelope: privateDoc.envelope,
    body: privateDoc.body,
  });
  operations.push({
    op: 'create',
    entry: {
      documentId: privateId,
      revision: 1,
      path: privatePath,
      objectHash: privateHash,
      kind: 'lore',
      authority: 'noncanonical',
      visibility: 'storyteller-private',
    },
  });

  const skillDoc = canonicalDocumentSchema.parse({
    format: 'offscreen.document.v1',
    envelope: {
      documentId: randomUUID(),
      schemaVersion: 1,
      revision: 1,
      kind: 'lore',
      authority: 'canon',
      visibility: 'player-known',
      sources: [],
    },
    title: 'Scene craft',
    body: '# Skill\nHonor the promise made in scene 18.',
  });
  objects.set(skillHash, {
    envelope: skillDoc.envelope,
    body: skillDoc.body,
  });

  library = applyLibraryBatch(library, operations);
  const nodes = new Map(library.store);
  const roots = new Map([
    [rootHash, library.root],
    [siblingRootHash, library.root],
  ]);

  const reader = {
    async readManifest() {
      throw new Error('readManifest must not be called for v2 writer tools');
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
      const value = objects.get(hash);
      if (value === undefined) throw new Error(`missing object ${hash}`);
      return value;
    },
    async readSourcePassage(hash) {
      const value = objects.get(hash);
      if (value === undefined) throw new Error(`missing passage ${hash}`);
      return {
        envelope: value.envelope,
        content: { paragraphs: [value.body] },
      };
    },
  };

  const capture = writerMissionCaptureSchema.parse({
    version: 'writer-mission.v1',
    generationId: randomUUID(),
    operationId: randomUUID(),
    ownerId: randomUUID(),
    storyId,
    sceneFrontier: {
      passageId: randomUUID(),
      narrativeRevision: 1,
      sequence: 0,
    },
    libraryRootHash: rootHash,
    libraryRootRevision: 1,
    profileObjectHash: 'a'.repeat(64),
    skillObjectHashes: [skillHash],
    toolsAllowlist: [
      'library.browse',
      'library.find',
      'library.read',
      'library.diff',
      'skills.open',
    ],
    modelSelection: { provider: 'openrouter', model: 'test/writer-model' },
    budgets: {
      maxModelRounds: 6,
      maxInputTokens: 12_288,
      maxGeneratedTokens: 4096,
      maxMicrousd: '250000',
      deadlineMs: 120_000,
    },
    capturedRequestHash: 'b'.repeat(64),
  });

  return {
    reader,
    capture,
    passageHash,
    scene001Hash,
    scene002Hash,
    privatePath,
    siblingRootHash,
    authorizePlayer: async () => ({ privateDocuments: false }),
  };
}

test('WR03 T04 writer library tools positive trace', async () => {
  const fixture = buildWriterLibraryFixture();
  const executor = createWriterLibraryToolExecutor({
    capture: fixture.capture,
    reader: fixture.reader,
    authorize: fixture.authorizePlayer,
  });

  const browse = await executor.execute({
    id: 't1',
    name: 'library.browse',
    args: { prefix: 'lore/', pageSize: 8 },
  });
  assert.equal(browse.ok, true);
  assert.equal(browse.result.entries.length, 8);

  const find = await executor.execute({
    id: 't2',
    name: 'library.find',
    args: { query: 'scene-018', prefix: 'lore/' },
  });
  assert.equal(find.ok, true);
  assert.ok(find.result.hints.some((hint) => hint.path === 'lore/scene-018.md'));

  const readPassage = await executor.execute({
    id: 't3',
    name: 'library.read',
    args: { objectHash: fixture.passageHash },
  });
  assert.equal(readPassage.ok, true);
  assert.match(readPassage.result.content, /courier swore/);
  assert.equal(readPassage.result.kind, 'source-passage');

  const diff = await executor.execute({
    id: 't4',
    name: 'library.diff',
    args: {
      leftObjectHash: fixture.scene001Hash,
      rightObjectHash: fixture.scene002Hash,
    },
  });
  assert.equal(diff.ok, true);
  assert.ok(diff.result.lines.some((line) => line.kind === 'right'));

  const skill = await executor.execute({
    id: 't5',
    name: 'skills.open',
    args: { objectHash: 'e'.repeat(64) },
  });
  assert.equal(skill.ok, true);
  assert.match(skill.result.content, /Honor the promise/);
});

test('WR03 T04 writer library tools reject foreign, private, and elevation', async () => {
  const fixture = buildWriterLibraryFixture();
  const executor = createWriterLibraryToolExecutor({
    capture: fixture.capture,
    reader: fixture.reader,
    authorize: fixture.authorizePlayer,
  });

  const foreignRoot = await executor.execute({
    id: 't10',
    name: 'library.browse',
    args: {
      cursor: { rootHash: fixture.siblingRootHash, prefix: 'lore/' },
    },
  });
  assert.equal(foreignRoot.ok, false);
  assert.equal(foreignRoot.resultByteLength, 0);
  assert.equal(foreignRoot.code, 'foreign-root');

  const privateRead = await executor.execute({
    id: 't11',
    name: 'library.read',
    args: { path: fixture.privatePath },
  });
  assert.equal(privateRead.ok, false);
  assert.equal(privateRead.resultByteLength, 0);
  assert.equal(privateRead.code, 'not-found');

  const elevation = await executor.execute({
    id: 't12',
    name: 'library.read',
    args: { path: 'lore/scene-001.md', budgets: { maxMicrousd: '999999999' } },
  });
  assert.equal(elevation.ok, false);
  assert.equal(elevation.resultByteLength, 0);
  assert.equal(elevation.code, 'capability-elevation');

  const ungranted = await executor.execute({
    id: 't13',
    name: 'workdesk.stage',
    args: { path: 'draft/scene.md', body: 'x' },
  });
  assert.equal(ungranted.ok, false);
  assert.equal(ungranted.resultByteLength, 0);
  assert.equal(ungranted.code, 'tool-not-granted');
});