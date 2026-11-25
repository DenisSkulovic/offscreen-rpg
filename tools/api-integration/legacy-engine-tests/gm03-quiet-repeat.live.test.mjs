import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import {
  campaign,
  gameActivity,
  gameActivityEvent,
} from '@offscreen/story-persistence/campaign';
import { storyResolution } from '@offscreen/story-persistence/stories';
import { createStories } from '../../../packages/story-engine/dist/stories/index.js';
import { initializeStoryInTransaction } from '../../../packages/story-engine/dist/stories/initialization.js';
import { initializeCampaign } from '../../../packages/story-engine/dist/campaign/settings.js';
import { projectCampaignClock } from '../../../packages/story-engine/dist/campaign/clock.js';
import { StoryError } from '../../../packages/story-engine/dist/stories/errors.js';
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

const elapsedTime = {
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
};

function character(quantities = []) {
  return {
    name: 'A watch keeper',
    scores: {
      strength: 10,
      dexterity: 12,
      constitution: 12,
      intelligence: 10,
      wisdom: 12,
      charisma: 10,
    },
    applicableAbilities: [
      'strength',
      'dexterity',
      'constitution',
      'intelligence',
      'wisdom',
      'charisma',
    ],
    skills: [],
    proficientSkills: [],
    proficiencyBonus: 2,
    hp: 10,
    maxHp: 10,
    facts: [],
    quantities,
  };
}

function quietWatch() {
  return {
    version: 1,
    key: 'keep-quiet-watch',
    label: 'Keep a quiet watch',
    intention: 'Keep one quiet watch at the post.',
    risk: null,
    evidence: [],
    requires: [],
    requiresStory: [],
    requiresQuantities: [],
    resolution: {
      kind: 'process',
      reuse: 'repeatable',
      action: {
        id: 'keep-quiet-watch',
        label: 'Keep a quiet watch',
        description: 'Watch the post for one quiet interval.',
        requires: [],
        capacity: 'primary',
        process: {
          kind: 'clock-wait.v1',
          progressLabel: 'Quiet watch',
          requiredFictionalSeconds: 600,
        },
        conditionPolicy: { kind: 'admission-only' },
        occurrence: { kind: 'unbounded' },
        completionFollowUp: 'quiet',
        checks: [],
        completion: {
          text: 'One quiet watch ends.',
          effects: [],
        },
      },
    },
  };
}

function oneTimePayout() {
  const plan = quietWatch();
  plan.key = 'collect-one-time-pay';
  plan.label = 'Collect the one-time pay';
  plan.resolution.reuse = 'once';
  plan.resolution.action.id = 'collect-one-time-pay';
  plan.resolution.action.label = 'Collect the one-time pay';
  plan.resolution.action.occurrence = {
    kind: 'limited',
    scopeKey: 'watch-pay',
    limit: 1,
  };
  plan.resolution.action.completion = {
    text: 'The one-time pay is collected.',
    effects: [{ kind: 'quantity.change.v1', quantityId: 'septims', delta: 6 }],
  };
  return plan;
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
    [ownerId, 'GM03', `${ownerId}@example.test`],
  );
}

async function seedStory(
  database,
  { plans, worldObligations = [], quantities = [] },
) {
  const ownerId = `gm03-${randomUUID()}`;
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
        execution: offlineExecution,
        usagePolicy: null,
        items: [],
        content: {
          version: 1,
          title: 'Quiet watch',
          paragraphs: ['The post is quiet.'],
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
        time: elapsedTime,
        worldObligations,
        worlds: [],
      },
      {
        character: character(quantities),
        storyFacts: [],
        plans,
        activityAccess: {
          kind: 'selected',
          actionKeys: plans.map((plan) => plan.key),
        },
      },
    );
  });
  return { ownerId, storyId };
}

async function load(database, storyId) {
  const [row] = await database.db
    .select({
      gameSecond: campaign.gameSecond,
      clock: campaign.clock,
      clockAnchorAt: campaign.clockAnchorAt,
      clockPace: campaign.clockPace,
      holds: campaign.holds,
      acceptedActivityPlan: campaign.acceptedActivityPlan,
      activeActivityId: campaign.activeActivityId,
      activeActionOperationId: campaign.activeActionOperationId,
      character: campaign.character,
    })
    .from(campaign)
    .where(eq(campaign.storyId, storyId));
  const activities = await database.db
    .select({
      id: gameActivity.id,
      state: gameActivity.state,
    })
    .from(gameActivity)
    .where(eq(gameActivity.storyId, storyId));
  const events = await database.db
    .select({
      activityId: gameActivityEvent.activityId,
      kind: gameActivityEvent.kind,
    })
    .from(gameActivityEvent)
    .where(eq(gameActivityEvent.storyId, storyId));
  const resolutions = await database.db
    .select({ generationId: storyResolution.generationId })
    .from(storyResolution)
    .where(eq(storyResolution.storyId, storyId));
  return { row, activities, events, resolutions };
}

function completedCount(events, activityId) {
  return events.filter(
    (event) => event.kind === 'completed' && event.activityId === activityId,
  ).length;
}

test('GM03 one quiet repeated watch on the existing accepted plan', async (t) => {
  await withDisposable(async (database) => {
    const stories = createStories(database);

    await t.test(
      'three iterations stop at the horizon and a duplicate delivery does not repeat one',
      async () => {
        const { ownerId, storyId } = await seedStory(database, {
          plans: [quietWatch()],
        });
        const before = await stories.read({ ownerId, storyId });
        const offer = before.campaign?.offer;
        assert.ok(offer);
        await stories.campaignAction({
          ownerId,
          storyId,
          operationId: randomUUID(),
          body: {
            expectedRevision: before.revision,
            offerId: offer.id,
            path: ['keep-quiet-watch'],
            successorPaths: [['keep-quiet-watch'], ['keep-quiet-watch']],
            horizonGameSeconds: 1800,
          },
        });
        const admitted = await stories.read({ ownerId, storyId });
        assert.equal(admitted.campaign?.gameSecond, 0);
        assert.equal(
          admitted.campaign?.acceptedActivityPlan?.horizonGameSecond,
          1800,
        );
        assert.equal(
          admitted.campaign?.acceptedActivityPlan?.entries.length,
          3,
        );
        const firstId = admitted.campaign?.activity?.id;
        assert.ok(firstId);

        await stories.advanceCampaignActivity(firstId);
        await stories.advanceCampaignActivity(firstId);
        const once = await load(database, storyId);
        assert.equal(once.row.gameSecond, 600);
        assert.equal(once.activities.length, 2);
        assert.equal(completedCount(once.events, firstId), 1);
        assert.equal(
          once.events.filter((event) => event.kind === 'started').length,
          2,
        );
        const secondId = once.activities.find(
          (activity) => activity.id !== firstId,
        )?.id;
        assert.ok(secondId);

        await stories.advanceCampaignActivity(secondId);
        await stories.advanceCampaignActivity(secondId);
        const twice = await load(database, storyId);
        assert.equal(twice.row.gameSecond, 1200);
        assert.equal(twice.activities.length, 3);
        assert.equal(completedCount(twice.events, secondId), 1);
        const thirdId = twice.activities.find(
          (activity) => activity.id !== firstId && activity.id !== secondId,
        )?.id;
        assert.ok(thirdId);

        await stories.advanceCampaignActivity(thirdId);
        await stories.advanceCampaignActivity(thirdId);
        const done = await stories.read({ ownerId, storyId });
        const finished = await load(database, storyId);
        assert.equal(done.campaign?.gameSecond, 1800);
        assert.equal(done.campaign?.acceptedActivityPlan?.state, 'complete');
        assert.deepEqual(
          done.campaign?.acceptedActivityPlan?.entries.map(
            (entry) => entry.state,
          ),
          ['complete', 'complete', 'complete'],
        );
        assert.equal(done.campaign?.activity, null);
        assert.equal(finished.activities.length, 3);
        assert.equal(
          new Set(finished.activities.map((activity) => activity.id)).size,
          3,
        );
        assert.equal(completedCount(finished.events, firstId), 1);
        assert.equal(completedCount(finished.events, secondId), 1);
        assert.equal(completedCount(finished.events, thirdId), 1);
        assert.equal(finished.resolutions.length, 0);
      },
    );

    await t.test(
      'a shorter horizon cancels the iteration that would pass it',
      async () => {
        const { ownerId, storyId } = await seedStory(database, {
          plans: [quietWatch()],
        });
        const before = await stories.read({ ownerId, storyId });
        await stories.campaignAction({
          ownerId,
          storyId,
          operationId: randomUUID(),
          body: {
            expectedRevision: before.revision,
            offerId: before.campaign.offer.id,
            path: ['keep-quiet-watch'],
            successorPaths: [['keep-quiet-watch'], ['keep-quiet-watch']],
            horizonGameSeconds: 1200,
          },
        });
        const admitted = await stories.read({ ownerId, storyId });
        const firstId = admitted.campaign.activity.id;
        await stories.advanceCampaignActivity(firstId);
        const midway = await load(database, storyId);
        const secondId = midway.activities.find(
          (activity) => activity.id !== firstId,
        ).id;
        await stories.advanceCampaignActivity(secondId);
        await stories.advanceCampaignActivity(secondId);
        const stopped = await stories.read({ ownerId, storyId });
        const rows = await load(database, storyId);
        assert.equal(stopped.campaign.gameSecond, 1200);
        assert.equal(
          stopped.campaign.acceptedActivityPlan.state,
          'horizon-reached',
        );
        assert.deepEqual(
          stopped.campaign.acceptedActivityPlan.entries.map(
            (entry) => entry.state,
          ),
          ['complete', 'complete', 'cancelled'],
        );
        assert.equal(stopped.campaign.activity, null);
        assert.equal(rows.activities.length, 2);
        assert.equal(completedCount(rows.events, secondId), 1);
        assert.match(
          stopped.campaign.acceptedActivityPlan.blockedReason,
          /horizon/,
        );
      },
    );

    await t.test(
      'an interrupting event prevents the next iteration',
      async () => {
        const { ownerId, storyId } = await seedStory(database, {
          plans: [quietWatch()],
          worldObligations: [
            {
              id: randomUUID(),
              revision: 1,
              source: { id: 'watch-bell', revision: 1 },
              label: 'The watch bell',
              visibility: { kind: 'exact' },
              consequence: {
                kind: 'condition.set.v1',
                condition: {
                  id: 'watch-bell',
                  label: 'Watch bell',
                  value: true,
                },
              },
              followUp: 'controlling-scene',
              due: { kind: 'game-second', gameSecond: 900 },
            },
          ],
        });
        const before = await stories.read({ ownerId, storyId });
        await stories.campaignAction({
          ownerId,
          storyId,
          operationId: randomUUID(),
          body: {
            expectedRevision: before.revision,
            offerId: before.campaign.offer.id,
            path: ['keep-quiet-watch'],
            successorPaths: [['keep-quiet-watch'], ['keep-quiet-watch']],
            horizonGameSeconds: 1800,
          },
        });
        const admitted = await stories.read({ ownerId, storyId });
        const firstId = admitted.campaign.activity.id;
        await stories.advanceCampaignActivity(firstId);
        await stories.advanceCampaignActivity(firstId);
        const interrupted = await stories.read({ ownerId, storyId });
        const rows = await load(database, storyId);
        assert.equal(interrupted.campaign.gameSecond, 600);
        assert.equal(
          interrupted.campaign.acceptedActivityPlan.state,
          'blocked',
        );
        assert.deepEqual(
          interrupted.campaign.acceptedActivityPlan.entries.map(
            (entry) => entry.state,
          ),
          ['complete', 'blocked', 'pending'],
        );
        assert.match(
          interrupted.campaign.acceptedActivityPlan.blockedReason,
          /interrupting event at gameSecond 900/,
        );
        assert.equal(interrupted.campaign.activity, null);
        assert.equal(rows.activities.length, 1);
        assert.equal(completedCount(rows.events, firstId), 1);
        assert.equal(rows.resolutions.length, 0);
      },
    );

    await t.test(
      'no accepted intent and a rejected repeat accrue no fictional time',
      async () => {
        const idle = await seedStory(database, { plans: [quietWatch()] });
        const idleRow = await load(database, idle.storyId);
        const projected = projectCampaignClock(
          idleRow.row,
          idleRow.row.clockAnchorAt.getTime() + 8 * 60 * 60 * 1000,
          { kind: 'none' },
          false,
        );
        assert.equal(idleRow.row.acceptedActivityPlan, null);
        assert.equal(idleRow.row.gameSecond, 0);
        assert.equal(projected.clock.elapsedGameSeconds, 0);
        assert.equal(idleRow.activities.length, 0);

        const fourth = await seedStory(database, { plans: [quietWatch()] });
        const fourthBefore = await stories.read({
          ownerId: fourth.ownerId,
          storyId: fourth.storyId,
        });
        await assert.rejects(
          () =>
            stories.campaignAction({
              ownerId: fourth.ownerId,
              storyId: fourth.storyId,
              operationId: randomUUID(),
              body: {
                expectedRevision: fourthBefore.revision,
                offerId: fourthBefore.campaign.offer.id,
                path: ['keep-quiet-watch'],
                successorPaths: [
                  ['keep-quiet-watch'],
                  ['keep-quiet-watch'],
                  ['keep-quiet-watch'],
                ],
                horizonGameSeconds: 2400,
              },
            }),
          (error) => error instanceof StoryError && error.code === 'conflict',
        );
        const fourthRow = await load(database, fourth.storyId);
        assert.equal(fourthRow.row.gameSecond, 0);
        assert.equal(fourthRow.row.acceptedActivityPlan, null);
        assert.equal(fourthRow.activities.length, 0);

        const payout = oneTimePayout();
        const rewarded = await seedStory(database, {
          plans: [payout],
          quantities: [{ id: 'septims', label: 'Septims', value: 0 }],
        });
        const rewardedBefore = await stories.read({
          ownerId: rewarded.ownerId,
          storyId: rewarded.storyId,
        });
        await assert.rejects(
          () =>
            stories.campaignAction({
              ownerId: rewarded.ownerId,
              storyId: rewarded.storyId,
              operationId: randomUUID(),
              body: {
                expectedRevision: rewardedBefore.revision,
                offerId: rewardedBefore.campaign.offer.id,
                path: ['collect-one-time-pay'],
                successorPaths: [
                  ['collect-one-time-pay'],
                  ['collect-one-time-pay'],
                ],
                horizonGameSeconds: 1800,
              },
            }),
          (error) => error instanceof StoryError && error.code === 'conflict',
        );
        const rewardedRow = await load(database, rewarded.storyId);
        assert.equal(rewardedRow.row.gameSecond, 0);
        assert.equal(rewardedRow.activities.length, 0);
        assert.equal(rewardedRow.row.character.quantities[0].value, 0);
      },
    );

    await t.test(
      'cancelling the quiet repeat does not start the next iteration',
      async () => {
        const { ownerId, storyId } = await seedStory(database, {
          plans: [quietWatch()],
        });
        const before = await stories.read({ ownerId, storyId });
        await stories.campaignAction({
          ownerId,
          storyId,
          operationId: randomUUID(),
          body: {
            expectedRevision: before.revision,
            offerId: before.campaign.offer.id,
            path: ['keep-quiet-watch'],
            successorPaths: [['keep-quiet-watch'], ['keep-quiet-watch']],
            horizonGameSeconds: 1800,
          },
        });
        const admitted = await stories.read({ ownerId, storyId });
        await stories.acceptedPlanControl({
          ownerId,
          storyId,
          operationId: randomUUID(),
          body: {
            planId: admitted.campaign.acceptedActivityPlan.id,
            expectedRevision: admitted.campaign.acceptedActivityPlan.revision,
            action: 'cancel-pending',
          },
        });
        const firstId = admitted.campaign.activity.id;
        await stories.advanceCampaignActivity(firstId);
        await stories.advanceCampaignActivity(firstId);
        const cancelled = await stories.read({ ownerId, storyId });
        const rows = await load(database, storyId);
        assert.equal(
          cancelled.campaign.acceptedActivityPlan.state,
          'cancelled',
        );
        assert.match(
          cancelled.campaign.acceptedActivityPlan.blockedReason,
          /cancelled the remaining quiet repetitions/,
        );
        assert.deepEqual(
          cancelled.campaign.acceptedActivityPlan.entries.map(
            (entry) => entry.state,
          ),
          ['complete', 'cancelled', 'cancelled'],
        );
        assert.equal(cancelled.campaign.gameSecond, 600);
        assert.equal(rows.activities.length, 1);
        assert.equal(rows.activities[0].id, firstId);
        assert.equal(rows.activities[0].state, 'complete');
        assert.equal(cancelled.campaign.activity, null);
        assert.equal(rows.resolutions.length, 0);
      },
    );
  });
});
