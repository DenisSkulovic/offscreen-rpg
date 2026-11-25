import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { story, storySceneCheckpoint } from '@offscreen/story-persistence/stories';
import { storyPassage } from '@offscreen/story-persistence/stories';
import {
  LocalDocumentStore,
  S3DocumentStore,
  documentManifestSchema,
  sceneCheckpointSchema,
} from '@offscreen/documents';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../../../packages/lab-support/dist/index.js';
import { StoryError } from '../../../packages/story-engine/dist/stories/errors.js';
import {
  insertSceneCheckpointReference,
  readSceneCheckpointReference,
} from '../../../packages/story-engine/dist/stories/scene-checkpoint.js';

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

function checkpointFor(identity) {
  return sceneCheckpointSchema.parse({
    format: 'offscreen.scene-checkpoint.v1',
    stateSchemaVersion: 1,
    storyId: identity.storyId,
    passageId: identity.passageId,
    sceneSequence: 1,
    transitionId: null,
    source: 'test.opening.v1',
    premise: null,
    storyteller: { id: 'test-profile', revision: 1 },
    execution: null,
    usagePolicy: null,
    canon: { rootHash: identity.rootHash, rootRevision: 1 },
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
      gameSecond: identity.gameSecond ?? 0,
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
        requiredPassageIds: [identity.passageId],
        recallCues: [],
      },
    },
    passage: {
      response: null,
      responseSource: null,
      initialItems: [{ key: 'sword-a', label: 'Sword', holderKey: 'character' }],
      effects: [],
      decisionPlan: null,
      waitPlan: null,
      controlRevision: 0,
      content: {
        version: 1,
        title: 'Opening',
        paragraphs: ['The king is alive.'],
      },
      contentDocumentHash: null,
      interaction: null,
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
    readDatabaseConfig({ DATABASE_URL: provisioned.connectionString }),
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

async function seed(database, store) {
  const ownerId = `data02-${randomUUID()}`;
  const storyId = randomUUID();
  const passageId = randomUUID();
  const operationId = randomUUID();
  await database.db.$client.query(
    `insert into "user" (id, name, email, email_verified, created_at, updated_at)
     values ($1, $2, $3, true, now(), now())`,
    [ownerId, 'DATA02', `${ownerId}@example.test`],
  );
  const manifest = documentManifestSchema.parse({
    format: 'offscreen.manifest.v1',
    campaignId: storyId,
    revision: 1,
    previousRootHash: null,
    authorOperationId: operationId,
    entries: [],
  });
  const rootHash = await store.putManifest(manifest);
  await database.db.insert(story).values({
    id: storyId,
    ownerId,
    source: 'test.opening.v1',
    premise: null,
    storyteller: { id: 'test-profile', revision: 1 },
    execution: null,
    usagePolicy: null,
    continuityNotes: [],
    documentRootHash: rootHash,
    documentRootRevision: 1,
    revision: 1,
  });
  await database.db.insert(storyPassage).values({
    id: passageId,
    storyId,
    sequence: 1,
    content: {
      version: 1,
      title: 'Opening',
      paragraphs: ['The king is alive.'],
    },
  });
  const checkpoint = checkpointFor({ storyId, passageId, rootHash, gameSecond: 0 });
  const checkpointHash = await store.putSceneCheckpoint(checkpoint);
  return {
    ownerId,
    storyId,
    passageId,
    operationId,
    rootHash,
    checkpoint,
    checkpointHash,
  };
}

function referenceArgs(seeded, store, checkpoint = seeded.checkpoint) {
  return {
    ownerId: seeded.ownerId,
    operationId: seeded.operationId,
    expectedRevision: 1,
    expectedRootHash: seeded.rootHash,
    expectedRootRevision: 1,
    checkpoint,
    documentStore: store,
  };
}

async function storyRow(database, storyId) {
  const [row] = await database.db
    .select()
    .from(story)
    .where(eq(story.id, storyId));
  return row;
}

async function checkpointRows(database, storyId) {
  return database.db
    .select()
    .from(storySceneCheckpoint)
    .where(eq(storySceneCheckpoint.storyId, storyId));
}

test('checkpoint insert is idempotent, conflicts on a different hash, and leaves the story row unchanged', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-checkpoint-sql-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const seeded = await seed(database, store);
    const before = await storyRow(database, seeded.storyId);
    const first = await database.db.transaction((tx) =>
      insertSceneCheckpointReference(tx, referenceArgs(seeded, store)),
    );
    assert.equal(first.idempotent, false);
    assert.equal(first.checkpointHash, seeded.checkpointHash);
    const second = await database.db.transaction((tx) =>
      insertSceneCheckpointReference(tx, referenceArgs(seeded, store)),
    );
    assert.equal(second.idempotent, true);
    assert.equal(second.checkpointHash, seeded.checkpointHash);
    const rows = await checkpointRows(database, seeded.storyId);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].checkpointHash, seeded.checkpointHash);
    assert.deepEqual(await storyRow(database, seeded.storyId), before);

    const other = checkpointFor({
      storyId: seeded.storyId,
      passageId: seeded.passageId,
      rootHash: seeded.rootHash,
      gameSecond: 10,
    });
    await store.putSceneCheckpoint(other);
    await assert.rejects(
      () =>
        database.db.transaction((tx) =>
          insertSceneCheckpointReference(
            tx,
            referenceArgs(seeded, store, other),
          ),
        ),
      (error) =>
        error instanceof StoryError &&
        error.code === 'conflict' &&
        error.reason === 'checkpoint_hash_conflict',
    );
    const afterConflict = await checkpointRows(database, seeded.storyId);
    assert.equal(afterConflict.length, 1);
    assert.equal(afterConflict[0].checkpointHash, seeded.checkpointHash);
    assert.deepEqual(await storyRow(database, seeded.storyId), before);
    const items = await database.db.$client.query(
      'select count(*)::int as count from story_item where story_id = $1',
      [seeded.storyId],
    );
    assert.equal(items.rows[0].count, 0);
  });
});

test('a rolled-back checkpoint insert leaves no row and does not mutate the story', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-checkpoint-rollback-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const seeded = await seed(database, store);
    const before = await storyRow(database, seeded.storyId);
    await assert.rejects(
      () =>
        database.db.transaction(async (tx) => {
          await insertSceneCheckpointReference(tx, referenceArgs(seeded, store));
          throw new Error('rollback');
        }),
      /rollback/,
    );
    assert.deepEqual(await checkpointRows(database, seeded.storyId), []);
    assert.deepEqual(await storyRow(database, seeded.storyId), before);
  });
});

test('a checkpoint row with a missing or mismatched object is invalid', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-checkpoint-invalid-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const seeded = await seed(database, store);
    await database.db.transaction((tx) =>
      insertSceneCheckpointReference(tx, referenceArgs(seeded, store)),
    );
    const readBack = await database.db.transaction((tx) =>
      readSceneCheckpointReference(tx, {
        storyId: seeded.storyId,
        sceneSequence: 1,
        documentStore: store,
      }),
    );
    assert.equal(readBack.checkpointHash, seeded.checkpointHash);
    assert.equal(readBack.checkpoint.mechanics.gameSecond, 0);

    const objectPath = join(
      root,
      'objects',
      'sha256',
      seeded.checkpointHash.slice(0, 2),
      `${seeded.checkpointHash}.json`,
    );
    const original = await readFile(objectPath, 'utf8');
    await writeFile(objectPath, '{"format":"tampered"}\n');
    await assert.rejects(
      () =>
        database.db.transaction((tx) =>
          readSceneCheckpointReference(tx, {
            storyId: seeded.storyId,
            sceneSequence: 1,
            documentStore: store,
          }),
        ),
      (error) =>
        error instanceof StoryError &&
        error.code === 'invalid' &&
        error.reason === 'checkpoint_hash_mismatch',
    );
    await writeFile(objectPath, original);

    await database.db.$client.query(
      'update story_scene_checkpoint set checkpoint_hash = $1 where story_id = $2',
      [seeded.rootHash, seeded.storyId],
    );
    await assert.rejects(
      () =>
        database.db.transaction((tx) =>
          readSceneCheckpointReference(tx, {
            storyId: seeded.storyId,
            sceneSequence: 1,
            documentStore: store,
          }),
        ),
      (error) =>
        error instanceof StoryError && error.code === 'invalid',
    );
    await database.db.$client.query(
      'update story_scene_checkpoint set checkpoint_hash = $1 where story_id = $2',
      [seeded.checkpointHash, seeded.storyId],
    );
    await rm(objectPath);
    await assert.rejects(
      () =>
        database.db.transaction((tx) =>
          readSceneCheckpointReference(tx, {
            storyId: seeded.storyId,
            sceneSequence: 1,
            documentStore: store,
          }),
        ),
      (error) =>
        error instanceof StoryError &&
        error.code === 'invalid' &&
        error.reason === 'missing_checkpoint_object',
    );
  });
});

test('malformed checkpoint and an S3 failure insert no row and do not use the local store', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-checkpoint-s3-fail-'));
  const local = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const seeded = await seed(database, local);
    const before = await storyRow(database, seeded.storyId);
    await assert.rejects(
      () =>
        database.db.transaction((tx) =>
          insertSceneCheckpointReference(tx, {
            ...referenceArgs(seeded, local),
            checkpoint: { ...seeded.checkpoint, unexpected: true },
          }),
        ),
      (error) =>
        error instanceof StoryError &&
        error.code === 'invalid' &&
        error.reason === 'malformed_checkpoint',
    );
    assert.deepEqual(await checkpointRows(database, seeded.storyId), []);

    const failing = new S3DocumentStore({
      bucket: 'offscreen-cas',
      region: 'us-east-1',
      client: {
        async send() {
          const error = new Error('s3 down');
          error.name = 'NetworkingError';
          throw error;
        },
      },
    });
    await assert.rejects(
      () =>
        database.db.transaction((tx) =>
          insertSceneCheckpointReference(tx, referenceArgs(seeded, failing)),
        ),
      (error) =>
        error instanceof StoryError &&
        error.code === 'unavailable' &&
        error.reason === 'checkpoint_store_unavailable',
    );
    assert.ok(!(failing instanceof LocalDocumentStore));
    assert.deepEqual(await checkpointRows(database, seeded.storyId), []);
    assert.deepEqual(await storyRow(database, seeded.storyId), before);
    const staged = await local.readSceneCheckpoint(seeded.checkpointHash);
    assert.equal(staged.mechanics.gameSecond, 0);
  });
});
