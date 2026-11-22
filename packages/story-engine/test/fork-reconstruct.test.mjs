import assert from 'node:assert/strict';
import test from 'node:test';
import {
  sceneCheckpointSchema,
  stableNamespacedDocumentId,
} from '@offscreen/documents';
import {
  immediateActionPlanSchema,
  situationAuthorizationSchema,
} from '@offscreen/game/immediate-actions';
import {
  initialActivityProgress,
  resolvedActivityPlanSchema,
} from '@offscreen/game/activities';
import { worldObligationSchema } from '@offscreen/game/world-obligations';
import { mapV2ForkState } from '../dist/stories/fork-state.js';
import {
  ForkReconstructError,
  v2ForkRowPlan,
} from '../dist/stories/fork-reconstruct.js';
import { projectHistoricalSituationAuthorization } from '../dist/stories/scene-checkpoint-v2.js';

export const PARENT_STORY_ID = '11111111-1111-4111-8111-111111111111';
export const PARENT_PASSAGE_ID = '22222222-2222-4222-8222-222222222222';
const OLDER_PARENT_PASSAGE_ID = '33333333-3333-4333-8333-333333333333';
const FORK_STORY_ID = '99999999-9999-4999-8999-999999999999';
const INTERACTION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OFFER_ID = '44444444-4444-4444-8444-444444444444';
const ACTIVITY_ID = '55555555-5555-4555-8555-555555555555';
const OBLIGATION_ID = '66666666-6666-4666-8666-666666666666';
const ACTION_ID = '77777777-7777-4777-8777-777777777777';
const STORYTELLER_GENERATION_ID = '88888888-8888-4888-8888-888888888888';
const EVIDENCE_SOURCE_ID = '99998888-7777-4777-8777-666655554444';
export const STABLE_ROOT_HASH = 'ab'.repeat(32);
export const SOURCE_SCENE_SEQUENCE = 37;

const versionedPayload = { version: 1, body: { phase: 'open' } };

function scene37Character() {
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
    skills: [{ id: 'perception', label: 'Perception' }],
    proficientSkills: ['perception'],
    proficiencyBonus: 2,
    hp: 20,
    maxHp: 20,
    facts: [],
    quantities: [],
  };
}

const activityAction = {
  id: 'coastal-watch',
  label: 'Watch the coast',
  description: 'Keep watch along the Seyda Neen road.',
  requires: [],
  capacity: 'primary',
  process: {
    kind: 'contribution.v1',
    progressLabel: 'Coastal watch',
    requiredContribution: 10,
    everyFictionalSeconds: 5,
    attempt: {
      check: {
        rule: 'srd-5.2.1-subset.v1',
        purpose: 'Watch the coast',
        skill: 'perception',
        ability: 'wisdom',
        dc: 10,
        advantage: false,
        disadvantage: false,
        modifiers: [],
      },
      successContribution: 2,
      failureContribution: 0,
      successText: 'You notice more of the road.',
      failureText: 'The watch passes quietly.',
    },
  },
  conditionPolicy: { kind: 'admission-only' },
  occurrence: { kind: 'unbounded' },
  completionFollowUp: 'scene',
  checks: [],
  completion: { text: 'The watch ends.', effects: [] },
};

const activityPlanBody = resolvedActivityPlanSchema.parse({
  version: 6,
  action: activityAction,
  settingsRevision: 1,
  resolvedThroughGameSecond: 0,
});

const activityPlan = { version: 1, body: activityPlanBody };
const activityProgress = {
  version: 1,
  body: initialActivityProgress(activityAction),
};

const immediatePlanBody = immediateActionPlanSchema.parse({
  version: 1,
  key: 'travel-leg',
  label: 'Continue travel',
  intention: 'Walk the coastal leg toward Seyda Neen.',
  risk: null,
  evidence: [],
  requires: [],
  requiresStory: [],
  requiresQuantities: [],
  resolution: {
    kind: 'automatic',
    fictionalDurationSeconds: 3600,
    outcome: {
      text: 'The road bends onward.',
      effects: [],
      declarations: [],
      worldEffects: [],
    },
  },
});

const immediatePlan = { version: 1, body: immediatePlanBody };

const obligationDefinitionBody = worldObligationSchema.parse({
  id: OBLIGATION_ID,
  revision: 1,
  source: { id: 'ships-delayed', revision: 1 },
  label: 'Ships delayed',
  visibility: { kind: 'exact' },
  consequence: {
    kind: 'condition.set.v1',
    condition: { id: 'ships-delayed', label: 'Ships delayed', value: true },
  },
  followUp: 'report',
  dueGameSecond: 200_000,
  originGameSecond: 119_000,
});

const obligationDefinition = { version: 1, body: obligationDefinitionBody };

export const selectedProcessPlan = immediateActionPlanSchema.parse({
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
            purpose: 'Continue',
            skill: 'athletics',
            ability: 'strength',
            dc: 10,
            advantage: false,
            disadvantage: false,
            modifiers: [],
          },
          successContribution: 1,
          failureContribution: 0,
          successText: 'You make progress.',
          failureText: 'Little changes.',
        },
      },
      conditionPolicy: { kind: 'admission-only' },
      occurrence: { kind: 'unbounded' },
      completionFollowUp: 'scene',
      checks: [],
      completion: { text: 'Done.', effects: [] },
    },
  },
});

export const liveSelectedAuthorization = situationAuthorizationSchema.parse({
  version: 2,
  offerId: OFFER_ID,
  activityAccess: {
    kind: 'selected',
    actionKeys: ['continue-over-time'],
  },
  preparedPlans: [selectedProcessPlan],
});

export function wrappedSelectedSituationAuthorization() {
  return {
    version: 2,
    offerId: OFFER_ID,
    activityAccess: {
      version: 1,
      body: liveSelectedAuthorization.activityAccess,
    },
    preparedPlans: liveSelectedAuthorization.preparedPlans.map((plan) => ({
      version: 1,
      body: plan,
    })),
  };
}

const offerBody = {
  id: OFFER_ID,
  nodes: [
    {
      id: 'travel',
      parent: null,
      label: 'Continue travel',
      description: 'Keep walking the coastal road.',
      risk: null,
      action: {
        kind: 'attempt',
        timing: { kind: 'finite', fictionalSeconds: 7200 },
      },
    },
  ],
};

function forkId(forkStoryId, kind, sourceId) {
  return stableNamespacedDocumentId('fork', forkStoryId, `${kind}:${sourceId}`);
}

export function scene37V2Checkpoint(fictionalPatch = {}) {
  const parsed = sceneCheckpointSchema.parse({
    format: 'offscreen.scene-checkpoint.v2',
    stateSchemaVersion: 2,
    storyId: PARENT_STORY_ID,
    passageId: PARENT_PASSAGE_ID,
    sceneSequence: SOURCE_SCENE_SEQUENCE,
    transitionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    source: 'test.scene-37.v1',
    premise: null,
    storyteller: { id: 'test-profile', revision: 1 },
    execution: null,
    usagePolicy: null,
    canon: { rootHash: STABLE_ROOT_HASH, rootRevision: 4 },
    ancestor: { storyId: null, rootHash: null, rootRevision: null },
    pins: {
      worlds: [],
      rules: null,
      start: null,
      storytellerProfile: { id: 'test-profile', revision: 1 },
    },
    fictionalState: {
      mechanicsAbsent: false,
      character: scene37Character(),
      items: [{ key: 'sword-a', label: 'Sword', holderKey: 'character' }],
      storyFacts: [],
      activityOccurrences: [],
      location: 'Vvardenfell coast',
      gameSecond: 120_000,
      clock: {
        elapsedGameSeconds: 120_000,
        remainder: { numerator: '1', denominator: '4' },
      },
      pace: {
        kind: 'rate',
        fictionalSeconds: 10,
        realSeconds: 3600,
      },
      settingsRevision: 1,
      content: null,
      continuityNotes: [
        {
          key: 'quay-rumor',
          text: 'The dockhands whisper about delayed ships.',
          sources: [EVIDENCE_SOURCE_ID],
          revision: 1,
        },
      ],
      activeSceneScope: {
        version: 'active-scene-anchor.v1',
        fromSequence: 30,
        requiredPassageIds: [PARENT_PASSAGE_ID, OLDER_PARENT_PASSAGE_ID],
        recallCues: [
          {
            documentId: EVIDENCE_SOURCE_ID,
            reason: 'thread',
          },
        ],
      },
      holds: [
        { kind: 'decision', id: OFFER_ID },
        { kind: 'world-obligation', id: OBLIGATION_ID },
        { kind: 'storyteller', id: STORYTELLER_GENERATION_ID },
      ],
      offer: {
        id: OFFER_ID,
        source: 'scene-37-choice',
        meaning: 'continue',
        payload: {
          version: 1,
          body: {
            offer: offerBody,
            plans: versionedPayload,
          },
        },
      },
      acceptedActivityPlan: null,
      activeActivityId: ACTIVITY_ID,
      activeActionOperationId: ACTION_ID,
      situationAuthorization: {
        version: 2,
        offerId: OFFER_ID,
        activityAccess: { kind: 'none' },
        preparedPlans: [],
      },
      worldConditions: [
        {
          id: 'ships-delayed',
          label: 'Ships delayed',
          value: true,
          provenance: {
            kind: 'world-obligation',
            obligationId: OBLIGATION_ID,
          },
          setAtGameSecond: 119_000,
        },
      ],
      activeActivities: [
        {
          id: ACTIVITY_ID,
          state: 'running',
          revision: 1,
          boundariesSettled: 0,
          plan: activityPlan,
          progress: activityProgress,
        },
      ],
      worldObligations: [
        {
          id: OBLIGATION_ID,
          revision: 1,
          state: 'pending',
          dueGameSecond: 200_000,
          firedAtGameSecond: null,
          definition: obligationDefinition,
        },
      ],
      activeAction: {
        id: ACTION_ID,
        offerId: OFFER_ID,
        actionKey: 'travel-leg',
        baseRevision: 1,
        offer: immediatePlan,
        plan: immediatePlan,
        pendingResolution: null,
        status: 'running',
        revision: 0,
        startGameSecond: 118_000,
        targetGameSecond: 125_000,
        target: { kind: 'entity', id: 'npc-guide' },
      },
      ...fictionalPatch,
    },
    passage: {
      response: null,
      responseSource: null,
      initialItems: null,
      effects: [],
      decisionPlan: null,
      waitPlan: null,
      controlRevision: 0,
      content: {
        version: 1,
        title: 'Scene 37',
        paragraphs: ['The road bends toward Seyda Neen.'],
      },
      contentDocumentHash: null,
      interaction: {
        id: INTERACTION_ID,
        specification: {
          kind: 'choice.v1',
          prompt: 'The ferry horn sounds. What do you do?',
          options: [{ id: 'wait', label: 'Wait for the ferry' }],
        },
      },
    },
  });
  assert.equal(parsed.format, 'offscreen.scene-checkpoint.v2');
  return parsed;
}

test('v2ForkRowPlan preserves lineage and remaps playable rows', () => {
  const mapped = mapV2ForkState({
    checkpoint: scene37V2Checkpoint(),
    sourceStoryId: PARENT_STORY_ID,
    forkStoryId: FORK_STORY_ID,
  });
  const plan = v2ForkRowPlan(mapped, SOURCE_SCENE_SEQUENCE);
  const childOfferId = forkId(FORK_STORY_ID, 'offer', OFFER_ID);

  assert.equal(plan.story.forkedFromSequence, SOURCE_SCENE_SEQUENCE);
  assert.equal(plan.story.forkedFromPassageId, PARENT_PASSAGE_ID);
  assert.equal(plan.passage.sequence, 1);
  assert.equal(plan.story.documentRootHash, STABLE_ROOT_HASH);
  assert.equal(plan.story.documentRootRevision, 4);
  assert.equal(plan.passage.sourceGenerationId, null);
  assert.equal(plan.passage.sourceGenerationPart, null);
  assert.equal(plan.action?.preparationGenerationId, null);
  assert.equal(plan.story.continuityNotes[0].sources[0], EVIDENCE_SOURCE_ID);
  assert.deepEqual(plan.campaign.offer, {
    id: childOfferId,
    nodes: offerBody.nodes,
  });
  assert.ok(plan.offer);
  assert.equal(plan.offer.id, childOfferId);
  assert.equal(plan.campaign.activeActionOperationId, plan.action?.operationId);
  const storytellerHold = plan.campaign.holds.find(
    (hold) => hold.kind === 'storyteller',
  );
  assert.ok(storytellerHold);
  assert.equal(
    storytellerHold.generationId,
    forkId(FORK_STORY_ID, 'held-generation', STORYTELLER_GENERATION_ID),
  );
  assert.notEqual(storytellerHold.generationId, STORYTELLER_GENERATION_ID);
});

test('v2ForkRowPlan rejects null obligation due time', () => {
  const mapped = mapV2ForkState({
    checkpoint: scene37V2Checkpoint({
      worldObligations: [
        {
          id: OBLIGATION_ID,
          revision: 1,
          state: 'active',
          dueGameSecond: null,
          firedAtGameSecond: null,
          definition: versionedPayload,
        },
      ],
    }),
    sourceStoryId: PARENT_STORY_ID,
    forkStoryId: FORK_STORY_ID,
  });
  assert.throws(
    () => v2ForkRowPlan(mapped, SOURCE_SCENE_SEQUENCE),
    (error) => {
      assert.ok(error instanceof ForkReconstructError);
      assert.equal(error.code, 'obligation_not_rehomable');
      return true;
    },
  );
});

test('v2ForkRowPlan projects wrapped selected authorization into live campaign form', () => {
  const mapped = mapV2ForkState({
    checkpoint: scene37V2Checkpoint({
      situationAuthorization: wrappedSelectedSituationAuthorization(),
    }),
    sourceStoryId: PARENT_STORY_ID,
    forkStoryId: FORK_STORY_ID,
  });
  const plan = v2ForkRowPlan(mapped, SOURCE_SCENE_SEQUENCE);
  assert.equal(
    plan.campaign.situationAuthorization.activityAccess.kind,
    'selected',
  );
  assert.deepEqual(
    plan.campaign.situationAuthorization.activityAccess,
    liveSelectedAuthorization.activityAccess,
  );
  assert.equal(plan.campaign.situationAuthorization.preparedPlans.length, 1);
  assert.deepEqual(
    plan.campaign.situationAuthorization.preparedPlans[0],
    selectedProcessPlan,
  );
  assert.notEqual(
    plan.campaign.situationAuthorization.activityAccess.version,
    1,
    'live activityAccess must not remain versioned-open payload',
  );
});

test('v2ForkRowPlan still preserves none authorization without wrapping', () => {
  const mapped = mapV2ForkState({
    checkpoint: scene37V2Checkpoint(),
    sourceStoryId: PARENT_STORY_ID,
    forkStoryId: FORK_STORY_ID,
  });
  const plan = v2ForkRowPlan(mapped, SOURCE_SCENE_SEQUENCE);
  assert.deepEqual(plan.campaign.situationAuthorization.activityAccess, {
    kind: 'none',
  });
  assert.deepEqual(plan.campaign.situationAuthorization.preparedPlans, []);
});

test('v2ForkRowPlan rejects malformed wrapped selected authorization', () => {
  const mapped = mapV2ForkState({
    checkpoint: scene37V2Checkpoint({
      situationAuthorization: {
        version: 2,
        offerId: OFFER_ID,
        activityAccess: {
          version: 1,
          body: { kind: 'selected', actionKeys: [] },
        },
        preparedPlans: [],
      },
    }),
    sourceStoryId: PARENT_STORY_ID,
    forkStoryId: FORK_STORY_ID,
  });
  assert.throws(
    () => v2ForkRowPlan(mapped, SOURCE_SCENE_SEQUENCE),
    (error) => error?.name === 'ZodError',
  );
});

test('raw fictional authorization fails live reconstruction round-trip', () => {
  const checkpoint = scene37V2Checkpoint({
    situationAuthorization: wrappedSelectedSituationAuthorization(),
  });
  const fictional = checkpoint.fictionalState;
  assert.equal(fictional.mechanicsAbsent, false);
  const projected = projectHistoricalSituationAuthorization(
    fictional.situationAuthorization,
  );
  assert.notDeepEqual(
    fictional.situationAuthorization.activityAccess,
    projected.activityAccess,
  );
  assert.throws(() => {
    situationAuthorizationSchema.parse({
      ...fictional.situationAuthorization,
      activityAccess: fictional.situationAuthorization.activityAccess,
    });
  });
});

test('v2ForkRowPlan rejects action with non-positive duration', () => {
  const mapped = mapV2ForkState({
    checkpoint: scene37V2Checkpoint({
      activeAction: {
        id: ACTION_ID,
        offerId: OFFER_ID,
        actionKey: 'travel-leg',
        baseRevision: 1,
        offer: versionedPayload,
        plan: versionedPayload,
        pendingResolution: null,
        status: 'running',
        revision: 0,
        startGameSecond: 118_000,
        targetGameSecond: 118_000,
        target: { kind: 'entity', id: 'npc-guide' },
      },
    }),
    sourceStoryId: PARENT_STORY_ID,
    forkStoryId: FORK_STORY_ID,
  });
  assert.throws(
    () => v2ForkRowPlan(mapped, SOURCE_SCENE_SEQUENCE),
    (error) => {
      assert.ok(error instanceof ForkReconstructError);
      assert.equal(error.code, 'action_not_rehomable');
      return true;
    },
  );
});
