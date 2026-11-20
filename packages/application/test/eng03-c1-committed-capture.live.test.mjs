import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import {
  campaign,
  gameActionExecution,
  gameActionReceipt,
} from '@offscreen/db/campaign-schema';
import { storyResolution } from '@offscreen/db/story-schema';
import { storytellerContextCapture } from '@offscreen/db/storyteller-schema';
import { LocalDocumentStore } from '@offscreen/documents';
import { immediateActionPlanSchema } from '@offscreen/game/immediate-actions';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { offlineExecution } from '@offscreen/storyteller/tasks';
import { createStories } from '../dist/stories/index.js';
import { initializeStoryInTransaction } from '../dist/stories/initialization.js';
import { initializeCampaign } from '../dist/campaign/settings.js';
import { stageStoryBootstrapDocuments } from '../dist/stories/passage-documents.js';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../dist/developer-tools/index.js';
import { storytellerKind } from '../dist/storyteller/records.js';
import { materializePendingActionCapture } from '../dist/storyteller/capture-materialization.js';
import {
  committedActionContextCaptureV1Schema,
  parseContextCapture,
} from '../dist/storyteller/context-capture.js';

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
    [ownerId, 'ENG03-C1', `${ownerId}@example.test`],
  );
}

async function seedCommittedReceiptStory(database, storage) {
  const ownerId = `eng03c1-${randomUUID()}`;
  const storyId = randomUUID();
  const passageId = randomUUID();
  await insertUser(database, ownerId);
  const content = {
    version: 1,
    title: 'Harbor committed capture',
    paragraphs: ['A harbor guard blocks the quay gate.'],
  };
  const premise = {
    title: 'Harbor committed capture',
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
  assert.ok(before.campaign?.offer);
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

test('ENG03-C1: one prepare materializes after stage-1 inserts capture row', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03c1-order-'));
    const storage = new LocalDocumentStore(root);
    const seeded = await seedCommittedReceiptStory(database, storage);

    const beforeRow = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.operationId, seeded.operationId));
    assert.equal(beforeRow.length, 0);

    const preMaterialize = await materializePendingActionCapture(
      database,
      seeded.operationId,
      storage,
    );
    assert.deepEqual(preMaterialize, { handled: false });

    await seeded.stories.prepareCampaignConsequence(seeded.operationId);

    const [receipt] = await database.db
      .select()
      .from(gameActionReceipt)
      .where(eq(gameActionReceipt.operationId, seeded.operationId));
    assert.ok(receipt.generationId);

    const [captureRow] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, receipt.generationId));
    assert.ok(captureRow);
    assert.equal(captureRow.state, 'ready');

    const [promoted] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, receipt.generationId));
    assert.equal(promoted.kind, storytellerKind);
    assert.equal(promoted.input.task, 'consequence');
  });
});

test('ENG03-C1: null-generation receipt captures off-lock and promotes same G to consequence', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03c1-'));
    const storage = new LocalDocumentStore(root);
    const seeded = await seedCommittedReceiptStory(database, storage);

    await seeded.stories.prepareCampaignConsequence(seeded.operationId);

    const [receiptAfterStage1] = await database.db
      .select()
      .from(gameActionReceipt)
      .where(eq(gameActionReceipt.operationId, seeded.operationId));
    assert.ok(receiptAfterStage1.generationId);
    const generationId = receiptAfterStage1.generationId;

    const [captureRow] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, generationId));
    assert.ok(captureRow);
    const capture = committedActionContextCaptureV1Schema.parse(
      captureRow.capture,
    );
    assert.equal(capture.purpose, 'consequence');
    assert.equal(capture.sourceKind, 'action-receipt');
    assert.equal(capture.operationId, seeded.operationId);
    assert.equal(parseContextCapture(captureRow.capture).purpose, 'consequence');

    const [afterFirstPrepare] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, generationId));
    assert.equal(afterFirstPrepare.kind, storytellerKind);
    assert.equal(afterFirstPrepare.input.task, 'consequence');

    const [ready] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, generationId));
    assert.equal(ready.state, 'ready');

    await seeded.stories.prepareCampaignConsequence(seeded.operationId);

    const [afterRetry] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, generationId));
    assert.equal(afterRetry.kind, storytellerKind);

    const resolutions = await database.db
      .select()
      .from(storyResolution)
      .where(eq(storyResolution.storyId, seeded.storyId));
    assert.equal(resolutions.length, 1);
    assert.equal(resolutions[0].generationId, generationId);
  });
});

test('ENG03-C1: missing capture row does not throw on prepare', async () => {
  await withDisposable(async (database) => {
    const missing = await materializePendingActionCapture(
      database,
      randomUUID(),
    );
    assert.deepEqual(missing, { handled: false });
  });
});

test('ENG03-C1: duplicate prepare does not insert a second capture', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03c1-idem-'));
    const storage = new LocalDocumentStore(root);
    const seeded = await seedCommittedReceiptStory(database, storage);

    await seeded.stories.prepareCampaignConsequence(seeded.operationId);
    await seeded.stories.prepareCampaignConsequence(seeded.operationId);
    await seeded.stories.prepareCampaignConsequence(seeded.operationId);

    const captures = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.operationId, seeded.operationId));
    assert.equal(captures.length, 1);
  });
});

test('ENG03-C1: pending-consequence capture path remains distinct from action-receipt', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03c1-neg-'));
    const storage = new LocalDocumentStore(root);
    const seeded = await seedCommittedReceiptStory(database, storage);
    await seeded.stories.prepareCampaignConsequence(seeded.operationId);
    const [row] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.operationId, seeded.operationId));
    assert.notEqual(row.capture.purpose, 'pending-consequence');
    assert.equal(row.capture.sourceKind, 'action-receipt');
  });
});
