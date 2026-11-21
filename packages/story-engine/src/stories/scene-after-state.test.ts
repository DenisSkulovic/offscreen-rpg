import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import {
  campaign,
  gameActionExecution,
  gameActivity,
  gameOffer,
  worldObligation,
} from '@offscreen/db/campaign-schema';
import { story, storyItem } from '@offscreen/db/story-schema';
import { user } from '@offscreen/db/schema';
import type { Transaction } from '@offscreen/db/outbox';
import type { StoryContinuation } from './command-policy';
import {
  assertSceneAfterStateRepresentable,
  canonicalizeSceneAfterState,
  compareSceneAfterState,
  projectSceneItemAfterState,
  readSceneAfterState,
  SceneAfterStateError,
  type SceneAfterState,
  type SceneAfterStateCampaign,
} from './scene-after-state';

function minimalCampaign(
  overrides: Partial<SceneAfterStateCampaign> = {},
): SceneAfterStateCampaign {
  return {
    settingsRevision: 1,
    character: { name: 'Outlander' },
    storyFacts: [],
    activityOccurrences: [],
    acceptedActivityPlan: null,
    content: null,
    location: 'Balmora',
    gameSecond: 42,
    clock: {
      elapsedGameSeconds: 42,
      remainder: { numerator: '0', denominator: '1' },
    },
    clockPace: { kind: 'instant' },
    holds: [{ kind: 'decision', id: randomUUID() }],
    offer: { id: randomUUID(), label: 'invitation' },
    situationAuthorization: {
      version: 2,
      offerId: null,
      activityAccess: { kind: 'none' },
      preparedPlans: [],
    },
    activeActivityId: null,
    activeActionOperationId: null,
    worldConditions: [],
    ...overrides,
  };
}

function emptySceneAfterState(
  overrides: Partial<SceneAfterState> = {},
): SceneAfterState {
  return {
    continuityNotes: null,
    activeSceneScope: null,
    storyItems: [],
    campaign: null,
    activities: [],
    worldObligations: [],
    gameOffers: [],
    actionExecutions: [],
    ...overrides,
  };
}

test('compareSceneAfterState returns match for equal canonical states', () => {
  const offerId = randomUUID();
  const base = emptySceneAfterState({
    continuityNotes: [],
    storyItems: [{ key: 'b', label: 'B', holderKey: 'pack' }],
    campaign: minimalCampaign({ offer: { id: offerId } }),
  });
  const reordered = {
    ...base,
    storyItems: [{ key: 'b', label: 'B', holderKey: 'pack' }],
    activities: [...base.activities],
  };
  assert.equal(compareSceneAfterState(base, reordered), 'match');
});

test('compareSceneAfterState reports continuity_notes first', () => {
  const left = emptySceneAfterState({ continuityNotes: [] });
  const right = emptySceneAfterState({
    continuityNotes: [{ id: 'n1', text: 'note' }],
  });
  assert.equal(compareSceneAfterState(left, right), 'continuity_notes');
});

test('compareSceneAfterState reports campaign component mismatch', () => {
  const left = emptySceneAfterState({
    campaign: minimalCampaign({ gameSecond: 1 }),
  });
  const right = emptySceneAfterState({
    campaign: minimalCampaign({ gameSecond: 2 }),
  });
  assert.equal(compareSceneAfterState(left, right), 'campaign');
});

test('projectSceneItemAfterState reuses item transfer projection', () => {
  const base = [{ key: 'flute', label: 'Flute', holderKey: 'player' }];
  const effects: StoryContinuation['effects'] = [
    {
      kind: 'item.transfer.v1',
      itemKey: 'flute',
      fromHolder: 'player',
      toHolder: 'chest',
    },
  ];
  assert.deepEqual(projectSceneItemAfterState(base, effects), [
    { key: 'flute', label: 'Flute', holderKey: 'chest' },
  ]);
});

test('assertSceneAfterStateRepresentable throws state_not_representable when obligations exceed cap', () => {
  const obligations = Array.from({ length: 257 }, () => ({
    id: randomUUID(),
    revision: 0,
    definition: { kind: 'test' },
    dueGameSecond: 10,
    state: 'pending',
    firedAtGameSecond: null,
  }));
  const state = emptySceneAfterState({ worldObligations: obligations });
  assert.throws(
    () => assertSceneAfterStateRepresentable(state),
    (error: unknown) => {
      assert.ok(error instanceof SceneAfterStateError);
      assert.equal(error.code, 'state_not_representable');
      assert.equal(error.message, 'state_not_representable');
      return true;
    },
  );
});

test('canonicalizeSceneAfterState sorts activities and obligations by id', () => {
  const idLow = '00000000-0000-4000-8000-000000000001';
  const idHigh = '00000000-0000-4000-8000-000000000099';
  const state = emptySceneAfterState({
    activities: [
      {
        id: idHigh,
        plan: {},
        state: 'running',
        boundariesSettled: 0,
        revision: 1,
        progress: {},
      },
      {
        id: idLow,
        plan: {},
        state: 'paused',
        boundariesSettled: 1,
        revision: 2,
        progress: {},
      },
    ],
    worldObligations: [
      {
        id: idHigh,
        revision: 1,
        definition: {},
        dueGameSecond: 5,
        state: 'pending',
        firedAtGameSecond: null,
      },
      {
        id: idLow,
        revision: 2,
        definition: {},
        dueGameSecond: 6,
        state: 'fired',
        firedAtGameSecond: 6,
      },
    ],
  });
  const canonical = canonicalizeSceneAfterState(state);
  assert.equal(canonical.activities[0]?.id, idLow);
  assert.equal(canonical.worldObligations[0]?.id, idLow);
});

const databaseTestUrl = process.env['DATABASE_TEST_URL'];
const disposableTestDb =
  databaseTestUrl !== undefined &&
  new URL(databaseTestUrl).pathname === '/offscreen_db_test' &&
  ['127.0.0.1', 'localhost'].includes(new URL(databaseTestUrl).hostname);

test('readSceneAfterState', { skip: !disposableTestDb }, async (t) => {
  const config = readDatabaseConfig({ DATABASE_URL: databaseTestUrl });
  const database = createDatabase(config, (error: Error) => {
    throw error;
  });
  await database.checkConnection();

  async function insertOwner() {
    const ownerId = `user_${randomUUID()}`;
    await database.db.insert(user).values({
      id: ownerId,
      name: 'WR05P1',
      email: `${ownerId}@example.test`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return ownerId;
  }

  async function insertStory(ownerId: string, continuityNotes: unknown = null) {
    const storyId = randomUUID();
    await database.db.insert(story).values({
      id: storyId,
      ownerId,
      source: 'wr05p1-scene-after-state',
      continuityNotes,
      activeSceneScope: { kind: 'place', key: 'baar-dagen' },
    });
    return storyId;
  }

  await t.test('narrative-only world has null campaign', async () => {
    const ownerId = await insertOwner();
    const storyId = await insertStory(ownerId);
    const state = await database.db.transaction((tx: Transaction) =>
      readSceneAfterState(tx, storyId),
    );
    assert.equal(state.campaign, null);
    assert.equal(state.continuityNotes, null);
    assert.deepEqual(state.activeSceneScope, {
      kind: 'place',
      key: 'baar-dagen',
    });
  });

  await t.test(
    'captures campaign offer, holds, activities, obligations, and action progress',
    async () => {
      const ownerId = await insertOwner();
      const storyId = await insertStory(ownerId, []);
      const holdId = randomUUID();
      const offerId = randomUUID();
      const activityA = randomUUID();
      const activityB = randomUUID();
      const obligationA = randomUUID();
      const obligationB = randomUUID();
      const [firstActivityId, secondActivityId] = [activityA, activityB].sort();
      const [firstObligationId, secondObligationId] = [
        obligationA,
        obligationB,
      ].sort();
      const gameOfferId = randomUUID();
      const executionId = randomUUID();

      await database.db.insert(campaign).values({
        storyId,
        settingsRevision: 3,
        locked: 0,
        character: { name: 'Nerevarine' },
        storyFacts: [{ id: 'fact-1', value: 'true' }],
        activityOccurrences: [{ scopeKey: 'sleep', completed: 1 }],
        acceptedActivityPlan: { revision: 1, payload: { kind: 'rest' } },
        content: { title: 'Morrowind' },
        location: 'Seyda Neen',
        gameSecond: 100,
        clock: {
          elapsedGameSeconds: 100,
          remainder: { numerator: '0', denominator: '1' },
        },
        clockAnchorAt: new Date(),
        clockPace: { kind: 'real-time', ratio: 1 },
        holds: [{ kind: 'decision', id: holdId }],
        offer: {
          id: offerId,
          source: 'npc',
          meaning: 'invite',
          payload: { revision: 1 },
        },
        situationAuthorization: {
          version: 2,
          offerId,
          activityAccess: { kind: 'none' },
          preparedPlans: [],
        },
        activeActivityId: activityB,
        activeActionOperationId: executionId,
        worldConditions: [],
      });

      await database.db.insert(gameActivity).values([
        {
          id: activityB,
          storyId,
          plan: { revision: 2, payload: { kind: 'travel' } },
          state: 'running',
          boundariesSettled: 1,
          revision: 4,
          progress: { phase: 'en-route' },
        },
        {
          id: activityA,
          storyId,
          plan: { revision: 1, payload: { kind: 'rest' } },
          state: 'paused',
          boundariesSettled: 0,
          revision: 1,
          progress: { phase: 'idle' },
        },
      ]);

      await database.db.insert(worldObligation).values([
        {
          id: obligationB,
          storyId,
          revision: 2,
          definition: { kind: 'rent-due' },
          dueGameSecond: 500,
          state: 'pending',
        },
        {
          id: obligationA,
          storyId,
          revision: 1,
          definition: { kind: 'courier' },
          dueGameSecond: 250,
          state: 'fired',
          firedAtGameSecond: 260,
        },
      ]);

      await database.db.insert(gameOffer).values({
        id: gameOfferId,
        storyId,
        narrativeRevision: 7,
        plans: { prepared: [{ key: 'talk' }] },
      });

      await database.db.insert(gameActionExecution).values({
        operationId: executionId,
        storyId,
        offerId: gameOfferId,
        actionKey: 'travel-road',
        baseRevision: 7,
        offer: { id: gameOfferId },
        plan: { revision: 1, payload: { steps: 3 } },
        pendingResolution: { kind: 'wait', remainingGameSeconds: 30 },
        startGameSecond: 90,
        targetGameSecond: 200,
        state: 'running',
        revision: 2,
      });

      await database.db.insert(storyItem).values({
        storyId,
        key: 'boots',
        label: 'Boots of Blinding Speed',
        holderKey: 'player',
      });

      const state = await database.db.transaction((tx: Transaction) =>
        readSceneAfterState(tx, storyId),
      );
      assert.ok(state.campaign);
      assert.equal(state.campaign.gameSecond, 100);
      assert.equal(state.campaign.location, 'Seyda Neen');
      assert.deepEqual(state.campaign.holds, [
        { kind: 'decision', id: holdId },
      ]);
      assert.equal(state.activities.length, 2);
      assert.equal(state.activities[0]?.id, firstActivityId);
      assert.equal(state.activities[1]?.id, secondActivityId);
      assert.equal(state.worldObligations[0]?.id, firstObligationId);
      assert.equal(state.worldObligations[1]?.id, secondObligationId);
      assert.equal(state.gameOffers[0]?.id, gameOfferId);
      assert.equal(state.actionExecutions[0]?.operationId, executionId);
      assert.equal(state.actionExecutions[0]?.state, 'running');
      assert.deepEqual(state.actionExecutions[0]?.pendingResolution, {
        kind: 'wait',
        remainingGameSeconds: 30,
      });
      assert.deepEqual(state.storyItems, [
        { key: 'boots', label: 'Boots of Blinding Speed', holderKey: 'player' },
      ]);
    },
  );

  await t.test('excludes rows from a different storyId', async () => {
    const ownerId = await insertOwner();
    const storyId = await insertStory(ownerId);
    const otherStoryId = await insertStory(ownerId);
    const foreignActivity = randomUUID();

    await database.db.insert(gameActivity).values({
      id: foreignActivity,
      storyId: otherStoryId,
      plan: { revision: 1 },
      state: 'running',
      boundariesSettled: 0,
      revision: 0,
      progress: {},
    });

    const state = await database.db.transaction((tx: Transaction) =>
      readSceneAfterState(tx, storyId),
    );
    assert.equal(state.activities.length, 0);
  });

  await t.test('over-cap holds throw state_not_representable', async () => {
    const ownerId = await insertOwner();
    const storyId = await insertStory(ownerId);
    const holds = Array.from({ length: 21 }, () => ({
      kind: 'decision' as const,
      id: randomUUID(),
    }));
    await database.db.insert(campaign).values({
      storyId,
      settingsRevision: 1,
      locked: 0,
      character: null,
      storyFacts: [],
      activityOccurrences: [],
      location: null,
      gameSecond: 0,
      clock: {
        elapsedGameSeconds: 0,
        remainder: { numerator: '0', denominator: '1' },
      },
      clockAnchorAt: new Date(),
      clockPace: { kind: 'instant' },
      holds,
      situationAuthorization: {
        version: 2,
        offerId: null,
        activityAccess: { kind: 'none' },
        preparedPlans: [],
      },
      worldConditions: [],
    });

    await assert.rejects(
      () =>
        database.db.transaction((tx: Transaction) =>
          readSceneAfterState(tx, storyId),
        ),
      (error: unknown) => {
        assert.ok(error instanceof SceneAfterStateError);
        assert.equal(error.code, 'state_not_representable');
        return true;
      },
    );
  });

  await database.close();
});
