import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { campaign, campaignSettings } from '@offscreen/db/campaign-schema';
import { story, storyItem, storyPassage } from '@offscreen/db/story-schema';
import {
  LocalDocumentStore,
  canonicalDocumentSchema,
  documentManifestSchema,
  sceneCheckpointSchema,
} from '@offscreen/documents';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../dist/developer-tools/index.js';
import { StoryError, createStories } from '../dist/stories/index.js';
import { insertSceneCheckpointReference } from '../dist/stories/scene-checkpoint.js';

function character() {
  return {
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
    hp: 20,
    maxHp: 20,
    facts: [],
    quantities: [],
  };
}

function settingsDocument(profile) {
  return {
    revision: 1,
    creative: {
      profile,
      tone: 'A quay at dusk.',
      emphasis: 'balanced',
      surprises: 'occasional',
      tags: [],
      guidance: [],
    },
    pace: { kind: 'instant' },
    locked: false,
    rules: 'srd-5.2.1-subset.v1',
    risk: 'nonlethal',
  };
}

async function withDisposable(run) {
  const runId = randomUUID();
  let provisioned;
  try {
    provisioned = await provisionDisposableSandboxDatabase({
      runId,
      confirmDisposableProvision: true,
      applyFullMigrations: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? 'unknown');
    test.diagnostic(
      `NOT-RUN: disposable Postgres unavailable (${message}). Is Docker/postgres up?`,
    );
    return;
  }
  const database = createDatabase(
    readDatabaseConfig({
      DATABASE_URL: provisioned.connectionString,
      DB_STATEMENT_TIMEOUT_MS: process.env.DB_STATEMENT_TIMEOUT_MS,
      DB_IDLE_TRANSACTION_TIMEOUT_MS:
        process.env.DB_IDLE_TRANSACTION_TIMEOUT_MS,
    }),
    () => {},
  );
  try {
    await run(database);
  } finally {
    await database.close().catch(() => undefined);
    await destroyDisposableSandboxDatabase({
      runId,
      confirmDisposableProvision: true,
    });
  }
}

async function seedForkableV2Story(database, store) {
  const ownerId = `wr02-fork-${randomUUID()}`;
  const storyId = randomUUID();
  const passageId = randomUUID();
  const operationId = randomUUID();
  const declaredBy = randomUUID();
  const profile = { id: 'test-profile', revision: 1 };
  const publicId = randomUUID();
  const privateId = randomUUID();
  const publicDoc = canonicalDocumentSchema.parse({
    format: 'offscreen.document.v1',
    envelope: {
      documentId: publicId,
      kind: 'lore',
      schemaVersion: 1,
      revision: 1,
      authority: 'canon',
      visibility: 'player-known',
      sources: [],
    },
    title: 'Gate',
    body: 'Iron gate.',
  });
  const privateDoc = canonicalDocumentSchema.parse({
    format: 'offscreen.document.v1',
    envelope: {
      documentId: privateId,
      kind: 'lore',
      schemaVersion: 1,
      revision: 1,
      authority: 'canon',
      visibility: 'storyteller-private',
      sources: [],
    },
    title: 'Hidden',
    body: 'Secret quay ledger.',
  });
  const publicHash = await store.putDocument(publicDoc);
  const privateHash = await store.putDocument(privateDoc);
  const v1RootHash = await store.putManifest(
    documentManifestSchema.parse({
      format: 'offscreen.manifest.v1',
      campaignId: storyId,
      revision: 1,
      previousRootHash: null,
      authorOperationId: randomUUID(),
      entries: [
        {
          documentId: publicId,
          revision: 1,
          path: 'world/places/gate.md',
          objectHash: publicHash,
          kind: 'lore',
          authority: 'canon',
          visibility: 'player-known',
        },
        {
          documentId: privateId,
          revision: 1,
          path: 'storyteller/ledger.md',
          objectHash: privateHash,
          kind: 'lore',
          authority: 'canon',
          visibility: 'storyteller-private',
        },
      ],
    }),
  );

  await database.db.$client.query(
    `insert into "user" (id, name, email, email_verified, created_at, updated_at)
     values ($1, $2, $3, true, now(), now())`,
    [ownerId, 'WR02-FORK', `${ownerId}@example.test`],
  );
  await database.db.insert(story).values({
    id: storyId,
    ownerId,
    source: 'test.opening.v1',
    premise: null,
    storyteller: null,
    execution: null,
    usagePolicy: null,
    continuityNotes: [],
    activeSceneScope: {
      version: 'active-scene-anchor.v1',
      fromSequence: 1,
      requiredPassageIds: [passageId],
      recallCues: [],
    },
    documentRootHash: v1RootHash,
    documentRootRevision: 1,
    revision: 1,
    viewVersion: 1,
  });
  await database.db.insert(storyPassage).values({
    id: passageId,
    storyId,
    sequence: 1,
    content: {
      version: 1,
      title: 'At the gate',
      paragraphs: ['The iron gate waits.'],
    },
  });
  await database.db.insert(campaignSettings).values({
    storyId,
    revision: 1,
    settings: settingsDocument(profile),
    profile,
  });
  await database.db.insert(campaign).values({
    storyId,
    settingsRevision: 1,
    locked: 0,
    character: character(),
    storyFacts: [],
    activityOccurrences: [],
    location: null,
    gameSecond: 0,
    clock: {
      elapsedGameSeconds: 0,
      remainder: { numerator: '0', denominator: '1' },
    },
    clockAnchorAt: new Date(),
    clockPace: { kind: 'instant' },
    holds: [],
    offer: null,
    situationAuthorization: {
      version: 2,
      offerId: null,
      activityAccess: { kind: 'none' },
      preparedPlans: [],
    },
    worldConditions: [],
  });
  await database.db.insert(storyItem).values({
    storyId,
    key: 'sword-a',
    label: 'Sword',
    holderKey: 'character',
  });

  const checkpoint = sceneCheckpointSchema.parse({
    format: 'offscreen.scene-checkpoint.v1',
    stateSchemaVersion: 1,
    storyId,
    passageId,
    sceneSequence: 1,
    transitionId: null,
    source: 'test.opening.v1',
    premise: null,
    storyteller: { id: 'test-profile', revision: 1 },
    execution: null,
    usagePolicy: null,
    canon: {
      rootHash: null,
      rootRevision: 0,
    },
    ancestor: { storyId: null, rootHash: null, rootRevision: null },
    pins: {
      worlds: [],
      rules: null,
      start: null,
      storytellerProfile: { id: 'test-profile', revision: 1 },
    },
    mechanics: {
      mechanicsAbsent: false,
      character: character(),
      items: [{ key: 'sword-a', label: 'Sword', holderKey: 'character' }],
      storyFacts: [],
      activityOccurrences: [],
      location: null,
      gameSecond: 0,
      clock: {
        elapsedGameSeconds: 0,
        remainder: { numerator: '0', denominator: '1' },
      },
      pace: { kind: 'instant' },
      holds: [],
      offer: null,
      acceptedActivityPlan: null,
      activeActivityId: null,
      activeActionOperationId: null,
      situationAuthorization: {
        version: 2,
        offerId: null,
        activityAccess: { kind: 'none' },
        preparedPlans: [],
      },
      worldConditions: [],
      settingsRevision: 1,
      content: null,
      continuityNotes: [],
      activeSceneScope: {
        version: 'active-scene-anchor.v1',
        fromSequence: 1,
        requiredPassageIds: [passageId],
        recallCues: [],
      },
    },
    passage: {
      response: null,
      responseSource: null,
      initialItems: [
        { key: 'sword-a', label: 'Sword', holderKey: 'character' },
      ],
      effects: [],
      decisionPlan: null,
      waitPlan: null,
      controlRevision: 0,
      content: {
        version: 1,
        title: 'At the gate',
        paragraphs: ['The iron gate waits.'],
      },
      contentDocumentHash: null,
      interaction: null,
    },
  });

  const documents = createStories(database, { documentStore: store }).documents;
  assert.ok(documents);
  const adopted = await documents.adoptLibraryV2({
    ownerId,
    storyId,
    operationId: randomUUID(),
    body: {
      expectedRootHash: v1RootHash,
      expectedRootRevision: 1,
    },
  });
  const rootHash = adopted.rootHash;
  const rootRevision = adopted.rootRevision;
  const checkpointV2 = sceneCheckpointSchema.parse({
    ...checkpoint,
    canon: { rootHash, rootRevision },
  });
  await store.putSceneCheckpoint(checkpointV2);
  await database.db.transaction((tx) =>
    insertSceneCheckpointReference(tx, {
      ownerId,
      operationId,
      expectedRevision: 1,
      expectedRootHash: rootHash,
      expectedRootRevision: rootRevision,
      checkpoint: checkpointV2,
      documentStore: store,
    }),
  );

  return {
    ownerId,
    storyId,
    passageId,
    operationId,
    declaredBy,
    rootHash,
    rootRevision,
    publicId,
    privateId,
  };
}

test('v2 library fork shares parent immutable root hash', async () => {
  await withDisposable(async (database) => {
    const store = new LocalDocumentStore(
      await mkdtemp(join(tmpdir(), 'offscreen-library-v2-fork-')),
    );
    const seeded = await seedForkableV2Story(database, store);
    const stories = createStories(database, { documentStore: store });
    const historic = await stories.readHistoricalScene({
      ownerId: seeded.ownerId,
      storyId: seeded.storyId,
      sequence: 1,
    });
    assert.equal(historic.canon.rootHash, seeded.rootHash);

    const childOneId = randomUUID();
    await stories.fork({
      ownerId: seeded.ownerId,
      sourceStoryId: seeded.storyId,
      forkStoryId: childOneId,
      expectedRevision: 1,
      sourcePassageId: seeded.passageId,
      sourceCheckpointHash: historic.checkpointHash,
    });
    const [childOne] = await database.db
      .select()
      .from(story)
      .where(eq(story.id, childOneId));
    assert.equal(childOne.documentRootHash, seeded.rootHash);
    assert.equal(childOne.documentRootRevision, 1);
    await store.readLibraryRoot(childOne.documentRootHash);

    const documents = stories.documents;
    assert.ok(documents);
    const newPrivateId = randomUUID();
    const admitOperation = randomUUID();
    const admitted = await documents.admit({
      ownerId: seeded.ownerId,
      storyId: seeded.storyId,
      operationId: admitOperation,
      body: {
        expectedRootHash: seeded.rootHash,
        expectedRootRevision: seeded.rootRevision,
        changes: [
          {
            documentId: newPrivateId,
            expectedRevision: null,
            path: 'storyteller/new-ledger.md',
            kind: 'lore',
            authority: 'canon',
            visibility: 'storyteller-private',
            title: 'New ledger',
            body: 'Parent-only secret.',
            sources: [],
          },
        ],
      },
    });
    assert.notEqual(admitted.rootHash, seeded.rootHash);

    const [childOneAfter] = await database.db
      .select()
      .from(story)
      .where(eq(story.id, childOneId));
    assert.equal(childOneAfter.documentRootHash, seeded.rootHash);

    await assert.rejects(
      documents.readDocument({
        ownerId: seeded.ownerId,
        storyId: childOneId,
        documentId: newPrivateId,
      }),
      (error) => error instanceof StoryError && error.code === 'not_found',
    );

    const childTwoId = randomUUID();
    await stories.fork({
      ownerId: seeded.ownerId,
      sourceStoryId: seeded.storyId,
      forkStoryId: childTwoId,
      expectedRevision: 1,
      sourcePassageId: seeded.passageId,
      sourceCheckpointHash: historic.checkpointHash,
    });
    const [childTwo] = await database.db
      .select()
      .from(story)
      .where(eq(story.id, childTwoId));
    assert.equal(childTwo.documentRootHash, seeded.rootHash);
    await assert.rejects(
      documents.readDocument({
        ownerId: seeded.ownerId,
        storyId: childTwoId,
        documentId: newPrivateId,
      }),
      (error) => error instanceof StoryError && error.code === 'not_found',
    );
  });
});