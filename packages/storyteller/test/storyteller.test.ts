import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import type { EvidencePacket } from '@offscreen/contracts/story-retrieval';
import {
  createStorytellerCatalogue,
  storytellerCatalogue,
} from '../src/profiles';
import {
  composeMemoryExplorationDecisionRequest,
  prepareStorytellerTask,
  storytellerNeedsContextSchema,
  storytellerRoundOutputSchema,
  storytellerTaskResourcesSchema,
  validateStorytellerResult,
  validateResourcesForExecution,
} from '../src/tasks';
import { scriptedStorytellerResult } from '../src/fixtures';
import { applyContinuityPatch } from '../src/context/continuity';
import {
  boundStorytellerContext,
  contextRequestSections,
} from '../src/context';
import {
  createOpenRouterProvider,
  diagnoseOpenRouterResponse,
  inspectOpenRouterRequest,
  compareOpenRouterRequests,
  projectOpenAiStrictSchema,
  usdToMicrousd,
} from '../src/providers/openrouter';
import {
  createStorytellerRequestAudit,
  formatStorytellerRequestAudit,
  selectStorytellerRequestSections,
} from '../src/providers/request-audit';
import { createRequestAuditFixtureCases } from '../src/providers/request-audit-fixtures';

test('memory exploration request preview embeds evidence without transport', () => {
  const fixture = createRequestAuditFixtureCases({
    caseIds: ['scene-continuation'],
  })[0];
  assert.ok(fixture);
  const { task } = fixture;
  const evidencePack: EvidencePacket = {
    format: 'offscreen.evidence-pack.v1',
    contents: [{ id: 'c1', text: 'The old promise remains unresolved.' }],
    sources: [
      {
        id: 's1',
        key: `canonical:${randomUUID()}@1#sha256:${'a'.repeat(64)}`,
      },
    ],
    evidence: [
      {
        itemId: 'old-promise',
        group: { kind: 'thread', key: 'old-promise' },
        required: true,
        level: 'card',
        contentId: 'c1',
        sourceIds: ['s1'],
      },
    ],
  };
  const request = composeMemoryExplorationDecisionRequest({
    request: task.request,
    round: 2,
    canRequestContext: false,
    evidencePack,
  });
  const user = JSON.parse(request.messages[1].content);
  assert.deepEqual(user.memoryExploration, {
    round: 2,
    canRequestContext: false,
    evidencePack,
  });
  assert.ok(
    request.outputSchema &&
      typeof request.outputSchema === 'object' &&
      !Array.isArray(request.outputSchema) &&
      'properties' in request.outputSchema &&
      request.outputSchema.properties &&
      typeof request.outputSchema.properties === 'object' &&
      !Array.isArray(request.outputSchema.properties) &&
      'required' in request.outputSchema,
  );
  assert.deepEqual(
    request.outputSchema.properties.result,
    task.request.outputSchema,
  );
  assert.deepEqual(request.outputSchema.required, [
    'result',
    'evidenceUse',
    'creativeDirections',
  ]);
  const inspection = inspectOpenRouterRequest(task, {
    request,
    maxGeneratedTokens: 321,
  });
  assert.equal(inspection.userSections.at(-1)?.key, 'memoryExploration');
  assert.equal(inspection.body.messages, request.messages);
  assert.equal(inspection.body.max_tokens, 321);
  assert.ok(inspection.serializedBytes > inspection.capturedRequestBytes);
  const exploratoryRequest = composeMemoryExplorationDecisionRequest({
    request: task.request,
    round: 1,
    canRequestContext: true,
    evidencePack: { ...evidencePack, contents: [], sources: [], evidence: [] },
  });
  assert.ok(
    exploratoryRequest.outputSchema &&
      typeof exploratoryRequest.outputSchema === 'object' &&
      'anyOf' in exploratoryRequest.outputSchema &&
      Array.isArray(exploratoryRequest.outputSchema.anyOf),
  );
});

function providerResources(route: string) {
  const source = [{ source: 'test', value: 100000 }];
  return {
    version: 'storyteller-resources.v2' as const,
    recipe: {
      version: 'single-turn.v1' as const,
      maxModelRounds: 1 as const,
      maxReads: 0 as const,
      tools: 'disabled' as const,
      automaticEscalation: false as const,
    },
    envelope: {
      maxSerializedRequestBytes: 48000,
      maxInputTokens: 100000,
      maxGeneratedTokens: 2000,
      maxReasoningTokens: 0,
      maxMicrousd: '54',
      deadlineMs: 1000,
    },
    authority: {
      kind: 'effective-usage-policy' as const,
      policy: {
        schemaVersion: 1 as const,
        platform: { id: 'test', revision: 1 },
        profile: { id: 'test', revision: 1 },
        route,
        fundingMode: 'prepaid' as const,
        recovery: 'explicit-resume' as const,
        limits: {
          maxInputTokensPerRequest: 100000,
          maxSerializedBytesPerRequest: 48000,
          maxGeneratedTokensPerRequest: 2000,
          maxReasoningTokensPerRequest: 0,
          maxInputTokensPerOperation: 100000,
          maxGeneratedTokensPerOperation: 2000,
          maxModelRoundsPerOperation: 1,
          maxReadsPerOperation: 0,
          maxRetainedReadBytes: 0,
          maxMicrousdPerOperation: '54',
          maxInFlightDispatches: 1,
          maxBackgroundJobsPerWindow: 0,
        },
        limitSources: {
          maxInputTokensPerRequest: source,
          maxSerializedBytesPerRequest: source,
          maxGeneratedTokensPerRequest: source,
          maxReasoningTokensPerRequest: [{ source: 'test', value: 0 }],
          maxInputTokensPerOperation: source,
          maxGeneratedTokensPerOperation: source,
          maxModelRoundsPerOperation: source,
          maxReadsPerOperation: [{ source: 'test', value: 0 }],
          maxRetainedReadBytes: [{ source: 'test', value: 0 }],
          maxMicrousdPerOperation: [{ source: 'test', value: '54' }],
          maxInFlightDispatches: source,
          maxBackgroundJobsPerWindow: [{ source: 'test', value: 0 }],
        },
        windows: [],
        restrictions: [],
      },
    },
  };
}

test('memory exploration requests are private, bounded and reserve a final round', () => {
  const request = storytellerNeedsContextSchema.parse({
    kind: 'needs_context',
    version: 1,
    purpose: 'Verify the old favor before portraying the return.',
    requests: [
      {
        requestId: 'r1',
        operation: 'ask_memory',
        intent: 'evidence',
        question: 'What established old favor matters here?',
      },
      {
        requestId: 'r2',
        operation: 'ask_memory',
        intent: 'evidence',
        question: 'Who is Mira Vale in this history?',
      },
    ],
  });
  assert.deepEqual(storytellerRoundOutputSchema.parse(request), request);
  assert.equal(request.kind, 'needs_context');
  assert.throws(
    () =>
      storytellerNeedsContextSchema.parse({
        ...request,
        requests: [request.requests[0], request.requests[0]],
      }),
    /unique within a round/,
  );
  assert.throws(
    () =>
      storytellerNeedsContextSchema.parse({
        ...request,
        requests: [
          ...request.requests,
          {
            requestId: 'r3',
            operation: 'ask_memory',
            intent: 'possibilities',
            question: 'What distant detail could fit this moment?',
          },
        ],
      }),
    /at most two memory questions/,
  );

  const resources = storytellerTaskResourcesSchema.parse({
    version: 'storyteller-resources.v2',
    recipe: {
      version: 'memory-exploration.v1',
      maxModelRounds: 3,
      maxReads: 6,
      maxRetainedReadBytes: 12 * 1024,
      tools: 'memory-read.v1',
      automaticEscalation: false,
      finalAnswerReserveRounds: 1,
    },
    envelope: {
      maxSerializedRequestBytes: 48 * 1024,
      maxInputTokens: 12_288,
      maxGeneratedTokens: 8_000,
      maxReasoningTokens: 0,
      maxMicrousd: '0',
      deadlineMs: 120_000,
    },
    authority: { kind: 'offline', version: 'offline-rehearsal.v1' },
  });
  validateResourcesForExecution(
    { mode: 'scripted', version: 'offline-rehearsal.v1' },
    resources,
  );
  assert.equal(resources.recipe.maxModelRounds, 3);
  assert.equal(resources.recipe.finalAnswerReserveRounds, 1);
});

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
    activitySituation?: {
      activityAccess: { kind: 'none' };
      activeActivityId: string;
      commitments: Array<{
        activityId: string;
        actionId: string;
        revision: number;
        state: 'encounter';
        label: string;
        progress: {
          kind: 'contribution';
          label: string;
          earned: number;
          required: number;
        };
      }>;
    };
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
      ...(options.activitySituation
        ? { activitySituation: options.activitySituation }
        : {}),
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
              action: {
                kind: 'attempt',
                timing: { kind: 'finite', fictionalSeconds: 5 },
              },
            },
            {
              id: 'withdraw',
              parent: null,
              label: 'Withdraw',
              description: 'Step away from the situation.',
              action: {
                kind: 'attempt',
                timing: { kind: 'finite', fictionalSeconds: 5 },
              },
            },
          ],
        },
        receipts: [],
      },
    },
  });
}

function report() {
  const base = consequence();
  return prepareStorytellerTask({
    task: 'report',
    source: {
      ...base.source,
      hookId: randomUUID(),
    },
    profile: base.profile,
    execution: base.execution,
    context: base.context,
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
    [
      'follow-gradient',
      'contract',
      'wait-contracted',
      'sample-gradient-cycle',
      'hold-temperature-cycle',
      'hold-pressure-cycle',
    ],
  );
  assert.deepEqual(result.scene.next.activityAccess, {
    kind: 'selected',
    actionKeys: [
      'wait-contracted',
      'sample-gradient-cycle',
      'hold-temperature-cycle',
      'hold-pressure-cycle',
    ],
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
  const plan = result.scene.next.plans.find(
    (candidate) => candidate.key === 'restore-beacon',
  );
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
  const pending = prepareStorytellerTask({
    ...resolved,
    task: 'pending-consequence',
    source: {
      storyId: randomUUID(),
      narrativeRevision: 2,
      passageId: resolved.source.passageId,
      executionId: randomUUID(),
      targetTick: 5,
      projectedStateDigest: 'a'.repeat(64),
    },
  });
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
    [pending, 3],
  ] as const;
  for (const [task, version] of cases) {
    const schema = JSON.parse(JSON.stringify(task.request.outputSchema));
    assert.equal(schema.properties.scene.properties.version.const, version);
    assert.equal(schema.properties.scene.anyOf, undefined);
    assert.ok(Buffer.byteLength(JSON.stringify(task.request)) <= 48 * 1024);
    assert.equal(task.inputVersion, 10);
    assert.equal(task.promptVersion, 'storyteller.v7');
    assert.deepEqual(task.resources.recipe, {
      version: 'single-turn.v1',
      maxModelRounds: 1,
      maxReads: 0,
      tools: 'disabled',
      automaticEscalation: false,
    });
    assert.equal(task.resources.envelope.maxSerializedRequestBytes, 48 * 1024);
    assert.equal(task.resources.envelope.maxMicrousd, '0');
  }
  const openingSchema = JSON.parse(
    JSON.stringify(initial.request.outputSchema),
  );
  assert.deepEqual(openingSchema.required, ['version', 'scene']);
  const openingInstructions = initial.request.messages[0]?.content ?? '';
  assert.match(
    openingInstructions,
    /Return exactly this complete nesting: \{"version":1,"scene":/,
  );
  assert.doesNotMatch(openingInstructions, /"currentNotes":\[\]/);
  assert.match(openingInstructions, /do not add root keys not shown/);
  const schema = JSON.parse(JSON.stringify(resolved.request.outputSchema));
  assert.equal(schema.properties.arrivalNotes.maxItems, 0);
  for (const task of [resolved, pending]) {
    const constrained = JSON.parse(JSON.stringify(task.request.outputSchema));
    assert.deepEqual(
      constrained.properties.scene.properties.next.properties.plans.items
        .properties.evidence.items.enum,
      ['p2'],
    );
    const instructions = task.request.messages[0]?.content ?? '';
    assert.match(
      instructions,
      /evidence array must be \[\] or contain only these exact handles: p2/,
    );
    assert.match(instructions, /selected intention has just resolved/);
    assert.match(instructions, /Visibly realize the supplied profile tone/);
  }
});

test('historical reports have a strict prose-only task boundary', () => {
  const task = report();
  const result = scriptedStorytellerResult(task);
  assert.equal(result.report.version, 1);
  assert.match(result.report.paragraphs[0] ?? '', /committed result/);

  const schema = JSON.stringify(task.request.outputSchema);
  assert.match(schema, /"report"/);
  assert.doesNotMatch(schema, /"scene"|"currentNotes"|"arrivalNotes"/);

  assert.throws(() =>
    validateStorytellerResult(task, {
      ...result,
      currentNotes: [],
    }),
  );
  assert.throws(() =>
    validateStorytellerResult(task, scriptedStorytellerResult(consequence())),
  );
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
  const inventedWorldSection = structuredClone(good);
  if (inventedWorldSection.scene.next.kind !== 'choice') {
    throw new Error('Expected offer');
  }
  inventedWorldSection.scene.next.options[0]!.worldSections = ['k1.s1'];
  assert.throws(
    () => validateStorytellerResult(task, inventedWorldSection),
    /captured world catalogue/,
  );
  const inventedCampaignDocument = structuredClone(good);
  if (inventedCampaignDocument.scene.next.kind !== 'choice') {
    throw new Error('Expected offer');
  }
  inventedCampaignDocument.scene.next.options[0]!.campaignDocuments = ['d1'];
  assert.throws(
    () => validateStorytellerResult(task, inventedCampaignDocument),
    /captured campaign catalogue/,
  );
  const inventedCreatedDocument = structuredClone(good);
  if (inventedCreatedDocument.scene.next.kind !== 'choice') {
    throw new Error('Expected offer');
  }
  inventedCreatedDocument.scene.next.options[0]!.createdDocuments = [0];
  assert.throws(
    () => validateStorytellerResult(task, inventedCreatedDocument),
    /this result document changes/,
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
  const retainedActivityId = randomUUID();
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
      activitySituation: {
        activityAccess: { kind: 'none' },
        activeActivityId: retainedActivityId,
        commitments: [
          {
            activityId: retainedActivityId,
            actionId: 'restore-beacon',
            revision: 3,
            state: 'encounter',
            label: 'Restore the beacon',
            progress: {
              kind: 'contribution',
              label: 'Beacon repair',
              earned: 3,
              required: 9,
            },
          },
        ],
      },
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
    activityId: retainedActivityId,
    activityRevision: 3,
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

test('active scene scope retains its complete range and rejects partial coverage', () => {
  const task = opening();
  const evidence = Array.from({ length: 15 }, (_, index) => ({
    id: randomUUID(),
    sequence: index + 1,
    content: {
      version: 1 as const,
      title: `Exchange ${index + 1}`,
      paragraphs: [`The unresolved interaction continues at ${index + 1}.`],
    },
    response: null,
  }));
  const current = evidence.at(-1)!;
  const context = {
    ...task.context,
    current,
    evidence,
    activeSceneScope: {
      version: 'active-scene.v1' as const,
      fromSequence: 1,
      throughSequence: 15,
      requiredPassageIds: [evidence[0]!.id, evidence[5]!.id, current.id],
    },
  };
  const selected = boundStorytellerContext(context, () => true);
  assert.equal(selected.evidence.length, 15);
  assert.deepEqual(
    selected.evidence.map((passage) => passage.sequence),
    Array.from({ length: 15 }, (_, index) => index + 1),
  );
  const sections = contextRequestSections(selected);
  assert.equal(sections.currentState.current?.handle, 'p15');
  assert.equal(
    sections.sceneContext.evidence.some((passage) => passage.handle === 'p15'),
    false,
  );
  assert.throws(
    () =>
      boundStorytellerContext(
        {
          ...context,
          evidence: evidence.filter((item) => item.sequence !== 6),
        },
        () => true,
      ),
    /Active scene evidence is incomplete/,
  );
});

test('provider adapter uses an injected transport, one route and no retry; missing accounting is uncertain', async () => {
  const task = opening();
  const providerExecution = {
    mode: 'provider' as const,
    accountId: randomUUID(),
    runId: randomUUID(),
    dispatchReview: { mode: 'hold' as const },
    policy: {
      version: 'test',
      route: 'test:economy',
      model: 'test/model',
      provider: 'Test',
      priceVersion: 'invented-test',
      inputMicrousdPerMillion: '500000',
      outputMicrousdPerMillion: '2000000',
      maxInputTokens: 100000,
      maxOutputTokens: 2000,
      timeoutMs: 1000,
    },
  };
  const providerTask = prepareStorytellerTask({
    ...task,
    execution: providerExecution,
    resources: providerResources(providerExecution.policy.route),
  });
  const inspection = inspectOpenRouterRequest(providerTask);
  assert.equal(inspection.body.model, 'test/model');
  assert.equal(inspection.purpose.id, 'opening.narrative');
  assert.equal(inspection.purpose.outputContract, 'playable-opening.v1');
  assert.equal(inspection.contextPolicyVersion, 'bounded-scene.v3');
  assert.deepEqual(inspection.body.provider.only, ['Test']);
  assert.equal(inspection.body.provider.allow_fallbacks, false);
  assert.match(inspection.sha256, /^[a-f0-9]{64}$/);
  assert.ok(inspection.serializedBytes > inspection.outputSchemaBytes);

  const projectedSchema = projectOpenAiStrictSchema({
    type: 'object',
    properties: {
      safe: { type: 'string', pattern: '^[a-z]+$' },
      domainOnly: {
        type: 'string',
        pattern: '^(?!/)(?!.*(?:^|/)\\.\\.?(?:/|$)).+\\.md$',
      },
    },
  }) as {
    properties: Record<string, { pattern?: string }>;
    required: string[];
  };
  assert.equal(projectedSchema.properties.safe?.pattern, '^[a-z]+$');
  assert.equal(projectedSchema.properties.domainOnly?.pattern, undefined);
  assert.deepEqual(projectedSchema.required, ['safe', 'domainOnly']);
  assert.equal(inspection.estimatedInputTokens, null);
  assert.ok(inspection.userSections.some((section) => section.key === 'task'));
  assert.ok(
    inspection.userSections.every(
      (section) =>
        section.characters > 0 &&
        section.bytes > 0 &&
        /^[a-f0-9]{64}$/.test(section.sha256),
    ),
  );
  assert.equal(
    inspection.userSections.find((section) => section.key === 'currentState')
      ?.valueKind,
    'object',
  );
  assert.deepEqual(
    inspection.userSections.map((section) => [section.key, section.stability]),
    [
      ['task', 'stable'],
      ['profile', 'stable'],
      ['sceneContext', 'stable'],
      ['currentState', 'changing'],
      ['selectedIntention', 'changing'],
    ],
  );
  assert.match(inspection.outputSchemaSha256, /^[a-f0-9]{64}$/);
  assert.ok(
    inspection.messages.every((message) =>
      /^[a-f0-9]{64}$/.test(message.sha256),
    ),
  );
  const comparison = compareOpenRouterRequests(inspection, inspection);
  assert.equal(comparison.samePacket, true);
  assert.equal(comparison.sameOutputSchema, true);
  assert.equal(comparison.serializedBytesDelta, 0);
  assert.ok(comparison.potentialReusableMessageContentBytes > 0);
  assert.ok(
    comparison.messages.every(
      (message, index) =>
        message.commonPrefixBytes === inspection.messages[index]?.bytes,
    ),
  );
  assert.equal(comparison.estimatedSharedInputTokens, null);
  const localValidationTask = prepareStorytellerTask({
    ...task,
    execution: {
      ...providerExecution,
      policy: {
        ...providerExecution.policy,
        outputProtocol: 'json-object-local-validation' as const,
      },
    },
    resources: providerResources(providerExecution.policy.route),
  });
  const localValidationInspection =
    inspectOpenRouterRequest(localValidationTask);
  assert.equal(
    localValidationInspection.outputProtocol,
    'json-object-local-validation',
  );
  assert.deepEqual(localValidationInspection.body.response_format, {
    type: 'json_object',
  });
  assert.deepEqual(
    localValidationInspection.body.messages,
    inspection.body.messages,
  );
  assert.equal(
    localValidationInspection.outputSchemaSha256,
    inspection.outputSchemaSha256,
  );
  assert.ok(
    localValidationInspection.serializedBytes < inspection.serializedBytes,
  );
  const protocolComparison = compareOpenRouterRequests(
    inspection,
    localValidationInspection,
  );
  assert.equal(protocolComparison.samePacket, false);
  assert.equal(protocolComparison.sameOutputSchema, true);
  assert.ok(protocolComparison.potentialReusableMessageContentBytes > 0);
  let calls = 0;
  const provider = createOpenRouterProvider({
    enabled: true,
    apiKey: 'dummy-test-key',
    transport: async (_url, init) => {
      calls++;
      const body = JSON.parse(String(init?.body));
      assert.deepEqual(body.provider.only, ['Test']);
      assert.equal(body.provider.allow_fallbacks, false);
      assert.equal(body.max_tokens, 321);
      return new Response(
        JSON.stringify({
          id: 'fake',
          model: 'test/model',
          usage: {
            cost: 0.0000012,
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
            prompt_tokens_details: {
              cached_tokens: 3,
              cache_write_tokens: 0,
            },
            completion_tokens_details: { reasoning_tokens: 2 },
          },
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
  const result = await provider(providerTask, {
    request: providerTask.request,
    maxGeneratedTokens: 321,
  });
  assert.equal(result.kind, 'result');
  if (result.kind === 'result') {
    assert.equal(result.usage.reportedCostMicrousd, 2n);
    assert.equal(result.usage.reasoningTokens, 2);
    assert.equal(result.usage.cachedTokens, 3);
    assert.equal(result.telemetry.reportedModel, 'test/model');
  }
  assert.equal(calls, 1);
  let capturedDiagnostic:
    ReturnType<typeof diagnoseOpenRouterResponse> | undefined;
  const invalidTaskOutput = createOpenRouterProvider({
    enabled: true,
    apiKey: 'dummy',
    recordDiagnostic: async ({ diagnostic }) => {
      capturedDiagnostic = diagnostic;
    },
    transport: async () =>
      new Response(
        JSON.stringify({
          id: 'invalid-task-output',
          model: 'test/model',
          usage: {
            cost: 0.000001,
            prompt_tokens: 10,
            completion_tokens: 2,
            total_tokens: 12,
          },
          choices: [
            {
              finish_reason: 'stop',
              message: { content: '{}' },
            },
          ],
        }),
      ),
  });
  const invalid = await invalidTaskOutput(providerTask);
  assert.equal(invalid.kind, 'result');
  assert.equal(capturedDiagnostic?.stage, 'task-output');
  assert.ok(capturedDiagnostic?.issues.length);
  const rejectedSchema = createOpenRouterProvider({
    enabled: true,
    apiKey: 'dummy',
    transport: async () =>
      new Response(
        JSON.stringify({
          error: {
            message: 'Provider returned error',
            code: 400,
            metadata: {
              provider_error_code: 'invalid_json_schema',
            },
          },
        }),
        {
          status: 400,
          headers: { 'x-generation-id': 'rejected-request-id' },
        },
      ),
  });
  const rejected = await rejectedSchema(providerTask);
  assert.equal(rejected.kind, 'failed');
  if (rejected.kind === 'failed') {
    assert.equal(rejected.failureCode, 'invalid_output');
    assert.equal(rejected.usage.reportedCostMicrousd, 0n);
    assert.equal(rejected.telemetry.providerId, null);
    assert.equal(rejected.telemetry.finishReason, 'invalid-json-schema');
  }
  const missingUsage = createOpenRouterProvider({
    enabled: true,
    apiKey: 'dummy',
    transport: async () =>
      new Response('{}', {
        headers: { 'x-generation-id': 'generation-after-headers' },
      }),
  });
  const missing = await missingUsage(providerTask);
  assert.equal(missing.kind, 'uncertain');
  assert.equal(missing.telemetry.httpStatus, 200);
  assert.equal(missing.telemetry.providerId, 'generation-after-headers');

  const interruptedBody = createOpenRouterProvider({
    enabled: true,
    apiKey: 'dummy',
    transport: async () =>
      new Response(
        new ReadableStream({
          pull(controller) {
            controller.error(new Error('injected body interruption'));
          },
        }),
        {
          headers: { 'x-generation-id': 'generation-before-body-failure' },
        },
      ),
  });
  const interrupted = await interruptedBody(providerTask);
  assert.equal(interrupted.kind, 'uncertain');
  assert.equal(interrupted.telemetry.httpStatus, 200);
  assert.equal(
    interrupted.telemetry.providerId,
    'generation-before-body-failure',
  );

  const streamingTask = prepareStorytellerTask({
    ...task,
    execution: {
      ...providerExecution,
      policy: {
        ...providerExecution.policy,
        responseTransport: 'streaming-sse' as const,
      },
    },
    resources: providerResources(providerExecution.policy.route),
  });
  const streamingInspection = inspectOpenRouterRequest(streamingTask);
  assert.equal(streamingInspection.responseTransport, 'streaming-sse');
  assert.equal(streamingInspection.body.stream, true);
  assert.deepEqual(streamingInspection.body.stream_options, {
    include_usage: true,
  });
  const streamedContent = JSON.stringify(scriptedStorytellerResult(task));
  const streamingProvider = createOpenRouterProvider({
    enabled: true,
    apiKey: 'dummy',
    transport: async () =>
      new Response(
        [
          `data: ${JSON.stringify({
            id: 'stream-generation',
            model: 'test/model',
            choices: [
              {
                finish_reason: null,
                delta: { content: streamedContent.slice(0, 80) },
              },
            ],
          })}`,
          `data: ${JSON.stringify({
            id: 'stream-generation',
            model: 'test/model',
            choices: [
              {
                finish_reason: 'stop',
                delta: { content: streamedContent.slice(80) },
              },
            ],
          })}`,
          `data: ${JSON.stringify({
            id: 'stream-generation',
            model: 'test/model',
            choices: [],
            usage: {
              cost: 0,
              prompt_tokens: 10,
              completion_tokens: 20,
              total_tokens: 30,
            },
          })}`,
          'data: [DONE]',
          '',
        ].join('\n\n'),
        { headers: { 'x-generation-id': 'stream-generation' } },
      ),
  });
  const streamed = await streamingProvider(streamingTask);
  assert.equal(streamed.kind, 'result');
  assert.equal(streamed.telemetry.providerId, 'stream-generation');
  assert.equal(streamed.telemetry.finishReason, 'stop');
  if (streamed.kind === 'result') {
    assert.equal(streamed.usage.totalTokens, 30);
  }
  const incompleteStreamingProvider = createOpenRouterProvider({
    enabled: true,
    apiKey: 'dummy',
    transport: async () =>
      new Response(
        `data: ${JSON.stringify({
          model: 'test/model',
          choices: [
            { finish_reason: null, delta: { content: streamedContent } },
          ],
        })}\n\n`,
        { headers: { 'x-generation-id': 'incomplete-stream-generation' } },
      ),
  });
  const incompleteStream = await incompleteStreamingProvider(streamingTask);
  assert.equal(incompleteStream.kind, 'uncertain');
  assert.equal(
    incompleteStream.telemetry.providerId,
    'incomplete-stream-generation',
  );
  assert.throws(() =>
    createOpenRouterProvider({ enabled: false, apiKey: 'dummy' }),
  );
  assert.equal(usdToMicrousd('1e-7'), 1n);
  assert.equal(usdToMicrousd('0.012345'), 12345n);
});

test('OpenRouter diagnostics identify compact task-output paths without retaining prose', () => {
  const task = prepareStorytellerTask(opening());
  const valid = structuredClone(scriptedStorytellerResult(task)) as Record<
    string,
    unknown
  >;
  const scene = valid.scene as Record<string, unknown>;
  const malformed = {
    version: valid.version,
    scene: {
      ...scene,
      currentNotes: valid.currentNotes,
      arrivalNotes: valid.arrivalNotes,
      documentChanges: valid.documentChanges,
    },
  };
  const raw = JSON.stringify({
    id: 'diagnostic-response',
    model: 'test/model',
    usage: {
      cost: 0,
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    },
    choices: [
      {
        finish_reason: 'stop',
        message: { content: JSON.stringify(malformed) },
      },
    ],
  });

  const diagnostic = diagnoseOpenRouterResponse(raw, task);
  assert.equal(diagnostic.stage, 'task-output');
  assert.ok(diagnostic.issues.some((issue) => issue.path === 'scene'));
  assert.ok(
    diagnostic.issues.some(
      (issue) =>
        issue.code === 'unrecognized_keys' &&
        issue.message.includes('currentNotes'),
    ),
  );
  assert.ok(
    diagnostic.issues.every(
      (issue) => !issue.message.includes(String(scene.content)),
    ),
  );

  const invalidJsonEnvelope = JSON.parse(raw);
  invalidJsonEnvelope.choices[0].message.content = 'not json';
  assert.deepEqual(
    diagnoseOpenRouterResponse(JSON.stringify(invalidJsonEnvelope), task),
    {
      stage: 'model-json',
      issues: [
        {
          path: '',
          code: 'invalid_json',
          message: 'Model content is not valid JSON',
        },
      ],
    },
  );
});

test('request audit reports exact multi-purpose structure without inventing tokens or spend', () => {
  const narrative = opening();
  const mechanical = mechanicalOpening();
  const providerExecution = {
    mode: 'provider' as const,
    accountId: randomUUID(),
    runId: randomUUID(),
    dispatchReview: { mode: 'hold' as const },
    policy: {
      version: 'audit',
      route: 'audit:offline',
      model: 'audit/model-not-selected',
      provider: 'Audit',
      priceVersion: 'not-priced',
      inputMicrousdPerMillion: '0',
      outputMicrousdPerMillion: '0',
      maxInputTokens: 100000,
      maxOutputTokens: 2000,
      timeoutMs: 1000,
    },
  };
  const cases = [narrative, mechanical].map((task, index) => ({
    id: index === 0 ? 'opening-narrative' : 'opening-mechanical',
    task: prepareStorytellerTask({
      ...task,
      execution: providerExecution,
      resources: providerResources(providerExecution.policy.route),
    }),
  }));
  const audit = createStorytellerRequestAudit(cases);
  assert.equal(audit.transportPerformed, false);
  assert.equal(audit.providerChargeMicrousd, '0');
  assert.deepEqual(
    audit.cases.map((entry) => entry.purpose.id),
    ['opening.narrative', 'opening.mechanical'],
  );
  assert.equal(audit.cases[0]?.estimatedInputTokens, null);
  assert.equal(audit.cases[0]?.observedProviderCacheHitTokens, null);
  assert.equal(audit.comparisons.length, 1);
  assert.equal(audit.sequences.length, 0);
  const formattedAudit = formatStorytellerRequestAudit(audit);
  assert.match(formattedAudit, /tokens\/cache: unknown/);
  assert.match(formattedAudit, /sections: task=scalar\/-\/[^,]+B#[a-f0-9]{8}/);
  assert.throws(
    () => createStorytellerRequestAudit([cases[0]!, cases[0]!]),
    /case IDs must be unique/,
  );
  const selection = selectStorytellerRequestSections(
    cases,
    [{ caseId: 'opening-narrative', sectionKey: 'currentState' }],
    32 * 1024,
  );
  assert.equal(selection.transportPerformed, false);
  assert.equal(selection.sections[0]?.sectionKey, 'currentState');
  assert.equal(selection.sections[0]?.valueKind, 'object');
  assert.ok(selection.selectedBytes > 0);
  assert.throws(
    () =>
      selectStorytellerRequestSections(
        cases,
        [{ caseId: 'opening-narrative', sectionKey: 'currentState' }],
        1,
      ),
    /exceed 1 bytes/,
  );
});

test('request audit reports cold bounds and reusable prefixes for an active-scene sequence', () => {
  const cases = createRequestAuditFixtureCases({
    caseIds: [
      'continuity-human-turn-13',
      'continuity-human-turn-14',
      'continuity-fifteen-turn',
    ],
    profile: { id: 'quiet-eerie-mystery', revision: 1 },
  });
  const audit = createStorytellerRequestAudit(cases);
  const sequence = audit.sequences[0];
  assert.equal(sequence?.id, 'human-active-scene');
  assert.deepEqual(sequence?.caseIds, [
    'continuity-human-turn-13',
    'continuity-human-turn-14',
    'continuity-fifteen-turn',
  ]);
  assert.ok((sequence?.coldSerializedRequestBytes ?? 0) > 0);
  assert.equal(sequence?.transitions.length, 2);
  assert.ok(
    sequence?.transitions.every(
      (transition) => transition.potentialReusableMessageContentBytes > 0,
    ),
  );
  assert.equal(sequence?.estimatedColdInputTokens, null);
  assert.equal(sequence?.observedProviderCacheHitTokens, null);
  assert.match(
    formatStorytellerRequestAudit(audit),
    /structural potential only/,
  );
});
