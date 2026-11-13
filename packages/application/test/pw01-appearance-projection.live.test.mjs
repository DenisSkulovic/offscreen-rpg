import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { storyPassage } from '@offscreen/db/story-schema';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { createStories } from '../dist/stories/index.js';
import { initializeStoryInTransaction } from '../dist/stories/initialization.js';
import { initializeCampaign } from '../dist/campaign/settings.js';
import {
  abstractSignalItems,
  abstractSignalTransferPlan,
} from '../dist/campaign/fixtures/item-transfer-plans.js';
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

test('PW01 live: published appearance projects; corrupt decoration is dropped', async () => {
  await withDisposable(async (database) => {
    const ownerId = `pw01-${randomUUID()}`;
    const storyId = randomUUID();
    await database.db.$client.query(
      `insert into "user" (id, name, email, email_verified, created_at, updated_at)
       values ($1, $2, $3, true, now(), now())`,
      [ownerId, 'PW01', `${ownerId}@example.test`],
    );
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
          items: abstractSignalItems,
          content: {
            version: 1,
            title: 'Harbor cue',
            paragraphs: ['Fog over the quay.'],
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
          plans: [abstractSignalTransferPlan],
          activityAccess: { kind: 'none' },
        },
      );
    });

    const stories = createStories(database);
    const before = await stories.read({ ownerId, storyId });
    assert.equal(before.current.appearance, undefined);

    const directive = {
      schemaVersion: 1,
      scene: {
        palette: { accent: '#d7a15a' },
        atmosphere: { lighting: 'diffuse' },
        stage: 'quiet-surface',
      },
    };
    await database.db
      .update(storyPassage)
      .set({
        appearance: {
          source: {
            storyId,
            passageId: before.current.id,
            campaignOfferId: before.campaign.offer.id,
          },
          directive,
          assets: {},
        },
      })
      .where(eq(storyPassage.id, before.current.id));

    const withAppearance = await stories.read({ ownerId, storyId });
    assert.equal(withAppearance.current.appearance?.source.passageId, before.current.id);
    assert.deepEqual(withAppearance.current.appearance?.directive, directive);

    await database.db
      .update(storyPassage)
      .set({ appearance: { broken: true } })
      .where(eq(storyPassage.id, before.current.id));
    const corrupt = await stories.read({ ownerId, storyId });
    assert.equal(corrupt.current.appearance, undefined);
    assert.equal(corrupt.current.content.title, 'Harbor cue');
  });
});
