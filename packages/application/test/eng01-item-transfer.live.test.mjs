import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { storyItem } from '@offscreen/db/story-schema';
import { gameActionReceipt } from '@offscreen/db/campaign-schema';
import { createStories } from '../dist/stories/index.js';
import { initializeStoryInTransaction } from '../dist/stories/initialization.js';
import { initializeCampaign } from '../dist/campaign/settings.js';
import { StoryError } from '../dist/stories/errors.js';
import {
  abstractSignalItems,
  abstractSignalTransferPlan,
  harborCompassItems,
  harborCompassTransferPlan,
} from '../dist/campaign/fixtures/item-transfer-plans.js';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
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

async function withDisposableCampaign(run) {
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
  const client = database.db.$client;
  await client.query(
    `insert into "user" (id, name, email, email_verified, created_at, updated_at)
     values ($1, $2, $3, true, now(), now())`,
    [ownerId, 'ENG01 Proof', `${ownerId}@example.test`],
  );
}

async function seedStory(database, args) {
  const ownerId = `eng01-${randomUUID()}`;
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
        character: args.character,
        storyFacts: [],
        plans: [args.plan],
        activityAccess: { kind: 'none' },
      },
    );
  });
  return { ownerId, storyId };
}

test('ENG01 live: automatic transfer settles once under SQL and retries safely', async () => {
  await withDisposableCampaign(async (database) => {
    const stories = createStories(database);
    const { ownerId, storyId } = await seedStory(database, {
      title: 'Signal pass',
      paragraph: 'A unique signal token waits to move.',
      items: abstractSignalItems,
      character: quayCharacter(),
      plan: abstractSignalTransferPlan,
    });
    const before = await stories.read({ ownerId, storyId });
    const offer = before.campaign?.offer;
    assert.ok(offer);
    const operationId = randomUUID();
    const body = {
      expectedRevision: before.revision,
      offerId: offer.id,
      path: ['pass-signal'],
    };
    await stories.campaignAction({ ownerId, storyId, operationId, body });
    const admitted = await stories.read({ ownerId, storyId });
    assert.equal(admitted.campaign?.actionExecution?.operationId, operationId);
    assert.equal(
      admitted.items.find((item) => item.key === 'signal-token')?.holderKey,
      'process-source',
    );

    assert.equal(await stories.advanceCampaignAction(operationId), null);
    const settled = await stories.read({ ownerId, storyId });
    assert.equal(settled.campaign?.actionExecution, null);
    assert.equal(
      settled.items.find((item) => item.key === 'signal-token')?.holderKey,
      'process-sink',
    );
    assert.equal(settled.campaign?.actionReceipts[0]?.id, operationId);
    assert.deepEqual(settled.campaign?.actionReceipts[0]?.worldEffects, [
      {
        kind: 'item.transfer.v1',
        itemKey: 'signal-token',
        fromHolder: 'process-source',
        toHolder: 'process-sink',
      },
    ]);

    const [receipt] = await database.db
      .select({
        outcome: gameActionReceipt.outcome,
        effects: gameActionReceipt.effects,
      })
      .from(gameActionReceipt)
      .where(eq(gameActionReceipt.operationId, operationId));
    assert.equal(receipt?.outcome, 'automatic');

    await stories.campaignAction({ ownerId, storyId, operationId, body });
    const again = await stories.read({ ownerId, storyId });
    assert.equal(
      again.items.find((item) => item.key === 'signal-token')?.holderKey,
      'process-sink',
    );
    assert.equal(again.campaign?.actionReceipts.length, 1);
  });
});

test('ENG01 live: failed check and wrong holder never transfer', async () => {
  await withDisposableCampaign(async (database) => {
    const stories = createStories(database);
    const impossible = {
      ...harborCompassTransferPlan,
      resolution: {
        ...harborCompassTransferPlan.resolution,
        check: {
          ...harborCompassTransferPlan.resolution.check,
          dc: 30,
        },
      },
    };
    const { ownerId, storyId } = await seedStory(database, {
      title: 'Harbor hand-over',
      paragraph: 'Mara waits for the brass compass.',
      items: harborCompassItems,
      character: quayCharacter(),
      plan: impossible,
    });
    const before = await stories.read({ ownerId, storyId });
    const offer = before.campaign?.offer;
    assert.ok(offer);
    const failOperation = randomUUID();
    await stories.campaignAction({
      ownerId,
      storyId,
      operationId: failOperation,
      body: {
        expectedRevision: before.revision,
        offerId: offer.id,
        path: ['give-compass'],
      },
    });
    assert.equal(await stories.advanceCampaignAction(failOperation), null);
    const failed = await stories.read({ ownerId, storyId });
    assert.equal(failed.campaign?.actionReceipts[0]?.outcome, 'failure');
    assert.deepEqual(failed.campaign?.actionReceipts[0]?.worldEffects, []);
    assert.equal(
      failed.items.find((item) => item.key === 'brass-compass')?.holderKey,
      'player',
    );

    const wrong = await seedStory(database, {
      title: 'Harbor hand-over again',
      paragraph: 'The compass is already gone.',
      items: [
        { key: 'brass-compass', label: 'Brass compass', holderKey: 'mara' },
      ],
      character: quayCharacter(),
      plan: harborCompassTransferPlan,
    });
    const wrongBefore = await stories.read({
      ownerId: wrong.ownerId,
      storyId: wrong.storyId,
    });
    await assert.rejects(
      () =>
        stories.campaignAction({
          ownerId: wrong.ownerId,
          storyId: wrong.storyId,
          operationId: randomUUID(),
          body: {
            expectedRevision: wrongBefore.revision,
            offerId: wrongBefore.campaign.offer.id,
            path: ['give-compass'],
          },
        }),
      (error) => error instanceof StoryError && error.code === 'conflict',
    );

    const mid = await seedStory(database, {
      title: 'Harbor mid-flight',
      paragraph: 'Someone else takes the compass during the wait.',
      items: harborCompassItems,
      character: quayCharacter(),
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
    await database.db
      .update(storyItem)
      .set({ holderKey: 'thief' })
      .where(eq(storyItem.storyId, mid.storyId));
    assert.equal(await stories.advanceCampaignAction(midOperation), null);
    const interrupted = await stories.read({
      ownerId: mid.ownerId,
      storyId: mid.storyId,
    });
    assert.equal(interrupted.campaign?.actionExecution, null);
    assert.equal(interrupted.campaign?.actionReceipts.length, 0);
    assert.equal(
      interrupted.items.find((item) => item.key === 'brass-compass')?.holderKey,
      'thief',
    );
  });
});
