import assert from 'node:assert/strict';
import test from 'node:test';
import {
  sceneCheckpointSchema,
  stableNamespacedDocumentId,
} from '@offscreen/documents';
import { mapV2ForkState } from '../dist/stories/fork-state.js';
import {
  ForkReconstructError,
  v2ForkRowPlan,
} from '../dist/stories/fork-reconstruct.js';

const PARENT_STORY_ID = '11111111-1111-4111-8111-111111111111';
const PARENT_PASSAGE_ID = '22222222-2222-4222-8222-222222222222';
const OLDER_PARENT_PASSAGE_ID = '33333333-3333-4333-8333-333333333333';
const FORK_STORY_ID = '99999999-9999-4999-8999-999999999999';
const INTERACTION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OFFER_ID = '44444444-4444-4444-8444-444444444444';
const ACTIVITY_ID = '55555555-5555-4555-8555-555555555555';
const OBLIGATION_ID = '66666666-6666-4666-8666-666666666666';
const ACTION_ID = '77777777-7777-4777-8777-777777777777';
const STORYTELLER_GENERATION_ID = '88888888-8888-4888-8888-888888888888';
const EVIDENCE_SOURCE_ID = '99998888-7777-4777-8777-666655554444';
const STABLE_ROOT_HASH = 'ab'.repeat(32);
const SOURCE_SCENE_SEQUENCE = 37;

const versionedPayload = { version: 1, body: { phase: 'open' } };

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

function scene37V2Checkpoint(fictionalPatch = {}) {
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
      character: null,
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
      acceptedActivityPlan: versionedPayload,
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
          plan: versionedPayload,
          progress: versionedPayload,
        },
      ],
      worldObligations: [
        {
          id: OBLIGATION_ID,
          revision: 1,
          state: 'active',
          dueGameSecond: 200_000,
          firedAtGameSecond: null,
          definition: versionedPayload,
        },
      ],
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
  assert.equal(
    plan.story.continuityNotes[0].sources[0],
    EVIDENCE_SOURCE_ID,
  );
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
  assert.throws(() => v2ForkRowPlan(mapped, SOURCE_SCENE_SEQUENCE), (error) => {
    assert.ok(error instanceof ForkReconstructError);
    assert.equal(error.code, 'obligation_not_rehomable');
    return true;
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
  assert.throws(() => v2ForkRowPlan(mapped, SOURCE_SCENE_SEQUENCE), (error) => {
    assert.ok(error instanceof ForkReconstructError);
    assert.equal(error.code, 'action_not_rehomable');
    return true;
  });
});