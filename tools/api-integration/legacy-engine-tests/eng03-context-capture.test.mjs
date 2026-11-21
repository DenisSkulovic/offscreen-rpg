import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import {
  committedActionContextCaptureV1Schema,
  contextCapturePointerSchema,
  contextCaptureV1Schema,
  hashContextCapture,
  interruptedActionContextCaptureV1Schema,
  parseContextCapture,
  storytellerContextCaptureKind,
} from '../../../packages/story-engine/dist/storyteller/context-capture.js';
import { harborCompassTransferPlan } from '../../../packages/story-engine/dist/campaign/fixtures/item-transfer-plans.js';
import { canonicalRuleEvidence } from '../../../packages/story-engine/dist/storyteller/canonical-knowledge.js';
import {
  actionProjectedStateDigest,
  freezePendingActionResolution,
} from '../../../packages/story-engine/dist/campaign/action-overlap.js';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import {
  offlineExecution,
  storytellerTaskSchema,
} from '@offscreen/storyteller/tasks';
import { defaultWorldTimeDefinition } from '@offscreen/game/calendar';
import { contextInputSchema } from '@offscreen/storyteller/context';
import { prepareAdmittedStorytellerTask } from '../../../packages/story-engine/dist/storyteller/task-admission.js';

const profile = storytellerCatalogue.resolve({
  id: 'absurd-action-comedy',
  revision: 1,
});

const character = {
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

const plan = {
  version: 1,
  key: 'persuade-guard',
  label: 'Persuade the guard',
  intention: 'Talk past the harbor guard without drawing steel.',
  risk: null,
  evidence: [],
  requires: [],
  resolution: {
    kind: 'automatic',
    fictionalDurationSeconds: 5,
    outcome: {
      text: 'The guard lets you pass.',
      effects: [],
      declarations: [],
      worldEffects: [],
    },
  },
};

const offerId = randomUUID();
const offer = {
  id: offerId,
  nodes: [
    {
      id: 'persuade-guard',
      parent: null,
      label: 'Persuade the guard',
      description: 'Talk past the harbor guard.',
      action: {
        kind: 'attempt',
        timing: { kind: 'finite', fictionalSeconds: 5 },
      },
    },
  ],
};

const pending = freezePendingActionResolution({
  character,
  storyFacts: [],
  startGameSecond: 10,
  targetGameSecond: 15,
  resolution: {
    outcome: 'automatic',
    text: 'The guard lets you pass.',
    effects: [],
    declarations: [],
    roll: null,
    character,
    storyFacts: [],
    worldEffects: [],
  },
});

function baseCapture(overrides = {}) {
  const captureId = randomUUID();
  const operationId = randomUUID();
  const passageId = randomUUID();
  return {
    version: 1,
    captureId,
    storyId: randomUUID(),
    ownerId: 'owner-1',
    purpose: 'pending-consequence',
    operationId,
    passageId,
    narrativeRevision: 1,
    root: { hash: null, revision: 0 },
    sourcePassages: [
      {
        storage: 'inline',
        passageId,
        sequence: 1,
        contentHash: null,
        inlineContent: {
          version: 1,
          title: 'Harbor',
          paragraphs: ['Harbor fog.'],
        },
        response: null,
      },
    ],
    activeSceneScope: null,
    narrative: {
      premise: {
        title: 'Quay',
        premise: 'A foggy quay.',
        storytellingDirection: 'Keep it grounded.',
      },
      notes: [],
    },
    canonicalSelection: {
      ruleSections: canonicalRuleEvidence(['time']),
      campaignDocumentIds: [],
    },
    actorAndWorld: {
      character,
      storyFacts: [],
      itemHolders: [],
      worldConditions: [],
      commitments: [],
      offerAndAuthorization: {
        offer,
        selectedPlan: plan,
        authorization: {
          version: 2,
          offerId,
          activityAccess: { kind: 'none' },
        },
        activeActivityId: null,
      },
      clock: {
        gameSecond: 10,
        targetGameSecond: 15,
      },
    },
    settings: {
      revision: 1,
      capturedSettings: {
        revision: 1,
        creative: {
          profile: { id: profile.id, revision: profile.revision },
          tone: profile.tone,
          emphasis: 'balanced',
          surprises: 'occasional',
          tags: [],
          guidance: [],
        },
        pace: { kind: 'rate', fictionalSeconds: 1, realSeconds: 1 },
        time: defaultWorldTimeDefinition,
        locked: false,
        rules: 'srd-5.2.1-subset.v1',
        risk: 'nonlethal',
      },
      profile,
      execution: offlineExecution,
      effectiveUsagePolicy: null,
    },
    selected: {
      id: operationId,
      label: plan.label,
      intention: plan.intention,
    },
    acceptedPendingResult: pending,
    capturedAt: new Date().toISOString(),
    ...overrides,
  };
}

test('contextCaptureV1Schema accepts a minimal pending-consequence capture', () => {
  const parsed = contextCaptureV1Schema.parse(baseCapture());
  assert.equal(parsed.version, 1);
  assert.equal(parsed.purpose, 'pending-consequence');
  assert.match(hashContextCapture(parsed), /^[a-f0-9]{64}$/);
});

test('contextCaptureV1Schema rejects digest disagreement', () => {
  const capture = baseCapture();
  capture.acceptedPendingResult = {
    ...capture.acceptedPendingResult,
    projectedStateDigest: '0'.repeat(64),
  };
  assert.throws(
    () => contextCaptureV1Schema.parse(capture),
    /Pending action source\/projected digests disagree/,
  );
});

test('provisional kind constant is non-dispatchable capture kind', () => {
  assert.equal(storytellerContextCaptureKind, 'storyteller.context-capture.v1');
});

function baseCommittedCapture() {
  const captureId = randomUUID();
  const storyId = randomUUID();
  const operationId = randomUUID();
  const passageId = randomUUID();
  const digest = actionProjectedStateDigest({
    character,
    storyFacts: [],
    gameSecond: 15,
  });
  return {
    version: 1,
    captureId,
    storyId,
    ownerId: 'owner-1',
    purpose: 'consequence',
    sourceKind: 'action-receipt',
    operationId,
    passageId,
    narrativeRevision: 1,
    root: { hash: null, revision: 0 },
    sourcePassages: [
      {
        storage: 'inline',
        passageId,
        sequence: 1,
        contentHash: null,
        inlineContent: {
          version: 1,
          title: 'Harbor',
          paragraphs: ['Harbor fog.'],
        },
        response: null,
      },
    ],
    activeSceneScope: null,
    narrative: {
      premise: {
        title: 'Quay',
        premise: 'A foggy quay.',
        storytellingDirection: 'Keep it grounded.',
      },
      notes: [],
    },
    canonicalSelection: {
      ruleSections: canonicalRuleEvidence(['time']),
      campaignDocumentIds: [],
    },
    actorAndWorld: {
      character,
      storyFacts: [],
      itemHolders: [],
      worldConditions: [],
      activitySituation: {
        activityAccess: { kind: 'none' },
        activeActivityId: null,
        commitments: [],
      },
      gameSecond: 15,
      postSettlementStateDigest: digest,
    },
    settings: {
      revision: 1,
      capturedSettings: {
        revision: 1,
        creative: {
          profile: { id: profile.id, revision: profile.revision },
          tone: profile.tone,
          emphasis: 'balanced',
          surprises: 'occasional',
          tags: [],
          guidance: [],
        },
        pace: { kind: 'rate', fictionalSeconds: 1, realSeconds: 1 },
        time: defaultWorldTimeDefinition,
        locked: false,
        rules: 'srd-5.2.1-subset.v1',
        risk: 'nonlethal',
      },
      profile,
      execution: offlineExecution,
      effectiveUsagePolicy: null,
    },
    selected: {
      id: operationId,
      label: plan.label,
      intention: plan.intention,
    },
    acceptedReceipt: {
      operationId,
      storyId,
      offerId,
      actionKey: plan.key,
      baseRevision: 1,
      offer,
      plan,
      label: plan.label,
      intention: plan.intention,
      outcome: 'automatic',
      outcomeText: 'The guard lets you pass.',
      effects: [],
      declarations: [],
      roll: null,
    },
    capturedAt: '2026-11-14T16:00:00.000Z',
  };
}

test('committedActionContextCaptureV1Schema accepts action-receipt capture', () => {
  const parsed = committedActionContextCaptureV1Schema.parse(
    baseCommittedCapture(),
  );
  assert.equal(parsed.purpose, 'consequence');
  assert.equal(parsed.sourceKind, 'action-receipt');
  assert.equal(parseContextCapture(parsed).purpose, 'consequence');
  assert.match(hashContextCapture(parsed), /^[a-f0-9]{64}$/);
});

test('committed capture rejects digest mismatch', () => {
  const capture = baseCommittedCapture();
  capture.actorAndWorld = {
    ...capture.actorAndWorld,
    postSettlementStateDigest: '0'.repeat(64),
  };
  assert.throws(
    () => committedActionContextCaptureV1Schema.parse(capture),
    /Committed state digest mismatch/,
  );
});

function baseInterruptedCapture() {
  const captureId = randomUUID();
  const storyId = randomUUID();
  const operationId = randomUUID();
  const passageId = randomUUID();
  const eventId = randomUUID();
  const transferOfferId = randomUUID();
  const transferPlan = harborCompassTransferPlan;
  const transferOffer = {
    id: transferOfferId,
    nodes: [
      {
        id: transferPlan.key,
        parent: null,
        label: transferPlan.label,
        description: transferPlan.intention,
        action: {
          kind: 'attempt',
          timing: { kind: 'finite', fictionalSeconds: 10 },
        },
      },
    ],
  };
  const digest = actionProjectedStateDigest({
    character,
    storyFacts: [],
    gameSecond: 10,
  });
  return {
    version: 1,
    captureId,
    storyId,
    ownerId: 'owner-interrupt',
    purpose: 'consequence',
    sourceKind: 'action-interrupted',
    operationId,
    passageId,
    narrativeRevision: 1,
    root: { hash: null, revision: 0 },
    sourcePassages: [
      {
        storage: 'inline',
        passageId,
        sequence: 1,
        contentHash: null,
        inlineContent: {
          version: 1,
          title: 'Harbor',
          paragraphs: ['Harbor fog.'],
        },
        response: null,
      },
    ],
    activeSceneScope: null,
    narrative: {
      premise: {
        title: 'Harbor',
        premise: 'A foggy quay.',
        storytellingDirection: 'Keep it grounded.',
      },
      notes: [],
    },
    canonicalSelection: {
      ruleSections: canonicalRuleEvidence(['time']),
      campaignDocumentIds: [],
    },
    actorAndWorld: {
      character,
      storyFacts: [],
      itemHolders: [
        { key: 'brass-compass', label: 'Brass compass', holderKey: 'thief' },
      ],
      worldConditions: [],
      activitySituation: {
        activityAccess: { kind: 'none' },
        activeActivityId: null,
        commitments: [],
      },
      gameSecond: 10,
      postInterruptStateDigest: digest,
    },
    settings: {
      revision: 1,
      capturedSettings: {
        revision: 1,
        creative: {
          profile: { id: profile.id, revision: profile.revision },
          tone: profile.tone,
          emphasis: 'balanced',
          surprises: 'occasional',
          tags: [],
          guidance: [],
        },
        pace: { kind: 'rate', fictionalSeconds: 1, realSeconds: 1 },
        time: defaultWorldTimeDefinition,
        locked: false,
        rules: 'srd-5.2.1-subset.v1',
        risk: 'nonlethal',
      },
      profile,
      execution: offlineExecution,
      effectiveUsagePolicy: null,
    },
    selected: {
      id: operationId,
      label: transferPlan.label,
      intention: transferPlan.intention,
    },
    interruption: {
      kind: 'action-interrupted',
      cause: 'required-item-holder-changed',
      executionId: operationId,
      executionRevision: 1,
      eventId,
      eventGameSecond: 10,
      offerId: transferOfferId,
      actionKey: transferPlan.key,
      itemKeys: ['brass-compass'],
      executionOffer: transferOffer,
      executionPlan: transferPlan,
      factualText:
        'The accepted transfer could not complete; the required item was no longer available',
    },
    capturedAt: '2026-11-15T14:00:00.000Z',
  };
}

test('interruptedActionContextCaptureV1Schema accepts action-interrupted capture', () => {
  const parsed = interruptedActionContextCaptureV1Schema.parse(
    baseInterruptedCapture(),
  );
  assert.equal(parsed.purpose, 'consequence');
  assert.equal(parsed.sourceKind, 'action-interrupted');
  const routed = parseContextCapture(parsed);
  assert.equal(routed.sourceKind, 'action-interrupted');
  assert.match(hashContextCapture(parsed), /^[a-f0-9]{64}$/);
  const pointer = contextCapturePointerSchema.parse({
    version: 1,
    captureId: parsed.captureId,
    purpose: 'consequence',
    sourceKind: 'action-interrupted',
  });
  assert.equal(pointer.sourceKind, 'action-interrupted');
});

test('parseContextCapture keeps C1 action-receipt distinct from interrupted', () => {
  const committed = parseContextCapture(baseCommittedCapture());
  const interrupted = parseContextCapture(baseInterruptedCapture());
  assert.equal(committed.sourceKind, 'action-receipt');
  assert.equal(interrupted.sourceKind, 'action-interrupted');
  assert.throws(
    () =>
      parseContextCapture({
        ...baseCommittedCapture(),
        sourceKind: 'action-interrupted',
      }),
    /Invalid|Required|Unrecognized|interruption|expected/i,
  );
});

test('interrupted capture rejects forged success-style digest field', () => {
  const capture = baseInterruptedCapture();
  capture.actorAndWorld = {
    ...capture.actorAndWorld,
    postInterruptStateDigest: '0'.repeat(64),
  };
  assert.throws(
    () => interruptedActionContextCaptureV1Schema.parse(capture),
    /Interrupted state digest mismatch/,
  );
});

test('legacy pending-consequence tasks without capture rows still decode', () => {
  const passageId = randomUUID();
  const operationId = randomUUID();
  const context = contextInputSchema.parse({
    premise: {
      title: 'Quay',
      premise: 'A foggy quay.',
      storytellingDirection: 'Keep it grounded.',
    },
    current: {
      id: passageId,
      sequence: 1,
      content: {
        version: 1,
        title: 'Harbor',
        paragraphs: ['Harbor fog.'],
      },
      response: null,
    },
    items: [],
    selected: {
      id: operationId,
      label: plan.label,
      intention: plan.intention,
    },
    notes: [],
    evidence: [
      {
        id: passageId,
        sequence: 1,
        content: {
          version: 1,
          title: 'Harbor',
          paragraphs: ['Harbor fog.'],
        },
        response: null,
      },
    ],
    resolution: {
      character,
      storyFacts: [],
      gameSecond: 15,
      offer: null,
      receipts: [
        {
          id: operationId,
          outcome: 'automatic',
          text: 'The guard lets you pass.',
          roll: null,
          effects: [],
          declarations: [],
        },
      ],
    },
  });
  const prepared = prepareAdmittedStorytellerTask({
    task: 'pending-consequence',
    source: {
      storyId: randomUUID(),
      narrativeRevision: 1,
      passageId,
      executionId: operationId,
      targetGameSecond: 15,
      projectedStateDigest: pending.projectedStateDigest,
    },
    profile,
    execution: offlineExecution,
    context,
  });
  const legacy = storytellerTaskSchema.parse({
    ...prepared,
    inputVersion: 16,
    promptVersion: 'storyteller.v16',
  });
  assert.equal(legacy.task, 'pending-consequence');
  assert.equal(legacy.inputVersion, 16);
  // No capture companion is required for schema/runtime decode.
  assert.equal('captureId' in legacy, false);
});
