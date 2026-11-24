import assert from 'node:assert/strict';
import { test } from 'node:test';
import { campaignSettingsSchema } from '@offscreen/story-interface/campaign';
import { sceneCheckpointSchema } from '@offscreen/documents';
import {
  immediateActionPlanSchema,
  situationAuthorizationSchema,
} from '@offscreen/game/immediate-actions';
import {
  assertV2PostStateMatches,
  projectHistoricalSituationAuthorization,
  projectV2HistoricalCampaign,
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
const HISTORICAL_OFFER_ID = '11111111-1111-4111-8111-111111111111';
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

function envelopeOfferWithNodes() {
  return {
    id: OFFER_ID,
    source: 'test-offer',
    meaning: 'choose',
    payload: { revision: 1 },
    nodes: [
      {
        id: 'continue-root',
        parent: null,
        label: 'Continue',
        description: 'Keep working.',
        action: {
          kind: 'attempt' as const,
          timing: { kind: 'finite' as const, fictionalSeconds: 1 },
        },
      },
    ],
  };
}

function testCampaignSettings() {
  return campaignSettingsSchema.parse({
    revision: 1,
    creative: {
      profile: { id: 'test-narrator', revision: 1 },
      tone: 'A quay at dusk.',
      emphasis: 'balanced',
      surprises: 'occasional',
      tags: [],
      guidance: [],
    },
    pace: { kind: 'instant' },
    locked: false,
    rules: 'srd-5.2.1-subset.v1',
    risk: 'nonlethal',
  });
}

function minimalProcessPlan() {
  return immediateActionPlanSchema.parse({
    version: 1,
    key: 'continue-over-time',
    label: 'Continue over time',
    intention: 'Keep working under the admitted terms.',
    risk: null,
    evidence: [],
    requires: [],
    resolution: {
      kind: 'process',
      reuse: 'once',
      action: {
        id: 'continue-over-time',
        label: 'Continue over time',
        description: 'Keep working under the admitted terms.',
        requires: [],
        capacity: 'primary',
        process: {
          kind: 'contribution.v1',
          progressLabel: 'Progress',
          requiredContribution: 1,
          everyFictionalSeconds: 1,
          attempt: {
            check: {
              rule: 'srd-5.2.1-subset.v1',
              purpose: 'Continue the admitted work',
              skill: null,
              ability: 'wisdom',
              dc: 10,
              advantage: false,
              disadvantage: false,
              modifiers: [],
            },
            successContribution: 1,
            failureContribution: 0,
            successText: 'Progress is made.',
            failureText: 'Time passes without progress.',
          },
        },
        conditionPolicy: { kind: 'admission-only' },
        occurrence: { kind: 'unbounded' },
        completionFollowUp: 'quiet',
        checks: [],
        completion: { text: 'The work is complete.', effects: [] },
      },
    },
  });
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

const ANCHOR_PASSAGE = '22222222-2222-4222-8222-222222222222';
const RECALL_DOCUMENT = '99999999-9999-4999-8999-999999999999';

function historicalExecution(offerId: string) {
  return {
    operationId: ACTION_ID,
    offerId,
    actionKey: 'ask',
    baseRevision: 1,
    offer: { id: offerId },
    plan: { key: 'ask' },
    pendingResolution: null,
    preparationGenerationId: null,
    startGameSecond: 0,
    targetGameSecond: 1,
    state: 'settled',
    revision: 1,
  };
}

function offerPlans(state: ReturnType<typeof toV2FictionalState>) {
  if (state.mechanicsAbsent || state.offer == null) {
    throw new Error('expected a current offer snapshot');
  }
  const payload = state.offer.payload as unknown as {
    body: { plans: { body: unknown } | null };
  };
  return payload.body.plans?.body ?? null;
}

function stateWithOffers(
  gameOffers: SceneAfterState['gameOffers'],
  authorizationOfferId: string | null = OFFER_ID,
) {
  return emptyAfterState({
    campaign: minimalCampaign({
      offer: envelopeOfferWithNodes(),
      situationAuthorization: {
        version: 2,
        offerId: authorizationOfferId,
        activityAccess: { kind: 'none' },
        preparedPlans: [],
      },
    }),
    gameOffers,
    actionExecutions: [historicalExecution(HISTORICAL_OFFER_ID)],
  });
}

const currentOffer = {
  id: OFFER_ID,
  narrativeRevision: 2,
  plans: [{ key: 'current', label: 'Current' }],
};
const historicalOffer = {
  id: HISTORICAL_OFFER_ID,
  narrativeRevision: 1,
  plans: [{ key: 'historical', label: 'Historical' }],
};

test('current offer plans ignore historical offers that sort first by UUID', () => {
  const fictional = toV2FictionalState(
    stateWithOffers([historicalOffer, currentOffer]),
  );
  assert.deepEqual(offerPlans(fictional), currentOffer.plans);
});

test('current offer plans ignore historical offers that sort after by UUID', () => {
  const fictional = toV2FictionalState(
    stateWithOffers([currentOffer, historicalOffer]),
  );
  assert.deepEqual(offerPlans(fictional), currentOffer.plans);
  assertV2PostStateMatches(
    toV2FictionalState(stateWithOffers([historicalOffer, currentOffer])),
    fictional,
  );
});

test('mismatched authorization and campaign offer identity is not representable', () => {
  assert.throws(
    () =>
      toV2FictionalState(
        stateWithOffers([historicalOffer, currentOffer], HISTORICAL_OFFER_ID),
      ),
    (error: unknown) =>
      error instanceof SceneAfterStateError &&
      error.code === 'state_not_representable',
  );
});

test('toV2FictionalState supplies empty recall cues when an anchor omits them', () => {
  const fictional = toV2FictionalState(
    emptyAfterState({
      activeSceneScope: {
        version: 'active-scene-anchor.v1',
        fromSequence: 1,
        requiredPassageIds: [ANCHOR_PASSAGE],
      },
    }),
  );
  assert.deepEqual(fictional.activeSceneScope?.recallCues, []);
});

test('toV2FictionalState keeps an explicit empty recall cue list', () => {
  const fictional = toV2FictionalState(
    emptyAfterState({
      activeSceneScope: {
        version: 'active-scene-anchor.v1',
        fromSequence: 1,
        requiredPassageIds: [ANCHOR_PASSAGE],
        recallCues: [],
      },
    }),
  );
  assert.deepEqual(fictional.activeSceneScope?.recallCues, []);
});

test('toV2FictionalState preserves populated recall cues', () => {
  const fictional = toV2FictionalState(
    emptyAfterState({
      activeSceneScope: {
        version: 'active-scene-anchor.v1',
        fromSequence: 1,
        requiredPassageIds: [ANCHOR_PASSAGE],
        recallCues: [{ documentId: RECALL_DOCUMENT, reason: 'place' }],
      },
    }),
  );
  assert.deepEqual(fictional.activeSceneScope?.recallCues, [
    { documentId: RECALL_DOCUMENT, reason: 'place' },
  ]);
});

test('toV2FictionalState rejects a non-array recall cue field', () => {
  assert.throws(
    () =>
      toV2FictionalState(
        emptyAfterState({
          activeSceneScope: {
            version: 'active-scene-anchor.v1',
            fromSequence: 1,
            requiredPassageIds: [ANCHOR_PASSAGE],
            recallCues: 'place',
          },
        }),
      ),
    (error: unknown) =>
      error instanceof SceneAfterStateError &&
      error.message === 'state_not_representable',
  );
});

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

test('none authorization round-trips through checkpoint capture and historical decode', () => {
  const liveAuthorization = situationAuthorizationSchema.parse({
    version: 2,
    offerId: null,
    activityAccess: { kind: 'none' },
    preparedPlans: [],
  });
  const fictional = toV2FictionalState(
    emptyAfterState({
      campaign: minimalCampaign({ situationAuthorization: liveAuthorization }),
    }),
  );
  assert.equal(fictional.mechanicsAbsent, false);
  if (fictional.mechanicsAbsent) {
    throw new Error('expected mechanics present');
  }
  assert.deepEqual(fictional.situationAuthorization.activityAccess, {
    kind: 'none',
  });
  assert.deepEqual(fictional.situationAuthorization.preparedPlans, []);
  assert.deepEqual(
    projectHistoricalSituationAuthorization(fictional.situationAuthorization),
    liveAuthorization,
  );
  const view = projectV2HistoricalCampaign(fictional, testCampaignSettings());
  assert.deepEqual(view.activityAccess, liveAuthorization.activityAccess);
});

test('selected access and prepared process plans store versioned open payloads', () => {
  const processPlan = minimalProcessPlan();
  const liveAuthorization = situationAuthorizationSchema.parse({
    version: 2,
    offerId: OFFER_ID,
    activityAccess: {
      kind: 'selected',
      actionKeys: ['continue-over-time'],
    },
    preparedPlans: [processPlan],
  });
  const fictional = toV2FictionalState(
    emptyAfterState({
      campaign: minimalCampaign({
        offer: envelopeOfferWithNodes(),
        situationAuthorization: liveAuthorization,
      }),
      gameOffers: [
        {
          id: OFFER_ID,
          narrativeRevision: 1,
          plans: [{ key: 'continue-over-time', label: 'Continue' }],
        },
      ],
    }),
  );
  assert.equal(fictional.mechanicsAbsent, false);
  if (fictional.mechanicsAbsent) {
    throw new Error('expected mechanics present');
  }
  const checkpointAccess = fictional.situationAuthorization.activityAccess;
  assert.notEqual((checkpointAccess as { kind?: string }).kind, 'none');
  assert.equal((checkpointAccess as { version: number }).version, 1);
  assert.deepEqual(
    (checkpointAccess as { body: unknown }).body,
    liveAuthorization.activityAccess,
  );
  assert.equal(fictional.situationAuthorization.preparedPlans.length, 1);
  const checkpointPlan = fictional.situationAuthorization.preparedPlans[0];
  assert.equal(checkpointPlan?.version, 1);
  assert.deepEqual(checkpointPlan?.body, processPlan);
  assert.deepEqual(
    projectHistoricalSituationAuthorization(fictional.situationAuthorization),
    liveAuthorization,
  );
  const view = projectV2HistoricalCampaign(fictional, testCampaignSettings());
  assert.deepEqual(view.activityAccess, liveAuthorization.activityAccess);
  const replay = toV2FictionalState(
    emptyAfterState({
      campaign: minimalCampaign({
        offer: envelopeOfferWithNodes(),
        situationAuthorization: liveAuthorization,
      }),
      gameOffers: [
        {
          id: OFFER_ID,
          narrativeRevision: 1,
          plans: [{ key: 'continue-over-time', label: 'Continue' }],
        },
      ],
    }),
  );
  assertV2PostStateMatches(fictional, replay);
  const staged = sceneCheckpointSchema.safeParse({
    format: 'offscreen.scene-checkpoint.v2',
    stateSchemaVersion: 2,
    storyId: '11111111-1111-4111-8111-111111111111',
    passageId: '22222222-2222-4222-8222-222222222222',
    sceneSequence: 2,
    transitionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    source: 'test.story03s.v1',
    premise: null,
    storyteller: null,
    execution: null,
    usagePolicy: null,
    canon: { rootHash: null, rootRevision: 0 },
    ancestor: { storyId: null, rootHash: null, rootRevision: null },
    pins: {
      worlds: [],
      rules: null,
      start: null,
      storytellerProfile: null,
    },
    passage: {
      response: null,
      responseSource: null,
      initialItems: null,
      effects: [],
      decisionPlan: null,
      waitPlan: null,
      controlRevision: 0,
      content: { text: 'The road continues.' },
      contentDocumentHash: null,
      interaction: null,
    },
    fictionalState: fictional,
  });
  assert.equal(
    staged.success,
    true,
    staged.success ? '' : JSON.stringify(staged.error.issues),
  );
});

test('malformed wrapped situation authorization fails historical decode', () => {
  const fictional = toV2FictionalState(
    emptyAfterState({
      campaign: minimalCampaign({
        offer: envelopeOfferWithNodes(),
        situationAuthorization: situationAuthorizationSchema.parse({
          version: 2,
          offerId: OFFER_ID,
          activityAccess: {
            kind: 'selected',
            actionKeys: ['continue-over-time'],
          },
          preparedPlans: [minimalProcessPlan()],
        }),
      }),
      gameOffers: [
        {
          id: OFFER_ID,
          narrativeRevision: 1,
          plans: [{ key: 'continue-over-time', label: 'Continue' }],
        },
      ],
    }),
  );
  assert.equal(fictional.mechanicsAbsent, false);
  if (fictional.mechanicsAbsent) {
    throw new Error('expected mechanics present');
  }
  const badAccess = {
    ...fictional,
    situationAuthorization: {
      ...fictional.situationAuthorization,
      activityAccess: {
        version: 1 as const,
        body: { kind: 'selected', actionKeys: [] },
      },
    },
  };
  assert.throws(() =>
    projectHistoricalSituationAuthorization(badAccess.situationAuthorization),
  );
  assert.throws(() =>
    projectV2HistoricalCampaign(badAccess, testCampaignSettings()),
  );

  const badPlan = {
    ...fictional,
    situationAuthorization: {
      ...fictional.situationAuthorization,
      preparedPlans: [
        {
          version: 1 as const,
          body: {
            version: 1,
            key: 'linger',
            label: 'Linger',
            intention: 'Wait and listen.',
            risk: null,
            evidence: [],
            requires: [],
            resolution: {
              kind: 'automatic',
              fictionalDurationSeconds: 5,
              outcome: { text: 'Done.', effects: [] },
            },
          },
        },
      ],
    },
  };
  assert.throws(() =>
    projectHistoricalSituationAuthorization(badPlan.situationAuthorization),
  );
  assert.throws(() =>
    projectV2HistoricalCampaign(badPlan, testCampaignSettings()),
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
