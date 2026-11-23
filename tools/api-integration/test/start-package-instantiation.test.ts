import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import {
  applyLibraryBatch,
  canonicalDocumentSchema,
  collectLibraryManifestEntries,
  createEmptyLibraryIndex,
  loadLibraryIndex,
  LocalDocumentStore,
  rulePackageManifestSchema,
  startPackageManifestSchema,
  type DocumentStore,
} from '@offscreen/documents';
import { instantiateStartPackage } from '@offscreen/story-engine/stories/start-package-instantiation';

test('start package instantiation clones campaign documents with exact provenance', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-start-instance-'));
  const store = new LocalDocumentStore(root);
  const ruleSetId = randomUUID();
  const ruleDocumentId = randomUUID();
  const ruleDocument = canonicalDocumentSchema.parse({
    format: 'offscreen.document.v1',
    envelope: {
      documentId: ruleDocumentId,
      kind: 'orientation',
      schemaVersion: 1,
      revision: 1,
      authority: 'source',
      visibility: 'player-known',
      sources: [],
    },
    title: 'Rules',
    body: '# Rules',
  });
  const ruleObjectHash = await store.putDocument(ruleDocument);
  const ruleManifest = rulePackageManifestSchema.parse({
    format: 'offscreen.rule-package-manifest.v1',
    ruleSetId,
    title: 'Test rules',
    revision: 1,
    previousRootHash: null,
    authorOperationId: randomUUID(),
    orientationDocumentId: ruleDocumentId,
    engine: { adapterId: 'offscreen-core', adapterVersion: 1 },
    license: {
      name: 'Test fixture',
      source: 'https://example.invalid/rules',
      attribution: 'Invented test rules.',
    },
    entries: [
      {
        documentId: ruleDocumentId,
        revision: 1,
        path: 'RULES.md',
        objectHash: ruleObjectHash,
        kind: 'orientation',
        authority: 'source',
        visibility: 'player-known',
        sourceBytes: 7,
        topics: ['orientation'],
        sections: [
          { heading: 'Rules', level: 1, line: 1, topics: ['orientation'] },
        ],
      },
    ],
  });
  const ruleRootHash = await store.putRulePackageManifest(ruleManifest);
  const packageDocumentId = randomUUID();
  const packageDocument = canonicalDocumentSchema.parse({
    format: 'offscreen.document.v1',
    envelope: {
      documentId: packageDocumentId,
      kind: 'orientation',
      schemaVersion: 1,
      revision: 1,
      authority: 'canon',
      visibility: 'player-known',
      sources: [],
    },
    title: 'A current without shores',
    body: 'The organism responds to gradients.',
  });
  const packageObjectHash = await store.putDocument(packageDocument);
  const startPackageId = randomUUID();
  const startManifest = startPackageManifestSchema.parse({
    format: 'offscreen.start-package-manifest.v1',
    startPackageId,
    title: 'Gradient life',
    revision: 1,
    previousRootHash: null,
    authorOperationId: randomUUID(),
    orientationDocumentId: packageDocumentId,
    worlds: [],
    rules: {
      ruleSetId,
      rootHash: ruleRootHash,
      revision: 1,
      engine: ruleManifest.engine,
    },
    entries: [
      {
        documentId: packageDocumentId,
        revision: 1,
        path: 'START.md',
        objectHash: packageObjectHash,
        kind: 'orientation',
        authority: 'canon',
        visibility: 'player-known',
        activation: 'initial-canon',
      },
    ],
  });
  const startRootHash = await store.putStartPackageManifest(startManifest);
  const campaignId = randomUUID();
  const operationId = randomUUID();
  const first = await instantiateStartPackage(store, {
    startRootHash,
    campaignId,
    operationId,
  });
  const retry = await instantiateStartPackage(store, {
    startRootHash,
    campaignId,
    operationId,
  });
  assert.equal(retry.rootHash, first.rootHash);
  assert.equal(first.manifest.entries.length, 4);
  const cloned = first.manifest.entries.find(
    (entry) => entry.path === 'START.md',
  );
  assert.ok(cloned);
  assert.notEqual(cloned.documentId, packageDocumentId);
  assert.deepEqual(
    (await store.readDocument(cloned.objectHash)).envelope.sources,
    [{ documentId: packageDocumentId, revision: 1 }],
  );
  const referenceEntry = first.manifest.entries.find(
    (entry) => entry.path === 'start/reference.json',
  );
  assert.ok(referenceEntry);
  const reference = await store.readStructuredDocument(
    referenceEntry.objectHash,
  );
  assert.ok(
    reference.data &&
      typeof reference.data === 'object' &&
      !Array.isArray(reference.data),
  );
  const referenceData = reference.data as {
    rootHash: string;
    entries: Array<{ campaignDocumentId: string }>;
  };
  assert.equal(referenceData.rootHash, startRootHash);
  const referenceEntryRow = referenceData.entries[0];
  assert.ok(referenceEntryRow);
  assert.equal(referenceEntryRow.campaignDocumentId, cloned.documentId);
  assert.equal(
    first.manifest.entries.some((entry) => entry.kind === 'character'),
    false,
  );
});

async function stageV2CampaignEntries(
  store: DocumentStore,
  campaignId: string,
) {
  const leftId = randomUUID();
  const rightId = randomUUID();
  const leftDoc = canonicalDocumentSchema.parse({
    format: 'offscreen.document.v1',
    envelope: {
      documentId: leftId,
      kind: 'lore',
      schemaVersion: 1,
      revision: 1,
      authority: 'canon',
      visibility: 'player-known',
      sources: [],
    },
    title: 'Harbor',
    body: 'Fog on the quay.',
  });
  const rightDoc = canonicalDocumentSchema.parse({
    format: 'offscreen.document.v1',
    envelope: {
      documentId: rightId,
      kind: 'lore',
      schemaVersion: 1,
      revision: 1,
      authority: 'canon',
      visibility: 'player-known',
      sources: [],
    },
    title: 'Ledger',
    body: 'Unpaid mooring fees.',
  });
  const leftHash = await store.putDocument(leftDoc);
  const rightHash = await store.putDocument(rightDoc);
  let library = createEmptyLibraryIndex();
  library = applyLibraryBatch(library, [
    {
      op: 'create',
      entry: {
        documentId: leftId,
        revision: 1,
        path: 'world/harbor.md',
        objectHash: leftHash,
        kind: 'lore',
        authority: 'canon',
        visibility: 'player-known',
      },
    },
    {
      op: 'create',
      entry: {
        documentId: rightId,
        revision: 1,
        path: 'world/ledger.md',
        objectHash: rightHash,
        kind: 'lore',
        authority: 'canon',
        visibility: 'player-known',
      },
    },
  ]);
  for (const [, node] of library.store) {await store.putLibraryNode(node);}
  const baseRootHash = await store.putLibraryRoot(library.root);
  return { baseRootHash, leftId, leftHash, rightHash, campaignId };
}

async function minimalStartPackage(store: DocumentStore) {
  const ruleSetId = randomUUID();
  const ruleDocumentId = randomUUID();
  const ruleObjectHash = await store.putDocument(
    canonicalDocumentSchema.parse({
      format: 'offscreen.document.v1',
      envelope: {
        documentId: ruleDocumentId,
        kind: 'orientation',
        schemaVersion: 1,
        revision: 1,
        authority: 'source',
        visibility: 'player-known',
        sources: [],
      },
      title: 'Rules',
      body: '# Rules',
    }),
  );
  const ruleRootHash = await store.putRulePackageManifest(
    rulePackageManifestSchema.parse({
      format: 'offscreen.rule-package-manifest.v1',
      ruleSetId,
      title: 'Test rules',
      revision: 1,
      previousRootHash: null,
      authorOperationId: randomUUID(),
      orientationDocumentId: ruleDocumentId,
      engine: { adapterId: 'offscreen-core', adapterVersion: 1 },
      license: {
        name: 'Test fixture',
        source: 'https://example.invalid/rules',
        attribution: 'Invented test rules.',
      },
      entries: [
        {
          documentId: ruleDocumentId,
          revision: 1,
          path: 'RULES.md',
          objectHash: ruleObjectHash,
          kind: 'orientation',
          authority: 'source',
          visibility: 'player-known',
          sourceBytes: 7,
          topics: ['orientation'],
          sections: [
            { heading: 'Rules', level: 1, line: 1, topics: ['orientation'] },
          ],
        },
      ],
    }),
  );
  const packageDocumentId = randomUUID();
  const packageObjectHash = await store.putDocument(
    canonicalDocumentSchema.parse({
      format: 'offscreen.document.v1',
      envelope: {
        documentId: packageDocumentId,
        kind: 'orientation',
        schemaVersion: 1,
        revision: 1,
        authority: 'canon',
        visibility: 'player-known',
        sources: [],
      },
      title: 'Opening',
      body: 'Salt air.',
    }),
  );
  return store.putStartPackageManifest(
    startPackageManifestSchema.parse({
      format: 'offscreen.start-package-manifest.v1',
      startPackageId: randomUUID(),
      title: 'Quay start',
      revision: 1,
      previousRootHash: null,
      authorOperationId: randomUUID(),
      orientationDocumentId: packageDocumentId,
      worlds: [],
      rules: {
        ruleSetId,
        rootHash: ruleRootHash,
        revision: 1,
        engine: { adapterId: 'offscreen-core', adapterVersion: 1 },
      },
      entries: [
        {
          documentId: packageDocumentId,
          revision: 1,
          path: 'START.md',
          objectHash: packageObjectHash,
          kind: 'orientation',
          authority: 'canon',
          visibility: 'player-known',
          activation: 'initial-canon',
        },
      ],
    }),
  );
}

test('start package overlays a v2 library root without rehashing untouched nodes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-start-v2-'));
  const store = new LocalDocumentStore(root);
  const campaignId = randomUUID();
  const operationId = randomUUID();
  const staged = await stageV2CampaignEntries(store, campaignId);
  const startRootHash = await minimalStartPackage(store);
  const overlaid = await instantiateStartPackage(store, {
    startRootHash,
    campaignId,
    operationId,
    baseRootHash: staged.baseRootHash,
    baseRootRevision: 1,
  });
  const v2Root = await store.readLibraryRoot(overlaid.rootHash);
  assert.equal(v2Root.format, 'offscreen.library-root.v2');
  const indexed = collectLibraryManifestEntries(
    await loadLibraryIndex((hash) => store.readLibraryNode(hash), v2Root),
  );
  const harbor = indexed.find((entry) => entry.path === 'world/harbor.md');
  const ledger = indexed.find((entry) => entry.path === 'world/ledger.md');
  assert.ok(harbor);
  assert.ok(ledger);
  assert.equal(harbor.objectHash, staged.leftHash);
  assert.equal(ledger.objectHash, staged.rightHash);
  assert.ok(indexed.some((entry) => entry.path === 'start/package.md'));
});

test('start package v2 overlay rejects colliding paths', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-start-v2-collision-'));
  const store = new LocalDocumentStore(root);
  const campaignId = randomUUID();
  const staged = await stageV2CampaignEntries(store, campaignId);
  const rulesStartRoot = await minimalStartPackage(store);
  const rules = await store.readStartPackageManifest(rulesStartRoot);
  const orientationDocumentId = randomUUID();
  const collisionDocumentId = randomUUID();
  const orientationObjectHash = await store.putDocument(
    canonicalDocumentSchema.parse({
      format: 'offscreen.document.v1',
      envelope: {
        documentId: orientationDocumentId,
        kind: 'orientation',
        schemaVersion: 1,
        revision: 1,
        authority: 'canon',
        visibility: 'player-known',
        sources: [],
      },
      title: 'Opening',
      body: 'Salt air.',
    }),
  );
  const collisionObjectHash = await store.putDocument(
    canonicalDocumentSchema.parse({
      format: 'offscreen.document.v1',
      envelope: {
        documentId: collisionDocumentId,
        kind: 'lore',
        schemaVersion: 1,
        revision: 1,
        authority: 'canon',
        visibility: 'player-known',
        sources: [],
      },
      title: 'Harbor clash',
      body: 'Different fog.',
    }),
  );
  const startRootHash = await store.putStartPackageManifest(
    startPackageManifestSchema.parse({
      ...rules,
      startPackageId: randomUUID(),
      title: 'Collision start',
      authorOperationId: randomUUID(),
      orientationDocumentId,
      entries: [
        {
          documentId: orientationDocumentId,
          revision: 1,
          path: 'START.md',
          objectHash: orientationObjectHash,
          kind: 'orientation',
          authority: 'canon',
          visibility: 'player-known',
          activation: 'initial-canon',
        },
        {
          documentId: collisionDocumentId,
          revision: 1,
          path: 'world/harbor.md',
          objectHash: collisionObjectHash,
          kind: 'lore',
          authority: 'canon',
          visibility: 'player-known',
          activation: 'initial-canon',
        },
      ],
    }),
  );
  await assert.rejects(
    instantiateStartPackage(store, {
      startRootHash,
      campaignId,
      operationId: randomUUID(),
      baseRootHash: staged.baseRootHash,
      baseRootRevision: 1,
    }),
    /collides with campaign: world\/harbor\.md/,
  );
});
