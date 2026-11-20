import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { campaign, campaignConsequence } from '@offscreen/db/campaign-schema';
import { storyPassage, storyResolution } from '@offscreen/db/story-schema';
import {
  storytellerContextCapture,
  storytellerPublication,
} from '@offscreen/db/storyteller-schema';
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
import { createStorytellerRuntime } from '../dist/storyteller/runtime.js';
import {
  activityConsequenceContextCaptureV1Schema,
  parseContextCapture,
  storytellerContextCaptureKind,
  worldObligationConsequenceContextCaptureV1Schema,
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
    [ownerId, 'ENG03-T04', `${ownerId}@example.test`],
  );
}

async function seedActivityConsequenceStory(database, storage) {
  const ownerId = `eng03t04-${randomUUID()}`;
  const storyId = randomUUID();
  const passageId = randomUUID();
  await insertUser(database, ownerId);
  const content = {
    version: 1,
    title: 'Harbor activity consequence',
    paragraphs: ['A harbor activity reaches its beat.'],
  };
  const premise = {
    title: 'Harbor activity consequence',
    premise: 'A quay runner finishes an activity beat.',
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
  const [passage] = await database.db
    .select({ id: storyPassage.id })
    .from(storyPassage)
    .where(
      and(
        eq(storyPassage.storyId, storyId),
        eq(storyPassage.sequence, before.revision),
      ),
    );
  assert.ok(passage);

  const operationId = randomUUID();
  await database.db.insert(campaignConsequence).values({
    operationId,
    storyId,
    passageId: passage.id,
    baseRevision: before.revision,
    receipt: {
      kind: 'activity',
      passageId: passage.id,
      operationId,
      afterSegment: 0,
      throughSegment: 1,
      label: 'Finish the harbor watch',
      intention: 'Narrate the activity beat without re-rolling.',
    },
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

  return { ownerId, storyId, operationId, stories, passageId: passage.id };
}

async function seedWorldObligationConsequenceStory(database, storage) {
  const ownerId = `eng03t04wo-${randomUUID()}`;
  const storyId = randomUUID();
  const passageId = randomUUID();
  await insertUser(database, ownerId);
  const content = {
    version: 1,
    title: 'Harbor world obligation',
    paragraphs: ['A world obligation reaches its beat.'],
  };
  const premise = {
    title: 'Harbor world obligation',
    premise: 'A quay bell tolls as a world condition shifts.',
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
  const [passage] = await database.db
    .select({ id: storyPassage.id })
    .from(storyPassage)
    .where(
      and(
        eq(storyPassage.storyId, storyId),
        eq(storyPassage.sequence, before.revision),
      ),
    );
  assert.ok(passage);

  const obligationId = randomUUID();
  const label = 'The watch bell tolls';
  const intention =
    'Narrate the controlling world obligation without re-rolling.';
  await database.db.insert(campaignConsequence).values({
    operationId: obligationId,
    storyId,
    passageId: passage.id,
    baseRevision: before.revision,
    receipt: {
      kind: 'world-obligation',
      passageId: passage.id,
      operationId: obligationId,
      obligationIds: [obligationId],
      label,
      intention,
    },
  });
  await database.db
    .update(campaign)
    .set({
      holds: [
        {
          kind: 'world-obligation',
          obligationId,
          reason: 'controlling-event',
        },
      ],
    })
    .where(eq(campaign.storyId, storyId));

  return {
    ownerId,
    storyId,
    operationId: obligationId,
    stories,
    passageId: passage.id,
  };
}

test('ENG03-T04: activity campaign intent captures off-lock and promotes same G', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03t04-'));
    const storage = new LocalDocumentStore(root);
    const seeded = await seedActivityConsequenceStory(database, storage);

    await seeded.stories.prepareCampaignConsequence(seeded.operationId);

    const [intentAfterStage1] = await database.db
      .select()
      .from(campaignConsequence)
      .where(eq(campaignConsequence.operationId, seeded.operationId));
    assert.ok(intentAfterStage1.generationId);
    const generationId = intentAfterStage1.generationId;

    const [captureRow] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, generationId));
    assert.ok(captureRow);
    const capture = activityConsequenceContextCaptureV1Schema.parse(
      captureRow.capture,
    );
    assert.equal(capture.sourceKind, 'campaign-activity');
    assert.equal(parseContextCapture(captureRow.capture).purpose, 'consequence');

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

    const [ready] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, generationId));
    assert.equal(ready.state, 'ready');

    const generations = await database.db
      .select({ id: generation.id })
      .from(generation)
      .where(eq(generation.ownerId, seeded.ownerId));
    assert.equal(generations.length, 1);

    await seeded.stories.prepareCampaignConsequence(seeded.operationId);
    const afterDup = await database.db
      .select({ id: generation.id })
      .from(generation)
      .where(eq(generation.ownerId, seeded.ownerId));
    assert.equal(afterDup.length, 1);

    const resolutions = await database.db
      .select()
      .from(storyResolution)
      .where(eq(storyResolution.storyId, seeded.storyId));
    assert.equal(resolutions.length, 1);
    assert.equal(resolutions[0].generationId, generationId);
  });
});

test('ENG03-T04: activity publication passes matching capture fence', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03t04-pub-'));
    const storage = new LocalDocumentStore(root);
    const seeded = await seedActivityConsequenceStory(database, storage);

    await seeded.stories.prepareCampaignConsequence(seeded.operationId);
    await seeded.stories.prepareCampaignConsequence(seeded.operationId);

    const [intent] = await database.db
      .select()
      .from(campaignConsequence)
      .where(eq(campaignConsequence.operationId, seeded.operationId));
    const generationId = intent.generationId;
    assert.ok(generationId);

    const storyteller = createStorytellerRuntime(database, {
      documentStore: storage,
    });
    await storyteller.complete(generationId);

    const [publication] = await database.db
      .select()
      .from(storytellerPublication)
      .where(eq(storytellerPublication.generationId, generationId));
    assert.equal(publication.state, 'published');

    const generations = await database.db
      .select({ id: generation.id })
      .from(generation)
      .where(eq(generation.ownerId, seeded.ownerId));
    assert.equal(generations.length, 1);
  });
});

test('ENG03-T04: activity publication stale when receipt drifts after promote', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03t04-pub-stale-'));
    const storage = new LocalDocumentStore(root);
    const seeded = await seedActivityConsequenceStory(database, storage);

    await seeded.stories.prepareCampaignConsequence(seeded.operationId);
    await seeded.stories.prepareCampaignConsequence(seeded.operationId);

    const [intent] = await database.db
      .select()
      .from(campaignConsequence)
      .where(eq(campaignConsequence.operationId, seeded.operationId));
    const generationId = intent.generationId;
    assert.ok(generationId);

    await database.db
      .update(campaignConsequence)
      .set({
        receipt: {
          ...intent.receipt,
          label: 'Drifted after promote',
        },
      })
      .where(eq(campaignConsequence.operationId, seeded.operationId));

    const storyteller = createStorytellerRuntime(database, {
      documentStore: storage,
    });
    await storyteller.complete(generationId);

    const [publication] = await database.db
      .select()
      .from(storytellerPublication)
      .where(eq(storytellerPublication.generationId, generationId));
    assert.equal(publication.state, 'stale');

    const generations = await database.db
      .select({ id: generation.id })
      .from(generation)
      .where(eq(generation.ownerId, seeded.ownerId));
    assert.equal(generations.length, 1);
  });
});

test('ENG03-T04: wrong activity receipt after Stage1 holds promotion', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03t04-neg-'));
    const storage = new LocalDocumentStore(root);
    const seeded = await seedActivityConsequenceStory(database, storage);

    await seeded.stories.prepareCampaignConsequence(seeded.operationId);
    const [intent] = await database.db
      .select()
      .from(campaignConsequence)
      .where(eq(campaignConsequence.operationId, seeded.operationId));
    assert.ok(intent.generationId);

    await database.db
      .update(campaignConsequence)
      .set({
        receipt: {
          ...intent.receipt,
          label: 'Mutated label refuses promotion',
        },
      })
      .where(eq(campaignConsequence.operationId, seeded.operationId));

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await seeded.stories.prepareCampaignConsequence(seeded.operationId);
    }

    const [captureRow] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, intent.generationId));
    assert.equal(captureRow.state, 'held');
    assert.equal(captureRow.failureCode, 'consequence_mismatch');

    const [gen] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, intent.generationId));
    assert.equal(gen.kind, storytellerContextCaptureKind);
  });
});

test('ENG03-T04: world-obligation campaign intent captures off-lock and promotes same G', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03t04-wo-'));
    const storage = new LocalDocumentStore(root);
    const seeded = await seedWorldObligationConsequenceStory(database, storage);

    await seeded.stories.prepareCampaignConsequence(seeded.operationId);

    const [intentAfterStage1] = await database.db
      .select()
      .from(campaignConsequence)
      .where(eq(campaignConsequence.operationId, seeded.operationId));
    assert.ok(intentAfterStage1.generationId);
    const generationId = intentAfterStage1.generationId;

    const [captureRow] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, generationId));
    assert.ok(captureRow);
    const capture = worldObligationConsequenceContextCaptureV1Schema.parse(
      captureRow.capture,
    );
    assert.equal(capture.sourceKind, 'campaign-world-obligation');
    assert.equal(parseContextCapture(captureRow.capture).purpose, 'consequence');

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

    const [ready] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, generationId));
    assert.equal(ready.state, 'ready');

    const generations = await database.db
      .select({ id: generation.id })
      .from(generation)
      .where(eq(generation.ownerId, seeded.ownerId));
    assert.equal(generations.length, 1);

    const [intentRow] = await database.db
      .select()
      .from(campaignConsequence)
      .where(eq(campaignConsequence.operationId, seeded.operationId));
    assert.ok(intentRow);
    assert.equal(intentRow.generationId, generationId);
  });
});

test('ENG03-T04: wrong world-obligation receipt after Stage1 holds promotion', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03t04-wo-neg-'));
    const storage = new LocalDocumentStore(root);
    const seeded = await seedWorldObligationConsequenceStory(database, storage);

    await seeded.stories.prepareCampaignConsequence(seeded.operationId);
    const [intent] = await database.db
      .select()
      .from(campaignConsequence)
      .where(eq(campaignConsequence.operationId, seeded.operationId));
    assert.ok(intent.generationId);

    await database.db
      .update(campaignConsequence)
      .set({
        receipt: {
          ...intent.receipt,
          label: 'Mutated world-obligation label refuses promotion',
        },
      })
      .where(eq(campaignConsequence.operationId, seeded.operationId));

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await seeded.stories.prepareCampaignConsequence(seeded.operationId);
    }

    const [captureRow] = await database.db
      .select()
      .from(storytellerContextCapture)
      .where(eq(storytellerContextCapture.captureId, intent.generationId));
    assert.equal(captureRow.state, 'held');
    assert.equal(captureRow.failureCode, 'consequence_mismatch');

    const [gen] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, intent.generationId));
    assert.equal(gen.kind, storytellerContextCaptureKind);

    const [consequenceRow] = await database.db
      .select()
      .from(campaignConsequence)
      .where(eq(campaignConsequence.operationId, seeded.operationId));
    assert.ok(consequenceRow);
    assert.equal(consequenceRow.operationId, seeded.operationId);
    assert.equal(consequenceRow.generationId, intent.generationId);
  });
});