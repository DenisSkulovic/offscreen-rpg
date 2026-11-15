import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import {
  campaign,
  gameActionExecution,
  gameActionReceipt,
} from '@offscreen/db/campaign-schema';
import { createStories } from '../dist/stories/index.js';
import { initializeStoryInTransaction } from '../dist/stories/initialization.js';
import { initializeCampaign } from '../dist/campaign/settings.js';
import { seedStoryPublicInspectTargets } from '../dist/campaign/custom-intent.js';
import { StoryError } from '../dist/stories/errors.js';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { offlineExecution } from '@offscreen/storyteller/tasks';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../dist/developer-tools/index.js';
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
    [ownerId, 'GM02', `${ownerId}@example.test`],
  );
}

async function seedStory(database) {
  const ownerId = `gm02-${randomUUID()}`;
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
          title: 'Quay inspect admit',
          paragraphs: ['A window sits on the quay.'],
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
  ]);
  return { ownerId, storyId };
}

test('GM02 live: accept reviewable inspect once; duplicate ACK is idempotent', async () => {
  await withDisposable(async (database) => {
    const stories = createStories(database);
    const { ownerId, storyId } = await seedStory(database);
    const before = await stories.read({ ownerId, storyId });
    const [clockBefore] = await database.db
      .select({ gameSecond: campaign.gameSecond })
      .from(campaign)
      .where(eq(campaign.storyId, storyId));

    const interpreted = await stories.interpretCustomIntent({
      ownerId,
      storyId,
      interpretOperationId: randomUUID(),
      body: {
        expectedRevision: before.revision,
        text: 'Inspect the visible window',
      },
    });
    assert.equal(interpreted.status, 'reviewable');

    const operationId = randomUUID();
    const acceptBody = {
      expectedRevision: before.revision,
      candidateId: interpreted.candidateId,
      requestDigest: interpreted.requestDigest,
    };
    await stories.acceptCustomIntent({
      ownerId,
      storyId,
      operationId,
      body: acceptBody,
    });
    await stories.acceptCustomIntent({
      ownerId,
      storyId,
      operationId,
      body: acceptBody,
    });

    const executions = await database.db
      .select()
      .from(gameActionExecution)
      .where(eq(gameActionExecution.operationId, operationId));
    assert.equal(executions.length, 1);
    assert.equal(executions[0].state, 'running');
    assert.equal(executions[0].actionKey, 'inspect-visible-window');

    assert.equal(await stories.advanceCampaignAction(operationId), null);
    const receipts = await database.db
      .select()
      .from(gameActionReceipt)
      .where(eq(gameActionReceipt.operationId, operationId));
    assert.equal(receipts.length, 1);
    assert.equal(receipts[0].outcome, 'automatic');

    const [clockAfter] = await database.db
      .select({ gameSecond: campaign.gameSecond })
      .from(campaign)
      .where(eq(campaign.storyId, storyId));
    assert.equal(clockAfter.gameSecond, clockBefore.gameSecond + 10);

    await assert.rejects(
      () =>
        stories.acceptCustomIntent({
          ownerId,
          storyId,
          operationId: randomUUID(),
          body: acceptBody,
        }),
      (error) =>
        error instanceof StoryError &&
        error.code === 'conflict' &&
        error.reason === 'candidate_already_accepted',
    );
  });
});
