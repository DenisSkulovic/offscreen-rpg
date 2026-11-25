import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import {
  campaign,
  campaignDelegatedOffer,
  storyDelegationPolicy,
} from '@offscreen/story-persistence/campaign';
import { outbox } from '@offscreen/outbox/schema';
import { immediateActionPlanSchema } from '@offscreen/game/immediate-actions';
import {
  declineHarmlessInvitationWithdrawalPlan,
  harmlessSocialInvitationPlan,
} from '../../../packages/story-engine/dist/campaign/fixtures/harmless-invitation-offer.js';
import {
  captureDelegatedOfferOnPublication,
  DELEGATED_DECISION_NOTICE_TOPIC,
  resolveDelegationCaptureCandidate,
} from '../../../packages/story-engine/dist/campaign/delegated-offer.js';
import { PREAPPROVED_WITHDRAWAL_WINDOW_MS } from '../../../packages/story-engine/dist/campaign/delegated-decision.js';
import { saveOfferPlans } from '../../../packages/story-engine/dist/campaign/persistence.js';
import { ensureCampaign } from '../../../packages/story-engine/dist/campaign/settings.js';
import { createStories } from '../../../packages/story-engine/dist/stories/index.js';
import { initializeStoryInTransaction } from '../../../packages/story-engine/dist/stories/initialization.js';
import {
  lockStoryById,
  readDatabaseClockMs,
} from '../../../packages/story-engine/dist/stories/persistence.js';
import { StoryError } from '../../../packages/story-engine/dist/stories/errors.js';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
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

async function seedStory(database, ownerId = `gm07-${randomUUID()}`) {
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
        items: [],
        content: {
          version: 1,
          title: 'Delegated capture',
          paragraphs: ['A quiet quay invitation waits.'],
        },
        interaction: null,
      },
    });
  });
  return { ownerId, storyId };
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

async function publishFixtureCapture(database, ownerId, storyId, plans, revision = 1) {
  const offerId = randomUUID();
  let clockMs = 0;
  let gameSecondBefore = 0;
  await database.db.transaction(async (tx) => {
    const story = await lockStoryById(tx, storyId);
    await ensureCampaign(tx, story);
    const [state] = await tx
      .select({ gameSecond: campaign.gameSecond })
      .from(campaign)
      .where(eq(campaign.storyId, storyId));
    gameSecondBefore = state.gameSecond;
    clockMs = await readDatabaseClockMs(tx, storyId);
    await saveOfferPlans(tx, storyId, revision, offerId, plans);
    await captureDelegatedOfferOnPublication(tx, {
      storyId,
      ownerId,
      narrativeRevision: revision,
      offerId,
      plans,
      clockMs,
    });
  });
  return { offerId, clockMs, gameSecondBefore };
}

const fixturePlans = [
  harmlessSocialInvitationPlan,
  declineHarmlessInvitationWithdrawalPlan,
];

test('enabled policy and fixture plans arm one capture and notice', async () => {
  await withDisposable(async (database) => {
    const { ownerId, storyId } = await seedStory(database);
    await enableDelegationPolicy(database, ownerId, storyId);
    const { offerId, clockMs, gameSecondBefore } = await publishFixtureCapture(
      database,
      ownerId,
      storyId,
      fixturePlans,
    );

    const captures = await database.db
      .select()
      .from(campaignDelegatedOffer)
      .where(eq(campaignDelegatedOffer.storyId, storyId));
    assert.equal(captures.length, 1);
    assert.equal(captures[0].status, 'armed');
    assert.equal(captures[0].offerId, offerId);
    assert.equal(
      captures[0].dueAt.getTime(),
      clockMs + PREAPPROVED_WITHDRAWAL_WINDOW_MS,
    );

    const notices = await database.db
      .select()
      .from(outbox)
      .where(eq(outbox.topic, DELEGATED_DECISION_NOTICE_TOPIC));
    assert.equal(notices.length, 1);
    assert.equal(notices[0].operationId, captures[0].wakeOperationId);

    const [after] = await database.db
      .select({ gameSecond: campaign.gameSecond })
      .from(campaign)
      .where(eq(campaign.storyId, storyId));
    assert.equal(after.gameSecond, gameSecondBefore);
  });
});

test('absent policy and ineligible plans do not arm', async () => {
  await withDisposable(async (database) => {
    const { ownerId, storyId } = await seedStory(database);
    await publishFixtureCapture(database, ownerId, storyId, fixturePlans);

    await enableDelegationPolicy(database, ownerId, storyId);
    const badMarker = immediateActionPlanSchema.parse({
      ...declineHarmlessInvitationWithdrawalPlan,
      requiresQuantities: [{ quantityId: 'coin-pouch', minimum: 1 }],
    });
    await publishFixtureCapture(
      database,
      ownerId,
      storyId,
      [harmlessSocialInvitationPlan, badMarker],
      2,
    );

    const captures = await database.db.select().from(campaignDelegatedOffer);
    assert.equal(captures.length, 0);
    const notices = await database.db
      .select()
      .from(outbox)
      .where(eq(outbox.topic, DELEGATED_DECISION_NOTICE_TOPIC));
    assert.equal(notices.length, 0);
    const [policy] = await database.db
      .select()
      .from(storyDelegationPolicy)
      .where(eq(storyDelegationPolicy.storyId, storyId));
    assert.equal(
      resolveDelegationCaptureCandidate(
        [harmlessSocialInvitationPlan, badMarker],
        policy,
      ),
      null,
    );
  });
});

test('pause resume revoke and policy disable controls', async () => {
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

    const paused = await stories.delegatedOfferControl.control({
      ownerId,
      storyId,
      operationId: randomUUID(),
      body: { intent: 'pause', offerId },
    });
    assert.equal(paused.status, 'paused');
    assert.ok(paused.remainingMs > 0);

    const resumed = await stories.delegatedOfferControl.control({
      ownerId,
      storyId,
      operationId: randomUUID(),
      body: { intent: 'resume', offerId },
    });
    assert.equal(resumed.status, 'armed');
    assert.equal(resumed.remainingMs, null);
    const dueDelta = resumed.dueAt.getTime() - Date.now();
    assert.ok(dueDelta <= paused.remainingMs + 2000);
    assert.ok(dueDelta >= paused.remainingMs - 2000);

    await stories.delegationPolicy.update({
      ownerId,
      storyId,
      operationId: randomUUID(),
      body: { intent: 'disable' },
    });
    const [revoked] = await database.db
      .select()
      .from(campaignDelegatedOffer)
      .where(eq(campaignDelegatedOffer.offerId, offerId));
    assert.equal(revoked.status, 'revoked');
  });
});

test('late pause, non-owner, and rollback negatives', async () => {
  await withDisposable(async (database) => {
    const stories = createStories(database);
    const { ownerId, storyId } = await seedStory(database);
    const intruder = `intruder-${randomUUID()}`;
    await insertUser(database, intruder);
    await enableDelegationPolicy(database, ownerId, storyId);
    const { offerId } = await publishFixtureCapture(
      database,
      ownerId,
      storyId,
      fixturePlans,
    );

    await database.db.$client.query(
      `update campaign_delegated_offer set due_at = now() - interval '1 minute' where offer_id = $1`,
      [offerId],
    );
    const before = await database.db
      .select()
      .from(campaignDelegatedOffer)
      .where(eq(campaignDelegatedOffer.offerId, offerId));
    await stories.delegatedOfferControl.control({
      ownerId,
      storyId,
      operationId: randomUUID(),
      body: { intent: 'pause', offerId },
    });
    const afterLate = await database.db
      .select()
      .from(campaignDelegatedOffer)
      .where(eq(campaignDelegatedOffer.offerId, offerId));
    assert.equal(afterLate[0].status, 'armed');
    assert.equal(afterLate[0].wakeEpoch, before[0].wakeEpoch);

    await assert.rejects(
      () =>
        stories.delegatedOfferControl.control({
          ownerId: intruder,
          storyId,
          operationId: randomUUID(),
          body: { intent: 'pause', offerId },
        }),
      (error) => error instanceof StoryError && error.code === 'not_found',
    );
    const untouched = await database.db
      .select()
      .from(campaignDelegatedOffer)
      .where(eq(campaignDelegatedOffer.offerId, offerId));
    assert.equal(untouched[0].status, 'armed');

    const strayOffer = randomUUID();
    await enableDelegationPolicy(database, ownerId, storyId);
    await assert.rejects(
      database.db.transaction(async (tx) => {
        await saveOfferPlans(tx, storyId, 9, strayOffer, fixturePlans);
        await captureDelegatedOfferOnPublication(tx, {
          storyId,
          ownerId,
          narrativeRevision: 9,
          offerId: strayOffer,
          plans: fixturePlans,
          clockMs: await readDatabaseClockMs(tx, storyId),
        });
        throw new Error('rollback');
      }),
    );
    const partial = await database.db
      .select()
      .from(campaignDelegatedOffer)
      .where(eq(campaignDelegatedOffer.offerId, strayOffer));
    assert.equal(partial.length, 0);
  });
});