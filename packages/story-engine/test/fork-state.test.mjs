import assert from 'node:assert/strict';
import test from 'node:test';
import {
  sceneCheckpointSchema,
  stableNamespacedDocumentId,
} from '@offscreen/documents';
import { ForkStateError, mapV2ForkState } from '../dist/stories/fork-state.js';

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

function scene37V2Checkpoint(fictionalPatch = {}) {
  const parsed = sceneCheckpointSchema.parse({
    format: 'offscreen.scene-checkpoint.v2',
    stateSchemaVersion: 2,
    storyId: PARENT_STORY_ID,
    passageId: PARENT_PASSAGE_ID,
    sceneSequence: 37,
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

function forkId(forkStoryId, kind, sourceId) {
  return stableNamespacedDocumentId('fork', forkStoryId, `${kind}:${sourceId}`);
}

test('mapV2ForkState remaps scene-37 active boundary deterministically', () => {
  const source = scene37V2Checkpoint();
  const input = {
    checkpoint: source,
    sourceStoryId: PARENT_STORY_ID,
    forkStoryId: FORK_STORY_ID,
  };
  const first = mapV2ForkState(input);
  const second = mapV2ForkState(input);
  assert.deepEqual(second, first);

  const { checkpoint: child, identities } = first;
  assert.equal(child.storyId, FORK_STORY_ID);
  assert.equal(child.sceneSequence, 1);
  assert.equal(child.transitionId, null);
  assert.equal(child.canon.rootHash, STABLE_ROOT_HASH);
  assert.equal(child.canon.rootRevision, 4);
  assert.deepEqual(child.ancestor, {
    storyId: PARENT_STORY_ID,
    rootHash: STABLE_ROOT_HASH,
    rootRevision: 4,
  });

  assert.equal(
    child.fictionalState.continuityNotes[0].sources[0],
    EVIDENCE_SOURCE_ID,
  );
  assert.deepEqual(child.fictionalState.activeSceneScope.recallCues, [
    { documentId: EVIDENCE_SOURCE_ID, reason: 'thread' },
  ]);

  const childPassageId = forkId(FORK_STORY_ID, 'passage', PARENT_PASSAGE_ID);
  assert.equal(child.passageId, childPassageId);
  assert.notEqual(child.passageId, PARENT_PASSAGE_ID);
  assert.notEqual(child.passageId, OLDER_PARENT_PASSAGE_ID);
  assert.deepEqual(child.fictionalState.activeSceneScope.requiredPassageIds, [
    childPassageId,
  ]);
  assert.equal(child.fictionalState.activeSceneScope.fromSequence, 1);

  assert.equal(child.passage.interaction.id, forkId(FORK_STORY_ID, 'interaction', INTERACTION_ID));
  assert.equal(child.fictionalState.offer.id, forkId(FORK_STORY_ID, 'offer', OFFER_ID));
  assert.equal(
    child.fictionalState.offer.payload.body.offer.id,
    forkId(FORK_STORY_ID, 'offer', OFFER_ID),
  );
  assert.equal(
    child.fictionalState.activeActivities[0].id,
    forkId(FORK_STORY_ID, 'activity', ACTIVITY_ID),
  );
  assert.equal(
    child.fictionalState.worldObligations[0].id,
    forkId(FORK_STORY_ID, 'obligation', OBLIGATION_ID),
  );
  assert.equal(
    child.fictionalState.activeAction.id,
    forkId(FORK_STORY_ID, 'action', ACTION_ID),
  );
  assert.equal(child.fictionalState.activeAction.offerId, child.fictionalState.offer.id);

  const storytellerHold = child.fictionalState.holds.find(
    (hold) => hold.kind === 'storyteller',
  );
  assert.ok(storytellerHold);
  assert.notEqual(storytellerHold.id, STORYTELLER_GENERATION_ID);
  assert.equal(
    storytellerHold.id,
    forkId(FORK_STORY_ID, 'held-generation', STORYTELLER_GENERATION_ID),
  );

  assert.equal(identities.sourceStoryId, PARENT_STORY_ID);
  assert.equal(identities.passage.child, childPassageId);

  const serialized = JSON.stringify(child);
  assert.equal(serialized.includes(OFFER_ID), false);
  assert.equal(serialized.includes(EVIDENCE_SOURCE_ID), true);
});

test('payload offer id mismatch throws fork_identity_unmapped', () => {
  const source = scene37V2Checkpoint();
  const mismatchedOfferId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  source.fictionalState.offer.payload.body.offer.id = mismatchedOfferId;
  assert.throws(
    () =>
      mapV2ForkState({
        checkpoint: source,
        sourceStoryId: PARENT_STORY_ID,
        forkStoryId: FORK_STORY_ID,
      }),
    (error) => {
      assert.ok(error instanceof ForkStateError);
      assert.equal(error.code, 'fork_identity_unmapped');
      return true;
    },
  );
});

test('v1 checkpoint throws checkpoint_version_unsupported', () => {
  const v1 = {
    format: 'offscreen.scene-checkpoint.v1',
    stateSchemaVersion: 1,
    storyId: PARENT_STORY_ID,
    passageId: PARENT_PASSAGE_ID,
  };
  assert.throws(
    () =>
      mapV2ForkState({
        checkpoint: v1,
        sourceStoryId: PARENT_STORY_ID,
        forkStoryId: FORK_STORY_ID,
      }),
    (error) => {
      assert.ok(error instanceof ForkStateError);
      assert.equal(error.code, 'checkpoint_version_unsupported');
      return true;
    },
  );
});

test('activeActionOperationId without activeAction throws fork_identity_unmapped', () => {
  const source = scene37V2Checkpoint({
    activeAction: null,
    activeActionOperationId: ACTION_ID,
  });
  assert.throws(
    () =>
      mapV2ForkState({
        checkpoint: source,
        sourceStoryId: PARENT_STORY_ID,
        forkStoryId: FORK_STORY_ID,
      }),
    (error) => {
      assert.ok(error instanceof ForkStateError);
      assert.equal(error.code, 'fork_identity_unmapped');
      return true;
    },
  );
});