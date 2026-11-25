import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { campaign, gameActionExecution } from '@offscreen/story-persistence/campaign';
import { narrativeIntentPlanSchema } from '@offscreen/game/narrative-intent';
import { offerSchema } from '@offscreen/game/offers';
import { admitCampaignActionInTransaction } from '../dist/campaign/actions.js';
import { saveOfferPlans } from '../dist/campaign/persistence.js';
import { initializeCampaign } from '../dist/campaign/settings.js';
import { StoryError } from '../dist/stories/errors.js';
import { lockStoryById } from '../dist/stories/persistence.js';
import { initializeStoryInTransaction } from '../dist/stories/initialization.js';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { offlineExecution } from '@offscreen/storyteller/tasks';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../../application/dist/developer-tools/index.js';

const profile = storytellerCatalogue.resolve({
  id: 'absurd-action-comedy',
  revision: 1,
});

const narrativePlan = narrativeIntentPlanSchema.parse({
  kind: 'narrative-intent.v1',
  key: 'linger',
  label: 'Linger by the brazier',
  intention: 'Watch the embers and listen.',
  risk: 'Someone may notice your delay.',
  fictionalDurationSeconds: 60,
  effects: [],
});

function buildOffer(offerId) {
  return offerSchema.parse({
    id: offerId,
    nodes: [
      {
        id: narrativePlan.key,
        parent: null,
        label: narrativePlan.label,
        description: narrativePlan.intention,
        action: {
          kind: 'attempt',
          timing: {
            kind: 'finite',
            fictionalSeconds: narrativePlan.fictionalDurationSeconds,
          },
        },
      },
    ],
  });
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
    [ownerId, 'Narrative', `${ownerId}@example.test`],
  );
}

async function seedNarrativeStory(database, withMechanics = false) {
  const ownerId = randomUUID();
  const storyId = randomUUID();
  const offerId = randomUUID();
  const offer = buildOffer(offerId);
  await insertUser(database, ownerId);
  await database.db.transaction(async (tx) => {
    await initializeStoryInTransaction(tx, {
      ownerId,
      storyId,
      input: {
        source: 'playable.opening.v1',
        premise: {
          title: 'Narrative intent',
          premise: 'A quiet moment by the fire.',
          storytellingDirection: 'Stay atmospheric.',
        },
        storyteller: profile,
        execution: offlineExecution,
        usagePolicy: null,
        items: [],
        content: {
          version: 1,
          title: 'Opening',
          paragraphs: ['Embers crackle in the grate.'],
        },
      },
    });
    await initializeCampaign(tx, storyId, profile, {
      mechanics: false,
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
    });
    const story = await lockStoryById(tx, storyId);
    await saveOfferPlans(tx, storyId, story.revision, offerId, [narrativePlan]);
    await tx
      .update(campaign)
      .set({
        offer,
        ...(withMechanics
          ? {
              character: { name: 'Runner', scores: {}, facts: [] },
              content: { version: 1, phases: [] },
            }
          : {}),
        situationAuthorization: {
          version: 2,
          offerId,
          activityAccess: { kind: 'none' },
          preparedPlans: [],
        },
      })
      .where(eq(campaign.storyId, storyId));
  });
  return { ownerId, storyId, offerId };
}

test('narrative intent admission and replay', async () => {
  await withDisposable(async (database) => {
    const { storyId, offerId } = await seedNarrativeStory(database);
    const operationId = randomUUID();

    await database.db.transaction(async (tx) => {
      const current = await lockStoryById(tx, storyId);
      await admitCampaignActionInTransaction(
        tx,
        current,
        {
          operationId,
          expectedRevision: current.revision,
          offerId,
          path: [narrativePlan.key],
        },
        { kind: 'player' },
      );
    });

    const executions = await database.db
      .select()
      .from(gameActionExecution)
      .where(eq(gameActionExecution.storyId, storyId));
    assert.equal(executions.length, 1);
    assert.equal(executions[0].operationId, operationId);
    assert.equal(executions[0].targetGameSecond, 60);

    await database.db.transaction(async (tx) => {
      const current = await lockStoryById(tx, storyId);
      await admitCampaignActionInTransaction(
        tx,
        current,
        {
          operationId,
          expectedRevision: current.revision,
          offerId,
          path: [narrativePlan.key],
        },
        { kind: 'player' },
      );
    });

    const afterReplay = await database.db
      .select()
      .from(gameActionExecution)
      .where(eq(gameActionExecution.storyId, storyId));
    assert.equal(afterReplay.length, 1);
  });
});

test('narrative intent rejects wrong path and mechanical campaigns', async () => {
  await withDisposable(async (database) => {
    const wrongPath = await seedNarrativeStory(database);
    await assert.rejects(
      database.db.transaction(async (tx) => {
        const current = await lockStoryById(tx, wrongPath.storyId);
        await admitCampaignActionInTransaction(
          tx,
          current,
          {
            operationId: randomUUID(),
            expectedRevision: current.revision,
            offerId: wrongPath.offerId,
            path: ['wrong-key'],
          },
          { kind: 'player' },
        );
      }),
      (error) => error instanceof StoryError && error.code === 'conflict',
    );

    const mechanical = await seedNarrativeStory(database, true);
    await assert.rejects(
      database.db.transaction(async (tx) => {
        const current = await lockStoryById(tx, mechanical.storyId);
        await admitCampaignActionInTransaction(
          tx,
          current,
          {
            operationId: randomUUID(),
            expectedRevision: current.revision,
            offerId: mechanical.offerId,
            path: [narrativePlan.key],
          },
          { kind: 'player' },
        );
      }),
      (error) => error instanceof StoryError && error.code === 'conflict',
    );
  });
});