import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import {
  abstractSignalItems,
  abstractSignalTransferPlan,
} from '../../../packages/story-engine/dist/campaign/fixtures/item-transfer-plans.js';
import { createStories } from '../../../packages/story-engine/dist/stories/index.js';
import { initializeStoryInTransaction } from '../../../packages/story-engine/dist/stories/initialization.js';
import { initializeCampaign } from '../../../packages/story-engine/dist/campaign/settings.js';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../../../packages/lab-support/dist/index.js';
import { appendPublicStoryEvent } from '../../../packages/story-engine/dist/stories/public-events.js';
import { StoryError } from '../../../packages/story-engine/dist/stories/errors.js';
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
    [ownerId, 'GM06', `${ownerId}@example.test`],
  );
}

async function seedStory(database) {
  const ownerId = `gm06-${randomUUID()}`;
  const storyId = randomUUID();
  await insertUser(database, ownerId);
  await database.db.transaction(async (tx) => {
    await initializeStoryInTransaction(tx, {
      ownerId,
      storyId,
      input: {
        source: 'playable.opening.v1',
        premise: null,
        storyteller: profile,
        execution: null,
        usagePolicy: null,
        items: abstractSignalItems,
        content: {
          version: 1,
          title: 'Signal visit',
          paragraphs: ['A unique signal token waits to move.'],
        },
        interaction: null,
      },
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
        plans: [abstractSignalTransferPlan],
        activityAccess: { kind: 'none' },
      },
    );
  });
  return { ownerId, storyId, stories: createStories(database) };
}

test('GM06: first visit has no previous; ACK stores frontier; later visit windows new events', async () => {
  await withDisposable(async (database) => {
    const { ownerId, storyId, stories } = await seedStory(database);
    const before = await stories.read({ ownerId, storyId });
    const operationId = randomUUID();
    await stories.campaignAction({
      ownerId,
      storyId,
      operationId,
      body: {
        expectedRevision: before.revision,
        offerId: before.campaign.offer.id,
        path: ['pass-signal'],
      },
    });
    assert.equal(await stories.advanceCampaignAction(operationId), null);

    const first = await stories.visit({ ownerId, storyId });
    assert.equal(first.previous, null);
    assert.ok(first.frontier >= 1);
    assert.equal(first.coverage, 'since-enabled');
    assert.ok(first.window.items.length >= 1);

    const ackId = randomUUID();
    const ack = await stories.acknowledgeVisit({
      ownerId,
      storyId,
      ackId,
      visitToken: first.visitToken,
      frontier: first.frontier,
    });
    assert.equal(ack.status, 'applied');
    assert.equal(ack.acknowledgedSequence, first.frontier);

    const replay = await stories.acknowledgeVisit({
      ownerId,
      storyId,
      ackId,
      visitToken: first.visitToken,
      frontier: first.frontier,
    });
    assert.equal(replay.status, 'already-current');

    await database.db.transaction(async (tx) => {
      await lockOwnedStory(tx, { ownerId, storyId });
      await appendPublicStoryEvent(tx, {
        storyId,
        kind: 'world-development',
        title: 'Later quay noise',
        summary: 'A later public development arrives while away.',
        sourceKind: 'world-obligation',
        sourceId: randomUUID(),
      });
    });

    const second = await stories.visit({ ownerId, storyId });
    assert.deepEqual(second.previous, { eventSequence: first.frontier });
    assert.ok(second.frontier > first.frontier);
    assert.ok(second.window.items.length >= 1);
    for (const item of second.window.items) {
      assert.ok(item.sequence > first.frontier);
      assert.ok(item.sequence <= second.frontier);
    }
  });
});

test('GM06: mismatched ACK frontier is denied', async () => {
  await withDisposable(async (database) => {
    const { ownerId, storyId, stories } = await seedStory(database);
    const before = await stories.read({ ownerId, storyId });
    const operationId = randomUUID();
    await stories.campaignAction({
      ownerId,
      storyId,
      operationId,
      body: {
        expectedRevision: before.revision,
        offerId: before.campaign.offer.id,
        path: ['pass-signal'],
      },
    });
    assert.equal(await stories.advanceCampaignAction(operationId), null);

    const open = await stories.visit({ ownerId, storyId });
    await assert.rejects(
      () =>
        stories.acknowledgeVisit({
          ownerId,
          storyId,
          ackId: randomUUID(),
          visitToken: open.visitToken,
          frontier: open.frontier + 1000,
        }),
      (error) =>
        error instanceof StoryError &&
        error.code === 'conflict' &&
        error.reason === 'visit_frontier_mismatch',
    );
  });
});
