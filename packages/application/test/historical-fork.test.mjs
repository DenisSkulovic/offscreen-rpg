import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { and, eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { campaign, campaignSettings } from '@offscreen/db/campaign-schema';
import { generation } from '@offscreen/db/generation-schema';
import { outbox } from '@offscreen/db/outbox-schema';
import {
  story,
  storyItem,
  storyPassage,
  storySceneCheckpoint,
} from '@offscreen/db/story-schema';
import {
  LocalDocumentStore,
  documentManifestSchema,
  sceneCheckpointSchema,
} from '@offscreen/documents';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../dist/developer-tools/index.js';
import { StoryError, createStories } from '../dist/stories/index.js';
import { lockOwnedStory } from '../dist/stories/persistence.js';
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

function checkpointFor(identity) {
  const interaction = identity.interactionId
    ? {
        id: identity.interactionId,
        specification: {
          kind: 'choice.v1',
          prompt: 'Take the sword?',
          options: [{ id: 'take', label: 'Take it' }],
        },
      }
    : null;
  return sceneCheckpointSchema.parse({
    format: 'offscreen.scene-checkpoint.v1',
    stateSchemaVersion: 1,
    storyId: identity.storyId,
    passageId: identity.passageId,
    sceneSequence: identity.sceneSequence,
    transitionId: identity.transitionId,
    source: 'test.opening.v1',
    premise: null,
    storyteller: { id: 'test-profile', revision: 1 },
    execution: null,
    usagePolicy: null,
    canon: {
      rootHash: identity.rootHash,
      rootRevision: identity.rootRevision,
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
      items: [
        {
          key: 'sword-a',
          label: 'Sword',
          holderKey: identity.swordHolder,
        },
      ],
      storyFacts: [
        {
          id: 'king-status',
          value: identity.kingAlive ? 'alive' : 'dead',
          declaredBy: identity.declaredBy,
        },
      ],
      activityOccurrences: [],
      location: null,
      gameSecond: identity.gameSecond,
      clock: {
        elapsedGameSeconds: identity.gameSecond,
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
        fromSequence: identity.sceneSequence,
        requiredPassageIds: [identity.passageId],
        recallCues: [],
      },
    },
    passage: {
      response: identity.response ?? null,
      responseSource: identity.response ? 'player' : null,
      initialItems:
        identity.sceneSequence === 1
          ? [{ key: 'sword-a', label: 'Sword', holderKey: 'character' }]
          : null,
      effects: identity.effects ?? [],
      decisionPlan: null,
      waitPlan: null,
      controlRevision: 0,
      content: {
        version: 1,
        title: identity.title,
        paragraphs: [identity.paragraph],
      },
      contentDocumentHash: null,
      interaction,
    },
  });
}

async function withDisposable(run) {
  const runId = randomUUID();
  const provisioned = await provisionDisposableSandboxDatabase({
    runId,
    confirmDisposableProvision: true,
    applyFullMigrations: true,
  });
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

async function seedTwoScenes(database, store) {
  const ownerId = `data04-${randomUUID()}`;
  const otherOwnerId = `data04-other-${randomUUID()}`;
  const storyId = randomUUID();
  const passage1 = randomUUID();
  const passage2 = randomUUID();
  const transitionId = randomUUID();
  const operation1 = randomUUID();
  const operation2 = randomUUID();
  const declaredBy = randomUUID();
  const interactionId = randomUUID();
  await database.db.$client.query(
    `insert into "user" (id, name, email, email_verified, created_at, updated_at)
     values ($1, $2, $3, true, now(), now()), ($4, $5, $6, true, now(), now())`,
    [
      ownerId,
      'DATA04',
      `${ownerId}@example.test`,
      otherOwnerId,
      'DATA04-other',
      `${otherOwnerId}@example.test`,
    ],
  );
  const root1 = await store.putManifest(
    documentManifestSchema.parse({
      format: 'offscreen.manifest.v1',
      campaignId: storyId,
      revision: 1,
      previousRootHash: null,
      authorOperationId: operation1,
      entries: [],
    }),
  );
  const root2 = await store.putManifest(
    documentManifestSchema.parse({
      format: 'offscreen.manifest.v1',
      campaignId: storyId,
      revision: 2,
      previousRootHash: root1,
      authorOperationId: operation2,
      entries: [],
    }),
  );
  const profile = { id: 'test-profile', revision: 1 };
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
      requiredPassageIds: [passage1],
      recallCues: [],
    },
    documentRootHash: root1,
    documentRootRevision: 1,
    revision: 1,
  });
  await database.db.insert(storyPassage).values({
    id: passage1,
    storyId,
    sequence: 1,
    content: {
      version: 1,
      title: 'The king lives',
      paragraphs: ['The king is alive. The sword is yours.'],
    },
    interaction: {
      id: interactionId,
      specification: {
        kind: 'choice.v1',
        prompt: 'Take the sword?',
        options: [{ id: 'take', label: 'Take it' }],
      },
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
    storyFacts: [{ id: 'king-status', value: 'alive', declaredBy }],
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
  const scene1 = checkpointFor({
    storyId,
    passageId: passage1,
    sceneSequence: 1,
    transitionId: null,
    rootHash: root1,
    rootRevision: 1,
    swordHolder: 'character',
    kingAlive: true,
    gameSecond: 0,
    declaredBy,
    title: 'The king lives',
    paragraph: 'The king is alive. The sword is yours.',
    interactionId,
  });
  const scene2 = checkpointFor({
    storyId,
    passageId: passage2,
    sceneSequence: 2,
    transitionId,
    rootHash: root2,
    rootRevision: 2,
    swordHolder: 'rival',
    kingAlive: false,
    gameSecond: 90,
    declaredBy,
    title: 'The king is dead',
    paragraph: 'The sword changed hands. The king is dead.',
    effects: [
      {
        kind: 'item.transfer.v1',
        itemKey: 'sword-a',
        fromHolder: 'character',
        toHolder: 'rival',
      },
    ],
  });
  await store.putSceneCheckpoint(scene1);
  await store.putSceneCheckpoint(scene2);
  await database.db.transaction((tx) =>
    insertSceneCheckpointReference(tx, {
      ownerId,
      operationId: operation1,
      expectedRevision: 1,
      expectedRootHash: root1,
      expectedRootRevision: 1,
      checkpoint: scene1,
      documentStore: store,
    }),
  );
  await database.db.insert(storyPassage).values({
    id: passage2,
    storyId,
    sequence: 2,
    transitionId,
    content: {
      version: 1,
      title: 'The king is dead',
      paragraphs: ['The sword changed hands. The king is dead.'],
    },
  });
  await database.db
    .update(storyItem)
    .set({ holderKey: 'rival' })
    .where(eq(storyItem.storyId, storyId));
  await database.db
    .update(campaign)
    .set({
      storyFacts: [{ id: 'king-status', value: 'dead', declaredBy }],
      gameSecond: 90,
      clock: {
        elapsedGameSeconds: 90,
        remainder: { numerator: '0', denominator: '1' },
      },
    })
    .where(eq(campaign.storyId, storyId));
  await database.db
    .update(story)
    .set({
      revision: 2,
      documentRootHash: root2,
      documentRootRevision: 2,
      activeSceneScope: {
        version: 'active-scene-anchor.v1',
        fromSequence: 2,
        requiredPassageIds: [passage2],
        recallCues: [],
      },
    })
    .where(eq(story.id, storyId));
  await database.db.transaction((tx) =>
    insertSceneCheckpointReference(tx, {
      ownerId,
      operationId: operation2,
      expectedRevision: 2,
      expectedRootHash: root2,
      expectedRootRevision: 2,
      checkpoint: scene2,
      documentStore: store,
    }),
  );
  return {
    ownerId,
    otherOwnerId,
    storyId,
    passage1,
    passage2,
    root1,
    root2,
    scene1,
    scene2,
    interactionId,
  };
}

test('historical GET and fork keep scene-1 sword and living king after scene 2', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-data04-fork-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const seeded = await seedTwoScenes(database, store);
    const stories = createStories(database, { documentStore: store });
    const outboxBeforeRead = await database.db.select({ id: outbox.id }).from(outbox);
    const generationsBeforeRead = await database.db
      .select({ id: generation.id })
      .from(generation);
    const historic = await stories.readHistoricalScene({
      ownerId: seeded.ownerId,
      storyId: seeded.storyId,
      sequence: 1,
    });
    assert.equal(historic.canRespond, false);
    assert.equal(historic.asOfSequence, 1);
    assert.equal(historic.canon.rootHash, seeded.root1);
    assert.notEqual(historic.canon.rootHash, seeded.root2);
    assert.equal(historic.current.content.title, 'The king lives');
    assert.deepEqual(historic.items, [
      { key: 'sword-a', label: 'Sword', holderKey: 'character' },
    ]);
    assert.equal(historic.campaign.offer, null);
    assert.equal(historic.campaign.gameSecond, 0);
    assert.deepEqual(historic.campaign.storyFacts, [
      seeded.scene1.mechanics.storyFacts[0],
    ]);
    assert.equal(historic.current.interaction.id, seeded.interactionId);
    const outboxAfterRead = await database.db.select({ id: outbox.id }).from(outbox);
    const generationsAfterRead = await database.db
      .select({ id: generation.id })
      .from(generation);
    assert.equal(outboxAfterRead.length, outboxBeforeRead.length);
    assert.equal(generationsAfterRead.length, generationsBeforeRead.length);

    const liveItems = await database.db
      .select()
      .from(storyItem)
      .where(eq(storyItem.storyId, seeded.storyId));
    assert.equal(liveItems[0].holderKey, 'rival');

    const forkStoryId = randomUUID();
    const forked = await stories.fork({
      ownerId: seeded.ownerId,
      sourceStoryId: seeded.storyId,
      forkStoryId,
      expectedRevision: 1,
      sourcePassageId: seeded.passage1,
      sourceCheckpointHash: historic.checkpointHash,
    });
    assert.equal(forked.id, forkStoryId);
    assert.equal(forked.revision, 1);
    assert.deepEqual(forked.lineage, {
      sourceStoryId: seeded.storyId,
      sourcePassageId: seeded.passage1,
      sourceSequence: 1,
    });
    assert.deepEqual(forked.items, [
      { key: 'sword-a', label: 'Sword', holderKey: 'character' },
    ]);
    assert.equal(forked.campaign.gameSecond, 0);
    assert.equal(forked.campaign.storyFacts[0].value, 'alive');
    assert.equal(forked.current.content.title, 'The king lives');
    assert.notEqual(forked.current.id, seeded.passage1);
    assert.notEqual(forked.current.interaction?.id, seeded.interactionId);
    const [forkRow] = await database.db
      .select()
      .from(story)
      .where(eq(story.id, forkStoryId));
    assert.equal(forkRow.documentRootHash !== seeded.root2, true);
    assert.notEqual(forkRow.documentRootHash, seeded.root2);
    const forkManifest = await store.readManifest(forkRow.documentRootHash);
    assert.equal(forkManifest.campaignId, forkStoryId);
    assert.equal(forkManifest.revision, 1);
    assert.equal(forkManifest.previousRootHash, null);

    const [parent] = await database.db
      .select()
      .from(campaign)
      .where(eq(campaign.storyId, seeded.storyId));
    assert.equal(parent.gameSecond, 90);
    assert.equal(parent.storyFacts[0].value, 'dead');
    const parentLive = await stories.read({
      ownerId: seeded.ownerId,
      storyId: seeded.storyId,
    });
    assert.equal(parentLive.current.content.title, 'The king is dead');
    assert.deepEqual(parentLive.items[0].holderKey, 'rival');

    const retry = await stories.fork({
      ownerId: seeded.ownerId,
      sourceStoryId: seeded.storyId,
      forkStoryId,
      expectedRevision: 1,
    });
    assert.equal(retry.id, forkStoryId);
    assert.deepEqual(retry.items, forked.items);
    assert.equal(retry.current.content.title, 'The king lives');

    const wrongHash = 'f'.repeat(64);
    await assert.rejects(
      () =>
        stories.fork({
          ownerId: seeded.ownerId,
          sourceStoryId: seeded.storyId,
          forkStoryId,
          expectedRevision: 1,
          sourcePassageId: seeded.passage1,
          sourceCheckpointHash: wrongHash,
        }),
      (error) =>
        error instanceof StoryError &&
        error.code === 'invalid' &&
        error.reason === 'checkpoint_hash_mismatch',
    );
    const afterWrongHash = await stories.fork({
      ownerId: seeded.ownerId,
      sourceStoryId: seeded.storyId,
      forkStoryId,
      expectedRevision: 1,
      sourcePassageId: seeded.passage1,
      sourceCheckpointHash: historic.checkpointHash,
    });
    assert.equal(afterWrongHash.id, forkStoryId);
    assert.equal(afterWrongHash.current.content.title, 'The king lives');
  });
});

test('historical GET and fork fail closed for other owners, bad checkpoints, and later live tables', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-data04-neg-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const seeded = await seedTwoScenes(database, store);
    const stories = createStories(database, { documentStore: store });
    await assert.rejects(
      () =>
        stories.readHistoricalScene({
          ownerId: seeded.otherOwnerId,
          storyId: seeded.storyId,
          sequence: 1,
        }),
      (error) => error instanceof StoryError && error.code === 'not_found',
    );
    await assert.rejects(
      () =>
        stories.fork({
          ownerId: seeded.otherOwnerId,
          sourceStoryId: seeded.storyId,
          forkStoryId: randomUUID(),
          expectedRevision: 1,
        }),
      (error) => error instanceof StoryError && error.code === 'not_found',
    );
    await assert.rejects(
      () =>
        stories.fork({
          ownerId: seeded.ownerId,
          sourceStoryId: seeded.storyId,
          forkStoryId: randomUUID(),
          expectedRevision: 1,
          sourcePassageId: seeded.passage2,
        }),
      (error) =>
        error instanceof StoryError &&
        error.code === 'invalid' &&
        error.reason === 'checkpoint_passage_mismatch',
    );
    await assert.rejects(
      () =>
        stories.fork({
          ownerId: seeded.ownerId,
          sourceStoryId: seeded.storyId,
          forkStoryId: randomUUID(),
          expectedRevision: 1,
          sourceCheckpointHash: seeded.root2,
        }),
      (error) =>
        error instanceof StoryError &&
        error.code === 'invalid' &&
        error.reason === 'checkpoint_hash_mismatch',
    );

    const ownerId = `data04-legacy-${randomUUID()}`;
    const storyId = randomUUID();
    const passageId = randomUUID();
    await database.db.$client.query(
      `insert into "user" (id, name, email, email_verified, created_at, updated_at)
       values ($1, $2, $3, true, now(), now())`,
      [ownerId, 'DATA04-legacy', `${ownerId}@example.test`],
    );
    await database.db.insert(story).values({
      id: storyId,
      ownerId,
      source: 'test.opening.v1',
      revision: 2,
    });
    await database.db.insert(storyPassage).values({
      id: passageId,
      storyId,
      sequence: 2,
      content: {
        version: 1,
        title: 'Later',
        paragraphs: ['No checkpoint.'],
      },
    });
    await assert.rejects(
      () =>
        stories.readHistoricalScene({
          ownerId,
          storyId,
          sequence: 2,
        }),
      (error) => error instanceof StoryError && error.code === 'not_found',
    );
    await assert.rejects(
      () =>
        stories.fork({
          ownerId,
          sourceStoryId: storyId,
          forkStoryId: randomUUID(),
          expectedRevision: 2,
        }),
      (error) =>
        error instanceof StoryError &&
        error.code === 'conflict' &&
        error.reason === 'fork_unsupported_revision',
    );
    await assert.rejects(
      () =>
        stories.forkCurrent({
          ownerId: seeded.ownerId,
          sourceStoryId: seeded.storyId,
          forkStoryId: randomUUID(),
          expectedRevision: 2,
        }),
      (error) =>
        error instanceof StoryError &&
        error.code === 'conflict' &&
        error.reason === 'fork_unsupported_revision',
    );

    const historic = await stories.readHistoricalScene({
      ownerId: seeded.ownerId,
      storyId: seeded.storyId,
      sequence: 1,
    });
    const countForkChildren = async () => {
      const rows = await database.db
        .select({ id: story.id })
        .from(story)
        .where(eq(story.forkedFromStoryId, seeded.storyId));
      return rows.length;
    };
    const beforeFailedAttempts = await countForkChildren();
    await assert.rejects(
      () =>
        stories.fork({
          ownerId: seeded.otherOwnerId,
          sourceStoryId: seeded.storyId,
          forkStoryId: randomUUID(),
          expectedRevision: 1,
          sourcePassageId: seeded.passage1,
          sourceCheckpointHash: historic.checkpointHash,
        }),
      (error) => error instanceof StoryError && error.code === 'not_found',
    );
    await assert.rejects(
      () =>
        stories.fork({
          ownerId: seeded.ownerId,
          sourceStoryId: seeded.storyId,
          forkStoryId: randomUUID(),
          expectedRevision: 1,
          sourcePassageId: seeded.passage2,
          sourceCheckpointHash: historic.checkpointHash,
        }),
      (error) =>
        error instanceof StoryError &&
        error.code === 'invalid' &&
        error.reason === 'checkpoint_passage_mismatch',
    );
    await assert.rejects(
      () =>
        stories.fork({
          ownerId: seeded.ownerId,
          sourceStoryId: seeded.storyId,
          forkStoryId: randomUUID(),
          expectedRevision: 1,
          sourcePassageId: seeded.passage1,
          sourceCheckpointHash: 'e'.repeat(64),
        }),
      (error) =>
        error instanceof StoryError &&
        error.code === 'invalid' &&
        error.reason === 'checkpoint_hash_mismatch',
    );
    assert.equal(await countForkChildren(), beforeFailedAttempts);

    const occupiedForkId = randomUUID();
    await stories.fork({
      ownerId: seeded.ownerId,
      sourceStoryId: seeded.storyId,
      forkStoryId: occupiedForkId,
      expectedRevision: 1,
      sourcePassageId: seeded.passage1,
      sourceCheckpointHash: historic.checkpointHash,
    });
    await assert.rejects(
      () =>
        stories.fork({
          ownerId: seeded.ownerId,
          sourceStoryId: seeded.storyId,
          forkStoryId: occupiedForkId,
          expectedRevision: 2,
          sourcePassageId: seeded.passage2,
        }),
      (error) =>
        error instanceof StoryError &&
        error.code === 'conflict' &&
        error.reason === 'fork_destination_in_use',
    );
  });
});

function isCheckpointHashMismatch(error) {
  return (
    error instanceof StoryError &&
    error.code === 'invalid' &&
    error.reason === 'checkpoint_hash_mismatch'
  );
}

test('DATA04 gap negatives: checkpoint story id, corrupt holds, live continuity remap', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-data04-gaps-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const seeded = await seedTwoScenes(database, store);
    const stories = createStories(database, { documentStore: store });
    const [scene1Row] = await database.db
      .select()
      .from(storySceneCheckpoint)
      .where(
        and(
          eq(storySceneCheckpoint.storyId, seeded.storyId),
          eq(storySceneCheckpoint.sceneSequence, 1),
        ),
      );
    assert.ok(scene1Row);

    const scene1Checkpoint = await store.readSceneCheckpoint(
      scene1Row.checkpointHash,
    );
    const wrongStoryCheckpoint = {
      ...structuredClone(scene1Checkpoint),
      storyId: randomUUID(),
    };
    const mismatchedStoryHash = await store.putSceneCheckpoint(
      wrongStoryCheckpoint,
    );
    await database.db
      .update(storySceneCheckpoint)
      .set({ checkpointHash: mismatchedStoryHash })
      .where(
        and(
          eq(storySceneCheckpoint.storyId, seeded.storyId),
          eq(storySceneCheckpoint.sceneSequence, 1),
        ),
      );

    const forkStoryIdWrong = randomUUID();
    await assert.rejects(
      () =>
        stories.readHistoricalScene({
          ownerId: seeded.ownerId,
          storyId: seeded.storyId,
          sequence: 1,
        }),
      isCheckpointHashMismatch,
    );
    await assert.rejects(
      () =>
        stories.fork({
          ownerId: seeded.ownerId,
          sourceStoryId: seeded.storyId,
          forkStoryId: forkStoryIdWrong,
          expectedRevision: 1,
        }),
      isCheckpointHashMismatch,
    );
    const wrongForkRows = await database.db
      .select()
      .from(story)
      .where(eq(story.id, forkStoryIdWrong));
    assert.equal(wrongForkRows.length, 0);

    const holdsTamper = structuredClone(scene1Checkpoint);
    holdsTamper.mechanics.holds = [{ kind: 'decision' }];
    const holdsTamperBytes = `${JSON.stringify(holdsTamper)}\n`;
    const holdsTamperHash = createHash('sha256')
      .update(holdsTamperBytes)
      .digest('hex');
    const holdsTamperPath = join(
      store.root,
      'objects',
      'sha256',
      holdsTamperHash.slice(0, 2),
      `${holdsTamperHash}.json`,
    );
    await mkdir(dirname(holdsTamperPath), { recursive: true });
    await writeFile(holdsTamperPath, holdsTamperBytes, 'utf8');
    await database.db
      .update(storySceneCheckpoint)
      .set({ checkpointHash: holdsTamperHash })
      .where(
        and(
          eq(storySceneCheckpoint.storyId, seeded.storyId),
          eq(storySceneCheckpoint.sceneSequence, 1),
        ),
      );

    const forkStoryIdHolds = randomUUID();
    await assert.rejects(
      () =>
        stories.readHistoricalScene({
          ownerId: seeded.ownerId,
          storyId: seeded.storyId,
          sequence: 1,
        }),
      isCheckpointHashMismatch,
    );
    await assert.rejects(
      () =>
        stories.fork({
          ownerId: seeded.ownerId,
          sourceStoryId: seeded.storyId,
          forkStoryId: forkStoryIdHolds,
          expectedRevision: 1,
        }),
      isCheckpointHashMismatch,
    );
    const holdsForkRows = await database.db
      .select()
      .from(story)
      .where(eq(story.id, forkStoryIdHolds));
    assert.equal(holdsForkRows.length, 0);

    const liveOwnerId = `data04-live-${randomUUID()}`;
    const liveStoryId = randomUUID();
    const livePassageId = randomUUID();
    await database.db.$client.query(
      `insert into "user" (id, name, email, email_verified, created_at, updated_at)
       values ($1, $2, $3, true, now(), now())`,
      [liveOwnerId, 'DATA04-live', `${liveOwnerId}@example.test`],
    );
    await database.db.insert(story).values({
      id: liveStoryId,
      ownerId: liveOwnerId,
      source: 'test.opening.v1',
      premise: null,
      storyteller: null,
      execution: null,
      usagePolicy: null,
      continuityNotes: ['kept'],
      revision: 1,
    });
    await database.db.insert(storyPassage).values({
      id: livePassageId,
      storyId: liveStoryId,
      sequence: 1,
      content: {
        version: 1,
        title: 'Solo opening',
        paragraphs: ['No checkpoint row yet.'],
      },
    });

    const forkStoryIdLive = randomUUID();
    await assert.rejects(
      () =>
        stories.fork({
          ownerId: liveOwnerId,
          sourceStoryId: liveStoryId,
          forkStoryId: forkStoryIdLive,
          expectedRevision: 1,
        }),
      (error) =>
        error instanceof StoryError &&
        error.code === 'conflict' &&
        error.reason === 'fork_continuity_remap_required',
    );
    const liveForkRows = await database.db
      .select()
      .from(story)
      .where(eq(story.id, forkStoryIdLive));
    assert.equal(liveForkRows.length, 0);

    const checkpointRows = await database.db
      .select()
      .from(storySceneCheckpoint)
      .where(eq(storySceneCheckpoint.storyId, liveStoryId));
    assert.equal(checkpointRows.length, 0);
  });
});

function delayCheckpointStore(inner, delayMs, hooks) {
  let delayedCheckpoint = false;
  return new Proxy(inner, {
    get(target, prop, receiver) {
      if (prop === 'readSceneCheckpoint' && !delayedCheckpoint) {
        return async (...args) => {
          delayedCheckpoint = true;
          await hooks.onBefore?.(String(prop));
          if (delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
          return target[prop].apply(target, args);
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

test('ENG03: fork checkpoint read does not hold the source story lock', async () => {
  process.env.DB_STATEMENT_TIMEOUT_MS = '120000';
  process.env.DB_IDLE_TRANSACTION_TIMEOUT_MS = '120000';
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03-fork-lock-'));
    const store = new LocalDocumentStore(root);
    const waits = [];
    for (const delayMs of [0, 2000]) {
      const seeded = await seedTwoScenes(database, store);
      let readStarted = false;
      const delayed = delayCheckpointStore(store, delayMs, {
        onBefore: () => {
          readStarted = true;
        },
      });
      const stories = createStories(database, { documentStore: delayed });
      const forkPromise = stories.fork({
        ownerId: seeded.ownerId,
        sourceStoryId: seeded.storyId,
        forkStoryId: randomUUID(),
        expectedRevision: 1,
      });
      const deadline = Date.now() + 20000;
      while (!readStarted && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      assert.equal(readStarted, true);
      const waitStart = performance.now();
      await database.db.transaction(async (tx) => {
        await lockOwnedStory(tx, {
          ownerId: seeded.ownerId,
          storyId: seeded.storyId,
        });
      });
      const competitorWaitMs = performance.now() - waitStart;
      await forkPromise;
      waits.push({ delayMs, competitorWaitMs });
    }
    const baseline = waits.find((row) => row.delayMs === 0);
    const delayed = waits.find((row) => row.delayMs === 2000);
    console.log(JSON.stringify({ eng03ForkLock: waits }));
    assert.ok(
      delayed.competitorWaitMs < baseline.competitorWaitMs + 500,
      `checkpoint delay must not stretch the source story lock wait: ${JSON.stringify(waits)}`,
    );
  });
});
