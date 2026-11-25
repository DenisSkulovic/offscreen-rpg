import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import {
  campaign,
  gameActionExecution,
  gameActionReceipt,
} from '@offscreen/story-persistence/campaign';
import { storytellerContextCapture } from '@offscreen/story-persistence/storyteller';
import { LocalDocumentStore } from '@offscreen/documents';
import { immediateActionPlanSchema } from '@offscreen/game/immediate-actions';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { offlineExecution } from '@offscreen/storyteller/tasks';
import { createStories } from '../../../packages/story-engine/dist/stories/index.js';
import { initializeStoryInTransaction } from '../../../packages/story-engine/dist/stories/initialization.js';
import { initializeCampaign } from '../../../packages/story-engine/dist/campaign/settings.js';
import { stageStoryBootstrapDocuments } from '../../../packages/story-engine/dist/stories/passage-documents.js';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../../../packages/lab-support/dist/index.js';
import {
  materializePendingActionCapture,
  releaseCaptureFailure,
} from '../../../packages/story-engine/dist/storyteller/capture-materialization.js';
import { rearmContextCapture } from '../../../packages/story-engine/dist/storyteller/capture-rearm.js';
import {
  ExecutionStageIntegrityError,
  captureMaterializationStartedKey,
  captureTerminalStageKey,
  listExecutionStages,
  recordExecutionStage,
} from '../../../packages/story-engine/dist/storyteller/execution-stages.js';

const profile = storytellerCatalogue.resolve({
  id: 'absurd-action-comedy',
  revision: 1,
});

const persuadePlan = immediateActionPlanSchema.parse({
  version: 1,
  key: 'persuade-guard',
  label: 'Persuade the guard',
  intention: 'Talk past the harbor guard without drawing steel.',
  risk: null,
  evidence: [],
  requires: [],
  resolution: {
    kind: 'automatic',
    fictionalDurationSeconds: 5,
    outcome: {
      text: 'The guard lets you pass.',
      effects: [],
      declarations: [],
      worldEffects: [],
    },
  },
});

function quayCharacter() {
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
    hp: 10,
    maxHp: 10,
    facts: [],
    quantities: [],
  };
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

async function insertUser(database, ownerId) {
  await database.db.$client.query(
    `insert into "user" (id, name, email, email_verified, created_at, updated_at)
     values ($1, $2, $3, true, now(), now())`,
    [ownerId, 'OBS02-H', `${ownerId}@example.test`],
  );
}

async function seedCommittedReceiptStory(database, storage) {
  const ownerId = `obs02h-${randomUUID()}`;
  const storyId = randomUUID();
  const passageId = randomUUID();
  await insertUser(database, ownerId);
  const content = {
    version: 1,
    title: 'Harbor OBS02-H',
    paragraphs: ['A harbor guard blocks the quay gate.'],
  };
  const premise = {
    title: 'Harbor OBS02-H',
    premise: 'A quay runner faces a harbor guard.',
    storytellingDirection: 'Keep probes factual.',
  };
  const staged = await stageStoryBootstrapDocuments({
    storage,
    storyId,
    passageId,
    sequence: 1,
    operationId: storyId,
    rootHash: null,
    rootRevision: 0,
    content,
    premise,
    items: [],
  });
  await database.db.transaction(async (tx) => {
    await initializeStoryInTransaction(tx, {
      ownerId,
      storyId,
      input: {
        source: 'playable.opening.v1',
        premise,
        storyteller: profile,
        execution: offlineExecution,
        usagePolicy: null,
        items: [],
        content,
        interaction: null,
      },
      stagedPassage: staged,
    });
    await initializeCampaign(
      tx,
      storyId,
      profile,
      {
        mechanics: true,
        locked: false,
        pace: { kind: 'instant' },
        time: {
          kind: 'elapsed',
          id: 'simulation-game-seconds',
          revision: 1,
          unit: {
            id: 'game-second',
            label: 'game-second',
            pluralLabel: 'game-seconds',
            gameSecondsPerUnit: 1,
          },
          epoch: { wholeUnits: 0, gameSecondOfUnit: 0 },
        },
        worldObligations: [],
        worlds: [],
      },
      {
        character: quayCharacter(),
        storyFacts: [],
        plans: [persuadePlan],
        activityAccess: { kind: 'none' },
      },
    );
  });

  const stories = createStories(database, { documentStore: storage });
  const before = await stories.read({ ownerId, storyId });
  const operationId = randomUUID();
  await database.db.insert(gameActionExecution).values({
    operationId,
    storyId,
    offerId: before.campaign.offer.id,
    actionKey: persuadePlan.key,
    baseRevision: before.revision,
    offer: before.campaign.offer,
    plan: persuadePlan,
    pendingResolution: null,
    preparationGenerationId: null,
    startGameSecond: 0,
    targetGameSecond: 5,
    state: 'settled',
    revision: 1,
    settledAt: new Date(),
  });
  await database.db.insert(gameActionReceipt).values({
    operationId,
    storyId,
    offerId: before.campaign.offer.id,
    actionKey: persuadePlan.key,
    baseRevision: before.revision,
    offer: before.campaign.offer,
    plan: persuadePlan,
    label: persuadePlan.label,
    intention: persuadePlan.intention,
    outcome: 'automatic',
    outcomeText: 'The guard lets you pass.',
    effects: [],
    declarations: [],
    roll: null,
    generationId: null,
  });
  await database.db
    .update(campaign)
    .set({
      holds: [
        {
          kind: 'storyteller-intent',
          operationId,
          reason: 'required-turn',
        },
      ],
    })
    .where(eq(campaign.storyId, storyId));

  return { ownerId, storyId, operationId, stories };
}

test('OBS02-H: identical stage retry is no-op; divergent payload conflicts', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'obs02h-conflict-'));
    const storage = new LocalDocumentStore(root);
    const seeded = await seedCommittedReceiptStory(database, storage);
    await seeded.stories.prepareCampaignConsequence(seeded.operationId);
    const [receipt] = await database.db
      .select()
      .from(gameActionReceipt)
      .where(eq(gameActionReceipt.operationId, seeded.operationId));
    const generationId = receipt.generationId;

    const base = {
      generationId,
      stage: 'stage-held',
      outcome: 'held',
      idempotencyKey: captureTerminalStageKey(0, 3, 'held'),
      sourceKind: 'context-capture',
      sourceId: generationId,
      failureClass: 'document_store',
    };
    await recordExecutionStage(database.db, base);
    await recordExecutionStage(database.db, base);
    assert.equal(
      (await listExecutionStages(database, generationId)).filter(
        (row) => row.stage === 'stage-held',
      ).length,
      1,
    );
    await assert.rejects(
      () =>
        recordExecutionStage(database.db, {
          ...base,
          failureClass: 'other_failure',
        }),
      (error) => error instanceof ExecutionStageIntegrityError,
    );
  });
});

test('OBS02-H: stale lease release writes no authoritative terminal stage', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'obs02h-stale-'));
    const storage = new LocalDocumentStore(root);
    const seeded = await seedCommittedReceiptStory(database, storage);
    await seeded.stories.prepareCampaignConsequence(seeded.operationId);
    const [receipt] = await database.db
      .select()
      .from(gameActionReceipt)
      .where(eq(gameActionReceipt.operationId, seeded.operationId));
    const generationId = receipt.generationId;

    const staleLease = randomUUID();
    const liveLease = randomUUID();
    await database.db
      .update(storytellerContextCapture)
      .set({
        state: 'materializing',
        materializationAttempts: 3,
        leaseId: liveLease,
        leaseExpiresAt: new Date(Date.now() + 60_000),
        updatedAt: new Date(),
      })
      .where(eq(storytellerContextCapture.captureId, generationId));

    const lost = await releaseCaptureFailure(database, {
      captureId: generationId,
      leaseId: staleLease,
      attempts: 3,
      rearmEpoch: 0,
      code: 'document_store',
    });
    assert.deepEqual(lost, { applied: false, reason: 'lease-lost' });

    const [row] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, generationId));
    assert.equal(row.state, 'materializing');
    assert.equal(row.leaseId, liveLease);

    const stages = await listExecutionStages(database, generationId);
    assert.equal(
      stages.some((stage) => stage.stage === 'stage-held'),
      false,
    );
    assert.equal(
      stages.some((stage) => stage.stage === 'stage-failed'),
      false,
    );
  });
});

test('OBS02-H: epoch 0 and rearm epoch 1 start/held stages stay distinct', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'obs02h-epoch-'));
    const storage = new LocalDocumentStore(root);
    const seeded = await seedCommittedReceiptStory(database, storage);
    await seeded.stories.prepareCampaignConsequence(seeded.operationId);
    const [receipt] = await database.db
      .select()
      .from(gameActionReceipt)
      .where(eq(gameActionReceipt.operationId, seeded.operationId));
    const generationId = receipt.generationId;

    for (let i = 0; i < 3; i++) {
      await materializePendingActionCapture(database, seeded.operationId);
    }
    const [held0] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, generationId));
    assert.equal(held0.state, 'held');
    assert.equal(held0.rearmEpoch, 0);

    const rearm = await rearmContextCapture(database, {
      operatorId: `ops:${randomUUID()}`,
      storyId: seeded.storyId,
      captureId: generationId,
      rearmId: randomUUID(),
      reasonCode: 'storage-restored',
    });
    assert.equal(rearm.outcome, 'rearmed');

    for (let i = 0; i < 3; i++) {
      await materializePendingActionCapture(database, seeded.operationId);
    }
    const [held1] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, generationId));
    assert.equal(held1.state, 'held');
    assert.equal(held1.rearmEpoch, 1);

    const stages = await listExecutionStages(database, generationId);
    const starts = stages
      .filter((row) => row.stage === 'context-materialization-started')
      .map((row) => row.idempotencyKey)
      .sort();
    assert.deepEqual(starts, [
      captureMaterializationStartedKey(0, 1),
      captureMaterializationStartedKey(0, 2),
      captureMaterializationStartedKey(0, 3),
      captureMaterializationStartedKey(1, 1),
      captureMaterializationStartedKey(1, 2),
      captureMaterializationStartedKey(1, 3),
    ]);
    const heldKeys = stages
      .filter((row) => row.stage === 'stage-held')
      .map((row) => row.idempotencyKey)
      .sort();
    assert.deepEqual(heldKeys, [
      captureTerminalStageKey(0, 3, 'held'),
      captureTerminalStageKey(1, 3, 'held'),
    ]);
  });
});
