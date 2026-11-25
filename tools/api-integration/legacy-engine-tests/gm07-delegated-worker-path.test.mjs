import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import {
  campaign,
  campaignDelegatedOffer,
  gameActionExecution,
  gameActionReceipt,
  storyPublicEvent,
} from '@offscreen/story-persistence/campaign';
import { story } from '@offscreen/story-persistence/stories';
import {
  declineHarmlessInvitationWithdrawalPlan,
  harmlessSocialInvitationPlan,
} from '../../../packages/story-engine/dist/campaign/fixtures/harmless-invitation-offer.js';
import { captureDelegatedOfferOnPublication } from '../../../packages/story-engine/dist/campaign/delegated-offer.js';
import { PREAPPROVED_WITHDRAWAL_WINDOW_MS } from '../../../packages/story-engine/dist/campaign/delegated-decision.js';
import { saveOfferPlans } from '../../../packages/story-engine/dist/campaign/persistence.js';
import { ensureCampaign, initializeCampaign } from '../../../packages/story-engine/dist/campaign/settings.js';
import { createStories } from '../../../packages/story-engine/dist/stories/index.js';
import { initializeStoryInTransaction } from '../../../packages/story-engine/dist/stories/initialization.js';
import {
  lockStoryById,
  readDatabaseClockMs,
} from '../../../packages/story-engine/dist/stories/persistence.js';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { offlineExecution } from '@offscreen/storyteller/tasks';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../../../packages/lab-support/dist/index.js';

const profile = storytellerCatalogue.resolve({
  id: 'absurd-action-comedy',
  revision: 1,
});

const fixturePlans = [
  harmlessSocialInvitationPlan,
  declineHarmlessInvitationWithdrawalPlan,
];

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
    [ownerId, 'GM07', `${ownerId}@example.test`],
  );
}

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

async function seedStory(database, ownerId = `gm07-${randomUUID()}`) {
  const storyId = randomUUID();
  await insertUser(database, ownerId);
  await database.db.transaction(async (tx) => {
    await initializeStoryInTransaction(tx, {
      ownerId,
      storyId,
      input: {
        source: 'playable.opening.v1',
        premise: {
          title: 'Delegated worker path',
          premise: 'A quiet quay invitation waits.',
          storytellingDirection: 'Keep the harbor calm.',
        },
        storyteller: profile,
        execution: offlineExecution,
        usagePolicy: null,
        items: [],
        content: {
          version: 1,
          title: 'Delegated worker path',
          paragraphs: ['A quiet quay invitation waits.'],
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
        plans: fixturePlans,
        activityAccess: { kind: 'none' },
      },
    );
  });
  return { ownerId, storyId };
}

function fixtureOffer(offerId, plans) {
  return {
    id: offerId,
    nodes: plans.map((plan) => ({
      id: plan.key,
      parent: null,
      label: plan.label,
      description: plan.intention,
      action: {
        kind: 'attempt',
        timing: {
          kind: 'finite',
          fictionalSeconds: plan.resolution.fictionalDurationSeconds,
        },
      },
    })),
  };
}

async function publishFixtureCapture(
  database,
  ownerId,
  storyId,
  plans = fixturePlans,
  revision = 1,
) {
  const offerId = randomUUID();
  let wakeOperationId = null;
  await database.db.transaction(async (tx) => {
    const current = await lockStoryById(tx, storyId);
    await ensureCampaign(tx, current);
    const clockMs = await readDatabaseClockMs(tx, storyId);
    const narrativeRevision = revision ?? current.revision;
    await saveOfferPlans(tx, storyId, narrativeRevision, offerId, plans);
    await tx
      .update(campaign)
      .set({
        offer: fixtureOffer(offerId, plans),
        situationAuthorization: {
          version: 2,
          offerId,
          activityAccess: {
            kind: 'selected',
            actionKeys: plans.map((plan) => plan.key),
          },
          preparedPlans: [],
        },
        holds: [
          {
            kind: 'decision',
            offerId,
            reason: 'player-choice',
          },
        ],
      })
      .where(eq(campaign.storyId, storyId));
    await captureDelegatedOfferOnPublication(tx, {
      storyId,
      ownerId,
      narrativeRevision,
      offerId,
      plans,
      clockMs,
    });
    const [capture] = await tx
      .select({ wakeOperationId: campaignDelegatedOffer.wakeOperationId })
      .from(campaignDelegatedOffer)
      .where(eq(campaignDelegatedOffer.offerId, offerId));
    wakeOperationId = capture.wakeOperationId;
  });
  return { offerId, wakeOperationId };
}

async function enableDelegationPolicy(database, ownerId, storyId) {
  const stories = createStories(database);
  await stories.delegationPolicy.update({
    ownerId,
    storyId,
    operationId: randomUUID(),
    body: { intent: 'enable' },
  });
}

async function readWakeOperationId(database, offerId) {
  const [capture] = await database.db
    .select({ wakeOperationId: campaignDelegatedOffer.wakeOperationId })
    .from(campaignDelegatedOffer)
    .where(eq(campaignDelegatedOffer.offerId, offerId));
  return capture.wakeOperationId;
}

async function countStorytellerOutbox(database) {
  const result = await database.db.$client.query(
    `select count(*)::int as count from outbox where topic like '%storyteller%'`,
  );
  return result.rows[0].count;
}

async function readCampaignGameSecond(database, storyId) {
  const [row] = await database.db
    .select({ gameSecond: campaign.gameSecond })
    .from(campaign)
    .where(eq(campaign.storyId, storyId));
  return row.gameSecond;
}

async function advanceExecutionUntilDone(stories, operationId) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const remaining = await stories.advanceCampaignAction(operationId);
    if (remaining === null) {
      return { attempts: attempt + 1, lastRemaining: null };
    }
    if (remaining < 15_000) {
      await new Promise((resolve) => setTimeout(resolve, remaining + 50));
      const afterSleep = await stories.advanceCampaignAction(operationId);
      return {
        attempts: attempt + 2,
        lastRemaining: afterSleep,
      };
    }
  }
  return { attempts: 5, lastRemaining: 'exhausted' };
}

test('case 1: due withdrawal via stories facade then action advance', async () => {
  await withDisposable(async (database) => {
    const stories = createStories(database);
    const { ownerId, storyId } = await seedStory(database);
    await enableDelegationPolicy(database, ownerId, storyId);
    const { offerId, wakeOperationId } = await publishFixtureCapture(
      database,
      ownerId,
      storyId,
    );
    const gameSecondBefore = await readCampaignGameSecond(database, storyId);

    await database.db.$client.query(
      `update campaign_delegated_offer set due_at = now() - interval '1 second' where offer_id = $1`,
      [offerId],
    );

    const withdraw = await stories.advanceDelegatedWithdrawal(wakeOperationId);
    assert.equal(withdraw, null);

    const executions = await database.db
      .select()
      .from(gameActionExecution)
      .where(eq(gameActionExecution.storyId, storyId));
    assert.equal(executions.length, 1);

    const [capture] = await database.db
      .select()
      .from(campaignDelegatedOffer)
      .where(eq(campaignDelegatedOffer.offerId, offerId));
    assert.equal(capture.status, 'admitted');
    assert.ok(capture.actionOperationId);

    await advanceExecutionUntilDone(stories, capture.actionOperationId);

    const [executionAfter] = await database.db
      .select()
      .from(gameActionExecution)
      .where(eq(gameActionExecution.storyId, storyId));
    const receipts = await database.db
      .select()
      .from(gameActionReceipt)
      .where(eq(gameActionReceipt.storyId, storyId));
    const publicEvents = await database.db
      .select({ kind: storyPublicEvent.kind })
      .from(storyPublicEvent)
      .where(eq(storyPublicEvent.storyId, storyId));
    const gameSecondAfter = await readCampaignGameSecond(database, storyId);
    const storytellerOutbox = await countStorytellerOutbox(database);
    assert.equal(storytellerOutbox, 0);

    assert.equal(executionAfter.state, 'settled');
    assert.equal(receipts.length, 1);
    assert.deepEqual(
      publicEvents.map((row) => row.kind),
      ['action-settled'],
    );
    assert.equal(gameSecondAfter - gameSecondBefore, 5);
    assert.equal(storytellerOutbox, 0);
  });
});

test('case 2: player choice before withdrawal leaves one receipt', async () => {
  await withDisposable(async (database) => {
    const stories = createStories(database);
    const { ownerId, storyId } = await seedStory(database);
    await enableDelegationPolicy(database, ownerId, storyId);
    const [storyRow] = await database.db
      .select({ revision: story.revision })
      .from(story)
      .where(eq(story.id, storyId));
    const { offerId, wakeOperationId } = await publishFixtureCapture(
      database,
      ownerId,
      storyId,
      fixturePlans,
      storyRow.revision,
    );

    await stories.campaignAction({
      ownerId,
      storyId,
      operationId: randomUUID(),
      body: {
        expectedRevision: storyRow.revision,
        offerId,
        path: ['accept-quay-invitation'],
      },
    });

    const receiptsBefore = await database.db
      .select()
      .from(gameActionReceipt)
      .where(eq(gameActionReceipt.storyId, storyId));

    await database.db.$client.query(
      `update campaign_delegated_offer set due_at = now() - interval '1 second' where offer_id = $1`,
      [offerId],
    );

    const late = await stories.advanceDelegatedWithdrawal(wakeOperationId);
    assert.equal(late, null);

    const executions = await database.db
      .select()
      .from(gameActionExecution)
      .where(eq(gameActionExecution.storyId, storyId));
    assert.equal(executions.length, 1);

    const [capture] = await database.db
      .select()
      .from(campaignDelegatedOffer)
      .where(eq(campaignDelegatedOffer.offerId, offerId));
    assert.equal(capture.status, 'consumed');
    assert.equal(capture.selectionSource, 'player');

    const receiptsAfter = await database.db
      .select()
      .from(gameActionReceipt)
      .where(eq(gameActionReceipt.storyId, storyId));
    assert.equal(receiptsAfter.length, receiptsBefore.length);
    assert.equal(await countStorytellerOutbox(database), 0);
  });
});

test('case 3: pause resume preserves remaining without admission', async () => {
  await withDisposable(async (database) => {
    const stories = createStories(database);
    const { ownerId, storyId } = await seedStory(database);
    await enableDelegationPolicy(database, ownerId, storyId);
    const { offerId } = await publishFixtureCapture(database, ownerId, storyId);

    await database.db.$client.query(
      `update campaign_delegated_offer set due_at = now() + interval '5 minutes' where offer_id = $1`,
      [offerId],
    );

    const paused = await stories.delegatedOfferControl.control({
      ownerId,
      storyId,
      operationId: randomUUID(),
      body: { intent: 'pause', offerId },
    });
    assert.equal(paused.status, 'paused');
    const recordedRemainingMs = paused.remainingMs;
    assert.ok(recordedRemainingMs > 0);

    const resumed = await stories.delegatedOfferControl.control({
      ownerId,
      storyId,
      operationId: randomUUID(),
      body: { intent: 'resume', offerId },
    });
    assert.equal(resumed.status, 'armed');

    const clockMs = await database.db.transaction((tx) =>
      readDatabaseClockMs(tx, storyId),
    );
    const dueDeltaMs = resumed.dueAt.getTime() - clockMs;
    assert.ok(dueDeltaMs >= recordedRemainingMs - 2000);
    assert.ok(dueDeltaMs <= recordedRemainingMs + 2000);
    assert.ok(
      Math.abs(dueDeltaMs - PREAPPROVED_WITHDRAWAL_WINDOW_MS) > 120_000,
      'dueAt must track paused remaining, not the full publication window',
    );

    const wakeOperationId = await readWakeOperationId(database, offerId);
    const tick = await stories.advanceDelegatedWithdrawal(wakeOperationId);
    assert.ok(tick > 0);

    const executions = await database.db
      .select()
      .from(gameActionExecution)
      .where(eq(gameActionExecution.storyId, storyId));
    assert.equal(executions.length, 0);
    assert.equal(await countStorytellerOutbox(database), 0);
  });
});

test('case 4: revoke refuses due withdrawal admission', async () => {
  await withDisposable(async (database) => {
    const stories = createStories(database);
    const { ownerId, storyId } = await seedStory(database);
    await enableDelegationPolicy(database, ownerId, storyId);
    const { offerId } = await publishFixtureCapture(database, ownerId, storyId);

    await stories.delegatedOfferControl.control({
      ownerId,
      storyId,
      operationId: randomUUID(),
      body: { intent: 'revoke', offerId },
    });

    await database.db.$client.query(
      `update campaign_delegated_offer set due_at = now() - interval '1 second' where offer_id = $1`,
      [offerId],
    );

    const wakeOperationId = await readWakeOperationId(database, offerId);
    const result = await stories.advanceDelegatedWithdrawal(wakeOperationId);
    assert.equal(result, null);

    const executions = await database.db
      .select()
      .from(gameActionExecution)
      .where(eq(gameActionExecution.storyId, storyId));
    assert.equal(executions.length, 0);
    assert.equal(await countStorytellerOutbox(database), 0);
  });
});

test('case 5: duplicate withdrawal tick stays idempotent', async () => {
  await withDisposable(async (database) => {
    const stories = createStories(database);
    const { ownerId, storyId } = await seedStory(database);
    await enableDelegationPolicy(database, ownerId, storyId);
    const { offerId, wakeOperationId } = await publishFixtureCapture(
      database,
      ownerId,
      storyId,
    );

    await database.db.$client.query(
      `update campaign_delegated_offer set due_at = now() - interval '1 second' where offer_id = $1`,
      [offerId],
    );

    const first = await stories.advanceDelegatedWithdrawal(wakeOperationId);
    assert.equal(first, null);

    const [capture] = await database.db
      .select()
      .from(campaignDelegatedOffer)
      .where(eq(campaignDelegatedOffer.offerId, offerId));
    assert.equal(capture.status, 'admitted');

    const second = await stories.advanceDelegatedWithdrawal(wakeOperationId);
    assert.equal(second, null);

    const executions = await database.db
      .select()
      .from(gameActionExecution)
      .where(eq(gameActionExecution.storyId, storyId));
    assert.equal(executions.length, 1);
    assert.equal(await countStorytellerOutbox(database), 0);
  });
});