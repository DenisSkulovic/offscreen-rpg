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
import { decideActionExecutionTransition } from '../../../packages/story-engine/dist/campaign/action-execution-transition.js';
import {
  harborCompassItems,
  harborCompassTransferPlan,
} from '../../../packages/story-engine/dist/campaign/fixtures/item-transfer-plans.js';
import {
  publicationChangedDocumentId,
  publicationPassageId,
  stageStoryPublicationDocuments,
} from '../../../packages/story-engine/dist/stories/passage-documents.js';
import { loadCanonicalKnowledge } from '../../../packages/story-engine/dist/storyteller/canonical-knowledge.js';
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

function campaignState() {
  return {
    storyId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    settingsRevision: 1,
    locked: 0,
    character: {
      name: 'A quay runner',
      scores: {
        strength: 10,
        dexterity: 12,
        constitution: 12,
        intelligence: 10,
        wisdom: 12,
        charisma: 14,
      },
      applicableAbilities: [
        'strength',
        'dexterity',
        'constitution',
        'intelligence',
        'wisdom',
        'charisma',
      ],
      skills: [{ id: 'persuasion', label: 'Persuasion' }],
      proficientSkills: ['persuasion'],
      proficiencyBonus: 2,
      hp: 10,
      maxHp: 10,
      facts: [],
      quantities: [],
    },
    storyFacts: [],
    activityOccurrences: [],
    acceptedActivityPlan: null,
    content: {},
    location: null,
    gameSecond: 0,
    clock: {
      elapsedGameSeconds: 0,
      remainder: { numerator: '0', denominator: '1' },
    },
    clockAnchorAt: new Date(0),
    clockPace: { kind: 'instant' },
    holds: [],
    offer: null,
    situationAuthorization: {},
    activeActivityId: null,
    activeActionOperationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    worldConditions: [],
  };
}

function settleCompass(items, roll) {
  return decideActionExecutionTransition({
    state: campaignState(),
    execution: {
      operationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      revision: 0,
      startGameSecond: 0,
      targetGameSecond: 10,
      plan: harborCompassTransferPlan,
      items,
    },
    clockHeld: false,
    now: 0,
    rollDie: () => roll,
  });
}

async function emptyPublicationStore() {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-real02-'));
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
  return {
    storage,
    storyId,
    rootHash: await storage.putManifest(base),
    rootRevision: 1,
  };
}

test('a settled compass transfer can stage one source-linked favor, and a failed check stages none', async () => {
  const succeeded = settleCompass(harborCompassItems, 15);
  assert.equal(succeeded.state, 'settled');
  assert.equal(succeeded.receipt.worldEffects.length, 1);
  const gift = createDescriptiveMaterializationFixtures({
    scenarioIds: ['named-gift-relationship'],
  })[0];
  const store = await emptyPublicationStore();
  const operationId = randomUUID();
  const staged = await stageStoryPublicationDocuments({
    storage: store.storage,
    storyId: store.storyId,
    passageId: publicationPassageId(operationId),
    sequence: 2,
    operationId,
    rootHash: store.rootHash,
    rootRevision: store.rootRevision,
    content: passage('The compass changes hands'),
    changes: succeeded.receipt.worldEffects.length ? [gift.change] : [],
  });
  const manifest = await store.storage.readManifest(staged.rootHash);
  const favor = manifest.entries.find((entry) => entry.path === gift.change.path);
  assert.ok(favor);
  assert.equal(favor.kind, 'relationship');
  assert.equal(favor.authority, 'canon');
  assert.equal(
    favor.documentId,
    publicationChangedDocumentId(operationId, 0, gift.change),
  );
  const document = await store.storage.readDocument(favor.objectHash);
  assert.equal(document.envelope.sources[0]?.documentId, staged.passageId);
  assert.match(document.body, /Mira Vale still owes/);

  const failed = settleCompass(harborCompassItems, 1);
  assert.equal(failed.state, 'settled');
  assert.deepEqual(failed.receipt.worldEffects, []);
  const quiet = await emptyPublicationStore();
  const quietOperationId = randomUUID();
  const quietStaged = await stageStoryPublicationDocuments({
    storage: quiet.storage,
    storyId: quiet.storyId,
    passageId: publicationPassageId(quietOperationId),
    sequence: 2,
    operationId: quietOperationId,
    rootHash: quiet.rootHash,
    rootRevision: quiet.rootRevision,
    content: passage('The compass stays with the runner'),
    changes: [],
  });
  const quietManifest = await quiet.storage.readManifest(quietStaged.rootHash);
  assert.equal(
    quietManifest.entries.some((entry) => entry.kind === 'relationship'),
    false,
  );
  assert.equal(quietManifest.entries.length, 1);
});

test('the document stager stores a favor even after the transfer failed', async () => {
  const failed = settleCompass(harborCompassItems, 1);
  assert.deepEqual(failed.receipt.worldEffects, []);
  const rejected = createDescriptiveMaterializationFixtures({
    scenarioIds: ['failed-transfer-rejected'],
  })[0];
  assert.equal(rejected.decision.action, 'reject');
  assert.equal(rejected.accepted, true);
  const store = await emptyPublicationStore();
  const operationId = randomUUID();
  const staged = await stageStoryPublicationDocuments({
    storage: store.storage,
    storyId: store.storyId,
    passageId: publicationPassageId(operationId),
    sequence: 2,
    operationId,
    rootHash: store.rootHash,
    rootRevision: store.rootRevision,
    content: passage('The narration claims the gift anyway'),
    changes: [rejected.change],
  });
  const manifest = await store.storage.readManifest(staged.rootHash);
  const favor = manifest.entries.find(
    (entry) => entry.path === rejected.change.path,
  );
  assert.ok(favor);
  assert.equal(favor.authority, 'canon');
});

test('a rumor stays attributed, a crowd adds no record, and a second create does not duplicate the path', async () => {
  const rumor = createDescriptiveMaterializationFixtures({
    scenarioIds: ['disputed-attributed-lore'],
  })[0];
  const crowd = createDescriptiveMaterializationFixtures({
    scenarioIds: ['passing-crowd-omit'],
  })[0];
  assert.equal(rumor.decision.authority, 'attributed');
  assert.equal(crowd.decision.action, 'omit');
  assert.equal(crowd.change, null);
  const store = await emptyPublicationStore();
  const operationId = randomUUID();
  const staged = await stageStoryPublicationDocuments({
    storage: store.storage,
    storyId: store.storyId,
    passageId: publicationPassageId(operationId),
    sequence: 2,
    operationId,
    rootHash: store.rootHash,
    rootRevision: store.rootRevision,
    content: passage('Someone mentions a beacon and a passing dockworker'),
    changes: [rumor.change],
  });
  const manifest = await store.storage.readManifest(staged.rootHash);
  const entry = manifest.entries.find((item) => item.path === rumor.change.path);
  assert.ok(entry);
  assert.equal(entry.authority, 'attributed');
  assert.equal(entry.kind, 'lore');
  const document = await store.storage.readDocument(entry.objectHash);
  assert.match(document.body, /not settled world fact/);
  assert.equal(
    manifest.entries.some((item) => item.kind === 'identity'),
    false,
  );
  await assert.rejects(
    () =>
      stageStoryPublicationDocuments({
        storage: store.storage,
        storyId: store.storyId,
        passageId: publicationPassageId(randomUUID()),
        sequence: 3,
        operationId: randomUUID(),
        rootHash: staged.rootHash,
        rootRevision: staged.rootRevision,
        content: passage('The same rumor is proposed again'),
        changes: [rumor.change],
      }),
    (error) => error?.reason === 'document_path',
  );
  const after = await store.storage.readManifest(staged.rootHash);
  assert.equal(
    after.entries.filter((item) => item.path === rumor.change.path).length,
    1,
  );
});

test('an unselected favor stays out of loaded bodies, while a private possibility is still loaded', async () => {
  const gift = createDescriptiveMaterializationFixtures({
    scenarioIds: ['named-gift-relationship'],
  })[0];
  const store = await emptyPublicationStore();
  const operationId = randomUUID();
  let staged = await stageStoryPublicationDocuments({
    storage: store.storage,
    storyId: store.storyId,
    passageId: publicationPassageId(operationId),
    sequence: 2,
    operationId,
    rootHash: store.rootHash,
    rootRevision: store.rootRevision,
    content: passage('The favor is written down'),
    changes: [gift.change],
  });
  for (let index = 0; index < 9; index += 1) {
    const identityOperationId = randomUUID();
    staged = await stageStoryPublicationDocuments({
      storage: store.storage,
      storyId: store.storyId,
      passageId: publicationPassageId(identityOperationId),
      sequence: staged.rootRevision + 1,
      operationId: identityOperationId,
      rootHash: staged.rootHash,
      rootRevision: staged.rootRevision,
      content: passage(`Dock identity ${index}`),
      changes: [
        {
          operation: 'create',
          path: `identities/people/dock-${index}.md`,
          kind: 'identity',
          authority: 'canon',
          visibility: 'player-known',
          title: `Dock ${index}`,
          body: `Dock person ${index} has no favor to repay.`,
          reason: 'Intervening identity noise',
        },
      ],
    });
  }
  const favorId = publicationChangedDocumentId(operationId, 0, gift.change);
  const unselected = await loadCanonicalKnowledge(store.storage, {
    storyId: store.storyId,
    rootHash: staged.rootHash,
    rootRevision: staged.rootRevision,
  });
  assert.equal(
    unselected.documents.some((document) =>
      document.body.includes('Mira Vale still owes'),
    ),
    false,
  );
  const catalogueFavor = unselected.catalogue.find(
    (entry) => entry.documentId === favorId,
  );
  assert.ok(catalogueFavor);
  assert.equal(catalogueFavor.loaded, false);
  const selected = await loadCanonicalKnowledge(store.storage, {
    storyId: store.storyId,
    rootHash: staged.rootHash,
    rootRevision: staged.rootRevision,
    campaignDocumentIds: [favorId],
  });
  assert.equal(
    selected.documents.some((document) =>
      document.body.includes('Mira Vale still owes'),
    ),
    true,
  );

  const privateStore = await emptyPublicationStore();
  const privateOperationId = randomUUID();
  const privateStaged = await stageStoryPublicationDocuments({
    storage: privateStore.storage,
    storyId: privateStore.storyId,
    passageId: publicationPassageId(privateOperationId),
    sequence: 2,
    operationId: privateOperationId,
    rootHash: privateStore.rootHash,
    rootRevision: privateStore.rootRevision,
    content: passage('A private note is proposed'),
    changes: [
      {
        operation: 'create',
        path: 'private/quay-note.md',
        kind: 'private-possibility',
        authority: 'noncanonical',
        visibility: 'storyteller-private',
        title: 'Private quay note',
        body: 'The private quay note must stay out of the model packet.',
        reason: 'A private possibility is not player knowledge',
      },
    ],
  });
  const leaked = await loadCanonicalKnowledge(privateStore.storage, {
    storyId: privateStore.storyId,
    rootHash: privateStaged.rootHash,
    rootRevision: privateStaged.rootRevision,
  });
  assert.equal(
    leaked.documents.some((document) =>
      document.body.includes('private quay note'),
    ),
    true,
  );
});
