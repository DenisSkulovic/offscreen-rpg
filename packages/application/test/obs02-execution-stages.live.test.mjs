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
import { createStorytellerRuntime } from '../dist/storyteller/runtime.js';
import { storytellerKind } from '../dist/storyteller/records.js';
import {
  listExecutionStages,
  recordExecutionStage,
} from '../dist/storyteller/execution-stages.js';
import { materializePendingActionCapture } from '../dist/storyteller/capture-materialization.js';

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
    [ownerId, 'OBS02', `${ownerId}@example.test`],
  );
}

async function seedCommittedReceiptStory(database, storage) {
  const ownerId = `obs02-${randomUUID()}`;
  const storyId = randomUUID();
  const passageId = randomUUID();
  await insertUser(database, ownerId);
  const content = {
    version: 1,
    title: 'Harbor OBS02',
    paragraphs: ['A harbor guard blocks the quay gate.'],
  };
  const premise = {
    title: 'Harbor OBS02',
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

function stageNames(rows) {
  return rows.map((row) => row.stage);
}

test('OBS02: scripted consequence emits cause→task→validation→publication stages', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'obs02-ok-'));
    const storage = new LocalDocumentStore(root);
    const seeded = await seedCommittedReceiptStory(database, storage);

    await seeded.stories.prepareCampaignConsequence(seeded.operationId);
    const [receipt] = await database.db
      .select()
      .from(gameActionReceipt)
      .where(eq(gameActionReceipt.operationId, seeded.operationId));
    const generationId = receipt.generationId;
    assert.ok(generationId);

    let stages = await listExecutionStages(database, generationId);
    assert.deepEqual(stageNames(stages), ['cause-captured']);
    assert.equal(stages[0].sourceSha256?.length, 64);
    assert.equal(
      JSON.stringify(stages).includes('harbor'),
      false,
      'stage rows must not embed narrative text',
    );

    await seeded.stories.prepareCampaignConsequence(seeded.operationId);
    stages = await listExecutionStages(database, generationId);
    assert.ok(stageNames(stages).includes('context-materialization-started'));
    assert.ok(stageNames(stages).includes('context-materialization-completed'));

    const [promoted] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, generationId));
    assert.equal(promoted.kind, storytellerKind);

    const storyteller = createStorytellerRuntime(database, {
      documentStore: storage,
    });
    await storyteller.complete(generationId);
    await storyteller.complete(generationId);

    stages = await listExecutionStages(database, generationId);
    const names = stageNames(stages);
    assert.ok(names.includes('task-prepared'));
    assert.ok(names.includes('stage-skipped'));
    assert.ok(names.includes('validation-settled'));
    assert.ok(names.includes('publication-decided'));
    assert.equal(names.includes('provider-dispatch-possible'), false);
    assert.equal(names.includes('model-response-recorded'), false);
    assert.equal(
      stages.filter((row) => row.stage === 'cause-captured').length,
      1,
    );
    assert.equal(
      stages.filter((row) => row.stage === 'publication-decided').length,
      1,
    );
    const skipped = stages.find((row) => row.stage === 'stage-skipped');
    assert.equal(skipped?.outcome, 'not-run');
    assert.equal(skipped?.failureClass, 'scripted_execution');
  });
});

test('OBS02: held capture before provider records held without task/model stages', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'obs02-held-'));
    const storage = new LocalDocumentStore(root);
    const seeded = await seedCommittedReceiptStory(database, storage);

    await seeded.stories.prepareCampaignConsequence(seeded.operationId);
    const [receipt] = await database.db
      .select()
      .from(gameActionReceipt)
      .where(eq(gameActionReceipt.operationId, seeded.operationId));
    const generationId = receipt.generationId;
    assert.ok(generationId);

    // document_store is retryable until attempts exhaust into durable held.
    let last;
    for (let i = 0; i < 3; i++) {
      last = await materializePendingActionCapture(
        database,
        seeded.operationId,
      );
      assert.equal(last.handled, true);
    }
    assert.deepEqual(last, { handled: true, outcome: 'held' });

    const [capture] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, generationId));
    assert.equal(capture.state, 'held');
    assert.equal(capture.failureCode, 'document_store');

    const stages = await listExecutionStages(database, generationId);
    const names = stageNames(stages);
    assert.ok(names.includes('cause-captured'));
    assert.ok(names.includes('context-materialization-started'));
    assert.ok(names.includes('stage-held'));
    assert.equal(names.includes('context-materialization-completed'), false);
    assert.equal(names.includes('task-prepared'), false);
    assert.equal(names.includes('validation-settled'), false);
    assert.equal(names.includes('publication-decided'), false);
    assert.equal(names.includes('model-response-recorded'), false);
  });
});

test('OBS02: duplicate stage insert is idempotent; foreign G stays empty', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'obs02-idemp-'));
    const storage = new LocalDocumentStore(root);
    const seeded = await seedCommittedReceiptStory(database, storage);
    await seeded.stories.prepareCampaignConsequence(seeded.operationId);
    const [receipt] = await database.db
      .select()
      .from(gameActionReceipt)
      .where(eq(gameActionReceipt.operationId, seeded.operationId));
    const generationId = receipt.generationId;

    await recordExecutionStage(database.db, {
      generationId,
      stage: 'cause-captured',
      outcome: 'completed',
      idempotencyKey: 'cause-captured',
      sourceKind: 'context-capture',
      sourceId: generationId,
    });
    await recordExecutionStage(database.db, {
      generationId,
      stage: 'cause-captured',
      outcome: 'completed',
      idempotencyKey: 'cause-captured',
      sourceKind: 'context-capture',
      sourceId: generationId,
    });
    const stages = await listExecutionStages(database, generationId);
    assert.equal(
      stages.filter((row) => row.stage === 'cause-captured').length,
      1,
    );

    const foreign = await listExecutionStages(database, randomUUID());
    assert.equal(foreign.length, 0);
  });
});
