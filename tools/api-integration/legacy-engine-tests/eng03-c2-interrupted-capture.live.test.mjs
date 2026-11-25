import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { generation } from '@offscreen/story-persistence/generations';
import {
  campaign,
  campaignConsequence,
  gameActionExecution,
  gameActionReceipt,
} from '@offscreen/story-persistence/campaign';
import { storyItem, storyResolution } from '@offscreen/story-persistence/stories';
import { storytellerContextCapture } from '@offscreen/story-persistence/storyteller';
import { LocalDocumentStore } from '@offscreen/documents';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { offlineExecution } from '@offscreen/storyteller/tasks';
import { createStories } from '../../../packages/story-engine/dist/stories/index.js';
import { initializeStoryInTransaction } from '../../../packages/story-engine/dist/stories/initialization.js';
import { initializeCampaign } from '../../../packages/story-engine/dist/campaign/settings.js';
import { stageStoryBootstrapDocuments } from '../../../packages/story-engine/dist/stories/passage-documents.js';
import {
  createEng03DelayedDocumentStore,
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../../../packages/lab-support/dist/index.js';
import { harborCompassItems, harborCompassTransferPlan } from '../../../packages/story-engine/dist/campaign/fixtures/item-transfer-plans.js';
import { createStorytellerRuntime } from '../../../packages/story-engine/dist/storyteller/runtime.js';
import { storytellerKind } from '../../../packages/story-engine/dist/storyteller/records.js';
import {
  interruptedActionContextCaptureV1Schema,
  parseContextCapture,
  storytellerContextCaptureKind,
} from '../../../packages/story-engine/dist/storyteller/context-capture.js';
import { lockOwnedStory } from '../../../packages/story-engine/dist/stories/persistence.js';

const profile = storytellerCatalogue.resolve({
  id: 'absurd-action-comedy',
  revision: 1,
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
    [ownerId, 'ENG03-C2', `${ownerId}@example.test`],
  );
}

async function seedInterruptStory(database, storage) {
  const ownerId = `eng03c2-${randomUUID()}`;
  const storyId = randomUUID();
  const passageId = randomUUID();
  await insertUser(database, ownerId);
  const content = {
    version: 1,
    title: 'Harbor interrupt capture',
    paragraphs: ['A quay runner tries to hand Mara a brass compass.'],
  };
  const premise = {
    title: 'Harbor interrupt capture',
    premise: 'A quay runner tries to hand Mara a brass compass.',
    storytellingDirection: 'Keep the interruption factual and playable.',
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
    items: harborCompassItems,
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
        items: harborCompassItems,
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
        plans: [harborCompassTransferPlan],
        activityAccess: { kind: 'none' },
      },
    );
  });

  const stories = createStories(database, { documentStore: storage });
  const before = await stories.read({ ownerId, storyId });
  const operationId = randomUUID();
  await stories.campaignAction({
    ownerId,
    storyId,
    operationId,
    body: {
      expectedRevision: before.revision,
      offerId: before.campaign.offer.id,
      path: ['give-compass'],
    },
  });
  await database.db
    .update(storyItem)
    .set({ holderKey: 'thief' })
    .where(eq(storyItem.storyId, storyId));
  assert.equal(await stories.advanceCampaignAction(operationId), null);

  const consequences = await database.db
    .select()
    .from(campaignConsequence)
    .where(eq(campaignConsequence.operationId, operationId));
  assert.equal(consequences.length, 1);
  assert.equal(consequences[0]?.receipt?.kind, 'action-interrupted');
  assert.equal(consequences[0]?.generationId ?? null, null);

  const receipts = await database.db
    .select()
    .from(gameActionReceipt)
    .where(eq(gameActionReceipt.operationId, operationId));
  assert.equal(receipts.length, 0);

  return { ownerId, storyId, operationId, stories, before };
}

test('ENG03-C2: interrupted transfer captures off-lock and promotes same G', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03c2-'));
    const storage = new LocalDocumentStore(root);
    const seeded = await seedInterruptStory(database, storage);

    await seeded.stories.prepareCampaignConsequence(seeded.operationId);

    const [consequenceAfterStage1] = await database.db
      .select()
      .from(campaignConsequence)
      .where(eq(campaignConsequence.operationId, seeded.operationId));
    assert.ok(consequenceAfterStage1.generationId);
    const generationId = consequenceAfterStage1.generationId;

    const [captureRow] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, generationId));
    assert.ok(captureRow);
    const capture = interruptedActionContextCaptureV1Schema.parse(
      captureRow.capture,
    );
    assert.equal(capture.purpose, 'consequence');
    assert.equal(capture.sourceKind, 'action-interrupted');
    assert.equal(capture.operationId, seeded.operationId);
    assert.equal(capture.interruption.cause, 'required-item-holder-changed');
    assert.deepEqual(capture.interruption.itemKeys, ['brass-compass']);
    assert.equal(
      parseContextCapture(captureRow.capture).sourceKind,
      'action-interrupted',
    );

    const [provisional] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, generationId));
    assert.equal(provisional.kind, storytellerContextCaptureKind);

    await seeded.stories.prepareCampaignConsequence(seeded.operationId);

    const [promoted] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, generationId));
    assert.equal(promoted.kind, storytellerKind);
    assert.equal(promoted.input.task, 'consequence');
    assert.equal(promoted.input.context.resolution.offer, null);
    assert.equal(promoted.input.context.resolution.receipts.length, 1);
    assert.equal(
      promoted.input.context.resolution.receipts[0].text,
      'The accepted transfer could not complete; the required item was no longer available',
    );
    assert.equal(promoted.input.context.resolution.receipts[0].roll, null);
    assert.deepEqual(promoted.input.context.resolution.receipts[0].effects, []);

    const [ready] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, generationId));
    assert.equal(ready.state, 'ready');

    const resolutions = await database.db
      .select()
      .from(storyResolution)
      .where(eq(storyResolution.storyId, seeded.storyId));
    assert.equal(resolutions.length, 1);
    assert.equal(resolutions[0].generationId, generationId);

    const storyteller = createStorytellerRuntime(database);
    await storyteller.complete(generationId);
    const resumed = await seeded.stories.read({
      ownerId: seeded.ownerId,
      storyId: seeded.storyId,
    });
    assert.ok(resumed.campaign?.offer);
    assert.notEqual(
      resumed.campaign?.offer?.id,
      seeded.before.campaign.offer.id,
    );
    assert.equal(
      resumed.items.find((item) => item.key === 'brass-compass')?.holderKey,
      'thief',
    );
    const successReceipts = await database.db
      .select()
      .from(gameActionReceipt)
      .where(eq(gameActionReceipt.operationId, seeded.operationId));
    assert.equal(successReceipts.length, 0);
  });
});

test('ENG03-C2: Stage-1 prepare hold does not scale with injected CAS delay', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03c2-lock-'));
    const storage = new LocalDocumentStore(root);
    const delayMs = 500;
    const delayed = createEng03DelayedDocumentStore(storage, { delayMs });
    const seeded = await seedInterruptStory(database, delayed);

    let contenderWaitMs = 0;
    const contender = (async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      const started = performance.now();
      await database.db.transaction(async (tx) => {
        await lockOwnedStory(tx, {
          ownerId: seeded.ownerId,
          storyId: seeded.storyId,
        });
      });
      contenderWaitMs = performance.now() - started;
    })();

    const stage1Started = performance.now();
    await seeded.stories.prepareCampaignConsequence(seeded.operationId);
    const stage1Ms = performance.now() - stage1Started;
    await contender;

    assert.ok(
      stage1Ms < delayMs,
      `Stage-1 prepare ${stage1Ms}ms scaled with ${delayMs}ms CAS delay`,
    );
    assert.ok(
      contenderWaitMs < delayMs,
      `same-story contender waited ${contenderWaitMs}ms under Stage-1 (CAS ${delayMs}ms)`,
    );

    const materializeStarted = performance.now();
    await seeded.stories.prepareCampaignConsequence(seeded.operationId);
    const materializeMs = performance.now() - materializeStarted;
    assert.ok(
      materializeMs >= delayMs * 0.5,
      `Stage-2 should observe CAS delay; got ${materializeMs}ms`,
    );

    const [gen] = await database.db
      .select()
      .from(generation)
      .where(
        eq(
          generation.id,
          (
            await database.db
              .select()
              .from(campaignConsequence)
              .where(eq(campaignConsequence.operationId, seeded.operationId))
          )[0].generationId,
        ),
      );
    assert.equal(gen.kind, storytellerKind);

    console.log(
      JSON.stringify({
        eng03C2LockProof: { delayMs, stage1Ms, contenderWaitMs, materializeMs },
      }),
    );
  });
});

test('ENG03-C2: duplicate prepare keeps one G and no success receipt', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03c2-neg-'));
    const storage = new LocalDocumentStore(root);
    const seeded = await seedInterruptStory(database, storage);
    await seeded.stories.prepareCampaignConsequence(seeded.operationId);
    await seeded.stories.prepareCampaignConsequence(seeded.operationId);
    await seeded.stories.prepareCampaignConsequence(seeded.operationId);

    const rows = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.operationId, seeded.operationId));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].capture.sourceKind, 'action-interrupted');

    const executions = await database.db
      .select()
      .from(gameActionExecution)
      .where(eq(gameActionExecution.operationId, seeded.operationId));
    assert.equal(executions[0]?.state, 'interrupted');
    assert.equal(executions[0]?.preparationGenerationId, null);

    const [state] = await database.db
      .select()
      .from(campaign)
      .where(eq(campaign.storyId, seeded.storyId));
    assert.ok(
      state.holds.some(
        (hold) =>
          hold.kind === 'storyteller' && hold.generationId === rows[0].captureId,
      ),
    );
  });
});
