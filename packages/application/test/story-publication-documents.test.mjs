import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import {
  LocalDocumentStore,
  documentManifestSchema,
} from '@offscreen/documents';
import {
  publicationPassageId,
  stageStoryPublicationDocuments,
} from '../dist/stories/passage-documents.js';
import { createDescriptiveMaterializationFixtures } from '@offscreen/storyteller/tasks';

const passage = (title) => ({
  version: 1,
  title,
  paragraphs: [`${title} changes what is now true in the world.`],
});

test('story publication stores one source passage and revisioned canonical changes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-publication-'));
  const storage = new LocalDocumentStore(root);
  const storyId = randomUUID();
  const base = documentManifestSchema.parse({
    format: 'offscreen.manifest.v1',
    campaignId: storyId,
    revision: 1,
    previousRootHash: null,
    authorOperationId: randomUUID(),
    entries: [],
  });
  const baseRootHash = await storage.putManifest(base);

  const createOperationId = randomUUID();
  const created = await stageStoryPublicationDocuments({
    storage,
    storyId,
    passageId: publicationPassageId(createOperationId),
    sequence: 2,
    operationId: createOperationId,
    rootHash: baseRootHash,
    rootRevision: 1,
    content: passage('The dragon strikes'),
    changes: [
      {
        operation: 'create',
        path: 'world/places/emberfall.md',
        kind: 'lore',
        authority: 'canon',
        visibility: 'player-known',
        title: 'Emberfall',
        body: 'The western wall has collapsed.',
        reason: 'The narrated attack changed the city.',
      },
      {
        operation: 'create',
        path: 'identities/people/ash-watcher.md',
        kind: 'identity',
        authority: 'canon',
        visibility: 'player-known',
        title: 'The ash watcher',
        body: 'A soot-covered witness remained beside the western gate.',
        reason: 'The witness became relevant beyond the passing scene.',
      },
    ],
  });
  const createdManifest = await storage.readManifest(created.rootHash);
  const loreEntry = createdManifest.entries.find(
    (entry) => entry.path === 'world/places/emberfall.md',
  );
  assert.ok(loreEntry);
  assert.equal(createdManifest.previousRootHash, baseRootHash);
  assert.equal(createdManifest.revision, 2);
  assert.equal(createdManifest.entries.length, 3);
  const identityEntry = createdManifest.entries.find(
    (entry) => entry.path === 'identities/people/ash-watcher.md',
  );
  assert.ok(identityEntry);
  assert.equal(identityEntry.kind, 'identity');
  const identity = await storage.readDocument(identityEntry.objectHash);
  assert.deepEqual(identity.envelope.sources, [
    { documentId: created.passageId, revision: 1 },
  ]);
  const lore = await storage.readDocument(loreEntry.objectHash);
  assert.deepEqual(lore.envelope.sources, [
    { documentId: created.passageId, revision: 1 },
  ]);

  const reviseOperationId = randomUUID();
  const revised = await stageStoryPublicationDocuments({
    storage,
    storyId,
    passageId: publicationPassageId(reviseOperationId),
    sequence: 3,
    operationId: reviseOperationId,
    rootHash: created.rootHash,
    rootRevision: 2,
    content: passage('The wall is repaired'),
    changes: [
      {
        operation: 'revise',
        documentId: loreEntry.documentId,
        expectedRevision: 1,
        path: loreEntry.path,
        kind: 'lore',
        authority: 'canon',
        visibility: 'player-known',
        title: 'Emberfall',
        body: 'The western wall has been rebuilt with black glass.',
        reason: 'The repair completed in the narrated passage.',
      },
    ],
  });
  const revisedManifest = await storage.readManifest(revised.rootHash);
  const revisedEntry = revisedManifest.entries.find(
    (entry) => entry.documentId === loreEntry.documentId,
  );
  assert.ok(revisedEntry);
  assert.equal(revisedEntry.revision, 2);
  assert.equal(revisedManifest.previousRootHash, created.rootHash);
  assert.equal(revisedManifest.entries.length, 4);

  await assert.rejects(
    stageStoryPublicationDocuments({
      storage,
      storyId,
      passageId: publicationPassageId(randomUUID()),
      sequence: 4,
      operationId: randomUUID(),
      rootHash: revised.rootHash,
      rootRevision: 3,
      content: passage('A malformed promotion'),
      changes: [
        {
          operation: 'revise',
          documentId: loreEntry.documentId,
          expectedRevision: 2,
          path: 'identities/people/emberfall.md',
          kind: 'identity',
          authority: 'canon',
          visibility: 'player-known',
          title: 'Emberfall is not a person',
          body: 'A location identity cannot be silently recast as a person.',
          reason: 'Exercise stable logical document kinds.',
        },
      ],
    }),
    (error) => error?.reason === 'document_kind',
  );

  await assert.rejects(
    stageStoryPublicationDocuments({
      storage,
      storyId,
      passageId: publicationPassageId(randomUUID()),
      sequence: 4,
      operationId: randomUUID(),
      rootHash: revised.rootHash,
      rootRevision: 3,
      content: passage('A stale rewrite'),
      changes: [
        {
          operation: 'revise',
          documentId: loreEntry.documentId,
          expectedRevision: 1,
          path: loreEntry.path,
          kind: 'lore',
          authority: 'canon',
          visibility: 'player-known',
          title: 'Emberfall',
          body: 'This stale version must not become canonical.',
          reason: 'Exercise optimistic revision protection.',
        },
      ],
    }),
    (error) => error?.reason === 'document_revision',
  );
});

test('gift relationship survives twenty intervening passages with source linkage', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-sa09-gift-'));
  const storage = new LocalDocumentStore(root);
  const storyId = randomUUID();
  const base = documentManifestSchema.parse({
    format: 'offscreen.manifest.v1',
    campaignId: storyId,
    revision: 1,
    previousRootHash: null,
    authorOperationId: randomUUID(),
    entries: [],
  });
  let rootHash = await storage.putManifest(base);
  let rootRevision = 1;

  const giftFixture = createDescriptiveMaterializationFixtures({
    scenarioIds: ['named-gift-relationship'],
  })[0];
  assert.equal(giftFixture.accepted, true);
  assert.ok(giftFixture.change);

  const giftOperationId = randomUUID();
  const gifted = await stageStoryPublicationDocuments({
    storage,
    storyId,
    passageId: publicationPassageId(giftOperationId),
    sequence: 2,
    operationId: giftOperationId,
    rootHash,
    rootRevision,
    content: passage('The clasp changes hands'),
    changes: [giftFixture.change],
  });
  rootHash = gifted.rootHash;
  rootRevision = 2;

  const sameNameOperationId = randomUUID();
  const sameName = await stageStoryPublicationDocuments({
    storage,
    storyId,
    passageId: publicationPassageId(sameNameOperationId),
    sequence: 3,
    operationId: sameNameOperationId,
    rootHash,
    rootRevision,
    content: passage('Another Mira appears'),
    changes: [
      {
        operation: 'create',
        path: 'identities/people/mira-pell.md',
        kind: 'identity',
        authority: 'canon',
        visibility: 'player-known',
        title: 'Mira Pell',
        body: 'A different Mira who never received the clasp.',
        reason: 'Same given name must not collapse into Mira Vale',
      },
    ],
  });
  rootHash = sameName.rootHash;
  rootRevision = 3;

  for (let index = 0; index < 20; index += 1) {
    const operationId = randomUUID();
    const staged = await stageStoryPublicationDocuments({
      storage,
      storyId,
      passageId: publicationPassageId(operationId),
      sequence: rootRevision + 1,
      operationId,
      rootHash,
      rootRevision,
      content: passage(`Unrelated quay weather ${index}`),
      changes: [
        {
          operation: 'create',
          path: `lore/weather/day-${String(index).padStart(2, '0')}.md`,
          kind: 'lore',
          authority: 'canon',
          visibility: 'player-known',
          title: `Weather ${index}`,
          body: `The tide note for day ${index} mentions nobody named Mira Vale.`,
          reason: 'Intervening noise must not erase the gift record',
        },
      ],
    });
    rootHash = staged.rootHash;
    rootRevision += 1;
  }

  const manifest = await storage.readManifest(rootHash);
  const favor = manifest.entries.find(
    (entry) => entry.path === giftFixture.change.path,
  );
  const miraPell = manifest.entries.find(
    (entry) => entry.path === 'identities/people/mira-pell.md',
  );
  assert.ok(favor);
  assert.ok(miraPell);
  assert.notEqual(favor.documentId, miraPell.documentId);
  const favorDocument = await storage.readDocument(favor.objectHash);
  assert.match(favorDocument.body, /Mira Vale still owes/);
  assert.equal(favorDocument.envelope.sources.length, 1);
  assert.equal(
    favorDocument.envelope.sources[0]?.documentId,
    gifted.passageId,
  );

  const rejected = createDescriptiveMaterializationFixtures({
    scenarioIds: ['failed-transfer-rejected', 'passing-crowd-omit'],
  });
  assert.equal(rejected[0]?.decision.action, 'reject');
  assert.equal(rejected[1]?.decision.action, 'omit');
});
