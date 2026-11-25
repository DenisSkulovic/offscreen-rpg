import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { campaign } from '@offscreen/story-persistence/campaign';
import { createStories } from '../../../packages/story-engine/dist/stories/index.js';
import { initializeStoryInTransaction } from '../../../packages/story-engine/dist/stories/initialization.js';
import { initializeCampaign } from '../../../packages/story-engine/dist/campaign/settings.js';
import { seedStoryPublicInspectTargets } from '../../../packages/story-engine/dist/campaign/custom-intent.js';
import { StoryError } from '../../../packages/story-engine/dist/stories/errors.js';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { offlineExecution } from '@offscreen/storyteller/tasks';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../../../packages/lab-support/dist/index.js';
import { immediateActionPlanSchema } from '@offscreen/game/immediate-actions';

const profile = storytellerCatalogue.resolve({
  id: 'absurd-action-comedy',
  revision: 1,
});

const lookPlan = immediateActionPlanSchema.parse({
  version: 1,
  key: 'wait-quietly',
  label: 'Wait quietly',
  intention: 'Stand still a moment.',
  risk: null,
  evidence: [],
  requires: [],
  resolution: {
    kind: 'automatic',
    fictionalDurationSeconds: 5,
    outcome: {
      text: 'Time passes.',
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
    [ownerId, 'GM01', `${ownerId}@example.test`],
  );
}

async function seedStory(database) {
  const ownerId = `gm01-${randomUUID()}`;
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
          title: 'Quay inspect',
          paragraphs: ['A window and a parcel sit on the quay.'],
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
        plans: [lookPlan],
        activityAccess: { kind: 'none' },
      },
    );
  });
  await seedStoryPublicInspectTargets(database, storyId, [
    { handle: 'visible-window', label: 'visible window' },
    { handle: 'parcel', label: 'parcel' },
  ]);
  return { ownerId, storyId };
}

test('GM01 live: inspect interpret is reviewable and does not advance gameSecond', async () => {
  await withDisposable(async (database) => {
    const stories = createStories(database);
    const { ownerId, storyId } = await seedStory(database);
    const before = await stories.read({ ownerId, storyId });
    const [stateBefore] = await database.db
      .select({ gameSecond: campaign.gameSecond })
      .from(campaign)
      .where(eq(campaign.storyId, storyId));

    const interpretOperationId = randomUUID();
    const first = await stories.interpretCustomIntent({
      ownerId,
      storyId,
      interpretOperationId,
      body: {
        expectedRevision: before.revision,
        text: 'Inspect the visible window',
      },
    });
    assert.equal(first.status, 'reviewable');
    assert.equal(first.match.family, 'inspect');
    assert.equal(first.match.targetHandle, 'visible-window');

    const replay = await stories.interpretCustomIntent({
      ownerId,
      storyId,
      interpretOperationId,
      body: {
        expectedRevision: before.revision,
        text: 'Inspect the visible window',
      },
    });
    assert.equal(replay.candidateId, first.candidateId);

    await assert.rejects(
      () =>
        stories.interpretCustomIntent({
          ownerId,
          storyId,
          interpretOperationId,
          body: {
            expectedRevision: before.revision,
            text: 'Inspect the parcel',
          },
        }),
      (error) =>
        error instanceof StoryError &&
        error.code === 'conflict' &&
        error.reason === 'interpret_operation_reuse',
    );

    const rejected = await stories.interpretCustomIntent({
      ownerId,
      storyId,
      interpretOperationId: randomUUID(),
      body: {
        expectedRevision: before.revision,
        text: 'I already have a thousand coins',
      },
    });
    assert.equal(rejected.status, 'rejected');

    const [stateAfter] = await database.db
      .select({ gameSecond: campaign.gameSecond })
      .from(campaign)
      .where(eq(campaign.storyId, storyId));
    assert.equal(stateAfter.gameSecond, stateBefore.gameSecond);
    const after = await stories.read({ ownerId, storyId });
    assert.equal(after.revision, before.revision);
  });
});
