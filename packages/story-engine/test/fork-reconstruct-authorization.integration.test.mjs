/**
 * FORK01 T02: v2 fork reconstructs wrapped selected situation authorization.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { and, eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { campaign } from '@offscreen/story-persistence/campaign';
import { campaignSettings } from '@offscreen/story-persistence/campaign';
import {
  story,
  storyPassage,
  storySceneCheckpoint,
} from '@offscreen/story-persistence/stories';
import {
  documentManifestSchema,
  LocalDocumentStore,
  sceneCheckpointSchema,
} from '@offscreen/documents';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../../lab-support/dist/index.js';
import { StoryError, createStories } from '../dist/stories/index.js';
import { insertSceneCheckpointReference } from '../dist/stories/scene-checkpoint.js';
import {
  liveSelectedAuthorization,
  PARENT_PASSAGE_ID,
  PARENT_STORY_ID,
  scene37V2Checkpoint,
  SOURCE_SCENE_SEQUENCE,
  wrappedSelectedSituationAuthorization,
} from './fork-reconstruct.test.mjs';

const SCENE_80_PARAGRAPH =
  'Eighty scenes later the coast looks nothing like the checkpoint.';

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

async function countForkChildren(database, sourceStoryId) {
  const rows = await database.db
    .select({ id: story.id })
    .from(story)
    .where(eq(story.forkedFromStoryId, sourceStoryId));
  return rows.length;
}

async function seedScene37Checkpoint(database, store, { selectedAccess }) {
  const ownerId = `fork01-${randomUUID()}`;
  const otherOwnerId = `fork01-other-${randomUUID()}`;
  const passage80 = randomUUID();
  const operation37 = randomUUID();
  const transition37 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const profile = { id: 'test-profile', revision: 1 };

  await database.db.$client.query(
    `insert into "user" (id, name, email, email_verified, created_at, updated_at)
     values ($1, $2, $3, true, now(), now()), ($4, $5, $6, true, now(), now())`,
    [
      ownerId,
      'FORK01',
      `${ownerId}@example.test`,
      otherOwnerId,
      'FORK01-other',
      `${otherOwnerId}@example.test`,
    ],
  );

  const rootHash = await store.putManifest(
    documentManifestSchema.parse({
      format: 'offscreen.manifest.v1',
      campaignId: PARENT_STORY_ID,
      revision: 4,
      previousRootHash: null,
      authorOperationId: operation37,
      entries: [],
    }),
  );
  await database.db.insert(story).values({
    id: PARENT_STORY_ID,
    ownerId,
    source: 'test.scene-37.v1',
    premise: null,
    revision: 37,
    documentRootHash: rootHash,
    documentRootRevision: 4,
    activeSceneScope: {
      version: 'active-scene-anchor.v1',
      fromSequence: 37,
      requiredPassageIds: [PARENT_PASSAGE_ID],
      recallCues: [],
    },
  });

  await database.db.insert(storyPassage).values({
    id: PARENT_PASSAGE_ID,
    storyId: PARENT_STORY_ID,
    sequence: 37,
    transitionId: transition37,
    content: {
      version: 1,
      title: 'Scene 37',
      paragraphs: ['The road bends toward Seyda Neen.'],
    },
    interaction: {
      id: randomUUID(),
      specification: {
        kind: 'choice.v1',
        prompt: 'The ferry horn sounds. What do you do?',
        options: [{ id: 'wait', label: 'Wait for the ferry' }],
      },
    },
  });

  await database.db.insert(campaignSettings).values({
    storyId: PARENT_STORY_ID,
    revision: 1,
    settings: {
      revision: 1,
      creative: {
        profile,
        tone: 'Coast',
        emphasis: 'balanced',
        surprises: 'occasional',
        tags: [],
        guidance: [],
      },
      pace: { kind: 'instant' },
      locked: false,
      rules: 'srd-5.2.1-subset.v1',
      risk: 'nonlethal',
    },
    profile,
  });

  const fictionalPatch = selectedAccess
    ? { situationAuthorization: wrappedSelectedSituationAuthorization() }
    : {};
  const checkpoint = sceneCheckpointSchema.parse({
    ...scene37V2Checkpoint(fictionalPatch),
    canon: { rootHash, rootRevision: 4 },
  });

  await store.putSceneCheckpoint(checkpoint);
  await database.db.transaction((tx) =>
    insertSceneCheckpointReference(tx, {
      ownerId,
      operationId: operation37,
      expectedRevision: SOURCE_SCENE_SEQUENCE,
      expectedRootHash: rootHash,
      expectedRootRevision: 4,
      checkpoint,
      documentStore: store,
    }),
  );

  await database.db.insert(storyPassage).values({
    id: passage80,
    storyId: PARENT_STORY_ID,
    sequence: 80,
    transitionId: randomUUID(),
    content: {
      version: 1,
      title: 'Scene 80',
      paragraphs: [SCENE_80_PARAGRAPH],
    },
  });
  await database.db
    .update(story)
    .set({
      revision: 80,
      activeSceneScope: {
        version: 'active-scene-anchor.v1',
        fromSequence: 80,
        requiredPassageIds: [passage80],
        recallCues: [],
      },
    })
    .where(eq(story.id, PARENT_STORY_ID));

  const [selector] = await database.db
    .select()
    .from(storySceneCheckpoint)
    .where(
      and(
        eq(storySceneCheckpoint.storyId, PARENT_STORY_ID),
        eq(storySceneCheckpoint.sceneSequence, SOURCE_SCENE_SEQUENCE),
      ),
    );
  assert.ok(selector);

  return {
    ownerId,
    otherOwnerId,
    checkpointHash: selector.checkpointHash,
    parentCheckpointHash: selector.checkpointHash,
  };
}

test('FORK01: selected-access v2 fork is live, idempotent, and preserves parent checkpoint', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-fork01-selected-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const seeded = await seedScene37Checkpoint(database, store, {
      selectedAccess: true,
    });
    const stories = createStories(database, { documentStore: store });
    const forkStoryId = randomUUID();

    await stories.fork({
      ownerId: seeded.ownerId,
      sourceStoryId: PARENT_STORY_ID,
      forkStoryId,
      expectedRevision: SOURCE_SCENE_SEQUENCE,
      sourcePassageId: PARENT_PASSAGE_ID,
      sourceCheckpointHash: seeded.checkpointHash,
    });

    assert.equal(await countForkChildren(database, PARENT_STORY_ID), 1);

    const [childCampaign] = await database.db
      .select()
      .from(campaign)
      .where(eq(campaign.storyId, forkStoryId));
    assert.equal(
      childCampaign.situationAuthorization.activityAccess.kind,
      'selected',
    );
    assert.deepEqual(
      childCampaign.situationAuthorization.activityAccess,
      liveSelectedAuthorization.activityAccess,
    );
    assert.equal(childCampaign.situationAuthorization.preparedPlans.length, 1);

    const [parentSelectorAfter] = await database.db
      .select()
      .from(storySceneCheckpoint)
      .where(
        and(
          eq(storySceneCheckpoint.storyId, PARENT_STORY_ID),
          eq(storySceneCheckpoint.sceneSequence, SOURCE_SCENE_SEQUENCE),
        ),
      );
    assert.equal(
      parentSelectorAfter.checkpointHash,
      seeded.parentCheckpointHash,
    );

    await stories.fork({
      ownerId: seeded.ownerId,
      sourceStoryId: PARENT_STORY_ID,
      forkStoryId,
      expectedRevision: SOURCE_SCENE_SEQUENCE,
      sourcePassageId: PARENT_PASSAGE_ID,
      sourceCheckpointHash: seeded.checkpointHash,
    });
    assert.equal(await countForkChildren(database, PARENT_STORY_ID), 1);
  });
});

test('FORK01: none authorization fork still succeeds', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-fork01-none-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const seeded = await seedScene37Checkpoint(database, store, {
      selectedAccess: false,
    });
    const stories = createStories(database, { documentStore: store });
    const forkStoryId = randomUUID();

    await stories.fork({
      ownerId: seeded.ownerId,
      sourceStoryId: PARENT_STORY_ID,
      forkStoryId,
      expectedRevision: SOURCE_SCENE_SEQUENCE,
      sourcePassageId: PARENT_PASSAGE_ID,
      sourceCheckpointHash: seeded.checkpointHash,
    });

    const [childCampaign] = await database.db
      .select()
      .from(campaign)
      .where(eq(campaign.storyId, forkStoryId));
    assert.deepEqual(childCampaign.situationAuthorization.activityAccess, {
      kind: 'none',
    });
  });
});

test('FORK01: malformed selected authorization and checkpoint mismatches refuse without child rows', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-fork01-neg-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const invalidRoot = await mkdtemp(join(tmpdir(), 'offscreen-fork01-bad-'));
    const invalidStore = new LocalDocumentStore(invalidRoot);
    const ownerId = `fork01-bad-${randomUUID()}`;
    const otherOwnerId = `fork01-bad-other-${randomUUID()}`;
    const operation37 = randomUUID();
    const transition37 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const profile = { id: 'test-profile', revision: 1 };

    await database.db.$client.query(
      `insert into "user" (id, name, email, email_verified, created_at, updated_at)
       values ($1, $2, $3, true, now(), now()), ($4, $5, $6, true, now(), now())`,
      [
        ownerId,
        'FORK01-bad',
        `${ownerId}@example.test`,
        otherOwnerId,
        'FORK01-bad-other',
        `${otherOwnerId}@example.test`,
      ],
    );

    const rootHash = await invalidStore.putManifest(
      documentManifestSchema.parse({
        format: 'offscreen.manifest.v1',
        campaignId: PARENT_STORY_ID,
        revision: 4,
        previousRootHash: null,
        authorOperationId: operation37,
        entries: [],
      }),
    );

    await database.db.insert(story).values({
      id: PARENT_STORY_ID,
      ownerId,
      source: 'test.scene-37.v1',
      premise: null,
      revision: 37,
      documentRootHash: rootHash,
      documentRootRevision: 4,
      activeSceneScope: {
        version: 'active-scene-anchor.v1',
        fromSequence: 37,
        requiredPassageIds: [PARENT_PASSAGE_ID],
        recallCues: [],
      },
    });

    await database.db.insert(storyPassage).values({
      id: PARENT_PASSAGE_ID,
      storyId: PARENT_STORY_ID,
      sequence: 37,
      transitionId: transition37,
      content: {
        version: 1,
        title: 'Scene 37',
        paragraphs: ['The road bends toward Seyda Neen.'],
      },
      interaction: null,
    });

    await database.db.insert(campaignSettings).values({
      storyId: PARENT_STORY_ID,
      revision: 1,
      settings: {
        revision: 1,
        creative: {
          profile,
          tone: 'Coast',
          emphasis: 'balanced',
          surprises: 'occasional',
          tags: [],
          guidance: [],
        },
        pace: { kind: 'instant' },
        locked: false,
        rules: 'srd-5.2.1-subset.v1',
        risk: 'nonlethal',
      },
      profile,
    });

    const invalidCheckpoint = sceneCheckpointSchema.parse({
      ...scene37V2Checkpoint({
        situationAuthorization: {
          version: 2,
          offerId: liveSelectedAuthorization.offerId,
          activityAccess: {
            version: 1,
            body: { kind: 'selected', actionKeys: [] },
          },
          preparedPlans: [],
        },
      }),
      canon: { rootHash, rootRevision: 4 },
    });
    const stories = createStories(database, { documentStore: invalidStore });
    await invalidStore.putSceneCheckpoint(invalidCheckpoint);
    await database.db.transaction((tx) =>
      insertSceneCheckpointReference(tx, {
        ownerId,
        operationId: operation37,
        expectedRevision: SOURCE_SCENE_SEQUENCE,
        expectedRootHash: rootHash,
        expectedRootRevision: 4,
        checkpoint: invalidCheckpoint,
        documentStore: invalidStore,
      }),
    );

    const [selector] = await database.db
      .select()
      .from(storySceneCheckpoint)
      .where(
        and(
          eq(storySceneCheckpoint.storyId, PARENT_STORY_ID),
          eq(storySceneCheckpoint.sceneSequence, SOURCE_SCENE_SEQUENCE),
        ),
      );
    assert.ok(selector);

    const beforeForks = await countForkChildren(database, PARENT_STORY_ID);
    const rejectForkId = randomUUID();
    await assert.rejects(
      () =>
        stories.fork({
          ownerId,
          sourceStoryId: PARENT_STORY_ID,
          forkStoryId: rejectForkId,
          expectedRevision: SOURCE_SCENE_SEQUENCE,
          sourcePassageId: PARENT_PASSAGE_ID,
          sourceCheckpointHash: selector.checkpointHash,
        }),
      () => true,
    );
    const rejectRow = await database.db
      .select()
      .from(story)
      .where(eq(story.id, rejectForkId));
    assert.equal(rejectRow.length, 0);
    assert.equal(
      await countForkChildren(database, PARENT_STORY_ID),
      beforeForks,
    );

    const hashRejectId = randomUUID();
    await assert.rejects(
      () =>
        stories.fork({
          ownerId,
          sourceStoryId: PARENT_STORY_ID,
          forkStoryId: hashRejectId,
          expectedRevision: SOURCE_SCENE_SEQUENCE,
          sourcePassageId: PARENT_PASSAGE_ID,
          sourceCheckpointHash: 'd'.repeat(64),
        }),
      (error) =>
        error instanceof StoryError &&
        error.code === 'invalid' &&
        error.reason === 'checkpoint_hash_mismatch',
    );
    assert.equal(
      (await database.db.select().from(story).where(eq(story.id, hashRejectId)))
        .length,
      0,
    );

    await assert.rejects(
      () =>
        stories.fork({
          ownerId: otherOwnerId,
          sourceStoryId: PARENT_STORY_ID,
          forkStoryId: randomUUID(),
          expectedRevision: SOURCE_SCENE_SEQUENCE,
          sourcePassageId: PARENT_PASSAGE_ID,
          sourceCheckpointHash: selector.checkpointHash,
        }),
      (error) => error instanceof StoryError && error.code === 'not_found',
    );
    assert.equal(
      await countForkChildren(database, PARENT_STORY_ID),
      beforeForks,
    );
  });
});
