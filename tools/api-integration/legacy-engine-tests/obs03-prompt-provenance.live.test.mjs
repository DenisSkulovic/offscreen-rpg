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
import { materializePendingActionCapture } from '../../../packages/story-engine/dist/storyteller/capture-materialization.js';
import { readPromptProvenance } from '../../../packages/story-engine/dist/storyteller/prompt-provenance.js';
import { storytellerTaskSchema } from '@offscreen/storyteller/tasks';
import { generation } from '@offscreen/story-persistence/generations';

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
    [ownerId, 'OBS03', `${ownerId}@example.test`],
  );
}

async function seedCommittedReceiptStory(database, storage) {
  const ownerId = `obs03-${randomUUID()}`;
  const storyId = randomUUID();
  const passageId = randomUUID();
  await insertUser(database, ownerId);
  const content = {
    version: 1,
    title: 'Harbor OBS03',
    paragraphs: ['A harbor guard blocks the quay gate.'],
  };
  const premise = {
    title: 'Harbor OBS03',
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

test('OBS03: promoted consequence persists one provenance manifest matching task request SHA', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'obs03-ok-'));
    const storage = new LocalDocumentStore(root);
    const seeded = await seedCommittedReceiptStory(database, storage);

    await seeded.stories.prepareCampaignConsequence(seeded.operationId);
    const [receipt] = await database.db
      .select()
      .from(gameActionReceipt)
      .where(eq(gameActionReceipt.operationId, seeded.operationId));
    const generationId = receipt.generationId;
    assert.equal(await readPromptProvenance(database, generationId), null);

    await seeded.stories.prepareCampaignConsequence(seeded.operationId);
    await seeded.stories.prepareCampaignConsequence(seeded.operationId);

    const row = await readPromptProvenance(database, generationId);
    assert.ok(row);
    assert.equal(row.manifest.generationId, generationId);
    assert.equal(row.manifest.sourceKind, 'consequence');

    const [promoted] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, generationId));
    const task = storytellerTaskSchema.parse(promoted.input);
    assert.equal(task.task, 'consequence');
    assert.equal(row.compiledRequestSha256, row.manifest.compiledRequestSha256);
    assert.equal(row.taskInputSha256, row.manifest.taskInputSha256);
    assert.equal(
      JSON.stringify(row.manifest).includes('The guard lets you pass'),
      false,
    );
  });
});

test('OBS03: held capture before promotion stores no provenance', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'obs03-held-'));
    const storage = new LocalDocumentStore(root);
    const seeded = await seedCommittedReceiptStory(database, storage);
    await seeded.stories.prepareCampaignConsequence(seeded.operationId);
    const [receipt] = await database.db
      .select()
      .from(gameActionReceipt)
      .where(eq(gameActionReceipt.operationId, seeded.operationId));
    for (let i = 0; i < 3; i++) {
      await materializePendingActionCapture(database, seeded.operationId);
    }
    assert.equal(await readPromptProvenance(database, receipt.generationId), null);
  });
});
