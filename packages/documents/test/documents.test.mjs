import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import {
  DocumentStorageError,
  LocalDocumentStore,
  canonicalDocumentSchema,
  documentManifestSchema,
  canonicalSourcePassageSchema,
  canonicalStructuredDocumentSchema,
  worldPackageManifestSchema,
  worldPackageReferenceSchema,
  rulePackageManifestSchema,
  rulePackageReferenceSchema,
  startPackageManifestSchema,
} from '../dist/index.js';

function fixture() {
  const campaignId = randomUUID();
  const operationId = randomUUID();
  const document = canonicalDocumentSchema.parse({
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
    title: 'The harbor bell',
    body: 'The bell is cracked but still rings.',
  });
  return { campaignId, operationId, document };
}

test('immutable objects deduplicate by canonical content and export readable Markdown', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-documents-'));
  const store = new LocalDocumentStore(root);
  const { campaignId, operationId, document } = fixture();
  const objectHash = await store.putDocument(document);
  assert.equal(await store.putDocument(document), objectHash);
  const manifest = documentManifestSchema.parse({
    format: 'offscreen.manifest.v1',
    campaignId,
    revision: 1,
    previousRootHash: null,
    authorOperationId: operationId,
    entries: [
      {
        documentId: document.envelope.documentId,
        revision: 1,
        path: 'world/harbor-bell.md',
        objectHash,
        kind: 'lore',
        authority: 'canon',
        visibility: 'player-known',
      },
    ],
  });
  const rootHash = await store.putManifest(manifest);
  assert.deepEqual(await store.readManifest(rootHash), manifest);
  const destination = join(root, 'export');
  await store.exportPublishedRoot(rootHash, destination);
  const markdown = await readFile(
    join(destination, 'world', 'harbor-bell.md'),
    'utf8',
  );
  assert.match(markdown, /documentId:/);
  assert.match(markdown, /# The harbor bell/);
  assert.match(markdown, /The bell is cracked/);
});

test('structured state documents preserve validated data and export exact JSON', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-state-'));
  const store = new LocalDocumentStore(root);
  const campaignId = randomUUID();
  const operationId = randomUUID();
  const documentId = randomUUID();
  const document = canonicalStructuredDocumentSchema.parse({
    format: 'offscreen.structured-document.v1',
    envelope: {
      documentId,
      kind: 'campaign-state',
      schemaVersion: 1,
      revision: 1,
      authority: 'canon',
      visibility: 'storyteller-private',
      sources: [],
    },
    schemaId: 'campaign-state.v1',
    data: { version: 1, gameSecond: 17, inventory: ['brass-key'] },
  });
  const objectHash = await store.putStructuredDocument(document);
  assert.deepEqual(await store.readStructuredDocument(objectHash), document);
  const manifest = documentManifestSchema.parse({
    format: 'offscreen.manifest.v1',
    campaignId,
    revision: 1,
    previousRootHash: null,
    authorOperationId: operationId,
    entries: [
      {
        documentId,
        revision: 1,
        path: 'state/current.json',
        objectHash,
        kind: 'campaign-state',
        authority: 'canon',
        visibility: 'storyteller-private',
      },
    ],
  });
  const rootHash = await store.putManifest(manifest);
  const destination = join(root, 'state-export');
  await store.exportPublishedRoot(rootHash, destination);
  const exported = JSON.parse(
    await readFile(join(destination, 'state', 'current.json'), 'utf8'),
  );
  assert.deepEqual(exported.data, document.data);
  assert.equal(exported.envelope.documentId, documentId);
});

test('hash verification rejects changed stored bytes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-documents-'));
  const store = new LocalDocumentStore(root);
  const { document } = fixture();
  const hash = await store.putDocument(document);
  const path = join(
    root,
    'objects',
    'sha256',
    hash.slice(0, 2),
    `${hash}.json`,
  );
  await writeFile(path, '{}\n');
  await assert.rejects(
    store.readDocument(hash),
    (error) =>
      error instanceof DocumentStorageError && error.code === 'corrupt',
  );
});

test('a source passage stores one exact typed value and derives Markdown on export', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-passages-'));
  const store = new LocalDocumentStore(root);
  const campaignId = randomUUID();
  const operationId = randomUUID();
  const passageId = randomUUID();
  const content = {
    version: 1,
    title: 'Night shift',
    paragraphs: [
      'The warehouse doors close as the lamps are lit.',
      'A clerk slides the night ledger across the desk.',
    ],
  };
  const passage = canonicalSourcePassageSchema.parse({
    format: 'offscreen.source-passage.v1',
    envelope: {
      documentId: passageId,
      kind: 'source-passage',
      schemaVersion: 1,
      revision: 1,
      authority: 'source',
      visibility: 'player-known',
      sources: [],
      coverage: { fromSequence: 1, throughSequence: 1 },
    },
    content,
  });
  const objectHash = await store.putSourcePassage(passage);
  assert.deepEqual(
    (await store.readSourcePassage(objectHash)).content,
    content,
  );
  const manifest = documentManifestSchema.parse({
    format: 'offscreen.manifest.v1',
    campaignId,
    revision: 1,
    previousRootHash: null,
    authorOperationId: operationId,
    entries: [
      {
        documentId: passageId,
        revision: 1,
        path: `sources/passages/passage-00000001-${passageId}.md`,
        objectHash,
        kind: 'source-passage',
        authority: 'source',
        visibility: 'player-known',
      },
    ],
  });
  const rootHash = await store.putManifest(manifest);
  const destination = join(root, 'passage-export');
  await store.exportPublishedRoot(rootHash, destination);
  const markdown = await readFile(
    join(
      destination,
      'sources',
      'passages',
      `passage-00000001-${passageId}.md`,
    ),
    'utf8',
  );
  assert.match(markdown, /# Night shift/);
  assert.match(markdown, /The warehouse doors close/);
  assert.match(markdown, /A clerk slides the night ledger/);
});

test('world packages have immutable roots and exact campaign pin references', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-world-package-'));
  const store = new LocalDocumentStore(root);
  const worldId = randomUUID();
  const orientationId = randomUUID();
  const orientation = canonicalDocumentSchema.parse({
    format: 'offscreen.document.v1',
    envelope: {
      documentId: orientationId,
      kind: 'orientation',
      schemaVersion: 1,
      revision: 1,
      authority: 'canon',
      visibility: 'player-known',
      sources: [],
    },
    title: 'Glass Sea',
    body: 'A bounded guide to the setting and its source directories.',
  });
  const objectHash = await store.putDocument(orientation);
  const manifest = worldPackageManifestSchema.parse({
    format: 'offscreen.world-package-manifest.v1',
    worldId,
    title: 'Glass Sea',
    revision: 1,
    previousRootHash: null,
    authorOperationId: randomUUID(),
    orientationDocumentId: orientationId,
    entries: [
      {
        documentId: orientationId,
        revision: 1,
        path: 'WORLD.md',
        objectHash,
        kind: 'orientation',
        authority: 'canon',
        visibility: 'player-known',
        sourceBytes: Buffer.byteLength(orientation.body, 'utf8'),
        sections: [],
      },
    ],
  });
  const rootHash = await store.putWorldPackageManifest(manifest);
  assert.deepEqual(await store.readWorldPackageManifest(rootHash), manifest);
  assert.deepEqual(
    worldPackageReferenceSchema.parse({
      worldId,
      rootHash,
      revision: 1,
      mount: 'glass-sea',
    }),
    { worldId, rootHash, revision: 1, mount: 'glass-sea' },
  );
});

test('rule packages pin a compact index to an exact executable adapter', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-rule-package-'));
  const store = new LocalDocumentStore(root);
  const ruleSetId = randomUUID();
  const orientationId = randomUUID();
  const orientation = canonicalDocumentSchema.parse({
    format: 'offscreen.document.v1',
    envelope: {
      documentId: orientationId,
      kind: 'orientation',
      schemaVersion: 1,
      revision: 1,
      authority: 'source',
      visibility: 'player-known',
      sources: [],
    },
    title: 'Rules index',
    body: '# Rules index\n\nUse the topic map; load only the cited section.',
  });
  const objectHash = await store.putDocument(orientation);
  const engine = { adapterId: 'srd-5.2.1-subset', adapterVersion: 1 };
  const license = {
    name: 'CC BY 4.0',
    source: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'Example attribution',
  };
  const manifest = rulePackageManifestSchema.parse({
    format: 'offscreen.rule-package-manifest.v1',
    ruleSetId,
    title: 'SRD 5.2.1 subset',
    revision: 1,
    previousRootHash: null,
    authorOperationId: randomUUID(),
    orientationDocumentId: orientationId,
    engine,
    license,
    entries: [
      {
        documentId: orientationId,
        revision: 1,
        path: 'RULES.md',
        objectHash,
        kind: 'orientation',
        authority: 'source',
        visibility: 'player-known',
        sourceBytes: Buffer.byteLength(orientation.body, 'utf8'),
        topics: ['rules-index'],
        sections: [
          {
            heading: 'Rules index',
            level: 1,
            line: 1,
            topics: ['rules-index'],
          },
        ],
      },
    ],
  });
  const rootHash = await store.putRulePackageManifest(manifest);
  assert.deepEqual(await store.readRulePackageManifest(rootHash), manifest);
  assert.deepEqual(
    rulePackageReferenceSchema.parse({
      ruleSetId,
      rootHash,
      revision: 1,
      engine,
    }),
    { ruleSetId, rootHash, revision: 1, engine },
  );
});

test('start packages distinguish canon, possibilities, and executable obligations', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-start-package-'));
  const store = new LocalDocumentStore(root);
  const startPackageId = randomUUID();
  const orientationId = randomUUID();
  const possibilityId = randomUUID();
  const obligationId = randomUUID();
  const makeDocument = (documentId, kind, authority, visibility, title) =>
    canonicalDocumentSchema.parse({
      format: 'offscreen.document.v1',
      envelope: {
        documentId,
        kind,
        schemaVersion: 1,
        revision: 1,
        authority,
        visibility,
        sources: [],
      },
      title,
      body: `# ${title}`,
    });
  const documents = [
    {
      document: makeDocument(
        orientationId,
        'orientation',
        'canon',
        'player-known',
        'Arrival at the salt port',
      ),
      path: 'START.md',
      activation: 'initial-canon',
    },
    {
      document: makeDocument(
        possibilityId,
        'private-possibility',
        'noncanonical',
        'storyteller-private',
        'A claimant may seek the buried engine',
      ),
      path: 'possibilities/buried-engine.md',
      activation: 'private-possibility',
    },
    {
      document: canonicalStructuredDocumentSchema.parse({
        format: 'offscreen.structured-document.v1',
        envelope: {
          documentId: obligationId,
          kind: 'world-obligation',
          schemaVersion: 1,
          revision: 1,
          authority: 'canon',
          visibility: 'storyteller-private',
          sources: [],
        },
        schemaId: 'world-obligation.v1',
        data: { version: 1, dueGameSecond: 40, label: 'The tide gate closes' },
      }),
      path: 'obligations/tide-gate.json',
      activation: 'executable-obligation',
    },
  ];
  const entries = [];
  for (const item of documents) {
    entries.push({
      documentId: item.document.envelope.documentId,
      revision: 1,
      path: item.path,
      objectHash:
        item.document.format === 'offscreen.structured-document.v1'
          ? await store.putStructuredDocument(item.document)
          : await store.putDocument(item.document),
      kind: item.document.envelope.kind,
      authority: item.document.envelope.authority,
      visibility: item.document.envelope.visibility,
      activation: item.activation,
    });
  }
  const manifest = startPackageManifestSchema.parse({
    format: 'offscreen.start-package-manifest.v1',
    startPackageId,
    title: 'Salt port arrival',
    revision: 1,
    previousRootHash: null,
    authorOperationId: randomUUID(),
    orientationDocumentId: orientationId,
    worlds: [],
    rules: {
      ruleSetId: randomUUID(),
      rootHash: entries[0].objectHash,
      revision: 1,
      engine: { adapterId: 'srd-5.2.1-subset', adapterVersion: 1 },
    },
    entries,
  });
  const rootHash = await store.putStartPackageManifest(manifest);
  assert.deepEqual(await store.readStartPackageManifest(rootHash), manifest);
  assert.throws(() =>
    startPackageManifestSchema.parse({
      ...manifest,
      entries: manifest.entries.map((entry) =>
        entry.documentId === possibilityId
          ? { ...entry, activation: 'initial-canon' }
          : entry,
      ),
    }),
  );
});
