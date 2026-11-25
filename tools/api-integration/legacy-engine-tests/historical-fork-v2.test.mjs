import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { and, eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import {
  campaign,
  campaignSettings,
  gameActionExecution,
  gameActivity,
  gameOffer,
  worldObligation,
} from '@offscreen/story-persistence/campaign';
import { generation } from '@offscreen/story-persistence/generations';
import { outbox } from '@offscreen/outbox/schema';
import {
  story,
  storyPassage,
  storySceneCheckpoint,
} from '@offscreen/story-persistence/stories';
import {
  LocalDocumentStore,
  documentManifestSchema,
  sceneCheckpointSchema,
  stableNamespacedDocumentId,
} from '@offscreen/documents';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../../../packages/lab-support/dist/index.js';
import { createStories } from '../../../packages/story-engine/dist/stories/index.js';
import { insertSceneCheckpointReference } from '../../../packages/story-engine/dist/stories/scene-checkpoint.js';

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

const versionedPayload = { version: 1, body: { phase: 'open' } };

function checkpointV2(identity) {
  return sceneCheckpointSchema.parse({
    format: 'offscreen.scene-checkpoint.v2',
    stateSchemaVersion: 2,
    storyId: identity.storyId,
    passageId: identity.passageId,
      sceneSequence: identity.sceneSequence,
      transitionId: null,
    source: 'test.scene-37.v1',
    premise: null,
    storyteller: { id: 'test-profile', revision: 1 },
    execution: null,
    usagePolicy: null,
    canon: { rootHash: identity.rootHash, rootRevision: identity.rootRevision },
    ancestor: { storyId: null, rootHash: null, rootRevision: null },
    pins: {
      worlds: [],
      rules: null,
      start: null,
      storytellerProfile: { id: 'test-profile', revision: 1 },
    },
    fictionalState: {
      mechanicsAbsent: false,
      character: null,
      items: [{ key: 'sword-a', label: 'Sword', holderKey: 'character' }],
      storyFacts: [{ id: 'quay-state', value: 'at-checkpoint', declaredBy: identity.evidenceId }],
      activityOccurrences: [],
      location: 'Vvardenfell coast',
      gameSecond: 120_000,
      clock: {
        elapsedGameSeconds: 120_000,
        remainder: { numerator: '1', denominator: '4' },
      },
      pace: { kind: 'rate', fictionalSeconds: 10, realSeconds: 3600 },
      settingsRevision: 1,
      content: null,
      continuityNotes: [
        {
          key: 'quay-rumor',
          text: 'The dockhands whisper about delayed ships.',
          sources: [identity.evidenceId],
          revision: 1,
        },
      ],
      activeSceneScope: {
        version: 'active-scene-anchor.v1',
        fromSequence: 30,
        requiredPassageIds: [identity.passageId],
        recallCues: [{ documentId: identity.evidenceId, reason: 'thread' }],
      },
      holds: [
        { kind: 'decision', id: identity.offerId },
        { kind: 'world-obligation', id: identity.obligationId },
      ],
      offer: {
        id: identity.offerId,
        source: 'scene-37-choice',
        meaning: 'continue',
        payload: {
          version: 1,
          body: {
            offer: {
              id: identity.offerId,
              nodes: [
                {
                  id: 'travel',
                  parent: null,
                  label: 'Continue travel',
                  description: 'Keep walking.',
                  risk: null,
                  action: {
                    kind: 'attempt',
                    timing: { kind: 'finite', fictionalSeconds: 7200 },
                  },
                },
              ],
            },
            plans: versionedPayload,
          },
        },
      },
      acceptedActivityPlan: versionedPayload,
      activeActivityId: identity.activityId,
      activeActionOperationId: identity.actionId,
      situationAuthorization: {
        version: 2,
        offerId: identity.offerId,
        activityAccess: { kind: 'none' },
        preparedPlans: [],
      },
      worldConditions: [
        {
          id: 'ships-delayed',
          label: 'Ships delayed',
          value: true,
          provenance: {
            kind: 'world-obligation',
            obligationId: identity.obligationId,
          },
          setAtGameSecond: 119_000,
        },
      ],
      activeActivities: [
        {
          id: identity.activityId,
          state: 'running',
          revision: 1,
          boundariesSettled: 0,
          plan: versionedPayload,
          progress: versionedPayload,
        },
      ],
      worldObligations: [
        {
          id: identity.obligationId,
          revision: 1,
          state: 'active',
          dueGameSecond: 200_000,
          firedAtGameSecond: null,
          definition: versionedPayload,
        },
      ],
      activeAction: {
        id: identity.actionId,
        offerId: identity.offerId,
        actionKey: 'travel-leg',
        baseRevision: 1,
        offer: versionedPayload,
        plan: versionedPayload,
        pendingResolution: null,
        status: 'running',
        revision: 0,
        startGameSecond: 118_000,
        targetGameSecond: 125_000,
        target: { kind: 'entity', id: 'npc-guide' },
      },
    },
    passage: {
      response: null,
      responseSource: null,
      initialItems: null,
      effects: [],
      decisionPlan: null,
      waitPlan: null,
      controlRevision: 0,
      content: {
        version: 1,
        title: 'Scene 37',
        paragraphs: ['The road bends toward Seyda Neen.'],
      },
      contentDocumentHash: null,
      interaction: identity.interactionId
        ? {
            id: identity.interactionId,
            specification: {
              kind: 'choice.v1',
              prompt: 'What now?',
              options: [{ id: 'wait', label: 'Wait' }],
            },
          }
        : null,
    },
  });
}

function forkId(forkStoryId, kind, sourceId) {
  return stableNamespacedDocumentId('fork', forkStoryId, `${kind}:${sourceId}`);
}

test('WR06 T03: v2 checkpoint fork reconstructs scene-37 active boundary', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-wr06-t03-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const ownerId = `wr06-t03-${randomUUID()}`;
    const storyId = randomUUID();
    const passage37 = randomUUID();
    const passage38 = randomUUID();
    const interactionId = randomUUID();
    const offerId = randomUUID();
    const activityId = randomUUID();
    const obligationId = randomUUID();
    const actionId = randomUUID();
    const evidenceId = randomUUID();
    const operation37 = randomUUID();
    const parentAnchor = new Date('2020-01-01T00:00:00.000Z');

    await database.db.$client.query(
      `insert into "user" (id, name, email, email_verified, created_at, updated_at)
       values ($1, $2, $3, true, now(), now())`,
      [ownerId, 'WR06-T03', `${ownerId}@example.test`],
    );

    const rootHash = await store.putManifest(
      documentManifestSchema.parse({
        format: 'offscreen.manifest.v1',
        campaignId: storyId,
        revision: 4,
        previousRootHash: null,
        authorOperationId: operation37,
        entries: [],
      }),
    );

    await database.db.insert(story).values({
      id: storyId,
      ownerId,
      source: 'test.scene-37.v1',
      premise: null,
      revision: 37,
      documentRootHash: rootHash,
      documentRootRevision: 4,
      activeSceneScope: {
        version: 'active-scene-anchor.v1',
        fromSequence: 37,
        requiredPassageIds: [passage37],
        recallCues: [],
      },
    });

    await database.db.insert(storyPassage).values({
      id: passage37,
      storyId,
      sequence: 37,
      content: { version: 1, title: 'Scene 37', paragraphs: ['Checkpoint scene.'] },
      interaction: {
        id: interactionId,
        specification: {
          kind: 'choice.v1',
          prompt: 'What now?',
          options: [{ id: 'wait', label: 'Wait' }],
        },
      },
    });

    const profile = { id: 'test-profile', revision: 1 };
    await database.db.insert(campaignSettings).values({
      storyId,
      revision: 1,
      settings: {
        revision: 1,
        creative: { profile, tone: 'Coast', emphasis: 'balanced', surprises: 'occasional', tags: [], guidance: [] },
        pace: { kind: 'instant' },
        locked: false,
        rules: 'srd-5.2.1-subset.v1',
        risk: 'nonlethal',
      },
      profile,
    });

    await database.db.insert(campaign).values({
      storyId,
      settingsRevision: 1,
      locked: 0,
      character: null,
      storyFacts: [{ id: 'quay-state', value: 'after-scene-38', declaredBy: evidenceId }],
      activityOccurrences: [],
      location: 'Later coast',
      gameSecond: 200_000,
      clock: {
        elapsedGameSeconds: 200_000,
        remainder: { numerator: '0', denominator: '1' },
      },
      clockAnchorAt: parentAnchor,
      clockPace: { kind: 'rate', fictionalSeconds: 10, realSeconds: 3600 },
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

    const checkpoint = checkpointV2({
      storyId,
      passageId: passage37,
      sceneSequence: 37,
      rootHash,
      rootRevision: 4,
      offerId,
      activityId,
      obligationId,
      actionId,
      evidenceId,
      interactionId,
    });
    await store.putSceneCheckpoint(checkpoint);
    await database.db.transaction((tx) =>
      insertSceneCheckpointReference(tx, {
        ownerId,
        operationId: operation37,
        expectedRevision: 37,
        expectedRootHash: rootHash,
        expectedRootRevision: 4,
        checkpoint,
        documentStore: store,
      }),
    );

    await database.db.insert(storyPassage).values({
      id: passage38,
      storyId,
      sequence: 38,
      transitionId: randomUUID(),
      content: { version: 1, title: 'Scene 38', paragraphs: ['Later scene.'] },
    });
    await database.db
      .update(story)
      .set({
        revision: 38,
        activeSceneScope: {
          version: 'active-scene-anchor.v1',
          fromSequence: 38,
          requiredPassageIds: [passage38],
          recallCues: [],
        },
      })
      .where(eq(story.id, storyId));

    const [selector] = await database.db
      .select()
      .from(storySceneCheckpoint)
      .where(
        and(
          eq(storySceneCheckpoint.storyId, storyId),
          eq(storySceneCheckpoint.sceneSequence, 37),
        ),
      );
    assert.ok(selector);

    const forkStoryId = randomUUID();
    const stories = createStories(database, { documentStore: store });
    const generationsBefore = await database.db.select({ id: generation.id }).from(generation);
    const outboxBefore = await database.db.select({ id: outbox.id }).from(outbox);

    await stories.fork({
      ownerId,
      sourceStoryId: storyId,
      forkStoryId,
      expectedRevision: 37,
      sourcePassageId: passage37,
      sourceCheckpointHash: selector.checkpointHash,
    });

    const [childStory] = await database.db
      .select()
      .from(story)
      .where(eq(story.id, forkStoryId));
    assert.equal(childStory.revision, 1);
    assert.equal(childStory.forkedFromSequence, 37);
    assert.equal(childStory.documentRootHash, rootHash);

    const [childPassage] = await database.db
      .select()
      .from(storyPassage)
      .where(eq(storyPassage.storyId, forkStoryId));
    assert.equal(childPassage.sequence, 1);

    const [childCampaign] = await database.db
      .select()
      .from(campaign)
      .where(eq(campaign.storyId, forkStoryId));
    assert.equal(childCampaign.gameSecond, 120_000);
    assert.notEqual(childCampaign.clockAnchorAt.getTime(), parentAnchor.getTime());
    assert.equal(childCampaign.storyFacts[0].value, 'at-checkpoint');
    assert.notEqual(childCampaign.storyFacts[0].value, 'after-scene-38');

    assert.equal(
      (await database.db.select().from(gameOffer).where(eq(gameOffer.storyId, forkStoryId)))[0]
        ?.id,
      forkId(forkStoryId, 'offer', offerId),
    );
    assert.equal(
      (await database.db.select().from(gameActivity).where(eq(gameActivity.storyId, forkStoryId)))[0]
        ?.id,
      forkId(forkStoryId, 'activity', activityId),
    );
    assert.equal(
      (
        await database.db
          .select()
          .from(worldObligation)
          .where(eq(worldObligation.storyId, forkStoryId))
      )[0]?.id,
      forkId(forkStoryId, 'obligation', obligationId),
    );
    assert.equal(
      (
        await database.db
          .select()
          .from(gameActionExecution)
          .where(eq(gameActionExecution.storyId, forkStoryId))
      )[0]?.operationId,
      forkId(forkStoryId, 'action', actionId),
    );

    const childGenerations = await database.db
      .select({ id: generation.id })
      .from(generation);
  const childOutbox = await database.db.select({ id: outbox.id }).from(outbox);
    assert.equal(childGenerations.length, generationsBefore.length);
    assert.equal(childOutbox.length, outboxBefore.length);
  });
});