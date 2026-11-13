/**
 * ENG06: worker process restart mid-wait settles the same campaign action once.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { createStories } from '@offscreen/application/stories';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '@offscreen/application/developer-tools';
import { immediateActionPlanSchema } from '@offscreen/game/immediate-actions';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { startRuntime } from '../src/runtime/index.js';

const requireFromHere = createRequire(__filename);
const applicationDist = join(
  __dirname,
  '../../../../packages/application/dist',
);
const { initializeStoryInTransaction } = requireFromHere(
  join(applicationDist, 'stories/initialization.js'),
) as typeof import('../../../packages/application/dist/stories/initialization.js');
const { initializeCampaign } = requireFromHere(
  join(applicationDist, 'campaign/settings.js'),
) as typeof import('../../../packages/application/dist/campaign/settings.js');
const { harborCompassItems } = requireFromHere(
  join(applicationDist, 'campaign/fixtures/item-transfer-plans.js'),
) as typeof import('../../../packages/application/dist/campaign/fixtures/item-transfer-plans.js');

const profile = storytellerCatalogue.resolve({
  id: 'absurd-action-comedy',
  revision: 1,
});

const shortCompassTransfer = immediateActionPlanSchema.parse({
  version: 1,
  key: 'give-compass',
  label: 'Give Mara the compass',
  intention: 'Hand the brass compass to Mara across the quay.',
  risk: null,
  evidence: [],
  requires: [],
  resolution: {
    kind: 'automatic',
    fictionalDurationSeconds: 2,
    outcome: {
      text: 'Mara takes the compass.',
      effects: [],
      worldEffects: [
        {
          kind: 'item.transfer.v1',
          itemKey: 'brass-compass',
          fromHolder: 'player',
          toHolder: 'mara',
        },
      ],
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

test(
  'ENG06 live: Temporal worker restart settles one timed action exactly once',
  { timeout: 90_000 },
  async (t) => {
    const address = process.env['TEMPORAL_ADDRESS'] ?? '127.0.0.1:7233';
    let runtime: Awaited<ReturnType<typeof startRuntime>> | undefined;
    const runId = randomUUID();
    let provisioned: { connectionString: string } | undefined;
    try {
      provisioned = await provisionDisposableSandboxDatabase({
        runId,
        confirmDisposableProvision: true,
        applyFullMigrations: true,
      });
    } catch (error) {
      t.skip(
        `disposable Postgres required: ${
          error instanceof Error ? error.message : 'unavailable'
        }`,
      );
      return;
    }

    const database = createDatabase(
      readDatabaseConfig({ DATABASE_URL: provisioned.connectionString }),
      () => {},
    );
    const taskQueue = `eng06-${runId.slice(0, 8)}`;
    try {
      try {
        runtime = await startRuntime(
          database,
          { address, namespace: 'default', taskQueue },
          () => {},
        );
      } catch (error) {
        t.skip(
          `local Temporal required at ${address}: ${
            error instanceof Error ? error.message : 'unavailable'
          }`,
        );
        return;
      }

      const ownerId = `eng06-${randomUUID()}`;
      const storyId = randomUUID();
      await database.db.$client.query(
        `insert into "user" (id, name, email, email_verified, created_at, updated_at)
         values ($1, $2, $3, true, now(), now())`,
        [ownerId, 'ENG06 Proof', `${ownerId}@example.test`],
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
            items: harborCompassItems,
            content: {
              version: 1,
              title: 'ENG06 restart quay',
              paragraphs: ['A short wait before the hand-over.'],
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
            pace: { kind: 'rate', fictionalSeconds: 1, realSeconds: 1 },
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
            plans: [shortCompassTransfer],
            activityAccess: { kind: 'none' },
          },
        );
      });

      const stories = createStories(database);
      const before = await stories.read({ ownerId, storyId });
      assert.ok(before.campaign?.offer);
      const operationId = randomUUID();
      await stories.campaignAction({
        ownerId,
        storyId,
        operationId,
        body: {
          expectedRevision: before.revision,
          offerId: before.campaign.offer.id,
          path: ['give-compass'],
        },
      });

      let sawRunning = false;
      for (let i = 0; i < 40; i++) {
        const mid = await stories.read({ ownerId, storyId });
        if (mid.campaign?.actionExecution?.state === 'running') {
          sawRunning = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert.equal(sawRunning, true);

      await runtime.stop();
      runtime = await startRuntime(
        database,
        { address, namespace: 'default', taskQueue },
        () => {},
      );

      let settled: Awaited<ReturnType<typeof stories.read>> | null = null;
      for (let i = 0; i < 80; i++) {
        settled = await stories.read({ ownerId, storyId });
        if (settled.campaign?.actionReceipts?.length) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert.equal(settled?.campaign?.actionExecution, null);
      assert.equal(settled?.campaign?.actionReceipts.length, 1);
      assert.equal(settled?.campaign?.actionReceipts[0]?.id, operationId);
      assert.deepEqual(settled?.campaign?.actionReceipts[0]?.worldEffects, [
        {
          kind: 'item.transfer.v1',
          itemKey: 'brass-compass',
          fromHolder: 'player',
          toHolder: 'mara',
        },
      ]);
      assert.equal(
        settled?.items.find((item) => item.key === 'brass-compass')?.holderKey,
        'mara',
      );

      assert.equal(await stories.advanceCampaignAction(operationId), null);
      const again = await stories.read({ ownerId, storyId });
      assert.equal(again.campaign?.actionReceipts.length, 1);
    } finally {
      await runtime?.stop().catch(() => undefined);
      await database.close().catch(() => undefined);
      await destroyDisposableSandboxDatabase({
        runId,
        confirmDisposableProvision: true,
      }).catch(() => undefined);
    }
  },
);
