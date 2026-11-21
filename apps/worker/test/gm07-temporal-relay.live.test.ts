/**
 * GM07: a local Temporal worker delivers one delegated-decision notice.
 * The due time is moved before the worker starts so the test does not wait
 * twenty real minutes. This is one process against disposable SQL, not a cluster.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import {
  campaign,
  campaignDelegatedOffer,
  gameActionExecution,
  gameActionReceipt,
  storyPublicEvent,
} from '@offscreen/db/campaign-schema';
import { createStories } from '@offscreen/story-engine/stories';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '@offscreen/lab-support';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { offlineExecution } from '@offscreen/storyteller/tasks';
import { startRuntime } from '../src/runtime/index.js';

const requireFromHere = createRequire(__filename);
const storyEngineDist = join(
  __dirname,
  '../../../../packages/story-engine/dist',
);
const { initializeStoryInTransaction } = requireFromHere(
  join(storyEngineDist, 'stories/initialization.js'),
);
const { ensureCampaign, initializeCampaign } = requireFromHere(
  join(storyEngineDist, 'campaign/settings.js'),
);
const { saveOfferPlans } = requireFromHere(
  join(storyEngineDist, 'campaign/persistence.js'),
);
const { lockStoryById, readDatabaseClockMs } = requireFromHere(
  join(storyEngineDist, 'stories/persistence.js'),
);
const { captureDelegatedOfferOnPublication } = requireFromHere(
  join(storyEngineDist, 'campaign/delegated-offer.js'),
);
const {
  declineHarmlessInvitationWithdrawalPlan,
  harmlessSocialInvitationPlan,
} = requireFromHere(
  join(storyEngineDist, 'campaign/fixtures/harmless-invitation-offer.js'),
);

const profile = storytellerCatalogue.resolve({
  id: 'absurd-action-comedy',
  revision: 1,
});
const fixturePlans = [
  harmlessSocialInvitationPlan,
  declineHarmlessInvitationWithdrawalPlan,
];

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
  'GM07 live: Temporal relay admits one preapproved withdrawal',
  { timeout: 60_000 },
  async (t) => {
    const address = process.env['TEMPORAL_ADDRESS'] ?? '127.0.0.1:7233';
    const runId = randomUUID();
    let runtime: Awaited<ReturnType<typeof startRuntime>> | undefined;
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
    const relayErrors: unknown[] = [];
    const taskQueue = `gm07-${runId.slice(0, 8)}`;
    try {
      const ownerId = `gm07-${randomUUID()}`;
      const storyId = randomUUID();
      await database.db.$client.query(
        `insert into "user" (id, name, email, email_verified, created_at, updated_at)
         values ($1, $2, $3, true, now(), now())`,
        [ownerId, 'GM07 Relay', `${ownerId}@example.test`],
      );
      await database.db.transaction(async (tx) => {
        await initializeStoryInTransaction(tx, {
          ownerId,
          storyId,
          input: {
            source: 'playable.opening.v1',
            premise: {
              title: 'Delegated relay',
              premise: 'A quiet quay invitation waits.',
              storytellingDirection: 'Keep the harbor calm.',
            },
            storyteller: profile,
            execution: offlineExecution,
            usagePolicy: null,
            items: [],
            content: {
              version: 1,
              title: 'GM07 relay quay',
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

      const stories = createStories(database);
      await stories.delegationPolicy.update({
        ownerId,
        storyId,
        operationId: randomUUID(),
        body: { intent: 'enable' },
      });

      const offerId = randomUUID();
      await database.db.transaction(async (tx) => {
        const current = await lockStoryById(tx, storyId);
        await ensureCampaign(tx, current);
        const clockMs = await readDatabaseClockMs(tx, storyId);
        await saveOfferPlans(tx, storyId, current.revision, offerId, fixturePlans);
        await tx
          .update(campaign)
          .set({
            offer: {
              id: offerId,
              nodes: fixturePlans.map((plan) => ({
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
            },
            situationAuthorization: {
              version: 2,
              offerId,
              activityAccess: {
                kind: 'selected',
                actionKeys: fixturePlans.map((plan) => plan.key),
              },
              preparedPlans: [],
            },
            holds: [{ kind: 'decision', offerId, reason: 'player-choice' }],
          })
          .where(eq(campaign.storyId, storyId));
        await captureDelegatedOfferOnPublication(tx, {
          storyId,
          ownerId,
          narrativeRevision: current.revision,
          offerId,
          plans: fixturePlans,
          clockMs,
        });
      });

      await database.db.$client.query(
        `update campaign_delegated_offer set due_at = now() - interval '1 second' where offer_id = $1`,
        [offerId],
      );

      try {
        runtime = await startRuntime(
          database,
          { address, namespace: 'default', taskQueue },
          (error) => {
            relayErrors.push(error);
          },
        );
      } catch (error) {
        t.skip(
          `local Temporal required at ${address}: ${
            error instanceof Error ? error.message : 'unavailable'
          }`,
        );
        return;
      }

      let settled = false;
      for (let i = 0; i < 80; i++) {
        const [execution] = await database.db
          .select({ state: gameActionExecution.state })
          .from(gameActionExecution)
          .where(eq(gameActionExecution.storyId, storyId));
        const receipts = await database.db
          .select({ operationId: gameActionReceipt.operationId })
          .from(gameActionReceipt)
          .where(eq(gameActionReceipt.storyId, storyId));
        if (execution?.state === 'settled' && receipts.length === 1) {
          settled = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      const executions = await database.db
        .select()
        .from(gameActionExecution)
        .where(eq(gameActionExecution.storyId, storyId));
      const receipts = await database.db
        .select()
        .from(gameActionReceipt)
        .where(eq(gameActionReceipt.storyId, storyId));
      const [capture] = await database.db
        .select()
        .from(campaignDelegatedOffer)
        .where(eq(campaignDelegatedOffer.offerId, offerId));
      const publicEvents = await database.db
        .select({ kind: storyPublicEvent.kind })
        .from(storyPublicEvent)
        .where(eq(storyPublicEvent.storyId, storyId));
      const storyteller = await database.db.$client.query(
        `select count(*)::int as count from outbox where topic like '%storyteller%'`,
      );
      const [clock] = await database.db
        .select({ gameSecond: campaign.gameSecond })
        .from(campaign)
        .where(eq(campaign.storyId, storyId));

      assert.equal(relayErrors.length, 0, 'relay reported an error');
      assert.equal(settled, true);
      assert.equal(executions.length, 1);
      assert.equal(executions[0]?.state, 'settled');
      assert.equal(receipts.length, 1);
      assert.equal(capture?.status, 'admitted');
      assert.equal(capture?.selectionSource, 'preapproved-withdrawal');
      assert.deepEqual(
        publicEvents.map((row) => row.kind),
        ['action-settled'],
      );
      assert.equal(clock?.gameSecond, 5);
      assert.equal(storyteller.rows[0].count, 0);
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
