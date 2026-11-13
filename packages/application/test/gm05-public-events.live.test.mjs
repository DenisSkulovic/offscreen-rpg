import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import {
  abstractSignalItems,
  abstractSignalTransferPlan,
  harborCompassItems,
  harborCompassTransferPlan,
} from '../dist/campaign/fixtures/item-transfer-plans.js';
import { createStories } from '../dist/stories/index.js';
import { initializeStoryInTransaction } from '../dist/stories/initialization.js';
import { initializeCampaign } from '../dist/campaign/settings.js';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../dist/developer-tools/index.js';

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
    [ownerId, 'GM05', `${ownerId}@example.test`],
  );
}

async function seedStory(database, args) {
  const ownerId = `gm05-${randomUUID()}`;
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
        items: args.items,
        content: {
          version: 1,
          title: args.title,
          paragraphs: [args.paragraph],
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
        plans: [args.plan],
        activityAccess: { kind: 'none' },
      },
    );
  });
  return { ownerId, storyId };
}

test('GM05 live: settled and interrupted actions append ordered public events once', async () => {
  await withDisposable(async (database) => {
    const stories = createStories(database);
    const settled = await seedStory(database, {
      title: 'Signal pass',
      paragraph: 'A unique signal token waits to move.',
      items: abstractSignalItems,
      plan: abstractSignalTransferPlan,
    });
    const before = await stories.read({
      ownerId: settled.ownerId,
      storyId: settled.storyId,
    });
    const operationId = randomUUID();
    await stories.campaignAction({
      ownerId: settled.ownerId,
      storyId: settled.storyId,
      operationId,
      body: {
        expectedRevision: before.revision,
        offerId: before.campaign.offer.id,
        path: ['pass-signal'],
      },
    });
    assert.equal(await stories.advanceCampaignAction(operationId), null);
    await stories.advanceCampaignAction(operationId);

    const page = await stories.events({
      ownerId: settled.ownerId,
      storyId: settled.storyId,
    });
    assert.equal(page.coverage, 'since-enabled');
    const settledEvents = page.items.filter(
      (item) => item.kind === 'action-settled',
    );
    assert.equal(settledEvents.length, 1);
    assert.equal(settledEvents[0].source.kind, 'action-execution');

    const mid = await seedStory(database, {
      title: 'Harbor mid-flight',
      paragraph: 'Someone else takes the compass during the wait.',
      items: harborCompassItems,
      plan: harborCompassTransferPlan,
    });
    const midBefore = await stories.read({
      ownerId: mid.ownerId,
      storyId: mid.storyId,
    });
    const midOperation = randomUUID();
    await stories.campaignAction({
      ownerId: mid.ownerId,
      storyId: mid.storyId,
      operationId: midOperation,
      body: {
        expectedRevision: midBefore.revision,
        offerId: midBefore.campaign.offer.id,
        path: ['give-compass'],
      },
    });
    const { storyItem } = await import('@offscreen/db/story-schema');
    const { eq } = await import('drizzle-orm');
    await database.db
      .update(storyItem)
      .set({ holderKey: 'thief' })
      .where(eq(storyItem.storyId, mid.storyId));
    assert.equal(await stories.advanceCampaignAction(midOperation), null);

    const interruptedPage = await stories.events({
      ownerId: mid.ownerId,
      storyId: mid.storyId,
    });
    const interrupted = interruptedPage.items.filter(
      (item) => item.kind === 'action-interrupted',
    );
    assert.equal(interrupted.length, 1);
    assert.match(interrupted[0].summary ?? '', /could not complete/);

    await assert.rejects(
      () =>
        stories.events({
          ownerId: settled.ownerId,
          storyId: mid.storyId,
        }),
      (error) => error?.code === 'not_found',
    );

    const tiny = await stories.events({
      ownerId: mid.ownerId,
      storyId: mid.storyId,
      limit: 1,
    });
    assert.equal(tiny.items.length, 1);
    if (tiny.nextBefore !== null) {
      const next = await stories.events({
        ownerId: mid.ownerId,
        storyId: mid.storyId,
        before: tiny.nextBefore,
        limit: 1,
      });
      assert.notEqual(next.items[0]?.id, tiny.items[0]?.id);
    }
  });
});
