import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { campaign, gameActivity } from '@offscreen/db/campaign-schema';
import { createStories } from '../dist/stories/index.js';
import { initializeStoryInTransaction } from '../dist/stories/initialization.js';
import { initializeCampaign } from '../dist/campaign/settings.js';
import { readCampaign } from '../dist/campaign/reads.js';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { initialActivityProgress } from '@offscreen/game/activities';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../dist/developer-tools/index.js';

const profile = storytellerCatalogue.resolve({
  id: 'absurd-action-comedy',
  revision: 1,
});

const character = {
  name: 'Mara',
  scores: {
    strength: 10,
    dexterity: 12,
    constitution: 10,
    intelligence: 14,
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
  skills: [{ id: 'repair', label: 'Repair' }],
  proficientSkills: ['repair'],
  proficiencyBonus: 2,
  hp: 8,
  maxHp: 8,
  quantities: [],
  facts: [],
};

const activityAction = {
  id: 'restore-beacon',
  label: 'Restore the signal beacon',
  description: 'Repair the storm-damaged beacon while keeping watch.',
  requires: [],
  capacity: 'primary',
  process: {
    kind: 'contribution.v1',
    progressLabel: 'Beacon repair',
    requiredContribution: 10,
    everyFictionalSeconds: 5,
    attempt: {
      check: {
        rule: 'srd-5.2.1-subset.v1',
        purpose: 'Repair the beacon',
        skill: 'repair',
        ability: 'intelligence',
        dc: 13,
        advantage: false,
        disadvantage: false,
        modifiers: [],
      },
      successContribution: 3,
      failureContribution: 0,
      successText: 'The repair advances.',
      failureText: 'The attempt consumes time without a sound repair.',
    },
  },
  conditionPolicy: { kind: 'admission-only' },
  occurrence: { kind: 'unbounded' },
  completionFollowUp: 'scene',
  checks: [],
  completion: { text: 'The beacon works again.', effects: [] },
};

function activityPlan() {
  return {
    version: 6,
    action: activityAction,
    settingsRevision: 1,
    resolvedThroughGameSecond: 0,
  };
}

function activityProgress(earned = 0) {
  return {
    ...initialActivityProgress(activityAction),
    process: { kind: 'contribution.v1', earned },
  };
}

async function insertUser(database, ownerId) {
  await database.db.$client.query(
    `insert into "user" (id, name, email, email_verified, created_at, updated_at)
     values ($1, $2, $3, true, now(), now())`,
    [ownerId, 'ENG04 Proof', `${ownerId}@example.test`],
  );
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

test('ENG04 live: current reads omit terminal history and keep interrupted work', async () => {
  await withDisposable(async (database) => {
    const ownerId = `eng04-${randomUUID()}`;
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
            title: 'Long watch',
            paragraphs: ['The beacon has been tended many times.'],
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
          character,
          storyFacts: [],
          plans: [],
          activityAccess: { kind: 'none' },
        },
      );
    });

    const completed = Array.from({ length: 1000 }, () => ({
      id: randomUUID(),
      storyId,
      plan: activityPlan(),
      state: 'complete',
      boundariesSettled: 1,
      revision: 1,
      progress: activityProgress(10),
    }));
    const paused = {
      id: randomUUID(),
      storyId,
      plan: activityPlan(),
      state: 'paused',
      boundariesSettled: 0,
      revision: 2,
      progress: activityProgress(3),
    };
    const blocked = {
      id: randomUUID(),
      storyId,
      plan: activityPlan(),
      state: 'blocked',
      boundariesSettled: 0,
      revision: 1,
      progress: activityProgress(0),
    };
    const suspended = {
      id: randomUUID(),
      storyId,
      plan: activityPlan(),
      state: 'suspended',
      boundariesSettled: 0,
      revision: 1,
      progress: activityProgress(6),
    };
    const running = {
      id: randomUUID(),
      storyId,
      plan: activityPlan(),
      state: 'running',
      boundariesSettled: 0,
      revision: 0,
      progress: activityProgress(3),
    };
    await database.db.insert(gameActivity).values([
      ...completed,
      paused,
      blocked,
      suspended,
      running,
    ]);
    await database.db
      .update(campaign)
      .set({ activeActivityId: running.id })
      .where(eq(campaign.storyId, storyId));

    const total = await database.db.$client.query(
      'select count(*)::int as count from game_activity where story_id = $1',
      [storyId],
    );
    assert.equal(total.rows[0].count, 1004);

    const plan = await database.db.$client.query(
      `explain (format text)
       select * from game_activity
       where story_id = $1
         and (id = $2 or state in ('running','paused','encounter','suspended','blocked'))`,
      [storyId, running.id],
    );
    assert.ok(
      plan.rows.some((row) => String(row['QUERY PLAN']).includes('Seq Scan') ||
        String(row['QUERY PLAN']).includes('Index')),
    );

    const view = await readCampaign(database.db, ownerId, storyId);
    assert.ok(view);
    assert.equal(view.activity?.id, running.id);
    assert.equal(view.activity?.state, 'running');
    assert.equal(view.activity?.progress.earned, 3);
    const commitmentIds = new Set(view.commitments.map((entry) => entry.id));
    assert.equal(commitmentIds.size, 4);
    assert.ok(commitmentIds.has(running.id));
    assert.ok(commitmentIds.has(paused.id));
    assert.ok(commitmentIds.has(blocked.id));
    assert.ok(commitmentIds.has(suspended.id));
    assert.equal(
      view.commitments.some((entry) => entry.state === 'complete'),
      false,
    );

    const stories = createStories(database);
    const snapshot = await stories.read({ ownerId, storyId });
    assert.equal(snapshot.campaign?.commitments.length, 4);
    assert.equal(snapshot.campaign?.activity?.id, running.id);

    const empty = await readCampaign(database.db, ownerId, randomUUID());
    assert.equal(empty, null);
  });
});
