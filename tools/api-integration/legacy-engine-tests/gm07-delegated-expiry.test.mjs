import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import {
  campaign,
  campaignDelegatedOffer,
  gameActionExecution,
  gameActionExecutionEvent,
} from '@offscreen/db/campaign-schema';
import { story } from '@offscreen/db/story-schema';
import {
  declineHarmlessInvitationWithdrawalPlan,
  harmlessSocialInvitationPlan,
} from '../../../packages/story-engine/dist/campaign/fixtures/harmless-invitation-offer.js';
import { captureDelegatedOfferOnPublication } from '../../../packages/story-engine/dist/campaign/delegated-offer.js';
import { advanceDelegatedWithdrawal } from '../../../packages/story-engine/dist/campaign/delegated-expiry.js';
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

const fixturePlans = [
  harmlessSocialInvitationPlan,
  declineHarmlessInvitationWithdrawalPlan,
];

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
          title: 'Delegated expiry',
          premise: 'A quiet quay invitation waits.',
          storytellingDirection: 'Keep the harbor calm.',
        },
        storyteller: profile,
        execution: offlineExecution,
        usagePolicy: null,
        items: [],
        content: {
          version: 1,
          title: 'Delegated expiry',
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

async function publishFixtureCapture(database, ownerId, storyId, revision = 1) {
  const offerId = randomUUID();
  let wakeOperationId = null;
  await database.db.transaction(async (tx) => {
    const current = await lockStoryById(tx, storyId);
    await ensureCampaign(tx, current);
    const clockMs = await readDatabaseClockMs(tx, storyId);
    const narrativeRevision = revision ?? current.revision;
    await saveOfferPlans(tx, storyId, narrativeRevision, offerId, fixturePlans);
    await tx
      .update(campaign)
      .set({
        offer: fixtureOffer(offerId, fixturePlans),
        situationAuthorization: {
          version: 2,
          offerId,
          activityAccess: {
            kind: 'selected',
            actionKeys: fixturePlans.map((plan) => plan.key),
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
      plans: fixturePlans,
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

async function countExecutions(database, storyId) {
  const [executions, started] = await Promise.all([
    database.db
      .select()
      .from(gameActionExecution)
      .where(eq(gameActionExecution.storyId, storyId)),
    database.db
      .select()
      .from(gameActionExecutionEvent)
      .where(eq(gameActionExecutionEvent.storyId, storyId)),
  ]);
  return {
    executions: executions.length,
    started: started.filter((row) => row.kind === 'started').length,
  };
}

test('due wakeOperationId admits one execution', async () => {
  await withDisposable(async (database) => {
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

    const first = await advanceDelegatedWithdrawal(database, wakeOperationId);
    assert.equal(first, null);
    const counts = await countExecutions(database, storyId);
    assert.equal(counts.executions, 1);
    assert.equal(counts.started, 1);

    const second = await advanceDelegatedWithdrawal(database, wakeOperationId);
    assert.equal(second, null);
    const retryCounts = await countExecutions(database, storyId);
    assert.equal(retryCounts.executions, 1);
  });
});

test('early wake returns remaining and refuses admission', async () => {
  await withDisposable(async (database) => {
    const { ownerId, storyId } = await seedStory(database);
    await enableDelegationPolicy(database, ownerId, storyId);
    const { wakeOperationId } = await publishFixtureCapture(
      database,
      ownerId,
      storyId,
    );

    const remaining = await advanceDelegatedWithdrawal(database, wakeOperationId);
    assert.ok(remaining > 0);
    const counts = await countExecutions(database, storyId);
    assert.equal(counts.executions, 0);
  });
});

test('stale wake after pause and resume returns null', async () => {
  await withDisposable(async (database) => {
    const stories = createStories(database);
    const { ownerId, storyId } = await seedStory(database);
    await enableDelegationPolicy(database, ownerId, storyId);
    const { offerId, wakeOperationId: staleWake } = await publishFixtureCapture(
      database,
      ownerId,
      storyId,
    );

    await stories.delegatedOfferControl.control({
      ownerId,
      storyId,
      operationId: randomUUID(),
      body: { intent: 'pause', offerId },
    });
    await stories.delegatedOfferControl.control({
      ownerId,
      storyId,
      operationId: randomUUID(),
      body: { intent: 'resume', offerId },
    });

    await database.db.$client.query(
      `update campaign_delegated_offer set due_at = now() - interval '1 second' where offer_id = $1`,
      [offerId],
    );

    const stale = await advanceDelegatedWithdrawal(database, staleWake);
    assert.equal(stale, null);
    const counts = await countExecutions(database, storyId);
    assert.equal(counts.executions, 0);
  });
});

test('unknown wakeOperationId returns null', async () => {
  await withDisposable(async (database) => {
    const result = await advanceDelegatedWithdrawal(database, randomUUID());
    assert.equal(result, null);
  });
});