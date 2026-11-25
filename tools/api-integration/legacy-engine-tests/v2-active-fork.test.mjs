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
import {
  initialActivityProgress,
  resolvedActivityPlanSchema,
} from '@offscreen/game/activities';
import { immediateActionPlanSchema } from '@offscreen/game/immediate-actions';
import { worldObligationSchema } from '@offscreen/game/world-obligations';
import { StoryError, createStories } from '../../../packages/story-engine/dist/stories/index.js';
import { insertSceneCheckpointReference } from '../../../packages/story-engine/dist/stories/scene-checkpoint.js';

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
    skills: [{ id: 'perception', label: 'Perception' }],
    proficientSkills: ['perception'],
    proficiencyBonus: 2,
    hp: 20,
    maxHp: 20,
    facts: [],
    quantities: [],
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

function versioned(body) {
  return { version: 1, body };
}

const activityAction = {
  id: 'coastal-watch',
  label: 'Watch the coast',
  description: 'Keep watch along the Seyda Neen road.',
  requires: [],
  capacity: 'primary',
  process: {
    kind: 'contribution.v1',
    progressLabel: 'Coastal watch',
    requiredContribution: 10,
    everyFictionalSeconds: 5,
    attempt: {
      check: {
        rule: 'srd-5.2.1-subset.v1',
        purpose: 'Watch the coast',
        skill: 'perception',
        ability: 'wisdom',
        dc: 10,
        advantage: false,
        disadvantage: false,
        modifiers: [],
      },
      successContribution: 2,
      failureContribution: 0,
      successText: 'You notice more of the road.',
      failureText: 'The watch passes quietly.',
    },
  },
  conditionPolicy: { kind: 'admission-only' },
  occurrence: { kind: 'unbounded' },
  completionFollowUp: 'scene',
  checks: [],
  completion: { text: 'The watch ends.', effects: [] },
};

const activityPlanBody = resolvedActivityPlanSchema.parse({
  version: 6,
  action: activityAction,
  settingsRevision: 1,
  resolvedThroughGameSecond: 0,
});

const immediatePlanBody = immediateActionPlanSchema.parse({
  version: 1,
  key: 'travel-leg',
  label: 'Continue travel',
  intention: 'Walk the coastal leg toward Seyda Neen.',
  risk: null,
  evidence: [],
  requires: [],
  requiresStory: [],
  requiresQuantities: [],
  resolution: {
    kind: 'automatic',
    fictionalDurationSeconds: 3600,
    outcome: {
      text: 'The road bends onward.',
      effects: [],
      declarations: [],
      worldEffects: [],
    },
  },
});

const activityPlan = versioned(activityPlanBody);
const activityProgress = versioned(initialActivityProgress(activityAction));
function obligationDefinitionFor(obligationId) {
  return versioned(
    worldObligationSchema.parse({
      id: obligationId,
      revision: 1,
      source: { id: 'ships-delayed', revision: 1 },
      label: 'Ships delayed',
      visibility: { kind: 'exact' },
      consequence: {
        kind: 'condition.set.v1',
        condition: { id: 'ships-delayed', label: 'Ships delayed', value: true },
      },
      followUp: 'report',
      dueGameSecond: 200_000,
      originGameSecond: 119_000,
    }),
  );
}

const SCENE_37_PARAGRAPH = 'The road bends toward Seyda Neen.';
const SCENE_80_PARAGRAPH =
  'Eighty scenes later the coast looks nothing like the checkpoint.';

function checkpointV2(identity) {
  const obligationDefinition = obligationDefinitionFor(identity.obligationId);
  return sceneCheckpointSchema.parse({
    format: 'offscreen.scene-checkpoint.v2',
    stateSchemaVersion: 2,
    storyId: identity.storyId,
    passageId: identity.passageId,
    sceneSequence: identity.sceneSequence,
    transitionId: identity.transitionId ?? null,
    source: 'test.scene-37.v1',
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
    fictionalState: {
      mechanicsAbsent: false,
      character: character(),
      items: [{ key: 'sword-a', label: 'Sword', holderKey: 'character' }],
      storyFacts: [
        {
          id: 'quay-state',
          value: 'at-checkpoint',
          declaredBy: identity.evidenceId,
        },
      ],
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
            plans: versioned(immediatePlanBody),
          },
        },
      },
      acceptedActivityPlan: null,
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
          plan: activityPlan,
          progress: activityProgress,
        },
      ],
      worldObligations: [
        {
          id: identity.obligationId,
          revision: 1,
          state: 'pending',
          dueGameSecond: 200_000,
          firedAtGameSecond: null,
          definition: obligationDefinition,
        },
      ],
      activeAction: {
        id: identity.actionId,
        offerId: identity.offerId,
        actionKey: 'travel-leg',
        baseRevision: 1,
        offer: versioned({ id: identity.offerId }),
        plan: versioned(immediatePlanBody),
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
        paragraphs: [SCENE_37_PARAGRAPH],
      },
      contentDocumentHash: null,
      interaction: {
        id: identity.interactionId,
        specification: {
          kind: 'choice.v1',
          prompt: 'The ferry horn sounds. What do you do?',
          options: [{ id: 'wait', label: 'Wait for the ferry' }],
        },
      },
    },
  });
}

function forkId(forkStoryId, kind, sourceId) {
  return stableNamespacedDocumentId('fork', forkStoryId, `${kind}:${sourceId}`);
}

async function seedScene37WithLaterScene80(database, store) {
  const ownerId = `wr06-t04-${randomUUID()}`;
  const otherOwnerId = `wr06-t04-other-${randomUUID()}`;
  const storyId = randomUUID();
  const passage37 = randomUUID();
  const passage80 = randomUUID();
  const interactionId = randomUUID();
  const offerId = randomUUID();
  const activityId = randomUUID();
  const obligationId = randomUUID();
  const actionId = randomUUID();
  const evidenceId = randomUUID();
  const operation37 = randomUUID();
  const transition37 = randomUUID();
  const parentAnchor = new Date('2020-01-01T00:00:00.000Z');

  await database.db.$client.query(
    `insert into "user" (id, name, email, email_verified, created_at, updated_at)
     values ($1, $2, $3, true, now(), now()), ($4, $5, $6, true, now(), now())`,
    [
      ownerId,
      'WR06-T04',
      `${ownerId}@example.test`,
      otherOwnerId,
      'WR06-T04-other',
      `${otherOwnerId}@example.test`,
    ],
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

  const profile = { id: 'test-profile', revision: 1 };
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
    transitionId: transition37,
    content: {
      version: 1,
      title: 'Scene 37',
      paragraphs: [SCENE_37_PARAGRAPH],
    },
    interaction: {
      id: interactionId,
      specification: {
        kind: 'choice.v1',
        prompt: 'The ferry horn sounds. What do you do?',
        options: [{ id: 'wait', label: 'Wait for the ferry' }],
      },
    },
  });

  await database.db.insert(campaignSettings).values({
    storyId,
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

  await database.db.insert(campaign).values({
    storyId,
    settingsRevision: 1,
    locked: 0,
    character: character(),
    storyFacts: [{ id: 'quay-state', value: 'after-scene-80', declaredBy: evidenceId }],
    activityOccurrences: [],
    location: 'Later coast',
    gameSecond: 500_000,
    clock: {
      elapsedGameSeconds: 500_000,
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
    transitionId: transition37,
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
    id: passage80,
    storyId,
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

  return {
    ownerId,
    otherOwnerId,
    storyId,
    passage37,
    passage80,
    offerId,
    activityId,
    obligationId,
    actionId,
    evidenceId,
    rootHash,
    checkpointHash: selector.checkpointHash,
  };
}

async function countForkChildren(database, sourceStoryId) {
  const rows = await database.db
    .select({ id: story.id })
    .from(story)
    .where(eq(story.forkedFromStoryId, sourceStoryId));
  return rows.length;
}

async function countPassagesForStory(database, storyId) {
  const rows = await database.db
    .select({ id: storyPassage.id })
    .from(storyPassage)
    .where(eq(storyPassage.storyId, storyId));
  return rows.length;
}

test('WR06 T04: v2 active fork at scene 37 is transactional and idempotent', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-wr06-t04-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const seeded = await seedScene37WithLaterScene80(database, store);
    const stories = createStories(database, { documentStore: store });
    const forkStoryId = randomUUID();

    const generationsBefore = await database.db
      .select({ id: generation.id })
      .from(generation);
    const outboxBefore = await database.db.select({ id: outbox.id }).from(outbox);

    await stories.fork({
      ownerId: seeded.ownerId,
      sourceStoryId: seeded.storyId,
      forkStoryId,
      expectedRevision: 37,
      sourcePassageId: seeded.passage37,
      sourceCheckpointHash: seeded.checkpointHash,
    });

    const [childStory] = await database.db
      .select()
      .from(story)
      .where(eq(story.id, forkStoryId));
    assert.equal(childStory.revision, 1);
    assert.equal(childStory.forkedFromSequence, 37);
    assert.equal(childStory.documentRootHash, seeded.rootHash);
    assert.equal(childStory.documentRootRevision, 4);

    const childPassages = await database.db
      .select()
      .from(storyPassage)
      .where(eq(storyPassage.storyId, forkStoryId));
    assert.equal(childPassages.length, 1);
    assert.equal(childPassages[0].sequence, 1);
    assert.equal(childPassages[0].content.paragraphs[0], SCENE_37_PARAGRAPH);
    assert.notEqual(childPassages[0].content.paragraphs[0], SCENE_80_PARAGRAPH);

    assert.equal(childStory.continuityNotes[0].sources[0], seeded.evidenceId);

    assert.equal(
      (await database.db.select().from(gameOffer).where(eq(gameOffer.storyId, forkStoryId)))[0]
        ?.id,
      forkId(forkStoryId, 'offer', seeded.offerId),
    );
    assert.equal(
      (await database.db.select().from(gameActivity).where(eq(gameActivity.storyId, forkStoryId)))[
        0
      ]?.id,
      forkId(forkStoryId, 'activity', seeded.activityId),
    );
    assert.equal(
      (
        await database.db
          .select()
          .from(worldObligation)
          .where(eq(worldObligation.storyId, forkStoryId))
      )[0]?.id,
      forkId(forkStoryId, 'obligation', seeded.obligationId),
    );
    assert.equal(
      (
        await database.db
          .select()
          .from(gameActionExecution)
          .where(eq(gameActionExecution.storyId, forkStoryId))
      )[0]?.operationId,
      forkId(forkStoryId, 'action', seeded.actionId),
    );

    const [childCampaign] = await database.db
      .select()
      .from(campaign)
      .where(eq(campaign.storyId, forkStoryId));
    assert.equal(childCampaign.gameSecond, 120_000);
    assert.equal(childCampaign.storyFacts[0].value, 'at-checkpoint');
    assert.notEqual(childCampaign.storyFacts[0].value, 'after-scene-80');

    const generationsAfter = await database.db
      .select({ id: generation.id })
      .from(generation);
    const outboxAfter = await database.db.select({ id: outbox.id }).from(outbox);
    assert.equal(generationsAfter.length, generationsBefore.length);
    assert.equal(outboxAfter.length, outboxBefore.length);

    await stories.fork({
      ownerId: seeded.ownerId,
      sourceStoryId: seeded.storyId,
      forkStoryId,
      expectedRevision: 37,
      sourcePassageId: seeded.passage37,
      sourceCheckpointHash: seeded.checkpointHash,
    });
    assert.equal(await countPassagesForStory(database, forkStoryId), 1);
  });
});

test('WR06 T04: v2 fork negatives leave no partial child rows', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-wr06-t04-neg-'));
  const store = new LocalDocumentStore(root);
  await withDisposable(async (database) => {
    const seeded = await seedScene37WithLaterScene80(database, store);
    const stories = createStories(database, { documentStore: store });

    const stableForkId = randomUUID();
    await stories.fork({
      ownerId: seeded.ownerId,
      sourceStoryId: seeded.storyId,
      forkStoryId: stableForkId,
      expectedRevision: 37,
      sourcePassageId: seeded.passage37,
      sourceCheckpointHash: seeded.checkpointHash,
    });
    const afterSuccessfulFork = await countForkChildren(database, seeded.storyId);
    assert.equal(afterSuccessfulFork, 1);

    const beforeNegatives = await countForkChildren(database, seeded.storyId);

    await assert.rejects(
      () =>
        stories.fork({
          ownerId: seeded.otherOwnerId,
          sourceStoryId: seeded.storyId,
          forkStoryId: randomUUID(),
          expectedRevision: 37,
          sourcePassageId: seeded.passage37,
          sourceCheckpointHash: seeded.checkpointHash,
        }),
      (error) => error instanceof StoryError && error.code === 'not_found',
    );

    const rejectForkId = randomUUID();
    await assert.rejects(
      () =>
        stories.fork({
          ownerId: seeded.ownerId,
          sourceStoryId: seeded.storyId,
          forkStoryId: rejectForkId,
          expectedRevision: 37,
          sourcePassageId: seeded.passage37,
          sourceCheckpointHash: 'c'.repeat(64),
        }),
      (error) =>
        error instanceof StoryError &&
        error.code === 'invalid' &&
        error.reason === 'checkpoint_hash_mismatch',
    );
    const wrongHashRows = await database.db
      .select()
      .from(story)
      .where(eq(story.id, rejectForkId));
    assert.equal(wrongHashRows.length, 0);

    await assert.rejects(
      () =>
        stories.fork({
          ownerId: seeded.ownerId,
          sourceStoryId: seeded.storyId,
          forkStoryId: stableForkId,
          expectedRevision: 80,
          sourcePassageId: seeded.passage80,
          sourceCheckpointHash: seeded.checkpointHash,
        }),
      (error) =>
        error instanceof StoryError &&
        error.code === 'conflict' &&
        error.reason === 'fork_destination_in_use',
    );

    assert.equal(await countForkChildren(database, seeded.storyId), beforeNegatives);
    assert.equal(await countPassagesForStory(database, stableForkId), 1);

    const secondChildId = randomUUID();
    await stories.fork({
      ownerId: seeded.ownerId,
      sourceStoryId: seeded.storyId,
      forkStoryId: secondChildId,
      expectedRevision: 37,
      sourcePassageId: seeded.passage37,
      sourceCheckpointHash: seeded.checkpointHash,
    });
    assert.equal(await countForkChildren(database, seeded.storyId), beforeNegatives + 1);
  });
});