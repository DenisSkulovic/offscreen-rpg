import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertV2PostStateMatches,
  SceneAfterStateError,
  toV2FictionalState,
  wrapValidatedDecisionPlan,
  wrapValidatedWaitPlan,
} from './scene-checkpoint-v2';
import type {
  SceneAfterState,
  SceneAfterStateCampaign,
} from './scene-after-state';

const OFFER_ID = '44444444-4444-4444-8444-444444444444';
const HOLD_OFFER_ID = '33333333-3333-4333-8333-333333333333';
const ACTIVITY_ID = '55555555-5555-4555-8555-555555555555';
const OBLIGATION_ID = '66666666-6666-4666-8666-666666666666';
const ACTION_ID = '77777777-7777-4777-8777-777777777777';
const NOTE_SOURCE = '88888888-8888-4888-8888-888888888888';

function minimalCampaign(
  overrides: Partial<SceneAfterStateCampaign> = {},
): SceneAfterStateCampaign {
  return {
    settingsRevision: 1,
    character: {
      name: 'Outlander',
      scores: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
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
      skills: [{ id: 'athletics', label: 'Athletics' }],
      proficientSkills: ['athletics'],
      proficiencyBonus: 2,
      facts: [],
      quantities: [],
    },
    storyFacts: [],
    activityOccurrences: [],
    acceptedActivityPlan: null,
    content: null,
    location: null,
    gameSecond: 0,
    clock: {
      elapsedGameSeconds: 0,
      remainder: { numerator: '0', denominator: '1' },
    },
    clockPace: { kind: 'instant' },
    holds: [],
    offer: null,
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

function emptyAfterState(
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

test('toV2FictionalState maps mechanics-absent narrative-only state', () => {
  const fictional = toV2FictionalState(
    emptyAfterState({
      continuityNotes: [],
      activeSceneScope: {
        version: 'active-scene-anchor.v1',
        fromSequence: 1,
        requiredPassageIds: ['22222222-2222-4222-8222-222222222222'],
        recallCues: [],
      },
    }),
  );
  assert.equal(fictional.mechanicsAbsent, true);
  assert.deepEqual(fictional.continuityNotes, []);
  assert.equal(fictional.activeSceneScope?.version, 'active-scene-anchor.v1');
});

test('toV2FictionalState maps active choice, notes, and pending action', () => {
  const afterState = emptyAfterState({
    continuityNotes: [
      {
        key: 'quay-rumor',
        text: 'The dockhands whisper about delayed ships.',
        sources: [NOTE_SOURCE],
        revision: 1,
      },
    ],
    activeSceneScope: {
      version: 'active-scene-anchor.v1',
      fromSequence: 2,
      requiredPassageIds: ['22222222-2222-4222-8222-222222222222'],
      recallCues: [],
    },
    storyItems: [{ key: 'sword-a', label: 'Sword', holderKey: 'character' }],
    campaign: minimalCampaign({
      holds: [
        {
          kind: 'decision',
          offerId: HOLD_OFFER_ID,
          reason: 'player-choice',
        },
      ],
      offer: {
        id: OFFER_ID,
        source: 'test-offer',
        meaning: 'choose',
        payload: { revision: 1 },
      },
      situationAuthorization: {
        version: 2,
        offerId: OFFER_ID,
        activityAccess: { kind: 'none' },
        preparedPlans: [],
      },
      activeActivityId: ACTIVITY_ID,
      activeActionOperationId: ACTION_ID,
    }),
    activities: [
      {
        id: ACTIVITY_ID,
        plan: { revision: 1, payload: { phase: 'open' } },
        state: 'running',
        boundariesSettled: 2,
        revision: 1,
        progress: { phase: 'halfway' },
      },
    ],
    worldObligations: [
      {
        id: OBLIGATION_ID,
        revision: 1,
        definition: { kind: 'rent-due' },
        dueGameSecond: 120,
        state: 'active',
        firedAtGameSecond: null,
      },
    ],
    gameOffers: [
      {
        id: OFFER_ID,
        narrativeRevision: 1,
        plans: [{ key: 'strike', label: 'Strike' }],
      },
    ],
    actionExecutions: [
      {
        operationId: ACTION_ID,
        offerId: OFFER_ID,
        actionKey: 'strike',
        baseRevision: 1,
        offer: { id: OFFER_ID },
        plan: { revision: 1, payload: { steps: 2 } },
        pendingResolution: { kind: 'wait', remainingGameSeconds: 30 },
        preparationGenerationId: null,
        startGameSecond: 0,
        targetGameSecond: 120,
        state: 'running',
        revision: 0,
        target: { kind: 'entity', id: 'npc-1' },
      } as SceneAfterState['actionExecutions'][number] & {
        target: { kind: string; id: string };
      },
    ],
  });

  const fictional = toV2FictionalState(afterState);
  assert.equal(fictional.mechanicsAbsent, false);
  if (fictional.mechanicsAbsent) {
    throw new Error('expected present mechanics');
  }
  assert.equal(fictional.continuityNotes?.length, 1);
  assert.equal(fictional.continuityNotes?.[0]?.key, 'quay-rumor');
  assert.deepEqual(fictional.holds, [{ kind: 'decision', id: HOLD_OFFER_ID }]);
  assert.equal(fictional.offer?.id, OFFER_ID);
  const offerBody = fictional.offer?.payload.body as {
    plans?: { version: number };
  } | null;
  assert.equal(offerBody?.plans?.version, 1);
  assert.equal(fictional.activeActivities[0]?.boundariesSettled, 2);
  assert.equal(fictional.worldObligations[0]?.firedAtGameSecond, null);
  assert.equal(fictional.activeAction?.id, ACTION_ID);
  assert.equal(fictional.activeAction?.offerId, OFFER_ID);
  assert.equal(fictional.activeAction?.actionKey, 'strike');
  assert.equal(fictional.activeAction?.baseRevision, 1);
  assert.equal(fictional.activeAction?.status, 'running');
  assert.equal(fictional.activeAction?.targetGameSecond, 120);
  assert.equal(fictional.activeAction?.revision, 0);
  assert.equal(
    (fictional.activeAction?.plan as { version: number }).version,
    1,
  );
  assert.deepEqual(fictional.activeAction?.target, {
    kind: 'entity',
    id: 'npc-1',
  });
  assertV2PostStateMatches(fictional, toV2FictionalState(afterState));
});

test('wrapValidatedDecisionPlan and wrapValidatedWaitPlan require live schemas', () => {
  const decision = wrapValidatedDecisionPlan({
    version: 1,
    responseDurationMs: 60_000,
    defaultOptionId: 'stay',
    outcome: {
      content: {
        version: 1,
        title: 'After the choice',
        paragraphs: ['You remain.'],
      },
      interaction: null,
    },
  });
  assert.equal(decision.version, 1);
  assert.throws(() => wrapValidatedDecisionPlan({ kind: 'open' }));
  const wait = wrapValidatedWaitPlan({
    version: 1,
    realDurationMs: 60_000,
    gameDurationMs: 120_000,
    arrival: {
      content: {
        version: 1,
        title: 'After the wait',
        paragraphs: ['Time passes.'],
      },
      interaction: null,
    },
  });
  assert.equal(wait.version, 1);
});

test('missing offer envelope metadata is state_not_representable', () => {
  assert.throws(
    () =>
      toV2FictionalState(
        emptyAfterState({
          campaign: minimalCampaign({
            offer: { id: OFFER_ID, nodes: [] },
          }),
        }),
      ),
    (error: unknown) => {
      assert.ok(error instanceof SceneAfterStateError);
      assert.equal(error.code, 'state_not_representable');
      return true;
    },
  );
});

test('assertV2PostStateMatches rejects semantic drift', () => {
  const base = toV2FictionalState(
    emptyAfterState({
      campaign: minimalCampaign({
        holds: [
          {
            kind: 'decision',
            offerId: HOLD_OFFER_ID,
            reason: 'player-choice',
          },
        ],
        offer: {
          id: OFFER_ID,
          source: 'test-offer',
          meaning: 'choose',
          payload: { revision: 1 },
        },
        activeActivityId: ACTIVITY_ID,
      }),
      activities: [
        {
          id: ACTIVITY_ID,
          plan: { revision: 1 },
          state: 'running',
          boundariesSettled: 2,
          revision: 1,
          progress: {},
        },
      ],
    }),
  );
  assert.equal(base.mechanicsAbsent, false);
  if (base.mechanicsAbsent) {
    throw new Error('expected mechanics present');
  }

  const changedNote = {
    ...base,
    continuityNotes: [
      {
        key: 'drift',
        text: 'Different note text.',
        sources: [NOTE_SOURCE],
        revision: 1,
      },
    ],
  };
  assert.throws(
    () => assertV2PostStateMatches(base, changedNote),
    /v2_post_state_mismatch:continuityNotes/,
  );

  const baseOffer = base.offer;
  if (baseOffer == null) {
    throw new Error('expected offer on base state');
  }
  const changedOffer = {
    ...base,
    offer: { ...baseOffer, id: HOLD_OFFER_ID },
  };
  assert.throws(
    () => assertV2PostStateMatches(base, changedOffer),
    /v2_post_state_mismatch:offer/,
  );

  const firstActivity = base.activeActivities[0];
  if (firstActivity == null) {
    throw new Error('expected active activity on base state');
  }
  const changedActivity = {
    ...base,
    activeActivities: [
      {
        ...firstActivity,
        boundariesSettled: 0,
      },
    ],
  };
  assert.throws(
    () => assertV2PostStateMatches(base, changedActivity),
    /v2_post_state_mismatch:activeActivities/,
  );
});
