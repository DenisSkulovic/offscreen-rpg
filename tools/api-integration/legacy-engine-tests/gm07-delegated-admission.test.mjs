import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import {
  campaign,
  campaignCommand,
  campaignDelegatedOffer,
  gameActionExecution,
  gameActionExecutionEvent,
  storyPublicEvent,
} from '@offscreen/db/campaign-schema';
import { story } from '@offscreen/db/story-schema';
import {
  declineHarmlessInvitationWithdrawalPlan,
  harmlessSocialInvitationPlan,
} from '../../../packages/story-engine/dist/campaign/fixtures/harmless-invitation-offer.js';
import {
  admitPreapprovedWithdrawal,
} from '../../../packages/story-engine/dist/campaign/actions.js';
import { captureDelegatedOfferOnPublication } from '../../../packages/story-engine/dist/campaign/delegated-offer.js';
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
          title: 'Delegated admission',
          premise: 'A quiet quay invitation waits.',
          storytellingDirection: 'Keep the harbor calm.',
        },
        storyteller: profile,
        execution: offlineExecution,
        usagePolicy: null,
        items: [],
        content: {
          version: 1,
          title: 'Delegated admission',
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

const fixturePlans = [
  harmlessSocialInvitationPlan,
  declineHarmlessInvitationWithdrawalPlan,
];

async function publishFixtureCapture(
  database,
  ownerId,
  storyId,
  plans,
  revision = 1,
) {
  const offerId = randomUUID();
  let clockMs = 0;
  const offer = fixtureOffer(offerId, plans);
  await database.db.transaction(async (tx) => {
    const story = await lockStoryById(tx, storyId);
    await ensureCampaign(tx, story);
    clockMs = await readDatabaseClockMs(tx, storyId);
    const narrativeRevision = revision ?? story.revision;
    await saveOfferPlans(tx, storyId, narrativeRevision, offerId, plans);
    await tx
      .update(campaign)
      .set({
        offer,
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
  });
  return { offerId, clockMs };
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

async function countRows(database, storyId) {
  const [executions, events, publicEvents] = await Promise.all([
    database.db
      .select()
      .from(gameActionExecution)
      .where(eq(gameActionExecution.storyId, storyId)),
    database.db
      .select()
      .from(gameActionExecutionEvent)
      .where(eq(gameActionExecutionEvent.storyId, storyId)),
    database.db
      .select()
      .from(storyPublicEvent)
      .where(
        and(
          eq(storyPublicEvent.storyId, storyId),
          eq(storyPublicEvent.kind, 'action-settled'),
        ),
      ),
  ]);
  return {
    executions: executions.length,
    started: events.filter((row) => row.kind === 'started').length,
    actionSettledPublic: publicEvents.length,
  };
}

test('after dueAt withdrawal admits one started execution', async () => {
  await withDisposable(async (database) => {
    const stories = createStories(database);
    const { ownerId, storyId } = await seedStory(database);
    await enableDelegationPolicy(database, ownerId, storyId);
    const { offerId } = await publishFixtureCapture(
      database,
      ownerId,
      storyId,
      fixturePlans,
    );

    await database.db.$client.query(
      `update campaign_delegated_offer set due_at = now() - interval '1 second' where offer_id = $1`,
      [offerId],
    );

    const result = await admitPreapprovedWithdrawal(database, {
      storyId,
      offerId,
    });
    assert.equal(result.applied, true);

    const counts = await countRows(database, storyId);
    assert.equal(counts.executions, 1);
    assert.equal(counts.started, 1);
    assert.equal(counts.actionSettledPublic, 0);

    const [capture] = await database.db
      .select()
      .from(campaignDelegatedOffer)
      .where(eq(campaignDelegatedOffer.offerId, offerId));
    assert.equal(capture.status, 'admitted');
    assert.equal(capture.selectionSource, 'preapproved-withdrawal');

    const [command] = await database.db
      .select()
      .from(campaignCommand)
      .where(eq(campaignCommand.operationId, capture.actionOperationId));
    assert.equal(command.request.source, 'preapproved-withdrawal');

    const retry = await admitPreapprovedWithdrawal(database, {
      storyId,
      offerId,
    });
    assert.equal(retry.applied, true);
    const retryCounts = await countRows(database, storyId);
    assert.equal(retryCounts.executions, 1);
  });
});

test('player choice before withdrawal leaves one execution', async () => {
  await withDisposable(async (database) => {
    const stories = createStories(database);
    const { ownerId, storyId } = await seedStory(database);
    await enableDelegationPolicy(database, ownerId, storyId);
    const [storyRow] = await database.db
      .select({ revision: story.revision })
      .from(story)
      .where(eq(story.id, storyId));
    const { offerId } = await publishFixtureCapture(
      database,
      ownerId,
      storyId,
      fixturePlans,
      storyRow.revision,
    );
    await database.db.$client.query(
      `update campaign_delegated_offer set due_at = now() - interval '1 second' where offer_id = $1`,
      [offerId],
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

    const counts = await countRows(database, storyId);
    assert.equal(counts.executions, 1);

    const late = await admitPreapprovedWithdrawal(database, {
      storyId,
      offerId,
    });
    assert.equal(late.applied, false);
    assert.equal((await countRows(database, storyId)).executions, 1);

    const [capture] = await database.db
      .select()
      .from(campaignDelegatedOffer)
      .where(eq(campaignDelegatedOffer.offerId, offerId));
    assert.equal(capture.status, 'consumed');
    assert.equal(capture.selectionSource, 'player');
  });
});

test('refusals do not insert executions', async () => {
  await withDisposable(async (database) => {
    const stories = createStories(database);
    const { ownerId, storyId } = await seedStory(database);
    await enableDelegationPolicy(database, ownerId, storyId);
    const { offerId } = await publishFixtureCapture(
      database,
      ownerId,
      storyId,
      fixturePlans,
    );

    const early = await admitPreapprovedWithdrawal(database, {
      storyId,
      offerId,
    });
    assert.equal(early.applied, false);
    let counts = await countRows(database, storyId);
    assert.equal(counts.executions, 0);

    await stories.delegatedOfferControl.control({
      ownerId,
      storyId,
      operationId: randomUUID(),
      body: { intent: 'pause', offerId },
    });
    await database.db.$client.query(
      `update campaign_delegated_offer set due_at = now() - interval '1 second' where offer_id = $1`,
      [offerId],
    );
    const paused = await admitPreapprovedWithdrawal(database, {
      storyId,
      offerId,
    });
    assert.equal(paused.applied, false);
    counts = await countRows(database, storyId);
    assert.equal(counts.executions, 0);

    const wrongStory = await admitPreapprovedWithdrawal(database, {
      storyId: randomUUID(),
      offerId,
    });
    assert.equal(wrongStory.applied, false);

    const [storyRow] = await database.db
      .select({ revision: story.revision })
      .from(story)
      .where(eq(story.id, storyId));

    const { offerId: offerB } = await publishFixtureCapture(
      database,
      ownerId,
      storyId,
      fixturePlans,
      storyRow.revision,
    );
    await database.db.$client.query(
      `update campaign_delegated_offer set due_at = now() - interval '1 second' where offer_id = $1`,
      [offerB],
    );
    await database.db.$client.query(
      `update campaign_delegated_offer set source_fingerprint = 'stale' where offer_id = $1`,
      [offerB],
    );
    const stale = await admitPreapprovedWithdrawal(database, {
      storyId,
      offerId: offerB,
    });
    assert.equal(stale.applied, false);
    counts = await countRows(database, storyId);
    assert.equal(counts.executions, 0);
    const [held] = await database.db
      .select()
      .from(campaignDelegatedOffer)
      .where(eq(campaignDelegatedOffer.offerId, offerB));
    assert.equal(held.status, 'held');
  });
});