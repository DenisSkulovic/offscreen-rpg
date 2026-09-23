import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authorizeSituation,
  actionOverlapEligibility,
  consumePreparedActivityPlan,
  immediateActionContentSchema,
  immediateActionAvailable,
  resolveImmediateAction,
  rebindPreparedResume,
  validateActivityAccess,
  validateImmediateActionProposal,
} from '../dist/src/immediate-actions.js';
import { composeOpportunities } from '../dist/src/opportunities.js';
import { selectOfferAction } from '../dist/src/offers.js';
import { quantityEffectSchema } from '../dist/src/effects.js';

const character = {
  name: 'A microbe',
  scores: {
    strength: 8,
    dexterity: 12,
    constitution: 14,
    intelligence: 8,
    wisdom: 12,
    charisma: 8,
  },
  applicableAbilities: ['constitution', 'wisdom'],
  skills: [{ id: 'environment-sensing', label: 'Environmental sensing' }],
  proficientSkills: [],
  proficiencyBonus: 2,
  hp: 5,
  maxHp: 5,
  facts: [{ id: 'exposed', value: true }],
  quantities: [],
};

test('quantity effect storage remains backward compatible', () => {
  assert.equal(
    quantityEffectSchema.parse({
      kind: 'quantity.change.v1',
      quantityId: 'silver',
      delta: 1,
    }).delta,
    1,
  );
  assert.equal(
    quantityEffectSchema.parse({
      kind: 'quantity.change.v1',
      quantityId: 'silver',
      delta: -1,
    }).delta,
    -1,
  );
  assert.equal(
    quantityEffectSchema.parse({
      kind: 'quantity.change.v1',
      quantityId: 'silver',
      delta: 0,
    }).delta,
    0,
  );
});

test('finite action overlap eligibility fails closed around admitted boundaries', () => {
  assert.deepEqual(
    actionOverlapEligibility({
      resolutionKind: 'check',
      hasInterveningWorldObligation: false,
    }),
    { eligible: true },
  );
  assert.deepEqual(
    actionOverlapEligibility({
      resolutionKind: 'automatic',
      hasInterveningWorldObligation: true,
    }),
    { eligible: false, reason: 'intervening-world-obligation' },
  );
  assert.deepEqual(
    actionOverlapEligibility({
      resolutionKind: 'process',
      hasInterveningWorldObligation: false,
    }),
    { eligible: false, reason: 'unsupported-resolution' },
  );
});

const content = immediateActionContentSchema.parse({
  version: 1,
  id: 'test',
  plans: [
    {
      version: 1,
      key: 'contract',
      label: 'Contract',
      intention: 'Contract away from the disturbance.',
      risk: null,
      evidence: [],
      requires: [{ id: 'exposed', value: true }],
      resolution: {
        kind: 'automatic',
        fictionalDurationSeconds: 5,
        outcome: { text: 'The microbe contracts.', effects: [] },
      },
    },
  ],
});

test('proposal validation rejects zero-delta quantity effects', () => {
  const proposal = structuredClone(content.plans[0]);
  proposal.resolution.outcome.effects = [
    { kind: 'quantity.change.v1', quantityId: 'silver', delta: 0 },
  ];
  const result = validateImmediateActionProposal({
    proposal,
    character: {
      ...character,
      quantities: [{ id: 'silver', label: 'Silver', value: 1 }],
    },
    evidenceHandles: new Set(),
  });
  assert.equal(result.kind, 'rejected');
  assert.deepEqual(
    result.issues.map((issue) => issue.code),
    ['invalid-shape'],
  );
});

test('public offer contains no private resolution mechanics', () => {
  const { offer, plans } = composeOpportunities({
    id: '52a3f0b0-5405-4d58-a58e-a96759371852',
    content,
    character,
    busy: false,
  });
  assert.deepEqual(offer.nodes[0]?.action, {
    kind: 'attempt',
    timing: { kind: 'finite', fictionalSeconds: 5 },
  });
  assert.equal(
    offer.nodes[0]?.description,
    'Contract away from the disturbance.',
  );
  assert.equal(offer.nodes[0]?.risk, null);
  assert.equal(JSON.stringify(offer).includes('resolution'), false);
  assert.equal(plans[0]?.resolution.kind, 'automatic');
  assert.deepEqual(selectOfferAction(offer, ['contract']), {
    state: 'selected',
    actionKey: 'contract',
  });
});

test('immediate resolution returns one authoritative automatic outcome', () => {
  const resolved = resolveImmediateAction(
    character,
    [],
    content.plans[0],
    '52a3f0b0-5405-4d58-a58e-a96759371852',
    () => {
      throw new Error('Automatic action must not draw a die');
    },
  );
  assert.equal(resolved.outcome, 'automatic');
  assert.equal(resolved.roll, null);
  assert.equal(resolved.text, 'The microbe contracts.');
});

test('bounded action duration is explicit rather than inferred as zero', () => {
  const missingDuration = structuredClone(content.plans[0]);
  delete missingDuration.resolution.fictionalDurationSeconds;
  assert.equal(
    immediateActionContentSchema.safeParse({
      version: 1,
      id: 'missing-duration',
      plans: [missingDuration],
    }).success,
    false,
  );
});

test('immediate resolution selects one checked branch and applies it once', () => {
  const plan = {
    ...structuredClone(content.plans[0]),
    resolution: {
      kind: 'check',
      fictionalDurationSeconds: 5,
      check: {
        rule: 'srd-5.2.1-subset.v1',
        purpose: 'Sense a gradient',
        skill: 'environment-sensing',
        ability: 'wisdom',
        dc: 12,
        advantage: false,
        disadvantage: false,
        modifiers: [],
      },
      difficultyBasis: 'The signal is weak.',
      success: {
        text: 'Detected.',
        effects: [
          { kind: 'fact.set.v1', fact: { id: 'exposed', value: false } },
        ],
      },
      failure: { text: 'Not detected.', effects: [] },
    },
  };
  const resolved = resolveImmediateAction(
    character,
    [],
    plan,
    '52a3f0b0-5405-4d58-a58e-a96759371852',
    () => 15,
  );
  assert.equal(resolved.outcome, 'success');
  assert.equal(resolved.roll?.dice.length, 1);
  assert.deepEqual(resolved.character.facts, [{ id: 'exposed', value: false }]);
  assert.deepEqual(character.facts, [{ id: 'exposed', value: true }]);
});

test('story fact declaration is explicit, durable and separate from character facts', () => {
  const plan = immediateActionContentSchema.parse({
    version: 1,
    id: 'declaration-test',
    plans: [
      {
        ...structuredClone(content.plans[0]),
        evidence: ['p1'],
        resolution: {
          kind: 'automatic',
          fictionalDurationSeconds: 5,
          outcome: {
            text: 'The promise becomes established.',
            effects: [],
            declarations: [
              {
                fact: { id: 'gary-made-promise', value: true },
                evidence: ['p1'],
              },
            ],
          },
        },
      },
    ],
  }).plans[0];
  const source = '52a3f0b0-5405-4d58-a58e-a96759371852';
  const resolved = resolveImmediateAction(character, [], plan, source, () => 1);
  assert.deepEqual(resolved.storyFacts, [
    {
      id: 'gary-made-promise',
      value: true,
      declaredBy: source,
    },
  ]);
  assert.deepEqual(resolved.character.facts, character.facts);
});

test('proposal validation rejects unsupported or duplicate story declarations', () => {
  const proposal = {
    ...structuredClone(content.plans[0]),
    evidence: ['p1'],
    resolution: {
      kind: 'automatic',
      fictionalDurationSeconds: 5,
      outcome: {
        text: 'A claim is proposed.',
        effects: [],
        declarations: [
          {
            fact: { id: 'known-promise', value: true },
            evidence: ['missing'],
          },
        ],
      },
    },
  };
  const result = validateImmediateActionProposal({
    proposal,
    character,
    storyFacts: [
      {
        id: 'known-promise',
        value: true,
        declaredBy: '52a3f0b0-5405-4d58-a58e-a96759371852',
      },
    ],
    evidenceHandles: new Set(['p1']),
  });
  assert.equal(result.kind, 'rejected');
  assert.deepEqual(
    result.issues.map((issue) => issue.code),
    ['unknown-fact', 'unknown-evidence'],
  );
});

test('minimum quantity prerequisites reject an unavailable action before rolling', () => {
  const plan = immediateActionContentSchema.parse({
    version: 1,
    id: 'quantity-test',
    plans: [
      {
        ...structuredClone(content.plans[0]),
        requiresQuantities: [{ quantityId: 'silver', minimum: 5 }],
      },
    ],
  }).plans[0];
  assert.equal(
    immediateActionAvailable(
      {
        ...character,
        quantities: [{ id: 'silver', label: 'Silver', value: 3 }],
      },
      [],
      plan,
    ),
    false,
  );
});

test('unmet prerequisites and busy state publish no private or public action', () => {
  const unavailable = composeOpportunities({
    id: 'ce3d19da-7d24-436c-80b9-20a96517333f',
    content,
    character: { ...character, facts: [{ id: 'exposed', value: false }] },
    busy: false,
  });
  const busy = composeOpportunities({
    id: 'cf9bbb0b-c084-4580-aa5f-ee683b150c51',
    content,
    character,
    busy: true,
  });
  assert.deepEqual(unavailable, {
    offer: { id: unavailable.offer.id, nodes: [] },
    plans: [],
  });
  assert.deepEqual(busy, {
    offer: { id: busy.offer.id, nodes: [] },
    plans: [],
  });
});

test('resume intentions remain opaque and cannot settle as immediate actions', () => {
  const resume = immediateActionContentSchema.parse({
    version: 1,
    id: 'resume-test',
    plans: [
      {
        ...structuredClone(content.plans[0]),
        key: 'resume-response',
        resolution: {
          kind: 'resume',
          activityActionId: 'environmental-response',
        },
      },
    ],
  }).plans[0];
  const opportunities = composeOpportunities({
    id: '45469315-a0ca-4a89-b25d-d74a8e7250c8',
    content: { version: 1, id: 'resume-test', plans: [resume] },
    character,
    busy: false,
  });
  assert.deepEqual(opportunities.offer.nodes[0]?.action, {
    kind: 'attempt',
    timing: { kind: 'process' },
  });
  assert.equal(
    validateImmediateActionProposal({
      proposal: resume,
      character,
      evidenceHandles: new Set(),
    }).kind,
    'accepted',
  );
  assert.throws(
    () =>
      resolveImmediateAction(
        character,
        [],
        resume,
        '45469315-a0ca-4a89-b25d-d74a8e7250c8',
        () => 20,
      ),
    /process lifecycle/,
  );
  const halfBound = structuredClone(resume);
  halfBound.resolution.activityId = '45469315-a0ca-4a89-b25d-d74a8e7250c8';
  assert.throws(() =>
    immediateActionContentSchema.parse({
      version: 1,
      id: 'invalid-resume-test',
      plans: [halfBound],
    }),
  );
});

test('extended activity access is explicit and cannot omit or invent a plan', () => {
  const process = {
    ...structuredClone(content.plans[0]),
    key: 'continue-over-time',
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
  };
  assert.throws(
    () => validateActivityAccess([process], { kind: 'none' }),
    /does not match/,
  );
  assert.deepEqual(
    validateActivityAccess([process], {
      kind: 'selected',
      actionKeys: ['continue-over-time'],
    }),
    { kind: 'selected', actionKeys: ['continue-over-time'] },
  );
  const activityId = '45469315-a0ca-4a89-b25d-d74a8e7250c8';
  const resume = {
    ...structuredClone(content.plans[0]),
    key: 'resume-existing',
    resolution: {
      kind: 'resume',
      activityActionId: 'existing-work',
      activityId,
      activityRevision: 4,
    },
  };
  const authorization = authorizeSituation(
    [process, resume],
    'd667e4ad-06ee-4320-a428-363b874ac063',
    {
      kind: 'selected',
      actionKeys: ['continue-over-time', 'resume-existing'],
    },
  );
  const remaining = consumePreparedActivityPlan(
    authorization.preparedPlans,
    process,
  );
  assert.deepEqual(
    rebindPreparedResume(remaining, activityId, 5)[0]?.resolution,
    {
      kind: 'resume',
      activityActionId: 'existing-work',
      activityId,
      activityRevision: 5,
    },
  );
});

test('proposal validation returns bounded diagnostics without applying mechanics', () => {
  const proposal = structuredClone(content.plans[0]);
  proposal.evidence = ['p1', 'p1', 'other-story'];
  proposal.resolution.outcome.effects = [
    { kind: 'fact.set.v1', fact: { id: 'invented', value: true } },
  ];
  const result = validateImmediateActionProposal({
    proposal,
    character,
    evidenceHandles: new Set(['p1']),
  });
  assert.equal(result.kind, 'rejected');
  assert.deepEqual(
    result.issues.map((issue) => issue.code),
    ['duplicate-evidence', 'unknown-evidence', 'unknown-fact'],
  );
  assert.deepEqual(character.facts, [{ id: 'exposed', value: true }]);
});

test('proposal validation rejects ungrounded situational modifiers', () => {
  const proposal = {
    ...structuredClone(content.plans[0]),
    resolution: {
      kind: 'check',
      fictionalDurationSeconds: 5,
      check: {
        rule: 'srd-5.2.1-subset.v1',
        purpose: 'Sense a gradient',
        skill: 'environment-sensing',
        ability: 'wisdom',
        dc: 12,
        advantage: true,
        disadvantage: false,
        modifiers: [],
      },
      difficultyBasis: 'The signal is weak.',
      success: { text: 'Detected.', effects: [] },
      failure: { text: 'Not detected.', effects: [] },
    },
  };
  const result = validateImmediateActionProposal({
    proposal,
    character,
    evidenceHandles: new Set(),
  });
  assert.equal(result.kind, 'rejected');
  assert.equal(result.issues[0]?.code, 'unsupported-modifier');
});

test('current form constrains abilities and skills without changing the D&D ruleset', () => {
  const proposal = {
    ...structuredClone(content.plans[0]),
    resolution: {
      kind: 'check',
      fictionalDurationSeconds: 5,
      check: {
        rule: 'srd-5.2.1-subset.v1',
        purpose: 'Push a physical barrier',
        skill: 'athletics',
        ability: 'strength',
        dc: 12,
        advantage: false,
        disadvantage: false,
        modifiers: [],
      },
      difficultyBasis: 'The barrier is heavy.',
      success: { text: 'Moved.', effects: [] },
      failure: { text: 'Unmoved.', effects: [] },
    },
  };
  const result = validateImmediateActionProposal({
    proposal,
    character,
    evidenceHandles: new Set(),
  });
  assert.equal(result.kind, 'rejected');
  assert.deepEqual(
    result.issues.map((issue) => issue.code),
    ['unavailable-ability', 'unknown-skill'],
  );
});
