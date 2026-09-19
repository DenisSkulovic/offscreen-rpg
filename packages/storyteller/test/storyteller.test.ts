import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import {
  createStorytellerCatalogue,
  storytellerCatalogue,
} from '../src/profiles';
import {
  prepareStorytellerTask,
  validateStorytellerResult,
} from '../src/tasks';
import { scriptedStorytellerResult } from '../src/fixtures';
import { applyContinuityPatch } from '../src/context/continuity';
import { boundStorytellerContext } from '../src/context';
import {
  createOpenRouterProvider,
  usdToMicrousd,
} from '../src/providers/openrouter';

function opening() {
  return prepareStorytellerTask({
    task: 'opening',
    source: { draftId: randomUUID(), draftRevision: 1 },
    profile: storytellerCatalogue.resolve({
      id: 'absurd-action-comedy',
      revision: 1,
    }),
    execution: { mode: 'scripted', version: 'offline-rehearsal.v1' },
    context: {
      premise: {
        title: '',
        premise: 'A traveler wakes beside an unfamiliar companion.',
        storytellingDirection: '',
      },
      current: null,
      selected: null,
      items: [],
      notes: [],
      evidence: [],
    },
  });
}

function consequence(
  options: {
    facts?: Array<{ id: string; value: boolean | string }>;
    storyFacts?: Array<{
      id: string;
      value: boolean | string;
      declaredBy: string;
    }>;
  } = {},
) {
  const base = opening();
  const passage = {
    id: randomUUID(),
    sequence: 2,
    content: {
      version: 1 as const,
      title: 'After the attempt',
      paragraphs: ['The committed result is now visible.'],
    },
    response: null,
  };
  return prepareStorytellerTask({
    task: 'consequence',
    source: {
      storyId: randomUUID(),
      narrativeRevision: 2,
      passageId: passage.id,
    },
    profile: base.profile,
    execution: base.execution,
    context: {
      ...base.context,
      current: passage,
      evidence: [passage],
      selected: {
        id: 'inspect',
        label: 'Inspect the clue',
        intention: 'Inspect the clue carefully.',
      },
      resolution: {
        character: {
          name: 'A strange observer',
          scores: {
            strength: 10,
            dexterity: 10,
            constitution: 10,
            intelligence: 12,
            wisdom: 12,
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
          skills: [
            { id: 'persuasion', label: 'Persuasion' },
            { id: 'perception', label: 'Perception' },
          ],
          proficientSkills: ['persuasion', 'perception'],
          proficiencyBonus: 2,
          hp: 5,
          maxHp: 5,
          facts: options.facts ?? [
            { id: 'gary-alert', value: true },
            { id: 'under-cover', value: false },
            { id: 'location', value: 'pineapple' },
          ],
          quantities: [],
        },
        storyFacts: options.storyFacts ?? [],
        tick: 0,
        offer: {
          id: randomUUID(),
          nodes: [
            {
              id: 'inspect',
              parent: null,
              label: 'Inspect',
              description: 'Inspect what changed.',
              action: { kind: 'attempt' },
            },
            {
              id: 'withdraw',
              parent: null,
              label: 'Withdraw',
              description: 'Step away from the situation.',
              action: { kind: 'attempt' },
            },
          ],
        },
        receipts: [],
      },
    },
  });
}

function mechanicalOpening() {
  const base = opening();
  return prepareStorytellerTask({
    ...base,
    context: {
      ...base.context,
      mechanicalOpening: {
        id: 'small-mechanical-seed.v1',
        character: {
          name: 'A careful observer',
          scores: {
            strength: 10,
            dexterity: 10,
            constitution: 10,
            intelligence: 12,
            wisdom: 12,
            charisma: 10,
          },
          applicableAbilities: ['wisdom', 'charisma'],
          skills: [
            { id: 'persuasion', label: 'Persuasion' },
            { id: 'perception', label: 'Perception' },
          ],
          proficientSkills: ['persuasion', 'perception'],
          proficiencyBonus: 2,
          hp: 5,
          maxHp: 5,
          facts: [
            { id: 'gary-alert', value: true },
            { id: 'under-cover', value: false },
            { id: 'location', value: 'pineapple' },
          ],
          quantities: [],
        },
        storyFacts: [],
        opening: {
          version: 1,
          title: 'A fresh problem',
          paragraphs: ['Something nearby needs careful attention.'],
        },
      },
    },
  });
}

function microbeMechanicalOpening() {
  const task = mechanicalOpening();
  return prepareStorytellerTask({
    ...task,
    context: {
      ...task.context,
      mechanicalOpening: {
        id: 'microbe.v3',
        character: {
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
          skills: [
            { id: 'environment-sensing', label: 'Environmental sensing' },
          ],
          proficientSkills: ['environment-sensing'],
          proficiencyBonus: 2,
          hp: 5,
          maxHp: 5,
          facts: [
            { id: 'exposed', value: true },
            { id: 'gradient-disrupted', value: false },
          ],
          quantities: [],
        },
        storyFacts: [],
        opening: {
          version: 1,
          title: 'A changing environment',
          paragraphs: ['A chemical gradient shifts around the organism.'],
        },
      },
    },
  });
}

function beaconMechanicalOpening() {
  const task = mechanicalOpening();
  return prepareStorytellerTask({
    ...task,
    context: {
      ...task.context,
      mechanicalOpening: {
        id: 'beacon-watch.v1',
        character: {
          name: 'Mara',
          scores: {
            strength: 10,
            dexterity: 10,
            constitution: 12,
            intelligence: 14,
            wisdom: 12,
            charisma: 10,
          },
          applicableAbilities: ['intelligence', 'wisdom'],
          skills: [{ id: 'repair', label: 'Repair' }],
          proficientSkills: ['repair'],
          proficiencyBonus: 2,
          hp: 8,
          maxHp: 8,
          facts: [
            { id: 'location', value: 'harbor-beacon' },
            { id: 'beacon-damaged', value: true },
            { id: 'repair-tools', value: true },
            { id: 'stranger-at-beacon', value: false },
          ],
          quantities: [
            { id: 'harbor-credit', label: 'Harbor credit', value: 0 },
          ],
        },
        storyFacts: [],
        opening: {
          version: 1,
          title: 'The dark beacon',
          paragraphs: ['A storm-damaged beacon needs deliberate repair.'],
        },
      },
    },
  });
}

test('mechanical opening captures fresh plans instead of an authored offer', () => {
  const task = mechanicalOpening();
  assert.equal('offer' in task.context.mechanicalOpening!, false);
  const result = scriptedStorytellerResult(task);
  assert.equal(result.scene.next.kind, 'action-plans');
  if (result.scene.next.kind !== 'action-plans') {
    throw new Error('Expected mechanical opening plans');
  }
  assert.deepEqual(
    result.scene.next.plans.map((plan) => plan.key),
    ['take-cover', 'calm-gary', 'keep-distance'],
  );

  const invalid = structuredClone(result);
  if (
    invalid.scene.next.kind !== 'action-plans' ||
    invalid.scene.next.plans[1]?.resolution.kind !== 'check'
  ) {
    throw new Error('Expected checked opening plan');
  }
  invalid.scene.next.plans[1].resolution.check.ability = 'strength';
  assert.throws(() => validateStorytellerResult(task, invalid));

  const unavailable = structuredClone(result);
  if (unavailable.scene.next.kind !== 'action-plans') {
    throw new Error('Expected mechanical opening plans');
  }
  unavailable.scene.next.plans[0]!.requires = [
    { id: 'under-cover', value: true },
  ];
  assert.throws(
    () => validateStorytellerResult(task, unavailable),
    /unavailable in captured state/,
  );

  const unknown = prepareStorytellerTask({
    ...task,
    context: {
      ...task.context,
      mechanicalOpening: {
        ...task.context.mechanicalOpening!,
        character: {
          ...task.context.mechanicalOpening!.character,
          applicableAbilities: ['wisdom'],
          skills: [],
          proficientSkills: [],
          facts: [{ id: 'ready', value: true }],
        },
      },
    },
  });
  const held = scriptedStorytellerResult(unknown);
  assert.equal(held.scene.next.kind, 'action-plans');
  if (held.scene.next.kind !== 'action-plans') {
    throw new Error('Expected mechanical opening plans');
  }
  assert.equal(held.scene.next.state, 'held');
  assert.deepEqual(held.scene.next.plans, []);
});

test('mechanical opening uses the same task contract for nonhuman agency', () => {
  const result = scriptedStorytellerResult(microbeMechanicalOpening());
  assert.equal(result.scene.next.kind, 'action-plans');
  if (result.scene.next.kind !== 'action-plans') {
    throw new Error('Expected mechanical opening plans');
  }
  assert.deepEqual(
    result.scene.next.plans.map((plan) => plan.key),
    ['follow-gradient', 'contract', 'wait-contracted'],
  );
  assert.deepEqual(result.scene.next.activityAccess, {
    kind: 'selected',
    actionKeys: ['wait-contracted'],
  });
  assert.equal(
    JSON.stringify(result).includes('gary'),
    false,
    'The nonhuman contrast must not inherit pineapple concepts',
  );
});

test('mechanical opening can offer a durable contribution process', () => {
  const result = scriptedStorytellerResult(beaconMechanicalOpening());
  assert.equal(result.scene.next.kind, 'action-plans');
  if (result.scene.next.kind !== 'action-plans') {
    throw new Error('Expected mechanical opening plans');
  }
  const [plan] = result.scene.next.plans;
  assert.equal(plan?.key, 'restore-beacon');
  assert.equal(plan?.resolution.kind, 'process');
  if (plan?.resolution.kind !== 'process') {
    throw new Error('Expected a process resolution');
  }
  assert.equal(plan.resolution.action.process.kind, 'contribution.v1');
  assert.equal(plan.resolution.action.process.requiredContribution, 9);
  assert.equal(plan.resolution.action.completion.effects.length, 2);
});

test('captured schemas expose only the result for the requested task', () => {
  const initial = opening();
  const resolved = consequence();
  const continuation = prepareStorytellerTask({
    ...resolved,
    task: 'continuation',
    source: {
      storyId: randomUUID(),
      narrativeRevision: 2,
      passageId: randomUUID(),
      interactionId: randomUUID(),
    },
    context: { ...resolved.context, resolution: undefined },
  });
  const cases = [
    [initial, 1],
    [continuation, 2],
    [resolved, 3],
  ] as const;
  for (const [task, version] of cases) {
    const schema = JSON.parse(JSON.stringify(task.request.outputSchema));
    assert.equal(schema.properties.scene.properties.version.const, version);
    assert.equal(schema.properties.scene.anyOf, undefined);
    assert.ok(Buffer.byteLength(JSON.stringify(task.request)) <= 48 * 1024);
  }
  const schema = JSON.parse(JSON.stringify(resolved.request.outputSchema));
  assert.equal(schema.properties.arrivalNotes.maxItems, 0);
});

test('context rejects inconsistent current evidence and unpublished future evidence', () => {
  const { context } = consequence();
  assert.ok(context.current);
  const current = context.current;
  assert.throws(
    () =>
      boundStorytellerContext(
        {
          ...context,
          current: {
            ...current,
            content: {
              version: 1,
              title: 'Contradiction',
              paragraphs: ['Different facts.'],
            },
          },
        },
        () => true,
      ),
    /Current passage differs/,
  );
  assert.throws(
    () =>
      boundStorytellerContext(
        {
          ...context,
          evidence: [
            ...context.evidence,
            { ...current, id: randomUUID(), sequence: current.sequence + 1 },
          ],
        },
        () => true,
      ),
    /future passage/,
  );
});

test('profiles are data; captured task is isolated and task-specific', () => {
  const task = opening();
  const copy = { ...task.profile, id: 'third-style', name: 'Third style' };
  const catalogue = createStorytellerCatalogue([task.profile, copy]);
  assert.equal(catalogue.list().length, 2);
  const first = catalogue.list()[0];
  assert.ok(first);
  assert.equal('tasks' in first, false);
  assert.throws(() => createStorytellerCatalogue([copy, copy]));
  const input = {
    task: 'opening' as const,
    source: task.source,
    execution: task.execution,
    profile: copy,
    context: task.context,
  };
  const captured = prepareStorytellerTask(input);
  copy.tone = 'changed';
  assert.notEqual(captured.profile.tone, copy.tone);
  assert.ok(Object.isFrozen(captured.request.messages));
  assert.equal(
    captured.request.messages[1].content.includes(
      task.profile.tasks.continuation,
    ),
    false,
  );
  assert.equal(captured.request.messages[1].content.includes('draftId'), false);
});

test('offered agency checks reject duplicates, endings and fabricated/future evidence', () => {
  const task = opening();
  const good = scriptedStorytellerResult(task);
  const duplicate = structuredClone(good);
  if (duplicate.scene.next.kind !== 'choice') {
    throw new Error('Expected offer');
  }
  const [first, second] = duplicate.scene.next.options;
  assert.ok(first && second);
  second.label = first.label.toUpperCase();
  assert.throws(() => validateStorytellerResult(task, duplicate));
  assert.throws(() =>
    validateStorytellerResult(task, {
      ...good,
      scene: { ...good.scene, next: { kind: 'end' } },
    }),
  );
  assert.throws(() =>
    validateStorytellerResult(task, {
      ...good,
      currentNotes: [
        {
          kind: 'create',
          key: 'lie',
          text: 'Already arrived',
          evidence: ['arrival'],
        },
      ],
    }),
  );
});

test('consequence planning proposes fresh plans without gaining mechanical authority', () => {
  const task = consequence();
  const result = scriptedStorytellerResult(task);
  assert.equal(result.scene.version, 3);
  if (result.scene.version !== 3) {
    throw new Error('Expected consequence scene');
  }
  assert.deepEqual(
    result.scene.next.plans.map((plan) => plan.key),
    ['take-cover', 'calm-gary', 'keep-distance'],
  );

  const fabricated = structuredClone(result);
  if (fabricated.scene.version !== 3) {
    throw new Error('Expected consequence scene');
  }
  fabricated.scene.next.plans[0]!.evidence = ['invented-evidence'];
  assert.throws(() => validateStorytellerResult(task, fabricated));

  const duplicate = structuredClone(result);
  if (duplicate.scene.version !== 3) {
    throw new Error('Expected consequence scene');
  }
  duplicate.scene.next.plans.push({
    ...duplicate.scene.next.plans[0]!,
  });
  assert.throws(() => validateStorytellerResult(task, duplicate));
});

test('offline consequence plans change with committed pineapple state', () => {
  const covered = scriptedStorytellerResult(
    consequence({
      facts: [
        { id: 'gary-alert', value: true },
        { id: 'under-cover', value: true },
        { id: 'location', value: 'pineapple' },
      ],
    }),
  );
  if (covered.scene.version !== 3) {
    throw new Error('Expected consequence scene');
  }
  assert.deepEqual(
    covered.scene.next.plans.map((plan) => plan.key),
    ['inspect-from-cover', 'leave-cover'],
  );

  const identified = scriptedStorytellerResult(
    consequence({
      facts: [
        { id: 'gary-alert', value: true },
        { id: 'under-cover', value: true },
        { id: 'location', value: 'pineapple' },
      ],
      storyFacts: [
        {
          id: 'delivery-at-window',
          value: 'rattling-parcel',
          declaredBy: randomUUID(),
        },
      ],
    }),
  );
  if (identified.scene.version !== 3) {
    throw new Error('Expected consequence scene');
  }
  assert.deepEqual(
    identified.scene.next.plans.map((plan) => plan.key),
    ['draw-parcel-closer', 'leave-parcel-outside'],
  );
});

test('beacon interruption plans resolve danger before offering process resumption', () => {
  const interrupted = scriptedStorytellerResult(
    consequence({
      facts: [
        { id: 'location', value: 'harbor-beacon' },
        { id: 'beacon-damaged', value: true },
        { id: 'repair-tools', value: true },
        { id: 'stranger-at-beacon', value: true },
      ],
    }),
  );
  if (interrupted.scene.version !== 3) {
    throw new Error('Expected consequence scene');
  }
  assert.deepEqual(
    interrupted.scene.next.plans.map((plan) => plan.key),
    ['read-the-stranger', 'bar-the-door'],
  );

  const cleared = scriptedStorytellerResult(
    consequence({
      facts: [
        { id: 'location', value: 'harbor-beacon' },
        { id: 'beacon-damaged', value: true },
        { id: 'repair-tools', value: true },
        { id: 'stranger-at-beacon', value: false },
      ],
    }),
  );
  if (cleared.scene.version !== 3) {
    throw new Error('Expected consequence scene');
  }
  assert.deepEqual(
    cleared.scene.next.plans.map((plan) => plan.key),
    ['resume-beacon-repair', 'secure-repair-tools'],
  );
  const [resume, diversion] = cleared.scene.next.plans;
  assert.equal(resume?.key, 'resume-beacon-repair');
  assert.deepEqual(resume?.resolution, {
    kind: 'resume',
    activityActionId: 'restore-beacon',
  });
  assert.equal(diversion?.resolution.kind, 'process');
  if (diversion?.resolution.kind === 'process') {
    assert.equal(diversion.resolution.action.capacity, 'primary');
    assert.equal(diversion.resolution.action.process.kind, 'contribution.v1');
    if (diversion.resolution.action.process.kind !== 'contribution.v1') {
      throw new Error('Expected contribution diversion');
    }
    assert.equal(diversion.resolution.action.process.requiredContribution, 3);
  }
});

test('continuity updates preserve provenance and fail without mutating their base', () => {
  const source = randomUUID();
  const notes = applyContinuityPatch({
    notes: [],
    patch: [
      {
        kind: 'create',
        key: 'promise',
        text: 'A companion made a promise.',
        evidence: ['current'],
      },
    ],
    evidence: { current: source },
    revision: 1,
  });
  assert.deepEqual(notes[0]?.sources, [source]);
  assert.throws(() =>
    applyContinuityPatch({
      notes,
      patch: [
        {
          kind: 'update',
          key: 'promise',
          text: 'Different',
          evidence: ['other-story'],
        },
      ],
      evidence: {},
      revision: 2,
    }),
  );
  assert.equal(notes[0]?.text, 'A companion made a promise.');
  assert.deepEqual(
    applyContinuityPatch({
      notes,
      patch: [{ kind: 'retire', key: 'promise', reason: 'Fulfilled' }],
      evidence: {},
      revision: 2,
    }),
    [],
  );
});

test('old mandatory evidence survives recent-window selection, overflow holds', () => {
  const task = opening();
  const evidence = Array.from({ length: 14 }, (_, index) => ({
    id: randomUUID(),
    sequence: index + 1,
    content: {
      version: 1 as const,
      title: 'Scene',
      paragraphs: ['Quiet life.'],
    },
    response: null,
  }));
  const first = evidence[0];
  const current = evidence[13];
  assert.ok(first && current);
  const context = {
    ...task.context,
    current,
    evidence,
    notes: [
      {
        key: 'promise',
        text: 'An old promise.',
        sources: [first.id],
        revision: 1,
      },
    ],
  };
  const selected = boundStorytellerContext(context, () => true);
  assert.equal(selected.evidence.length, 8);
  assert.equal(selected.evidence[0]?.id, first.id);
  assert.throws(
    () => boundStorytellerContext(context, () => false),
    /context_too_large/,
  );
  assert.throws(
    () =>
      boundStorytellerContext(
        { ...context, evidence: evidence.slice(1) },
        () => true,
      ),
    /Missing continuity evidence/,
  );
});

test('provider adapter uses an injected transport, one route and no retry; missing accounting is uncertain', async () => {
  const task = opening();
  const providerTask = prepareStorytellerTask({
    ...task,
    execution: {
      mode: 'provider',
      accountId: randomUUID(),
      runId: randomUUID(),
      policy: {
        version: 'test',
        model: 'test/model',
        provider: 'Test',
        priceVersion: 'invented-test',
        inputMicrousdPerMillion: '500000',
        outputMicrousdPerMillion: '2000000',
        maxInputTokens: 100000,
        maxOutputTokens: 2000,
        timeoutMs: 1000,
      },
    },
  });
  let calls = 0;
  const provider = createOpenRouterProvider({
    enabled: true,
    apiKey: 'dummy-test-key',
    transport: async (_url, init) => {
      calls++;
      const body = JSON.parse(String(init?.body));
      assert.deepEqual(body.provider.only, ['Test']);
      assert.equal(body.provider.allow_fallbacks, false);
      return new Response(
        JSON.stringify({
          id: 'fake',
          usage: { cost: 0.0000012 },
          choices: [
            {
              finish_reason: 'stop',
              message: {
                content: JSON.stringify(scriptedStorytellerResult(task)),
              },
            },
          ],
        }),
      );
    },
  });
  const result = await provider(providerTask);
  assert.equal(result.kind, 'result');
  if (result.kind === 'result') {
    assert.equal(result.chargeMicrousd, 2n);
  }
  assert.equal(calls, 1);
  const missingUsage = createOpenRouterProvider({
    enabled: true,
    apiKey: 'dummy',
    transport: async () => new Response('{}'),
  });
  assert.deepEqual(await missingUsage(providerTask), { kind: 'uncertain' });
  assert.throws(() =>
    createOpenRouterProvider({ enabled: false, apiKey: 'dummy' }),
  );
  assert.equal(usdToMicrousd('1e-7'), 1n);
  assert.equal(usdToMicrousd('0.012345'), 12345n);
});
